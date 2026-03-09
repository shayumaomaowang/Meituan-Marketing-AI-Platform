'use client';

import { useParams } from 'next/navigation';
import ArticleLayout from '@/components/ArticleLayout';
import contentData from '@/data/content.json';

export default function ReportDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <ArticleLayout 
      title="竞品报告" 
      articles={contentData.reports} 
      modulePath="/reports" 
      selectedArticleId={id}
    />
  );
}