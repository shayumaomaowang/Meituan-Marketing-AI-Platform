import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'design-templates.json');

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const templates = getTemplates();
  const template = templates.find((t: any) => String(t.id) === String(id));
  
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const templates = getTemplates();
    const index = templates.findIndex((t: any) => String(t.id) === String(id));
    
    if (index === -1) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    templates[index] = { ...templates[index], ...body };
    saveTemplates(templates);

    return NextResponse.json(templates[index]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const templates = getTemplates();
    const index = templates.findIndex((t: any) => String(t.id) === String(id));
    
    if (index === -1) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    templates[index] = { ...templates[index], ...body };
    saveTemplates(templates);

    return NextResponse.json(templates[index]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log(`[DELETE] Attempting to delete template with ID: ${id}`);
  
  const templates = getTemplates();
  console.log(`[DELETE] Total templates found: ${templates.length}`);
  
  const exists = templates.some((t: any) => String(t.id) === String(id));
  console.log(`[DELETE] Template exists? ${exists}`);

  if (!exists) {
    console.log(`[DELETE] Template not found. Available IDs: ${templates.map((t: any) => t.id).join(', ')}`);
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const newTemplates = templates.filter((t: any) => String(t.id) !== String(id));
  saveTemplates(newTemplates);
  
  console.log(`[DELETE] Successfully deleted. Remaining templates: ${newTemplates.length}`);
  return NextResponse.json({ success: true });
}