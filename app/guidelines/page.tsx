'use client';

import React from 'react';
import Link from 'next/link';
import { Zap, Calendar, Layout, UserCheck, ChevronRight } from 'lucide-react';
import contentData from '@/data/content.json';

const iconMap: Record<string, any> = {
  Zap,
  Calendar,
  Layout,
  UserCheck
};

export default function GuidelinesPage() {
  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4">设计规范</h1>
          <p className="text-gray-400 text-lg font-light">统一的设计语言，助力高效产出高质量作品。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {contentData.guidelines.map((guide) => {
            const Icon = iconMap[guide.icon] || Layout;
            return (
              <Link key={guide.id} href={`/guidelines/${guide.id}`} className="group">
                <div className="p-0 h-full glass-card rounded-[32px] overflow-hidden hover:border-primary/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(124,58,237,0.15)] flex flex-col">
                  {/* 封面图区域 */}
                  <div className="aspect-[4/3] overflow-hidden relative border-b border-white/5">
                    <img 
                      src={guide.image} 
                      alt={guide.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                    <div className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-primary/20 backdrop-blur-md flex items-center justify-center text-primary border border-white/10">
                      <Icon size={20} />
                    </div>
                  </div>

                  <div className="p-8 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                      {guide.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-8 font-light">
                      {guide.description}
                    </p>
                    <div className="mt-auto flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                      查看规范 <ChevronRight className="ml-1 h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}