import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const conversationId = searchParams.get('conversation_id')
    const chatId = searchParams.get('chat_id')

    if (!conversationId || !chatId) {
      return NextResponse.json(
        { code: 1, msg: 'conversation_id and chat_id are required' },
        { status: 400 }
      )
    }

    const apiToken = process.env.COZE_API_TOKEN

    if (!apiToken) {
      return NextResponse.json(
        { code: 1, msg: 'API configuration missing' },
        { status: 500 }
      )
    }

    console.log(`Coze Canvas Status Request: conversationId=${conversationId}, chatId=${chatId}`)

    const response = await fetch(
      `https://api.coze.cn/v3/chat/retrieve?conversation_id=${conversationId}&chat_id=${chatId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Coze canvas status API error:', errorText)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('Coze Canvas Status Response:', JSON.stringify(data, null, 2))

    if (data.code !== 0) {
      return NextResponse.json(
        { code: data.code, msg: data.msg || 'Failed to get status' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      code: 0,
      data: {
        status: data.data?.status || 'unknown',
        chatId: data.data?.id,
        conversationId: data.data?.conversation_id,
        lastError: data.data?.last_error,
        createdAt: data.data?.created_at
      }
    })
  } catch (error) {
    console.error('Error in canvas AI status check:', error)
    return NextResponse.json(
      { 
        code: 1, 
        msg: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}