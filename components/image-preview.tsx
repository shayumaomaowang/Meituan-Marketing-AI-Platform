"use client"

import { Download } from "lucide-react"

interface ImagePreviewProps {
  image: string | null
  isLoading: boolean
  dimensions: { width: number; height: number }
}

export default function ImagePreview({ image, isLoading, dimensions }: ImagePreviewProps) {
  const handleDownload = () => {
    if (!image) return
    const link = document.createElement("a")
    link.href = image
    link.download = `creation-${Date.now()}.png`
    link.click()
  }

  return (
    <div className="flex flex-col">
      <h2 className="mb-4 text-xl font-semibold text-foreground">预览</h2>

      <div className="relative flex flex-1 flex-col rounded-xl border border-border bg-card/30 backdrop-blur overflow-hidden">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 animate-spin rounded-full border-3 border-primary border-r-transparent" />
              <p className="text-sm text-muted-foreground">生成中...</p>
            </div>
          </div>
        ) : image ? (
          <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-primary/10 to-secondary/10 p-4">
            <img
              src={image || "/placeholder.svg"}
              alt="Generated"
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <svg className="h-8 w-8 text-primary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-foreground">您的创意在这里</p>
              <p className="text-sm text-muted-foreground">输入提示词后点击"生成图像"来创建作品</p>
            </div>
          </div>
        )}

        {image && !isLoading && (
          <div className="absolute top-3 right-3">
            <button
              onClick={handleDownload}
              className="rounded-lg bg-accent/90 backdrop-blur p-2 text-accent-foreground transition-all hover:bg-accent shadow-lg"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {image && (
        <div className="mt-4 text-xs text-muted-foreground">
          <p>
            尺寸: {dimensions.width}×{dimensions.height}px
          </p>
        </div>
      )}
    </div>
  )
}
