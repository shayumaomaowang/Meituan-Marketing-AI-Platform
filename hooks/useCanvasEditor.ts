import { useState, useRef, useEffect, useMemo } from 'react';
import { CanvasLayer, CustomTemplate } from '@/lib/canvas-utils';
import { v4 as uuidv4 } from 'uuid';

export type InteractionMode = 'none' | 'dragging' | 'resizing';

export function useCanvasEditor(initialData?: CustomTemplate) {
  const [name, setName] = useState(initialData?.name || '未命名模板');
  const [width, setWidth] = useState(initialData?.width || 1080);
  const [height, setHeight] = useState(initialData?.height || 1920);
  const [layout, setLayout] = useState(initialData?.layout || 'center');
  const [layers, setLayers] = useState<CanvasLayer[]>(initialData?.layers || []);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [snapLines, setSnapLines] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  
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
      // 移除上限 1，让画布尽可能大地适配容器
      const newScale = Math.min(scaleX, scaleY);
      setScale(parseFloat(newScale.toFixed(3)));
    }
  };

  useEffect(() => {
    const timer = setTimeout(autoFit, 100);
    return () => clearTimeout(timer);
  }, [width, height]); // Re-run when dimensions change

  const selectedLayer = useMemo(() => layers.find(l => l.id === selectedLayerId), [layers, selectedLayerId]);

  const updateLayer = (id: string, updates: Partial<CanvasLayer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const deleteLayer = (id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    setSelectedLayerId(null);
  };

  const addLayer = (layer: CanvasLayer) => {
    setLayers([layer, ...layers]);
    setSelectedLayerId(layer.id);
  };

  // ... (Interaction logic needs to be exposed or handled within the hook/components)
  // For simplicity, we'll expose the state setters and logic needed for the components

  return {
    name, setName,
    width, setWidth,
    height, setHeight,
    layout, setLayout,
    layers, setLayers,
    selectedLayerId, setSelectedLayerId,
    scale, setScale,
    viewportRef,
    draggedIndex, setDraggedIndex,
    snapLines, setSnapLines,
    interaction, setInteraction,
    autoFit,
    selectedLayer,
    updateLayer,
    deleteLayer,
    addLayer
  };
}