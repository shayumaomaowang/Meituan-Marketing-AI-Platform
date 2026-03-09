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

    // Try to get messages from the conversation
    const response = await fetch(
      `https://api.coze.cn/v3/chat/message/list?conversation_id=${conversationId}&chat_id=${chatId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        }
      }
    )

    if (!response.ok) {
      // If the endpoint doesn't exist or fails, return basic data
      return NextResponse.json({
        code: 0,
        data: {
          conversation_id: conversationId,
          chat_id: chatId
        }
      })
    }

    const data = await response.json()

    if (data.code !== 0) {
      // Return basic data even if detail fetch fails
      return NextResponse.json({
        code: 0,
        data: {
          conversation_id: conversationId,
          chat_id: chatId
        }
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error getting chat details:', error)
    // Return basic data even on error
    const searchParams = request.nextUrl.searchParams
    const conversationId = searchParams.get('conversation_id')
    const chatId = searchParams.get('chat_id')
    
    return NextResponse.json({
      code: 0,
      data: {
        conversation_id: conversationId,
        chat_id: chatId
      }
    })
  }
}

