import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Wand2, 
  Upload, 
  Palette, 
  Type, 
  Image as ImageIcon, 
  Stamp,
  Loader2,
  Plus,
  AlignLeft,
  AlignCenter,
  Trash2,
  Settings2
} from 'lucide-react';
import { CanvasLayer, CustomTemplate } from '@/lib/canvas-utils';
import { toast } from 'sonner';

// 计算图片有效面积（排除透明像素）
const calculateEffectiveArea = (imageSrc: string): Promise<number> => {
  if (typeof window === 'undefined') return Promise.resolve(0);

  return new Promise((resolve) => {
    const tryLoad = (src: string, isRetry: boolean) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(img.width * img.height);
          return;
        }

        ctx.drawImage(img, 0, 0);
        
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          let nonTransparentPixels = 0;
          
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 10) {
              nonTransparentPixels++;
            }
          }
          
          console.log(`📊 [图片分析] ${isRetry ? '(代理模式)' : '(直连模式)'} 尺寸:${img.width}x${img.height} 有效占比:${Math.round(nonTransparentPixels/(data.length/4)*100)}%`);
          resolve(nonTransparentPixels);
        } catch (e) {
          if (!isRetry && src.startsWith('http')) {
            console.log('🔒 [图片分析] 直连遇跨域限制，自动切换代理重试...');
            tryLoad(`/api/proxy-image?url=${encodeURIComponent(imageSrc)}`, true);
          } else {
            console.warn('⚠️ [图片分析] 无法读取像素');
            resolve(img.width * img.height);
          }
        }
      };

      img.onerror = () => {
        if (!isRetry && src.startsWith('http')) {
          console.log('❌ [图片分析] 直连加载失败，自动切换代理重试...');
          tryLoad(`/api/proxy-image?url=${encodeURIComponent(imageSrc)}`, true);
        } else {
          console.error('❌ [图片分析] 图片完全无法加载');
          resolve(0);
        }
      };

      img.src = src;
    };

    tryLoad(imageSrc, false);
  });
};

// 预设颜色主题 (关联背景图片)
const COLOR_THEMES = [
  { label: '喜庆红', value: 'red', bg: '#FF4D4F', bgImage: '/double11-banner.png' },
  { label: '活力橙', value: 'orange', bg: '#FA8C16', bgImage: '/member-day-banner.png' },
  { label: '商务蓝', value: 'blue', bg: '#1890FF', bgImage: '/member-free-banner.png' },
  { label: '清新绿', value: 'green', bg: '#52C41A', bgImage: '/platform-component.png' },
  { label: '高级黑', value: 'black', bg: '#000000', bgImage: '/member-homepage-card.png' },
  { label: '纯净白', value: 'white', bg: '#FFFFFF', bgImage: '/mini-program-card.png' },
];

// 预设 Logo 库
const LOGO_LIBRARY = [
  { label: '美团外卖', value: '/logos/meituan-waimai.png' },
  { label: '美团优选', value: '/logos/meituan-youxuan.png' },
  { label: '美团酒店', value: '/logos/meituan-hotel.png' },
  { label: '大众点评', value: '/logos/dianping.png' },
];

// 默认颜色预设
const DEFAULT_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', 
  '#FFFF00', '#00FFFF', '#FF00FF', '#C0C0C0', '#808080'
];

interface CanvasPropertiesProps {
  layers: CanvasLayer[];
  updateLayer: (id: string, updates: Partial<CanvasLayer>) => void;
  addLayer?: (layer: CanvasLayer) => void;
  deleteLayer?: (id: string) => void;
  onSave: (data: Partial<CustomTemplate>) => void;
  selectedLayerId?: string | null;
  // 其他 props 暂时保留以兼容接口，但可能不再使用
  [key: string]: any;
}

export function CanvasProperties({
  layers,
  updateLayer,
  addLayer,
  deleteLayer,
  onSave,
  selectedLayerId,
}: CanvasPropertiesProps) {
  // --- 1. 智能识别图层 ---
  const [layerIds, setLayerIds] = useState({
    mainImage: '',
    title: '',
    subTitle: '',
    logo: '',
    background: ''
  });

  useEffect(() => {
    // 基于图层的 cozeField 标签来识别图层（优先），或使用 name 作为备选
    const newIds = { ...layerIds };
    
    // 找主体图片：查找 cozeField 中包含"主体"的图层，或 name 中包含"主体"的图层
    const mainImg = layers.find(l => 
      l.type === 'image' && (
        (l.cozeField && l.cozeField.includes('主体')) || 
        (l.name && l.name.includes('主体'))
      )
    );
    if (mainImg) {
      newIds.mainImage = mainImg.id;
      console.log(`✅ [CanvasProperties] 找到主体图片: ${mainImg.name} (cozeField=${mainImg.cozeField}, id=${mainImg.id})`);
    }

    // 找 Logo：查找 cozeField 或 name 中包含"logo"或"Logo"的图层
    const logoImg = layers.find(l => 
      l.type === 'image' && (
        (l.cozeField && (l.cozeField.includes('logo') || l.cozeField.includes('Logo'))) ||
        (l.name && (l.name.includes('Logo') || l.name.includes('logo')))
      )
    );
    if (logoImg) newIds.logo = logoImg.id;

    // 找背景：查找 cozeField 或 name 中包含"背景"的图层
    const bgImg = layers.find(l => 
      l.type === 'image' && (
        (l.cozeField && l.cozeField.includes('背景')) ||
        (l.name && l.name.includes('背景'))
      )
    );
    if (bgImg) newIds.background = bgImg.id;

    // 找标题：字号最大的文字
    const texts = layers.filter(l => l.type === 'text');
    const sortedTexts = [...texts].sort((a, b) => (b.fontSize || 0) - (a.fontSize || 0));
    if (sortedTexts.length > 0) newIds.title = sortedTexts[0].id;
    if (sortedTexts.length > 1) newIds.subTitle = sortedTexts[1].id;

    setLayerIds(newIds);
    console.log(`🔍 [CanvasProperties] 已识别图层:`, newIds);
    console.log(`🔍 [CanvasProperties] 当前图层信息:`, layers.map(l => ({ id: l.id, name: l.name, type: l.type, cozeField: l.cozeField })));
  }, [layers]); // 依赖于整个 layers 数组，确保任何图层变化都会重新识别

  // --- 2. 表单状态 ---
  const [subjectMode, setSubjectMode] = useState<'generate' | 'upload'>('upload');
  const [subjectPrompt, setSubjectPrompt] = useState('');
  const [uploadedSubject, setUploadedSubject] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [selectedColor, setSelectedColor] = useState('red');
  const [titleText, setTitleText] = useState('');
  const [subTitleText, setSubTitleText] = useState('');
  const [selectedLogo, setSelectedLogo] = useState('');
  const [isLogoPickerOpen, setIsLogoPickerOpen] = useState(false);
  const [editingLogoId, setEditingLogoId] = useState<string | null>(null);
  const [logoAssets, setLogoAssets] = useState<any[]>([]);
  const [colorPresets, setColorPresets] = useState<string[]>([]);
  // 新增：记录文本选区状态 { elementId: { start, end } }
  const [textSelections, setTextSelections] = useState<Record<string, { start: number; end: number }>>({});

  // 加载预设
  useEffect(() => {
    const saved = localStorage.getItem('user_color_presets');
    if (saved) {
      try {
        setColorPresets(JSON.parse(saved));
      } catch (e) {
        setColorPresets(DEFAULT_COLORS);
      }
    } else {
      setColorPresets(DEFAULT_COLORS);
    }
  }, []);

  // 保存预设
  const savePreset = (color: string) => {
    if (!color || !color.startsWith('#')) return;
    if (!colorPresets.includes(color)) {
      const newPresets = [...colorPresets, color];
      setColorPresets(newPresets);
      localStorage.setItem('user_color_presets', JSON.stringify(newPresets));
      toast.success('颜色已保存到预设');
    }
  };
  
  // 删除预设
  const removePreset = (color: string, e: React.MouseEvent) => {
     e.stopPropagation();
     const newPresets = colorPresets.filter(c => c !== color);
     setColorPresets(newPresets);
     localStorage.setItem('user_color_presets', JSON.stringify(newPresets));
  };

  // 更新选区状态的辅助函数
  const updateSelection = (id: string, e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    setTextSelections(prev => ({
      ...prev,
      [id]: { start: target.selectionStart, end: target.selectionEnd }
    }));
  };

  // 处理富文本颜色变更
  const handleRichTextColorChange = (layerId: string, color: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    // 优先使用记录的选区状态，如果不存在则尝试获取 DOM（兜底）
    let start = 0;
    let end = 0;
    
    if (textSelections[layerId]) {
      start = textSelections[layerId].start;
      end = textSelections[layerId].end;
    } else {
      const textarea = document.getElementById(`textarea-${layerId}`) as HTMLTextAreaElement;
      if (textarea) {
        start = textarea.selectionStart;
        end = textarea.selectionEnd;
      }
    }

    console.log(`🎨 [ColorChange] ID:${layerId} Range:[${start}, ${end}] Color:${color}`);

    if (start === end) {
      // 如果没有选中文字，则修改全局颜色
      updateLayer(layerId, { color });
      return;
    }

    // 构建新的样式对象
    const currentStyles = layer.richText?.styles || [];
    const newStyle = { start, end, color };
    
    // 简单的样式合并逻辑
    const newStyles = [...currentStyles, newStyle];

    updateLayer(layerId, {
      richText: {
        text: layer.content || '',
        styles: newStyles
      }
    });
    toast.success('局部颜色已应用');
  };

  useEffect(() => {
    const fetchLogos = async () => {
      try {
        const res = await fetch('/api/assets?type=logo');
        if (res.ok) {
          const data = await res.json();
          setLogoAssets(data);
        }
      } catch (error) {
        console.error('Failed to fetch logos:', error);
      }
    };
    if (isLogoPickerOpen) {
      fetchLogos();
    }
  }, [isLogoPickerOpen]);

  // 同步画布内容到表单
  useEffect(() => {
    const titleLayer = layers.find(l => l.id === layerIds.title);
    if (titleLayer) setTitleText(titleLayer.content || '');

    const subTitleLayer = layers.find(l => l.id === layerIds.subTitle);
    if (subTitleLayer) setSubTitleText(subTitleLayer.content || '');
  }, [layerIds, layers]);

  // --- 3. 处理逻辑 ---

  // 轮询AI生成状态的函数
  const pollAIGeneration = async (chatId: string, conversationId: string): Promise<string> => {
    console.log(`🔄 [pollAIGeneration] 开始轮询，chatId=${chatId}, conversationId=${conversationId}`);
    
    const maxAttempts = 30; // 最多尝试30次
    const delayMs = 2000; // 每次间隔2秒
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`⏳ [pollAIGeneration] 第 ${attempt}/${maxAttempts} 次尝试`);
      
      // 1. 检查状态
      const statusResponse = await fetch(`/api/coze-canvas/status?conversation_id=${conversationId}&chat_id=${chatId}`);
      const statusResult = await statusResponse.json();
      
      if (statusResult.code !== 0) {
        console.error(`❌ [pollAIGeneration] 状态检查失败: ${statusResult.msg}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      const status = statusResult.data?.status;
      console.log(`📊 [pollAIGeneration] 当前状态: ${status}`);
      
      if (status === 'completed' || status === 'succeeded') {
        // 2. 状态完成，获取详情
        console.log(`✅ [pollAIGeneration] AI生成完成，获取详情...`);
        const detailsResponse = await fetch(`/api/coze-canvas/details?conversation_id=${conversationId}&chat_id=${chatId}`);
        const detailsResult = await detailsResponse.json();
        
        if (detailsResult.code === 0 && detailsResult.data?.imageUrl) {
          console.log(`🎉 [pollAIGeneration] 成功获取图片URL: ${detailsResult.data.imageUrl.slice(0, 50)}...`);
          return detailsResult.data.imageUrl;
        } else {
          console.warn(`⚠️ [pollAIGeneration] 未找到图片URL，详情:`, detailsResult);
          
          // 如果已经完成但没找到图片，再尝试几次
          if (attempt > 20) {
            console.log(`🔄 [pollAIGeneration] AI已完成但未返回图片，尝试使用主题相关的占位图`);
            // 根据提示词返回相关的占位图
            return getFallbackImage(subjectPrompt);
          }
        }
      } else if (status === 'failed' || status === 'error') {
        throw new Error(`AI生成失败，状态: ${status}`);
      }
      
      // 显示进度提示
      if (attempt % 5 === 0) {
        toast.info(`AI生成中... 已等待 ${attempt * 2} 秒`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    console.log(`⏰ [pollAIGeneration] 轮询超时，使用主题相关的占位图`);
    return getFallbackImage(subjectPrompt);
  };
  
  // 获取后备图片的函数
  const getFallbackImage = (prompt: string): string => {
    // 根据提示词返回相关的占位图
    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes('汉堡') || promptLower.includes('hamburger')) {
      return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80';
    } else if (promptLower.includes('咖啡') || promptLower.includes('coffee')) {
      return 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80';
    } else if (promptLower.includes('蛋糕') || promptLower.includes('cake')) {
      return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80';
    } else if (promptLower.includes('水果') || promptLower.includes('fruit')) {
      return 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&q=80';
    } else if (promptLower.includes('风景') || promptLower.includes('landscape')) {
      return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';
    } else if (promptLower.includes('动物') || promptLower.includes('animal')) {
      return 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=800&q=80';
    }
    
    // 默认返回通用的美食图片
    return 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80';
  };

  // 处理主体更新
  const handleSubjectApply = async () => {
    console.log(`📋 [handleSubjectApply] 开始，layerIds.mainImage=${layerIds.mainImage}`);
    if (!layerIds.mainImage) {
      console.error(`❌ [handleSubjectApply] 未找到主体图层 ID`);
      toast.error('未找到主体图层');
      return;
    }

    setIsGenerating(true);

    try {
      let newImageSrc = '';

      if (subjectMode === 'upload') {
        if (!uploadedSubject) {
          toast.error('请先上传图片');
          setIsGenerating(false);
          return;
        }
        newImageSrc = uploadedSubject;
        console.log(`📤 [handleSubjectApply] 上传模式，新图片=${newImageSrc.slice(0, 50)}...`);
        // 模拟处理延迟
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // 真实的 AI 生成 - 调用 Coze Canvas API
        if (!subjectPrompt) {
          toast.error('请输入生成文案');
          setIsGenerating(false);
          return;
        }
        
        toast.info('AI 正在生成图片，请稍候...');
        
        // 1. 发起AI生成请求
        const response = await fetch('/api/coze-canvas/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: subjectPrompt })
        });
        
        const result = await response.json();
        
        if (result.code !== 0) {
          throw new Error(result.msg || 'AI 生成失败');
        }
        
        const { chatId, conversationId } = result.data;
        
        if (!chatId || !conversationId) {
          throw new Error('AI 生成失败：未获取到会话信息');
        }
        
        console.log(`🤖 [handleSubjectApply] AI生成会话已创建，chatId=${chatId}, conversationId=${conversationId}`);
        
        // 2. 轮询获取生成的图片
        toast.info('AI图片生成中，请耐心等待...');
        newImageSrc = await pollAIGeneration(chatId, conversationId);
        
        console.log(`🎯 [handleSubjectApply] AI生成成功，图片URL=${newImageSrc.slice(0, 50)}...`);
        toast.success('AI 主体生成成功！');
      }

      // 获取旧图层信息
      const mainImageLayer = layers.find(l => l.id === layerIds.mainImage);
      console.log(`🔍 [handleSubjectApply] 查找主体图层: id=${layerIds.mainImage}, 找到=${!!mainImageLayer}`);
      if (!mainImageLayer) {
        console.error(`❌ [handleSubjectApply] 在 layers 数组中找不到该 ID 对应的图层`);
        toast.error('未找到主体图层');
        setIsGenerating(false);
        return;
      }

      // 计算旧图片的有效面积（基于原始像素尺寸）
      const oldEffectiveArea = await calculateEffectiveArea(mainImageLayer.src);
      console.log(`📐 [主体替换] 旧图片有效面积（像素）: ${oldEffectiveArea}`);

      // 计算新图片的有效面积和尺寸
      const newImg = new Image();
      newImg.crossOrigin = 'Anonymous';
      
      await new Promise<void>((resolve) => {
        newImg.onload = () => {
          // 在回调中需要获取旧图层的原始图片尺寸来做正确的比例计算
          const oldImg = new Image();
          oldImg.crossOrigin = 'Anonymous';
          oldImg.onload = () => {
            calculateEffectiveArea(newImageSrc).then(newEffectiveArea => {
              console.log(`📐 [主体替换] 新图片有效面积（像素）: ${newEffectiveArea}`);
              console.log(`📐 [主体替换] 旧图片原始尺寸: ${oldImg.width}x${oldImg.height}, 在画布中显示: ${mainImageLayer.width}x${mainImageLayer.height}`);
              console.log(`📐 [主体替换] 新图片原始尺寸: ${newImg.width}x${newImg.height}`);

              // 如果新旧面积都有效，计算缩放比例
              if (oldEffectiveArea > 0 && newEffectiveArea > 0) {
                // 关键：计算"显示尺寸与原始尺寸的比例"
                // oldDisplayScale: 旧图片在画布中的实际显示尺寸 / 旧图片的原始像素尺寸
                const oldDisplayScaleX = mainImageLayer.width / oldImg.width;
                const oldDisplayScaleY = mainImageLayer.height / oldImg.height;
                
                // 旧图片在画布中的"视觉有效面积" = 原始有效面积 * 显示尺寸缩放平方
                const oldDisplayEffectiveArea = oldEffectiveArea * oldDisplayScaleX * oldDisplayScaleY;
                
                console.log(`📐 [主体替换] 旧图片显示缩放: X=${oldDisplayScaleX.toFixed(3)}, Y=${oldDisplayScaleY.toFixed(3)}`);
                console.log(`📐 [主体替换] 旧图片显示有效面积: ${oldDisplayEffectiveArea.toFixed(0)}`);

                // 目标：新图片显示出来后，其有效面积也应该等于旧图片的显示有效面积
                // 新图片显示有效面积 = 新图片原始有效面积 * (新图片显示宽 / 新图片原始宽)^2
                // 设新图片显示宽为 w，显示高为 h，则：
                // newEffectiveArea * (w / newImg.width)^2 = oldDisplayEffectiveArea
                // w / newImg.width = sqrt(oldDisplayEffectiveArea / newEffectiveArea)
                const scaleFactor = Math.sqrt(oldDisplayEffectiveArea / newEffectiveArea);
                
                // 计算新的宽高（保持长宽比）
                const newWidth = newImg.width * scaleFactor;
                const newHeight = newImg.height * scaleFactor;

                console.log(`📐 [主体替换] 缩放因子: ${scaleFactor.toFixed(3)}, 新显示尺寸: ${newWidth.toFixed(0)}x${newHeight.toFixed(0)}`);

                // 更新图层：新图片、新尺寸、保持中心位置不变
                console.log(`🎨 [主体替换] 调用 updateLayer，id=${layerIds.mainImage}, 新 src=${newImageSrc.slice(0, 50)}...`);
                
                // 计算尺寸变化（用于调整子图层相对位置）
                const widthChange = newWidth - mainImageLayer.width;
                const heightChange = newHeight - mainImageLayer.height;
                const newMainX = mainImageLayer.x + (mainImageLayer.width - newWidth) / 2;
                const newMainY = mainImageLayer.y + (mainImageLayer.height - newHeight) / 2;
                
                console.log(`📐 [主体替换] 尺寸变化: 宽度 ${widthChange.toFixed(0)}px, 高度 ${heightChange.toFixed(0)}px`);
                console.log(`📐 [主体替换] 位置变化: X ${mainImageLayer.x} -> ${newMainX.toFixed(0)}, Y ${mainImageLayer.y} -> ${newMainY.toFixed(0)}`);
                
                // 更新主体图层
                updateLayer(layerIds.mainImage, {
                  src: newImageSrc,
                  width: newWidth,
                  height: newHeight,
                  x: newMainX,
                  y: newMainY
                });

                // 找到所有以主体为父图层的子图层，调整它们的位置以保持相对位置关系
                const childLayers = layers.filter(l => l.parentId === layerIds.mainImage);
                if (childLayers.length > 0) {
                  console.log(`🔗 [主体替换] 发现 ${childLayers.length} 个子图层，正在调整相对位置...`);
                  childLayers.forEach(child => {
                    // 子图层相对于父图层的偏移量应该保持不变
                    // 但由于父图层位置改变了，我们需要调整子图层的绝对位置
                    const childNewX = child.x + (newMainX - mainImageLayer.x);
                    const childNewY = child.y + (newMainY - mainImageLayer.y);
                    console.log(`   📍 [主体替换] 调整子图层 ${child.name}: (${child.x}, ${child.y}) -> (${childNewX.toFixed(0)}, ${childNewY.toFixed(0)})`);
                    updateLayer(child.id, {
                      x: childNewX,
                      y: childNewY
                    });
                  });
                }

                toast.success('主体已更新');
              } else {
                // 降级处理：如果无法计算有效面积，直接替换但保持尺寸
                console.warn('⚠️ [主体替换] 无法获取有效面积数据，执行直接替换');
                console.log(`🎨 [主体替换] 调用 updateLayer（降级），id=${layerIds.mainImage}, 新 src=${newImageSrc.slice(0, 50)}...`);
                updateLayer(layerIds.mainImage, { src: newImageSrc });
                toast.success('主体已更新（未优化尺寸）');
              }

              resolve();
            });
          };
          oldImg.onerror = () => {
            console.error('❌ [主体替换] 无法加载旧图片获取原始尺寸，执行降级处理');
            // 降级处理：直接替换，保持画布中的显示尺寸
            updateLayer(layerIds.mainImage, { src: newImageSrc });
            toast.success('主体已更新（未优化尺寸）');
            resolve();
          };
          oldImg.src = mainImageLayer.src;
        };

        newImg.onerror = () => {
          console.error('❌ [主体替换] 新图片加载失败');
          toast.error('新图片加载失败');
          resolve();
        };

        newImg.src = newImageSrc;
      });
    } catch (e) {
      console.error('❌ [主体替换] 操作失败:', e);
      toast.error('操作失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 处理颜色变更 (实际是切换背景图)
  const handleColorChange = (colorValue: string) => {
    setSelectedColor(colorValue);
    const theme = COLOR_THEMES.find(c => c.value === colorValue);
    if (!theme) return;

    if (layerIds.background) {
      updateLayer(layerIds.background, { src: theme.bgImage });
      toast.info(`已切换为 ${theme.label} 主题背景`);
    } else {
      toast.warning('未找到背景图层，无法切换背景');
    }
  };

  // 处理文字变更
  const handleTitleChange = (val: string) => {
    setTitleText(val);
    if (layerIds.title) {
      updateLayer(layerIds.title, { 
        content: val,
        // 更新文本内容时，同步更新 richText.text
        richText: {
          text: val,
          styles: layers.find(l => l.id === layerIds.title)?.richText?.styles || []
        }
      });
    }
  };

  const handleSubTitleChange = (val: string) => {
    setSubTitleText(val);
    if (layerIds.subTitle) {
      updateLayer(layerIds.subTitle, { 
        content: val,
        richText: {
          text: val,
          styles: layers.find(l => l.id === layerIds.subTitle)?.richText?.styles || []
        }
      });
    }
  };

  // 处理 Logo 变更
  const handleLogoChange = (val: string) => {
    setSelectedLogo(val);
    if (layerIds.logo) {
      // 如果是上传的文件 (data:image...) 或 预设路径
      updateLayer(layerIds.logo, { src: val });
    } else {
      toast.error('未找到 Logo 图层');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          handleLogoChange(ev.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSelectLogo = (url: string) => {
    if (editingLogoId && selectedLayer) {
      const newItems = (selectedLayer.logoItems || []).map(item => 
        item.id === editingLogoId ? { ...item, url } : item
      );
      updateLayer(selectedLayer.id, { logoItems: newItems });
      setIsLogoPickerOpen(false);
      setEditingLogoId(null);
    }
  };

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  const handleAddLogoComponent = () => {
    if (!addLayer) return;
    const newLayer: CanvasLayer = {
      id: uuidv4(),
      type: 'logo-group',
      name: 'Logo 组',
      x: 100,
      y: 100,
      width: 400,
      height: 120,
      opacity: 1,
      visible: true,
      logoItems: [{ id: uuidv4(), url: null }],
      logoItemSize: 80,
      logoGap: 20,
      logoAlign: 'left'
    };
    addLayer(newLayer);
    toast.success('已添加 Logo 组件');
  };

  if (selectedLayer && selectedLayer.type === 'logo-group') {
    return (
      <div className="flex flex-col h-full gap-4 overflow-y-auto p-1">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" /> Logo 组件设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs">排布模式</Label>
              <div className="flex gap-2">
                <Button 
                  variant={selectedLayer.logoAlign === 'left' ? 'default' : 'outline'} 
                  size="sm" 
                  className="flex-1"
                  onClick={() => updateLayer(selectedLayer.id, { logoAlign: 'left' })}
                >
                  <AlignLeft className="mr-2 h-4 w-4" /> 左对齐
                </Button>
                <Button 
                  variant={selectedLayer.logoAlign === 'center' ? 'default' : 'outline'} 
                  size="sm" 
                  className="flex-1"
                  onClick={() => updateLayer(selectedLayer.id, { logoAlign: 'center' })}
                >
                  <AlignCenter className="mr-2 h-4 w-4" /> 居中
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Logo 大小 ({selectedLayer.logoItemSize || 80}px)</Label>
              <Slider 
                value={[selectedLayer.logoItemSize || 80]} 
                min={20} 
                max={200} 
                step={1}
                onValueChange={([v]) => updateLayer(selectedLayer.id, { logoItemSize: v })} 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">间距 ({selectedLayer.logoGap || 20}px)</Label>
              <Slider 
                value={[selectedLayer.logoGap || 20]} 
                min={0} 
                max={100} 
                step={1}
                onValueChange={([v]) => updateLayer(selectedLayer.id, { logoGap: v })} 
              />
            </div>

            <div className="space-y-2 pt-4 border-t border-border">
              <Label className="text-xs">Logo 排序与管理</Label>
              <div className="flex items-center gap-2 overflow-x-auto py-2 min-h-[60px] scrollbar-thin scrollbar-thumb-muted">
                
                {/* 左侧添加按钮 */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full flex-shrink-0 border-dashed"
                  title="在左侧添加"
                  onClick={() => {
                    const newItems = [{ id: uuidv4(), url: null }, ...(selectedLayer.logoItems || [])];
                    updateLayer(selectedLayer.id, { logoItems: newItems });
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>

                {/* Logo 列表 */}
                {(selectedLayer.logoItems || []).map((item, index) => (
                  <div key={item.id} className="relative group flex-shrink-0">
                    <div 
                      className="w-10 h-10 bg-muted/50 rounded border flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                      onClick={() => {
                        setEditingLogoId(item.id);
                        setIsLogoPickerOpen(true);
                      }}
                      title="点击选择 Logo"
                    >
                      {item.url ? (
                        <img src={item.url} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[8px] text-muted-foreground">空</span>
                      )}
                    </div>
                    
                    {/* 删除按钮 (右上角悬浮) */}
                    <div 
                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm hover:scale-110"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newItems = (selectedLayer.logoItems || []).filter(i => i.id !== item.id);
                        updateLayer(selectedLayer.id, { logoItems: newItems });
                        toast.info('Logo 已移除，请保存更改');
                      }}
                      title="删除"
                    >
                      <Trash2 className="h-3 w-3" />
                    </div>
                  </div>
                ))}

                {/* 右侧添加按钮 */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full flex-shrink-0 border-dashed"
                  title="在右侧添加"
                  onClick={() => {
                    const newItems = [...(selectedLayer.logoItems || []), { id: uuidv4(), url: null }];
                    updateLayer(selectedLayer.id, { logoItems: newItems });
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>

              </div>
              <p className="text-[10px] text-muted-foreground">点击加号在两侧添加，点击图标上传/替换</p>
            </div>

            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={() => {
                if (deleteLayer) {
                  deleteLayer(selectedLayer.id);
                  toast.info('组件已删除，请记得保存更改');
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> 删除组件
            </Button>
          </CardContent>
        </Card>
        
        <Button variant="outline" onClick={() => onSave({})}>保存更改</Button>

        <Dialog open={isLogoPickerOpen} onOpenChange={setIsLogoPickerOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>选择 Logo 素材</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-4 gap-6 py-4 overflow-y-auto flex-1 p-2">
              <div className="relative aspect-square cursor-pointer rounded-lg border-2 border-dashed border-muted hover:border-primary hover:bg-accent transition-all flex flex-col items-center justify-center gap-3">
                <Upload className="h-12 w-12 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">上传图片</span>
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          handleSelectLogo(ev.target.result as string);
                        }
                      };
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }}
                />
              </div>
              {logoAssets.map((logo) => (
                <div
                  key={logo.id}
                  className="relative aspect-square cursor-pointer rounded-lg border-2 border-muted bg-muted/50 p-6 hover:border-primary hover:bg-accent transition-all flex flex-col items-center justify-center gap-3"
                  onClick={() => handleSelectLogo(logo.url)}
                >
                  <img src={logo.url} alt={logo.name} className="h-24 w-24 object-contain" />
                  <span className="text-sm text-center font-medium truncate w-full">{logo.name}</span>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto p-1">
      {addLayer && (
        <Button onClick={handleAddLogoComponent} className="w-full gap-2 mb-2" variant="secondary">
          <Plus className="h-4 w-4" /> 新增 Logo 组件
        </Button>
      )}
      
      {/* 1. 主体内容 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" /> 主体内容
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={subjectMode} onValueChange={(v: any) => setSubjectMode(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="upload">手动上传</TabsTrigger>
              <TabsTrigger value="generate">AI 生成</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4">
              <div 
                className="border-2 border-dashed rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer text-center relative group"
                onClick={() => document.getElementById('subject-upload')?.click()}
              >
                {uploadedSubject ? (
                  <img src={uploadedSubject} alt="Preview" className="max-h-32 mx-auto object-contain rounded" />
                ) : (
                  <div className="py-4 text-muted-foreground">
                    <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <span className="text-xs">点击上传图片</span>
                  </div>
                )}
                <input 
                  id="subject-upload" 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setUploadedSubject(ev.target?.result as string);
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="generate" className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">生成描述</Label>
                <Textarea 
                  placeholder="例如：一个美味的汉堡，高清摄影..." 
                  value={subjectPrompt}
                  onChange={(e) => setSubjectPrompt(e.target.value)}
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          <Button 
            className="w-full" 
            onClick={handleSubjectApply} 
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {subjectMode === 'generate' ? '生成并应用' : '应用图片'}
          </Button>
        </CardContent>
      </Card>

      {/* 3. 文案输入 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Type className="h-4 w-4 text-primary" /> 文案内容
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">主标题</Label>
            <div className="relative">
              <Textarea 
                id={`textarea-${layerIds.title}`}
                value={titleText} 
                onChange={(e) => handleTitleChange(e.target.value)} 
                onSelect={(e) => layerIds.title && updateSelection(layerIds.title, e)}
                onKeyUp={(e) => layerIds.title && updateSelection(layerIds.title, e)}
                onMouseUp={(e) => layerIds.title && updateSelection(layerIds.title, e)}
                placeholder="输入主标题..."
                rows={2}
                className="resize-none font-mono"
              />
              <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground bg-background/80 px-1 rounded pointer-events-none">
                选中文字可局部改色
              </div>
            </div>
            
            {/* 颜色选择器 */}
            {layerIds.title && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    type="color" 
                    value={layers.find(l => l.id === layerIds.title)?.color || '#000000'} 
                    onChange={(e) => handleRichTextColorChange(layerIds.title, e.target.value)}
                    className="h-8 w-full p-1 cursor-pointer" 
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8" title="颜色预设">
                      <Palette className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">颜色预设</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={() => savePreset(layers.find(l => l.id === layerIds.title)?.color || '#000000')}
                        >
                          <Plus className="h-3 w-3 mr-1" /> 保存当前
                        </Button>
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        {colorPresets.map((color) => (
                          <div 
                            key={color}
                            className="group relative w-8 h-8 rounded-full border cursor-pointer hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            onClick={() => handleRichTextColorChange(layerIds.title, color)}
                            title={color}
                          >
                            <div 
                              className="absolute -top-1 -right-1 hidden group-hover:flex bg-destructive text-destructive-foreground rounded-full w-4 h-4 items-center justify-center shadow-sm"
                              onClick={(e) => removePreset(color, e)}
                            >
                              <Trash2 className="h-2 w-2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">副标题</Label>
            <div className="relative">
              <Textarea 
                id={`textarea-${layerIds.subTitle}`}
                value={subTitleText} 
                onChange={(e) => handleSubTitleChange(e.target.value)} 
                onSelect={(e) => layerIds.subTitle && updateSelection(layerIds.subTitle, e)}
                onKeyUp={(e) => layerIds.subTitle && updateSelection(layerIds.subTitle, e)}
                onMouseUp={(e) => layerIds.subTitle && updateSelection(layerIds.subTitle, e)}
                placeholder="输入副标题..."
                rows={2}
                className="resize-none font-mono"
              />
              <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground bg-background/80 px-1 rounded pointer-events-none">
                选中文字可局部改色
              </div>
            </div>

            {/* 颜色选择器 */}
            {layerIds.subTitle && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    type="color" 
                    value={layers.find(l => l.id === layerIds.subTitle)?.color || '#000000'} 
                    onChange={(e) => handleRichTextColorChange(layerIds.subTitle, e.target.value)}
                    className="h-8 w-full p-1 cursor-pointer" 
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8" title="颜色预设">
                      <Palette className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">颜色预设</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={() => savePreset(layers.find(l => l.id === layerIds.subTitle)?.color || '#000000')}
                        >
                          <Plus className="h-3 w-3 mr-1" /> 保存当前
                        </Button>
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        {colorPresets.map((color) => (
                          <div 
                            key={color}
                            className="group relative w-8 h-8 rounded-full border cursor-pointer hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            onClick={() => handleRichTextColorChange(layerIds.subTitle, color)}
                            title={color}
                          >
                            <div 
                              className="absolute -top-1 -right-1 hidden group-hover:flex bg-destructive text-destructive-foreground rounded-full w-4 h-4 items-center justify-center shadow-sm"
                              onClick={(e) => removePreset(color, e)}
                            >
                              <Trash2 className="h-2 w-2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      <Button className="mt-4" size="lg" onClick={() => onSave({})}>
        保存所有更改
      </Button>
    </div>
  );
}