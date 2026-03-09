import ArticleLayout from '@/components/ArticleLayout';
import contentData from '@/data/content.json';

export default function ReportsPage() {
  return (
    <ArticleLayout 
      title="竞品报告" 
      articles={contentData.reports} 
      modulePath="/reports" 
    />
  );
}