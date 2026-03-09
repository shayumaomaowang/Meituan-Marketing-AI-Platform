"use client"

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Edit2, Play, MoreVertical } from 'lucide-react'
import { APIConfig, Agent } from '@/lib/types/agent'
import { apiStorage, agentStorage, pluginStorage } from '@/lib/agent-storage'
import APIManagementPanel from './agent/APIManagementPanel'
import AgentEditor from './agent/AgentEditor'
import { initializePresetAPIs } from '@/lib/init-preset-apis'

export default function BackendDebugPage() {
  const [activeTab, setActiveTab] = useState('apis')
  const [apis, setApis] = useState<APIConfig[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedApiId, setSelectedApiId] = useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [editingApiId, setEditingApiId] = useState<string | null>(null)
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null)

  // 初始化加载数据
  useEffect(() => {
    // 初始化预置API
    initializePresetAPIs()
    loadApis()
    loadAgents()
  }, [])

  const loadApis = () => {
    setApis(apiStorage.getAll())
  }

  const loadAgents = () => {
    setAgents(agentStorage.getAll())
  }

  const handleDeleteApi = (id: string) => {
    if (confirm('确定删除这个API吗？')) {
      apiStorage.delete(id)
      loadApis()
    }
  }

  const handleResetData = () => {
    if (confirm('确定要清除所有本地数据吗？这将删除所有已保存的 API 和 Agent。')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('agent_apis')
        localStorage.removeItem('agent_configs')
        localStorage.removeItem('agent_plugins')
        // 重新初始化预置API
        initializePresetAPIs()
        loadApis()
        loadAgents()
        alert('✅ 数据已重置，预置 API 已恢复')
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">后端调试</h1>
          <p className="text-gray-400">管理 API 和创建智能体</p>
          <button
            onClick={handleResetData}
            className="mt-4 px-4 py-2 text-sm bg-red-500/10 border border-red-500/30 text-red-400 rounded hover:bg-red-500/20 transition-colors"
          >
            🔄 重置所有数据
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-lg mb-6">
            <TabsTrigger value="apis" className="data-[state=active]:bg-primary">API管理</TabsTrigger>
            <TabsTrigger value="agents" className="data-[state=active]:bg-primary">Agent管理</TabsTrigger>
          </TabsList>

          {/* API 管理标签页 */}
          <TabsContent value="apis">
            <APIManagementPanel 
              apis={apis}
              onApisChange={loadApis}
              editingApiId={editingApiId}
              setEditingApiId={setEditingApiId}
            />
          </TabsContent>

          {/* Agent 管理标签页 */}
          <TabsContent value="agents">
            <AgentEditor 
              agents={agents}
              onAgentsChange={loadAgents}
              editingAgentId={editingAgentId}
              setEditingAgentId={setEditingAgentId}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}