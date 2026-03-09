"use client"

import { useState } from "react"
import { Sparkles, RotateCcw } from "lucide-react"
import ImagePreview from "./image-preview"
import PromptInput from "./prompt-input"
import DimensionSelector from "./dimension-selector"

export default function CreatePage() {
  const [prompt, setPrompt] = useState("")
  const [dimensions, setDimensions] = useState({ width: 1024, height: 1024 })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    // Simulate image generation
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Create a placeholder for demonstration
    const canvas = document.createElement("canvas")
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    const ctx = canvas.getContext("2d")

    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, "#5B21B6")
      gradient.addColorStop(0.5, "#3F3B96")
      gradient.addColorStop(1, "#1E3A8A")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = "#FFFFFF"
      ctx.font = "bold 48px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(prompt, canvas.width / 2, canvas.height / 2 - 30)
      ctx.font = "24px sans-serif"
      ctx.fillStyle = "#D8B4FE"
      ctx.fillText(`${dimensions.width}x${dimensions.height}`, canvas.width / 2, canvas.height / 2 + 40)
    }

    setGeneratedImage(canvas.toDataURL())
    setIsGenerating(false)
  }

  const handleReset = () => {
    setPrompt("")
    setGeneratedImage(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-accent" />
            <h1 className="text-4xl font-bold text-foreground">创作画布</h1>
          </div>
          <p className="text-lg text-muted-foreground">使用 AI 将您的创意转化为令人惊艳的视觉作品</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Controls */}
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-border bg-card/50 p-6 backdrop-blur">
              <h2 className="mb-4 text-xl font-semibold text-foreground">生成设置</h2>

              {/* Prompt Input */}
              <PromptInput value={prompt} onChange={setPrompt} isGenerating={isGenerating} />

              {/* Dimension Selector */}
              <DimensionSelector dimensions={dimensions} onChange={setDimensions} />

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="flex-1 rounded-lg bg-gradient-to-r from-primary to-accent px-6 py-3 font-semibold text-primary-foreground transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-r-transparent" />
                      生成中...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      生成图像
                    </div>
                  )}
                </button>

                {generatedImage && (
                  <button
                    onClick={handleReset}
                    className="rounded-lg border border-border bg-card px-4 py-3 text-foreground transition-colors hover:bg-muted"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Info Card */}
            <div className="rounded-xl border border-border/50 bg-secondary/10 p-4 text-sm">
              <p className="text-muted-foreground">
                💡 <span className="font-semibold">提示：</span> 提供详细的描述以获得最佳结果。包括风格、情绪和细节。
              </p>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="flex flex-col gap-6">
            <ImagePreview image={generatedImage} isLoading={isGenerating} dimensions={dimensions} />
          </div>
        </div>
      </div>
    </div>
  )
}
