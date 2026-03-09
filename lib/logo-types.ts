// Logo 组件类型定义
export interface LogoItem {
  id: string;
  url: string | null;
}

export interface LogoConfig {
  enabled: boolean;
  items: LogoItem[];
  itemSize: number;
  gap: number;
  align: 'left' | 'center' | 'right';
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  opacity: number;
  x?: number;  // 自由拖动的 X 坐标
  y?: number;  // 自由拖动的 Y 坐标
}

// 默认 Logo 配置
export const DEFAULT_LOGO_CONFIG: LogoConfig = {
  enabled: false,
  items: [],
  itemSize: 80,
  gap: 10,
  align: 'left',
  position: 'bottom-left',
  opacity: 1,
  x: 16,
  y: undefined,  // 从底部开始
};