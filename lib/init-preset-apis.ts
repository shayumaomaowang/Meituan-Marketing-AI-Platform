/**
 * 预置的 API 配置（已清理 - 本地版本）
 * 移除了所有外部 API 依赖
 */

import { APIConfig } from './types/agent'
import { apiStorage } from './agent-storage'

// 本地版本不再预置任何外部 API
export const PRESET_APIS: Omit<APIConfig, 'id' | 'createdAt' | 'updatedAt'>[] = []

/**
 * 初始化预置的 API（已禁用）
 * 本地版本不再自动加载外部 API
 */
export function initializePresetAPIs() {
  if (typeof window === 'undefined') return
  console.log('✅ 本地版本 - 不加载外部 API 配置')
}
