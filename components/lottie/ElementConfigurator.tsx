
'use client';

import { EditableElement } from '@/lib/lottie-utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ElementConfiguratorProps {
  elements: EditableElement[];
  onUpdate: (elements: EditableElement[]) => void;
}

export function ElementConfigurator({ elements, onUpdate }: ElementConfiguratorProps) {
  const handleToggle = (id: string, checked: boolean) => {
    const newElements = elements.map(el => {
      if (el.id === id) {
        // 确保返回的是新对象，而不是修改原对象
        return { ...JSON.parse(JSON.stringify(el)), isEditable: checked };
      }
      return el;
    });
    onUpdate(newElements);
  };

  const handleNameChange = (id: string, name: string) => {
    const newElements = elements.map(el => {
      if (el.id === id) {
        return { ...JSON.parse(JSON.stringify(el)), name };
      }
      return el;
    });
    onUpdate(newElements);
  };

  const handleCozeFieldChange = (id: string, value: string) => {
    // 检查是否有其他可编辑元素已经使用了这个 cozeField
    const otherElementsWithSameField = elements.filter(el => 
      el.id !== id && el.isEditable && el.cozeField === value && value
    );
    
    if (otherElementsWithSameField.length > 0) {
      toast.warning(`⚠️ 警告：还有 ${otherElementsWithSameField.length} 个元素已使用此标签，它们会被替换为相同内容`);
    }
    
    const newElements = elements.map(el => {
      if (el.id === id) {
        return { ...JSON.parse(JSON.stringify(el)), cozeField: value };
      }
      return el;
    });
    onUpdate(newElements);
  };

  const handleGroupIdChange = (id: string, groupId: string) => {
    const newElements = elements.map(el => {
      if (el.id === id) {
        return { ...JSON.parse(JSON.stringify(el)), groupId };
      }
      return el;
    });
    onUpdate(newElements);
  };

  const handleBatchBindText = () => {
    const newElements = elements.map(el => 
      el.type === 'text' ? { ...el, isEditable: true, cozeField: 'main_text' } : el
    );
    onUpdate(newElements);
    toast.success('已将所有文字图层绑定到“主标题”');
  };

  const handleImageUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      
      // 显示加载状态
      const toastId = toast.loading('正在处理图片...');

      try {
        // 1. 上传图片
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch('/api/assets/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!res.ok) throw new Error('Upload failed');
        
        const data = await res.json();
        const imageUrl = data.url;
        
        // 2. 仅更新图片 URL，不处理尺寸
        const newElements = elements.map(el => {
          if (el.id === id) {
            return { 
              ...JSON.parse(JSON.stringify(el)), 
              currentValue: imageUrl
            };
          }
          return el;
        });
        onUpdate(newElements);
        toast.success('图片已替换', { id: toastId });
        
      } catch (error) {
        console.error('Image upload error:', error);
        toast.error('图片上传失败', { id: toastId });
      }
    }
  };

  const handleTextChange = (id: string, value: string) => {
    const newElements = elements.map(el => {
      if (el.id === id) {
        return { ...JSON.parse(JSON.stringify(el)), currentValue: value };
      }
      return el;
    });
    onUpdate(newElements);
  };

  const COZE_FIELDS = [
    { value: 'main_image', label: '主体图片' },
    { value: 'main_image_2', label: '主体图片 2' },
    { value: 'main_image_3', label: '主体图片 3' },
    { value: 'background_image', label: '背景图片' },
    { value: 'decoration_1', label: '装饰图片 1' },
    { value: 'decoration_2', label: '装饰图片 2' },
    { value: 'logo_image', label: 'Logo 图片' },
    { value: 'number_image', label: '数字' },
    { value: 'main_text', label: '主标题' },
    { value: 'sub_text', label: '副标题' },
    { value: 'sub_title', label: '副标题 (sub_title)' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>配置可替换元素</CardTitle>
        {elements.some(el => el.type === 'text') && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBatchBindText}
            className="text-xs"
          >
            一键绑定所有文字
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {elements.length === 0 && <p className="text-muted-foreground">未检测到可编辑元素</p>}
        {elements.map((el) => (
          <div key={el.id} className="flex items-center space-x-4 p-2 border rounded-md">
            <Checkbox 
              id={`check-${el.id}`} 
              checked={el.isEditable}
              onCheckedChange={(checked) => handleToggle(el.id, checked as boolean)}
            />
            <div className="flex-1 grid gap-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1 min-w-0">
                  <Label htmlFor={`check-${el.id}`} className="font-medium truncate">
                    {el.type === 'image' ? '图片' : '文字'} (ID: {el.id})
                  </Label>
                  <div className="flex items-center gap-2">
                    {el.type === 'image' ? (
                      <div className="w-12 h-12 rounded border bg-muted overflow-hidden shrink-0 shadow-sm">
                        <img 
                          src={(el.currentValue || el.originalValue).startsWith('data:') || (el.currentValue || el.originalValue).startsWith('/') || (el.currentValue || el.originalValue).startsWith('http') ? (el.currentValue || el.originalValue) : `/api/proxy-image?url=${encodeURIComponent(el.currentValue || el.originalValue)}`} 
                          alt="预览" 
                          className="w-full h-full object-cover transition-transform hover:scale-110"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="px-3 py-2 rounded bg-muted/50 text-sm text-foreground font-medium border border-border/50 w-full">
                        {el.currentValue}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Input 
                  value={el.name} 
                  onChange={(e) => handleNameChange(el.id, e.target.value)}
                  placeholder="给这个元素起个名字"
                  className="h-8 flex-1"
                />
                {el.isEditable && (
                  <div className="flex gap-2">
                    <Select 
                      value={COZE_FIELDS.some(f => f.value === el.cozeField) ? el.cozeField : (el.cozeField ? 'custom' : 'none')} 
                      onValueChange={(value) => {
                        if (value === 'custom') {
                          // 如果选择自定义，先清空或保持原值（如果原值不在列表中）
                          if (!el.cozeField || COZE_FIELDS.some(f => f.value === el.cozeField)) {
                            handleCozeFieldChange(el.id, '');
                          }
                        } else if (value === 'none') {
                          handleCozeFieldChange(el.id, '');
                        } else {
                          handleCozeFieldChange(el.id, value);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue placeholder="绑定 Coze 字段" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">不绑定</SelectItem>
                        {COZE_FIELDS.map(field => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">自定义...</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* 自定义字段输入框 */}
                    {(!el.cozeField || !COZE_FIELDS.some(f => f.value === el.cozeField)) && el.cozeField !== undefined && (
                      <Input 
                        value={el.cozeField || ''}
                        onChange={(e) => handleCozeFieldChange(el.id, e.target.value)}
                        placeholder="输入 Coze 字段名 (如: product_img)"
                        className="h-8 w-[140px]"
                      />
                    )}
                    {/* 分组绑定输入框 */}
                    <Input 
                      value={el.groupId || ''}
                      onChange={(e) => handleGroupIdChange(el.id, e.target.value)}
                      placeholder="分组 ID (相同 ID 同步)"
                      className="h-8 w-[140px] border-dashed"
                    />
                  </div>
                )}
              </div>

              {/* 替换内容区域 */}
              <div className="mt-1 p-2 bg-muted/30 rounded border border-dashed">
                <Label className="text-xs text-muted-foreground mb-2 block">替换默认内容</Label>
                
                {el.type === 'image' ? (
                  <div className="flex items-center gap-2">
                    <div className="relative w-10 h-10 bg-muted rounded overflow-hidden border shrink-0">
                       <img 
                         src={(el.currentValue || el.originalValue).startsWith('data:') || (el.currentValue || el.originalValue).startsWith('/') || (el.currentValue || el.originalValue).startsWith('http') ? (el.currentValue || el.originalValue) : `/api/proxy-image?url=${encodeURIComponent(el.currentValue || el.originalValue)}`}
                         className="w-full h-full object-cover"
                         alt="preview"
                       />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Input 
                        type="file" 
                        accept="image/*" 
                        className="text-xs h-7 px-2 py-1"
                        onChange={(e) => handleImageUpload(el.id, e)}
                      />
                    </div>
                  </div>
                ) : (
                  <Input 
                    value={el.currentValue}
                    onChange={(e) => handleTextChange(el.id, e.target.value)}
                    className="h-7 text-xs"
                    placeholder="输入新的默认文案"
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}