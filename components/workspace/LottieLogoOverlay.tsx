'use client';

import { LogoConfig } from '@/lib/logo-types';
import { useState, useRef } from 'react';

interface LottieLogoOverlayProps {
  config: LogoConfig;
  containerWidth: number;
  containerHeight: number;
  onPositionChange?: (x: number, y: number) => void;
}

export function LottieLogoOverlay({ 
  config, 
  containerWidth, 
  containerHeight,
  onPositionChange
}: LottieLogoOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState({ 
    x: config.x ?? 16, 
    y: config.y ?? containerHeight - 80 - 16 
  });

  if (!config.enabled) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDragging(true);
    setDragOffset({
      x: x - currentPosition.x,
      y: y - currentPosition.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newX = x - dragOffset.x;
    const newY = y - dragOffset.y;

    // 限制在容器内
    const boundedX = Math.max(0, Math.min(newX, containerWidth - config.itemSize));
    const boundedY = Math.max(0, Math.min(newY, containerHeight - config.itemSize));

    setCurrentPosition({ x: boundedX, y: boundedY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (onPositionChange) {
      onPositionChange(currentPosition.x, currentPosition.y);
    }
  };

  const itemSize = config.itemSize;

  return (
    <div 
      ref={containerRef}
      className="absolute top-0 left-0 pointer-events-none z-50"
      style={{ width: containerWidth, height: containerHeight }}
      onMouseMove={isDragging ? handleMouseMove : undefined}
      onMouseUp={isDragging ? handleMouseUp : undefined}
      onMouseLeave={isDragging ? handleMouseUp : undefined}
    >
      <div 
        className={`absolute flex items-center ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          left: `${currentPosition.x}px`,
          top: `${currentPosition.y}px`,
          gap: `${config.gap}px`,
          opacity: config.opacity,
          justifyContent: config.align === 'center' ? 'center' : (config.align === 'right' ? 'flex-end' : 'flex-start'),
          pointerEvents: 'auto',
        }}
        onMouseDown={handleMouseDown}
      >
        {config.items.map((item) => (
          <div
            key={item.id}
            className="relative overflow-hidden group flex-shrink-0"
            style={{
              width: `${itemSize}px`,
              height: `${itemSize}px`,
              pointerEvents: 'none',
            }}
          >
            {item.url ? (
              <img 
                src={item.url} 
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                <span className="text-[8px]">Logo</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}