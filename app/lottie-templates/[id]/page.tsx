'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LottiePlayer } from '@/components/lottie/LottiePlayer';
import { ElementEditor } from '@/components/lottie/ElementEditor';
import { EditableElement, calculateEffectiveArea, adjustImageSaturation, updateLottieData } from '@/lib/lottie-utils';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { getAiAsset } from '../page'; // 统一使用动效模板页的匹配逻辑
import { LoadingOverlay } from '@/components/LoadingOverlay';

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [template, setTemplate] = useState<any>(null);
  const [elements, setElements] = useState<EditableElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingLottie, setIsGeneratingLottie] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const lottieRef = useRef<any>(null);

  useEffect(() => {
    if (params.id) {
      // 检查是否来自生成器，如果是，则显示生成动画
      const isFromGenerator = searchParams.get('from') === 'generator';
      if (isFromGenerator) {
        setIsGeneratingLottie(true);
        // 2秒后关闭动画
        setTimeout(() => {
          setIsGeneratingLottie(false);
        }, 2000);
      }

      fetch(`/api/lottie/templates/${params.id}`)
        .then(res => {
          if (!res.ok) throw new Error('Not found');
          return res.json();
        })
        .then(async (data) => {
          setTemplate(data);
          
          // 检查当前模式：是否来自生成器（通过 URL 参数 from=generator）
          // 注意：即使有 pendingAssets，也要检查 URL 参数，避免误判
          const isFromGenerator = searchParams.get('from') === 'generator' && sessionStorage.getItem('pendingAssets') !== null;
          
          // 详细的数据检查
          const imageElements = data.elements?.filter((e: any) => e.type === 'image') || [];
          const imageElementIds = imageElements.map((e: any) => e.id);
          const duplicateImageIds = imageElementIds.filter((id: string, index: number) => imageElementIds.indexOf(id) !== index);
          
          console.log('📥 [编辑器] 加载模板:', {
            templateId: data.id,
            templateName: data.name,
            totalElements: data.elements?.length || 0,
            editableCount: data.elements?.filter((e: any) => e.isEditable)?.length || 0,
            imageCount: imageElements.length,
            duplicateImageIds: duplicateImageIds.length > 0 ? duplicateImageIds : 'none',
            isFromGenerator: isFromGenerator,
            mode: isFromGenerator ? '🎨 生成模式（临时编辑）' : '✏️ 编辑模式（保存模板）',
            sampleImageCurrentValues: imageElements.slice(0, 5).map((e: any) => ({
              id: e.id,
              currentValueStart: e.currentValue?.substring(0, 50) || 'EMPTY'
            }))
          });
          
          let initialElements = data.elements;
          let isTemporaryEdit = false;

          // 1. 优先检查：是否有来自列表页的临时注入配置
          const tempElementsStr = sessionStorage.getItem(`temp_elements_${params.id}`);
          if (tempElementsStr) {
            console.log('🔄 [编辑器] 使用 sessionStorage 中的临时元素配置');
            try {
              const injectionMetadata = JSON.parse(tempElementsStr);
              
              // 检查是否是新格式（ID -> 值的映射）或旧格式（完整元素对象数组）
              const isNewFormat = !Array.isArray(injectionMetadata) && typeof injectionMetadata === 'object';
              
              if (isNewFormat) {
                // 新格式：ID -> 值的映射
                console.log('✅ [编辑器] 检测到新格式的注入元数据（ID -> 值映射）');
                initialElements = data.elements.map((el: any) => {
                  if (injectionMetadata[el.id] !== undefined) {
                    return { ...el, currentValue: injectionMetadata[el.id] };
                  }
                  return el;
                });
              } else {
                // 旧格式：直接使用完整元素对象数组
                console.log('⚠️ [编辑器] 检测到旧格式的注入数据（完整元素对象）');
                initialElements = injectionMetadata;
              }
              
              isTemporaryEdit = true;
              
              // 诊断：检查注入后的元素
              const injectedImageElements = initialElements.filter((e: any) => e.type === 'image' && e.isEditable);
              const sampleInjectedValues = injectedImageElements.slice(0, 3).map((e: any) => ({
                id: e.id,
                cozeField: e.cozeField,
                currentValueStart: e.currentValue?.substring(0, 50) || 'EMPTY'
              }));
              console.log('📸 [编辑器] 临时注入的图片元素:', {
                totalInjected: injectedImageElements.length,
                samples: sampleInjectedValues
              });
            } catch (err) {
              console.error('❌ [编辑器] 解析临时注入数据失败:', err);
            }
            
            sessionStorage.removeItem(`temp_elements_${params.id}`);
          } 
          // 2. 其次：如果有 pendingAssets，进行素材注入（生成模式）
          else if (isFromGenerator) {
            console.log('💉 [编辑器] 生成模式：检测到 pendingAssets，执行素材注入...');
            const pendingAssetsStr = sessionStorage.getItem('pendingAssets');
            if (pendingAssetsStr) {
              const assets = JSON.parse(pendingAssetsStr);
              
              // 📦 显示临时仓库的完整内容
              console.group('📦 [临时仓库] 当前对话的素材库');
              console.table(Object.entries(assets).map(([key, value]) => ({
                'Coze字段': key,
                '类型': typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:image')) ? '图片' : '文字',
                '内容': typeof value === 'string' ? (value.startsWith('http') ? value.substring(0, 60) + '...' : value) : value
              })));
              console.groupEnd();
              
              // 检查重复的 cozeField
              const cozeFieldCount = new Map<string, number>();
              data.elements.forEach((el: EditableElement) => {
                if (el.isEditable && el.cozeField) {
                  cozeFieldCount.set(el.cozeField, (cozeFieldCount.get(el.cozeField) || 0) + 1);
                }
              });
              const duplicateFields = Array.from(cozeFieldCount.entries())
                .filter(([_, count]) => count > 1)
                .map(([field, count]) => `${field}(x${count})`);
              if (duplicateFields.length > 0) {
                console.warn('⚠️ 检测到多个元素使用相同 cozeField，它们将被同步更新:', duplicateFields);
              }
              
              // 显示注入细节
              console.group('💉 [素材匹配] 模板图层与临时仓库的匹配关系');
              const injectionLog: any[] = [];
              initialElements = data.elements.map((el: EditableElement) => {
                let aiValue = getAiAsset(el.cozeField || '', assets, el.type);
                if (el.isEditable && el.cozeField && aiValue) {
                  injectionLog.push({
                    '模板图层': el.name || el.id,
                    'Coze标签': el.cozeField,
                    '匹配结果': typeof aiValue === 'string' && aiValue.startsWith('http') ? aiValue.substring(0, 60) + '...' : aiValue
                  });
                  console.log(`  ✅ [${el.cozeField}] -> 注入成功`);
                  return { ...el, currentValue: aiValue };
                } else if (el.isEditable && el.cozeField) {
                  injectionLog.push({
                    '模板图层': el.name || el.id,
                    'Coze标签': el.cozeField,
                    '匹配结果': '❌ 未找到匹配'
                  });
                }
                return el;
              });
              console.table(injectionLog);
              console.groupEnd();
              
              isTemporaryEdit = true;
            }
          }
          // 3. 否则：使用原始保存的配置（直接编辑模式）
          else {
            console.log('✏️ [编辑器] 编辑模式：使用原始保存的模板配置，不修改任何数据');
          }

          console.log('✅ [编辑器] 元素准备完成:', {
            totalElements: initialElements?.length || 0,
            imageElements: initialElements?.filter((e: any) => e.type === 'image')?.length || 0,
            textElements: initialElements?.filter((e: any) => e.type === 'text')?.length || 0,
            editableElements: initialElements?.filter((e: any) => e.isEditable)?.length || 0,
            isTemporaryEdit: isTemporaryEdit
          });
          
          // 4. 仅在需要时执行 Base64 转换（生成模式下注入的素材）
          if (isTemporaryEdit) {
            console.log('🚀 [编辑器] 对临时素材执行 Base64 转换...');
            const processed = await Promise.all(initialElements.map(async (el: any) => {
              try {
                if (!el.currentValue) {
                  console.warn(`⚠️ 元素 ${el.id} 缺少 currentValue`);
                  return { ...el, currentValue: el.originalValue || '' };
                }
                
                // 如果已是 Base64，直接返回
                if (el.type === 'image' && el.currentValue.startsWith('data:image')) {
                  // 补充计算有效面积
                  if (!el.effectiveArea) {
                    el.effectiveArea = await calculateEffectiveArea(el.currentValue);
                  }
                  // 补充计算原图有效面积 (如果还没有)
                  if (!el.originalEffectiveArea && el.originalValue) {
                    el.originalEffectiveArea = await calculateEffectiveArea(el.originalValue);
                  }
                  return el;
                }
                
                // 转换 HTTP URL 为 Base64 (并执行 Contain 适配)
                if (el.type === 'image' && (el.currentValue.startsWith('http') || el.currentValue.startsWith('/api/proxy'))) {
                  try {
                    const proxyUrl = el.currentValue.startsWith('http') 
                      ? `/api/proxy-image?url=${encodeURIComponent(el.currentValue)}`
                      : el.currentValue;
                    
                    const res = await fetch(proxyUrl);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    
                    const blob = await res.blob();
                    
                    // 使用 Canvas 进行图片处理：保持比例、居中、不裁剪 (Contain)
                    return new Promise((resolve) => {
                      const img = new Image();
                      img.onload = async () => {
                        // 核心修改：不再强制缩放到原尺寸，而是使用新图片尺寸
                        // 这样 updateLottieData 可以根据新旧尺寸计算缩放比例
                        const newW = img.width;
                        const newH = img.height;
                        
                        const canvas = document.createElement('canvas');
                        canvas.width = newW;
                        canvas.height = newH;
                        const ctx = canvas.getContext('2d');
                        
                        if (ctx) {
                          // 绘制图片 (原样绘制)
                          ctx.drawImage(img, 0, 0);
                          
                          let dataUrl = canvas.toDataURL('image/png');
                          
                          // 🎨 如果是 Coze 返回的图片，增加饱和度
                          if (isTemporaryEdit && el.cozeField) {
                            console.log(`🎨 [${el.id}] 检测到 Coze 图片，准备增加饱和度...`);
                            dataUrl = await adjustImageSaturation(dataUrl, 30);
                          }
                          
                          // 计算新图有效面积
                          const effectiveArea = await calculateEffectiveArea(dataUrl);
                          // 计算原图有效面积 (如果还没有)
                          let originalEffectiveArea = el.originalEffectiveArea;
                          if (!originalEffectiveArea && el.originalValue) {
                             originalEffectiveArea = await calculateEffectiveArea(el.originalValue);
                          }

                          console.log(`🖼️ [图片适配] ${el.id}: 原图${img.width}x${img.height} -> 新尺寸${newW}x${newH} (保持原样)`);
                          resolve({ 
                            ...el, 
                            currentValue: dataUrl,
                            width: newW,
                            height: newH,
                            effectiveArea,
                            originalEffectiveArea
                          });
                        } else {
                          console.warn(`⚠️ Canvas Context 获取失败: ${el.id}`);
                          // 降级处理：直接转 Base64
                          const reader = new FileReader();
                          reader.onloadend = () => {
                             if (typeof reader.result === 'string') resolve({ ...el, currentValue: reader.result });
                             else resolve(el);
                          };
                          reader.readAsDataURL(blob);
                        }
                      };
                      
                      img.onerror = () => {
                        console.error(`❌ 图片对象加载失败: ${el.id}`);
                        resolve(el);
                      };
                      
                      img.src = URL.createObjectURL(blob);
                    });
                  } catch (e) {
                    console.error(`❌ 图片处理失败: ${el.id}`, e);
                    // 即使转换失败，也返回原始 URL，让 Lottie 尝试加载
                    return el;
                  }
                }
                
                return el;
              } catch (e) {
                console.error(`❌ 处理元素失败: ${el.id}`, e);
                return el;
              }
            }));
            
            setElements(processed as any);
          } else {
            // 编辑模式：直接使用保存的配置，无需转换
            console.log('✨ [编辑器] 编辑模式：直接使用保存的模板配置');
            setElements(initialElements);
          }
          
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          toast.error('加载模板失败');
          router.push('/lottie-templates');
        });
    }
  }, [params.id, router]);

  // 获取当前的 Lottie 动画数据（包含编辑后的元素）
  const getCurrentLottieData = () => {
    if (!template?.originalData) return null;
    return updateLottieData(template.originalData, elements);
  };

  // 下载 JSON
  const downloadJSON = () => {
    try {
      const data = getCurrentLottieData();
      if (!data) {
        toast.error('没有可下载的数据');
        return;
      }

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name || 'lottie'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('JSON 下载成功');
    } catch (error) {
      console.error('下载 JSON 失败:', error);
      toast.error('JSON 下载失败');
    }
  };

  // 下载 MP4（使用 Canvas 录制）
  const downloadMP4 = async () => {
    try {
      setIsDownloading(true);
      const data = getCurrentLottieData();
      if (!data) {
        toast.error('没有可录制的内容');
        setIsDownloading(false);
        return;
      }

      // 获取 SVG 元素
      const lottieContainer = document.querySelector('.lottie-svg-renderer');
      if (!lottieContainer) {
        toast.error('找不到 Lottie 渲染器');
        setIsDownloading(false);
        return;
      }

      // 创建一个临时容器来渲染 Lottie
      const tempContainer = document.createElement('div');
      tempContainer.style.width = '1080px';
      tempContainer.style.height = '1080px';
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.background = '#000000';
      document.body.appendChild(tempContainer);

      // 创建 Canvas
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast.error('无法创建 Canvas');
        document.body.removeChild(tempContainer);
        setIsDownloading(false);
        return;
      }

      // 加载 Lottie
      const lottie = (await import('lottie-web')).default;
      const animation = lottie.loadAnimation({
        container: tempContainer,
        renderer: 'svg',
        animationData: data,
        autoplay: true,
        loop: false
      });

      // 等待动画准备完成
      await new Promise(resolve => {
        animation.addEventListener('DOMLoaded', resolve);
      });

      // 获取帧率
      const frameRate = animation.frameRate || 60;
      const totalFrames = animation.totalFrames;
      const duration = totalFrames / frameRate;

      // 使用 MediaRecorder 录制
      const stream = canvas.captureStream(frameRate);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${template.name || 'lottie'}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        animation.destroy();
        document.body.removeChild(tempContainer);
        setIsDownloading(false);
        toast.success('视频下载成功');
      };

      mediaRecorder.start();

      // 逐帧渲染
      let currentFrame = 0;
      const renderFrame = async () => {
        if (currentFrame >= totalFrames) {
          mediaRecorder.stop();
          return;
        }

        animation.goToAndStop(currentFrame, true);

        // 等待 SVG 渲染
        await new Promise(resolve => setTimeout(resolve, 16));

        // 绘制到 Canvas
        const svg = tempContainer.querySelector('svg');
        if (svg) {
          const svgData = new XMLSerializer().serializeToString(svg);
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const svgUrl = URL.createObjectURL(svgBlob);

          const img = new Image();
          img.onload = () => {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(svgUrl);
            currentFrame++;
            requestAnimationFrame(renderFrame);
          };
          img.onerror = () => {
            console.error('图片加载失败');
            currentFrame++;
            requestAnimationFrame(renderFrame);
          };
          img.src = svgUrl;
        } else {
          currentFrame++;
          requestAnimationFrame(renderFrame);
        }
      };

      renderFrame();

    } catch (error) {
      console.error('下载 MP4 失败:', error);
      toast.error('视频下载失败');
      setIsDownloading(false);
    }
  };

  if (loading) return <div className="container py-8 flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-foreground flex flex-col">
      <LoadingOverlay isVisible={isGeneratingLottie} text="正在生成动效..." />
      
      <header className="border-b border-white/5 sticky top-0 z-50 bg-[#0a0a0c]/80 backdrop-blur shrink-0">
        <div className="max-w-[1600px] mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/lottie-templates" className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold">{template.name}</h1>
              <p className="text-xs text-gray-500">动效编辑器 · 独立实例</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/5" onClick={() => toast.info('导出功能仅演示')}>
              <Download className="mr-2 h-4 w-4" /> 导出 JSON
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* 左侧：预览区 */}
        <div className="flex-1 bg-[#0f0f12] flex items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          
          <div className="relative z-10 w-full max-w-[800px] aspect-video bg-black/40 rounded-3xl border border-white/5 shadow-2xl flex items-center justify-center p-8">
            <LottiePlayer 
              animationData={template.originalData} 
              editableElements={elements}
              className="w-full h-full"
              onRef={lottieRef}
            />
          </div>

          {/* 下载按钮组 */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
            <Button
              onClick={downloadJSON}
              size="lg"
              className="bg-white/10 hover:bg-white/20 backdrop-blur border border-white/10 text-white"
              disabled={isDownloading}
            >
              <Download className="mr-2 h-4 w-4" />
              下载 JSON
            </Button>
            <Button
              onClick={downloadMP4}
              size="lg"
              className="bg-white/10 hover:bg-white/20 backdrop-blur border border-white/10 text-white"
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成视频中...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  下载 MP4
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 右侧：编辑区 */}
        <div className="w-[400px] border-l border-white/5 bg-[#0a0a0c] flex flex-col overflow-y-auto">
          <div className="p-6">
            <ElementEditor elements={elements} onUpdate={setElements} />
            
            <div className="mt-8 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <p className="text-xs text-blue-400 leading-relaxed">
                💡 提示：此处的编辑仅对当前生成的动效生效，不会修改原始模板。您可以自由替换图片或修改文案。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}