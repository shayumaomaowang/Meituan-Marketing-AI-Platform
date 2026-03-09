"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Edit2, Play } from 'lucide-react'
import { Agent, APIConfig } from '@/lib/types/agent'
import { apiStorage, agentStorage } from '@/lib/agent-storage'
import AgentForm from './AgentForm'
import AgentTester from './AgentTester'

interface AgentEditorProps {
  agents: Agent[]
  onAgentsChange: () => void
  editingAgentId: string | null
  setEditingAgentId: (id: string | null) => void
}

export default function AgentEditor({
  agents,
  onAgentsChange,
  editingAgentId,
  setEditingAgentId,
}: AgentEditorProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [testingAgentId, setTestingAgentId] = useState<string | null>(null)
  const [apis, setApis] = useState<APIConfig[]>([])

  useEffect(() => {
    setApis(apiStorage.getAll())
  }, [])

  const handleAddAgent = () => {
    setEditingAgentId(null)
    setIsCreating(true)
  }

  const handleSaveAgent = () => {
    onAgentsChange()
    setIsCreating(false)
    setEditingAgentId(null)
  }

  const handleDeleteAgent = (id: string) => {
    if (confirm('确定删除这个 Agent 吗？')) {
      agentStorage.delete(id)
      onAgentsChange()
    }
  }

  const getApiName = (apiId: string) => {
    return apis.find(api => api.id === apiId)?.name || apiId
  }

  // 防御性检查：确保agents是数组
  const agentsList = Array.isArray(agents) ? agents : []

  return (
    <div className="space-y-6">
      {/* 创建/编辑表单 */}
      {isCreating && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            {editingAgentId ? '编辑 Agent' : '创建新 Agent'}
          </h2>
          <AgentForm
            agentId={editingAgentId}
            apis={apis}
            onSuccess={handleSaveAgent}
            onCancel={() => {
              setIsCreating(false)
              setEditingAgentId(null)
            }}
          />
        </div>
      )}

      {/* 测试面板 */}
      {testingAgentId && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Agent 测试</h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setTestingAgentId(null)}
            >
              关闭
            </Button>
          </div>
          <AgentTester
            agentId={testingAgentId}
            agents={agents}
            apis={apis}
          />
        </div>
      )}

      {/* Agent 列表 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Agent 列表</h2>
        {!isCreating && !testingAgentId && (
          <Button onClick={handleAddAgent} size="sm" className="gap-2">
            <Plus size={16} />
            新建 Agent
          </Button>
        )}
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>暂无 Agent，点击"新建 Agent"创建第一个</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {agentsList.map((agent) => (
            <div
              key={agent.id}
              className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{agent.name}</h3>
                    {agent.enabled ? (
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                        启用
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-gray-500/20 text-gray-400 rounded">
                        禁用
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{agent.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setTestingAgentId(agent.id)}
                  >
                    <Play size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingAgentId(agent.id)
                      setIsCreating(true)
                    }}
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteAgent(agent.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-400">
                <div>
                  <span className="text-gray-500">主 API:</span> {getApiName(agent.primaryApiId)}
                </div>
                <div>
                  <span className="text-gray-500">触发源:</span> {agent.triggerSource.tabName}
                </div>
                <div>
                  <span className="text-gray-500">输出位置:</span> {agent.outputTarget.location}
                </div>
                {agent.pluginIds.length > 0 && (
                  <div>
                    <span className="text-gray-500">插件:</span> {agent.pluginIds.map(id => getApiName(id)).join(', ')}
                  </div>
                )}
                {agent.systemPrompt && (
                  <details className="mt-3 pt-3 border-t border-white/10 cursor-pointer">
                    <summary className="text-blue-400 hover:text-blue-300 font-medium">
                      📋 查看系统提示词
                    </summary>
                    <div className="mt-2 p-3 bg-black/40 rounded text-xs font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                      {agent.systemPrompt}
                    </div>
                    <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded text-xs">
                      <div className="text-green-400 font-medium mb-1">✓ 检测到的插件引用：</div>
                      {(() => {
                        const regex = /⊕\s+([^\s\n。，，.;；！!\n]+)/g
                        const refs: string[] = []
                        let match
                        while ((match = regex.exec(agent.systemPrompt)) !== null) {
                          const ref = match[1].trim()
                          if (ref && !refs.includes(ref)) refs.push(ref)
                        }
                        return (
                          <div className="space-y-1">
                            {refs.length > 0 ? (
                              refs.map((ref, i) => {
                                const api = apis.find(a => a.name === ref)
                                return (
                                  <div key={i} className={api ? 'text-green-400' : 'text-red-400'}>
                                    ⊕ {ref} {!api && '(⚠️ 未找到)'}
                                  </div>
                                )
                              })
                            ) : (
                              <div className="text-gray-500">未检测到任何插件引用</div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}