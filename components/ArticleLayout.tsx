'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Tag } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  description?: string;
  image?: string;
  date?: string;
  tag?: string;
  content?: string;
}

interface ArticleLayoutProps {
  title: string;
  articles: Article[];
  modulePath: string;
  selectedArticleId?: string;
}

export default function ArticleLayout({ title, articles, modulePath, selectedArticleId }: ArticleLayoutProps) {
  const selectedArticle = articles.find(a => a.id === selectedArticleId);

  if (selectedArticleId && selectedArticle) {
    return (
      <div className="min-h-screen">
        <main className="max-w-4xl mx-auto px-4 py-12">
          <Link href={modulePath} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> 返回{title}列表
          </Link>
          
          <article>
            <header className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                {selectedArticle.tag && (
                  <span className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-bold">
                    {selectedArticle.tag}
                  </span>
                )}
                {selectedArticle.date && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-1 h-4 w-4" /> {selectedArticle.date}
                  </div>
                )}
              </div>
              <h1 className="text-4xl font-bold mb-6 leading-tight">{selectedArticle.title}</h1>
              {selectedArticle.description && (
                <p className="text-xl text-muted-foreground leading-relaxed">
                  {selectedArticle.description}
                </p>
              )}
            </header>

            {selectedArticle.image && (
              <div className="aspect-video rounded-[32px] overflow-hidden mb-12 border border-white/5 shadow-2xl">
                <img src={selectedArticle.image} alt={selectedArticle.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="prose prose-invert max-w-none">
              <div className="glass-card rounded-[32px] p-10">
                <p className="text-lg leading-loose whitespace-pre-wrap text-gray-300">
                  {selectedArticle.content || "暂无详细内容..."}
                </p>
              </div>
            </div>
          </article>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4">{title}</h1>
          <p className="text-gray-400 text-lg font-light">探索最新的行业洞察与设计标准。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => (
            <Link key={article.id} href={`${modulePath}/${article.id}`} className="group">
              <div className="flex flex-col h-full glass-card rounded-[32px] overflow-hidden hover:border-primary/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(124,58,237,0.15)]">
                {article.image ? (
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-white/5 flex items-center justify-center">
                    <Tag className="h-12 w-12 text-white/10" />
                  </div>
                )}
                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    {article.tag && (
                      <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
                        {article.tag}
                      </span>
                    )}
                    {article.date && (
                      <span className="text-xs text-gray-500 font-light">{article.date}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-gray-400 text-sm line-clamp-3 mb-8 font-light leading-relaxed">
                    {article.description}
                  </p>
                  <div className="mt-auto pt-6 border-t border-white/5 flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                    阅读详情 <ArrowLeft className="ml-1 h-4 w-4 rotate-180" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}