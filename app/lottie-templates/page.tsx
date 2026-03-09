'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, PlayCircle, AlertCircle, Trash2, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

// 1. 定义精准同义词映射（仅用于解决中英文标签不一致的问题）
// 这里的映射必须是绝对等价的，不做模糊猜测
const EXACT_SYNONYMS: Record<string, string[]> = {
  // 英文标签 -> 中文素材 Key
  'main_image': ['主体', '主体图片', 'main_image', 'main', 'product', '商品'],
  'background_image': ['背景', '背景图片', 'background_image', 'bg', 'background', '底图'],
  'main_text': ['标题', '主标题', 'main_text', 'title', '文案'],
  'sub_text': ['副标题', 'sub_text', 'subtitle', '副文案'],
  'sub_title': ['副标题', 'sub_title', 'subtitle'],
  'logo_image': ['logo', 'Logo', 'logo_image', 'brand', 'icon'],
  'number_image': ['数字', 'number_image', 'number', 'price'],
  'decoration_1': ['装饰', '装饰1', 'decoration_1', 'decoration'],
  'decoration_2': ['装饰2', 'decoration_2'],
  'foreground_bar': ['前景条', '前景', 'foreground_bar'],
  
  // 中文标签 -> 英文素材 Key (反向兼容)
  '主体': ['main_image', 'main', 'product'],
  '背景': ['background_image', 'bg', 'background'],
  '标题': ['main_text', 'title'],
  '副标题': ['sub_text', 'subtitle'],
  '前景条': ['foreground_bar']
};

// 2. 标签优先的匹配函数（精准同义词版）
export const getAiAsset = (templateLabel: string, aiAssets: Record<string, string>, expectedType?: 'image' | 'text') => {
  if (!templateLabel) return null;

  const cleanLabel = templateLabel.trim();
  
  // 辅助函数：判断是否为图片链接
  const isImageUrl = (val: string) => typeof val === 'string' && (val.startsWith('http') || val.startsWith('/api/proxy') || val.startsWith('data:image'));

  console.group(`🎯 动效素材匹配: [${templateLabel}]`);

  // 策略 1：直接精准匹配 (Key 完全一致)
  if (aiAssets[cleanLabel]) {
    const value = aiAssets[cleanLabel];
    if (checkType(value, expectedType, cleanLabel)) {
      console.log(`   ✅ 直接匹配成功: [${cleanLabel}]`);
      console.groupEnd();
      return value;
    }
  }

  // 策略 2：精准同义词匹配
  // 查找该标签是否有定义的同义词
  const synonyms = EXACT_SYNONYMS[cleanLabel];
  if (synonyms) {
    for (const synonym of synonyms) {
      if (aiAssets[synonym]) {
        const value = aiAssets[synonym];
        if (checkType(value, expectedType, synonym)) {
          console.log(`   ✅ 同义词匹配成功: [${cleanLabel}] -> [${synonym}]`);
          console.groupEnd();
          return value;
        }
      }
    }
  }

  console.log(`   ❌ 未找到匹配: [${cleanLabel}] (尝试了同义词: ${synonyms?.join(', ') || '无'})`);
  console.groupEnd();
  return null;
};

// 辅助函数：类型检查
function checkType(value: string, expectedType: 'image' | 'text' | undefined, label: string): boolean {
  const isImageUrl = (val: string) => typeof val === 'string' && (val.startsWith('http') || val.startsWith('/api/proxy') || val.startsWith('data:image'));
  const isImage = isImageUrl(value);
  
  if (expectedType === 'image' && !isImage) {
    console.log(`   ⚠️ 找到 [${label}] 但类型不符 (期望图片，实际是文字)`);
    return false;
  }
  if (expectedType === 'text' && isImage) {
    console.log(`   ⚠️ 找到 [${label}] 但类型不符 (期望文字，实际是图片)`);
    return false;
  }
  return true;
}

export default function TemplatesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isFromGenerator = searchParams.get('from') === 'generator';

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleUseTemplate = (template: any) => {
    if (isFromGenerator) {
      const pendingAssetsStr = sessionStorage.getItem('pendingAssets');
      if (pendingAssetsStr) {
        const assets = JSON.parse(pendingAssetsStr);
        
        // 诊断：检查模板中是否有多个元素使用相同的 cozeField
        const cozeFieldMap = new Map<string, any[]>();
        template.elements.forEach((el: any) => {
          if (el.isEditable && el.cozeField) {
            if (!cozeFieldMap.has(el.cozeField)) {
              cozeFieldMap.set(el.cozeField, []);
            }
            cozeFieldMap.get(el.cozeField)!.push(el);
          }
        });
        
        const duplicateCozeFields = Array.from(cozeFieldMap.entries())
          .filter(([_, els]) => els.length > 1);
        
        if (duplicateCozeFields.length > 0) {
          console.warn('⚠️ [列表页] 检测到多个元素使用相同的 cozeField（它们会被替换为相同的素材）:', 
            duplicateCozeFields.map(([field, els]) => `${field}: ${els.map((e: any) => e.id).join(', ')}`).join('; '));
        }
        
        // 优化：只存储 URL 或文字值，不存储 Base64（减小数据体积）
        // 编辑器页面会在加载时执行 Base64 转换
        const injectionMetadata: Record<string, string> = {};
        const injectedElements = template.elements.map((el: any) => {
          const aiValue = getAiAsset(el.cozeField || '', assets, el.type);
          if (el.isEditable && el.cozeField && aiValue) {
            console.log(`✅ [列表页] 注入素材: [${el.cozeField}] (${el.id}) -> ${typeof aiValue === 'string' ? aiValue.substring(0, 50) : aiValue}`);
            injectionMetadata[el.id] = aiValue;
            return { ...el, currentValue: aiValue };
          } else if (el.isEditable && el.cozeField) {
             console.warn(`⚠️ [列表页] 未找到匹配素材: [${el.cozeField}] (${el.id})`);
          }
          return el;
        });
        
        console.log('📊 [列表页] 注入素材完成:', {
          templateId: template.id,
          totalElements: template.elements.length,
          injectedCount: Object.keys(injectionMetadata).length,
          assetCount: Object.keys(assets).length,
          storageSize: JSON.stringify(injectionMetadata).length
        });
        
        // 只存储元数据（ID -> 值的映射），而不是完整的元素对象
        try {
          sessionStorage.setItem(`temp_elements_${template.id}`, JSON.stringify(injectionMetadata));
        } catch (err) {
          if ((err as any).name === 'QuotaExceededError') {
            console.error('❌ sessionStorage 已满。尝试清理旧数据...');
            // 清理所有旧的 temp_elements_* 键
            for (let i = 0; i < sessionStorage.length; i++) {
              const key = sessionStorage.key(i);
              if (key?.startsWith('temp_elements_') && key !== `temp_elements_${template.id}`) {
                sessionStorage.removeItem(key);
              }
            }
            // 重试
            try {
              sessionStorage.setItem(`temp_elements_${template.id}`, JSON.stringify(injectionMetadata));
            } catch (retryErr) {
              console.error('❌ 清理后仍无法保存数据，直接导航（编辑器会使用 pendingAssets）', retryErr);
              // 不保存，直接导航。编辑器会使用 pendingAssets 进行注入
            }
          } else {
            throw err;
          }
        }
      }
    }
    router.push(`/lottie-templates/${template.id}`);
  };

  const fetchTemplates = () => {
    setLoading(true);
    fetch('/api/lottie/templates')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setTemplates(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/lottie/templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('模板已删除');
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-5xl font-bold mb-4">Lottie 动效模板</h1>
            <p className="text-gray-400 text-lg font-light">海量动态素材，一键注入 AI 生成内容。</p>
          </div>
          <Link href="/lottie-templates/upload">
            <Button className="rounded-full px-6 bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(124,58,237,0.3)]">
              <PlusCircle className="mr-2 h-4 w-4" /> 上传模板
            </Button>
          </Link>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-8 glass-card border-destructive/20 rounded-[32px]">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-500 animate-pulse text-lg">加载中...</div>
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
                      <PlayCircle className="h-16 w-16 text-white/5 group-hover:scale-110 transition-transform duration-700" />
                    )}
                    <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full shadow-lg">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-card border-white/10 rounded-[32px]">
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除?</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-400">此操作无法撤销，该动效模板将被永久移除。</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-full border-white/10">取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(template.id)} className="bg-destructive text-white rounded-full">确认删除</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="p-8 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold group-hover:text-primary transition-colors truncate mb-4">
                      {template.name}
                    </h3>
                    
                    <div className="space-y-2 mb-8">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-light">可编辑元素</span>
                        <span className="text-gray-300">{template.elements?.filter((e: any) => e.isEditable).length || 0} Elements</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-white/5">
                      <Button 
                        className="w-full rounded-full font-bold py-6 shadow-lg transition-all active:scale-95" 
                        variant={isFromGenerator ? "default" : "secondary"}
                        onClick={() => handleUseTemplate(template)}
                      >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        {isFromGenerator ? "注入素材并制作" : "进入编辑"}
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
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