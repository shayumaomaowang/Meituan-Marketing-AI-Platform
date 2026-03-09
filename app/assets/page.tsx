'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Upload, Trash2, Tag, Search, Plus, X, Loader2, Image as ImageIcon, FolderPlus, Settings } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Asset {
  id: string;
  type: string; // Changed from literal union to string to support custom types
  url: string;
  name: string;
  tags: string[];
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  isDefault: boolean;
}

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<string>('background');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit Modal State
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editName, setEditName] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Category State
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchAssets();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/assets/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets');
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
      }
    } catch (error) {
      console.error('Failed to fetch assets', error);
      toast.error('加载素材失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const res = await fetch('/api/assets/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName }),
      });

      if (res.ok) {
        const newCategory = await res.json();
        setCategories([...categories, newCategory]);
        setNewCategoryName('');
        setIsAddCategoryOpen(false);
        toast.success('分类创建成功');
        // Switch to new category
        setActiveTab(newCategory.id);
      } else {
        const error = await res.json();
        toast.error(error.error || '创建失败');
      }
    } catch (error) {
      toast.error('创建失败');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('确定要删除这个分类吗？该分类下的素材不会被删除，但可能无法通过分类筛选找到。')) return;

    try {
      const res = await fetch(`/api/assets/categories?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setCategories(categories.filter(c => c.id !== id));
        if (activeTab === id) {
          setActiveTab('background');
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Filter for image files
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error('请上传图片文件');
      return;
    }

    if (imageFiles.length < files.length) {
      toast.warning(`跳过了 ${files.length - imageFiles.length} 个非图片文件`);
    }

    setUploading(true);
    const uploadedAssets: Asset[] = [];
    let successCount = 0;
    let failCount = 0;

    try {
      // Process files sequentially
      for (const file of imageFiles) {
        try {
          const formData = new FormData();
          formData.append('file', file);

          // 1. Upload File
          const uploadRes = await fetch('/api/assets/upload', {
            method: 'POST',
            body: formData,
          });

          if (!uploadRes.ok) {
            failCount++;
            console.error(`Failed to upload ${file.name}`);
            continue;
          }

          const uploadData = await uploadRes.json();

          // 2. Create Asset Record
          const assetRes = await fetch('/api/assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: activeTab,
              url: uploadData.url,
              name: file.name.split('.')[0],
              tags: []
            }),
          });

          if (!assetRes.ok) {
            failCount++;
            console.error(`Failed to create asset for ${file.name}`);
            continue;
          }

          const newAsset = await assetRes.json();
          uploadedAssets.push(newAsset);
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Error uploading ${file.name}:`, error);
        }
      }

      if (uploadedAssets.length > 0) {
        setAssets([...uploadedAssets, ...assets]);
      }

      // Show result
      if (successCount > 0 && failCount === 0) {
        toast.success(`成功上传 ${successCount} 个素材`);
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`成功上传 ${successCount} 个素材，${failCount} 个失败`);
      } else {
        toast.error('所有文件上传失败');
      }
    } catch (error) {
      console.error(error);
      toast.error('上传过程中出错');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个素材吗？')) return;

    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAssets(assets.filter(a => a.id !== id));
        setSelectedAsset(null);
        toast.success('删除成功');
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleUpdate = async () => {
    if (!selectedAsset) return;

    try {
      const res = await fetch(`/api/assets/${selectedAsset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          tags: editTags
        }),
      });

      if (res.ok) {
        const updatedAsset = await res.json();
        setAssets(assets.map(a => a.id === updatedAsset.id ? updatedAsset : a));
        setSelectedAsset(null);
        toast.success('更新成功');
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      toast.error('更新失败');
    }
  };

  const openEditModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setEditName(asset.name);
    setEditTags(asset.tags || []);
    setNewTag('');
  };

  const addTag = () => {
    if (newTag && !editTags.includes(newTag)) {
      setEditTags([...editTags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(tag => tag !== tagToRemove));
  };

  const filteredAssets = assets.filter(asset => {
    const matchesType = asset.type === activeTab;
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-foreground flex flex-col">
      <div className="max-w-[1400px] mx-auto w-full px-6 py-8 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">素材库</h1>
            <p className="text-gray-400">管理您的设计资源，包括背景、装饰和 Logo</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input 
                placeholder="搜索素材..." 
                className="pl-9 bg-white/5 border-white/10 text-white w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <input
                type="file"
                id="upload-asset"
                className="hidden"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                multiple
              />
              <Button 
                disabled={uploading}
                onClick={() => document.getElementById('upload-asset')?.click()}
                className="bg-primary hover:bg-primary/90"
              >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                上传素材
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <TabsList className="bg-white/5 border border-white/10 p-1 w-fit h-auto flex-wrap justify-start">
              {categories.map(category => (
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
            
            <Button 
              variant="outline" 
              size="sm" 
              className="border-dashed border-white/20 hover:border-primary hover:text-primary"
              onClick={() => setIsAddCategoryOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> 新建分类
            </Button>
          </div>

          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 border border-dashed border-white/10 rounded-xl bg-white/5">
                <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
                <p>暂无素材，点击右上角上传</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {filteredAssets.map((asset) => (
                  <Card 
                    key={asset.id} 
                    className="group bg-white/5 border-white/10 overflow-hidden hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => openEditModal(asset)}
                  >
                    <div className="aspect-square relative bg-black/20">
                      <Image 
                        src={asset.url} 
                        alt={asset.name}
                        fill
                        className="object-contain p-2"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="h-8 px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(asset);
                          }}
                        >
                          编辑
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(asset.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-white truncate text-sm" title={asset.name}>{asset.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-2 h-5 overflow-hidden">
                        {asset.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-gray-300">
                            {tag}
                          </span>
                        ))}
                        {asset.tags.length > 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-gray-300">+{asset.tags.length - 3}</span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Tabs>
      </div>

      {/* Add Category Modal */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="bg-[#1a1a1c] border-white/10 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>新建素材分类</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">分类名称</Label>
              <Input 
                id="category-name" 
                value={newCategoryName} 
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="例如：节日素材"
                className="bg-white/5 border-white/10"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddCategoryOpen(false)}>取消</Button>
            <Button onClick={handleAddCategory} className="bg-primary hover:bg-primary/90">创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <DialogContent className="bg-[#1a1a1c] border-white/10 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑素材</DialogTitle>
            <DialogDescription className="sr-only">
              编辑素材的名称和标签信息
            </DialogDescription>
          </DialogHeader>
          
          {selectedAsset && (
            <div className="grid gap-6 py-4">
              <div className="flex justify-center bg-black/20 rounded-lg p-4 border border-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={selectedAsset.url} 
                  alt={selectedAsset.name} 
                  className="max-h-48 object-contain"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="name">名称</Label>
                <Input 
                  id="name" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
              
              <div className="grid gap-2">
                <Label>标签</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editTags.map(tag => (
                    <div key={tag} className="flex items-center gap-1 bg-primary/20 text-primary px-2 py-1 rounded text-sm">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="添加标签..."
                    className="bg-white/5 border-white/10"
                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button onClick={addTag} variant="secondary" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button 
              variant="destructive" 
              onClick={() => selectedAsset && handleDelete(selectedAsset.id)}
              className="bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400"
            >
              <Trash2 className="mr-2 h-4 w-4" /> 删除
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSelectedAsset(null)}>取消</Button>
              <Button onClick={handleUpdate} className="bg-primary hover:bg-primary/90">保存更改</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}