"use client"

import type React from "react"
import { memo, useState, useCallback, useRef, useEffect } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { Generation } from "./types"
import { Loader2 } from "lucide-react"

interface GenerationHistoryProps {
  generations: Generation[]
  selectedId?: string | null
  onSelect: (id: string) => void
  onCancel: (id: string) => void
  onDelete?: (id: string) => Promise<void>
  onImageReady?: (id: string) => void
  isLoading?: boolean
  hasInitiallyLoaded?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  isLoadingMore?: boolean
  className?: string
  compact?: boolean
}

const GenerationThumbnail = memo(function GenerationThumbnail({
  gen,
  index,
  isSelected,
  onSelect,
  onCancel,
  onDelete,
  onImageReady,
  deletingId,
  onDeleteClick,
  shouldAnimate,
  eager,
}: {
  gen: Generation
  index: number
  isSelected: boolean
  onSelect: (id: string) => void
  onCancel: (id: string) => void
  onDelete?: (id: string) => Promise<void>
  onImageReady?: (id: string) => void
  deletingId: string | null
  onDeleteClick: (e: React.MouseEvent, id: string) => void
  shouldAnimate: boolean
  eager: boolean
}) {
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <div
      onClick={() => onSelect(gen.id)}
      onMouseEnter={() => {
        if (gen.imageUrl && !gen.imageUrl.startsWith("data:")) {
          const link = document.createElement("link")
          link.rel = "prefetch"
          link.href = gen.imageUrl
          link.as = "image"
          if (!document.querySelector(`link[href="${gen.imageUrl}"]`)) {
            document.head.appendChild(link)
          }
        }
      }}
      className={cn(
        "relative flex-shrink-0 w-18 h-18 md:w-24 md:h-24 overflow-hidden transition-all cursor-pointer group [content-visibility:auto] [contain-intrinsic-size:72px_72px] md:[contain-intrinsic-size:96px_96px]",
        isSelected ? "border-2 border-white" : "border border-gray-600 hover:border-gray-500",
        shouldAnimate && "animate-in fade-in-0 slide-in-from-left-4 duration-500",
        deletingId === gen.id && "opacity-50 pointer-events-none",
      )}
      role="button"
      tabIndex={0}
      aria-label={`Generation ${index + 1}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(gen.id)
        }
      }}
    >
      {/* Image layer — rendered whenever URL exists, even during "loading".
          Decodes behind the progress overlay so it's ready when status flips. */}
      {gen.imageUrl && gen.status !== "error" && (
        <>
          {onDelete && gen.status === "complete" && (
            <button
              onClick={(e) => onDeleteClick(e, gen.id)}
              disabled={deletingId === gen.id}
              className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-white text-white hover:text-black opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50 z-10"
              aria-label="Delete generation"
            >
              {deletingId === gen.id ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          )}
          <Image
            src={gen.imageUrl}
            alt={gen.prompt || "Generated image"}
            width={192}
            height={192}
            quality={85}
            priority={eager}
            loading={eager ? "eager" : "lazy"}
            unoptimized={gen.imageUrl?.startsWith("data:") || gen.imageUrl?.startsWith("blob:")}
            className={cn("absolute inset-0 w-full h-full object-cover", imageLoaded ? "opacity-100" : "opacity-0")}
            onLoad={() => {
              setImageLoaded(true)
              if (gen.status === "loading") onImageReady?.(gen.id)
            }}
          />
          {/* Placeholder for lazy-loaded history images (complete but not yet decoded) */}
          {gen.status === "complete" && !imageLoaded && (
            <div className="absolute inset-0 bg-gray-800 animate-pulse" />
          )}
        </>
      )}

      {/* Loading overlay — progress + cancel on top of the image */}
      {gen.status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <span className="text-sm md:text-base text-white/90 font-mono font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {Math.round(gen.progress)}%
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCancel(gen.id)
            }}
            className="mt-2 text-[10px] px-2 py-0.5 bg-white/10 hover:bg-white text-white hover:text-black transition-all"
            aria-label="Cancel generation"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Error state */}
      {gen.status === "error" && (
        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="sr-only">Generation failed</span>
          {onDelete && (
            <button
              onClick={(e) => onDeleteClick(e, gen.id)}
              disabled={deletingId === gen.id}
              className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-white text-white hover:text-black opacity-100 transition-all disabled:opacity-50 z-10"
              aria-label="Delete generation"
            >
              {deletingId === gen.id ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
})

export const GenerationHistory = memo(function GenerationHistory({
  generations,
  selectedId,
  onSelect,
  onCancel,
  onDelete,
  onImageReady,
  isLoading = false,
  hasInitiallyLoaded = false,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  className,
  compact = false,
}: GenerationHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const animatedIdsRef = useRef<Set<string>>(new Set())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      if (!onDelete) return

      setDeletingId(id)
      try {
        await onDelete(id)
      } catch (error) {
        console.error("Failed to delete generation:", error)
      } finally {
        setDeletingId(null)
      }
    },
    [onDelete],
  )

  // Infinite scroll — load more when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current
    const root = scrollContainerRef.current
    if (!sentinel || !root || !hasMore || !onLoadMore) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMore()
        }
      },
      { root, rootMargin: "0px 2000px 0px 0px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore])

  return (
    <div className={cn("flex flex-col w-full", className)}>
      {!compact && <p className="text-xs md:text-sm font-medium text-gray-400 mb-1">History</p>}
      <div
        ref={scrollContainerRef}
        className={cn(
          "w-full flex gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent h-20 md:h-28 items-end",
          compact ? "pb-1" : "pb-2",
        )}
      >
        {generations.length === 0 && hasInitiallyLoaded ? (
          <div className="flex items-center justify-center w-full h-20 md:h-28 text-gray-500 text-xs md:text-sm">
            No generations yet
          </div>
        ) : generations.length === 0 ? (
          null
        ) : (
          <>
            {generations.map((gen, index) => {
              const shouldAnimate = index === 0 && !animatedIdsRef.current.has(gen.id)
              if (shouldAnimate) {
                animatedIdsRef.current.add(gen.id)
              }

              return (
                <GenerationThumbnail
                  key={gen.id}
                  gen={gen}
                  index={index}
                  isSelected={selectedId === gen.id}
                  onSelect={onSelect}
                  onCancel={onCancel}
                  onDelete={onDelete}
                  onImageReady={onImageReady}
                  deletingId={deletingId}
                  onDeleteClick={handleDelete}
                  shouldAnimate={shouldAnimate}
                  eager={index < 5}
                />
              )
            })}
            {hasMore && (
              <div ref={sentinelRef} className="flex-shrink-0 w-1" />
            )}
          </>
        )}
      </div>
    </div>
  )
})
