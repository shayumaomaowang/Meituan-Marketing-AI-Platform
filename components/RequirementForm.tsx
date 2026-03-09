'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Wand2, Check, Image as ImageIcon, Plus, X, Trash2, Layout } from 'lucide-react';
import { RequirementData } from '@/lib/intent-parser';

interface RequirementFormProps {
  initialData: Partial<RequirementData & { subTitle?: string }>;
  onSubmit: (data: any) => void;
}

export function RequirementForm({ initialData, onSubmit }: RequirementFormProps) {
  // 动态选项状态
  const [sizes, setSizes] = useState(['750x450', '1080x1920', '800x800']);
  const [colors, setColors] = useState(['红色', '蓝色', '黄色', '绿色', '紫色']);
  const [businesses, setBusinesses] = useState(['外卖', '医药', '美食', '酒店']);
  const [layouts, setLayouts] = useState(['居中构图', '上下构图', '左右构图']);
  
  const [newOption, setNewOption] = useState('');
  const [activeAddType, setActiveAddType] = useState<'size' | 'color' | 'biz' | 'layout' | null>(null);

  const [formData, setFormData] = useState<any>({
    type: initialData.type || '',
    copywriting: initialData.copywriting || '',
    subTitle: (initialData as any).subTitle || '',
    size: initialData.size || '750x450',
    layout: initialData.layout || '居中构图',
    business: initialData.business || '外卖',
    color: initialData.color || '红色',
    mainAsset: initialData.mainAsset || null,
    logo: initialData.logo || null,
    ...initialData
  });

  // 核心修复：监听初始数据的变化并同步到表单状态
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData((prev: any) => ({
        ...prev,
        ...initialData
      }));
    }
  }, [initialData]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleAddOption = (type: 'size' | 'color' | 'biz' | 'layout') => {
    if (!newOption.trim()) return;
    if (type === 'size') setSizes([...sizes, newOption]);
    if (type === 'color') setColors([...colors, newOption]);
    if (type === 'biz') setBusinesses([...businesses, newOption]);
    if (type === 'layout') setLayouts([...layouts, newOption]);
    setNewOption('');
    setActiveAddType(null);
  };

  const handleRemoveOption = (type: 'size' | 'color' | 'biz' | 'layout', opt: string) => {
    if (type === 'size') setSizes(sizes.filter(s => s !== opt));
    if (type === 'color') setColors(colors.filter(c => c !== opt));
    if (type === 'biz') setBusinesses(businesses.filter(b => b !== opt));
    if (type === 'layout') setLayouts(layouts.filter(l => l !== opt));
  };

  const handleFileUpload = (field: 'mainAsset' | 'logo', e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) handleChange(field, ev.target.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const renderDynamicSelect = (label: string, field: string, options: string[], type: 'size' | 'color' | 'biz' | 'layout') => (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-400">{label}</Label>
      <div className="flex gap-2">
        <Select value={formData[field]} onValueChange={(v) => handleChange(field, v)}>
          <SelectTrigger className="bg-card/50 border-white/10 flex-1 h-11">
            <SelectValue placeholder={`选择${label}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <div key={opt} className="flex items-center justify-between px-2 group">
                <SelectItem value={opt} className="flex-1">{opt}</SelectItem>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={(e) => { e.stopPropagation(); handleRemoveOption(type, opt); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="border-white/10 bg-card/50 h-11 w-11" onClick={() => setActiveAddType(activeAddType === type ? null : type)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {activeAddType === type && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
          <Input value={newOption} onChange={e => setNewOption(e.target.value)} placeholder={`输入新${label}`} className="h-9 bg-background/50" />
          <Button size="sm" onClick={() => handleAddOption(type)}>添加</Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-12 select-none">
      {/* 1. 类型选择 */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-400">生成类型</Label>
        <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
          <SelectTrigger className="bg-card/50 border-white/10 h-11">
            <SelectValue placeholder="选择类型" />
          </SelectTrigger>
          <SelectContent>
          </SelectContent>
        </Select>
      </div>

      {/* 2. 标题编辑 */}
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-400">主标题内容</Label>
          <div className="relative">
            <Input 
              value={formData.copywriting} 
              onChange={(e) => handleChange('copywriting', e.target.value)}
              className="bg-card/50 border-white/10 h-11 pr-12"
              placeholder="输入主标题文案"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600">
              {formData.copywriting.length}/20
            </div>
          </div>
        </div>

        {/* 修改：现在所有类型都显示副标题 */}
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
          <Label className="text-sm font-medium text-gray-400">副标题内容</Label>
          <div className="relative">
            <Input 
              value={formData.subTitle} 
              onChange={(e) => handleChange('subTitle', e.target.value)}
              className="bg-card/50 border-white/10 h-11 pr-12"
              placeholder="输入副标题文案"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600">
              {formData.subTitle.length}/30
            </div>
          </div>
        </div>
      </div>

      {/* 3 & 4. 素材上传 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-400">头图主体素材</Label>
          <div className="relative group aspect-video bg-card/30 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-all">
            {formData.mainAsset ? (
              <img src={formData.mainAsset} className="w-full h-full object-contain" alt="主体" />
            ) : (
              <>
                <Upload className="h-5 w-5 text-gray-500 mb-2" />
                <span className="text-[10px] text-gray-500">点击上传主体图片</span>
              </>
            )}
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload('mainAsset', e)} />
          </div>
        </div>
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-400">logo图片 (可选)</Label>
          <div className="relative group aspect-video bg-card/30 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-all">
            {formData.logo ? (
              <img src={formData.logo} className="w-full h-full object-contain" alt="Logo" />
            ) : (
              <>
                <Upload className="h-5 w-5 text-gray-500 mb-2" />
                <span className="text-[10px] text-gray-500">点击上传 Logo</span>
              </>
            )}
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload('logo', e)} />
          </div>
        </div>
      </div>

      {/* 动态字段显示逻辑 */}
      {formData.type === '大促会场one' ? (
        <>
          {renderDynamicSelect('头图尺寸', 'size', sizes, 'size')}
          {renderDynamicSelect('版式选择', 'layout', layouts, 'layout')}
          {renderDynamicSelect('主色调', 'color', colors, 'color')}
          {renderDynamicSelect('所属业务', 'business', businesses, 'biz')}
        </>
      ) : (
        <>
          {renderDynamicSelect('主色调', 'color', colors, 'color')}
          {renderDynamicSelect('所属业务', 'business', businesses, 'biz')}
        </>
      )}

      {/* 确认按钮 */}
      <Button 
        onClick={() => onSubmit(formData)}
        className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-4"
      >
        确认，进入下一步
      </Button>
    </div>
  );
}