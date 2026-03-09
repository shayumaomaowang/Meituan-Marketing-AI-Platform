'use client';

import { useParams } from 'next/navigation';
import ArticleLayout from '@/components/ArticleLayout';
import contentData from '@/data/content.json';

export default function ArticleDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <ArticleLayout 
      title="营销90文章" 
      articles={contentData.articles} 
      modulePath="/articles" 
      selectedArticleId={id}
    />
  );
}