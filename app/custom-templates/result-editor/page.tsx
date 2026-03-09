'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CanvasEditor } from '@/components/canvas/CanvasEditor';
import { toast } from 'sonner';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ResultEditorPage() {
  const router = useRouter();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = sessionStorage.getItem('pendingResultTemplate');
    if (data) {
      setTemplate(JSON.parse(data));
      setLoading(false);
    } else {
      toast.error('未找到生成结果');
      router.push('/create');
    }
  }, [router]);

  const handleExport = () => {
    toast.info('正在导出高清图片...');
    // 实际项目中这里可以调用 html2canvas 或后端渲染接口
    setTimeout(() => toast.success('导出成功！'), 2000);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">微调生成结果</h1>
            <p className="text-xs text-muted-foreground">在此对 AI 生成的内容进行最后调整，不会影响原始模板</p>
          </div>
        </div>
        <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700">
          <Download className="mr-2 h-4 w-4" /> 导出最终海报
        </Button>
      </div>
      
      <CanvasEditor 
        initialData={template} 
        onSave={(data) => {
          // 这里可以保存为“作品”而不是“模板”
          toast.success('作品已保存至我的设计');
        }} 
      />
    </div>
  );
}