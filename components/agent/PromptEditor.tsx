"use client"

import { useState, useRef } from 'react'
import { APIConfig } from '@/lib/types/agent'
import { ChevronDown, Plus } from 'lucide-react'

interface PromptEditorProps {
  value: string
  onChange: (value: string) => void
  plugins: APIConfig[]
  primaryApiId: string
  materialLibraryPlugins?: string[]  // 素材库插件列表，如 ["自由生图-参考图"]
}

export default function PromptEditor({
  value,
  onChange,
  plugins,
  primaryApiId,
  materialLibraryPlugins = [],
}: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showPluginMenu, setShowPluginMenu] = useState(false)

  // 获取可用的 API 插件列表（排除主 API）
  const availableApiPlugins = plugins.filter(p => p.id !== primaryApiId)
  
  // 获取可用的素材库插件列表
  const availableMaterialPlugins = materialLibraryPlugins.map(name => ({
    id: `material_${name}`,
    name: name,
    description: `素材库检索: ${name}`,
    type: 'material-library'
  }))

  const insertPluginReference = (pluginName: string) => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = value

    // 插入插件引用
    const newText =
      text.substring(0, start) + `⊕ ${pluginName} ` + text.substring(end)

    onChange(newText)
    setShowPluginMenu(false)

    // 重新设置光标位置
    setTimeout(() => {
      textarea.focus()
      const newPosition = start + pluginName.length + 3
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium mb-2">
        系统提示词（System Prompt）*
      </label>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono text-xs pr-14"
          rows={6}
          placeholder="定义 Agent 的行为和能力...&#10;&#10;💡 你可以使用 ⊕ 插件名 来引用插件&#10;例如：当用户要求生成图片时，使用 ⊕ 文生图"
        />

        {/* 插件引用按钮 */}
        {(availableApiPlugins.length > 0 || availableMaterialPlugins.length > 0) && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            <button
              type="button"
              onClick={() => setShowPluginMenu(!showPluginMenu)}
              className="px-2 py-1 text-xs bg-primary/20 border border-primary/50 text-primary rounded hover:bg-primary/30 transition-colors flex items-center gap-1 whitespace-nowrap z-30"
            >
              <Plus size={12} />
              插件
              <ChevronDown size={12} />
            </button>
          </div>
        )}

        {/* 插件菜单 */}
        {showPluginMenu && (availableApiPlugins.length > 0 || availableMaterialPlugins.length > 0) && (
          <>
            {/* 点击外部关闭 */}
            <div
              className="fixed inset-0 z-20"
              onClick={() => setShowPluginMenu(false)}
            />
            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-xl overflow-hidden max-h-80 overflow-y-auto">
              <div className="p-2 text-xs text-gray-400 border-b border-white/10 sticky top-0 bg-white/5">
                点击选择插件插入
              </div>
              
              {/* API 插件部分 */}
              {availableApiPlugins.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-medium text-primary bg-white/5 border-b border-white/10">
                    🔗 API 插件
                  </div>
                  {availableApiPlugins.map((plugin) => (
                    <button
                      key={plugin.id}
                      type="button"
                      onClick={() => insertPluginReference(plugin.name)}
                      className="w-full text-left px-3 py-2 hover:bg-primary/20 transition-colors text-sm text-gray-300 hover:text-white border-b border-white/5"
                    >
                      <div className="font-medium flex items-center gap-2">
                        <span className="text-primary">⊕</span>
                        {plugin.name}
                      </div>
                      {plugin.description && (
                        <div className="text-xs text-gray-500 mt-1">{plugin.description}</div>
                      )}
                    </button>
                  ))}
                </>
              )}
              
              {/* 素材库插件部分 */}
              {availableMaterialPlugins.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-medium text-blue-400 bg-white/5 border-b border-white/10">
                    📚 素材库插件
                  </div>
                  {availableMaterialPlugins.map((plugin) => (
                    <button
                      key={plugin.id}
                      type="button"
                      onClick={() => insertPluginReference(plugin.name)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-500/20 transition-colors text-sm text-gray-300 hover:text-blue-200 border-b border-white/5 last:border-b-0"
                    >
                      <div className="font-medium flex items-center gap-2">
                        <span className="text-blue-400">⊕</span>
                        {plugin.name}
                      </div>
                      {plugin.description && (
                        <div className="text-xs text-gray-500 mt-1">{plugin.description}</div>
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* 插件参考卡片 */}
      {(availableApiPlugins.length > 0 || availableMaterialPlugins.length > 0) && (
        <div className="mt-3 p-2.5 bg-blue-500/10 border border-blue-500/30 rounded text-xs space-y-2">
          <div className="font-medium text-blue-400">📚 可用插件引用：</div>
          
          {/* API 插件快速按钮 */}
          {availableApiPlugins.length > 0 && (
            <div>
              <div className="text-gray-500 text-xs mb-1">🔗 API 插件</div>
              <div className="flex flex-wrap gap-1.5">
                {availableApiPlugins.map((plugin) => (
                  <button
                    key={plugin.id}
                    type="button"
                    onClick={() => {
                      if (textareaRef.current) {
                        const start = textareaRef.current.selectionStart
                        const end = textareaRef.current.selectionEnd
                        const text = value
                        const newText =
                          text.substring(0, start) +
                          `⊕ ${plugin.name} ` +
                          text.substring(end)
                        onChange(newText)
                      }
                    }}
                    className="px-2 py-1 bg-blue-500/20 border border-blue-500/50 rounded hover:bg-blue-500/30 transition-colors text-blue-300 hover:text-blue-200 cursor-pointer"
                  >
                    ⊕ {plugin.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* 素材库插件快速按钮 */}
          {availableMaterialPlugins.length > 0 && (
            <div>
              <div className="text-gray-500 text-xs mb-1">📚 素材库插件</div>
              <div className="flex flex-wrap gap-1.5">
                {availableMaterialPlugins.map((plugin) => (
                  <button
                    key={plugin.id}
                    type="button"
                    onClick={() => {
                      if (textareaRef.current) {
                        const start = textareaRef.current.selectionStart
                        const end = textareaRef.current.selectionEnd
                        const text = value
                        const newText =
                          text.substring(0, start) +
                          `⊕ ${plugin.name} ` +
                          text.substring(end)
                        onChange(newText)
                      }
                    }}
                    className="px-2 py-1 bg-blue-500/20 border border-blue-500/50 rounded hover:bg-blue-500/30 transition-colors text-blue-300 hover:text-blue-200 cursor-pointer"
                  >
                    ⊕ {plugin.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}