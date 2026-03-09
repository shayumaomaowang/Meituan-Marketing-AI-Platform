"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Agent, APIConfig } from '@/lib/types/agent'
import { AgentExecutor } from '@/lib/agent-executor'
import { Loader2, Upload, X } from 'lucide-react'
import Image from 'next/image'

interface AgentTesterProps {
  agentId: string
  agents: Agent[]
  apis: APIConfig[]
}

type ImageType = 'product' | 'scene' | null

export default function AgentTester({
  agentId,
  agents,
  apis,
}: AgentTesterProps) {
  const agent = agents.find(a => a.id === agentId)
  const [input, setInput] = useState('')
  const [productImage, setProductImage] = useState<string | null>(null)
  const [sceneImage, setSceneImage] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  if (!agent) return <div>Agent not found</div>

  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, imageType: ImageType) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      if (imageType === 'product') {
        setProductImage(result)
      } else if (imageType === 'scene') {
        setSceneImage(result)
      }
    }
    reader.readAsDataURL(file)
  }

  // 构建完整的用户输入，包含图片信息
  const buildFullInput = (): string => {
    const parts: string[] = []
    
    // 添加图片描述信息
    if (productImage) {
      parts.push('【上传了商品图】')
    }
    if (sceneImage) {
      parts.push('【上传了场景/人像图】')
    }
    if (!productImage && !sceneImage) {
      parts.push('【没有上传主体图】')
    }
    
    // 添加用户输入的文字
    if (input.trim()) {
      parts.push(input.trim())
    }
    
    return parts.join('\n')
  }

  const handleTest = async () => {
    const fullInput = buildFullInput()
    
    if (!fullInput.trim()) {
      alert('请输入测试数据或上传图片')
      return
    }

    setIsLoading(true)
    console.clear()
    console.log('🧪 开始 Agent 测试...')
    console.log('📝 完整输入:', fullInput)
    
    try {
      const result = await AgentExecutor.execute({
        agentId,
        userInput: fullInput,
        uploadedImages: {
          productImage,
          sceneImage,
        },
      })
      console.log('✅ 测试完成，结果:', result)
      setResult(result)
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        output: null,
        apiCalls: [],
      }
      console.error('❌ 测试失败:', errorResult)
      setResult(errorResult)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setInput('')
    setProductImage(null)
    setSceneImage(null)
    setResult(null)
  }

  const removeImage = (imageType: ImageType) => {
    if (imageType === 'product') {
      setProductImage(null)
    } else if (imageType === 'scene') {
      setSceneImage(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Agent 信息</h3>
          <div className="space-y-2 text-sm bg-white/5 rounded p-3">
            <div>
              <span className="text-gray-500">名称:</span> {agent.name}
            </div>
            <div>
              <span className="text-gray-500">触发源:</span> {agent.triggerSource.tabName}
            </div>
            <div>
              <span className="text-gray-500">主 API:</span> {apis.find(a => a.id === agent.primaryApiId)?.name}
            </div>
            <div>
              <span className="text-gray-500">插件数:</span> {agent.pluginIds.length}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">输入测试数据</h3>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入用户消息或数据..."
            className="w-full h-[120px] bg-white/5 border border-white/10 rounded px-3 py-2 text-sm resize-none"
          />
        </div>
      </div>

      {/* 图片上传区域 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 商品图上传 */}
        <div>
          <h3 className="text-sm font-medium mb-2">商品图上传（结构二）</h3>
          <div className="space-y-2">
            {productImage ? (
              <div className="relative rounded border border-white/10 p-2 bg-white/5">
                <div className="relative w-full h-[120px] rounded overflow-hidden bg-black/30">
                  <img 
                    src={productImage} 
                    alt="商品图" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => removeImage('product')}
                  className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 p-1 rounded text-white"
                >
                  <X size={16} />
                </button>
                <div className="mt-2 text-xs text-green-400">✓ 已上传商品图</div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-white/20 rounded p-4 text-center cursor-pointer hover:border-white/40 transition-colors">
                <Upload size={20} className="mx-auto mb-2 text-gray-400" />
                <div className="text-xs text-gray-400">点击上传商品图</div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'product')}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* 场景/人像图上传 */}
        <div>
          <h3 className="text-sm font-medium mb-2">场景/人像图上传（结构三）</h3>
          <div className="space-y-2">
            {sceneImage ? (
              <div className="relative rounded border border-white/10 p-2 bg-white/5">
                <div className="relative w-full h-[120px] rounded overflow-hidden bg-black/30">
                  <img 
                    src={sceneImage} 
                    alt="场景/人像图" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => removeImage('scene')}
                  className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 p-1 rounded text-white"
                >
                  <X size={16} />
                </button>
                <div className="mt-2 text-xs text-green-400">✓ 已上传场景/人像图</div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-white/20 rounded p-4 text-center cursor-pointer hover:border-white/40 transition-colors">
                <Upload size={20} className="mx-auto mb-2 text-gray-400" />
                <div className="text-xs text-gray-400">点击上传场景/人像图</div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'scene')}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={handleClear}>
          清空
        </Button>
        <Button onClick={handleTest} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              执行中...
            </>
          ) : (
            '执行'
          )}
        </Button>
      </div>

      {result && (
        <div className="mt-4 space-y-4">
          <div className={`p-3 rounded ${result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
            <div className="text-sm font-medium mb-2">
              {result.success ? '✓ 执行成功' : '✗ 执行失败'}
            </div>
            {result.error && (
              <div className="text-xs text-red-400 mb-2">{result.error}</div>
            )}
          </div>

          {result.output && (
            <div>
              <h4 className="text-sm font-medium mb-2">输出结果</h4>
              <pre className="bg-black/30 rounded p-3 text-xs overflow-auto max-h-[200px] text-gray-300">
                {typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2)}
              </pre>
            </div>
          )}

          {result.apiCalls.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">API 调用记录</h4>
              <div className="space-y-2">
                {result.apiCalls.map((call: any, idx: number) => (
                  <div key={idx} className="bg-white/5 rounded p-3 text-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={call.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                        {call.status === 'success' ? '✓' : '✗'}
                      </span>
                      <span className="font-mono">{apis.find(a => a.id === call.apiId)?.name}</span>
                    </div>
                    <pre className="bg-black/30 rounded p-2 overflow-auto max-h-[100px] text-gray-300">
                      {JSON.stringify(call.response, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}