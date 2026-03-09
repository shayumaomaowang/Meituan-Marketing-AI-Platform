'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Plus } from 'lucide-react';

interface UnifiedFormData {
  type: string;
  copywriting?: string;
  subTitle?: string;
  mainAsset?: string | null;
  logo?: string | null;
  business: string;
  description?: string;
  size: string;
  layout?: string;
  color?: string;
  style?: string;
}

interface UnifiedFormProps {
  initialData?: Partial<UnifiedFormData>;
  onSubmit: (data: UnifiedFormData) => void;
  isFreeGenerate?: boolean;
}

export function UnifiedForm({ initialData, onSubmit, isFreeGenerate = false }: UnifiedFormProps) {
  const [businesses, setBusinesses] = useState(['外卖', '医药', '美食', '酒店', '电商', '团购']);
  const [sizes, setSizes] = useState(['低尺寸(15:8)', '中尺寸(5:4)', '高尺寸(15:16)']);
  const [colors, setColors] = useState(['红色', '蓝色', '黄色', '绿色', '紫色']);
  const [layouts, setLayouts] = useState(['居中构图', '上下构图', '左右构图']);
  
  const [newOption, setNewOption] = useState('');
  const [activeAddType, setActiveAddType] = useState<'biz' | 'size' | 'color' | 'layout' | null>(null);

  const [formData, setFormData] = useState<UnifiedFormData>({
    type: isFreeGenerate ? '自由生图' : initialData?.type || '自由生图',
    copywriting: initialData?.copywriting || '',
    subTitle: initialData?.subTitle || '',
    mainAsset: initialData?.mainAsset || null,
    logo: initialData?.logo || null,
    business: initialData?.business || '外卖',
    description: initialData?.description || '',
    size: initialData?.size || '中尺寸(5:4)',
    layout: initialData?.layout || '居中构图',
    color: initialData?.color || '红色',
    style: initialData?.style || '',
  });

  const handleChange = (field: keyof UnifiedFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  const handleRemoveAsset = (field: 'mainAsset' | 'logo') => {
    handleChange(field, null);
  };

  const handleAddOption = (type: 'biz' | 'size' | 'color' | 'layout') => {
    if (!newOption.trim()) return;
    if (type === 'biz') setBusinesses([...businesses, newOption]);
    if (type === 'size') setSizes([...sizes, newOption]);
    if (type === 'color') setColors([...colors, newOption]);
    if (type === 'layout') setLayouts([...layouts, newOption]);
    setNewOption('');
    setActiveAddType(null);
  };

  const handleRemoveOption = (type: 'biz' | 'size' | 'color' | 'layout', opt: string) => {
    if (type === 'biz') setBusinesses(businesses.filter(b => b !== opt));
    if (type === 'size') setSizes(sizes.filter(s => s !== opt));
    if (type === 'color') setColors(colors.filter(c => c !== opt));
    if (type === 'layout') setLayouts(layouts.filter(l => l !== opt));
  };

  const renderDynamicSelect = (label: string, field: any, options: string[], type: 'biz' | 'size' | 'color' | 'layout') => (
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
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" 
                  onClick={(e) => { e.stopPropagation(); handleRemoveOption(type, opt); }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </SelectContent>
        </Select>
        <Button 
          variant="outline" 
          size="icon" 
          className="border-white/10 bg-card/50 h-11 w-11" 
          onClick={() => setActiveAddType(activeAddType === type ? null : type)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {activeAddType === type && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
          <Input 
            value={newOption} 
            onChange={e => setNewOption(e.target.value)} 
            placeholder={`输入新${label}`} 
            className="h-9 bg-background/50" 
          />
          <Button size="sm" onClick={() => handleAddOption(type)}>添加</Button>
        </div>
      )}
    </div>
  );

  const isFreeGenerateType = formData.type === '自由生图';

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-12 select-none">
      {/* 1. 生成类型 - 可切换 */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-400">生成类型</Label>
        <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
          <SelectTrigger className="bg-card/50 border-white/10 h-11">
            <SelectValue placeholder="选择类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="自由生图">自由生图</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 自由生图模式特有字段 */}
      {isFreeGenerateType && (
        <>
          {/* 头图主体素材 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-400">头图主体素材</Label>
            <div className="relative group aspect-square w-32 bg-card/30 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-all">
              {formData.mainAsset ? (
                <>
                  <img src={formData.mainAsset} className="w-full h-full object-cover" alt="主体" />
                  <button
                    onClick={() => handleRemoveAsset('mainAsset')}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 text-gray-500 mb-1" />
                  <span className="text-[9px] text-gray-500 text-center px-1">上传素材</span>
                </>
              )}
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload('mainAsset', e)} />
            </div>
          </div>

          {/* 活动描述 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-400">活动描述</Label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="请描述你的生成需求，例如：生成一张红色主题的双11活动头图"
              className="w-full h-32 bg-card/50 border border-white/10 rounded-lg px-4 py-3 text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-primary/50 focus:bg-card/60 transition-all"
            />
          </div>
        </>
      )}

      {/* 模板模式特有字段 */}
      {!isFreeGenerateType && (
        <>
          {/* 标题 */}
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
                  {formData.copywriting?.length || 0}/20
                </div>
              </div>
            </div>

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
                  {formData.subTitle?.length || 0}/30
                </div>
              </div>
            </div>
          </div>

          {/* 素材上传 */}
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

          {/* 大促会场one特有字段 */}
          {formData.type === '大促会场one' && (
            <>
              {renderDynamicSelect('头图尺寸', 'size', sizes, 'size')}
              {renderDynamicSelect('版式选择', 'layout', layouts, 'layout')}
              {renderDynamicSelect('主色调', 'color', colors, 'color')}
              {renderDynamicSelect('所属业务', 'business', businesses, 'biz')}
            </>
          )}

          {/* 会员分会场特有字段 */}
          {formData.type === '会员分会场' && (
            <>
              {renderDynamicSelect('主色调', 'color', colors, 'color')}
              {renderDynamicSelect('所属业务', 'business', businesses, 'biz')}
            </>
          )}
        </>
      )}

      {/* 所有模式共有 - 业务和尺寸 */}
      {isFreeGenerateType && (
        <>
          {renderDynamicSelect('所属业务', 'business', businesses, 'biz')}
          {renderDynamicSelect('尺寸', 'size', sizes, 'size')}
        </>
      )}

      {/* 确认按钮 */}
      <Button 
        onClick={() => onSubmit(formData)}
        className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-4"
      >
        {isFreeGenerateType ? '发送给 AI 生成' : '确认，进入下一步'}
      </Button>
    </div>
  );
}