import ArticleLayout from '@/components/ArticleLayout';
import contentData from '@/data/content.json';

export default function ArticlesPage() {
  return (
    <ArticleLayout 
      title="营销90文章" 
      articles={contentData.articles} 
      modulePath="/articles" 
    />
  );
}