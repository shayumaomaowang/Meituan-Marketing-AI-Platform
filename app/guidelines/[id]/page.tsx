'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import contentData from '@/data/content.json';

export default function GuidelineDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const guide = contentData.guidelines.find(g => g.id === id);

  if (!guide) return <div className="p-20 text-center">未找到该规范</div>;

  return (
    <div className="min-h-screen">
      <main className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/guidelines" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> 返回设计规范列表
        </Link>
        
        <article>
          <h1 className="text-4xl font-bold mb-6">{guide.title}</h1>
          <p className="text-xl text-gray-400 mb-12 font-light">{guide.description}</p>
          
          <div className="glass-card rounded-[32px] p-10">
            <p className="text-lg leading-loose whitespace-pre-wrap text-gray-300">
              {guide.content}
            </p>
          </div>
        </article>
      </main>
    </div>
  );
}