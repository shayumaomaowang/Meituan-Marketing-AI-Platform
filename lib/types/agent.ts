// API 接口配置
export interface APIConfig {
  id: string
  name: string
  description?: string
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers: Record<string, string>
  authType: 'bearer' | 'api-key' | 'none'
  authKey?: string
  body?: Record<string, any>
  responseFormat?: 'json' | 'text'
  createdAt: number
  updatedAt: number
}

// 插件/技能配置（其实也是API）
export interface Plugin {
  id: string
  name: string
  description?: string
  type: 'api' | 'function'
  apiId?: string // 关联的API ID
  createdAt: number
  updatedAt: number
}

// Agent 配置
export interface Agent {
  id: string
  name: string
  description?: string
  
  // 系统提示词
  systemPrompt: string
  
  // 关联的API和插件
  primaryApiId: string // 主API ID
  pluginIds: string[] // 插件ID列表
  
  // 前端触发配置
  triggerSource: {
    tabName: string // "自由生图" | "模板头图" 等
    triggerCondition?: string
  }
  
  // 输出配置
  outputTarget: {
    location: 'messages' | 'canvas' | 'preview' // 输出到哪里
  }
  
  // 知识库和素材库（暂时预留）
  knowledgeBaseIds?: string[]
  materialLibraryIds?: string[]
  
  createdAt: number
  updatedAt: number
  enabled: boolean
}

// Agent 执行请求
export interface AgentExecutionRequest {
  agentId: string
  userInput: string
  context?: Record<string, any>
  // 用户上传的图片（Base64 格式）
  uploadedImages?: {
    productImage?: string  // 商品图
    sceneImage?: string    // 场景/人像图
  }
}

// Agent 执行结果
export interface AgentExecutionResult {
  success: boolean
  output: any
  error?: string
  apiCalls: Array<{
    apiId: string
    status: 'success' | 'failed'
    response: any
  }>
}