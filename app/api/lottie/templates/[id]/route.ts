
import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data/templates.json');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await (params);
  try {
    const data = await readFile(DATA_FILE, 'utf-8');
    const templates = JSON.parse(data);
    const template = templates.find((t: any) => t.id === id);
    
    if (!template) {
      return NextResponse.json({ message: 'Template not found' }, { status: 404 });
    }
    
    // 如果模板包含 filePath，读取文件内容
    if (template.filePath) {
      const filePath = path.join(process.cwd(), 'public', template.filePath);
      try {
        const fileContent = await readFile(filePath, 'utf-8');
        const lottieData = JSON.parse(fileContent);
        // 合并 metadata 和 lottie data
        // 注意：这里我们创建一个新对象，而不是修改原对象
        const mergedTemplate = { ...template, ...lottieData };
        return NextResponse.json(mergedTemplate);
      } catch (err) {
        console.error(`[API] Failed to read Lottie file: ${filePath}`, err);
        // 如果读取失败，仍然返回元数据，但可能前端会报错
        return NextResponse.json(template);
      }
    }

    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json({ message: 'Error reading data' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await (params);
  try {
    const data = await readFile(DATA_FILE, 'utf-8');
    let templates = JSON.parse(data);
    
    const initialLength = templates.length;
    templates = templates.filter((t: any) => t.id !== id);
    
    if (templates.length === initialLength) {
      return NextResponse.json({ message: 'Template not found' }, { status: 404 });
    }
    
    await writeFile(DATA_FILE, JSON.stringify(templates, null, 2));
    
    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ message: 'Error deleting template' }, { status: 500 });
  }
}