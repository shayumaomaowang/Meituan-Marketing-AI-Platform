import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { code: 1, msg: 'File is required' },
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

    // Convert File to Blob for FormData
    const fileBlob = new Blob([await file.arrayBuffer()], { type: file.type })
    const uploadFormData = new FormData()
    uploadFormData.append('file', fileBlob, file.name)

    const response = await fetch('https://api.coze.cn/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
      body: uploadFormData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Coze upload error:', errorText)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.code !== 0) {
      return NextResponse.json(
        { code: data.code, msg: data.msg || 'Failed to upload file' },
        { status: 400 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { code: 1, msg: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

