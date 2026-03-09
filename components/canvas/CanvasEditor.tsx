'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Type, 
  Image as ImageIcon, 
  Settings, 
  Trash2, 
  Save,
  Layers as LayersIcon,
  AlignCenter,
  AlignLeft,
  AlignRight,
  GripVertical,
  Maximize2,
  Square,
  Plus,
  LayoutTemplate,
  Upload
} from 'lucide-react';
import { CanvasLayer, CustomTemplate } from '@/lib/canvas-utils';
import { v4 as uuidv4 } from 'uuid';
import html2canvas from 'html2canvas';

interface CanvasEditorProps {
  initialData?: CustomTemplate;
  onSave: (data: Partial<CustomTemplate>) => void;
}

type InteractionMode = 'none' | 'dragging' | 'resizing';

const FONT_OPTIONS = [
  { label: '系统默认', value: 'sans-serif' },
  { label: '方正兰亭黑 Regular', value: 'FZLanTingHeiS-DB1-GB-Regular' },
  { label: '方正兰亭黑 Bold', value: 'FZLanTingHeiS-EB-GB' },
  { label: '美团数字 Bold', value: 'MeituanDigitalType-Bold' },
  { label: '等宽字体', value: 'monospace' },
];

export function CanvasEditor({ initialData, onSave }: CanvasEditorProps) {
  const [name, setName] = useState(initialData?.name || '未命名模板');
  const [width, setWidth] = useState(initialData?.width || 1080);
  const [height, setHeight] = useState(initialData?.height || 1920);
  const [layout, setLayout] = useState(initialData?.layout || 'center');
  const [layers, setLayers] = useState<CanvasLayer[]>(initialData?.layers || []);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [scale, setScale] = useState(0.3);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [snapLines, setSnapLines] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [uploadingLogoItemId, setUploadingLogoItemId] = useState<string | null>(null);
  
  const [interaction, setInteraction] = useState<{
    mode: InteractionMode;
    startX: number;
    startY: number;
    startLayerX: number;
    startLayerY: number;
    startLayerW: number;
    startLayerH: number;
    handle?: string;
    aspectRatio: number;
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    startLayerX: 0,
    startLayerY: 0,
    startLayerW: 0,
    startLayerH: 0,
    aspectRatio: 1
  });

  const autoFit = () => {
    if (viewportRef.current) {
      const padding = 64;
      const vW = viewportRef.current.clientWidth - padding;
      const vH = viewportRef.current.clientHeight - padding;
      const scaleX = vW / width;
      const scaleY = vH / height;
      const newScale = Math.min(scaleX, scaleY, 1);
      setScale(parseFloat(newScale.toFixed(3)));
    }
  };

  useEffect(() => {
    const timer = setTimeout(autoFit, 100);
    return () => clearTimeout(timer);
  }, [initialData]);

  const selectedLayer = useMemo(() => layers.find(l => l.id === selectedLayerId), [layers, selectedLayerId]);

  const updateLayer = (id: string, updates: Partial<CanvasLayer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const deleteLayer = (id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    setSelectedLayerId(null);
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newLayers = [...layers];
    const draggedItem = newLayers[draggedIndex];
    newLayers.splice(draggedIndex, 1);
    newLayers.splice(index, 0, draggedItem);
    setLayers(newLayers);
    setDraggedIndex(index);
  };
  const handleDragEnd = () => setDraggedIndex(null);

  const SNAP_THRESHOLD = 15;
  const applySnapping = (x: number, y: number, w: number, h: number) => {
    let snappedX = x;
    let snappedY = y;
    let lineX: number | null = null;
    let lineY: number | null = null;

    if (Math.abs(x) < SNAP_THRESHOLD) { snappedX = 0; lineX = 0; }
    else if (Math.abs(x + w - width) < SNAP_THRESHOLD) { snappedX = width - w; lineX = width; }
    else if (Math.abs(x + w / 2 - width / 2) < SNAP_THRESHOLD) { snappedX = width / 2 - w / 2; lineX = width / 2; }

    if (Math.abs(y) < SNAP_THRESHOLD) { snappedY = 0; lineY = 0; }
    else if (Math.abs(y + h - height) < SNAP_THRESHOLD) { snappedY = height - h; lineY = height; }
    else if (Math.abs(y + h / 2 - height / 2) < SNAP_THRESHOLD) { snappedY = height / 2 - h / 2; lineY = height / 2; }

    setSnapLines({ x: lineX, y: lineY });
    return { snappedX, snappedY };
  };

  const handleMouseDown = (e: React.MouseEvent, layer: CanvasLayer, mode: InteractionMode, handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedLayerId(layer.id);
    
    setInteraction({
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startLayerX: layer.x,
      startLayerY: layer.y,
      startLayerW: layer.width,
      startLayerH: layer.height,
      handle,
      aspectRatio: layer.width / layer.height
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (interaction.mode === 'none' || !selectedLayerId) return;

      const dx = (e.clientX - interaction.startX) / scale;
      const dy = (e.clientY - interaction.startY) / scale;

      if (interaction.mode === 'dragging') {
        const { snappedX, snappedY } = applySnapping(
          interaction.startLayerX + dx,
          interaction.startLayerY + dy,
          interaction.startLayerW,
          interaction.startLayerH
        );
        updateLayer(selectedLayerId, { x: Math.round(snappedX), y: Math.round(snappedY) });
      } else if (interaction.mode === 'resizing') {
        const { handle, startLayerW, startLayerH, startLayerX, startLayerY, aspectRatio } = interaction;
        let newW = startLayerW;
        let newH = startLayerH;
        let newX = startLayerX;
        let newY = startLayerY;

        if (handle?.includes('r')) newW = Math.max(20, startLayerW + dx);
        if (handle?.includes('b')) newH = Math.max(20, startLayerH + dy);
        if (handle?.includes('l')) {
          const delta = Math.min(dx, startLayerW - 20);
          newW = startLayerW - delta;
          newX = startLayerX + delta;
        }
        if (handle?.includes('t')) {
          const delta = Math.min(dy, startLayerH - 20);
          newH = startLayerH - delta;
          newY = startLayerY + delta;
        }

        if (e.shiftKey) {
          if (handle === 'br' || handle === 'tl') {
            newH = newW / aspectRatio;
            if (handle === 'tl') newY = startLayerY + (startLayerH - newH);
          } else if (handle === 'tr' || handle === 'bl') {
            newH = newW / aspectRatio;
            if (handle === 'tr') newY = startLayerY + (startLayerH - newH);
            if (handle === 'bl') newX = startLayerX + (startLayerW - newW);
          }
        }

        updateLayer(selectedLayerId, { 
          width: Math.round(newW), 
          height: Math.round(newH),
          x: Math.round(newX),
          y: Math.round(newY)
        });
      }
    };

    const handleMouseUp = () => {
      setInteraction(prev => ({ ...prev, mode: 'none' }));
      setSnapLines({ x: null, y: null });
    };

    if (interaction.mode !== 'none') {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interaction, scale, selectedLayerId, width, height]);

  const renderHandle = (pos: string) => (
    <div 
      key={`h-${pos}`}
      className="absolute bg-white border-2 border-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2 z-[2000] cursor-pointer pointer-events-auto"
      style={{
        left: pos.includes('l') ? '0' : (pos.includes('r') ? '100%' : '50%'),
        top: pos.includes('t') ? '0' : (pos.includes('b') ? '100%' : '50%'),
        width: `${14 / scale}px`,
        height: `${14 / scale}px`,
        borderWidth: `${2 / scale}px`,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (selectedLayer) handleMouseDown(e, selectedLayer, 'resizing', pos);
      }}
    />
  );

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4 overflow-hidden select-none">
      {/* 左侧：图层列表 */}
      <div className="w-64 flex flex-col gap-4 overflow-y-auto pr-2">
        <Card className="flex-1">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2"><LayersIcon className="h-4 w-4" /> 图层</div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                  const newLayer: CanvasLayer = { id: uuidv4(), type: 'text', name: '新文字', x: 100, y: 100, width: 400, height: 100, opacity: 1, visible: true, content: '请输入文字', fontSize: 80, color: '#000000', textAlign: 'center', fontFamily: 'sans-serif', letterSpacing: 0, lineHeight: 1.2 };
                  setLayers([newLayer, ...layers]);
                  setSelectedLayerId(newLayer.id);
                }}><Type className="h-4 w-4" /></Button>
                <Label className="cursor-pointer h-8 w-8 flex items-center justify-center hover:bg-muted rounded transition-colors">
                  <ImageIcon className="h-4 w-4" />
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const newLayer: CanvasLayer = { id: uuidv4(), type: 'image', name: '新图片', x: 100, y: 100, width: 400, height: 400, opacity: 1, visible: true, src: ev.target?.result as string };
                        setLayers([newLayer, ...layers]);
                        setSelectedLayerId(newLayer.id);
                      };
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }} />
                </Label>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                  const newLayer: CanvasLayer = { id: uuidv4(), type: 'image', name: '空图层', x: 100, y: 100, width: 200, height: 200, opacity: 1, visible: true, src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' };
                  setLayers([newLayer, ...layers]);
                  setSelectedLayerId(newLayer.id);
                }} title="添加空图层"><Square className="h-4 w-4" /></Button>
                <Button size="sm" variant="default" className="h-8 px-2 bg-blue-600 hover:bg-blue-700 text-white gap-1 ml-1" onClick={() => {
                  const newLayer: CanvasLayer = { 
                    id: uuidv4(), 
                    type: 'logo-group', 
                    name: 'Logo组件', 
                    x: 100, y: 100, width: 600, height: 150, 
                    opacity: 1, visible: true, 
                    logoItems: [{ id: uuidv4(), url: null }],
                    logoItemSize: 100,
                    logoGap: 20,
                    logoAlign: 'left'
                  };
                  setLayers([newLayer, ...layers]);
                  setSelectedLayerId(newLayer.id);
                }} title="添加Logo组件">
                  <LayoutTemplate className="h-4 w-4" />
                  <span className="text-xs">Logo组</span>
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {layers.map((layer, index) => (
                <div 
                  key={`list-${layer.id}`} 
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`p-3 flex items-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors ${selectedLayerId === layer.id ? 'bg-primary/10 border-l-2 border-primary' : ''} ${draggedIndex === index ? 'opacity-50 bg-muted' : ''}`} 
                  onClick={() => setSelectedLayerId(layer.id)}
                >
                  <div className="cursor-grab active:cursor-grabbing text-muted-foreground/50"><GripVertical className="h-4 w-4" /></div>
                  <div className="w-6 h-6 flex items-center justify-center text-muted-foreground">{layer.type === 'text' ? <Type className="h-3 w-3" /> : layer.type === 'logo-group' ? <LayoutTemplate className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}</div>
                  <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{layer.name}</p></div>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 中间：画布预览 */}
      <div 
        ref={viewportRef}
        className="flex-1 bg-muted/30 rounded-xl border-2 border-dashed border-muted flex flex-col items-center justify-center relative overflow-hidden p-8"
      >
        <div className="absolute top-4 left-4 flex items-center gap-4 z-20 bg-background/80 backdrop-blur p-2 rounded-lg border shadow-sm">
          <div className="flex items-center gap-2">
            <Label className="text-xs">缩放</Label>
            <Slider value={[scale * 100]} min={5} max={100} onValueChange={([v]) => setScale(v / 100)} className="w-32" />
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={autoFit} title="自动适配">
            <Maximize2 className="h-4 w-4" />
          </Button>
          <div className="text-xs text-muted-foreground font-mono">{width} x {height}</div>
        </div>

        <div 
          className="relative transition-transform duration-75"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            flexShrink: 0
          }}
        >
          <div className="absolute inset-0 bg-white shadow-2xl" onClick={() => setSelectedLayerId(null)} />
          
          <div className="absolute top-0 bottom-0 w-px bg-blue-500 z-[1000] pointer-events-none transition-opacity" style={{ left: `${snapLines.x || 0}px`, opacity: snapLines.x !== null ? 1 : 0 }} />
          <div className="absolute left-0 right-0 h-px bg-blue-500 z-[1000] pointer-events-none transition-opacity" style={{ top: `${snapLines.y || 0}px`, opacity: snapLines.y !== null ? 1 : 0 }} />

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {layers.map((layer, index) => (
              <div
                key={layer.id}
                className={`absolute pointer-events-auto ${selectedLayerId === layer.id ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-primary/50'}`}
                style={{
                  left: `${layer.x}px`,
                  top: `${layer.y}px`,
                  width: `${layer.width}px`,
                  height: `${layer.height}px`,
                  opacity: layer.opacity,
                  zIndex: layers.length - index,
                  display: layer.visible ? 'block' : 'none',
                  cursor: interaction.mode === 'dragging' ? 'grabbing' : 'move',
                }}
                onMouseDown={(e) => handleMouseDown(e, layer, 'dragging')}
                onClick={(e) => e.stopPropagation()}
              >
                {layer.type === 'text' ? (
                  <div style={{ width: '100%', height: '100%', fontSize: `${layer.fontSize}px`, color: layer.color, textAlign: layer.textAlign, fontFamily: layer.fontFamily, letterSpacing: `${layer.letterSpacing}px`, lineHeight: layer.lineHeight, whiteSpace: 'pre-wrap', display: 'flex', alignItems: 'center', justifyContent: layer.textAlign === 'center' ? 'center' : (layer.textAlign === 'right' ? 'flex-end' : 'flex-start'), overflow: 'hidden' }}>
                    {layer.content}
                  </div>
                ) : layer.type === 'logo-group' ? (
                  <div className="w-full h-full flex items-center relative group/logo"
                    style={{
                      justifyContent: layer.logoAlign === 'center' ? 'center' : 'flex-start',
                      gap: `${layer.logoGap}px`
                    }}
                  >
                    {/* 左侧加号 */}
                    <div className="flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity" style={{ width: '40px' }}>
                       <Button size="icon" variant="outline" className="h-8 w-8 rounded-full shadow-md bg-white hover:bg-blue-50" 
                         onClick={(e) => {
                           e.stopPropagation();
                           const newItems = [{ id: uuidv4(), url: null }, ...(layer.logoItems || [])];
                           updateLayer(layer.id, { logoItems: newItems });
                         }}
                       ><Plus className="h-4 w-4 text-blue-500" /></Button>
                    </div>

                    {/* Logo Items */}
                    {(layer.logoItems || []).map((item) => (
                      <div key={item.id} 
                        className="relative bg-white border-2 border-dashed border-blue-300 hover:border-blue-500 transition-colors cursor-pointer flex items-center justify-center overflow-hidden rounded-md shadow-sm"
                        style={{ width: `${layer.logoItemSize}px`, height: `${layer.logoItemSize}px`, flexShrink: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadingLogoItemId(item.id);
                          document.getElementById(`logo-upload-${layer.id}`)?.click();
                        }}
                      >
                        {item.url ? (
                          <img src={item.url} className="w-full h-full object-contain" alt="logo" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground">
                            <Upload className="h-4 w-4" />
                            <span className="text-[10px]">上传</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* 右侧加号 */}
                    <div className="flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity" style={{ width: '40px' }}>
                       <Button size="icon" variant="outline" className="h-8 w-8 rounded-full shadow-md bg-white hover:bg-blue-50"
                         onClick={(e) => {
                           e.stopPropagation();
                           const newItems = [...(layer.logoItems || []), { id: uuidv4(), url: null }];
                           updateLayer(layer.id, { logoItems: newItems });
                         }}
                       ><Plus className="h-4 w-4 text-blue-500" /></Button>
                    </div>

                    {/* Hidden Input for Upload */}
                    <input 
                      id={`logo-upload-${layer.id}`}
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (e.target.files?.[0] && uploadingLogoItemId) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) {
                              const newItems = (layer.logoItems || []).map(item => 
                                item.id === uploadingLogoItemId ? { ...item, url: ev.target?.result as string } : item
                              );
                              updateLayer(layer.id, { logoItems: newItems });
                              setUploadingLogoItemId(null);
                            }
                          };
                          reader.readAsDataURL(e.target.files[0]);
                        }
                        // Reset value to allow re-uploading same file
                        e.target.value = '';
                      }} 
                    />
                  </div>
                ) : (
                  <img src={layer.src} alt={layer.name} className="w-full h-full object-fill pointer-events-none" />
                )}
              </div>
            ))}
          </div>

          {selectedLayer && (
            <div 
              className="absolute border-2 border-blue-500 pointer-events-none z-[1500]"
              style={{
                left: `${selectedLayer.x}px`,
                top: `${selectedLayer.y}px`,
                width: `${selectedLayer.width}px`,
                height: `${selectedLayer.height}px`,
              }}
            >
              <div className="absolute inset-0 pointer-events-auto cursor-move" onMouseDown={(e) => handleMouseDown(e, selectedLayer, 'dragging')} />
              <div className="absolute inset-0 pointer-events-none">
                {['tl', 'tr', 'bl', 'br'].map(renderHandle)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧：属性面板 */}
      <div className="w-80 flex flex-col gap-4 overflow-y-auto pl-2">
        <Card>
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm flex items-center gap-2"><Settings className="h-4 w-4" />{selectedLayer ? `编辑: ${selectedLayer.name}` : '全局设置'}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            {!selectedLayer ? (
              <div className="space-y-4">
                <div className="space-y-2"><Label>模板名称</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                
                <div className="space-y-2">
                  <Label>构图模式</Label>
                  <Select value={layout} onValueChange={setLayout}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择构图" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="center">居中构图</SelectItem>
                      <SelectItem value="top-bottom">上下构图</SelectItem>
                      <SelectItem value="left-right">左右构图</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>宽度</Label><Input type="number" value={width} onChange={(e) => setWidth(parseInt(e.target.value) || 0)} /></div>
                  <div className="space-y-2"><Label>高度</Label><Input type="number" value={height} onChange={(e) => setHeight(parseInt(e.target.value) || 0)} /></div>
                </div>
                <Button className="w-full" onClick={async () => {
                  // 生成预览图
                  let previewUrl = '';
                  if (viewportRef.current) {
                    try {
                      // 临时移除缩放和辅助线，以便截图
                      const originalTransform = viewportRef.current.style.transform;
                      const originalWidth = viewportRef.current.style.width;
                      const originalHeight = viewportRef.current.style.height;
                      
                      // 创建一个克隆节点用于截图，避免影响当前视图
                      // 但由于 html2canvas 需要渲染，克隆可能比较复杂。
                      // 这里我们简单地：
                      // 1. 选中图层置空（隐藏辅助线）
                      setSelectedLayerId(null);
                      
                      // 等待 React 渲染更新
                      await new Promise(resolve => setTimeout(resolve, 100));
                      
                      // 截图目标元素：viewportRef.current 内部的缩放容器
                      // 实际上我们需要截图的是那个 style={{ width, height }} 的 div
                      // 它是 viewportRef.current 的第二个子元素 (index 1)
                      const canvasElement = viewportRef.current.children[1] as HTMLElement;
                      
                      if (canvasElement) {
                        const canvas = await html2canvas(canvasElement, {
                          useCORS: true,
                          scale: 0.5, // 预览图不需要太高清，0.5倍足够
                          backgroundColor: '#ffffff',
                          logging: false
                        });
                        
                        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                        if (blob) {
                          const formData = new FormData();
                          formData.append('file', blob, 'preview.png');
                          const res = await fetch('/api/assets/upload', {
                            method: 'POST',
                            body: formData
                          });
                          if (res.ok) {
                            const data = await res.json();
                            previewUrl = data.url;
                          }
                        }
                      }
                    } catch (e) {
                      console.error('生成预览图失败', e);
                    }
                  }
                  
                  onSave({ name, width, height, layers, layout, previewUrl });
                }}><Save className="mr-2 h-4 w-4" /> 保存模板</Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-xs">X 坐标</Label><Input type="number" value={selectedLayer.x} onChange={(e) => updateLayer(selectedLayer.id, { x: parseInt(e.target.value) || 0 })} className="h-8" /></div>
                  <div className="space-y-2"><Label className="text-xs">Y 坐标</Label><Input type="number" value={selectedLayer.y} onChange={(e) => updateLayer(selectedLayer.id, { y: parseInt(e.target.value) || 0 })} className="h-8" /></div>
                  <div className="space-y-2"><Label className="text-xs">宽度</Label><Input type="number" value={selectedLayer.width} onChange={(e) => updateLayer(selectedLayer.id, { width: parseInt(e.target.value) || 0 })} className="h-8" /></div>
                  <div className="space-y-2"><Label className="text-xs">高度</Label><Input type="number" value={selectedLayer.height} onChange={(e) => updateLayer(selectedLayer.id, { height: parseInt(e.target.value) || 0 })} className="h-8" /></div>
                </div>

                {/* Logo组件特有设置 - 提前显示 */}
                {selectedLayer.type === 'logo-group' && (
                  <div className="space-y-4 pt-4 border-t bg-blue-50/50 -mx-4 px-4 py-4">
                    <div className="flex items-center gap-2 mb-2">
                       <LayoutTemplate className="h-4 w-4 text-blue-600" />
                       <Label className="font-bold text-blue-600">Logo 组件设置</Label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">对齐模式</Label>
                      <div className="flex gap-1">
                        <Button size="sm" variant={selectedLayer.logoAlign === 'left' ? 'default' : 'outline'} className="flex-1 h-8" onClick={() => updateLayer(selectedLayer.id, { logoAlign: 'left' })}>
                          <AlignLeft className="mr-2 h-4 w-4" /> 左对齐
                        </Button>
                        <Button size="sm" variant={selectedLayer.logoAlign === 'center' ? 'default' : 'outline'} className="flex-1 h-8" onClick={() => updateLayer(selectedLayer.id, { logoAlign: 'center' })}>
                          <AlignCenter className="mr-2 h-4 w-4" /> 居中
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Logo 大小 (px)</Label>
                      <div className="flex gap-2">
                        <Input type="number" value={selectedLayer.logoItemSize} onChange={(e) => updateLayer(selectedLayer.id, { logoItemSize: parseInt(e.target.value) || 100 })} className="h-8 w-20" />
                        <Slider value={[selectedLayer.logoItemSize || 100]} min={20} max={300} onValueChange={([v]) => updateLayer(selectedLayer.id, { logoItemSize: v })} className="flex-1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">间距 (px)</Label>
                      <div className="flex gap-2">
                        <Input type="number" value={selectedLayer.logoGap} onChange={(e) => updateLayer(selectedLayer.id, { logoGap: parseInt(e.target.value) || 0 })} className="h-8 w-20" />
                        <Slider value={[selectedLayer.logoGap || 20]} min={0} max={100} onValueChange={([v]) => updateLayer(selectedLayer.id, { logoGap: v })} className="flex-1" />
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-blue-100">
                      <Label className="text-xs">Logo 列表管理</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {(selectedLayer.logoItems || []).map((item, index) => (
                          <div key={item.id} className="flex items-center gap-2 bg-white p-2 rounded border shadow-sm">
                            <div className="w-8 h-8 bg-gray-50 rounded border flex items-center justify-center overflow-hidden flex-shrink-0">
                              {item.url ? <img src={item.url} className="w-full h-full object-contain" /> : <span className="text-[8px] text-muted-foreground">空</span>}
                            </div>
                            <div className="flex-1 text-xs truncate text-muted-foreground">Logo {index + 1}</div>
                            <div className="flex gap-1">
                              <Label className="cursor-pointer flex items-center justify-center hover:bg-muted rounded transition-colors" title="上传/替换">
                                <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded border border-blue-100 shadow-sm cursor-pointer hover:bg-blue-100 transition-colors">
                                  <Upload className="h-3 w-3 text-blue-600" />
                                  <span className="text-[10px] text-blue-600 font-medium">上传</span>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                   if (e.target.files?.[0]) {
                                     const reader = new FileReader();
                                     reader.onload = (ev) => {
                                       if (ev.target?.result) {
                                         const newItems = (selectedLayer.logoItems || []).map(i => 
                                           i.id === item.id ? { ...i, url: ev.target?.result as string } : i
                                         );
                                         updateLayer(selectedLayer.id, { logoItems: newItems });
                                       }
                                     };
                                     reader.readAsDataURL(e.target.files[0]);
                                   }
                                }} />
                              </Label>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => {
                                 const newItems = (selectedLayer.logoItems || []).filter(i => i.id !== item.id);
                                 updateLayer(selectedLayer.id, { logoItems: newItems });
                              }} title="删除">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => {
                        onSave({ layers });
                      }}>
                        <Save className="mr-2 h-4 w-4" /> 保存 Logo 配置
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-4 border-t">
                   <Label className="text-xs text-blue-500 font-bold flex items-center gap-1"><Settings className="h-3 w-3" /> 绑定 AI 标签</Label>
                   <Input placeholder="例如: 主体, 背景, 装饰" value={selectedLayer.cozeField || ''} onChange={(e) => updateLayer(selectedLayer.id, { cozeField: e.target.value })} className="h-8 border-blue-200 focus:border-blue-500" />
                </div>

                <div className="space-y-2 pt-4 border-t">
                   <Label className="text-xs text-purple-500 font-bold flex items-center gap-1"><Settings className="h-3 w-3" /> 父子关系</Label>
                   <Select value={selectedLayer.parentId || 'none'} onValueChange={(value) => updateLayer(selectedLayer.id, { parentId: value === 'none' ? undefined : value })}>
                     <SelectTrigger className="h-8 border-purple-200 focus:border-purple-500">
                       <SelectValue placeholder="选择父图层（可选）" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="none">无（独立图层）</SelectItem>
                       {layers.map(layer => {
                         if (layer.id === selectedLayer.id) return null; // 不能选择自己为父
                         return (
                           <SelectItem key={layer.id} value={layer.id}>
                             {layer.name} {layer.cozeField ? `(${layer.cozeField})` : ''}
                           </SelectItem>
                         );
                       })}
                     </SelectContent>
                   </Select>
                   <p className="text-xs text-gray-500 mt-1">💡 当父图层位置/尺寸改变时，子图层会保持相对位置关系</p>
                </div>

                {/* Logo组件特有设置已移动到上方 */}

                {/* 图片图层特有设置 */}
                {selectedLayer.type === 'image' && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label className="text-xs">图片素材</Label>
                      <div className="relative group aspect-video bg-muted rounded-md overflow-hidden border border-border flex items-center justify-center">
                        <img src={selectedLayer.src} alt="预览" className="max-h-full max-w-full object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Label className="cursor-pointer">
                            <div className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded-full shadow-sm hover:bg-gray-100 transition-colors">点击替换</div>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                              if (e.target.files?.[0]) {
                                const reader = new FileReader();
                                reader.onload = (ev) => { if (ev.target?.result) updateLayer(selectedLayer.id, { src: ev.target.result as string }); };
                                reader.readAsDataURL(e.target.files[0]);
                              }
                            }} />
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 文字图层特有设置 */}
                {selectedLayer.type === 'text' && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label className="text-xs">字体选择</Label>
                      <Select value={selectedLayer.fontFamily} onValueChange={(v) => updateLayer(selectedLayer.id, { fontFamily: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">文字内容</Label>
                      <Textarea 
                        value={selectedLayer.content} 
                        onChange={(e) => updateLayer(selectedLayer.id, { content: e.target.value })} 
                        className="min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">字号 (px)</Label>
                      <div className="flex gap-2">
                        <Input type="number" value={selectedLayer.fontSize} onChange={(e) => updateLayer(selectedLayer.id, { fontSize: parseInt(e.target.value) || 0 })} className="h-8 w-20" />
                        <Slider value={[selectedLayer.fontSize || 24]} min={10} max={500} onValueChange={([v]) => updateLayer(selectedLayer.id, { fontSize: v })} className="flex-1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">对齐方式</Label>
                      <div className="flex gap-1">
                        <Button size="sm" variant={selectedLayer.textAlign === 'left' ? 'default' : 'outline'} className="flex-1 h-8" onClick={() => updateLayer(selectedLayer.id, { textAlign: 'left' })}><AlignLeft className="h-4 w-4" /></Button>
                        <Button size="sm" variant={selectedLayer.textAlign === 'center' ? 'default' : 'outline'} className="flex-1 h-8" onClick={() => updateLayer(selectedLayer.id, { textAlign: 'center' })}><AlignCenter className="h-4 w-4" /></Button>
                        <Button size="sm" variant={selectedLayer.textAlign === 'right' ? 'default' : 'outline'} className="flex-1 h-8" onClick={() => updateLayer(selectedLayer.id, { textAlign: 'right' })}><AlignRight className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">字间距</Label>
                        <Input type="number" value={selectedLayer.letterSpacing} onChange={(e) => updateLayer(selectedLayer.id, { letterSpacing: parseInt(e.target.value) || 0 })} className="h-8" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">行高</Label>
                        <Input type="number" step="0.1" value={selectedLayer.lineHeight} onChange={(e) => updateLayer(selectedLayer.id, { lineHeight: parseFloat(e.target.value) || 1 })} className="h-8" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">文字颜色</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={selectedLayer.color} onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })} className="w-10 h-8 p-1" />
                        <Input value={selectedLayer.color} onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })} className="flex-1 h-8 font-mono text-xs" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-xs">不透明度 ({Math.round(selectedLayer.opacity * 100)}%)</Label>
                  <Slider value={[selectedLayer.opacity * 100]} min={0} max={100} onValueChange={([v]) => updateLayer(selectedLayer.id, { opacity: v / 100 })} />
                </div>
                
                <div className="pt-4 border-t space-y-2">
                  <Button variant="destructive" size="sm" className="w-full" onClick={() => deleteLayer(selectedLayer.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> 删除图层
                  </Button>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedLayerId(null)}>返回全局设置</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}