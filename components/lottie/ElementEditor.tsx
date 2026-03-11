'use client';

import { Slider } from '@/components/ui/slider';
import { EditableElement, calculateEffectiveArea, adjustImageSaturation } from '@/lib/lottie-utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link as LinkIcon, Wand2, Loader2, Upload, Palette, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

interface ElementEditorProps {
  elements: EditableElement[];
  onUpdate: (elements: EditableElement[]) => void;
}

// 默认颜色预设
const DEFAULT_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', 
  '#FFFF00', '#00FFFF', '#FF00FF', '#C0C0C0', '#808080'
];

// 轮询 AI 生成结果 - 使用 coze-canvas 接口
const getLocalPlaceholderImage = (prompt: string = ''): string => {
  // 返回本地占位图（已移除外部 AI 生成调用）
  const promptLower = prompt.toLowerCase();
  
  if (promptLower.includes('食品') || promptLower.includes('food')) {
    return 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80';
  }
  
  return 'https://images.unsplash.com/photo-1465146072230-91cabc968266?w=800&q=80';
};

export function ElementEditor({ elements, onUpdate }: ElementEditorProps) {
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [subjectMode, setSubjectMode] = useState<Record<string, 'generate' | 'upload'>>({});
  const [subjectPrompt, setSubjectPrompt] = useState<Record<string, string>>({});
  const [uploadedSubject, setUploadedSubject] = useState<Record<string, string | null>>({});
  const [colorPresets, setColorPresets] = useState<string[]>([]);
  // 新增：记录文本选区状态 { elementId: { start, end } }
  const [textSelections, setTextSelections] = useState<Record<string, { start: number; end: number }>>({});

  // 加载预设
  useEffect(() => {
    const saved = localStorage.getItem('user_color_presets');
    if (saved) {
      try {
        setColorPresets(JSON.parse(saved));
      } catch (e) {
        setColorPresets(DEFAULT_COLORS);
      }
    } else {
      setColorPresets(DEFAULT_COLORS);
    }
  }, []);

  // 保存预设
  const savePreset = (color: string) => {
    if (!color || !color.startsWith('#')) return;
    if (!colorPresets.includes(color)) {
      const newPresets = [...colorPresets, color];
      setColorPresets(newPresets);
      localStorage.setItem('user_color_presets', JSON.stringify(newPresets));
      toast.success('颜色已保存到预设');
    }
  };
  
  // 删除预设
  const removePreset = (color: string, e: React.MouseEvent) => {
     e.stopPropagation();
     const newPresets = colorPresets.filter(c => c !== color);
     setColorPresets(newPresets);
     localStorage.setItem('user_color_presets', JSON.stringify(newPresets));
  };

  // 处理颜色变更
  const handleColorChange = (id: string, color: string) => {
    const newElements = elements.map(el => 
      el.id === id ? { ...el, color: color } : el
    );
    onUpdate(newElements);
  };

  // 处理富文本颜色变更
  const handleRichTextColorChange = (id: string, color: string) => {
    const element = elements.find(el => el.id === id);
    if (!element) return;

    // 优先使用记录的选区状态，如果不存在则尝试获取 DOM（兜底）
    let start = 0;
    let end = 0;
    
    if (textSelections[id]) {
      start = textSelections[id].start;
      end = textSelections[id].end;
    } else {
      const textarea = document.getElementById(`textarea-${id}`) as HTMLTextAreaElement;
      if (textarea) {
        start = textarea.selectionStart;
        end = textarea.selectionEnd;
      }
    }

    console.log(`🎨 [ColorChange] ID:${id} Range:[${start}, ${end}] Color:${color}`);

    if (start === end) {
      // 如果没有选中文字，则修改全局颜色
      handleColorChange(id, color);
      return;
    }

    // 构建新的样式对象
    const currentStyles = element.richText?.styles || [];
    const newStyle = { start, end, color };
    
    // 简单的样式合并逻辑
    const newStyles = [...currentStyles, newStyle];

    const newElements = elements.map(el => 
      el.id === id ? { 
        ...el, 
        richText: {
          text: el.currentValue,
          styles: newStyles
        }
      } : el
    );
    onUpdate(newElements);
    toast.success('局部颜色已应用');
  };

  // 更新选区状态的辅助函数
  const updateSelection = (id: string, e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    setTextSelections(prev => ({
      ...prev,
      [id]: { start: target.selectionStart, end: target.selectionEnd }
    }));
  };

  // 识别所有主体元素
  const subjectElements = elements.filter(el => 
    el.isEditable && el.type === 'image' && el.cozeField && 
    (el.cozeField.includes('主体') || el.cozeField.includes('main'))
  );

  const handleChange = (id: string, value: string) => {
    const targetElement = elements.find(el => el.id === id);
    const groupId = targetElement?.groupId;

    const newElements = elements.map(el => {
      if (el.id === id || (groupId && el.groupId === groupId)) {
        return JSON.parse(JSON.stringify({ 
          ...el, 
          currentValue: value,
          // 如果是图片，更新原始来源，以便后续缩放使用
          originalSourceUrl: el.type === 'image' ? value : el.originalSourceUrl 
        }));
      }
      return el;
    });
    onUpdate(newElements);
  };

  const handleScaleChange = async (id: string, newScale: number) => {
    // 核心修改：仅更新 scale 属性，不修改图片数据
    // 缩放逻辑已移至 lib/lottie-utils.ts 的 updateLottieData 中处理
    const newElements = elements.map(el => 
      el.id === id ? { 
        ...el, 
        scale: newScale
      } : el
    );
    onUpdate(newElements);
  };

  const processImageUpdate = async (id: string, imageSrc: string) => {
    const element = elements.find(el => el.id === id);
    
    if (element) {
      // 补救措施：如果原图有效面积缺失，尝试现场计算
      let originalEffectiveArea = element.originalEffectiveArea;
      if (!originalEffectiveArea && element.originalValue) {
        console.log(`⚠️ [${id}] 缺失原图面积数据，尝试现场计算...`);
        originalEffectiveArea = await calculateEffectiveArea(element.originalValue);
        console.log(`   ✅ 补救成功: ${originalEffectiveArea}`);
      }

      // 如果是 Coze 返回的图片（即有 cozeField），先增加饱和度
      let processedImageSrc = imageSrc;
      if (element.cozeField) {
        console.log(`🎨 [${id}] 检测到 Coze 图片，准备增加饱和度...`);
        processedImageSrc = await adjustImageSaturation(imageSrc, 30);
      }

      // 计算新图片的有效面积
      const effectiveArea = await calculateEffectiveArea(processedImageSrc);
      
      // 获取新图片尺寸
      const img = new Image();
      img.onload = () => {
         const newElements = elements.map(el => 
            el.id === id ? { 
              ...el, 
              currentValue: processedImageSrc,
              originalSourceUrl: processedImageSrc,
              width: img.width, // 更新为新图片尺寸
              height: img.height,
              scale: 1.0, // 重置缩放
              effectiveArea: effectiveArea, // 保存有效面积
              originalEffectiveArea: originalEffectiveArea // 更新补救后的原图面积
            } : el
          );
          onUpdate(newElements);
      };
      img.src = processedImageSrc;
    } else {
      handleChange(id, imageSrc);
    }
  };

  const handleImageUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        const rawImageSrc = e.target.result as string;
        await processImageUpdate(id, rawImageSrc);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = async (id: string) => {
    const url = urlInputs[id];
    if (!url) return;

    // 尝试通过代理加载图片以解决跨域问题
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    
    try {
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('Failed to fetch image');
      const blob = await res.blob();
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          await processImageUpdate(id, reader.result);
          // 清空输入框
          setUrlInputs(prev => ({ ...prev, [id]: '' }));
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error loading image from URL:', error);
      // 如果代理失败，尝试直接使用 URL (可能支持跨域)
      await processImageUpdate(id, url);
    }
  };

  // 处理主体生成或上传
  const handleSubjectApply = async (id: string) => {
    setGeneratingId(id);
    try {
      let newImageSrc = '';
      
      // 获取当前元素
      const element = elements.find(el => el.id === id);
      const useAgent = element?.useAgentSubject; // 改为检查 useAgentSubject 字段
      const agentId = element?.agentId;

      if (subjectMode[id] === 'upload') {
        if (!uploadedSubject[id]) {
          toast.error('请先上传图片');
          setGeneratingId(null);
          return;
        }
        newImageSrc = uploadedSubject[id]!;
        console.log(`📤 [handleSubjectApply] 上传模式，新图片=${newImageSrc.slice(0, 50)}...`);
      } else {
        // AI 生成模式
        if (!subjectPrompt[id]) {
          toast.error('请输入生成文案');
          setGeneratingId(null);
          return;
        }
        
        toast.info(useAgent ? 'Agent 正在生成图片，请稍候...' : 'API 正在生成图片，请稍候...');
        
        // 本地模式 - 使用占位图（已移除所有外部 API 调用）
        toast.info('使用本地图片库中的占位图...');
        newImageSrc = getLocalPlaceholderImage(subjectPrompt[id]);
        toast.success('已加载本地图片！');
      }

      // 应用生成的图片到元素
      await processImageUpdate(id, newImageSrc);
      
      // 清空状态
      setUploadedSubject(prev => ({ ...prev, [id]: null }));
      setSubjectPrompt(prev => ({ ...prev, [id]: '' }));
    } catch (error) {
      console.error('❌ 主体生成失败:', error);
      toast.error(error instanceof Error ? error.message : '主体生成失败');
    } finally {
      setGeneratingId(null);
    }
  };

  const editableElements = elements.filter(el => el.isEditable);

  return (
    <Card>
      <CardHeader>
        <CardTitle>编辑内容</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {editableElements.length === 0 && <p className="text-muted-foreground">此模板没有可编辑的内容</p>}
        {editableElements.map((el) => (
          <div key={el.id} className="space-y-2">
            <Label className="font-medium">{el.name}</Label>
            
            {el.type === 'text' ? (
              <div className="space-y-3">
                <div className="relative">
                  <Textarea 
                    id={`textarea-${el.id}`}
                    value={el.currentValue} 
                    onChange={(e) => handleChange(el.id, e.target.value)}
                    onSelect={(e) => updateSelection(el.id, e)}
                    onKeyUp={(e) => updateSelection(el.id, e)}
                    onMouseUp={(e) => updateSelection(el.id, e)}
                    rows={3}
                    className="resize-none font-mono"
                  />
                  <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground bg-background/80 px-1 rounded">
                    选中文字可局部改色
                  </div>
                </div>
                
                {/* 颜色选择器 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">文字颜色</Label>
                    <span className="text-xs font-mono text-muted-foreground">{el.color || '#000000'}</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input 
                        type="color" 
                        value={el.color || '#000000'} 
                        onChange={(e) => handleRichTextColorChange(el.id, e.target.value)}
                        className="h-9 w-full p-1 cursor-pointer" 
                      />
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9" title="颜色预设">
                          <Palette className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">颜色预设</h4>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 px-2 text-xs"
                              onClick={() => savePreset(el.color || '#000000')}
                            >
                              <Plus className="h-3 w-3 mr-1" /> 保存当前
                            </Button>
                          </div>
                          <div className="grid grid-cols-6 gap-2">
                            {colorPresets.map((color) => (
                              <div 
                                key={color}
                                className="group relative w-8 h-8 rounded-full border cursor-pointer hover:scale-110 transition-transform"
                                style={{ backgroundColor: color }}
                                onClick={() => handleRichTextColorChange(el.id, color)}
                                title={color}
                              >
                                <div 
                                  className="absolute -top-1 -right-1 hidden group-hover:flex bg-destructive text-destructive-foreground rounded-full w-4 h-4 items-center justify-center shadow-sm"
                                  onClick={(e) => removePreset(color, e)}
                                >
                                  <Trash2 className="h-2 w-2" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 主体图片特殊处理 */}
                {subjectElements.some(se => se.id === el.id) ? (
                  <>
                    {/* 生成或上传选项卡 */}
                    <Tabs value={subjectMode[el.id] || 'generate'} onValueChange={(v: any) => setSubjectMode(prev => ({ ...prev, [el.id]: v }))} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="generate">AI 生成</TabsTrigger>
                        <TabsTrigger value="upload">手动上传</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="generate" className="space-y-2 mt-2">
                        <Label className="text-xs">生成描述</Label>
                        <Textarea
                          placeholder="例如：一个美味的汉堡，高清摄影..."
                          value={subjectPrompt[el.id] || ''}
                          onChange={(e) => setSubjectPrompt(prev => ({ ...prev, [el.id]: e.target.value }))}
                          rows={3}
                          className="resize-none"
                        />
                      </TabsContent>
                      
                      <TabsContent value="upload" className="space-y-2 mt-2">
                        <Input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setUploadedSubject(prev => ({ ...prev, [el.id]: event.target?.result as string }));
                                }
                              };
                              reader.readAsDataURL(e.target.files[0]);
                            }
                          }}
                        />
                      </TabsContent>
                    </Tabs>

                    {/* 图片预览 */}
                    <div className="border rounded-md p-2 bg-muted/20 flex justify-center min-h-32">
                      {el.currentValue && el.currentValue.startsWith('data:image') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={el.currentValue} 
                          alt={el.name} 
                          className="max-h-32 object-contain" 
                          onError={(e) => {
                            console.error(`图片加载失败: ${el.id}`);
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-sm text-muted-foreground">
                          <div>❌ 图片数据无效</div>
                          <div className="text-xs mt-1">类型: {typeof el.currentValue}</div>
                        </div>
                      )}
                    </div>

                    {/* 生成/应用按钮 */}
                    <Button
                      className="w-full"
                      onClick={() => handleSubjectApply(el.id)}
                      disabled={generatingId === el.id}
                    >
                      {generatingId === el.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          正在处理...
                        </>
                      ) : subjectMode[el.id] === 'generate' ? (
                        <>
                          <Wand2 className="mr-2 h-4 w-4" />
                          生成并应用
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          应用图片
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  // 非主体元素的标准处理
                  <>
                    <div className="border rounded-md p-2 bg-muted/20 flex justify-center min-h-32">
                      {el.currentValue && el.currentValue.startsWith('data:image') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={el.currentValue} 
                          alt={el.name} 
                          className="max-h-32 object-contain" 
                          onError={(e) => {
                            console.error(`图片加载失败: ${el.id}`);
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-sm text-muted-foreground">
                          <div>❌ 图片数据无效</div>
                          <div className="text-xs mt-1">类型: {typeof el.currentValue}</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 py-2">
                      <span className="text-xs text-gray-500 w-8">缩放</span>
                      <Slider 
                        value={[(el.scale || 1) * 100]} 
                        min={10} 
                        max={300} 
                        step={10}
                        onValueChange={([v]) => handleScaleChange(el.id, v / 100)} 
                        className="flex-1" 
                      />
                      <span className="text-xs text-gray-500 w-8 text-right">{Math.round((el.scale || 1) * 100)}%</span>
                    </div>

                    <div className="space-y-2">
                      <Input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleImageUpload(el.id, e.target.files[0]);
                          }
                        }}
                      />
                      
                      <div className="flex gap-2">
                        <Input 
                          placeholder="或输入图片链接..." 
                          value={urlInputs[el.id] || ''}
                          onChange={(e) => setUrlInputs(prev => ({ ...prev, [el.id]: e.target.value }))}
                          className="text-xs"
                        />
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUrlSubmit(el.id)}
                          disabled={!urlInputs[el.id]}
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}