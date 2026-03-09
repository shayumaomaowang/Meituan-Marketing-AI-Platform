import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'templates.json');

export async function GET() {
  if (!fs.existsSync(DATA_FILE)) {
    return NextResponse.json([]);
  }
  
  // 由于文件可能很大，我们尝试流式读取或者只解析我们需要的部分
  // 但为了简单起见，假设服务器内存足够，我们读取并提取摘要
  try {
    const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
    const allData = JSON.parse(fileContent);
    
    // 提取摘要信息：id, nm (name)
    const summary = allData.map((t: any) => ({
      id: t.id,
      name: t.nm || t.name || t.id
    }));
    
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json([]);
  }
}