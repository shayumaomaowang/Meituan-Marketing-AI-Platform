'use client';

/**
 * 交互式结果画布组件
 * 支持点击选中、浮动工具栏、双击编辑文字、手动替换图片
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Type, 
  Image as ImageIcon, 
  Trash2, 
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Upload,
  Check,
  X
} from 'lucide-react';
import { CanvasLayer, CustomTemplate } from '@/lib/canvas-utils';
import { getAiAsset, EXACT_SYNONYMS } from '@/components/results-page'; // 核心：导入智能匹配函数

interface InteractiveResultCanvasProps {
  template: CustomTemplate;
  aiAssets: Record<string, string>;
  onGenerateLottie: (finalLayers: CanvasLayer[]) => void;
  onUpdateAssets?: (newAssets: Record<string, string>) => void;
}

const FONT_OPTIONS = [
  { label: '系统默认', value: 'sans-serif' },
  { label: '方正兰亭黑 Regular', value: 'FZLanTingHeiS-DB1-GB-Regular' },
  { label: '方正兰亭黑 Bold', value: 'FZLanTingHeiS-EB-GB' },
  { label: '美团数字 Bold', value: 'MeituanDigitalType-Bold' },
];

// 辅助函数：根据原文本的行数，自动将新文本切分为多行
function adaptTextLines(original: string, current: string): string {
  // 如果新文本已经包含换行，直接返回（尊重用户/AI的决定）
  if (current.includes('\r') || current.includes('\n')) return current;
  
  // 检测原文本的换行模式
  const lines = original.split(/\r|\n/);
  if (lines.length <= 1) return current;
  
  // 原文本有多行，尝试将新文本切分为相同行数
  const targetLines = lines.length;
  const totalLength = current.length;
  
  // 如果新文本太短，不足以切分，就不切分
  if (totalLength < targetLines) return current;

  const charsPerLine = Math.ceil(totalLength / targetLines);
  
  let result = '';
  for (let i = 0; i < targetLines; i++) {
    const start = i * charsPerLine;
    // 确保最后一行包含剩余所有字符
    const end = (i === targetLines - 1) ? totalLength : start + charsPerLine;
    
    // 防止越界
    if (start >= totalLength) break;
    
    const segment = current.substring(start, end);
    
    if (i > 0) result += '\n'; // Web 环境使用 \n
    result += segment;
  }
  
  return result;
}

export function InteractiveResultCanvas({ template, aiAssets, onGenerateLottie, onUpdateAssets }: InteractiveResultCanvasProps) {
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scale, setScale] = useState(0.5);
  const containerRef = useRef<HTMLDivElement>(null);

  // 核心升级：使用 getAiAsset 进行模糊匹配注入
  useEffect(() => {
    // 📦 显示临时仓库的实时状态
    console.group('📦 [临时仓库实时] 当前素材库状态');
    console.log(`总素材数: ${Object.keys(aiAssets).length}`);
    console.table(Object.entries(aiAssets).map(([key, value]) => ({
      '素材标签': key,
      '类型': typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:image')) ? '图片' : '文字',
      '内容预览': typeof value === 'string' ? (value.length > 60 ? value.substring(0, 60) + '...' : value) : String(value)
    })));
    console.groupEnd();
    
    console.group('🎨 [静态模板注入] 详细匹配日志');
    const filledLayers = template.layers.map(l => {
      const cleanLabel = (l.cozeField || '').trim();
      let matchSource = '未匹配';
      let matchedKey = '';
      
      // 1. 尝试直接匹配
      if (aiAssets[cleanLabel]) {
        matchSource = '精确匹配 (Key一致)';
        matchedKey = cleanLabel;
      } 
      // 2. 尝试同义词匹配
      else if (EXACT_SYNONYMS[cleanLabel]) {
        const synonyms = EXACT_SYNONYMS[cleanLabel];
        for (const synonym of synonyms) {
          if (aiAssets[synonym]) {
            matchSource = `同义词匹配 (${synonym})`;
            matchedKey = synonym;
            break;
          }
        }
      }

      // 不再使用精确匹配 aiAssets[l.cozeField]，而是使用智能模糊匹配
      const aiValue = getAiAsset(l.cozeField || '', aiAssets, l.type);
      
      if (aiValue) {
        console.log(`✅ [成功] 图层: "${l.name}" (标签: ${l.cozeField})`);
        console.log(`   └─ 匹配方式: ${matchSource}`);
        console.log(`   └─ 匹配键名: ${matchedKey}`);
        console.log(`   └─ 注入内容: ${aiValue.substring(0, 50)}...`);

        let finalValue = aiValue;
        // 如果是图片且是外部链接，动态加上代理
        if (l.type === 'image' && aiValue.startsWith('http')) {
          finalValue = `/api/proxy-image?url=${encodeURIComponent(aiValue)}`;
        }
        
        // 🆕 新增：如果是文字，尝试适配原模板的折行
        if (l.type === 'text') {
            finalValue = adaptTextLines(l.content || '', finalValue);
        }

        return { ...l, [l.type === 'text' ? 'content' : 'src']: finalValue };
      } else {
        console.log(`❌ [失败] 图层: "${l.name}" (标签: ${l.cozeField})`);
        console.log(`   └─ 原因: 临时仓库中未找到对应素材`);
        if (EXACT_SYNONYMS[cleanLabel]) {
             console.log(`   └─ 尝试过的同义词: ${EXACT_SYNONYMS[cleanLabel].join(', ')}`);
        }
      }
      return l;
    });
    console.groupEnd();
    setLayers(filledLayers);
  }, [template, aiAssets]);

  const updateLayer = (id: string, updates: Partial<CanvasLayer>) => {
    setLayers(prev => {
      const newLayers = prev.map(l => l.id === id ? { ...l, ...updates } : l);
      const layer = newLayers.find(l => l.id === id);
      
      // 核心逻辑：当用户在画布上修改图层内容时，同步更新临时仓库
      // 注意：必须在 setLayers 外部调用 onUpdateAssets，避免在渲染过程中更新父组件状态
      if (layer && layer.cozeField && onUpdateAssets) {
        // 获取更新后的值
        const updatedValue = updates.content !== undefined ? updates.content : 
                             updates.src !== undefined ? updates.src : 
                             (layer.type === 'text' ? layer.content : layer.src);
                             
        if (updatedValue) {
          // 使用 setTimeout 将更新推迟到下一个事件循环，确保不在渲染阶段执行
          setTimeout(() => {
            console.log(`🔄 [画布更新] 同步更新临时仓库: [${layer.cozeField}] -> ${updatedValue.substring(0, 20)}...`);
            onUpdateAssets({
              [layer.cozeField]: updatedValue
            });
          }, 0);
        }
      }
      return newLayers;
    });
  };

  const selectedLayer = layers.find(l => l.id === selectedId);

  const handleImageReplace = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) updateLayer(id, { src: ev.target.result as string });
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full py-12">
      <div 
        ref={containerRef}
        className="relative bg-[#1a1a1e] rounded-2xl shadow-2xl overflow-hidden border border-white/5 flex items-center justify-center p-12"
        style={{ width: '100%', minHeight: '600px' }}
        onClick={() => { setSelectedId(null); setEditingId(null); }}
      >
        <div 
          className="bg-white relative shadow-2xl"
          style={{
            width: `${template.width}px`,
            height: `${template.height}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            flexShrink: 0
          }}
        >
          {[...layers].reverse().map((layer) => {
            const isSelected = selectedId === layer.id;
            const isEditing = editingId === layer.id;

            return (
              <div
                key={layer.id}
                className={`absolute transition-shadow ${isSelected ? 'ring-4 ring-primary' : 'hover:ring-2 hover:ring-primary/30'}`}
                style={{
                  left: `${layer.x}px`,
                  top: `${layer.y}px`,
                  width: `${layer.width}px`,
                  height: `${layer.height}px`,
                  opacity: layer.opacity,
                  zIndex: layers.length - layers.indexOf(layer),
                  display: layer.visible ? 'block' : 'none',
                  cursor: isEditing ? 'text' : 'pointer'
                }}
                onClick={(e) => { e.stopPropagation(); setSelectedId(layer.id); }}
                onDoubleClick={(e) => { 
                  if (layer.type === 'text') {
                    e.stopPropagation();
                    setEditingId(layer.id);
                  }
                }}
              >
                {layer.type === 'text' ? (
                  isEditing ? (
                    <textarea
                      autoFocus
                      className="w-full h-full bg-transparent border-none outline-none resize-none p-0 m-0 overflow-hidden"
                      style={{ 
                        fontSize: `${layer.fontSize}px`, 
                        color: layer.color, 
                        textAlign: layer.textAlign, 
                        fontFamily: layer.fontFamily,
                        letterSpacing: `${layer.letterSpacing}px`,
                        lineHeight: layer.lineHeight,
                      }}
                      value={layer.content}
                      onChange={(e) => updateLayer(layer.id, { content: e.target.value })}
                      onBlur={() => setEditingId(null)}
                    />
                  ) : (
                    <div style={{ 
                      width: '100%', height: '100%', 
                      fontSize: `${layer.fontSize}px`, color: layer.color, 
                      textAlign: layer.textAlign, fontFamily: layer.fontFamily,
                      letterSpacing: `${layer.letterSpacing}px`, lineHeight: layer.lineHeight,
                      whiteSpace: 'pre-wrap', display: 'flex', alignItems: 'center',
                      justifyContent: layer.textAlign === 'center' ? 'center' : (layer.textAlign === 'right' ? 'flex-end' : 'flex-start'),
                    }}>
                      {layer.content}
                    </div>
                  )
                ) : (
                  layer.src && layer.src !== '无' && (layer.src.startsWith('http') || layer.src.startsWith('/') || layer.src.startsWith('data:')) ? (
                    <img 
                      src={layer.src} 
                      className={`w-full h-full pointer-events-none transition-transform duration-200 ${
                        (layer.cozeField === 'foreground_bar' || layer.cozeField === '前景条') ? 'object-fill' : 'object-contain'
                      }`}
                      style={{ transform: `scale(${layer.scale || 1})` }}
                      alt="" 
                    />
                  ) : (
                    <div className="w-full h-full bg-muted/20 flex items-center justify-center text-[10px] text-muted-foreground">无素材</div>
                  )
                )}

                {isSelected && !isEditing && (
                  <div 
                    className="absolute left-1/2 -translate-x-1/2 -top-16 bg-[#2a2a2e]/90 backdrop-blur-xl border border-white/10 rounded-xl p-1.5 flex items-center gap-1 shadow-2xl z-[2000]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {layer.type === 'text' ? (
                      <>
                        <div className="flex items-center gap-1 px-2 border-r border-white/10 mr-1">
                          <span className="text-[10px] text-gray-400 mr-1">字号</span>
                          <input 
                            type="number" 
                            className="w-12 bg-transparent text-xs font-bold focus:outline-none" 
                            value={layer.fontSize} 
                            onChange={(e) => updateLayer(layer.id, { fontSize: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="flex items-center gap-1 px-2 border-r border-white/10 mr-1">
                          <span className="text-[10px] text-gray-400 mr-1">间距</span>
                          <input 
                            type="number" 
                            className="w-10 bg-transparent text-xs focus:outline-none" 
                            value={layer.letterSpacing} 
                            onChange={(e) => updateLayer(layer.id, { letterSpacing: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <Select value={layer.fontFamily} onValueChange={(v) => updateLayer(layer.id, { fontFamily: v })}>
                          <SelectTrigger className="h-8 border-none bg-transparent text-xs w-[100px] focus:ring-0"><SelectValue /></SelectTrigger>
                          <SelectContent>{FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 px-3 py-1.5 border-r border-white/10">
                          <span className="text-[10px] text-gray-400">缩放</span>
                          <Slider 
                            value={[(layer.scale || 1) * 100]} 
                            min={10} 
                            max={300} 
                            step={10}
                            onValueChange={([v]) => updateLayer(layer.id, { scale: v / 100 })} 
                            className="w-20" 
                          />
                          <span className="text-[10px] text-gray-300 w-8 text-right">{Math.round((layer.scale || 1) * 100)}%</span>
                        </div>
                        <Label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-lg transition-colors">
                          <Upload className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium">替换</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageReplace(layer.id, e)} />
                        </Label>
                      </>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setSelectedId(null)}><X className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4 bg-black/40 border border-white/5 p-2 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center gap-2 px-4 border-r border-white/5">
            <span className="text-xs text-gray-500">画布缩放</span>
            <Slider value={[scale * 100]} min={10} max={100} onValueChange={([v]) => setScale(v / 100)} className="w-32" />
          </div>
          <Button 
            onClick={() => onGenerateLottie(layers)}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold px-8 py-6 rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-95"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            一键生成动效
          </Button>
        </div>
      </div>
    </div>
  );
}