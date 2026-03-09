
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { LottiePlayer } from '@/components/lottie/LottiePlayer';
import { ElementConfigurator } from '@/components/lottie/ElementConfigurator';
import { parseLottie, EditableElement } from '@/lib/lottie-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [animationData, setAnimationData] = useState<any>(null);
  const [elements, setElements] = useState<EditableElement[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [triggerKeyword, setTriggerKeyword] = useState('');
  const [layout, setLayout] = useState('center');
  const [originalTextSequence, setOriginalTextSequence] = useState('');
  const [uploading, setUploading] = useState(false);
  const [customCover, setCustomCover] = useState<File | null>(null);
  const lottieRef = useRef<any>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setTemplateName(selectedFile.name.replace('.json', ''));
      
      // Read and parse locally for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          setAnimationData(json);
          const parsedElements = parseLottie(json);
          setElements(parsedElements);
        } catch (err) {
          toast.error('无效的 Lottie JSON 文件');
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleSave = async () => {
    if (!file || !animationData) return;
    
    // ⚠️ 验证与自动修正：检查是否有"可编辑但未打标签"的元素
    // 如果有，自动将其 isEditable 设为 false，仅作为默认值替换保存
    const elementsToSave = elements.map(el => {
      if (el.isEditable && !el.cozeField) {
        return { ...el, isEditable: false };
      }
      return el;
    });

    const autoFixedCount = elements.filter(el => el.isEditable && !el.cozeField).length;
    if (autoFixedCount > 0) {
      toast.info(`已自动取消 ${autoFixedCount} 个未绑定字段元素的"可编辑"状态，仅保存替换内容。`);
    }
    
    setUploading(true);
    
    try {
      // 0. 生成预览图 (如果可能)
      let previewUrl = '';
      
      // 优先使用用户上传的封面
      if (customCover) {
        const coverFormData = new FormData();
        coverFormData.append('file', customCover);
        try {
          const coverRes = await fetch('/api/assets/upload', {
            method: 'POST',
            body: coverFormData,
          });
          if (coverRes.ok) {
            const coverData = await coverRes.json();
            previewUrl = coverData.url;
            console.log('📸 [上传] 使用自定义封面:', previewUrl);
          }
        } catch (e) {
          console.error('⚠️ [上传] 自定义封面上传失败:', e);
        }
      }
      
      // 如果没有自定义封面，尝试自动截图
      if (!previewUrl && lottieRef.current?.animationItem?.renderer?.svgElement) {
        try {
          const svgElement = lottieRef.current.animationItem.renderer.svgElement;
          const svgString = new XMLSerializer().serializeToString(svgElement);
          const canvas = document.createElement('canvas');
          // 使用 SVG 的 viewBox 或默认尺寸
          const viewBox = svgElement.viewBox.baseVal;
          canvas.width = viewBox ? viewBox.width : 1500;
          canvas.height = viewBox ? viewBox.height : 900;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            const img = new Image();
            // 处理 SVG 中的特殊字符
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = url;
            });
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            
            // 转换为 Blob 并上传
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
              const previewFormData = new FormData();
              previewFormData.append('file', blob, 'preview.png');
              const previewRes = await fetch('/api/assets/upload', {
                method: 'POST',
                body: previewFormData,
              });
              if (previewRes.ok) {
                const previewData = await previewRes.json();
                previewUrl = previewData.url;
                console.log('📸 [上传] 预览图生成成功:', previewUrl);
              }
            }
          }
        } catch (e) {
          console.error('⚠️ [上传] 预览图生成失败:', e);
        }
      }

      // 1. Upload file
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await fetch('/api/lottie/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      
      // 2. Save template metadata
      const sequenceArray = originalTextSequence.split(/[,，]/).map(s => s.trim()).filter(Boolean);
      
      // 验证 elements 完整性
      const validElements = elementsToSave.filter(el => el && el.id);
      
      // 检查是否有多个元素使用相同的 cozeField
      const cozeFieldMap = new Map<string, string[]>();
      validElements.forEach((el: any) => {
        if (el.isEditable && el.cozeField) {
          if (!cozeFieldMap.has(el.cozeField)) {
            cozeFieldMap.set(el.cozeField, []);
          }
          cozeFieldMap.get(el.cozeField)!.push(el.id);
        }
      });
      
      const duplicateCozeFields = Array.from(cozeFieldMap.entries())
        .filter(([_, ids]) => ids.length > 1);
      
      if (duplicateCozeFields.length > 0) {
        const warningMsg = duplicateCozeFields
          .map(([field, ids]) => `${field}: ${ids.length} 个元素`)
          .join('; ');
        console.warn('⚠️ [上传] 警告：检测到多个元素使用相同的 Coze 字段:', warningMsg);
        toast.warning(`注意：检测到 ${duplicateCozeFields.length} 个重复的 Coze 字段绑定。在生成动效时，这些元素会被替换为相同内容。`);
      }
      
      console.log('📊 [上传] 验证元素:', {
        totalElements: elements.length,
        validElements: validElements.length,
        editableCount: validElements.filter(e => e.isEditable).length,
        imageCount: validElements.filter(e => e.type === 'image').length,
        textCount: validElements.filter(e => e.type === 'text').length,
        missingCurrentValue: validElements.filter(e => !e.currentValue).length,
        duplicateCozeFieldsCount: duplicateCozeFields.length
      });
      
      // 将语序注入到 Lottie JSON 中，以便后续处理函数能获取到
      const enrichedAnimationData = {
        ...animationData,
        originalTextSequence: sequenceArray
      };

      const payload = {
        name: templateName,
        layout,
        triggerKeyword,
        originalTextSequence: sequenceArray,
        filePath: uploadData.filePath,
        originalData: enrichedAnimationData,
        elements: validElements,
        previewUrl, // 添加预览图
      };
      
      console.log('💾 [上传] 发送保存请求，元素数:', validElements.length);

      const templateRes = await fetch('/api/lottie/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!templateRes.ok) throw new Error('Save failed');
      
      const savedTemplate = await templateRes.json();
      console.log('✅ [上传] 模板保存成功，ID:', savedTemplate.id, '元素数:', savedTemplate.elements?.length);
      
      toast.success('模板保存成功');
      router.push('/lottie-templates');
    } catch (error) {
      console.error(error);
      toast.error('保存失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-6">
        <Link href="/lottie-templates" className="text-sm text-muted-foreground hover:text-primary flex items-center">
          <ArrowLeft className="mr-1 h-4 w-4" /> 返回列表
        </Link>
        <h1 className="text-3xl font-bold mt-2">上传 Lottie 模板</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Upload & Preview */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="lottie-file">选择 Lottie JSON 文件</Label>
                  <Input id="lottie-file" type="file" accept=".json" onChange={handleFileChange} />
                </div>
                
                {animationData && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="template-name">模板名称</Label>
                      <Input 
                        id="template-name" 
                        value={templateName} 
                        onChange={(e) => setTemplateName(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-layout">构图模式</Label>
                      <Select value={layout} onValueChange={setLayout}>
                        <SelectTrigger id="template-layout">
                          <SelectValue placeholder="选择构图模式" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="center">居中构图</SelectItem>
                          <SelectItem value="top-bottom">上下构图</SelectItem>
                          <SelectItem value="left-right">左右构图</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trigger-keyword">触发关键词 (可选)</Label>
                      <Input 
                        id="trigger-keyword" 
                        value={triggerKeyword} 
                        onChange={(e) => setTriggerKeyword(e.target.value)} 
                        placeholder="例如: one, 双11, 促销"
                      />
                      <p className="text-xs text-muted-foreground">
                        当用户输入的提示词包含此关键词时，将自动选择此模板。
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="text-sequence">原文文字顺序 (必填)</Label>
                      <Input 
                        id="text-sequence" 
                        value={originalTextSequence} 
                        onChange={(e) => setOriginalTextSequence(e.target.value)} 
                        placeholder="例如: 美团, 双, 11, 神券, 必膨"
                      />
                      <p className="text-xs text-muted-foreground">
                        请按视觉顺序输入模板原本的文字，用逗号分隔。系统将按此顺序替换新文案。
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom-cover">封面图 (可选)</Label>
                      <Input 
                        id="custom-cover" 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => setCustomCover(e.target.files?.[0] || null)} 
                      />
                      <p className="text-xs text-muted-foreground">
                        如果不上传，系统将自动截取 Lottie 动画的第一帧作为封面。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {animationData && (
            <Card className="overflow-hidden">
              <div className="p-6 bg-muted/10 flex justify-center items-center min-h-[300px]">
                <LottiePlayer 
                  animationData={animationData} 
                  editableElements={elements} 
                  className="w-full max-w-[500px]"
                  onRef={lottieRef}
                />
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Configuration */}
        <div className="lg:col-span-1">
          {animationData ? (
            <div className="space-y-6">
              <ElementConfigurator elements={elements} onUpdate={setElements} />
              
              <Button onClick={handleSave} disabled={uploading} className="w-full" size="lg">
                {uploading ? '保存中...' : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> 保存模板
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
              请先上传文件以配置
            </div>
          )}
        </div>
      </div>
    </div>
  );
}