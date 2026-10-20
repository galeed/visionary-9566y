"use client"

import type React from "react"

import { useCallback, useEffect } from "react"
import type { Generation } from "../types"

interface UseKeyboardShortcutsProps {
  canGenerate: boolean
  showFullscreen: boolean
  fullscreenImageUrl: string
  generatedImage: { url: string; prompt: string } | null
  persistedGenerations: Generation[]
  onGenerate: () => void
  onCopyImage: () => void
  onDownloadImage: () => void
  onLoadAsInput: () => void
  onCloseFullscreen: () => void
  setFullscreenImageUrl: (url: string) => void
  setSelectedGenerationId: (id: string) => void
}

export function useKeyboardShortcuts({
  canGenerate,
  showFullscreen,
  fullscreenImageUrl,
  generatedImage,
  persistedGenerations,
  onGenerate,
  onCopyImage,
  onDownloadImage,
  onLoadAsInput,
  onCloseFullscreen,
  setFullscreenImageUrl,
  setSelectedGenerationId,
}: UseKeyboardShortcutsProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        if (canGenerate) {
          onGenerate()
        }
      }
    },
    [canGenerate, onGenerate],
  )

  const handleGlobalKeyboard = useCallback(
    (e: KeyboardEvent) => {
      const activeElement = document.activeElement
      const isTyping = activeElement?.tagName === "TEXTAREA" || activeElement?.tagName === "INPUT"

      if ((e.metaKey || e.ctrlKey) && e.key === "c" && generatedImage && !e.shiftKey) {
        if (!isTyping) {
          e.preventDefault()
          onCopyImage()
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && generatedImage) {
        if (!isTyping) {
          e.preventDefault()
          onDownloadImage()
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "u" && generatedImage) {
        if (!isTyping) {
          e.preventDefault()
          onLoadAsInput()
        }
      }
      if (e.key === "Escape" && showFullscreen) {
        onCloseFullscreen()
      }
      if (showFullscreen && (e.key === "ArrowLeft" || e.key === "ArrowRight") && !isTyping) {
        e.preventDefault()
        const completedGenerations = (persistedGenerations ?? []).filter((g) => g.status === "complete" && g.imageUrl)
        if (completedGenerations.length <= 1) return

        const currentIndex = completedGenerations.findIndex((g) => g.imageUrl === fullscreenImageUrl)
        if (currentIndex === -1) return

        if (e.key === "ArrowLeft") {
          const prevIndex = currentIndex === 0 ? completedGenerations.length - 1 : currentIndex - 1
          setFullscreenImageUrl(completedGenerations[prevIndex].imageUrl!)
          setSelectedGenerationId(completedGenerations[prevIndex].id)
        } else if (e.key === "ArrowRight") {
          const nextIndex = currentIndex === completedGenerations.length - 1 ? 0 : currentIndex + 1
          setFullscreenImageUrl(completedGenerations[nextIndex].imageUrl!)
          setSelectedGenerationId(completedGenerations[nextIndex].id)
        }
      }
    },
    [
      generatedImage,
      showFullscreen,
      onCopyImage,
      onDownloadImage,
      onLoadAsInput,
      onCloseFullscreen,
      persistedGenerations,
      fullscreenImageUrl,
      setFullscreenImageUrl,
      setSelectedGenerationId,
    ],
  )

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKeyboard)
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyboard)
    }
  }, [handleGlobalKeyboard])

  return {
    handleKeyDown,
  }
}
