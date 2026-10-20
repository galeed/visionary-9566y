"use client"

import { Button } from "@/components/ui/button"
import { useEffect, useRef, useState } from "react"

interface ProgressBarProps {
  progress: number
  phase?: "sending" | "generating" | "processing" | "loading"
  onCancel: () => void
}

function useElapsedSeconds() {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return elapsed
}

function getStatusMessage(elapsed: number): string | null {
  if (elapsed < 45) return null
  return "The model is taking longer than usual — hang tight"
}

export function ProgressBar({ progress, onCancel }: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const currentRef = useRef(progress) // Start at current value — no animation from 0
  const animationRef = useRef<number>()
  const elapsed = useElapsedSeconds()
  const statusMessage = getStatusMessage(elapsed)

  useEffect(() => {
    const animate = () => {
      if (!barRef.current) return
      const diff = progress - currentRef.current
      const step = diff * 0.08

      if (Math.abs(diff) > 0.01) {
        currentRef.current += step
        barRef.current.style.width = `${currentRef.current}%`
        animationRef.current = requestAnimationFrame(animate)
      } else {
        currentRef.current = progress
        barRef.current.style.width = `${progress}%`
      }
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [progress])

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-4 select-none">
      <div className="w-full max-w-md">
        {/* Single-row pixel bar — tiny squares like the background dithering */}
        <div className="relative h-[6px] md:h-[8px] bg-black/40 border border-white/10 overflow-hidden mb-3">
          {/* Empty pixel grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.05) 2px, transparent 2px),
                linear-gradient(to bottom, rgba(255,255,255,0.05) 2px, transparent 2px)
              `,
              backgroundSize: "3px 3px",
            }}
          />
          {/* Filled pixels — one row, left to right */}
          <div
            ref={barRef}
            className="absolute top-0 left-0 h-full"
            style={{
              width: `${progress}%`,
              backgroundColor: "#ffffff",
              backgroundImage: `
                linear-gradient(to right, rgba(0,0,0,0.15) 2px, transparent 2px),
                linear-gradient(to bottom, rgba(0,0,0,0.15) 2px, transparent 2px)
              `,
              backgroundSize: "3px 3px",
            }}
          />
        </div>

        <p className="text-[10px] md:text-xs text-white/50 text-center mb-3 tabular-nums">
          {Math.round(progress)}%
        </p>

        {statusMessage && (
          <p className="text-[10px] md:text-xs text-gray-400 text-center mb-2 animate-pulse">
            {statusMessage}
          </p>
        )}
        <div className="text-center">
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
            className="text-xs h-7 px-3 bg-transparent border-gray-600 text-white hover:bg-gray-700"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
