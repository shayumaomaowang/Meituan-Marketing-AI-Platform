import { APIConfig, Agent, Plugin } from './types/agent'

const APIS_STORAGE_KEY = 'agent_apis'
const AGENTS_STORAGE_KEY = 'agent_configs'
const PLUGINS_STORAGE_KEY = 'agent_plugins'

// API 管理
export const apiStorage = {
  getAll: (): APIConfig[] => {
    if (typeof window === 'undefined') return []
    try {
      const data = localStorage.getItem(APIS_STORAGE_KEY)
      if (!data) return []
      const parsed = JSON.parse(data)
      // 验证数据是否为数组
      if (!Array.isArray(parsed)) {
        console.warn('❌ API 数据格式错误，重置为空数组')
        localStorage.removeItem(APIS_STORAGE_KEY)
        return []
      }
      return parsed
    } catch (error) {
      console.warn('❌ API 数据解析失败：', error)
      localStorage.removeItem(APIS_STORAGE_KEY)
      return []
    }
  },

  getById: (id: string): APIConfig | null => {
    const all = apiStorage.getAll()
    return all.find(api => api.id === id) || null
  },

  add: (api: Omit<APIConfig, 'id' | 'createdAt' | 'updatedAt'>): APIConfig => {
    const newApi: APIConfig = {
      ...api,
      id: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const all = apiStorage.getAll()
    const updated = [...all, newApi]
    if (typeof window !== 'undefined') {
      localStorage.setItem(APIS_STORAGE_KEY, JSON.stringify(updated))
    }
    return newApi
  },

  update: (id: string, updates: Partial<APIConfig>): APIConfig | null => {
    const all = apiStorage.getAll()
    const index = all.findIndex(api => api.id === id)
    if (index === -1) return null
    
    const updated = {
      ...all[index],
      ...updates,
      updatedAt: Date.now(),
    }
    all[index] = updated
    if (typeof window !== 'undefined') {
      localStorage.setItem(APIS_STORAGE_KEY, JSON.stringify(all))
    }
    return updated
  },

  delete: (id: string): boolean => {
    const all = apiStorage.getAll()
    const filtered = all.filter(api => api.id !== id)
    if (filtered.length === all.length) return false
    if (typeof window !== 'undefined') {
      localStorage.setItem(APIS_STORAGE_KEY, JSON.stringify(filtered))
    }
    return true
  },
}

// Agent 管理
export const agentStorage = {
  getAll: (): Agent[] => {
    if (typeof window === 'undefined') return []
    try {
      const data = localStorage.getItem(AGENTS_STORAGE_KEY)
      if (!data) return []
      const parsed = JSON.parse(data)
      // 验证数据是否为数组
      if (!Array.isArray(parsed)) {
        console.warn('❌ Agent 数据格式错误，重置为空数组')
        localStorage.removeItem(AGENTS_STORAGE_KEY)
        return []
      }
      return parsed
    } catch (error) {
      console.warn('❌ Agent 数据解析失败：', error)
      localStorage.removeItem(AGENTS_STORAGE_KEY)
      return []
    }
  },

  getById: (id: string): Agent | null => {
    const all = agentStorage.getAll()
    return all.find(agent => agent.id === id) || null
  },

  add: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Agent => {
    const newAgent: Agent = {
      ...agent,
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const all = agentStorage.getAll()
    const updated = [...all, newAgent]
    if (typeof window !== 'undefined') {
      localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(updated))
    }
    return newAgent
  },

  update: (id: string, updates: Partial<Agent>): Agent | null => {
    const all = agentStorage.getAll()
    const index = all.findIndex(agent => agent.id === id)
    if (index === -1) return null
    
    const updated = {
      ...all[index],
      ...updates,
      updatedAt: Date.now(),
    }
    all[index] = updated
    if (typeof window !== 'undefined') {
      localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(all))
    }
    return updated
  },

  delete: (id: string): boolean => {
    const all = agentStorage.getAll()
    const filtered = all.filter(agent => agent.id !== id)
    if (filtered.length === all.length) return false
    if (typeof window !== 'undefined') {
      localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(filtered))
    }
    return true
  },

  // 根据触发源获取Agent
  getByTriggerSource: (tabName: string): Agent | null => {
    const all = agentStorage.getAll()
    const agent = all.find(a => a.triggerSource.tabName === tabName && a.enabled)
    return agent || null
  },

  // 获取所有 API 配置
  getAllApis: (): APIConfig[] => {
    return apiStorage.getAll()
  },
}

// Plugin 管理
export const pluginStorage = {
  getAll: (): Plugin[] => {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(PLUGINS_STORAGE_KEY)
    return data ? JSON.parse(data) : []
  },

  getById: (id: string): Plugin | null => {
    const all = pluginStorage.getAll()
    return all.find(plugin => plugin.id === id) || null
  },

  add: (plugin: Omit<Plugin, 'id' | 'createdAt' | 'updatedAt'>): Plugin => {
    const newPlugin: Plugin = {
      ...plugin,
      id: `plugin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const all = pluginStorage.getAll()
    const updated = [...all, newPlugin]
    if (typeof window !== 'undefined') {
      localStorage.setItem(PLUGINS_STORAGE_KEY, JSON.stringify(updated))
    }
    return newPlugin
  },

  delete: (id: string): boolean => {
    const all = pluginStorage.getAll()
    const filtered = all.filter(plugin => plugin.id !== id)
    if (filtered.length === all.length) return false
    if (typeof window !== 'undefined') {
      localStorage.setItem(PLUGINS_STORAGE_KEY, JSON.stringify(filtered))
    }
    return true
  },
}