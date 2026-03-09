import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

/**
 * 资源转 Base64 API
 * 用于将本地素材库图片转换为 Base64 编码，供外部 API 使用
 * 使用方法: GET /api/asset-to-base64?path=/uploads/assets/xxx.png
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const assetPath = searchParams.get('path')

    if (!assetPath) {
      return NextResponse.json(
        { error: '缺少 path 参数' },
        { status: 400 }
      )
    }

    // 验证路径格式（防止目录遍历攻击）
    if (!assetPath.startsWith('/uploads/assets/')) {
      return NextResponse.json(
        { error: '不允许的资源路径' },
        { status: 403 }
      )
    }

    // 构建文件路径
    const filePath = path.join(process.cwd(), 'public', assetPath)

    // 读取文件
    const fileBuffer = await readFile(filePath)
    const base64Data = fileBuffer.toString('base64')

    // 确定 MIME 类型
    let mimeType = 'image/png'
    if (assetPath.endsWith('.jpg') || assetPath.endsWith('.jpeg')) {
      mimeType = 'image/jpeg'
    } else if (assetPath.endsWith('.gif')) {
      mimeType = 'image/gif'
    } else if (assetPath.endsWith('.webp')) {
      mimeType = 'image/webp'
    }

    // 返回 Data URL
    const dataUrl = `data:${mimeType};base64,${base64Data}`

    return NextResponse.json({
      success: true,
      dataUrl,
      mimeType,
      size: fileBuffer.length,
    })
  } catch (error) {
    console.error('资源转 Base64 错误:', error)
    return NextResponse.json(
      { error: '无法读取资源文件' },
      { status: 500 }
    )
  }
}