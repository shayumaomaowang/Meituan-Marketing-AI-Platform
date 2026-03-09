import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
  text?: string;
}

export function LoadingOverlay({ isVisible, text = "正在分析您的需求..." }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
        <div className="relative bg-[#1a1a1e] border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-primary/30 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-white">{text}</h3>
            <p className="text-sm text-gray-400">AI 正在理解您的创意...</p>
          </div>
          
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div 
                key={i} 
                className="w-2 h-2 bg-primary rounded-full animate-bounce" 
                style={{ animationDelay: `${i * 0.2}s` }} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}