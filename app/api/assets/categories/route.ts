import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_FILE = path.join(process.cwd(), 'data/asset-categories.json');

async function getCategories() {
  try {
    const data = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Fallback if file doesn't exist
    return [
      { id: "background", name: "背景库", isDefault: true },
      { id: "decoration", name: "装饰库", isDefault: true },
      { id: "logo", name: "Logo库", isDefault: true }
    ];
  }
}

async function saveCategories(categories: any[]) {
  await writeFile(DATA_FILE, JSON.stringify(categories, null, 2));
}

export async function GET() {
  const categories = await getCategories();
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const categories = await getCategories();
    
    // Check for duplicate names
    if (categories.some((c: any) => c.name === name)) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }

    const newCategory = {
      id: uuidv4(),
      name,
      isDefault: false
    };
    
    categories.push(newCategory);
    await saveCategories(categories);
    
    return NextResponse.json(newCategory);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  try {
    const categories = await getCategories();
    const category = categories.find((c: any) => c.id === id);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    if (category.isDefault) {
      return NextResponse.json({ error: 'Cannot delete default category' }, { status: 403 });
    }

    const newCategories = categories.filter((c: any) => c.id !== id);
    await saveCategories(newCategories);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}