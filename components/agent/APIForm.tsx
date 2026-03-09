"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { APIConfig } from '@/lib/types/agent'
import { apiStorage } from '@/lib/agent-storage'

interface APIFormProps {
  apiId?: string | null
  onSuccess: () => void
  onCancel: () => void
}

export default function APIForm({ apiId, onSuccess, onCancel }: APIFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('POST')
  const [authType, setAuthType] = useState<'bearer' | 'api-key' | 'none'>('bearer')
  const [authKey, setAuthKey] = useState('')
  const [headers, setHeaders] = useState('{"Content-Type": "application/json"}')
  const [body, setBody] = useState('{}')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (apiId) {
      const api = apiStorage.getById(apiId)
      if (api) {
        setName(api.name)
        setDescription(api.description || '')
        setEndpoint(api.endpoint)
        setMethod(api.method)
        setAuthType(api.authType)
        setAuthKey(api.authKey || '')
        setHeaders(JSON.stringify(api.headers, null, 2))
        setBody(JSON.stringify(api.body || {}, null, 2))
      }
    }
  }, [apiId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      let headersObj = {}
      let bodyObj = {}

      try {
        headersObj = JSON.parse(headers)
      } catch {
        alert('Headers JSON 格式错误')
        setIsLoading(false)
        return
      }

      try {
        bodyObj = JSON.parse(body)
      } catch {
        alert('Body JSON 格式错误')
        setIsLoading(false)
        return
      }

      if (apiId) {
        apiStorage.update(apiId, {
          name,
          description,
          endpoint,
          method,
          authType,
          authKey,
          headers: headersObj,
          body: bodyObj,
        })
      } else {
        apiStorage.add({
          name,
          description,
          endpoint,
          method,
          authType,
          authKey,
          headers: headersObj,
          body: bodyObj,
        })
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
          <label className="block text-sm font-medium mb-2">API 名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm"
            placeholder="例如：豆宝图像生成"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">请求方法</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as any)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm"
          rows={2}
          placeholder="API 的用途和说明"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">API 端点 (URL)</label>
        <input
          type="text"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          required
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm"
          placeholder="https://api.example.com/v1/endpoint"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">认证类型</label>
          <select
            value={authType}
            onChange={(e) => setAuthType(e.target.value as any)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm"
          >
            <option value="none">无</option>
            <option value="bearer">Bearer Token</option>
            <option value="api-key">API Key</option>
          </select>
        </div>
        {authType !== 'none' && (
          <div>
            <label className="block text-sm font-medium mb-2">认证凭证</label>
            <input
              type="password"
              value={authKey}
              onChange={(e) => setAuthKey(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm"
              placeholder="输入 Token 或 API Key"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">请求头 (JSON)</label>
        <textarea
          value={headers}
          onChange={(e) => setHeaders(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono text-xs"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">默认请求体 (JSON)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono text-xs"
          rows={5}
          placeholder='{"model": "...", "prompt": "..."}'
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? '保存中...' : apiId ? '更新 API' : '创建 API'}
        </Button>
      </div>
    </form>
  )
}