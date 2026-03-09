'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Upload, 
  Trash2, 
  Plus, 
  AlignLeft, 
  AlignCenter,
  Settings2,
  Save
} from 'lucide-react';
import { LogoConfig, LogoItem } from '@/lib/logo-types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface LottieLogoEditorProps {
  config: LogoConfig;
  onChange: (config: LogoConfig) => void;
  onSave?: () => void;
}

export function LottieLogoEditor({ config, onChange, onSave }: LottieLogoEditorProps) {
  const [editingLogoId, setEditingLogoId] = useState<string | null>(null);
  const [isLogoPickerOpen, setIsLogoPickerOpen] = useState(false);
  const [logoAssets, setLogoAssets] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogos = async () => {
      try {
        const res = await fetch('/api/assets?type=logo');
        if (res.ok) {
          const data = await res.json();
          setLogoAssets(data);
        }
      } catch (error) {
        console.error('Failed to fetch logos:', error);
      }
    };
    if (isLogoPickerOpen) {
      fetchLogos();
    }
  }, [isLogoPickerOpen]);

  const updateConfig = (updates: Partial<LogoConfig>) => {
    onChange({ ...config, ...updates });
  };

  const addLogoItem = () => {
    const newItem: LogoItem = { id: uuidv4(), url: null };
    updateConfig({ 
      enabled: true,
      items: [...config.items, newItem] 
    });
    toast.success('已添加 Logo');
  };

  const removeLogoItem = (id: string) => {
    const newItems = config.items.filter(item => item.id !== id);
    updateConfig({ items: newItems, enabled: newItems.length > 0 });
    toast.info('Logo 已移除');
  };

  const handleImageUpload = (itemId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const newItems = config.items.map(item => 
          item.id === itemId ? { ...item, url: e.target!.result as string } : item
        );
        updateConfig({ items: newItems });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectLogo = (url: string) => {
    if (editingLogoId) {
      const newItems = config.items.map(item => 
        item.id === editingLogoId ? { ...item, url } : item
      );
      updateConfig({ items: newItems });
      setIsLogoPickerOpen(false);
      setEditingLogoId(null);
    }
  };

  // 如果没有启用也不显示添加按钮时，返回空
  if (!config.enabled && config.items.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Button onClick={addLogoItem} className="w-full gap-2" variant="secondary">
            <Plus className="h-4 w-4" /> 新增 Logo 组件
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full gap-4 overflow-y-auto p-1">
        {config.items.length > 0 && (
          <Button onClick={addLogoItem} className="w-full gap-2 mb-2" variant="secondary">
            <Plus className="h-4 w-4" /> 新增 Logo 组件
          </Button>
        )}
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" /> Logo 组件设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 p-2 bg-blue-500/5 rounded border border-blue-500/20">
              <Label className="text-xs text-blue-400">💡 在画布上拖动 Logo 来调整位置</Label>
              {config.x !== undefined && config.y !== undefined && (
                <p className="text-xs text-muted-foreground">当前位置: X: {Math.round(config.x)}px, Y: {Math.round(config.y)}px</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">排布模式</Label>
              <div className="flex gap-2">
                <Button 
                  variant={config.align === 'left' ? 'default' : 'outline'} 
                  size="sm" 
                  className="flex-1"
                  onClick={() => updateConfig({ align: 'left' })}
                >
                  <AlignLeft className="mr-2 h-4 w-4" /> 左对齐
                </Button>
                <Button 
                  variant={config.align === 'center' ? 'default' : 'outline'} 
                  size="sm" 
                  className="flex-1"
                  onClick={() => updateConfig({ align: 'center' })}
                >
                  <AlignCenter className="mr-2 h-4 w-4" /> 居中
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Logo 大小 ({config.itemSize || 80}px)</Label>
              <Slider 
                value={[config.itemSize || 80]} 
                min={20} 
                max={200} 
                step={1}
                onValueChange={([v]) => updateConfig({ itemSize: v })} 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">间距 ({config.gap || 20}px)</Label>
              <Slider 
                value={[config.gap || 20]} 
                min={0} 
                max={100} 
                step={1}
                onValueChange={([v]) => updateConfig({ gap: v })} 
              />
            </div>

            <div className="space-y-2 pt-4 border-t border-border">
              <Label className="text-xs">Logo 排序与管理</Label>
              <div className="flex items-center gap-2 overflow-x-auto py-2 min-h-[60px] scrollbar-thin scrollbar-thumb-muted">
                
                {/* 左侧添加按钮 */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full flex-shrink-0 border-dashed"
                  title="在左侧添加"
                  onClick={() => {
                    const newItems = [{ id: uuidv4(), url: null }, ...config.items];
                    updateConfig({ items: newItems });
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>

                {/* Logo 列表 */}
                {config.items.map((item) => (
                  <div key={item.id} className="relative group flex-shrink-0">
                    <div 
                      className="w-10 h-10 bg-muted/50 rounded border flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                      onClick={() => {
                        setEditingLogoId(item.id);
                        setIsLogoPickerOpen(true);
                      }}
                      title="点击选择 Logo"
                    >
                      {item.url ? (
                        <img src={item.url} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[8px] text-muted-foreground">空</span>
                      )}
                    </div>
                    
                    {/* 删除按钮 */}
                    <div 
                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm hover:scale-110"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLogoItem(item.id);
                      }}
                      title="删除"
                    >
                      <Trash2 className="h-3 w-3" />
                    </div>
                  </div>
                ))}

                {/* 右侧添加按钮 */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full flex-shrink-0 border-dashed"
                  title="在右侧添加"
                  onClick={() => {
                    const newItems = [...config.items, { id: uuidv4(), url: null }];
                    updateConfig({ items: newItems });
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>

              </div>
              <p className="text-[10px] text-muted-foreground">点击加号在两侧添加，点击图标上传/替换</p>
            </div>

            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={() => {
                updateConfig({ 
                  enabled: false, 
                  items: [] 
                });
                toast.info('组件已删除，请记得保存更改');
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> 删除组件
            </Button>
          </CardContent>
        </Card>
        
        {onSave && (
          <Button variant="outline" onClick={onSave} className="w-full gap-2">
            <Save className="h-4 w-4" /> 保存所有更改
          </Button>
        )}
      </div>

      {/* Logo 选择弹窗 */}
      <Dialog open={isLogoPickerOpen} onOpenChange={setIsLogoPickerOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>选择 Logo 素材</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-6 py-4 overflow-y-auto flex-1 p-2">
            <div className="relative aspect-square cursor-pointer rounded-lg border-2 border-dashed border-muted hover:border-primary hover:bg-accent transition-all flex flex-col items-center justify-center gap-3">
              <Upload className="h-12 w-12 text-muted-foreground/50" />
              <span className="text-sm text-muted-foreground">上传图片</span>
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0] && editingLogoId) {
                    handleImageUpload(editingLogoId, e.target.files[0]);
                    setIsLogoPickerOpen(false);
                    setEditingLogoId(null);
                  }
                }}
              />
            </div>
            {logoAssets.map((logo) => (
              <div
                key={logo.id}
                className="relative aspect-square cursor-pointer rounded-lg border-2 border-muted bg-muted/50 p-6 hover:border-primary hover:bg-accent transition-all flex flex-col items-center justify-center gap-3"
                onClick={() => handleSelectLogo(logo.url)}
              >
                <img src={logo.url} alt={logo.name} className="h-24 w-24 object-contain" />
                <span className="text-sm text-center font-medium truncate w-full">{logo.name}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}