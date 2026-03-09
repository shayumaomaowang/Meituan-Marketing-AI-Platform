import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid URL provided' }, { status: 400 });
    }

    console.log('Proxying URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://www.coze.cn/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      cache: 'no-store'
    });

    console.log('Fetch response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error text');
      console.error('Proxy fetch failed:', response.status, response.statusText, errorText);
      return NextResponse.json({ 
        error: 'Failed to fetch image', 
        status: response.status,
        statusText: response.statusText,
        details: errorText
      }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*', // 允许前端 Canvas 访问
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}