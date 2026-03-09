"use client"

import { Type } from "lucide-react"

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  isGenerating: boolean
}

export default function PromptInput({ value, onChange, isGenerating }: PromptInputProps) {
  return (
    <div className="mb-6">
      <label className="mb-2 block text-sm font-medium text-foreground">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4" />
          描述您的想法
        </div>
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isGenerating}
        placeholder="例如：一个宁静的山湖景观，日落时分，紫色和金色的天空，反射在平静的水面上..."
        className="w-full rounded-lg border border-border bg-input px-4 py-3 text-foreground placeholder-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        rows={5}
      />
      <div className="mt-2 text-xs text-muted-foreground">{value.length} / 1000 字符</div>
    </div>
  )
}
