import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_FILE = path.join(process.cwd(), 'data/design-template-categories.json');

async function getCategories() {
  try {
    const data = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Fallback if file doesn't exist
    return [
      { id: "all", name: "全部模板", isDefault: true },
      { id: "marketing", name: "营销设计", isDefault: true },
      { id: "social", name: "社交媒体", isDefault: true },
      { id: "ecommerce", name: "电商设计", isDefault: true }
    ];
  }
}

async function saveCategories(categories: any[]) {
  await writeFile(DATA_FILE, JSON.stringify(categories, null, 2));
}

export async function GET() {
  const categories = await getCategories();
  
  // 按类型分组
  const groupedCategories = {
    primary: categories.filter((c: any) => c.type === 'primary'),
    secondary: categories.filter((c: any) => c.type === 'secondary'),
    all: categories
  };
  
  return NextResponse.json(groupedCategories);
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
      isDefault: false,
      type: 'primary' // 默认创建一级分类，用户可以在前端修改
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