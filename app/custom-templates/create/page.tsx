'use client';

import { useRouter } from 'next/navigation';
import { CanvasEditor } from '@/components/canvas/CanvasEditor';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateCustomTemplatePage() {
  const router = useRouter();

  const handleSave = async (data: any) => {
    try {
      const res = await fetch('/api/custom-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success('模板创建成功');
        router.push('/custom-templates');
      } else {
        toast.error('保存失败');
      }
    } catch (error) {
      toast.error('保存失败');
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/custom-templates" className="text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">新建自定义模板</h1>
      </div>
      <CanvasEditor onSave={handleSave} />
    </div>
  );
}