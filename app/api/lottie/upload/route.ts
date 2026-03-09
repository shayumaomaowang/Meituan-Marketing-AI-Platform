
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const data = await request.formData();
  const file: File | null = data.get('file') as unknown as File;

  if (!file) {
    return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Validate JSON
  try {
    const jsonContent = JSON.parse(buffer.toString('utf-8'));
    if (!jsonContent.v || !jsonContent.layers) {
       return NextResponse.json({ success: false, message: 'Invalid Lottie JSON' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ success: false, message: 'Invalid JSON file' }, { status: 400 });
  }

  const fileName = `${uuidv4()}.json`;
  const uploadDir = path.join(process.cwd(), 'public/lottie-files');
  
  try {
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);
    
    return NextResponse.json({ 
      success: true, 
      filePath: `/lottie-files/${fileName}`,
      fileName: file.name
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, message: 'Upload failed' }, { status: 500 });
  }
}
