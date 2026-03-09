import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Navigation from '@/components/navigation'
import { ClientInitializer } from '@/components/ClientInitializer'
import '@/styles/globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Creative AI - 营销AI智能创作平台',
  description: '像聊天一样描述需求，AI自动理解并生成专业设计',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="font-sans antialiased bg-[#0a0a0c] text-white">
        {/* 增强版背景动效层 */}
        <div className="bg-arc-container">
          <div className="bg-arc-light" />
          <div className="bg-spotlight" />
          <div className="bg-overlay-mesh" />
        </div>
        
        {/* 内容层 */}
        <div className="relative z-10">
          <ClientInitializer />
          <Navigation />
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  )
}