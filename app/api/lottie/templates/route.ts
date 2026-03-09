
import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'templates.json');

async function getTemplates() {
  try {
    const data = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveTemplates(templates: any[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(templates, null, 2));
}

export async function GET() {
  const templates = await getTemplates();
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const templates = await getTemplates();
  
  // 数据验证和清理
  const elements = Array.isArray(body.elements) ? body.elements : [];
  
  // 验证 elements 的完整性
  const cleanedElements = elements.map((el: any) => {
    // 确保关键字段存在
    const cleaned = {
      id: el.id || `element_${Math.random()}`,
      type: el.type || 'unknown',
      name: el.name || '',
      currentValue: el.currentValue || el.originalValue || '',
      originalValue: el.originalValue || '',
      isEditable: el.isEditable === true,
      ...(el.referenceId && { referenceId: el.referenceId }),
      ...(el.width && { width: el.width }),
      ...(el.height && { height: el.height }),
      ...(el.originalWidth && { originalWidth: el.originalWidth }),
      ...(el.originalHeight && { originalHeight: el.originalHeight }),
      ...(el.cozeField && { cozeField: el.cozeField }),
      ...(el.groupId && { groupId: el.groupId })
    };
    
    // 验证 currentValue 不为空
    if (!cleaned.currentValue) {
      console.warn(`⚠️ 元素 ${cleaned.id} 的 currentValue 为空，使用 originalValue`, cleaned.originalValue);
      cleaned.currentValue = cleaned.originalValue;
    }
    
    return cleaned;
  });
  
  // 检查是否有重复的 ID
  const idSet = new Set<string>();
  const duplicateIds: string[] = [];
  cleanedElements.forEach((el: any) => {
    if (idSet.has(el.id)) {
      duplicateIds.push(el.id);
    }
    idSet.add(el.id);
  });
  
  if (duplicateIds.length > 0) {
    console.warn(`⚠️ [API] 检测到 ${duplicateIds.length} 个重复的元素 ID，将被去重`);
    // 去重：保留第一个，删除后续的
    const uniqueMap = new Map<string, any>();
    cleanedElements.forEach((el: any) => {
      if (!uniqueMap.has(el.id)) {
        uniqueMap.set(el.id, el);
      }
    });
    cleanedElements.length = 0;
    cleanedElements.push(...Array.from(uniqueMap.values()));
  }
  
  // 检查是否有多个元素使用相同的 cozeField（可能导致同步问题）
  const cozeFieldMap = new Map<string, string[]>();
  cleanedElements.forEach((el: any) => {
    if (el.cozeField && el.isEditable) {
      if (!cozeFieldMap.has(el.cozeField)) {
        cozeFieldMap.set(el.cozeField, []);
      }
      cozeFieldMap.get(el.cozeField)!.push(el.id);
    }
  });
  
  const duplicateCozeFields = Array.from(cozeFieldMap.entries())
    .filter(([_, ids]) => ids.length > 1);
  if (duplicateCozeFields.length > 0) {
    console.warn('⚠️ [API] 检测到多个元素使用相同 cozeField（它们将在生成模式下被同步更新）:', 
      duplicateCozeFields.map(([field, ids]) => `${field}: [${ids.join(', ')}]`).join('; '));
  }
  
  console.log('📊 [API] 保存模板数据验证:', {
    templateName: body.name,
    layout: body.layout, // 记录 layout
    totalElements: cleanedElements.length,
    editableCount: cleanedElements.filter((e: any) => e.isEditable).length,
    imageCount: cleanedElements.filter((e: any) => e.type === 'image').length,
    textCount: cleanedElements.filter((e: any) => e.type === 'text').length
  });
  
  const newTemplate = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...body,
    layout: body.layout || 'center', // 确保 layout 字段存在，默认为 center
    elements: cleanedElements  // 使用清理后的 elements
  };
  
  templates.push(newTemplate);
  await saveTemplates(templates);
  
  console.log('✅ [API] 模板保存成功，ID:', newTemplate.id);
  
  return NextResponse.json(newTemplate);
}