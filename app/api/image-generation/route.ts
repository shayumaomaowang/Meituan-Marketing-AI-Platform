import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ARK_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ARK_API_KEY is not configured' },
        { status: 500 }
      )
    }

    // 调用字节跳动 ARK API 进行图像生成
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'doubao-seedream-4-5-251128',
        prompt: prompt,
        sequential_image_generation: 'disabled',
        response_format: 'url',
        size: '2K',
        stream: false,
        watermark: true,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('ARK API Error:', errorData)
      return NextResponse.json(
        { error: 'Image generation failed', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // 返回生成的图像 URL
    return NextResponse.json({
      success: true,
      imageUrl: data.data?.[0]?.url || data.data?.url,
      model: data.model,
      id: data.id,
    })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}