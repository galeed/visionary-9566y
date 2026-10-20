"use client"

import { memo, useEffect, useCallback, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ProgressBar } from "./progress-bar"
import { useIsMobile } from "@/hooks/use-mobile"
import { Pin, PinOff } from "lucide-react"
import type { Generation } from "./types"

interface OutputSectionProps {
  selectedGeneration: Generation | undefined
  generations: Generation[]
  selectedGenerationId: string | null
  setSelectedGenerationId: (id: string) => void
  imageLoaded: boolean
  setImageLoaded: (loaded: boolean) => void
  onCancelGeneration: (id: string) => void
  onDeleteGeneration: (id: string) => void
  onOpenFullscreen: () => void
  onLoadAsInput: () => void
  onCopy: () => void
  onDownload: () => void
  onOpenInNewTab: () => void
  onImageReady: (id: string) => void
}

const ActionButtons = memo(function ActionButtons({
  disabled,
  onLoadAsInput,
  onCopy,
  onDownload,
  pinned,
  onTogglePin,
}: {
  disabled: boolean
  onLoadAsInput: () => void
  onCopy: () => void
  onDownload: () => void
  pinned: boolean
  onTogglePin: () => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        onClick={onLoadAsInput}
        disabled={disabled}
        variant="outline"
        size="sm"
        className="text-xs h-7 px-2 bg-black/70 backdrop-blur-sm border-gray-600 text-white hover:bg-black/90 flex items-center gap-1"
        title="Use as Input"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="hidden sm:inline">Input</span>
      </Button>
      <Button
        onClick={onCopy}
        disabled={disabled}
        variant="outline"
        size="sm"
        className="text-xs h-7 px-2 bg-black/70 backdrop-blur-sm border-gray-600 text-white hover:bg-black/90 flex items-center gap-1"
        title="Copy to clipboard"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" />
        </svg>
        <span className="hidden sm:inline">Copy</span>
      </Button>
      <Button
        onClick={onDownload}
        disabled={disabled}
        variant="outline"
        size="sm"
        className="text-xs h-7 px-2 bg-black/70 backdrop-blur-sm border-gray-600 text-white hover:bg-black/90 flex items-center gap-1"
        title="Download image"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span className="hidden sm:inline">Download</span>
      </Button>
      <Button
        onClick={onTogglePin}
        variant="outline"
        size="sm"
        className={cn(
          "hidden md:flex text-xs h-7 px-2 backdrop-blur-sm items-center gap-1",
          pinned
            ? "bg-white text-black border-white hover:bg-gray-200"
            : "bg-black/70 border-gray-600 text-white hover:bg-black/90",
        )}
        title={pinned ? "Unpin toolbar" : "Pin toolbar"}
      >
        {pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
      </Button>
    </div>
  )
})

export const OutputSection = memo(function OutputSection({
  selectedGeneration,
  generations,
  selectedGenerationId,
  setSelectedGenerationId,
  imageLoaded,
  setImageLoaded,
  onCancelGeneration,
  onDeleteGeneration,
  onOpenFullscreen,
  onLoadAsInput,
  onCopy,
  onDownload,
  onOpenInNewTab,
  onImageReady,
}: OutputSectionProps) {
  const isMobile = useIsMobile()
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    try { setPinned(localStorage.getItem("toolbar_pinned") === "true") } catch {}
  }, [])
  const togglePin = useCallback(() => {
    setPinned((prev) => {
      const next = !prev
      try { localStorage.setItem("toolbar_pinned", String(next)) } catch {}
      return next
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement
      const isTyping = activeElement?.tagName === "TEXTAREA" || activeElement?.tagName === "INPUT"

      if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !isTyping) {
        if (generations.length <= 1) return

        e.preventDefault()
        const currentIndex = generations.findIndex((g) => g.id === selectedGenerationId)
        if (currentIndex === -1 && generations.length > 0) {
          setSelectedGenerationId(generations[0].id)
          return
        }

        let newIndex
        if (e.key === "ArrowLeft") {
          newIndex = currentIndex - 1
        } else {
          newIndex = currentIndex + 1
        }

        if (newIndex >= 0 && newIndex < generations.length) {
          setSelectedGenerationId(generations[newIndex].id)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [generations, selectedGenerationId, setSelectedGenerationId])

  // Show image when URL exists (even during loading — renders behind progress bar)
  const imageUrl = selectedGeneration?.imageUrl || null
  const isComplete = selectedGeneration?.status === "complete"
  const isLoading = selectedGeneration?.status === "loading"

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
    // If still "loading", the image just finished decoding behind the progress bar.
    // Signal completion — progress bar disappears, image is already painted = 0ms gap.
    if (selectedGeneration?.status === "loading" && selectedGeneration.id) {
      onImageReady(selectedGeneration.id)
    }
  }, [setImageLoaded, selectedGeneration?.status, selectedGeneration?.id, onImageReady])

  const handleCancel = useCallback(() => {
    if (selectedGeneration) {
      onCancelGeneration(selectedGeneration.id)
    }
  }, [selectedGeneration, onCancelGeneration])

  const hasImage = isComplete && !!imageUrl && generations.length > 0

  return (
    <div className="flex flex-col h-full min-h-0 select-none relative group/output">
      <div className="relative flex-1 min-h-0 flex flex-col">
        {/* Image layer — rendered whenever URL exists, even during "loading".
            Sits underneath the progress bar so it's decoded and painted
            BEFORE the progress bar is removed. */}
        {imageUrl && (
          <div className="absolute inset-0 flex flex-col select-none">
            <div className="flex-1 flex items-center justify-center relative max-w-full max-h-full overflow-hidden">
              {imageUrl.startsWith("data:") ? (
                <img
                  src={imageUrl}
                  alt={`Generated image: ${selectedGeneration?.prompt || ""}`}
                  fetchPriority="high"
                  className={cn(
                    "max-w-full max-h-full cursor-pointer",
                    "lg:w-full lg:h-full lg:object-contain",
                  )}
                  onLoad={handleImageLoad}
                  onClick={isComplete ? onOpenFullscreen : undefined}
                />
              ) : (
                <Image
                  src={imageUrl}
                  alt={`Generated image: ${selectedGeneration?.prompt || ""}`}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 55vw, 45vw"
                  className="object-contain cursor-pointer"
                  onLoad={handleImageLoad}
                  onClick={isComplete ? onOpenFullscreen : undefined}
                />
              )}

              {/* Action buttons — only when complete */}
              {hasImage && (
                <div
                  className={cn(
                    "absolute bottom-3 left-1/2 -translate-x-1/2 transition-all duration-200 z-10",
                    "md:opacity-0 md:translate-y-2",
                    pinned
                      ? "md:opacity-100 md:translate-y-0"
                      : "md:group-hover/output:opacity-100 md:group-hover/output:translate-y-0",
                  )}
                >
                  <ActionButtons
                    disabled={!isComplete}
                    onLoadAsInput={onLoadAsInput}
                    onCopy={onCopy}
                    onDownload={onDownload}
                    pinned={pinned}
                    onTogglePin={togglePin}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress bar overlay — on top of the image during loading */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-20">
            <ProgressBar
              progress={selectedGeneration.progress}
              phase={selectedGeneration.phase || "sending"}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Empty state — no generation selected */}
        {!selectedGeneration && (
          <div className="absolute inset-0 flex items-center justify-center text-center py-6 select-none bg-black/20">
            <div>
              <div className="w-8 h-8 md:w-16 md:h-16 mx-auto mb-3 border border-gray-600 flex items-center justify-center bg-black/50">
                <svg
                  className="w-4 h-4 md:w-8 md:h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21,15 16,10 5,21" />
                </svg>
              </div>
              <p className="text-xs text-gray-400 font-medium py-1 md:py-2">Ready to generate</p>
            </div>
          </div>
        )}

        {/* Also show empty state for complete generations with no image (shouldn't happen but safe) */}
        {selectedGeneration && !imageUrl && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-center py-6 select-none bg-black/20">
            <div>
              <div className="w-8 h-8 md:w-16 md:h-16 mx-auto mb-3 border border-gray-600 flex items-center justify-center bg-black/50">
                <svg
                  className="w-4 h-4 md:w-8 md:h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21,15 16,10 5,21" />
                </svg>
              </div>
              <p className="text-xs text-gray-400 font-medium py-1 md:py-2">Ready to generate</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
