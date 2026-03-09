import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_FILE = path.join(process.cwd(), 'data/assets.json');

async function getAssets() {
  try {
    const data = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveAssets(assets: any[]) {
  await writeFile(DATA_FILE, JSON.stringify(assets, null, 2));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  
  let assets = await getAssets();
  
  if (type) {
    assets = assets.filter((a: any) => a.type === type);
  }
  
  return NextResponse.json(assets);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const assets = await getAssets();
    
    // Check if body is an array (Batch Create)
    if (Array.isArray(body)) {
      const newAssets = body.map(item => ({
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        tags: [],
        ...item
      }));
      
      // Add all new assets to the beginning
      assets.unshift(...newAssets);
      await saveAssets(assets);
      
      return NextResponse.json(newAssets);
    } 
    // Single Create
    else {
      const newAsset = {
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        tags: [],
        ...body
      };
      
      assets.unshift(newAsset);
      await saveAssets(assets);
      
      return NextResponse.json(newAsset);
    }
  } catch (error) {
    console.error('Create asset error:', error);
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
}