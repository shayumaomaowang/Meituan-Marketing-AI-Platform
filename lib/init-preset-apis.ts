/**
 * 预置的 API 配置
 * 这个文件定义了系统预置的API，方便快速使用
 */

import { APIConfig } from './types/agent'
import { apiStorage } from './agent-storage'

export const PRESET_APIS: Omit<APIConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: '豆包1.5-Pro LLM',
    description: '豆包1.5-Pro大语言模型，支持32k上下文，用于文本分析和对话',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    method: 'POST',
    authType: 'bearer',
    authKey: '74858c9e-7fd5-40c2-b505-83e12f7daaa9',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      model: 'doubao-1-5-pro-32k-250115',
      messages: [
        {
          role: 'system',
          content: '你是人工智能助手。',
        },
        {
          role: 'user',
          content: '用户输入的消息',
        },
      ],
    },
  },
  {
    name: '文生图-生成单张图',
    description: '使用豆宝AI生成单张高质量图片，支持详细的prompt描述',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
    method: 'POST',
    authType: 'bearer',
    authKey: '74858c9e-7fd5-40c2-b505-83e12f7daaa9',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      model: 'doubao-seedream-4-5-251128',
      prompt: '用户输入的prompt',
      sequential_image_generation: 'disabled',
      response_format: 'url',
      size: '2K',
      stream: false,
      watermark: true,
    },
  },
  {
    name: '文生图-生成一组图',
    description: '使用豆宝AI生成一组连贯的插画或相关主题的多张图片',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
    method: 'POST',
    authType: 'bearer',
    authKey: '74858c9e-7fd5-40c2-b505-83e12f7daaa9',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      model: 'doubao-seedream-4-5-251128',
      prompt: '用户输入的prompt',
      sequential_image_generation: 'auto',
      sequential_image_generation_options: {
        max_images: 4,
      },
      response_format: 'url',
      size: '2K',
      stream: true,
      watermark: true,
    },
  },
  {
    name: '图生图-单张图生成单张图',
    description: '基于一张参考图片，生成风格相似的单张图片',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
    method: 'POST',
    authType: 'bearer',
    authKey: '74858c9e-7fd5-40c2-b505-83e12f7daaa9',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      model: 'doubao-seedream-4-5-251128',
      prompt: '根据参考图生成相似风格的图片',
      image: 'https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imageToimage.png',
      sequential_image_generation: 'disabled',
      response_format: 'url',
      size: '2K',
      stream: false,
      watermark: true,
    },
  },
  {
    name: '图生图-单张图生成一组图',
    description: '基于一张参考图片，生成一组风格相似的多张图片',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
    method: 'POST',
    authType: 'bearer',
    authKey: '74858c9e-7fd5-40c2-b505-83e12f7daaa9',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      model: 'doubao-seedream-4-5-251128',
      prompt: '根据参考图生成一组相似风格的图片',
      image: 'https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imageToimages.png',
      sequential_image_generation: 'auto',
      sequential_image_generation_options: {
        max_images: 5,
      },
      response_format: 'url',
      size: '2K',
      stream: true,
      watermark: true,
    },
  },
  {
    name: '图生图-多张参考图生成单张图',
    description: '基于多张参考图片的组合，生成融合多个参考元素的单张图片',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
    method: 'POST',
    authType: 'bearer',
    authKey: '74858c9e-7fd5-40c2-b505-83e12f7daaa9',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      model: 'doubao-seedream-4-5-251128',
      prompt: '根据多张参考图生成融合的图片',
      image: ['https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imagesToimage_1.png', 'https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imagesToimage_2.png'],
      sequential_image_generation: 'disabled',
      response_format: 'url',
      size: '2K',
      stream: false,
      watermark: true,
    },
  },
  {
    name: '图生图-多张参考图生成一组图',
    description: '基于多张参考图片的组合，生成融合多个参考元素的一组图片',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
    method: 'POST',
    authType: 'bearer',
    authKey: '74858c9e-7fd5-40c2-b505-83e12f7daaa9',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      model: 'doubao-seedream-4-5-251128',
      prompt: '根据多张参考图生成融合的一组图片',
      image: ['https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imagesToimages_1.png', 'https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imagesToimages_2.png'],
      sequential_image_generation: 'auto',
      sequential_image_generation_options: {
        max_images: 3,
      },
      response_format: 'url',
      size: '2K',
      stream: true,
      watermark: true,
    },
  },
]

/**
 * 初始化预置的API
 * 如果API不存在则添加
 */
export function initializePresetAPIs() {
  if (typeof window === 'undefined') return

  const existingApis = apiStorage.getAll()
  const existingNames = new Set(existingApis.map(api => api.name))

  PRESET_APIS.forEach(presetApi => {
    // 只添加不存在的API，避免覆盖用户修改
    if (!existingNames.has(presetApi.name)) {
      apiStorage.add(presetApi)
      console.log(`✅ 预置 API: ${presetApi.name}`)
    }
  })
}