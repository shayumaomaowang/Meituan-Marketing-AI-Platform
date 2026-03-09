import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Image as ImageIcon } from 'lucide-react';
import { CanvasLayer } from '@/lib/canvas-utils';
import { InteractionMode } from '@/hooks/useCanvasEditor';
import { v4 as uuidv4 } from 'uuid';

interface CanvasPreviewProps {
  width: number;
  height: number;
  scale: number;
  setScale: (scale: number) => void;
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  setSelectedLayerId: (id: string | null) => void;
  snapLines: { x: number | null; y: number | null };
  setSnapLines: (lines: { x: number | null; y: number | null }) => void;
  interaction: {
    mode: InteractionMode;
    startX: number;
    startY: number;
    startLayerX: number;
    startLayerY: number;
    startLayerW: number;
    startLayerH: number;
    handle?: string;
    aspectRatio: number;
  };
  setInteraction: (interaction: any) => void;
  updateLayer: (id: string, updates: Partial<CanvasLayer>) => void;
  autoFit: () => void;
  viewportRef: React.RefObject<HTMLDivElement>;
}

export function CanvasPreview({
  width,
  height,
  scale,
  setScale,
  layers,
  selectedLayerId,
  setSelectedLayerId,
  snapLines,
  setSnapLines,
  interaction,
  setInteraction,
  updateLayer,
  autoFit,
  viewportRef
}: CanvasPreviewProps) {

  const selectedLayer = layers.find(l => l.id === selectedLayerId);
  const [uploadingLogoItemId, setUploadingLogoItemId] = React.useState<string | null>(null);

  // 辅助函数：渲染富文本
  const renderRichText = (layer: CanvasLayer) => {
    if (!layer.richText || !layer.richText.styles || layer.richText.styles.length === 0) {
      return layer.content;
    }

    const text = layer.richText.text;
    const styles = layer.richText.styles;
    
    // 构建字符级别的样式映射
    const charStyles = new Array(text.length).fill({ color: layer.color, fontSize: layer.fontSize });
    
    styles.forEach(style => {
      for (let i = style.start; i < style.end && i < text.length; i++) {
        charStyles[i] = {
          color: style.color || charStyles[i].color,
          fontSize: style.fontSize || charStyles[i].fontSize
        };
      }
    });

    // 合并相邻相同样式的字符
    const segments = [];
    if (text.length > 0) {
      let currentSegment = { 
        text: text[0], 
        style: charStyles[0] 
      };
      
      for (let i = 1; i < text.length; i++) {
        const style = charStyles[i];
        const prevStyle = currentSegment.style;
        
        if (style.color === prevStyle.color && style.fontSize === prevStyle.fontSize) {
          currentSegment.text += text[i];
        } else {
          segments.push(currentSegment);
          currentSegment = { text: text[i], style };
        }
      }
      segments.push(currentSegment);
    }

    return segments.map((seg, index) => (
      <span key={index} style={{ color: seg.style.color, fontSize: seg.style.fontSize ? `${seg.style.fontSize}px` : undefined }}>
        {seg.text}
      </span>
    ));
  };

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
      setInteraction((prev: any) => ({ ...prev, mode: 'none' }));
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
    <div 
      ref={viewportRef}
      className="flex-1 bg-muted/30 rounded-xl border-2 border-dashed border-muted flex flex-col items-center justify-center relative overflow-hidden p-8 h-full"
    >
      <div className="absolute top-4 left-4 flex items-center gap-4 z-20 bg-background/80 backdrop-blur p-2 rounded-lg border shadow-sm">
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
          {layers.map((layer, index) => {
            // 计算图层的实际位置：考虑父子关系
            let displayX = layer.x;
            let displayY = layer.y;

            // 如果该图层有父图层，计算相对位置
            if (layer.parentId) {
              const parentLayer = layers.find(l => l.id === layer.parentId);
              if (parentLayer) {
                // 当前实现：子图层位置 = 子绝对坐标
                // 父子关系在主体替换时已经通过调整子图层位置实现
                // 这里只需要使用图层本身的 x, y 坐标即可
                // 如果未来需要更复杂的相对位置计算，可以在这里扩展
              }
            }

            return (
              <div
                key={layer.id}
                className={`absolute pointer-events-auto ${selectedLayerId === layer.id ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-primary/50'}`}
                style={{
                  left: `${displayX}px`,
                  top: `${displayY}px`,
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
                    {renderRichText(layer)}
                  </div>
                ) : layer.type === 'logo-group' ? (
                  <div className="w-full h-full flex items-center relative group/logo"
                    style={{
                      justifyContent: layer.logoAlign === 'center' ? 'center' : 'flex-start',
                      gap: `${layer.logoGap}px`
                    }}
                  >
                    {/* 左侧加号已移除 */}

                    {/* Logo Items */}
                    {(layer.logoItems || []).map((item) => (
                      <div key={item.id} 
                        className={`relative transition-colors cursor-pointer flex items-center justify-center overflow-hidden rounded-md ${
                          item.url 
                            ? 'hover:ring-2 hover:ring-blue-500/50' 
                            : 'border-2 border-dashed border-blue-300 hover:border-blue-500 shadow-sm'
                        }`}
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

                    {/* 右侧加号已移除 */}

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
                  <img 
                    key={`${layer.id}-${layer.src}`}
                    src={layer.src} 
                    alt={layer.name} 
                    className="w-full h-full object-fill pointer-events-none" 
                    onLoad={() => console.log(`✅ [CanvasPreview] 图片已加载: ${layer.name} (${layer.src.slice(0, 50)}...)`)}
                    onError={(e) => console.error(`❌ [CanvasPreview] 图片加载失败: ${layer.name}`, e)}
                  />
                )}
              </div>
            );
          })}
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
  );
}