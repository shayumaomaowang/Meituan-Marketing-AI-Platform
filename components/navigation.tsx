"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles, Settings, ChevronDown, FileText, Layout, Image, Terminal, Lock } from "lucide-react"
import { useState } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function Navigation() {
  const pathname = usePathname();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const handleScrollToTemplates = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      const element = document.getElementById('marketing-templates');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleAdminClick = () => {
    setIsPasswordDialogOpen(true);
    setPassword("");
    setPasswordError(false);
  };

  const handlePasswordSubmit = () => {
    if (password === "000") {
      setIsPasswordDialogOpen(false);
      setIsAdminPanelOpen(true);
      setPassword("");
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setPassword("");
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0c]/60 backdrop-blur-xl">
      <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(120,50,255,0.5)]">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="text-white tracking-tight">美团营销AI创作平台</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="/" className={pathname === "/" ? "text-white" : "text-gray-400 hover:text-white transition-colors"}>
              首页
            </Link>
            <Link 
              href="/design-templates" 
              className={pathname.startsWith("/design-templates") ? "text-white" : "text-gray-400 hover:text-white transition-colors"}
            >
              设计模板
            </Link>
            <Link href="/reports" className={pathname.startsWith("/reports") ? "text-white" : "text-gray-400 hover:text-white transition-colors"}>
              竞品报告
            </Link>
            <Link href="/articles" className={pathname.startsWith("/articles") ? "text-white" : "text-gray-400 hover:text-white transition-colors"}>
              营销90文章
            </Link>
            <Link href="/guidelines" className={pathname.startsWith("/guidelines") ? "text-white" : "text-gray-400 hover:text-white transition-colors"}>
              设计规范
            </Link>
            {/* 后台管理按钮 - 包含 Lottie动效、自定义模板、素材库、后端调试 */}
            <Popover open={isAdminPanelOpen} onOpenChange={setIsAdminPanelOpen}>
              <PopoverTrigger asChild>
                <button 
                  onClick={handleAdminClick}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Settings size={16} />
                  <span>后台管理</span>
                  <ChevronDown size={14} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1 bg-[#1a1625] border-purple-900/30 rounded-lg shadow-xl" align="end">
                <Link
                  href="/lottie-templates"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => setIsAdminPanelOpen(false)}
                >
                  <FileText size={16} className="text-gray-400" />
                  Lottie动效
                </Link>
                <Link
                  href="/custom-templates"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => setIsAdminPanelOpen(false)}
                >
                  <Layout size={16} className="text-gray-400" />
                  自定义模板
                </Link>
                <Link
                  href="/assets"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => setIsAdminPanelOpen(false)}
                >
                  <Image size={16} className="text-gray-400" />
                  素材库
                </Link>
                <div className="my-1 border-t border-white/10" />
                <Link
                  href="/backend-debug"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => setIsAdminPanelOpen(false)}
                >
                  <Terminal size={16} className="text-gray-400" />
                  后端调试
                </Link>
              </PopoverContent>
            </Popover>

            {/* 密码对话框 */}
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
              <DialogContent className="bg-[#1a1625] border-purple-900/30 sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-white">
                    <Lock size={18} />
                    请输入后台管理密码
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError(false);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handlePasswordSubmit();
                      }
                    }}
                    placeholder="请输入3位数密码"
                    maxLength={3}
                    className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors text-center text-lg tracking-widest"
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-red-400 text-sm text-center">密码错误，请重试</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsPasswordDialogOpen(false)}
                      className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm font-medium transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handlePasswordSubmit}
                      className="flex-1 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors"
                    >
                      确认
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </nav>
  )
}