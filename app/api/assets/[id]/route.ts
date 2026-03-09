import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, unlink } from 'fs/promises';
import path from 'path';

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const assets = await getAssets();
    const assetIndex = assets.findIndex((a: any) => a.id === id);
    
    if (assetIndex === -1) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    
    const asset = assets[assetIndex];
    
    // Try to delete the file
    if (asset.url) {
      try {
        const filePath = path.join(process.cwd(), 'public', asset.url);
        await unlink(filePath);
      } catch (e) {
        console.error('Failed to delete file:', e);
      }
    }
    
    assets.splice(assetIndex, 1);
    await saveAssets(assets);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const assets = await getAssets();
    const index = assets.findIndex((a: any) => a.id === id);
    
    if (index === -1) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    
    assets[index] = { ...assets[index], ...body };
    await saveAssets(assets);
    
    return NextResponse.json(assets[index]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
}