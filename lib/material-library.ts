/**
 * 素材库管理和检索系统
 * 用于 Agent 插件检索图片素材
 */

import { apiStorage } from './agent-storage'

export interface MaterialAsset {
  id: string
  name: string  // 素材的名词名称，用于检索
  url: string
  category?: string
  tags?: string[]
  createdAt?: string
}

export interface MaterialLibrary {
  id: string
  name: string  // 如："自由生图-参考图"
  category: string  // 如："自由生图"
  description?: string
  assets: MaterialAsset[]
}

/**
 * 素材库存储和检索
 */
export const materialLibraryManager = {
  /**
   * 获取所有素材库
   */
  getAllLibraries: async (): Promise<MaterialLibrary[]> => {
    try {
      const response = await fetch('/api/assets?type=自由生图-参考图')
      if (!response.ok) return []
      
      const assets = await response.json()
      
      // 组织成素材库结构
      const library: MaterialLibrary = {
        id: '自由生图-参考图',
        name: '自由生图-参考图',
        category: '自由生图',
        description: '用于自由生图的参考图片库',
        assets: assets.map((asset: any) => ({
          id: asset.id,
          name: asset.name || asset.tags?.[0] || '未命名',  // 优先使用 name 字段，或第一个标签
          url: asset.url,
          category: asset.type,
          tags: asset.tags || [],
          createdAt: asset.createdAt,
        }))
      }
      
      return [library]
    } catch (error) {
      console.error('❌ 获取素材库失败:', error)
      return []
    }
  },

  /**
   * 按名词检索素材库
   * @param libraryName 素材库名称，如："自由生图-参考图"、"参考生图"
   * @param keyword 要检索的名词，如："蛋糕"、"18会员日-分会场"
   * @returns 匹配的素材 URL，如果完全匹配返回单张，否则返回 null
   */
  searchByKeyword: async (libraryName: string, keyword: string): Promise<string | null> => {
    try {
      // 支持多个素材库名称
      const supportedLibraries = ['自由生图-参考图', '参考生图']
      if (!supportedLibraries.includes(libraryName)) {
        console.warn(`⚠️ 暂不支持素材库: ${libraryName}，仅支持: ${supportedLibraries.join(', ')}`)
        return null
      }

      // 从 API 获取所有素材
      const response = await fetch('/api/assets')
      if (!response.ok) {
        console.error(`❌ 获取素材库失败: API 返回 ${response.status}`)
        return null
      }
      
      const assets = await response.json()
      console.log(`📦 素材库中有 ${assets.length} 个资产，尝试匹配关键词: "${keyword}"`)
      
      // 列出所有素材库中的名称供调试
      const allAssetNames = assets.map((a: any) => a.name).filter(Boolean)
      console.log(`📋 素材库中的所有名称:`, allAssetNames)
      
      // 精确匹配：素材的 name 必须完全相同
      const matchedAsset = assets.find((asset: any) => {
        const assetName = asset.name?.trim() || ''
        return assetName === keyword.trim()
      })
      
      if (matchedAsset) {
        console.log(`✅ 素材库检索成功: "${libraryName}" 找到 "${keyword}" -> ${matchedAsset.url}`)
        return matchedAsset.url
      }
      
      console.warn(`⚠️ 素材库检索未找到: "${libraryName}" 中的 "${keyword}"，已尝试精确匹配`)
      return null
    } catch (error) {
      console.error(`❌ 素材库检索失败: ${libraryName}`, error)
      return null
    }
  },

  /**
   * 模糊匹配：返回所有包含关键词的素材
   */
  searchByKeywordFuzzy: async (libraryName: string, keyword: string): Promise<MaterialAsset[]> => {
    try {
      const supportedLibraries = ['自由生图-参考图', '参考生图']
      if (!supportedLibraries.includes(libraryName)) {
        return []
      }

      const response = await fetch('/api/assets')
      if (!response.ok) return []
      
      const assets = await response.json()
      const normalizedKeyword = keyword.toLowerCase().trim()
      
      return assets
        .filter((asset: any) => {
          const assetName = (asset.name || '').toLowerCase()
          const tags = (asset.tags || []).map((t: string) => t.toLowerCase())
          return assetName.includes(normalizedKeyword) || tags.some(tag => tag.includes(normalizedKeyword))
        })
        .map((asset: any) => ({
          id: asset.id,
          name: asset.name || asset.tags?.[0] || '未命名',
          url: asset.url,
          category: asset.type,
          tags: asset.tags || [],
        }))
    } catch (error) {
      console.error(`❌ 素材库模糊搜索失败: ${libraryName}`, error)
      return []
    }
  },

  /**
   * 创建一个虚拟 API 配置用于素材库检索
   * 这个不是真的 API，而是用来标识素材库插件的
   */
  createVirtualAPI: (libraryName: string): any => {
    return {
      id: `material_${libraryName}`,
      name: libraryName,
      description: `素材库检索: ${libraryName}`,
      endpoint: 'internal://material-library',
      method: 'GET',
      authType: 'none',
      headers: {},
      body: {
        libraryName: libraryName,
        searchType: 'keyword'  // 精确匹配
      },
      type: 'material-library',  // 特殊标记
    }
  }
}