'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Plus, Loader2, Image as ImageIcon, Trash2, X, Sparkles, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

interface DesignTemplate {
  id: string;
  title: string;
  image: string;
  customTemplateId: string;
  lottieTemplateId: string;
  categoryId?: string;
  primaryCategoryId?: string;
  secondaryCategoryId?: string;
  enableDynamicSelection?: boolean;
  skipToForm?: boolean;
}

interface TemplateOption {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  isDefault: boolean;
  type?: 'primary' | 'secondary';
}

interface GroupedCategories {
  primary: Category[];
  secondary: Category[];
  all: Category[];
}

export default function DesignTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Categories State
  const [groupedCategories, setGroupedCategories] = useState<GroupedCategories>({
    primary: [],
    secondary: [],
    all: []
  });
  const [activePrimaryCategory, setActivePrimaryCategory] = useState<string>('all');
  const [activeSecondaryCategory, setActiveSecondaryCategory] = useState<string>('all');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // New Template Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newImage, setNewImage] = useState('');
  const [selectedCustomId, setSelectedCustomId] = useState('');
  const [selectedLottieId, setSelectedLottieId] = useState('');
  const [selectedPrimaryCategoryId, setSelectedPrimaryCategoryId] = useState('uncategorized');
  const [selectedSecondaryCategoryId, setSelectedSecondaryCategoryId] = useState('uncategorized');
  const [enableDynamicSelection, setEnableDynamicSelection] = useState(false);
  const [skipToForm, setSkipToForm] = useState(false);
  
  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Dynamic Selection State
  const [showDynamicSelectDialog, setShowDynamicSelectDialog] = useState(false);
  const [selectedTemplateForDynamic, setSelectedTemplateForDynamic] = useState<DesignTemplate | null>(null);
  
  // Options
  const [customOptions, setCustomOptions] = useState<TemplateOption[]>([]);
  const [lottieOptions, setLottieOptions] = useState<TemplateOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchTemplates();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/design-templates/categories');
      if (res.ok) {
        const data = await res.json();
        setGroupedCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchTemplates = async (primaryCat?: string, secondaryCat?: string) => {
    try {
      // 使用传入的参数，如果没有则使用当前状态
      const primary = primaryCat !== undefined ? primaryCat : activePrimaryCategory;
      const secondary = secondaryCat !== undefined ? secondaryCat : activeSecondaryCategory;
      
      // 构建查询参数
      const params = new URLSearchParams();
      
      if (primary !== 'all') {
        params.append('primaryCategory', primary);
      }
      
      if (secondary !== 'all') {
        params.append('secondaryCategory', secondary);
      }
      
      const queryString = params.toString();
      const url = queryString 
        ? `/api/design-templates?${queryString}`
        : '/api/design-templates';
      
      console.log('Fetching templates from:', url);
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        console.log('Templates fetched:', data);
        setTemplates(data);
      } else {
        console.error('Failed to fetch templates:', res.status);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('加载模板失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取当前一级分类下有内容的二级分类
  const getAvailableSecondaryCategories = () => {
    if (activePrimaryCategory === 'all') {
      return groupedCategories.secondary;
    }
    
    // 获取属于当前一级分类的所有模板
    const templatesInPrimary = templates.filter(t => t.primaryCategoryId === activePrimaryCategory);
    
    // 获取这些模板中包含的二级分类 ID
    const secondaryCatIds = new Set(templatesInPrimary.map(t => t.secondaryCategoryId).filter(Boolean));
    
    // 返回匹配的二级分类
    return groupedCategories.secondary.filter(cat => secondaryCatIds.has(cat.id));
  };

  // 当一级分类变化时，重置二级分类为 'all'
  useEffect(() => {
    setActiveSecondaryCategory('all');
  }, [activePrimaryCategory]);

  useEffect(() => {
    if (groupedCategories.all.length > 0) {
      fetchTemplates();
    }
  }, [activePrimaryCategory, activeSecondaryCategory]);

  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const [customRes, lottieRes] = await Promise.all([
        fetch('/api/custom-templates'),
        fetch('/api/lottie-templates/list')
      ]);

      if (customRes.ok) {
        const data = await customRes.json();
        console.log('Custom options loaded:', data);
        setCustomOptions(data.map((t: any) => ({ id: t.id, name: t.name || '未命名静态模板' })));
      } else {
        console.error('Failed to fetch custom templates:', customRes.status);
      }

      if (lottieRes.ok) {
        const data = await lottieRes.json();
        console.log('Lottie options loaded:', data);
        setLottieOptions(data);
      } else {
        console.error('Failed to fetch lottie templates:', lottieRes.status);
      }
    } catch (error) {
      console.error('Error loading options:', error);
      toast.error('加载选项失败');
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const res = await fetch('/api/design-templates/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName }),
      });

      if (res.ok) {
        const newCategory = await res.json();
        // 重新获取分类数据
        fetchCategories();
        setNewCategoryName('');
        setIsAddCategoryOpen(false);
        toast.success('分类创建成功');
        // Switch to new category based on its type
        if (newCategory.type === 'primary') {
          setActivePrimaryCategory(newCategory.id);
        } else if (newCategory.type === 'secondary') {
          setActiveSecondaryCategory(newCategory.id);
        }
      } else {
        const error = await res.json();
        toast.error(error.error || '创建失败');
      }
    } catch (error) {
      toast.error('创建失败');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('确定要删除这个分类吗？该分类下的模板不会被删除，但会变为未分类状态。')) return;
    
    try {
      const res = await fetch(`/api/design-templates/categories?id=${id}`, {
        method: 'DELETE',
      });

        if (res.ok) {
        // 重新获取分类数据
        fetchCategories();
        // 检查删除的分类是否是当前活动的分类
        const deletedCategory = groupedCategories.all.find(c => c.id === id);
        if (deletedCategory) {
          if (deletedCategory.type === 'primary' && activePrimaryCategory === id) {
            setActivePrimaryCategory('all');
          } else if (deletedCategory.type === 'secondary' && activeSecondaryCategory === id) {
            setActiveSecondaryCategory('all');
          }
        }
        toast.success('分类删除成功');
      } else {
        const error = await res.json();
        toast.error(error.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleOpenEdit = (template: DesignTemplate) => {
    setEditingId(template.id);
    setNewTitle(template.title);
    setNewImage(template.image);
    setSelectedCustomId(template.customTemplateId);
    setSelectedLottieId(template.lottieTemplateId);
    setSelectedPrimaryCategoryId(template.primaryCategoryId || 'uncategorized');
    setSelectedSecondaryCategoryId(template.secondaryCategoryId || 'uncategorized');
    setEnableDynamicSelection(template.enableDynamicSelection || false);
    setSkipToForm(template.skipToForm || false);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setNewTitle('');
    setNewImage('');
    setSelectedCustomId('');
    setSelectedLottieId('');
    setSelectedPrimaryCategoryId('uncategorized');
    setSelectedSecondaryCategoryId('uncategorized');
    setEnableDynamicSelection(false);
    setSkipToForm(false);
    setEditingId(null);
  };

  const handleSaveOrCreate = async () => {
    console.log('handleSaveOrCreate called');
    
    if (!newTitle) {
      console.warn('No title provided');
      toast.error('请输入模板标题');
      return;
    }

    try {
      const payload = {
        title: newTitle,
        image: newImage || '/placeholder.svg',
        customTemplateId: selectedCustomId,
        lottieTemplateId: selectedLottieId,
        primaryCategoryId: selectedPrimaryCategoryId === 'uncategorized' ? '' : selectedPrimaryCategoryId,
        secondaryCategoryId: selectedSecondaryCategoryId === 'uncategorized' ? '' : selectedSecondaryCategoryId,
        enableDynamicSelection: enableDynamicSelection,
        skipToForm: skipToForm
      };
      
      let res;
      let successMessage = '';
      
      if (editingId) {
        // 编辑模式
        console.log('Updating template with payload:', payload);
        res = await fetch(`/api/design-templates/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        successMessage = '更新成功';
      } else {
        // 创建模式
        console.log('Creating template with payload:', payload);
        res = await fetch('/api/design-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        successMessage = '创建成功';
      }

      console.log('Response status:', res.status);

      if (res.ok) {
        console.log(`Template ${editingId ? 'updated' : 'created'} successfully`);
        toast.success(successMessage);
        
        // Reset form
        resetForm();
        
        // Close dialog
        setIsDialogOpen(false);
        
        // Refresh templates
        setLoading(true);
        try {
          const allRes = await fetch('/api/design-templates');
          if (allRes.ok) {
            const allData = await allRes.json();
            setTemplates(allData);
            console.log(`Templates refreshed after ${editingId ? 'update' : 'creation'}:`, allData.length);
          }
        } catch (err) {
          console.error('Failed to refresh templates:', err);
        } finally {
          setLoading(false);
        }
      } else {
        const errorData = await res.json();
        console.error(`Failed to ${editingId ? 'update' : 'create'} template:`, res.status, errorData);
        toast.error(errorData.error || `${editingId ? '更新' : '创建'}失败`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(`${editingId ? '更新' : '创建'}失败: ` + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleDelete = async (id: string) => {
    console.log('Deleting template with ID:', id);
    try {
      const res = await fetch(`/api/design-templates/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('删除成功');
        setDeleteId(null);
        fetchTemplates();
      } else {
        toast.error('删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setNewImage(ev.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // 处理模板卡片点击
  const handleTemplateCardClick = (template: DesignTemplate) => {
    // 如果是 Agent 类型的模板（18会员日-分会场 或 下沉市场-疯狂周末），跳转到 Agent 对话页面
    const agentTemplates = ['18会员日-分会场', '下沉市场-疯狂周末', '18会员日海报', '外卖-居家', '外卖-夜宵', '外卖-家里聚餐', '外卖-场景', '大字报风格'];
    if (agentTemplates.includes(template.title)) {
      // 使用 sessionStorage 保存 Agent 信息
      sessionStorage.setItem("agentExecution", JSON.stringify({
        agentName: template.title,
        templateId: template.id,
        fromTemplate: true,
        timestamp: Date.now()
      }));
      router.push("/results");
      return;
    }
    
    // 如果勾选了"跳转表单"，直接跳转到对话界面的表单
    if (template.skipToForm) {
      // 使用 sessionStorage 保存模板信息
      sessionStorage.setItem("generationResult", JSON.stringify({
        type: template.title,
        templateId: template.id,
        isTemplateMode: true,
        showForm: true,
        timestamp: Date.now()
      }));
      router.push("/results");
      return;
    }
    
    if (template.enableDynamicSelection) {
      setSelectedTemplateForDynamic(template);
      setShowDynamicSelectDialog(true);
    } else {
      router.push(`/workspace/${template.id}`);
    }
  };

  // 处理动态选择的结果
  const handleDynamicSelect = (mode: 'static' | 'dynamic') => {
    if (selectedTemplateForDynamic) {
      const url = `/workspace/${selectedTemplateForDynamic.id}?mode=${mode}`;
      router.push(url);
    }
    setShowDynamicSelectDialog(false);
    setSelectedTemplateForDynamic(null);
  };

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h1 className="text-5xl font-bold mb-4 flex items-center gap-3">
              <Layout className="text-primary" /> 设计模板
            </h1>
            <p className="text-gray-400 text-lg font-light">海量行业模版，快速套用，一键开启 AI 创作。</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
            if (open && customOptions.length === 0) fetchOptions();
          }}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" /> 新建模板
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingId ? '编辑设计模板' : '新建设计模板'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>模板标题</Label>
                  <Input 
                    value={newTitle} 
                    onChange={(e) => setNewTitle(e.target.value)} 
                    placeholder="例如：双11大促海报"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label>封面图片</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-16 bg-muted rounded border flex items-center justify-center overflow-hidden">
                      {newImage ? (
                        <img src={newImage} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <Input type="file" accept="image/*" onChange={handleImageUpload} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>关联静态模板 (自定义)</Label>
                  <Select value={selectedCustomId} onValueChange={setSelectedCustomId}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingOptions ? "加载中..." : "选择静态模板"} />
                    </SelectTrigger>
                    <SelectContent>
                      {customOptions.map(opt => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>关联动态模板 (Lottie)</Label>
                  <Select value={selectedLottieId} onValueChange={setSelectedLottieId}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingOptions ? "加载中..." : "选择 Lottie 模板"} />
                    </SelectTrigger>
                    <SelectContent>
                      {lottieOptions.map(opt => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>设计类型（一级分类）</Label>
                    <Select value={selectedPrimaryCategoryId} onValueChange={setSelectedPrimaryCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择设计类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uncategorized">未分类</SelectItem>
                        {groupedCategories.primary.map(category => (
                          <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>业务平台（二级分类）</Label>
                    <Select value={selectedSecondaryCategoryId} onValueChange={setSelectedSecondaryCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择业务平台" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uncategorized">未分类</SelectItem>
                        {groupedCategories.secondary.map(category => (
                          <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 border-t pt-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="enableDynamic" 
                      checked={enableDynamicSelection}
                      onCheckedChange={(checked) => setEnableDynamicSelection(checked as boolean)}
                    />
                    <Label htmlFor="enableDynamic" className="font-normal cursor-pointer">
                      是否开启动态选择（打开时弹出选择框）
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="skipToForm" 
                      checked={skipToForm}
                      onCheckedChange={(checked) => setSkipToForm(checked as boolean)}
                    />
                    <Label htmlFor="skipToForm" className="font-normal cursor-pointer">
                      是否跳转表单（点击后直接进入对话界面，展示该模板的表单）
                    </Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
                <Button onClick={handleSaveOrCreate}>{editingId ? '保存修改' : '创建'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Tabs */}
        <div className="mb-8 space-y-6">
          {/* 一级分类 */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">设计类型</h3>
            <div className="flex items-center gap-2">
              <Tabs value={activePrimaryCategory} onValueChange={setActivePrimaryCategory} className="flex-1">
                <TabsList className="bg-white/5 border border-white/10 p-1 w-fit h-auto flex-wrap justify-start">
                  <div key="all" className="relative group/tab">
                    <TabsTrigger 
                      value="all" 
                      className="data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
                    >
                      全部
                    </TabsTrigger>
                  </div>
                  {groupedCategories.primary.map(category => (
                    <div key={category.id} className="relative group/tab">
                      <TabsTrigger 
                        value={category.id} 
                        className="data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
                      >
                        {category.name}
                      </TabsTrigger>
                      {!category.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category.id);
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/tab:opacity-100 transition-opacity hover:bg-red-600"
                          title="删除分类"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </TabsList>
              </Tabs>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="border-dashed border-white/20 hover:border-primary hover:text-primary"
                onClick={() => setIsAddCategoryOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> 新建分类
              </Button>
            </div>
          </div>
          
          {/* 二级分类 */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">业务平台</h3>
            <div className="flex items-center gap-2">
              <Tabs value={activeSecondaryCategory} onValueChange={setActiveSecondaryCategory} className="flex-1">
                <TabsList className="bg-white/5 border border-white/10 p-1 w-fit h-auto flex-wrap justify-start">
                  <div key="all" className="relative group/tab">
                    <TabsTrigger 
                      value="all" 
                      className="data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
                    >
                      全部
                    </TabsTrigger>
                  </div>
                  {getAvailableSecondaryCategories().map(category => (
                    <div key={category.id} className="relative group/tab">
                      <TabsTrigger 
                        value={category.id} 
                        className="data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
                      >
                        {category.name}
                      </TabsTrigger>
                      {!category.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category.id);
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/tab:opacity-100 transition-opacity hover:bg-red-600"
                          title="删除分类"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Add Category Dialog */}
        <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>新建分类</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>分类名称</Label>
                <Input 
                  value={newCategoryName} 
                  onChange={(e) => setNewCategoryName(e.target.value)} 
                  placeholder="例如：节日营销"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCategory();
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>取消</Button>
              <Button onClick={handleAddCategory}>创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {templates.map((item) => (
              <div 
                key={item.id} 
                onClick={() => handleTemplateCardClick(item)} 
                className="group cursor-pointer relative"
              >
                <div className="aspect-[4/3] rounded-[32px] overflow-hidden border border-white/5 mb-4 relative bg-gray-900 shadow-lg transition-all duration-500 group-hover:border-primary/50 group-hover:shadow-[0_0_40px_rgba(124,58,237,0.15)]">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                  
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="px-6 py-2 bg-primary text-white rounded-full text-sm font-bold shadow-xl">
                      立即使用
                    </div>
                  </div>

                  {/* Edit Button */}
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-3 right-12 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(item);
                    }}
                    title="编辑模板"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>

                  {/* Delete Button */}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(item.id);
                    }}
                    title="删除模板"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-400 text-center group-hover:text-white transition-colors font-medium">
                  {item.title}
                </p>
              </div>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除？</AlertDialogTitle>
              <AlertDialogDescription>
                此操作无法撤销。这将永久删除该设计模板。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 动态选择弹窗 */}
        <Dialog open={showDynamicSelectDialog} onOpenChange={setShowDynamicSelectDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>选择头图类型</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-6">
              {/* 静态模板卡片 */}
              <div
                onClick={() => handleDynamicSelect('static')}
                className="group cursor-pointer p-6 rounded-lg border border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 transition-all"
              >
                <div className="flex items-center justify-center mb-4">
                  <Layout className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-base font-semibold mb-2 text-center">静态头图</h3>
                <p className="text-xs text-gray-400 text-center">快速制作静态头图</p>
              </div>

              {/* 动态模板卡片 */}
              <div
                onClick={() => handleDynamicSelect('dynamic')}
                className="group cursor-pointer p-6 rounded-lg border border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 transition-all"
              >
                <div className="flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-base font-semibold mb-2 text-center">动态头图</h3>
                <p className="text-xs text-gray-400 text-center">快速制作动态头图</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}