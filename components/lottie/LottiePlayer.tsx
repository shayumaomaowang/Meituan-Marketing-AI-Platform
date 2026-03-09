
'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { EditableElement, updateLottieData } from '@/lib/lottie-utils';

// Dynamically import Lottie with SSR disabled to avoid window is not defined errors
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface LottiePlayerProps {
  animationData: any;
  editableElements?: EditableElement[];
  className?: string;
  onRef?: (ref: any) => void;
}

export function LottiePlayer({ animationData, editableElements, className, onRef }: LottiePlayerProps) {
  // Merge original data with current editable values
  const activeData = useMemo(() => {
    if (!animationData) return null;

    let data = animationData;
    try {
      if (editableElements && editableElements.length > 0) {
        data = updateLottieData(animationData, editableElements);
      }
      
      // 强制禁用 Glyphs (字符形状) 渲染，改用浏览器字体渲染
      if (data) {
        const newData = JSON.parse(JSON.stringify(data)); // 深度克隆，确保引用变化
        if (newData.chars) {
          delete newData.chars;
        }
        // 确保字体配置指向浏览器字体
        if (newData.fonts && newData.fonts.list) {
          newData.fonts.list = newData.fonts.list.map((font: any) => ({
            ...font,
            origin: 3 // 强制使用浏览器字体渲染
          }));
        }
        return newData;
      }
    } catch (e) {
      console.error("Error processing Lottie data:", e);
      return animationData; // Fallback to original data on error
    }
    return data;
  }, [animationData, editableElements]);

  // Prevent rendering if no data or invalid data
  // Lottie data must have at least 'v' (version) and 'layers'
  if (!activeData || !activeData.v || !activeData.layers) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">无效的 Lottie 数据</div>;
  }

  return (
    <div className={className}>
      <Lottie 
        lottieRef={onRef}
        animationData={activeData} 
        loop={true} 
        autoplay={true}
        rendererSettings={{
          // 强制使用浏览器字体渲染，解决 "Missing character from exported characters list" 问题
          className: 'lottie-svg-renderer',
          preserveAspectRatio: 'xMidYMid slice',
          focusable: false,
        }}
        // Force re-render when data changes deeply to ensure updates are applied immediately
        key={JSON.stringify(editableElements)} 
      />
    </div>
  );
}