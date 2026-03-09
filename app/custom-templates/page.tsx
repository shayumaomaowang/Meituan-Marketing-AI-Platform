'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Layout, Trash2, Edit, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function CustomTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/custom-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/custom-templates/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('模板已删除');
        fetchTemplates();
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-5xl font-bold mb-4">自定义模板</h1>
            <p className="text-gray-400 text-lg font-light">自由设计你的分层模板，支持文字与图片实时编辑。</p>
          </div>
          <Link href="/custom-templates/create">
            <Button className="rounded-full px-6 bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(124,58,237,0.3)]">
              <PlusCircle className="mr-2 h-4 w-4" /> 新建模板
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500 animate-pulse text-lg">加载中...</div>
        ) : templates.length === 0 ? (
          <div className="glass-card rounded-[40px] p-20 text-center border-dashed border-2">
            <Layout className="h-16 w-16 text-white/10 mx-auto mb-6" />
            <h3 className="text-2xl font-medium mb-2">暂无自定义模板</h3>
            <p className="text-gray-500 mb-8">点击右上角“新建模板”开始你的第一个设计</p>
            <Link href="/custom-templates/create">
              <Button variant="outline" className="rounded-full px-8 border-white/10 hover:bg-white/5">立即新建</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {templates.map((template) => (
              <div key={template.id} className="group">
                <div className="flex flex-col h-full glass-card rounded-[32px] overflow-hidden hover:border-primary/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(124,58,237,0.15)]">
                  {/* 预览区域 */}
                  <div className="aspect-[4/3] bg-white/5 flex items-center justify-center relative border-b border-white/5 overflow-hidden">
                    {template.previewUrl ? (
                      <img 
                        src={template.previewUrl} 
                        alt={template.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <Layout className="h-16 w-16 text-white/5 group-hover:scale-110 transition-transform duration-700" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                      <Link href={`/custom-templates/${template.id}`}>
                        <Button variant="secondary" className="rounded-full px-6 font-bold shadow-xl">
                          <Edit className="mr-2 h-4 w-4" /> 编辑模板
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold group-hover:text-primary transition-colors truncate pr-4">
                        {template.name}
                      </h3>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-full">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-card border-white/10 rounded-[32px]">
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除?</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-400">此操作无法撤销，该模板将被永久移除。</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-full border-white/10">取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(template.id)} className="bg-destructive text-white rounded-full">确认删除</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    
                    <div className="space-y-2 mb-8">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-light">尺寸规格</span>
                        <span className="text-gray-300 font-mono">{template.width} × {template.height}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-light">图层数量</span>
                        <span className="text-gray-300">{template.layers?.length || 0} Layers</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-gray-600 uppercase tracking-widest">
                        Updated {new Date(template.updatedAt).toLocaleDateString()}
                      </span>
                      <Link href={`/custom-templates/${template.id}`} className="text-primary flex items-center text-sm font-medium group-hover:gap-1 transition-all">
                        进入编辑 <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}