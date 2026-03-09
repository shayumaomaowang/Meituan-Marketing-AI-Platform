'use client'

import { useEffect } from 'react'
import { initializePresetAPIs } from '@/lib/init-preset-apis'

/**
 * 客户端初始化器
 * 在应用启动时初始化预置API
 * 这个组件确保无论用户访问哪个页面，都能正确初始化
 */
export function ClientInitializer() {
  useEffect(() => {
    // 初始化预置API
    initializePresetAPIs()
  }, [])

  return null
}