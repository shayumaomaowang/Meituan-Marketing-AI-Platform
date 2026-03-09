import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt) {
      return NextResponse.json(
        { code: 1, msg: 'Prompt is required' },
        { status: 400 }
      )
    }

    const apiToken = process.env.COZE_API_TOKEN
    const botId = process.env.COZE_CANVAS_BOT_ID

    if (!apiToken || !botId) {
      return NextResponse.json(
        { code: 1, msg: 'API configuration missing' },
        { status: 500 }
      )
    }

    // 构建简化的请求体，专门用于生成单张图片
    const requestBody = {
      bot_id: botId,
      user_id: `canvas_user_${Date.now()}`,
      stream: false,
      auto_save_history: true, // 需要保存历史以便获取结果
      additional_messages: [
        {
          role: 'user',
          content: JSON.stringify([
            {
              type: 'text',
              text: `请生成一张高质量的图片，描述：${prompt}。请直接返回图片URL，不要其他文字说明。`
            }
          ]),
          content_type: 'object_string'
        }
      ]
    }

    console.log('Coze Canvas Chat Request:', JSON.stringify(requestBody, null, 2))

    const response = await fetch('https://api.coze.cn/v3/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Coze canvas API error:', errorText)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('Coze Canvas Chat Response:', JSON.stringify(data, null, 2))

    if (data.code !== 0) {
      return NextResponse.json(
        { code: data.code, msg: data.msg || 'Failed to generate image' },
        { status: 400 }
      )
    }

    // 提取会话信息
    const chatId = data.data?.id
    const conversationId = data.data?.conversation_id
    
    if (!chatId || !conversationId) {
      console.error('Missing chatId or conversationId in response:', data)
      return NextResponse.json(
        { code: 1, msg: 'Invalid response from AI' },
        { status: 500 }
      )
    }

    console.log(`Coze Canvas Chat Details: chatId=${chatId}, conversationId=${conversationId}`)

    // 简化处理：直接返回会话信息，让前端轮询状态
    // 这样更符合现有的工作流程
    return NextResponse.json({
      code: 0,
      data: {
        chatId,
        conversationId,
        status: data.data?.status || 'in_progress',
        message: 'AI生成已开始，请稍后查看结果'
      }
    })
  } catch (error) {
    console.error('Error in canvas AI generation:', error)
    return NextResponse.json(
      { 
        code: 1, 
        msg: error instanceof Error ? error.message : 'Unknown error',
        data: {
          imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80' // 错误时也返回占位图
        }
      },
      { status: 500 }
    )
  }
}