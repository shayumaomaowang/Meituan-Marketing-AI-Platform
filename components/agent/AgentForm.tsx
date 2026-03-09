"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Agent, APIConfig } from '@/lib/types/agent'
import { agentStorage, apiStorage } from '@/lib/agent-storage'
import { materialLibraryManager } from '@/lib/material-library'
import { X } from 'lucide-react'
import PromptEditor from './PromptEditor'

interface AgentFormProps {
  agentId?: string | null
  apis: APIConfig[]
  onSuccess: () => void
  onCancel: () => void
}

const TRIGGER_SOURCES = [
  { label: '自由生图', value: '自由生图' },
  { label: '模板头图', value: '模板头图' },
  { label: '外宣海报', value: '外宣海报' },
]

const OUTPUT_TARGETS = [
  { label: '对话窗口', value: 'messages' },
  { label: 'Canvas编辑器', value: 'canvas' },
  { label: '预览页面', value: 'preview' },
]

export default function AgentForm({
  agentId,
  apis,
  onSuccess,
  onCancel,
}: AgentFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [primaryApiId, setPrimaryApiId] = useState('')
  const [pluginIds, setPluginIds] = useState<string[]>([])
  const [triggerTab, setTriggerTab] = useState('')
  const [outputLocation, setOutputLocation] = useState('messages')
  const [enabled, setEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (agentId) {
      const agent = agentStorage.getById(agentId)
      if (agent) {
        setName(agent.name)
        setDescription(agent.description || '')
        setSystemPrompt(agent.systemPrompt)
        setPrimaryApiId(agent.primaryApiId)
        // 确保 pluginIds 是数组
        setPluginIds(Array.isArray(agent.pluginIds) ? agent.pluginIds : [])
        setTriggerTab(agent.triggerSource.tabName)
        setOutputLocation(agent.outputTarget.location)
        setEnabled(agent.enabled)
      }
    } else {
      setPrimaryApiId(apis[0]?.id || '')
    }
  }, [agentId, apis])

  const handleAddPlugin = (apiId: string) => {
    if (!pluginIds.includes(apiId)) {
      setPluginIds([...pluginIds, apiId])
    }
  }

  const handleRemovePlugin = (apiId: string) => {
    setPluginIds(pluginIds.filter(id => id !== apiId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (!name || !primaryApiId || !triggerTab) {
        alert('请填写必填项')
        setIsLoading(false)
        return
      }

      // 只保存真实的 API 插件 ID，过滤掉素材库插件（以 material_ 开头的）
      // 素材库插件通过系统提示词中的 ⊕ 插件名 自动识别
      const realPluginIds = pluginIds.filter(id => !id.startsWith('material_'))

      const agentData = {
        name,
        description,
        systemPrompt,
        primaryApiId,
        pluginIds: realPluginIds,
        triggerSource: { tabName: triggerTab },
        outputTarget: { location: outputLocation },
        enabled,
      }

      if (agentId) {
        agentStorage.update(agentId, agentData)
      } else {
        agentStorage.add(agentData)
      }

      onSuccess()
    } catch (error) {
      alert('保存失败：' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Agent 名称 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm"
            placeholder="例如：图片生成分析器"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">状态</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">{enabled ? '启用' : '禁用'}</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm"
          rows={2}
          placeholder="Agent 的用途说明"
        />
      </div>

      <PromptEditor
        value={systemPrompt}
        onChange={setSystemPrompt}
        plugins={apis.filter(api => api.id !== primaryApiId)}
        primaryApiId={primaryApiId}
        materialLibraryPlugins={['自由生图-参考图', '参考生图']}  // 传入素材库插件列表
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">主 API *</label>
          <select
            value={primaryApiId}
            onChange={(e) => setPrimaryApiId(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm"
          >
            <option value="">选择主 API</option>
            {apis.map(api => (
              <option key={api.id} value={api.id}>{api.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">触发源 *</label>
          <select
            value={triggerTab}
            onChange={(e) => setTriggerTab(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm"
          >
            <option value="">选择触发源</option>
            {TRIGGER_SOURCES.map(source => (
              <option key={source.value} value={source.value}>{source.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">输出位置</label>
        <select
          value={outputLocation}
          onChange={(e) => setOutputLocation(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm"
        >
          {OUTPUT_TARGETS.map(target => (
            <option key={target.value} value={target.value}>{target.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">API 插件/技能</label>
        <div className="space-y-2">
          {pluginIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pluginIds.map(id => {
                const api = apis.find(a => a.id === id)
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 bg-primary/20 border border-primary/50 rounded px-3 py-1"
                  >
                    <span className="text-sm">🔗 {api?.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePlugin(id)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          
          {apis.filter(api => api.id !== primaryApiId && !pluginIds.includes(api.id)).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {apis
                .filter(api => api.id !== primaryApiId && !pluginIds.includes(api.id))
                .map(api => (
                  <button
                    key={api.id}
                    type="button"
                    onClick={() => handleAddPlugin(api.id)}
                    className="px-3 py-1 text-sm bg-white/5 border border-white/10 rounded hover:border-primary/50 transition-colors"
                  >
                    + 🔗 {api.name}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm">
        <div className="text-blue-400 font-medium mb-1">💡 关于素材库插件</div>
        <div className="text-gray-300 text-xs space-y-1">
          <div>素材库插件无需在此添加，只需在上方<strong>系统提示词</strong>中引用即可，系统将自动识别并执行素材库检索：</div>
          <div className="ml-3 space-y-0.5">
            <div>• <code className="bg-white/10 px-1.5 py-0.5 rounded">⊕ 自由生图-参考图</code> - 自由生图的参考图库</div>
            <div>• <code className="bg-white/10 px-1.5 py-0.5 rounded">⊕ 参考生图</code> - 参考生图的参考图库</div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? '保存中...' : agentId ? '更新 Agent' : '创建 Agent'}
        </Button>
      </div>
    </form>
  )
}