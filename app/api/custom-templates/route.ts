import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'custom-templates.json');

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
  try {
    const body = await request.json();
    const templates = await getTemplates();
    
    const newTemplate = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...body
    };
    
    templates.push(newTemplate);
    await saveTemplates(templates);
    
    return NextResponse.json(newTemplate);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
  }
}