"use client"

import { useState } from "react"
import { Maximize2 } from "lucide-react"

interface Dimensions {
  width: number
  height: number
}

interface DimensionSelectorProps {
  dimensions: Dimensions
  onChange: (dimensions: Dimensions) => void
}

const presets = [
  { label: "正方形", width: 1024, height: 1024 },
  { label: "横向", width: 1536, height: 1024 },
  { label: "纵向", width: 1024, height: 1536 },
  { label: "宽屏", width: 1792, height: 1024 },
]

export default function DimensionSelector({ dimensions, onChange }: DimensionSelectorProps) {
  const [isCustom, setIsCustom] = useState(false)

  return (
    <div className="mb-6">
      <label className="mb-3 block text-sm font-medium text-foreground">
        <div className="flex items-center gap-2">
          <Maximize2 className="h-4 w-4" />
          尺寸选择
        </div>
      </label>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {presets.map((preset) => (
          <button
            key={`${preset.width}-${preset.height}`}
            onClick={() => {
              onChange({ width: preset.width, height: preset.height })
              setIsCustom(false)
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              !isCustom && dimensions.width === preset.width && dimensions.height === preset.height
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "border border-border bg-card text-foreground hover:border-primary/50"
            }`}
          >
            {preset.label}
            <div className="text-xs opacity-75">
              {preset.width}×{preset.height}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => setIsCustom(!isCustom)}
        className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-all ${
          isCustom
            ? "bg-secondary text-secondary-foreground"
            : "border border-border bg-card text-foreground hover:border-secondary/50"
        }`}
      >
        自定义尺寸
      </button>

      {isCustom && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">宽度</label>
            <input
              type="number"
              value={dimensions.width}
              onChange={(e) => onChange({ ...dimensions, width: Number.parseInt(e.target.value) || 1024 })}
              step={128}
              min={512}
              max={2048}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">高度</label>
            <input
              type="number"
              value={dimensions.height}
              onChange={(e) => onChange({ ...dimensions, height: Number.parseInt(e.target.value) || 1024 })}
              step={128}
              min={512}
              max={2048}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      )}
    </div>
  )
}
