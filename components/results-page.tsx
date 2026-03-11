"use client"
import { useState, useEffect, useRef } from "react"
import { Zap, ImageIcon, Edit3, Maximize2, Sparkles, ChevronDown, Download, MessageSquarePlus, User, Bot, Layers as LayersIcon, Loader2, ClipboardCheck, Image as ImageIcon2, Send, PlayCircle, X, ArrowUp } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { InteractiveResultCanvas } from "@/components/canvas/InteractiveResultCanvas"
import { CustomTemplate } from "@/lib/canvas-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RequirementForm } from "@/components/RequirementForm"
import { UnifiedForm } from "@/components/UnifiedForm"
import { MemberDayForm } from "@/components/MemberDayForm"
import { parseIntent, RequirementData } from "@/lib/intent-parser"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingOverlay } from "@/components/LoadingOverlay"
import { GenerationProgress } from "@/components/GenerationProgress"
import { AgentExecutor } from "@/lib/agent-executor"
import { agentStorage } from "@/lib/agent-storage"

// --- 核心工具函数导出 ---
export const extractCozeFields = (content: string): Record<string, string> => {
  const fields: Record<string, string> = {};
  console.group('🔍 AI 素材解析调试');
  
  const pairRegex = /(?:^|[\s\n，,。；])([^：:\n，,。；！!]{2,20})\s*[:：]\s*(?:[\s\n]*\[?\s*)(https?:\/\/[^\s\n，,；\]\)]+|[^\s\n，,；\]\)]+)/g;
  
  let match;
  while ((match = pairRegex.exec(content)) !== null) {
    const label = match[1].trim();
    let value = match[2].trim();
    
    if (label.toLowerCase().includes('http')) continue;

    if (value.startsWith('http')) {
      const url = value.replace(/\]$/, ''); 
      fields[label] = url;
      console.log(`✅ 匹配到图片: [${label}] -> ${url.slice(0, 50)}...`);
    } else {
      fields[label] = value;
      console.log(`✅ 匹配到文字: [${label}] -> ${value}`);
    }
  }
  
  console.groupEnd();
  return fields;
};

// 1. 定义精准同义词映射（仅用于解决中英文标签不一致的问题）
// 这里的映射必须是绝对等价的，不做模糊猜测
export const EXACT_SYNONYMS: Record<string, string[]> = {
  // 英文标签 -> 中文素材 Key
  'main_image': ['主体', '主体图片', 'main_image'],
  'background_image': ['背景', '背景图片', 'background_image'],
  'main_text': ['标题', '主标题', 'main_text'],
  'sub_text': ['副标题', 'sub_text'],
  'sub_title': ['副标题', 'sub_title'],
  'logo_image': ['logo', 'Logo', 'logo_image'],
  'number_image': ['数字', 'number_image'],
  'decoration_1': ['装饰', '装饰1', 'decoration_1'],
  'decoration_2': ['装饰2', 'decoration_2'],
  'foreground_bar': ['前景条', '前景', 'foreground_bar'],
  
  // 中文标签 -> 英文素材 Key (反向兼容)
  '主体': ['main_image', 'main'],
  '背景': ['background_image', 'bg'],
  '标题': ['main_text', 'title', 'main_title'],
  '主标题': ['main_text', 'title', 'main_title', '标题'],
  '副标题': ['sub_text', 'subtitle'],
  '前景条': ['foreground_bar']
};

// 2. 标签优先的匹配函数（精准同义词版）
export const getAiAsset = (templateLabel: string, aiAssets: Record<string, string>, expectedType?: 'image' | 'text') => {
  if (!templateLabel) return null;

  const cleanLabel = templateLabel.trim();
  
  // 辅助函数：判断是否为图片链接
  const isImageUrl = (val: string) => typeof val === 'string' && (val.startsWith('http') || val.startsWith('/api/proxy') || val.startsWith('data:image'));

  // 策略 1：直接精准匹配 (Key 完全一致)
  if (aiAssets[cleanLabel]) {
    const value = aiAssets[cleanLabel];
    if (checkType(value, expectedType, cleanLabel)) {
      return value;
    }
  }

  // 策略 2：精准同义词匹配
  // 查找该标签是否有定义的同义词
  const synonyms = EXACT_SYNONYMS[cleanLabel];
  if (synonyms) {
    for (const synonym of synonyms) {
      if (aiAssets[synonym]) {
        const value = aiAssets[synonym];
        if (checkType(value, expectedType, synonym)) {
          return value;
        }
      }
    }
  }

  return null;
};

// 辅助函数：类型检查
function checkType(value: string, expectedType: 'image' | 'text' | undefined, label: string): boolean {
  const isImageUrl = (val: string) => typeof val === 'string' && (val.startsWith('http') || val.startsWith('/api/proxy') || val.startsWith('data:image'));
  const isImage = isImageUrl(value);
  
  if (expectedType === 'image' && !isImage) return false;
  if (expectedType === 'text' && isImage) return false;
  return true;
}

const extractImagesFromContent = (content: string): string[] => {
  const images: string[] = []
  const seenUrls = new Set<string>()
  const markdownImageRegex = /!\[.*?\]\((https?:\/\/[^\)\s]+)\)/g
  let match
  while ((match = markdownImageRegex.exec(content)) !== null) {
    let imageUrl = match[1].trim()
    if (!imageUrl.startsWith('http')) continue;
    imageUrl = imageUrl.split(/[^\x21-\x7E]/)[0];
    if (imageUrl && !seenUrls.has(imageUrl)) {
      seenUrls.add(imageUrl)
      images.push(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`)
    }
  }
  return images
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  images?: string[]
  timestamp: number
  isGenerating?: boolean
  statusText?: string
}

export default function ResultsPage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([])
  const [selectedCustomTemplateId, setSelectedCustomTemplateId] = useState<string | null>(null)
  const [currentAssets, setCurrentAssets] = useState<Record<string, string>>({});

  const [activeTab, setActiveTab] = useState("requirement")
  const [requirementData, setRequirementData] = useState<Partial<RequirementData>>({})
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  // 自由生图模式状态
  const [isFreeGenerate, setIsFreeGenerate] = useState(false)
  const [freeGenerateImage, setFreeGenerateImage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/custom-templates').then(res => res.json()).then(data => setCustomTemplates(data))
    
    // 首先检查是否有 Agent 执行请求（来自设计模板）
    const agentExecutionStr = sessionStorage.getItem("agentExecution")
    if (agentExecutionStr) {
      const agentData = JSON.parse(agentExecutionStr)
      console.log('🤖 检测到 Agent 执行请求:', agentData)
      console.log('🔍 agentName:', agentData.agentName)
      
      // 清除可能存在的其他数据，避免冲突
      sessionStorage.removeItem("generationResult")
      sessionStorage.removeItem("agentExecution")
      
      // 触发分析动画
      setIsAnalyzing(true)
      setTimeout(() => setIsAnalyzing(false), 1500)
      
      // 需要查询 Agent 存储来获取 Agent ID
      // 暂时使用 agentName 来识别（后续可以改进）
      // 这里我们假设已经有一个方法来根据 agentName 获取 agentId
      
      // 为了简化，我们直接从 agentStorage 导入并查询
      import('@/lib/agent-storage').then(({ agentStorage }) => {
        // 根据名称查找 Agent
        const allAgents = agentStorage.getAll()
        console.log('🔍 所有 Agents:', allAgents.map((a: any) => a.name))
        console.log('🔍 查找的 agentName:', agentData.agentName)
        
        // 检查是否是特定的 Agent 类型
        const agentTypes = ['18会员日-分会场', '下沉市场-疯狂周末', '外卖-居家', '外卖-夜宵', '外卖-家里聚餐', '外卖-场景', '大字报风格', '会员海报', '18会员日海报'];
        
        // 简化逻辑：只要是特定的 Agent 类型，就显示对应的表单
        if (agentTypes.includes(agentData.agentName)) {
          console.log('✅ 显示对应表单:', agentData.agentName)
          
          // 设置表单类型为模板对应的类型
          setRequirementData({
            type: agentData.agentName
          })
          setActiveTab("requirement")
          setMessages([{ 
            id: 'user_init', 
            role: 'user', 
            content: `请填写 ${agentData.agentName} 的参数`, 
            timestamp: Date.now() 
          }])
        } else {
          // 其他类型的 Agent，正常进入对话界面
          console.log('✅ 其他类型 Agent，进入对话界面')
          setIsFreeGenerate(true)
          setActiveTab("generation")
          setMessages([{ 
            id: 'user_init', 
            role: 'user', 
            content: `启动 ${agentData.agentName} Agent...`, 
            timestamp: Date.now() 
          }])
        }
      })
      return
    }
    
    const resultStr = sessionStorage.getItem("generationResult")
    if (resultStr) {
      // 触发分析动画
      setIsAnalyzing(true);
      setTimeout(() => setIsAnalyzing(false), 1500);

      const result = JSON.parse(resultStr)
      
      // 检查是否是模板模式且需要显示表单（从设计模板直接跳转）
      if (result.isTemplateMode && result.showForm) {
        setRequirementData({
          type: result.type,
          templateId: result.templateId
        })
        setSelectedCustomTemplateId(result.templateId || null)
        setActiveTab("requirement")  // 展示表单
        return
      }
      
      // 检查是否是自由生图模式且需要显示表单
      if (result.isFreeGenerate && result.showForm) {
        setIsFreeGenerate(true)
        setActiveTab("requirement")  // 展示表单
        setMessages([{ 
          id: 'user_init', 
          role: 'user', 
          content: result.prompt, 
          timestamp: Date.now() 
        }])
        return
      }
      
      // 检查是否需要使用 Agent
      if (result.isFreeGenerate && result.useAgent && result.agentId) {
        setIsFreeGenerate(true)
        setActiveTab("generation")
        setMessages([{ 
          id: 'user_init', 
          role: 'user', 
          content: result.prompt, 
          timestamp: Date.now() 
        }])
        
        // 显示加载状态
        setMessages(prev => [...prev, {
          id: 'assistant_loading',
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isGenerating: true,
          statusText: '正在处理请求...'
        }])
        
        // 后台执行 Agent
        AgentExecutor.execute({
          agentId: result.agentId,
          userInput: result.prompt,
        }).then(agentResult => {
          console.log('🎯 Agent 执行结果:', agentResult)
          
          if (agentResult.success && agentResult.output) {
            // 提取图片 URL，支持多种格式
            let imageUrl = null
            const output = agentResult.output
            
            // 格式 1: 直接是 URL 字符串
            if (typeof output === 'string' && output.includes('http')) {
              imageUrl = output.match(/https?:\/\/[^\s"'`]+/)?.[0]
              console.log('✅ 格式1：直接URL字符串', imageUrl)
            } 
            // 格式 2: 对象中有 imageUrl 字段
            else if (typeof output === 'object' && output.imageUrl) {
              imageUrl = output.imageUrl
              console.log('✅ 格式2：对象中的 imageUrl', imageUrl)
            }
            // 格式 3: 对象中有 url 字段
            else if (typeof output === 'object' && output.url) {
              imageUrl = output.url
              console.log('✅ 格式3：对象中的 url', imageUrl)
            }
            // 格式 4: 从对象中提取第一个 URL
            else if (typeof output === 'object') {
              // 尝试从对象值中找到第一个 URL
              for (const val of Object.values(output)) {
                if (typeof val === 'string' && val.includes('http')) {
                  imageUrl = val.match(/https?:\/\/[^\s"'`]+/)?.[0]
                  if (imageUrl) {
                    console.log('✅ 格式4：从对象值中提取', imageUrl)
                    break
                  }
                }
              }
            }
            // 格式 5: 在字符串中搜索 URL
            else if (typeof output === 'string') {
              imageUrl = output.match(/https?:\/\/[^\s"'`]+/)?.[0]
              if (imageUrl) {
                console.log('✅ 格式5：从文本中提取URL', imageUrl)
              }
            }
            
            if (imageUrl) {
              console.log('🖼️ 最终获取的图片URL:', imageUrl)
              setFreeGenerateImage(imageUrl)
              setMessages(prev => prev.map(m => 
                m.id === 'assistant_loading' 
                  ? {
                      ...m,
                      id: 'assistant_init',
                      content: '已为你生成结果',
                      images: [imageUrl],
                      isGenerating: false,
                      statusText: undefined
                    }
                  : m
              ))
            } else {
              console.warn('⚠️ 未找到图片URL，输出内容:', output)
              setMessages(prev => prev.map(m => 
                m.id === 'assistant_loading' 
                  ? {
                      ...m,
                      content: '已生成描述，但未获取到图片 URL。输出：' + JSON.stringify(output).slice(0, 100),
                      isGenerating: false,
                      statusText: undefined
                    }
                  : m
              ))
            }
          } else {
            console.error('❌ Agent 执行失败:', agentResult.error)
            setMessages(prev => prev.map(m => 
              m.id === 'assistant_loading' 
                ? {
                    ...m,
                    content: '处理失败：' + (agentResult.error || '未知错误'),
                    isGenerating: false,
                    statusText: undefined
                  }
                : m
            ))
          }
        })
        return
      }
      
      // 检查是否是自由生图模式（直接API调用）
      if (result.isFreeGenerate) {
        setIsFreeGenerate(true)
        setActiveTab("generation")
        setMessages([{ 
          id: 'user_init', 
          role: 'user', 
          content: result.prompt, 
          timestamp: Date.now() 
        }])
        
        // 如果已经有图片，直接显示
        if (result.imageUrl) {
          setFreeGenerateImage(result.imageUrl)
          setMessages(prev => [...prev, {
            id: 'assistant_init',
            role: 'assistant',
            content: '已为你生成图片',
            images: [result.imageUrl],
            timestamp: Date.now()
          }])
        } else {
          // 否则显示加载状态
          setMessages(prev => [...prev, {
            id: 'assistant_loading',
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            isGenerating: true,
            statusText: '正在生成图片...'
          }])
        }
        return
      }
      
      if (result.isPreset) {
        setRequirementData(result)
        setSelectedCustomTemplateId(customTemplates.find(t => t.name.includes(result.type))?.id || null)
        setMessages([{ id: 'user_init', role: 'user', content: `我想要生成：${result.copywriting}`, timestamp: Date.now() }])
      } else if (result.prompt) {
        const parsed = parseIntent(result.prompt)
        setRequirementData(parsed)
        setMessages([{ id: 'user_init', role: 'user', content: result.prompt, timestamp: Date.now() }])
      }
    }
  }, [customTemplates.length])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])
  
  // 监听 storage 事件以获取图片更新
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'generationResult' && e.newValue && isFreeGenerate && !freeGenerateImage) {
        try {
          const result = JSON.parse(e.newValue)
          if (result.isFreeGenerate && result.imageUrl) {
            setFreeGenerateImage(result.imageUrl)
            // 更新消息，替换加载状态
            setMessages(prev => prev.map(m => 
              m.id === 'assistant_loading' 
                ? {
                    ...m,
                    id: 'assistant_init',
                    content: '已为你生成图片',
                    images: [result.imageUrl],
                    isGenerating: false,
                    statusText: undefined
                  }
                : m
            ))
          }
        } catch (error) {
          console.error('处理 storage 事件失败:', error)
        }
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [isFreeGenerate, freeGenerateImage])

  // 自动匹配静态模板
  useEffect(() => {
    if (requirementData.layout && customTemplates.length > 0) {
      const layoutMap: Record<string, string> = {
        '居中构图': 'center',
        '上下构图': 'top-bottom',
        '左右构图': 'left-right',
        'center': 'center',
        'top-bottom': 'top-bottom',
        'left-right': 'left-right'
      };
      const targetLayout = layoutMap[requirementData.layout] || 'center';
      
      // 查找匹配的模板
      const matchedTemplate = customTemplates.find(t => t.layout === targetLayout);
      
      if (matchedTemplate) {
        console.log(`✅ [自动匹配] 找到静态模板: ${matchedTemplate.name} (${matchedTemplate.id})`);
        setSelectedCustomTemplateId(matchedTemplate.id);
      } else {
        console.warn(`⚠️ [自动匹配] 未找到构图为 [${targetLayout}] 的静态模板`);
      }
    }
  }, [requirementData.layout, customTemplates]);

  const handleFormSubmit = async (data: any) => {
    setCurrentAssets({}); // 清空之前的素材
    
    console.group('🎬 [新对话开始] 表单提交');
    console.log('对话类型:', data.type);
    console.log('表单数据:', data);
    console.groupEnd();
    
    // 检查是否是特定 Agent 类型
    const agentTypes = ['18会员日-分会场', '下沉市场-疯狂周末', '外卖-居家', '外卖-夜宵', '外卖-家里聚餐', '外卖-场景', '大字报风格', '会员海报'];
    if (agentTypes.includes(data.type)) {
      console.log(`🎯 检测到 ${data.type} Agent 表单提交`);
      console.log('📋 表单数据:', {
        type: data.type,
        activityDescription: data.activityDescription,
        productImage: data.productImage ? '✓ 已上传' : '✗ 未上传',
        sceneImage: data.sceneImage ? '✓ 已上传' : '✗ 未上传'
      });
      
      // 获取对应的 Agent
      const allAgents = agentStorage.getAll();
      console.log(`🔍 [Agent 查找] 系统中现有 Agents:`, allAgents.length);
      console.log(`📋 [Agent 查找] 所有 Agent 名称:`, allAgents.map(a => ({ name: a.name, enabled: a.enabled, id: a.id })));
      
      // 使用 trim() 处理可能存在的空格
      const agent = allAgents.find((a: any) => (a.name || '').trim() === data.type);
      console.log(`🔍 查找 Agent，找到结果:`, agent ? `✅ 找到 Agent: ${agent.name} (ID: ${agent.id})` : `❌ 未找到 Agent: ${data.type}`);
      
      if (agent) {
        console.log(`✅ Agent 详细信息:`, {
          id: agent.id,
          name: agent.name,
          enabled: agent.enabled,
          primaryApiId: agent.primaryApiId,
          pluginIds: agent.pluginIds
        });
      } else {
        console.warn(`⚠️ Agent 搜索详情:`);
        console.warn(`   查找的名称: "${data.type}"`);
        console.warn(`   系统中所有 Agent 的 name 字段:`);
        allAgents.forEach((a, idx) => {
          console.warn(`     [${idx}] name="${a.name}" (类型: ${typeof a.name}, 长度: ${a.name?.length})`);
        });
        console.warn(`   精确匹配测试:`);
        allAgents.forEach(a => {
          const exact = a.name === data.type;
          const includes = a.name?.includes(data.type);
          console.warn(`     "${a.name}" === "${data.type}" ? ${exact}, includes? ${includes}`);
        });
      }
      
      if (agent && agent.enabled) {
        // 构建提示词 - 包含完整的表单信息
        const structuredPrompt = `
活动描述：${data.activityDescription || '生成一张图片'}
        `.trim();
        
        // 记录上传的图片信息
        console.log('📸 上传图片信息:');
        console.log('  - 商品图:', data.productImage ? '✓ 已上传' : '✗ 未上传');
        console.log('  - 场景/人像图:', data.sceneImage ? '✓ 已上传' : '✗ 未上传');
        
        setMessages(prev => [...prev, { 
          id: `user_${Date.now()}`, 
          role: 'user', 
          content: `📋 ${data.type} 表单信息\n\n活动描述：${data.activityDescription}\n\n📸 已上传图片：${data.productImage ? '商品图 ✓' : ''} ${data.sceneImage ? '场景图 ✓' : ''}`, 
          timestamp: Date.now() 
        }]);
        
        // 显示加载状态
        const loadingMessageId = `assistant_loading_${Date.now()}`;
        const statusTextMap: Record<string, string> = {
          '18会员日-分会场': '✨ AI 正在为您生成会员日专题页面...',
          '下沉市场-疯狂周末': '✨ AI 正在为您生成下沉市场促销页面...'
        };
        
        setMessages(prev => [...prev, {
          id: loadingMessageId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isGenerating: true,
          statusText: statusTextMap[data.type] || '✨ AI 正在为您生成页面...'
        }]);
        
        // 执行 Agent，传递上传的图片和完整的表单数据
        setActiveTab("generation");
        // 设置为自由生图模式，这样生成的图片会显示在左侧
        setIsFreeGenerate(true);
        AgentExecutor.execute({
          agentId: agent.id,
          userInput: structuredPrompt,
          uploadedImages: {
            productImage: data.productImage || undefined,
            sceneImage: data.sceneImage || undefined
          }
        }).then(agentResult => {
          console.log(`🎯 ${data.type} Agent 执行结果:`, agentResult);
          
          if (agentResult.success && agentResult.output) {
            // 提取图片 URL
            let imageUrl = null;
            const output = agentResult.output;
            
            // 格式 1: 直接是 URL 字符串
            if (typeof output === 'string' && output.includes('http')) {
              imageUrl = output.match(/https?:\/\/[^\s"'`]+/)?.[0];
            } 
            // 格式 2: 对象中有 imageUrl 字段
            else if (typeof output === 'object' && output.imageUrl) {
              imageUrl = output.imageUrl;
            }
            // 格式 3: 对象中有 url 字段
            else if (typeof output === 'object' && output.url) {
              imageUrl = output.url;
            }
            // 格式 4: 从对象中提取第一个 URL
            else if (typeof output === 'object') {
              for (const val of Object.values(output)) {
                if (typeof val === 'string' && val.includes('http')) {
                  imageUrl = val.match(/https?:\/\/[^\s"'`]+/)?.[0];
                  if (imageUrl) break;
                }
              }
            }
            // 格式 5: 在字符串中搜索 URL
            else if (typeof output === 'string') {
              imageUrl = output.match(/https?:\/\/[^\s"'`]+/)?.[0];
            }
            
            if (imageUrl) {
              console.log('🖼️ 成功获取图片:', imageUrl);
              setFreeGenerateImage(imageUrl);
              setMessages(prev => prev.map(m => 
                m.id === loadingMessageId
                  ? {
                      ...m,
                      content: `✨ ${data.type}已生成！`,
                      images: [imageUrl],
                      isGenerating: false,
                      statusText: undefined
                    }
                  : m
              ));
            } else {
              console.warn('⚠️ 未找到图片URL，输出:', output);
              setMessages(prev => prev.map(m => 
                m.id === loadingMessageId
                  ? {
                      ...m,
                      content: '生成完成，但未获取到图片 URL',
                      isGenerating: false,
                      statusText: undefined
                    }
                  : m
              ));
            }
          } else {
            console.error('❌ Agent 执行失败:', agentResult.error);
            setMessages(prev => prev.map(m => 
              m.id === loadingMessageId
                ? {
                    ...m,
                    content: '处理失败：' + (agentResult.error || '未知错误'),
                    isGenerating: false,
                    statusText: undefined
                  }
                : m
            ));
          }
        });
        return;
      } else {
        // Agent 不存在或未启用，提示用户
        console.error(`❌ Agent "${data.type}" 不存在或未启用`);
        setMessages(prev => [...prev, { 
          id: `error_${Date.now()}`, 
          role: 'assistant', 
          content: `⚠️ Agent "${data.type}" 还未配置或未启用，请先在 Agent 管理中创建并启用此 Agent`, 
          timestamp: Date.now() 
        }]);
        return;
      }
    }
    
    // 如果从 MemberDayForm 切换到其他表单类型，使用 isFreeGenerate 流程
    if (data.type === '大促会场one' || data.type === '会员分会场') {
      console.log('🔄 从 MemberDayForm 切换到:', data.type);
      // 更新表单数据并保持在表单页面
      setRequirementData(data);
      return;
    }
    
    // 检查是否是自由生图模式
    if (isFreeGenerate) {
      // 自由生图模式：获取 Agent 并调用
      const agent = agentStorage.getByTriggerSource('自由生图')
      
      if (agent && agent.enabled) {
        // 构建提示词：结合描述、业务和尺寸信息
        const structuredPrompt = `
          活动描述：${data.description || '生成一张图片'}
          所属业务：${data.business || '外卖'}
          尺寸要求：${data.size || '中尺寸'}
        `.trim()
        
        setMessages(prev => [...prev, { 
          id: `user_${Date.now()}`, 
          role: 'user', 
          content: data.description || '生成一张图片', 
          timestamp: Date.now() 
        }]);
        
        // 显示加载状态
        const loadingMessageId = `assistant_loading_${Date.now()}`
        setMessages(prev => [...prev, {
          id: loadingMessageId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isGenerating: true,
          statusText: '✨ AI 正在为您生成图片...'
        }])
        
        // 执行 Agent
        setActiveTab("generation")
        AgentExecutor.execute({
          agentId: agent.id,
          userInput: structuredPrompt,
        }).then(agentResult => {
          console.log('🎯 自由生图 Agent 执行结果:', agentResult)
          
          if (agentResult.success && agentResult.output) {
            // 提取图片 URL
            let imageUrl = null
            const output = agentResult.output
            
            // 格式 1: 直接是 URL 字符串
            if (typeof output === 'string' && output.includes('http')) {
              imageUrl = output.match(/https?:\/\/[^\s"'`]+/)?.[0]
            } 
            // 格式 2: 对象中有 imageUrl 字段
            else if (typeof output === 'object' && output.imageUrl) {
              imageUrl = output.imageUrl
            }
            // 格式 3: 对象中有 url 字段
            else if (typeof output === 'object' && output.url) {
              imageUrl = output.url
            }
            // 格式 4: 从对象中提取第一个 URL
            else if (typeof output === 'object') {
              for (const val of Object.values(output)) {
                if (typeof val === 'string' && val.includes('http')) {
                  imageUrl = val.match(/https?:\/\/[^\s"'`]+/)?.[0]
                  if (imageUrl) break
                }
              }
            }
            // 格式 5: 在字符串中搜索 URL
            else if (typeof output === 'string') {
              imageUrl = output.match(/https?:\/\/[^\s"'`]+/)?.[0]
            }
            
            if (imageUrl) {
              console.log('🖼️ 成功获取图片:', imageUrl)
              setFreeGenerateImage(imageUrl)
              setMessages(prev => prev.map(m => 
                m.id === loadingMessageId
                  ? {
                      ...m,
                      content: '✨ 图片已生成！',
                      images: [imageUrl],
                      isGenerating: false,
                      statusText: undefined
                    }
                  : m
              ))
            } else {
              console.warn('⚠️ 未找到图片URL，输出:', output)
              setMessages(prev => prev.map(m => 
                m.id === loadingMessageId
                  ? {
                      ...m,
                      content: '生成完成，但未获取到图片 URL',
                      isGenerating: false,
                      statusText: undefined
                    }
                  : m
              ))
            }
          } else {
            console.error('❌ Agent 执行失败:', agentResult.error)
            setMessages(prev => prev.map(m => 
              m.id === loadingMessageId
                ? {
                    ...m,
                    content: '处理失败：' + (agentResult.error || '未知错误'),
                    isGenerating: false,
                    statusText: undefined
                  }
                : m
            ))
          }
        })
        return
      }
    }
    
    // 原有逻辑：模板模式
    setRequirementData(data)
    setActiveTab("generation")
    const structuredPrompt = `类型：${data.type}，文案：${data.copywriting}，尺寸：${data.size}，版式：${data.layout}，业务：${data.business}，颜色：${data.color}，风格：${data.style}`;
    
    setMessages(prev => [...prev, { 
      id: `user_${Date.now()}`, 
      role: 'user', 
      content: structuredPrompt, 
      timestamp: Date.now() 
    }]);

    await executeSendMessage(structuredPrompt)
  }

  // 检测是否是第二次或之后的对话（有前一张图片）
  const isFollowUpMessage = () => {
    // 统计用户消息数量（不包括系统消息）
    const userMessageCount = messages.filter(m => m.role === 'user').length;
    // 如果有前一张图片且不是第一条用户消息，则是 follow-up
    return freeGenerateImage && userMessageCount > 0;
  }

  // 将图片 URL 转换为 Base64
  const urlToBase64 = async (imageUrl: string): Promise<string> => {
    try {
      console.log('🔄 开始转换图片为 Base64:', imageUrl);
      
      // 如果是远程 URL，使用代理服务绕过 CORS
      let fetchUrl = imageUrl;
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        if (!imageUrl.includes('localhost') && !imageUrl.includes('127.0.0.1')) {
          // 远程 URL，使用代理
          fetchUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
          console.log('📡 使用代理 API:', fetchUrl);
        }
      }
      
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`获取图片失败: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          console.log('✅ Base64 转换成功，大小:', result.length);
          resolve(result);
        };
        reader.onerror = () => {
          console.error('❌ FileReader 错误:', reader.error);
          reject(reader.error);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('❌ 图片转 Base64 失败:', error);
      throw error;
    }
  }

  // 调用图生图 API
  const callImageToImageAPI = async (baseImageBase64: string, prompt: string) => {
    try {
      console.log('🖼️ [图生图] 调用"图生图-单张图生成单张图" API');
      console.log('📝 用户提示词:', prompt);
      console.log('🖼️ Base64 图片长度:', baseImageBase64.length);
      
      // 获取预设的图生图 API
      const imageToImageApis = agentStorage.getAllApis().filter(api => 
        api.name.includes('图生图') && api.name.includes('单张')
      );
      
      if (imageToImageApis.length === 0) {
        throw new Error('未找到"图生图-单张图生成单张图" API');
      }
      
      const imageToImageApi = imageToImageApis[0];
      console.log('📌 使用 API:', imageToImageApi.name, imageToImageApi.endpoint);
      console.log('📦 API 预设参数:', imageToImageApi.body);
      
      // 构建请求体 - 先放 API 预设参数，再用用户数据覆盖
      const requestBody = {
        ...(imageToImageApi.body || {}),  // 先放 API 预设参数
        image: baseImageBase64,           // 用用户的 Base64 图片覆盖预设的 image
        prompt: prompt,                   // 用用户的提示词覆盖预设的 prompt
      };
      
      console.log('📤 请求体关键字段:', {
        imageLength: requestBody.image?.length,
        promptLength: requestBody.prompt?.length,
        prompt: requestBody.prompt,
        imageStart: requestBody.image?.substring(0, 50),
        otherKeys: Object.keys(requestBody).filter(k => k !== 'image')
      });
      
      console.log('🔍 完整请求体对比:', {
        原始Image: imageToImageApi.body?.image?.substring?.(0, 50),
        新Image: baseImageBase64.substring(0, 50),
        原始Prompt: imageToImageApi.body?.prompt,
        新Prompt: prompt
      });
      
      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // 处理认证
      if (imageToImageApi.authType === 'bearer' && imageToImageApi.authKey) {
        headers['Authorization'] = `Bearer ${imageToImageApi.authKey}`;
      } else if (imageToImageApi.authType === 'api-key' && imageToImageApi.authKey) {
        headers['X-API-Key'] = imageToImageApi.authKey;
      }
      
      // 合并 API 预设头部
      Object.assign(headers, imageToImageApi.headers);
      
      console.log('🔐 请求头:', headers);
      
      const response = await fetch(imageToImageApi.endpoint, {
        method: imageToImageApi.method || 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ 图生图 API 返回结果:', result);
      console.log('📋 响应结构分析:', {
        type: typeof result,
        keys: typeof result === 'object' ? Object.keys(result) : 'N/A',
        stringified: JSON.stringify(result).slice(0, 500)
      });
      
      // 提取图片 URL
      let imageUrl = null;
      
      // 策略 1: 直接是 URL 字符串
      if (typeof result === 'string' && result.includes('http')) {
        imageUrl = result.match(/https?:\/\/[^\s"'`]+/)?.[0];
        console.log('✅ 策略1：直接 URL 字符串');
      } 
      // 策略 2: result.imageUrl
      else if (result?.imageUrl) {
        imageUrl = result.imageUrl;
        console.log('✅ 策略2：result.imageUrl');
      } 
      // 策略 3: result.url
      else if (result?.url) {
        imageUrl = result.url;
        console.log('✅ 策略3：result.url');
      } 
      // 策略 4: result.data.imageUrl
      else if (result?.data?.imageUrl) {
        imageUrl = result.data.imageUrl;
        console.log('✅ 策略4：result.data.imageUrl');
      } 
      // 策略 5: result.data.url
      else if (result?.data?.url) {
        imageUrl = result.data.url;
        console.log('✅ 策略5：result.data.url');
      } 
      // 策略 6: result.data 是数组，取第一个
      else if (Array.isArray(result?.data) && result.data.length > 0) {
        const firstItem = result.data[0];
        if (firstItem?.image_url) {
          imageUrl = firstItem.image_url;
          console.log('✅ 策略6a：result.data[0].image_url');
        } else if (firstItem?.url) {
          imageUrl = firstItem.url;
          console.log('✅ 策略6b：result.data[0].url');
        } else if (typeof firstItem === 'string' && firstItem.includes('http')) {
          imageUrl = firstItem;
          console.log('✅ 策略6c：result.data[0] 是 URL 字符串');
        }
      }
      // 策略 7: result.images 数组
      else if (Array.isArray(result?.images) && result.images.length > 0) {
        imageUrl = result.images[0];
        console.log('✅ 策略7：result.images[0]');
      }
      // 策略 8: 遍历所有值查找 URL
      else if (typeof result === 'object') {
        const searchUrl = (obj: any, depth = 0): string | null => {
          if (depth > 3) return null;
          if (!obj) return null;
          
          if (typeof obj === 'string' && obj.includes('http')) {
            return obj;
          }
          
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const found = searchUrl(item, depth + 1);
              if (found) return found;
            }
          }
          
          if (typeof obj === 'object') {
            for (const val of Object.values(obj)) {
              const found = searchUrl(val, depth + 1);
              if (found) return found;
            }
          }
          
          return null;
        };
        
        imageUrl = searchUrl(result);
        if (imageUrl) {
          console.log('✅ 策略8：递归查找 URL');
        }
      }
      
      if (!imageUrl) {
        console.error('❌ 无法从 API 响应中提取图片 URL，完整响应:', JSON.stringify(result, null, 2));
        throw new Error('无法从 API 响应中提取图片 URL');
      }
      
      console.log('🖼️ 获取到新图片:', imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('❌ 图生图 API 调用失败:', error);
      throw error;
    }
  }

  const executeSendMessage = async (textToSend: string) => {
    if (isGenerating) return
    setIsGenerating(true)

    const loadingId = `loading_${Date.now()}`
    setMessages(prev => [...prev, { id: loadingId, role: 'assistant', content: '', timestamp: Date.now(), isGenerating: true, statusText: '正在唤醒 AI 创作助手...' }])

    const updateStatus = (text: string) => {
      setMessages(prev => prev.map(m => m.id === loadingId ? { ...m, statusText: text } : m))
    }

    try {
      // 检测是否是 follow-up 消息（第二次及以后的对话）
      if (isFollowUpMessage()) {
        console.log('📍 检测到 follow-up 消息，使用图生图 API');
        
        // 先添加用户消息
        setMessages(prev => [...prev, { 
          id: `user_${Date.now()}`, 
          role: 'user', 
          content: textToSend, 
          timestamp: Date.now() 
        }]);
        
        // 清空输入框
        setPrompt("");
        
        updateStatus('✨ 正在基于前一张图片进行优化...');
        
        // 转换图片为 Base64
        updateStatus('🔄 正在加载前一张图片...');
        const baseImageBase64 = await urlToBase64(freeGenerateImage!);
        
        // 调用图生图 API
        updateStatus('🎨 AI 正在根据您的需求优化图片...');
        const newImageUrl = await callImageToImageAPI(baseImageBase64, textToSend);
        
        // 更新图片和消息
        setFreeGenerateImage(newImageUrl);
        setMessages(prev => prev.map(m => 
          m.id === loadingId
            ? {
                ...m,
                id: `image_to_image_${Date.now()}`,
                content: '✨ 图片已更新！',
                images: [newImageUrl],
                isGenerating: false,
                statusText: undefined
              }
            : m
        ));
        
        setIsGenerating(false);
        return;
      }

      // 本地模式：已移除 Coze API 调用
      updateStatus('使用本地模板和预设素材...')
      const detailsArray = []
      
       const newMessages: Message[] = []
       for (const item of detailsArray) {
         if (item.role === "assistant" && item.type === "answer" && typeof item.content === "string") {
           const images = extractImagesFromContent(item.content)
           const newAssets = extractCozeFields(item.content);
           
           // 📦 更新临时仓库，显示新增素材
           setCurrentAssets(prev => {
             const updatedAssets = { ...prev, ...newAssets };
             console.group('📦 [临时仓库更新] AI 生成新素材');
             console.log(`新增素材数: ${Object.keys(newAssets).length}`);
             console.table(Object.entries(newAssets).map(([key, value]) => ({
               '素材标签': key,
               '类型': typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:image')) ? '图片' : '文字',
               '内容预览': typeof value === 'string' ? (value.length > 60 ? value.substring(0, 60) + '...' : value) : String(value)
             })));
             console.log('📦 [临时仓库总览] 当前仓库全量素材:');
             console.table(Object.entries(updatedAssets).map(([key, value]) => ({
               '素材标签': key,
               '类型': typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:image')) ? '图片' : '文字',
               '内容预览': typeof value === 'string' ? (value.length > 60 ? value.substring(0, 60) + '...' : value) : String(value)
             })));
             console.groupEnd();
             return updatedAssets;
           });
           
           newMessages.push({ id: `${chatId}_${item.id}`, role: 'assistant', content: item.content, images: images.length > 0 ? images : undefined, timestamp: Date.now() })
         }
       }
       setMessages(prev => [...prev.filter(m => m.id !== loadingId), ...newMessages])
    } catch (error) {
      console.error('❌ 消息处理失败:', error);
      setMessages(prev => [...prev.filter(m => m.id !== loadingId), { id: `err_${Date.now()}`, role: 'assistant', content: `处理失败：${error instanceof Error ? error.message : '未知错误'}`, timestamp: Date.now() }])
    } finally {
      setIsGenerating(false)
    }
  }

  const latestAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant' && !m.isGenerating);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-foreground flex flex-col overflow-hidden">
      <LoadingOverlay isVisible={isAnalyzing} />
      
      <div className="flex-1 flex overflow-hidden max-w-[1600px] mx-auto w-full">
        <div className="flex-1 flex flex-col border-r border-white/5 bg-[#0f0f12]">
          <div className="p-6 flex justify-center">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-fit">
              <TabsList className="bg-black/40 border border-white/5 p-1 rounded-full">
                <TabsTrigger value="requirement" className="rounded-full px-8 data-[state=active]:bg-primary data-[state=active]:text-white">需求确认</TabsTrigger>
                <TabsTrigger value="generation" className="rounded-full px-8 data-[state=active]:bg-primary data-[state=active]:text-white">图片生成</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto px-12 no-scrollbar">
            <Tabs value={activeTab} className="w-full h-full">
              <TabsContent value="requirement" className="mt-0 focus-visible:outline-none">
                <div className="bg-white/[0.02] backdrop-blur-md rounded-[32px] border border-white/5 p-8 mb-12">
{(requirementData.type === '18会员日-分会场' || requirementData.type === '下沉市场-疯狂周末' || requirementData.type === '外卖-居家' || requirementData.type === '外卖-夜宵' || requirementData.type === '外卖-家里聚餐' || requirementData.type === '外卖-场景' || requirementData.type === '大字报风格' || requirementData.type === '18会员日海报') ? (
<MemberDayForm initialData={requirementData} onSubmit={handleFormSubmit} />
) : isFreeGenerate ? (
                     <UnifiedForm initialData={requirementData} onSubmit={handleFormSubmit} isFreeGenerate={true} />
                   ) : (
                     <RequirementForm initialData={requirementData} onSubmit={handleFormSubmit} />
                   )}
                </div>
              </TabsContent>
              <TabsContent value="generation" className="mt-0 focus-visible:outline-none h-full">
                {isGenerating ? (
                  <GenerationProgress isGenerating={isGenerating} />
                ) : isFreeGenerate && freeGenerateImage ? (
                  // 自由生图模式：直接显示生成的图片
                  <div className="h-full flex flex-col items-center justify-center p-8">
                    <div className="w-full max-w-2xl">
                      <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                        <img 
                          src={freeGenerateImage} 
                          alt="AI Generated" 
                          className="w-full h-auto"
                        />
                      </div>
                      <div className="mt-6 flex justify-center gap-4">
                        <a 
                          href={freeGenerateImage} 
                          download="generated-image.png"
                          className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                          <Download size={18} />
                          下载图片
                        </a>
                      </div>
                    </div>
                  </div>
                ) : latestAssistantMessage && selectedCustomTemplateId ? (
                  <div className="h-full py-4">
                    {customTemplates.find(t => t.id === selectedCustomTemplateId) && (
                      <InteractiveResultCanvas 
                        template={customTemplates.find(t => t.id === selectedCustomTemplateId)!}
                        aiAssets={currentAssets}
                        onGenerateLottie={async (finalLayers) => {
                          const assets: Record<string, string> = { ...currentAssets };
                          finalLayers.forEach(l => {
                            const value = l.type === 'text' ? (l.content || '') : (l.src || '');
                            if (l.cozeField) assets[l.cozeField] = value;
                            if (l.name && !assets[l.name]) assets[l.name] = value;
                          });

                          sessionStorage.setItem('pendingAssets', JSON.stringify(assets));
                          
                          // 自动匹配动效模板逻辑
                          try {
                            // 1. 获取所有动效模板
                            const res = await fetch('/api/lottie/templates');
                            if (!res.ok) throw new Error('Failed to fetch templates');
                            const templates = await res.json();
                            
                            // 2. 根据表单选择的 layout 进行匹配
                            // 注意：requirementData.layout 的值可能是中文（如"居中构图"），需要映射到英文 key
                            const layoutMap: Record<string, string> = {
                              '居中构图': 'center',
                              '上下构图': 'top-bottom',
                              '左右构图': 'left-right',
                              'center': 'center',
                              'top-bottom': 'top-bottom',
                              'left-right': 'left-right'
                            };
                            
                            const targetLayout = layoutMap[requirementData.layout || ''] || 'center';
                            console.log(`🔍 [自动匹配] 寻找构图为 [${targetLayout}] 的动效模板...`);
                            
                            const matchedTemplate = templates.find((t: any) => t.layout === targetLayout);
                            
                            if (matchedTemplate) {
                              console.log(`✅ [自动匹配] 找到模板: ${matchedTemplate.name} (${matchedTemplate.id})`);
                              router.push(`/lottie-templates/${matchedTemplate.id}?from=generator`);
                            } else {
                              console.warn(`⚠️ [自动匹配] 未找到构图为 [${targetLayout}] 的模板，跳转到列表页`);
                              router.push('/lottie-templates?from=generator');
                            }
                          } catch (e) {
                            console.error('❌ [自动匹配] 发生错误:', e);
                            router.push('/lottie-templates?from=generator');
                          }
                        }}
                        onUpdateAssets={(newAssets) => {
                          setCurrentAssets(prev => ({ ...prev, ...newAssets }));
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 py-20">
                    <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center mb-6 border border-white/5">
                      <ImageIcon2 size={40} className="opacity-20" />
                    </div>
                    <p className="text-lg font-medium text-gray-400">确认需求后，生成的图片将显示在这里</p>
                    {!selectedCustomTemplateId && (
                      <div className="mt-6 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 text-orange-400/80 text-sm flex items-center gap-2">
                        <Zap size={16} />
                        提示：请在右侧底部选择一个“静态模板”
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="w-[450px] flex flex-col bg-[#0a0a0c]">
          <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-[0_0_15px_rgba(120,50,255,0.1)]">
                    <Bot size={20} className="text-primary" />
                  </div>
                )}
                <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-5 py-4 rounded-[24px] text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white rounded-tr-sm shadow-[0_10px_30px_rgba(120,50,255,0.2)]' 
                      : 'bg-white/[0.03] border border-white/5 text-gray-300 rounded-tl-sm backdrop-blur-md'
                  }`}>
                    {msg.isGenerating ? (
                      <div className="flex items-center gap-3 font-medium">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" /> 
                        {msg.statusText}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">
                        {msg.content.replace(/!\[.*?\]\(.*?\)/g, '').trim() || (msg.images?.length ? '已为你生成素材' : msg.content)}
                      </div>
                    )}
                  </div>
                  {msg.images && msg.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {msg.images.map((img, i) => (
                        <div key={i} className="rounded-xl overflow-hidden border border-white/5 shadow-lg">
                          <img src={img} alt="AI Generated" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-8 border-t border-white/5 bg-[#0a0a0c]/50 backdrop-blur-xl space-y-6">
            <div className="relative group">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); executeSendMessage(prompt); } }}
                placeholder="请输入您想生成的图片~"
                className="w-full bg-white/[0.03] border border-white/10 rounded-[24px] p-5 pr-14 text-base focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all min-h-[120px] resize-none shadow-inner"
              />
              <Button 
                size="icon" 
                onClick={() => executeSendMessage(prompt)} 
                disabled={isGenerating || !prompt.trim()} 
                className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white text-black hover:bg-gray-200 shadow-lg transition-all active:scale-90 disabled:opacity-30"
              >
                <ArrowUp size={20} strokeWidth={3} />
              </Button>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 px-4 py-3 rounded-2xl text-xs text-gray-400 hover:bg-white/[0.04] transition-colors group">
                <LayersIcon size={16} className="text-primary/60 group-hover:text-primary transition-colors" />
                <span className="font-medium">静态模板:</span>
                <Select value={selectedCustomTemplateId || 'none'} onValueChange={(v) => setSelectedCustomTemplateId(v === 'none' ? null : v)}>
                  <SelectTrigger className="h-6 border-none bg-transparent p-0 focus:ring-0 flex-1 text-gray-300 font-semibold">
                    <SelectValue placeholder="选择静态模板" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1e] border-white/10 text-gray-300">
                    <SelectItem value="none">无</SelectItem>
                    {customTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}