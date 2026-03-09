"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Edit2, Play } from 'lucide-react'
import { APIConfig } from '@/lib/types/agent'
import { apiStorage } from '@/lib/agent-storage'
import APIForm from './APIForm'
import { testAPI } from '@/lib/agent-executor'

interface APIManagementPanelProps {
  apis: APIConfig[]
  onApisChange: () => void
  editingApiId: string | null
  setEditingApiId: (id: string | null) => void
}

export default function APIManagementPanel({
  apis,
  onApisChange,
  editingApiId,
  setEditingApiId,
}: APIManagementPanelProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [testingApiId, setTestingApiId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<any>(null)

  const handleAddApi = () => {
    setEditingApiId(null)
    setIsCreating(true)
  }

  const handleSaveApi = () => {
    onApisChange()
    setIsCreating(false)
    setEditingApiId(null)
  }

  const handleDeleteApi = (id: string) => {
    if (confirm('确定删除这个 API 吗？')) {
      apiStorage.delete(id)
      onApisChange()
    }
  }

  const handleTestApi = async (apiId: string) => {
    setTestingApiId(apiId)
    const result = await testAPI(apiId)
    setTestResult(result)
    setTimeout(() => setTestingApiId(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* 创建/编辑表单 */}
      {isCreating && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            {editingApiId ? '编辑 API' : '创建新 API'}
          </h2>
          <APIForm
            apiId={editingApiId}
            onSuccess={handleSaveApi}
            onCancel={() => {
              setIsCreating(false)
              setEditingApiId(null)
            }}
          />
        </div>
      )}

      {/* API 列表 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">API 列表</h2>
        {!isCreating && (
          <Button onClick={handleAddApi} size="sm" className="gap-2">
            <Plus size={16} />
            新增 API
          </Button>
        )}
      </div>

      {apis.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>暂无 API，点击"新增 API"创建第一个</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {apis.map((api) => (
            <div
              key={api.id}
              className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold">{api.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{api.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleTestApi(api.id)}
                    disabled={testingApiId === api.id}
                  >
                    <Play size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingApiId(api.id)
                      setIsCreating(true)
                    }}
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteApi(api.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                <div>
                  <span className="text-gray-500">端点:</span> {api.endpoint}
                </div>
                <div>
                  <span className="text-gray-500">方法:</span> {api.method}
                </div>
                <div>
                  <span className="text-gray-500">认证:</span> {api.authType}
                </div>
              </div>

              {testingApiId === api.id && testResult && (
                <div className="mt-3 p-3 bg-black/30 rounded text-xs">
                  <p className="text-green-400 mb-2">
                    ✓ 测试成功 (Status: {testResult.status})
                  </p>
                  <pre className="text-gray-300 overflow-auto max-h-[150px]">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}