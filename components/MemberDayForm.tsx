'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Plus } from 'lucide-react';

interface MemberDayFormProps {
  initialData: Partial<any>;
  onSubmit: (data: any) => void;
}

export function MemberDayForm({ initialData, onSubmit }: MemberDayFormProps) {
  // 动态选项状态
  const [sizes, setSizes] = useState(['750x450', '1080x1920', '800x800']);
  const [colors, setColors] = useState(['红色', '蓝色', '黄色', '绿色', '紫色']);
  const [businesses, setBusinesses] = useState(['外卖', '医药', '美食', '酒店']);
  const [layouts, setLayouts] = useState(['居中构图', '上下构图', '左右构图']);
  
  const [newOption, setNewOption] = useState('');
  const [activeAddType, setActiveAddType] = useState<'size' | 'color' | 'biz' | 'layout' | null>(null);

  const [formData, setFormData] = useState<any>({
    type: initialData.type || '18会员日-分会场',
    // 18会员日-分会场 专用字段
    productImage: initialData.productImage || null,
    sceneImage: initialData.sceneImage || null,
    activityDescription: initialData.activityDescription || '',
    // 其他表单类型字段
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

  // 监听初始数据变化并同步
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

  const handleTypeChange = (newType: string) => {
    // 切换表单类型
    setFormData((prev: any) => ({ 
      ...prev, 
      type: newType
    }));
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

  const handleFileUpload = (field: 'mainAsset' | 'logo' | 'productImage' | 'sceneImage', e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          handleChange(field, ev.target.result as string);
          console.log(`✅ ${field} 已上传`);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const removeImage = (field: string) => {
    handleChange(field, null);
    console.log(`🗑️ ${field} 已删除`);
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

  const handleSubmit = () => {
    // 18会员日海报只需要商品图片
    if (formData.type === '18会员日海报') {
      if (!formData.productImage) {
        alert('请上传商品图片');
        return;
      }
    } else if (formData.type === '18会员日-分会场' || formData.type === '下沉市场-疯狂周末' || formData.type === '外卖-居家' || formData.type === '外卖-夜宵' || formData.type === '外卖-家里聚餐' || formData.type === '外卖-场景' || formData.type === '大字报风格') {
      if (!formData.activityDescription.trim()) {
        alert('请填写活动描述');
        return;
      }
    }
    
    // 提交时将"18会员日海报"转换为"会员海报"以匹配 Agent 名称
    const submitData = { ...formData };
    if (formData.type === '18会员日海报') {
      submitData.type = '会员海报';
    }
    console.log('📋 表单提交数据:', submitData);
    onSubmit(submitData);
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-12 select-none">
      {/* 生成类型选择 */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-400">生成类型</Label>
        <Select value={formData.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="bg-card/50 border-white/10 h-11">
            <SelectValue placeholder="选择类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="18会员日-分会场">18会员日-分会场</SelectItem>
            <SelectItem value="下沉市场-疯狂周末">下沉市场-疯狂周末</SelectItem>
            <SelectItem value="外卖-居家">外卖-居家</SelectItem>
            <SelectItem value="外卖-夜宵">外卖-夜宵</SelectItem>
            <SelectItem value="外卖-家里聚餐">外卖-家里聚餐</SelectItem>
            <SelectItem value="外卖-场景">外卖-场景</SelectItem>
            <SelectItem value="大字报风格">大字报风格</SelectItem>
            <SelectItem value="18会员日海报">18会员日海报</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 18会员日海报 专用表单 - 简化版 */}
      {formData.type === '18会员日海报' && (
        <>
          {/* 标题 */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">18会员日海报</h2>
            <p className="text-sm text-gray-400">请上传商品图片</p>
          </div>

          {/* 商品图上传 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-400">商品图片 <span className="text-red-500">*</span></Label>
            <div className="relative group aspect-[9/16] bg-card/30 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-all">
              {formData.productImage ? (
                <>
                  <img 
                    src={formData.productImage} 
                    alt="商品图" 
                    className="w-full h-full object-cover" 
                  />
                  <button
                    onClick={() => removeImage('productImage')}
                    className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 p-2 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-500 mb-2" />
                  <span className="text-sm text-gray-500">点击上传商品图片</span>
                </>
              )}
              <input 
                type="file" 
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={(e) => handleFileUpload('productImage', e)} 
              />
            </div>
          </div>
        </>
      )}

      {/* Agent 专用表单 */}
      {(formData.type === '18会员日-分会场' || formData.type === '下沉市场-疯狂周末' || formData.type === '外卖-居家' || formData.type === '外卖-夜宵' || formData.type === '外卖-家里聚餐' || formData.type === '外卖-场景' || formData.type === '大字报风格') && (
        <>
          {/* 标题 */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">{formData.type}</h2>
            <p className="text-sm text-gray-400">请上传主体素材和场景素材，填写活动描述</p>
          </div>

          {/* 商品图上传 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-400">1. 主体素材上传 (商品图)</Label>
            <div className="relative group aspect-video bg-card/30 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-all">
              {formData.productImage ? (
                <>
                  <img 
                    src={formData.productImage} 
                    alt="商品图" 
                    className="w-full h-full object-cover" 
                  />
                  <button
                    onClick={() => removeImage('productImage')}
                    className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 p-2 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute bottom-3 left-3 text-xs text-green-400 bg-black/50 px-2 py-1 rounded">
                    ✓ 已上传商品图
                  </div>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-gray-500 mb-2" />
                  <span className="text-sm text-gray-500">点击上传商品图</span>
                  <span className="text-xs text-gray-600 mt-1">(结构二用)</span>
                </>
              )}
              <input 
                type="file" 
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={(e) => handleFileUpload('productImage', e)} 
              />
            </div>
          </div>

          {/* 场景/人像图上传 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-400">2. 场景/人像素材上传</Label>
            <div className="relative group aspect-video bg-card/30 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-all">
              {formData.sceneImage ? (
                <>
                  <img 
                    src={formData.sceneImage} 
                    alt="场景/人像图" 
                    className="w-full h-full object-cover" 
                  />
                  <button
                    onClick={() => removeImage('sceneImage')}
                    className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 p-2 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute bottom-3 left-3 text-xs text-green-400 bg-black/50 px-2 py-1 rounded">
                    ✓ 已上传场景/人像图
                  </div>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-gray-500 mb-2" />
                  <span className="text-sm text-gray-500">点击上传场景/人像图</span>
                  <span className="text-xs text-gray-600 mt-1">(结构三用)</span>
                </>
              )}
              <input 
                type="file" 
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={(e) => handleFileUpload('sceneImage', e)} 
              />
            </div>
          </div>

          {/* 活动描述 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-400">3. 活动描述</Label>
            <div className="relative">
              <textarea
                value={formData.activityDescription}
                onChange={(e) => handleChange('activityDescription', e.target.value)}
                className="w-full bg-card/50 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all min-h-[120px] resize-none shadow-inner text-white"
                placeholder="请填写活动的具体描述、主题、文案等信息..."
              />
              <div className="absolute right-3 bottom-3 text-[10px] text-gray-600">
                {formData.activityDescription.length}/500
              </div>
            </div>
          </div>

          {/* 使用状态提示 */}
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
            <div className="font-medium mb-2">📸 图片使用方式</div>
            <ul className="space-y-1 text-xs">
              <li>• 商品图 → 用作结构二（直接替换商品）</li>
              <li>• 场景/人像图 → 用作结构三（替换背景+渐变）</li>
              <li>• 参考图（风格图）→ 从风格库获取（名称：18会员日-分会场）</li>
              <li>• 最终 API 接收：[参考图, 商品图或场景图]</li>
            </ul>
          </div>
        </>
      )}

      {/* 确认按钮 */}
      <Button 
        onClick={handleSubmit}
        className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-4"
      >
        确认，进入下一步
      </Button>
    </div>
  );
}