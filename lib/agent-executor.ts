import { Agent, APIConfig, AgentExecutionRequest, AgentExecutionResult } from './types/agent'
import { apiStorage, agentStorage, pluginStorage } from './agent-storage'
import { materialLibraryManager } from './material-library'

/**
 * Agent 执行引擎
 * 负责执行 Agent，调用相关的 API
 */
export class AgentExecutor {
  static async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    try {
      const agent = agentStorage.getById(request.agentId)
      if (!agent) {
        return {
          success: false,
          output: null,
          error: 'Agent not found',
          apiCalls: [],
        }
      }

      // 获取主 API 配置
      const primaryApi = apiStorage.getById(agent.primaryApiId)
      if (!primaryApi) {
        return {
          success: false,
          output: null,
          error: 'Primary API not found',
          apiCalls: [],
        }
      }

      // 获取插件对应的 API，并建立名称到 API 的映射
      const pluginApis = agent.pluginIds
        .map(id => apiStorage.getById(id))
        .filter((api): api is APIConfig => api !== null)

      const pluginMap = new Map(pluginApis.map(api => [api.name, api]))

      const apiCalls: Array<{
        apiId: string
        status: 'success' | 'failed'
        response: any
      }> = []

      // 保存上传的图片信息，后续用于图生图 API
      const uploadedImages = request.uploadedImages || {}
      let uploadedImageUrl: string | null = null
      let uploadedImageDescription: string = ''
      
      // 如果有上传的图片，优先使用商品图，其次是场景图
      if (uploadedImages.productImage) {
        uploadedImageUrl = uploadedImages.productImage
        uploadedImageDescription = '用户已上传商品/产品素材作为参考'
        console.log(`📸 检测到上传的商品图`)
      } else if (uploadedImages.sceneImage) {
        uploadedImageUrl = uploadedImages.sceneImage
        uploadedImageDescription = '用户已上传场景/人物素材作为参考'
        console.log(`📸 检测到上传的场景/人像图`)
      }

      // 1. 首先调用 LLM（主 API）来分析用户输入和系统提示词
      // 如果用户上传了图片，将图片描述作为补充信息加入到 prompt 中
      const userInputWithImageDesc = uploadedImageDescription 
        ? `${request.userInput}\n\n[补充说明：${uploadedImageDescription}]`
        : request.userInput
      
      if (uploadedImageDescription) {
        console.log(`💬 [LLM 输入补充] ${uploadedImageDescription}`)
      }
      
      const llmResult = await this.callApi(primaryApi, {
        prompt: `${agent.systemPrompt}\n\n用户输入：${userInputWithImageDesc}`,
        context: request.context,
      })

      apiCalls.push({
        apiId: primaryApi.id,
        status: llmResult ? 'success' : 'failed',
        response: llmResult,
      })

      if (!llmResult) {
        return {
          success: false,
          output: null,
          error: 'Failed to call primary API',
          apiCalls,
        }
      }

      // 2. 根据系统提示词中的插件引用，智能调用相应的插件
      // 解析系统提示词中的 ⊕ 插件名 格式
      const pluginReferences = this.parsePluginReferences(agent.systemPrompt)
      let finalOutput = llmResult
      let materialLibraryResult: string | null = null  // 保存素材库检索结果

      console.log(`📋 检测到以下插件引用: ${pluginReferences.join(', ') || '无'}`)

      // 执行系统提示词中引用的插件
      for (const pluginName of pluginReferences) {
        // 检查是否是素材库检索插件
        // 素材库名称列表（精确匹配）
        const materialLibraryNames = ['自由生图-参考图', '参考生图']
        const isMaterialLibraryPlugin = materialLibraryNames.includes(pluginName)
        
        let pluginResult: any = null
        let apiId = ''

        console.log(`🔗 准备调用插件: ${pluginName}，输入内容长度: ${String(finalOutput).length}`)

        if (isMaterialLibraryPlugin) {
          // 素材库检索插件：从最终输出中提取关键词
          console.log(`📚 识别为素材库插件，准备执行：${pluginName}`)
          pluginResult = await this.executeMaterialLibraryPlugin(pluginName, finalOutput)
          console.log(`📚 素材库插件执行结果:`, pluginResult)
          apiId = `material_${pluginName}`
          
          // 保存素材库结果，但不覆盖 finalOutput（后续插件需要用原始提示词）
          if (pluginResult) {
            materialLibraryResult = pluginResult
            console.log(`💾 保存素材库参考图 URL: ${materialLibraryResult}`)
          }
        } else {
          // 普通 API 插件
          // 首先在 pluginMap 中查找（Agent 中添加的插件）
          let pluginApi = pluginMap.get(pluginName)
          
          // 如果没有找到，则从所有 API 中按名称查找
          if (!pluginApi) {
            const allApis = apiStorage.getAll()
            console.log(`🔍 从 ${allApis.length} 个 API 中查找 "${pluginName}"`)
            console.log(`📋 可用 API 名称: ${allApis.map(a => a.name).join(', ')}`)
            pluginApi = allApis.find(api => api.name === pluginName)
          }
          
          if (!pluginApi) {
            console.warn(`⚠️ 找不到插件: ${pluginName}`)
            continue
          }

          // 如果有素材库结果，将其与原始提示词组合传给图生图 API
          let inputData: Record<string, any> = {
            input: finalOutput,
            prompt: finalOutput,
            context: request.context,
          }
          
          // 检查是否是图生图 API（支持单张、多张、各种组合）
          const isImageGenerationApi = (apiName: string) => {
            return apiName.includes('图生图') || apiName.includes('生图')
          }
          
          // 如果这是图生图 API，构建图片列表（参考图在前，用户上传的图在后）
          if (isImageGenerationApi(pluginName)) {
            const imageList: string[] = []
            
            // 第一个：参考图（从素材库获取）
            if (materialLibraryResult) {
              imageList.push(materialLibraryResult)
              console.log(`🖼️ 添加素材库参考图（第1张）: ${materialLibraryResult}`)
            }
            
            // 第二个：用户上传的图
            if (uploadedImageUrl) {
              imageList.push(uploadedImageUrl)
              console.log(`🖼️ 添加用户上传的图（第2张）`)
            }
            
            // 根据图片数量决定如何传递
            if (imageList.length > 0) {
              if (imageList.length === 1) {
                // 只有一张图，直接传递
                inputData.image = imageList[0]
              } else {
                // 多张图，作为数组传递
                inputData.image = imageList
              }
              inputData.referenceImage = imageList[0]  // referenceImage 字段使用第一张
              console.log(`📦 共${imageList.length}张图片将发送给图生图 API`)
            }
          }

          pluginResult = await this.callApi(pluginApi, inputData)
          apiId = pluginApi.id
        }

        apiCalls.push({
          apiId: apiId,
          status: pluginResult ? 'success' : 'failed',
          response: pluginResult,
        })

        if (pluginResult) {
          // 只有非素材库插件才更新 finalOutput
          if (!isMaterialLibraryPlugin) {
            finalOutput = pluginResult
          }
          console.log(`✅ 插件 ${pluginName} 执行成功`)
        } else {
          console.warn(`⚠️ 插件 ${pluginName} 返回空结果`)
        }
      }

      return {
        success: true,
        output: finalOutput,
        apiCalls,
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        apiCalls: [],
      }
    }
  }

  /**
   * 执行素材库检索插件
   * 从 LLM 输出中智能提取关键词，然后进行素材检索
   */
  private static async executeMaterialLibraryPlugin(
    libraryName: string,
    llmOutput: string
  ): Promise<string | null> {
    try {
      console.log(`📚 执行素材库插件: ${libraryName}`)
      
      // 第 1 步：从 LLM 输出中提取关键词（名词）
      const keywords = this.extractKeywordsFromText(llmOutput)
      
      if (keywords.length === 0) {
        console.warn(`⚠️ 未从输出中提取到有效关键词`)
        return null
      }
      
      console.log(`🔍 提取的关键词:`, keywords)
      
      // 第 2 步：依次尝试每个关键词进行精确匹配
      for (const keyword of keywords) {
        const materialUrl = await materialLibraryManager.searchByKeyword(libraryName, keyword)
        
        if (materialUrl) {
          console.log(`✅ 素材库检索成功: 关键词 "${keyword}" -> ${materialUrl}`)
          return materialUrl
        }
      }
      
      console.warn(`⚠️ 素材库中未找到匹配的图片: ${keywords.join(', ')}`)
      return null
    } catch (error) {
      console.error(`❌ 素材库插件执行失败:`, error)
      return null
    }
  }

  /**
   * 从文本中提取关键词（名词）
   * 优先级：
   * 1. LLM 明确指示的关键词（如 找"X"的图片）- 最高优先级
   * 2. 从【】中提取的关键词
   * 3. 从量词模式中提取的关键词
   */
  private static extractKeywordsFromText(text: string): string[] {
    const keywords: string[] = []
    
    // 方式 1: 从 LLM 明确指示中提取关键词（最高优先级！）
    // 这些是 LLM 明确告诉我们要找的内容
    console.log(`🔎 正在扫描 LLM 明确指示的关键词...`)
    
    // 第一步：先尝试从 "风格：X" 或 "风格名称：X" 格式提取（最直接）
    const stylePatterns = [
      /风格名称[：:]\s*([^\n]*?)(?:\n|$)/,    // 风格名称：美食摄影风（可以包含破折号等）
      /风格[：:]\s*([^\s\n，。，、]+)/,      // 风格：美食摄影风
    ]
    
    for (const pattern of stylePatterns) {
      const styleMatch = pattern.exec(text)
      if (styleMatch && styleMatch[1]) {
        const keyword = styleMatch[1]
          .trim()
          .replace(/^["']|["']$/g, '')  // 移除引号
          .split(/[，。，、]/)[0]        // 如果有多个，取第一个
          .trim()
        if (keyword) {
          console.log(`  ✓ 从风格提取关键词: "${keyword}"`)
          console.log(`🎯 找到 LLM 明确指示的关键词:`, [keyword])
          return [keyword]
        }
      }
    }
    
    const findPatterns = [
      // 找"X"的图 / 找"X"的参考图
      /找(?:到)?["\"]([^"\"]+)["\"]的(?:参考)?图/g,
      // 找"X"
      /找["\"]([^"\"]+)["\"]/g,
      // 参考图...中找到"X"的参考图 或 参考图...中找"X"
      /参考图[：:\s]*需在.*?中找(?:到)?["\"]([^"\"]+)["\"](?:的参考图)?/g,
      // 在图库...中找到"X"
      /在图库.*?中找(?:到)?["\"]([^"\"]+)["\"](?:的参考图)?/g,
      // 图库中找"X"或中找到"X"
      /图库[⊕中][^找]*找(?:到)?["\"]([^"\"]+)["\"](?:的参考图)?/g,
    ]
    
    const explicitKeywords: string[] = []
    for (const pattern of findPatterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const keyword = match[1]?.trim()
        if (keyword && keyword.length > 0 && !explicitKeywords.includes(keyword)) {
          console.log(`  ✓ 匹配到关键词: "${keyword}"`)
          explicitKeywords.push(keyword)
        }
      }
    }
    
    // 如果找到了 LLM 明确指示的关键词，直接返回
    if (explicitKeywords.length > 0) {
      console.log(`🎯 找到 LLM 明确指示的关键词:`, explicitKeywords)
      return explicitKeywords.slice(0, 1)  // 只返回第一个，因为 LLM 指定了
    }
    
    console.log(`⚠️ 未找到 LLM 明确指示的关键词，尝试从【】中提取...`)
    
    // 方式 2: 提取【】中的内容（次优先级）
    const bracketMatches = text.match(/【([^】]+)】/g)
    if (bracketMatches) {
      bracketMatches.forEach(match => {
        const content = match.replace(/【|】/g, '').trim()
        // 只取第一个逗号之前的内容（避免从列表中提取）
        const firstNoun = content.split(/[，,、；;]/)[0].trim()
        // 过滤掉过短的词汇和特殊词汇
        if (firstNoun && firstNoun.length > 1 && !['色', '风', '法'].includes(firstNoun)) {
          keywords.push(firstNoun)
        }
      })
    }
    
    // 方式 3: 从 "一个X"、"一只X" 模式提取
    const nounPatterns = [
      /一个([^\s，。，、；]+)/,
      /一只([^\s，。，、；]+)/,
      /一张([^\s，。，、；]+)/,
    ]
    
    for (const pattern of nounPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        const keyword = match[1].trim()
        if (keyword.length > 1) keywords.push(keyword)
      }
    }
    
    // 去重并返回前 3 个
    const uniqueKeywords = Array.from(new Set(keywords))
    console.log(`🔍 提取到的备选关键词:`, uniqueKeywords)
    return uniqueKeywords.slice(0, 3)
  }

  /**
   * 从系统提示词中解析插件引用
   * 格式：⊕ 插件名
   */
  private static parsePluginReferences(systemPrompt: string): string[] {
    const references: string[] = []
    // 匹配 ⊕ 后面跟着的插件名
    // 支持中文、英文、数字、连字符、下划线等
    // 直到遇到：空格 + 非插件字符、标点符号、换行、或行尾
    const regex = /⊕\s+([^\s\n。，，.;；！!\n]+)/g
    let match

    while ((match = regex.exec(systemPrompt)) !== null) {
      const pluginName = match[1].trim()
      if (pluginName && !references.includes(pluginName)) {
        references.push(pluginName)
        console.log(`📍 解析到插件引用: "${pluginName}"`)
      }
    }

    return references
  }

  /**
   * 调用单个 API
   */
  private static async callApi(
    api: APIConfig,
    data: Record<string, any>
  ): Promise<any> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...api.headers,
      }

      // 添加认证信息
      if (api.authType === 'bearer' && api.authKey) {
        headers['Authorization'] = `Bearer ${api.authKey}`
      } else if (api.authType === 'api-key' && api.authKey) {
        headers['X-API-Key'] = api.authKey
      }

      // 处理请求体
      let body = api.body ? JSON.parse(JSON.stringify(api.body)) : {}
      
      // 智能处理 LLM API 的 messages 格式
      if (api.body && Array.isArray(api.body.messages)) {
        // 这是一个 LLM API，使用 messages 格式
        const userPrompt = data.prompt || data.input || ''
        body.messages = [
          {
            role: 'system',
            content: api.body.messages[0]?.content || '你是一个有帮助的助手',
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ]
        // 移除原有的 prompt 字段
        delete body.prompt
      } 
      // 智能处理图生图 API
      else if (api.body && api.body.prompt && data.input) {
        // 这是图生图 API，prompt 用前面的输出
        body.prompt = data.input
        
        // 处理参考图（支持单张或多张）
        if (data.image || data.referenceImage) {
          const imageData = data.image || data.referenceImage
          
          // 判断是单张还是多张
          const isArray = Array.isArray(imageData)
          const images = isArray ? imageData : [imageData]
          
          console.log(`🖼️ 处理图片数据: ${images.length} 张`)
          
          // 处理每张图片
          const processedImages: string[] = []
          for (const img of images) {
            let processedImg = img
            
            // 如果是相对路径（本地上传的素材库图片），转换为 Base64
            if (img.startsWith('/')) {
              console.warn(`⚠️ 检测到本地路径: ${img}，调用 Base64 转换 API`)
              
              try {
                // 调用 Base64 转换 API
                const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
                const base64ApiUrl = `${baseUrl}/api/asset-to-base64?path=${encodeURIComponent(img)}`
                
                const response = await fetch(base64ApiUrl)
                if (response.ok) {
                  const result = await response.json()
                  if (result.dataUrl) {
                    console.log(`✅ 已转换为 Base64，大小: ${(result.size / 1024).toFixed(2)} KB`)
                    processedImg = result.dataUrl
                  } else {
                    throw new Error('API 未返回 dataUrl')
                  }
                } else {
                  throw new Error(`API 返回 ${response.status}`)
                }
              } catch (error) {
                console.error(`❌ Base64 转换失败: ${error}`)
                // 降级方案：使用 URL（可能会超时）
                let publicUrl = ''
                if (process.env.NEXT_PUBLIC_ASSET_CDN) {
                  publicUrl = `${process.env.NEXT_PUBLIC_ASSET_CDN}${img}`
                  console.log(`🔄 降级为 URL 方案，使用 CDN: ${publicUrl}`)
                } else if (process.env.NEXT_PUBLIC_API_URL) {
                  publicUrl = `${process.env.NEXT_PUBLIC_API_URL}${img}`
                  console.log(`🔄 降级为 URL 方案，使用公网 URL: ${publicUrl}`)
                }
                if (publicUrl) {
                  processedImg = publicUrl
                }
              }
            } else if (img.startsWith('data:') || img.startsWith('http')) {
              // 已经是 Base64 或网络 URL，直接使用
              console.log(`🖼️ 使用原有的参考图格式`)
              processedImg = img
            }
            
            processedImages.push(processedImg)
          }
          
          // 设置到 body 中
          if (isArray) {
            body.image = processedImages
            console.log(`🖼️ 为图生图 API 设置 ${processedImages.length} 张参考图（数组格式）`)
          } else {
            body.image = processedImages[0]
            console.log(`🖼️ 为图生图 API 设置参考图`)
          }
        }
      } else {
        // 这是其他类型的 API，直接合并数据
        body = { ...body, ...data }
      }

      console.log(`🔄 调用 API: ${api.name}`)
      console.log(`📤 请求体详情:`, JSON.stringify(body, null, 2))

      const response = await fetch(api.endpoint, {
        method: api.method,
        headers,
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ API 调用失败: ${api.name} (${response.status})`)
        console.error(`❌ 错误响应: ${errorText}`)
        return null
      }

      const result = await response.json()
      
      // 如果是 LLM 的 chat completions 响应，提取消息内容
      if (result.choices && result.choices[0]?.message?.content) {
        console.log(`✅ LLM 响应:`, result.choices[0].message.content)
        return result.choices[0].message.content
      }

      // 如果是图生 API 的响应，提取 URL 或结果
      if (result.data) {
        console.log(`✅ 图生 API 响应:`, result.data)
        // 如果 data 是数组，返回第一个；如果是对象，直接返回
        if (Array.isArray(result.data) && result.data.length > 0) {
          const firstItem = result.data[0]
          if (typeof firstItem === 'object' && firstItem.url) {
            return firstItem.url
          }
          return firstItem
        }
        return result.data
      }
      
      console.log(`✅ API 响应:`, result)
      return result
    } catch (error) {
      console.error(`❌ API 调用错误: ${api.name}`, error)
      return null
    }
  }
}

/**
 * 测试单个 API
 */
export async function testAPI(apiId: string, testData?: Record<string, any>): Promise<any> {
  const api = apiStorage.getById(apiId)
  if (!api) {
    return { error: 'API not found' }
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...api.headers,
    }

    if (api.authType === 'bearer' && api.authKey) {
      headers['Authorization'] = `Bearer ${api.authKey}`
    } else if (api.authType === 'api-key' && api.authKey) {
      headers['X-API-Key'] = api.authKey
    }

    const body = { ...api.body, ...testData }

    const response = await fetch(api.endpoint, {
      method: api.method,
      headers,
      body: JSON.stringify(body),
    })

    const result = await response.json()
    return {
      status: response.status,
      success: response.ok,
      data: result,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}