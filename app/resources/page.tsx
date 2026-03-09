'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout, Image as ImageIcon, Palette } from 'lucide-react';

const BACKGROUND_COLORS = [
  '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF3', '#FFFF33',
  '#000000', '#FFFFFF', '#808080', '#FF0000', '#00FF00', '#0000FF'
];

const BACKGROUND_IMAGES = [
  '/double11-banner.png',
  '/member-day-banner.png',
  '/member-free-banner.png',
  '/member-homepage-card.png',
  '/hongbao-popup.png',
  '/double12-banner.png',
  '/platform-component.png',
  '/mini-program-card.png'
];

export default function ResourcesPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Layout className="text-primary" /> 资源库
          </h1>
          <p className="text-muted-foreground">管理您的设计素材，包括背景、Logo、图片等。</p>
        </div>

        <Tabs defaultValue="backgrounds">
          <TabsList className="mb-4">
            <TabsTrigger value="backgrounds">背景库</TabsTrigger>
            <TabsTrigger value="logos">Logo 库</TabsTrigger>
            <TabsTrigger value="images">图片素材</TabsTrigger>
          </TabsList>

          <TabsContent value="backgrounds">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> 纯色背景</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-6 gap-4">
                    {BACKGROUND_COLORS.map((color) => (
                      <div 
                        key={color} 
                        className="aspect-square rounded-lg shadow-sm cursor-pointer hover:scale-110 transition-transform border"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" /> 图片背景</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {BACKGROUND_IMAGES.map((img, i) => (
                      <div 
                        key={i} 
                        className="aspect-video rounded-lg overflow-hidden shadow-sm cursor-pointer hover:opacity-80 transition-opacity border bg-muted"
                      >
                        <img src={img} alt="背景" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="logos">
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Logo 库功能开发中...
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images">
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                图片素材库功能开发中...
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}