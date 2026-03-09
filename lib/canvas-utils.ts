export interface LogoItem {
  id: string;
  url: string | null;
}

export interface CanvasLayer {
  id: string;
  type: 'text' | 'image' | 'logo-group';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  visible: boolean;
  
  // Logo Group specific
  logoItems?: LogoItem[];
  logoItemSize?: number;
  logoGap?: number;
  logoAlign?: 'left' | 'center';

  // 文字特有属性
  content?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: string;

  // 富文本支持
  richText?: {
    text: string;
    styles: {
      start: number;
      end: number;
      color?: string;
      fontSize?: number;
    }[];
  };

  // 图片特有属性
  src?: string;
  scale?: number;

  // Coze 字段映射标签
  cozeField?: string;

  // 父子关系：当父图层移动/缩放时，子图层会保持相对位置关系
  parentId?: string;
}

export interface CustomTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: CanvasLayer[];
  createdAt: string;
  updatedAt: string;
  previewUrl?: string;
  layout?: string;
}