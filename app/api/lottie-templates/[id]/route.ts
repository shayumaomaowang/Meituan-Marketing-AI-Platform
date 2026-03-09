import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'templates.json');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log(`[API] Fetching Lottie template: ${id}`);
  
  if (!fs.existsSync(DATA_FILE)) {
    console.error('[API] Templates file not found');
    return NextResponse.json({ error: 'Templates file not found' }, { status: 404 });
  }

  try {
    // 读取大文件 (生产环境建议使用数据库或拆分文件)
    const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
    const allData = JSON.parse(fileContent);
    console.log(`[API] Total templates in file: ${allData.length}`);
    
    // 尝试精确匹配
    let template = allData.find((t: any) => t.id === id);
    
    // 如果找不到，尝试模糊匹配 (有些 ID 可能是数字字符串)
    if (!template) {
      console.log(`[API] Exact match failed for ${id}, trying loose match...`);
      template = allData.find((t: any) => String(t.id) === String(id));
    }
    
    if (!template) {
      console.error(`[API] Lottie template not found: ${id}`);
      // 打印前几个 ID 供调试
      const availableIds = allData.slice(0, 5).map((t: any) => t.id).join(', ');
      console.log(`[API] Available IDs (first 5): ${availableIds}`);
      return NextResponse.json({ error: 'Lottie template not found' }, { status: 404 });
    }

    // 如果模板包含 filePath，读取文件内容
    if (template.filePath) {
      const filePath = path.join(process.cwd(), 'public', template.filePath);
      if (fs.existsSync(filePath)) {
        try {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const lottieData = JSON.parse(fileContent);
          // 合并 metadata 和 lottie data
          template = { ...template, ...lottieData };
          console.log(`[API] Loaded Lottie data from file: ${template.filePath}`);
        } catch (err) {
          console.error(`[API] Failed to read Lottie file: ${filePath}`, err);
        }
      } else {
        console.warn(`[API] Lottie file not found at path: ${filePath}`);
      }
    }

    console.log(`[API] Found template: ${template.nm || template.id}`);
    return NextResponse.json(template);
  } catch (e) {
    console.error('[API] Error reading/parsing templates file:', e);
    return NextResponse.json({ error: 'Failed to load template' }, { status: 500 });
  }
}