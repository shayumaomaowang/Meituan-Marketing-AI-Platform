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

  // Validate Image
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ success: false, message: 'Invalid file type. Only images are allowed.' }, { status: 400 });
  }

  const ext = path.extname(file.name) || '.png';
  const fileName = `${uuidv4()}${ext}`;
  const uploadDir = path.join(process.cwd(), 'public/uploads/assets');
  
  try {
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);
    
    return NextResponse.json({ 
      success: true, 
      url: `/uploads/assets/${fileName}`,
      fileName: file.name,
      type: file.type
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, message: 'Upload failed' }, { status: 500 });
  }
}