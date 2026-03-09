"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { 
  Zap, Plus, ImageIcon, Edit3, Maximize2, Sparkles, 
  Calendar, Layout, UserCheck, ChevronRight, FileText, 
  Newspaper, ArrowUp, Scissors, Wand2, X, Grid3X3, Check, Wand, Link as LinkIcon, Upload, Settings
} from 'lucide-react'
import contentData from '@/data/content.json'
import { useRouter } from "next/navigation"
import { agentStorage } from '@/lib/agent-storage'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Loader2 } from 'lucide-react'

interface Category {
  id: string
  name: string
  type?: 'primary' | 'secondary'
  isDefault?: boolean
}

interface Template {
  id: string
  title: string
  image: string
  primaryCategoryId?: string
  secondaryCategoryId?: string
  customTemplateId?: string
  lottieTemplateId?: string
  enableDynamicSelection?: boolean
  skipToForm?: boolean
}

export default function HomePage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Template selector state
  const [primaryCategories, setPrimaryCategories] = useState<Category[]>([])
  const [secondaryCategories, setSecondaryCategories] = useState<Category[]>([])
  const [allTemplates, setAllTemplates] = useState<Template[]>([])
  const [selectedPrimaryCategory, setSelectedPrimaryCategory] = useState<string>('')
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [selectedSecondaryCategory, setSelectedSecondaryCategory] = useState<string>('all')
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  
  // 自由生图模式状态（默认为自由生图）
  const [modeType, setModeType] = useState<'template' | 'freeGenerate'>('freeGenerate')
  const [selectedStyle, setSelectedStyle] = useState<string>('')
  
  // 动态选择弹窗状态
  const [showDynamicSelectDialog, setShowDynamicSelectDialog] = useState(false)
  const [selectedTemplateForDynamic, setSelectedTemplateForDynamic] = useState<Template | null>(null)

  // 获取分类和模板数据
  const fetchData = async () => {
    setLoadingCategories(true)
    setLoadingTemplates(true)
    try {
      const [categoriesRes, templatesRes] = await Promise.all([
        fetch('/api/design-templates/categories'),
        fetch('/api/design-templates')
      ])
      
      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        setPrimaryCategories(data.primary || [])
        setSecondaryCategories(data.secondary || [])
      }
      
      if (templatesRes.ok) {
        const data = await templatesRes.json()
        setAllTemplates(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoadingCategories(false)
      setLoadingTemplates(false)
    }
  }

  // 处理模板选择
  const handleSelectDesignTemplate = (template: Template) => {
    // 如果是 Agent 类型的模板
    const agentTemplates = ['18会员日-分会场', '下沉市场-疯狂周末', '外卖-居家', '外卖-夜宵', '外卖-家里聚餐', '外卖-场景', '大字报风格'];
    if (agentTemplates.includes(template.title)) {
      // 使用 sessionStorage 保存 Agent 信息
      sessionStorage.setItem("agentExecution", JSON.stringify({
        agentName: template.title,
        templateId: template.id,
        fromTemplate: true,
        timestamp: Date.now()
      }));
      router.push("/results");
      setIsTemplateModalOpen(false);
      return;
    }
    
    // 如果勾选了"跳转表单"，直接跳转到对话界面的表单
    if ((template as any).skipToForm) {
      // 使用 sessionStorage 保存模板信息
      sessionStorage.setItem("generationResult", JSON.stringify({
        type: template.title,
        templateId: template.id,
        isTemplateMode: true,
        showForm: true,
        timestamp: Date.now()
      }))
      router.push("/results")
      setIsTemplateModalOpen(false)
      return
    }
    
    // 如果启用了动态选择，弹出选择框
    if ((template as any).enableDynamicSelection) {
      setSelectedTemplateForDynamic(template)
      setShowDynamicSelectDialog(true)
    } else {
      router.push(`/workspace/${template.id}`)
    }
  }
  
  // 处理动态选择的结果
  const handleDynamicSelect = (mode: 'static' | 'dynamic') => {
    if (selectedTemplateForDynamic) {
      const url = `/workspace/${selectedTemplateForDynamic.id}?mode=${mode}`
      router.push(url)
    }
    setShowDynamicSelectDialog(false)
    setSelectedTemplateForDynamic(null)
  }

  // 获取指定一级分类和二级分类的模板
  const getFilteredTemplates = (secondaryCategoryId: string) => {
    let filtered = allTemplates
    
    // 如果选择了一级分类，先按一级分类筛选
    if (selectedPrimaryCategory) {
      filtered = filtered.filter(t => t.primaryCategoryId === selectedPrimaryCategory)
    }
    
    // 再按二级分类筛选
    if (secondaryCategoryId !== 'all') {
      filtered = filtered.filter(t => t.secondaryCategoryId === secondaryCategoryId)
    }
    
    return filtered
  }

  // 获取当前一级分类下有内容的二级分类
  const getAvailableSecondaryCategories = () => {
    if (!selectedPrimaryCategory) {
      return secondaryCategories
    }
    
    // 获取属于当前一级分类的所有模板
    const templatesInPrimary = allTemplates.filter(t => t.primaryCategoryId === selectedPrimaryCategory)
    
    // 获取这些模板中包含的二级分类 ID
    const secondaryCatIds = new Set(templatesInPrimary.map(t => t.secondaryCategoryId).filter(Boolean))
    
    // 返回匹配的二级分类
    return secondaryCategories.filter(cat => secondaryCatIds.has(cat.id))
  }

  // 当一级分类变化时，重置二级分类
  useEffect(() => {
    setSelectedSecondaryCategory('all')
  }, [selectedPrimaryCategory])

  // 当页面挂载时获取模板数据
  useEffect(() => {
    fetchData()
  }, [])

  // 当模板 Modal 打开时处理
  const handleTemplateModalOpenChange = (open: boolean) => {
    setIsTemplateModalOpen(open)
    if (open) {
      setSelectedSecondaryCategory('all')
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    
    // 如果是自由生图模式，直接跳转到对话页面（显示表单）
    if (modeType === 'freeGenerate') {
      sessionStorage.setItem("generationResult", JSON.stringify({
        prompt: prompt,
        isFreeGenerate: true,
        showForm: true,  // 标记显示表单而不自动生成
        timestamp: Date.now()
      }))
      
      router.push("/results")
      return
    }
    
    // 模板模式保持原有逻辑
    setIsGenerating(true)
    sessionStorage.setItem("generationResult", JSON.stringify({
      prompt: prompt,
      timestamp: Date.now()
    }))
    router.push("/results")
  }

  const handleSelectTemplate = (template: Template) => {
    // 如果是 Agent 类型的模板
    const agentTemplates = ['18会员日-分会场', '下沉市场-疯狂周末', '外卖-居家', '外卖-夜宵', '外卖-家里聚餐', '外卖-场景', '大字报风格'];
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
      }))
      router.push("/results")
      return
    }
    
    // 如果启用了动态选择，弹出选择框
    if (template.enableDynamicSelection) {
      setSelectedTemplateForDynamic(template)
      setShowDynamicSelectDialog(true)
    } else {
      router.push(`/workspace/${template.id}`)
    }
  }

  return (
    <div className="min-h-screen text-white font-sans selection:bg-primary/30">
      <main className="max-w-[1400px] mx-auto px-6 py-12">
        {/* 导航栏 */}
        <div className="flex justify-end mb-8">
        </div>

        {/* 标题区域 */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-semibold mb-6 tracking-tight bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
            AI对话，秒变设计师
          </h1>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto font-light">
            营销活动素材一站式解决
          </p>
        </div>

        {/* 输入框区域 */}
        <div className="max-w-3xl mx-auto mb-24 relative z-40">
          <div className="glass-card purple-glow rounded-[32px] p-2 shadow-2xl focus-within:border-primary/50 transition-all duration-500">
            <div className="flex flex-col gap-2">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={modeType === 'template' ? "请在'平台业务'中选择模板进行操作" : "请输入您想生成的图片~"}
                disabled={modeType === 'template'}
                className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none text-lg px-6 py-4 min-h-[120px] resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex items-center justify-between px-4 pb-2">
                <div className="flex gap-2">
                  {/* Tab 1: 素材类型/自由生图 - 下拉菜单 */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button 
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors border border-white/5"
                      >
                        <Sparkles size={16} />
                        {modeType === 'freeGenerate' ? (
                          <>自由生图</>
                        ) : selectedPrimaryCategory ? (
                          <>
                            {primaryCategories.find(c => c.id === selectedPrimaryCategory)?.name}
                          </>
                        ) : (
                          <>素材类型</>
                        )}
                        <ChevronRight size={16} className="ml-1" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0 bg-[#1a1625] border-purple-900/30 rounded-lg shadow-xl" align="start">
                      <div className="divide-y divide-purple-900/30">
                        {/* 自由生图选项 */}
                        <button
                          onClick={() => {
                            setModeType('freeGenerate')
                            setSelectedStyle('')
                          }}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-purple-900/20 transition-colors text-left group text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <Wand size={16} className="text-gray-400" />
                            <span className="text-gray-300 group-hover:text-white transition-colors">
                              自由生图
                            </span>
                          </div>
                          {modeType === 'freeGenerate' && (
                            <Check size={16} className="text-primary" />
                          )}
                        </button>
                        
                        {/* 模板类型选项 */}
                        {loadingCategories ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        ) : (
                          primaryCategories.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => {
                                setModeType('template')
                                setSelectedPrimaryCategory(cat.id)
                              }}
                               className="w-full px-4 py-3 flex items-center justify-between hover:bg-purple-900/20 transition-colors text-left group text-sm"
                            >
                              <div className="flex items-center gap-3">
                                <Sparkles size={16} className="text-gray-400" />
                                <span className="text-gray-300 group-hover:text-white transition-colors">
                                  {cat.name}
                                </span>
                              </div>
                              {modeType === 'template' && selectedPrimaryCategory === cat.id && (
                                <Check size={16} className="text-primary" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* 根据模式显示不同的 Tab */}
                  {modeType === 'template' ? (
                    /* Tab 2: 业务平台 - 模板库浮层 */
                    <Dialog open={isTemplateModalOpen} onOpenChange={handleTemplateModalOpenChange}>
                      <DialogTrigger asChild>
                        <button 
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors border border-white/5"
                        >
                          <Grid3X3 size={16} />
                          平台业务
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>选择模板</DialogTitle>
                        </DialogHeader>
                        
                        {loadingTemplates || loadingCategories ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* 分类标签行 */}
                            <div className="flex flex-wrap gap-2 pb-4 border-b border-white/10">
                              <button
                                onClick={() => setSelectedSecondaryCategory('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                  selectedSecondaryCategory === 'all'
                                    ? 'bg-primary text-white'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                }`}
                              >
                                全部
                              </button>
                              {getAvailableSecondaryCategories().map((cat) => (
                                <button
                                  key={cat.id}
                                  onClick={() => setSelectedSecondaryCategory(cat.id)}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    selectedSecondaryCategory === cat.id
                                      ? 'bg-primary text-white'
                                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                  }`}
                                >
                                  {cat.name}
                                </button>
                              ))}
                            </div>

                            {/* 模板网格 */}
                            <div className="max-h-[500px] overflow-y-auto">
                              <div className="grid grid-cols-3 gap-4">
                                {getFilteredTemplates(selectedSecondaryCategory).map((template: Template) => (
                                  <div
                                    key={template.id}
                                    onClick={() => {
                                      handleSelectDesignTemplate(template)
                                      setIsTemplateModalOpen(false)
                                    }}
                                    className="group cursor-pointer relative overflow-hidden rounded-lg border border-white/10 hover:border-primary/50 transition-all"
                                  >
                                    <div className="aspect-[4/3] bg-gray-800 overflow-hidden relative">
                                      <img
                                        src={template.image}
                                        alt={template.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                                        <Button size="sm" className="text-xs">选择</Button>
                                      </div>
                                    </div>
                                    <div className="p-2">
                                      <p className="text-xs text-gray-400 text-center truncate group-hover:text-white transition-colors">
                                        {template.title}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {getFilteredTemplates(selectedSecondaryCategory).length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                  <p>暂无模板</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  ) : (
                    /* 自由生图模式 - 风格、上传图片、上传链接 Tab */
                    <>
                      {/* Tab 2: 风格 */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button 
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors border border-white/5"
                          >
                            <Sparkles size={16} />
                            {selectedStyle || '风格'}
                            <ChevronRight size={16} className="ml-1" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="bottom" avoidCollisions={false} className="w-[500px] p-6 bg-[#1a1625] border-purple-900/30 rounded-xl shadow-2xl max-h-[500px] overflow-y-auto" align="start">
                          <div className="text-base font-bold mb-4 px-1 text-white">选择风格</div>
                          <div className="grid grid-cols-3 gap-4">
                            {[
                              { name: '美食摄影风', image: '/styles/food.png' },
                              { name: '美食布景风', image: '/styles/food-display.png' },
                              { name: '真人实景风', image: '/styles/real-person.png' },
                              { name: '3D场景风', image: '/styles/3d-scene.png' },
                              { name: '3D简约风', image: '/styles/3d-minimal.png' }
                            ].map((style) => (
                              <button
                                key={style.name}
                                onClick={() => setSelectedStyle(style.name)}
                                className={`flex flex-col gap-2 p-2 rounded-xl transition-all group w-full text-left ${
                                  selectedStyle === style.name
                                    ? 'bg-white/10 ring-1 ring-primary/50'
                                    : 'hover:bg-white/5'
                                }`}
                              >
                                {/* 图片容器 */}
                                <div className={`w-full aspect-[16/10] rounded-lg overflow-hidden bg-gray-800 border relative transition-all ${
                                  selectedStyle === style.name
                                    ? 'border-primary shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                                    : 'border-white/10 group-hover:border-white/30'
                                }`}>
                                  <img 
                                    src={style.image} 
                                    alt={style.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    onError={(e) => {
                                       (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                  {/* 选中时的遮罩 */}
                                  {selectedStyle === style.name && (
                                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                      <div className="bg-primary rounded-full p-1 shadow-lg">
                                        <Check size={12} className="text-white" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* 文字 */}
                                <span className={`text-sm font-medium text-center w-full truncate ${
                                  selectedStyle === style.name ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                                }`}>
                                  {style.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* Tab 3: 上传图片 */}
                      <button 
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors border border-white/5"
                      >
                        <Upload size={16} />
                        上传图片
                      </button>

                      {/* Tab 4: 上传链接 */}
                      <button 
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors border border-white/5"
                      >
                        <LinkIcon size={16} />
                        上传链接
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || modeType === 'template'}
                  className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {isGenerating ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-r-transparent" />
                  ) : (
                    <ArrowUp size={24} strokeWidth={3} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 中部网格 */}
        <div className="grid grid-cols-12 gap-8 mb-24">
          {/* 左侧：营销设计AI创作 */}
          <div id="marketing-templates" className="col-span-12 lg:col-span-8 glass-card purple-glow rounded-[40px] p-10 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-10 relative z-10">
              <h2 className="text-2xl font-bold text-white">
                设计模板
              </h2>
            </div>
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                {allTemplates.slice(0, 8).map((item) => (
                  <div key={item.id} onClick={() => handleSelectTemplate(item)} className="group/card cursor-pointer">
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/5 mb-3 relative bg-gray-900 shadow-lg transition-all duration-500 group-hover/card:border-primary/50 group-hover/card:shadow-[0_0_30px_rgba(124,58,237,0.2)]">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700 opacity-80 group-hover/card:opacity-100" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover/card:opacity-40 transition-opacity" />
                    </div>
                    <p className="text-xs text-gray-500 text-center group-hover/card:text-white transition-colors font-medium">{item.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右侧：侧边栏 */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            {/* 设计规范 */}
            <div className="glass-card purple-glow rounded-[40px] p-10 relative overflow-hidden">
              <h2 className="text-xl font-bold mb-8 relative z-10">设计规范</h2>
              <div className="grid grid-cols-2 gap-4 relative z-10">
                {contentData.guidelines.map((guide) => {
                  const Icon = { Zap, Calendar, Layout, UserCheck }[guide.icon] || Layout;
                  return (
                    <Link key={guide.id} href={`/guidelines/${guide.id}`} className="flex flex-col gap-3 p-5 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-primary/30 hover:bg-white/[0.06] transition-all duration-300 group/item">
                      <Icon size={20} className="text-primary group-hover:scale-110 transition-transform" />
                      <div className="space-y-1">
                        <span className="text-sm font-semibold block">{guide.title}</span>
                        <span className="text-[10px] text-gray-500 line-clamp-1 font-light">{guide.description}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 调研报告 */}
            <div className="glass-card purple-glow rounded-[40px] p-10 relative overflow-hidden">
              <h2 className="text-xl font-bold mb-8 relative z-10">调研报告</h2>
              <div className="space-y-5 relative z-10">
                {contentData.reports.map((report) => (
                  <Link key={report.id} href={`/reports/${report.id}`} className="flex items-center gap-5 group/report">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover/report:bg-primary/20 group-hover/report:scale-105 transition-all duration-300">
                      <FileText size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{report.title}</h3>
                        {report.tag && <span className="text-[8px] px-1.5 py-0.5 bg-primary/20 text-primary rounded uppercase font-bold tracking-widest">{report.tag}</span>}
                      </div>
                      <p className="text-[10px] text-gray-500 truncate font-light">{report.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

      </main>

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

      <footer className="border-t border-white/5 py-10 px-6 bg-[#0a0a0c]">
        <div className="max-w-[1400px] mx-auto text-center text-sm text-gray-600 font-light">
          <p>© 2025 美团营销AI智能创作. 用AI创意工具，创造无限可能。</p>
        </div>
      </footer>
    </div>
  )
}