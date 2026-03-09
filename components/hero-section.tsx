"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function HeroSection() {
  return (
    <section className="py-20 md:py-32 px-4 md:px-8 bg-gradient-to-b from-background via-card/30 to-background">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-block px-4 py-2 rounded-full bg-accent/10 border border-accent/30 mb-6">
          <span className="text-sm text-accent font-medium">✨ AI-Powered Design</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 text-balance leading-tight">
          Create stunning designs with{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">AI</span>
        </h1>

        <p className="text-xl text-muted-foreground mb-8 text-balance max-w-2xl mx-auto">
          Generate images, edit designs, create animations, and explore templates. All powered by cutting-edge AI
          technology.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            Start Creating
            <ArrowRight size={20} />
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center gap-2 px-8 py-4 border border-border rounded-full font-medium hover:bg-card transition-colors"
          >
            Explore Features
          </Link>
        </div>
      </div>
    </section>
  )
}
