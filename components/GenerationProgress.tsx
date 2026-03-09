import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Sparkles, BrainCircuit, Image as ImageIcon, Layers } from 'lucide-react';

interface GenerationProgressProps {
  isGenerating: boolean;
}

const STEPS = [
  { text: "正在思考需求...", icon: BrainCircuit, progress: 15 },
  { text: "正在生成主体...", icon: ImageIcon, progress: 45 },
  { text: "正在生成背景...", icon: Layers, progress: 75 },
  { text: "正在合成图片...", icon: Sparkles, progress: 95 },
];

export function GenerationProgress({ isGenerating }: GenerationProgressProps) {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      setProgress(0);
      setCurrentStepIndex(0);
      return;
    }

    // 模拟进度条增长
    const interval = setInterval(() => {
      setProgress((prev) => {
        // 永远不要自动达到 100%，直到外部 isGenerating 变为 false
        if (prev >= 98) return 98;
        
        // 动态增长速度：开始快，后面慢
        const increment = prev < 30 ? 2 : prev < 70 ? 1 : 0.5;
        return prev + increment;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isGenerating]);

  // 根据进度更新当前步骤文案
  useEffect(() => {
    const step = STEPS.findIndex(s => progress < s.progress);
    if (step !== -1 && step !== currentStepIndex) {
      setCurrentStepIndex(step);
    } else if (progress >= 95) {
      setCurrentStepIndex(STEPS.length - 1);
    }
  }, [progress]);

  const CurrentIcon = STEPS[currentStepIndex].icon;

  return (
    <div className="h-full flex flex-col items-center justify-center py-20 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* 图标动画区域 */}
        <div className="flex justify-center mb-8">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-20" />
            <div className="relative bg-[#1a1a1e] border border-white/10 p-6 rounded-2xl shadow-2xl">
              <CurrentIcon className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>
        </div>

        {/* 进度条区域 */}
        <div className="space-y-4">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-white transition-all duration-300">
              {STEPS[currentStepIndex].text}
            </span>
            <span className="text-primary">{Math.round(progress)}%</span>
          </div>
          
          <Progress value={progress} className="h-2 bg-white/5" />
          
          <div className="flex justify-between px-1">
            {STEPS.map((step, idx) => (
              <div 
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors duration-500 ${
                  idx <= currentStepIndex ? 'bg-primary' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 提示文案 */}
        <p className="text-center text-xs text-gray-500 animate-pulse">
          AI 正在进行复杂的创意计算，请耐心等待...
        </p>
      </div>
    </div>
  );
}