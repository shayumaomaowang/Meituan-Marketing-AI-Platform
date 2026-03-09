"use client"

import { Sparkles, Palette, Zap, Film } from "lucide-react"

const features = [
  {
    icon: Sparkles,
    title: "Image Creation",
    description: "Generate unique images from text prompts with customizable dimensions and styles",
    color: "from-primary to-accent",
  },
  {
    icon: Palette,
    title: "Design Editing",
    description: "Modify and enhance existing designs with AI-powered description-based editing",
    color: "from-accent to-primary",
  },
  {
    icon: Zap,
    title: "Design Extension",
    description: "Expand your designs beyond the canvas with intelligent anchor point controls",
    color: "from-secondary to-accent",
  },
  {
    icon: Film,
    title: "Animation",
    description: "Bring your designs to life with customizable animation speeds and loop settings",
    color: "from-primary to-secondary",
  },
]

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-20 md:py-32 px-4 md:px-8 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">Powerful Features</h2>
          <p className="text-lg text-muted-foreground text-balance">
            Everything you need to create professional designs
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <div
                key={idx}
                className="p-8 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors group cursor-pointer"
              >
                <div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <Icon size={24} className="text-white" />
                </div>

                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>

                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
