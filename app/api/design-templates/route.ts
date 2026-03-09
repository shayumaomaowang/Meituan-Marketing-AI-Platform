import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_FILE = path.join(process.cwd(), 'data', 'design-templates.json');
const CATEGORIES_FILE = path.join(process.cwd(), 'data', 'design-template-categories.json');

function getCategories() {
  if (!fs.existsSync(CATEGORIES_FILE)) {
    return [];
  }
  const fileContent = fs.readFileSync(CATEGORIES_FILE, 'utf-8');
  try {
    return JSON.parse(fileContent);
  } catch (e) {
    return [];
  }
}

function getTemplates() {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(fileContent);
  } catch (e) {
    return [];
  }
}

function saveTemplates(templates: any[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(templates, null, 2));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const primaryCategory = searchParams.get('primaryCategory');
  const secondaryCategory = searchParams.get('secondaryCategory');
  
  const templates = getTemplates();
  
  // 按创建时间倒序排列
  templates.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
  
  // 如果有分类筛选，过滤模板
  let filteredTemplates = templates;
  
  // 筛选一级分类
  if (primaryCategory && primaryCategory !== 'all') {
    if (primaryCategory === 'uncategorized') {
      filteredTemplates = filteredTemplates.filter((template: any) => 
        !template.primaryCategoryId || template.primaryCategoryId === ''
      );
    } else {
      filteredTemplates = filteredTemplates.filter((template: any) => 
        template.primaryCategoryId === primaryCategory
      );
    }
  }
  
  // 筛选二级分类
  if (secondaryCategory && secondaryCategory !== 'all') {
    if (secondaryCategory === 'uncategorized') {
      filteredTemplates = filteredTemplates.filter((template: any) => 
        !template.secondaryCategoryId || template.secondaryCategoryId === ''
      );
    } else {
      filteredTemplates = filteredTemplates.filter((template: any) => 
        template.secondaryCategoryId === secondaryCategory
      );
    }
  }
  
  return NextResponse.json(filteredTemplates);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const templates = getTemplates();
    
    const newTemplate = {
      id: uuidv4(),
      title: body.title || '未命名模板',
      image: body.image || '/placeholder.svg',
      customTemplateId: body.customTemplateId || '',
      lottieTemplateId: body.lottieTemplateId || '',
      primaryCategoryId: body.primaryCategoryId || '',
      secondaryCategoryId: body.secondaryCategoryId || '',
      enableDynamicSelection: body.enableDynamicSelection || false,
      createdAt: Date.now(),
      ...body
    };

    templates.push(newTemplate);
    saveTemplates(templates);

    return NextResponse.json(newTemplate);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}