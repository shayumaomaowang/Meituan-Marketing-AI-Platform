import { NextRequest, NextResponse } from 'next/server'

// 从AI回复中提取图片URL的辅助函数
function extractImageUrlFromContent(content: string): string | null {
  if (!content) return null
  
  console.log('Extracting image from content:', content.slice(0, 200) + '...')
  
  // 1. 尝试从Markdown格式中提取图片URL
  const markdownImageRegex = /!\[.*?\]\((https?:\/\/[^\)\s]+)\)/g
  const markdownMatch = markdownImageRegex.exec(content)
  if (markdownMatch && markdownMatch[1]) {
    console.log('Found image URL in markdown format:', markdownMatch[1].slice(0, 50) + '...')
    return markdownMatch[1]
  }
  
  // 2. 尝试从纯文本中提取图片URL
  const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|bmp|svg))/i
  const urlMatch = urlRegex.exec(content)
  if (urlMatch && urlMatch[1]) {
    console.log('Found image URL in plain text:', urlMatch[1].slice(0, 50) + '...')
    return urlMatch[1]
  }
  
  // 3. 尝试从Coze的图片格式中提取
  const cozeImageRegex = /(https:\/\/s\.coze\.cn\/t\/[a-zA-Z0-9_-]+)/i
  const cozeMatch = cozeImageRegex.exec(content)
  if (cozeMatch && cozeMatch[1]) {
    console.log('Found Coze image URL:', cozeMatch[1])
    return cozeMatch[1]
  }
  
  // 4. 尝试从字节跳动的CDN中提取
  const byteCdnRegex = /(https:\/\/[^\/]+\.byteimg\.com\/[^\s]+)/i
  const byteMatch = byteCdnRegex.exec(content)
  if (byteMatch && byteMatch[1]) {
    console.log('Found ByteDance CDN image URL:', byteMatch[1].slice(0, 50) + '...')
    return byteMatch[1]
  }
  
  console.log('No image URL found in content')
  return null
}

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

    console.log(`Coze Canvas Details Request: conversationId=${conversationId}, chatId=${chatId}`)

    // 获取聊天详情
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
      const errorText = await response.text()
      console.error('Coze canvas details API error:', errorText)
      // 如果获取详情失败，返回基本信息
      return NextResponse.json({
        code: 0,
        data: {
          conversationId,
          chatId,
          imageUrl: null,
          message: '无法获取AI生成详情',
          rawContent: null
        }
      })
    }

    const data = await response.json()
    console.log('Coze Canvas Details Response:', JSON.stringify(data, null, 2))

    if (data.code !== 0) {
      // 即使获取详情失败，也返回基本信息
      return NextResponse.json({
        code: 0,
        data: {
          conversationId,
          chatId,
          imageUrl: null,
          message: data.msg || 'AI生成详情获取失败',
          rawContent: null
        }
      })
    }

    // 尝试从AI回复中提取图片URL
    let imageUrl: string | null = null
    let rawContent: string | null = null
    
    const messages = data.data || []
    console.log(`Found ${messages.length} messages in conversation`)
    
    for (const msg of messages) {
      console.log(`Checking message: role=${msg.role}, type=${msg.type}`)
      
      if (msg.role === 'assistant' && msg.type === 'answer' && msg.content) {
        rawContent = msg.content
        console.log('Found assistant answer, content length:', msg.content.length)
        
        // 尝试提取图片URL
        imageUrl = extractImageUrlFromContent(msg.content)
        
        if (imageUrl) {
          console.log('Successfully extracted image URL:', imageUrl.slice(0, 50) + '...')
          break
        }
      }
    }

    return NextResponse.json({
      code: 0,
      data: {
        conversationId,
        chatId,
        imageUrl,
        message: imageUrl ? 'AI图片生成成功' : '未找到生成的图片',
        rawContent: rawContent ? rawContent.slice(0, 500) + '...' : null,
        hasImage: !!imageUrl
      }
    })
  } catch (error) {
    console.error('Error in canvas AI details check:', error)
    const searchParams = request.nextUrl.searchParams
    const conversationId = searchParams.get('conversation_id')
    const chatId = searchParams.get('chat_id')
    
    return NextResponse.json({
      code: 0,
      data: {
        conversationId,
        chatId,
        imageUrl: null,
        message: '获取AI生成详情时发生错误',
        rawContent: null,
        hasImage: false
      }
    })
  }
}