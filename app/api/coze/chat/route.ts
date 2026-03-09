import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, fileIds, conversationId } = body

    if (!prompt) {
      return NextResponse.json(
        { code: 1, msg: 'Prompt is required' },
        { status: 400 }
      )
    }

    const apiToken = process.env.COZE_API_TOKEN
    const botId = process.env.COZE_BOT_ID

    if (!apiToken || !botId) {
      return NextResponse.json(
        { code: 1, msg: 'API configuration missing' },
        { status: 500 }
      )
    }

    // Build content array with text and optional image
    const contentArray: Array<{ type: string; text?: string; file_id?: string }> = [
      {
        type: 'text',
        text: prompt
      }
    ]

    if (Array.isArray(fileIds) && fileIds.length > 0) {
      fileIds
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        .forEach((id) => {
          contentArray.push({
            type: 'image',
            file_id: id
          })
        })
    }

    const requestBody = {
      bot_id: botId,
      user_id: `user_${Date.now()}`,
      stream: false,
      auto_save_history: true,
      additional_messages: [
        {
          role: 'user',
          content: JSON.stringify(contentArray),
          content_type: 'object_string'
        }
      ]
    }

    // Print request body for debugging
    console.log('Coze Chat Request Body:', JSON.stringify(requestBody, null, 2))
    console.log('Content Array:', JSON.stringify(contentArray, null, 2))

    const baseUrl = 'https://api.coze.cn/v3/chat'
    const url = typeof conversationId === 'string' && conversationId.trim().length > 0
      ? `${baseUrl}?conversation_id=${encodeURIComponent(conversationId.trim())}`
      : baseUrl

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.code !== 0) {
      return NextResponse.json(
        { code: data.code, msg: data.msg || 'Failed to create chat' },
        { status: 400 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating chat:', error)
    return NextResponse.json(
      { code: 1, msg: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

