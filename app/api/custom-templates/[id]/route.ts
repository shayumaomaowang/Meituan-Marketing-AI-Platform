import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data/custom-templates.json');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await readFile(DATA_FILE, 'utf-8');
    const templates = JSON.parse(data);
    const template = templates.find((t: any) => t.id === id);
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json({ error: 'Error reading data' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const data = await readFile(DATA_FILE, 'utf-8');
    let templates = JSON.parse(data);
    
    const index = templates.findIndex((t: any) => t.id === id);
    if (index === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    templates[index] = { 
      ...templates[index], 
      ...body, 
      updatedAt: new Date().toISOString() 
    };
    
    await writeFile(DATA_FILE, JSON.stringify(templates, null, 2));
    return NextResponse.json(templates[index]);
  } catch (error) {
    return NextResponse.json({ error: 'Error updating data' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await readFile(DATA_FILE, 'utf-8');
    let templates = JSON.parse(data);
    templates = templates.filter((t: any) => t.id !== id);
    await writeFile(DATA_FILE, JSON.stringify(templates, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting data' }, { status: 500 });
  }
}