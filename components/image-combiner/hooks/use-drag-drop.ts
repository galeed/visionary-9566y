"use client"

import type React from "react"

import { useCallback, useEffect, useState } from "react"
import { isImageFile } from "@/lib/image-utils"

interface UseDragDropProps {
  onImageUpload: (file: File, imageNumber: 1 | 2) => Promise<void>
  setUseUrls: (value: boolean) => void
  onToast: (message: string, type: "success" | "error") => void
}

export function useDragDrop({ onImageUpload, setUseUrls, onToast }: UseDragDropProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const [dropZoneHover, setDropZoneHover] = useState<1 | 2 | null>(null)

  const handleGlobalDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragCounter((prev) => prev + 1)
    const items = e.dataTransfer?.items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file" && items[i].type.startsWith("image/")) {
          setIsDraggingOver(true)
          break
        }
      }
    }
  }, [])

  const handleGlobalDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy"
    }
  }, [])

  const handleGlobalDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragCounter((prev) => {
      const newCount = prev - 1
      if (newCount <= 0) {
        setIsDraggingOver(false)
        return 0
      }
      return newCount
    })
  }, [])

  const handleGlobalDrop = useCallback(
    async (e: DragEvent | React.DragEvent, slot?: 1 | 2) => {
      e.preventDefault()
      setIsDraggingOver(false)
      setDragCounter(0)
      setDropZoneHover(null)

      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        const file = files[0]
        if (file.type.startsWith("image/") && isImageFile(file)) {
          setUseUrls(false)
          const targetSlot = slot || 1
          await onImageUpload(file, targetSlot)
          onToast(`Image dropped to ${targetSlot === 1 ? "first" : "second"} slot`, "success")
        }
      }
    },
    [onImageUpload, setUseUrls, onToast],
  )

  useEffect(() => {
    document.addEventListener("dragover", handleGlobalDragOver)
    document.addEventListener("dragleave", handleGlobalDragLeave)
    document.addEventListener("dragenter", handleGlobalDragEnter)
    return () => {
      document.removeEventListener("dragover", handleGlobalDragOver)
      document.removeEventListener("dragleave", handleGlobalDragLeave)
      document.removeEventListener("dragenter", handleGlobalDragEnter)
    }
  }, [handleGlobalDragOver, handleGlobalDragLeave, handleGlobalDragEnter])

  return {
    isDraggingOver,
    dropZoneHover,
    setDropZoneHover,
    handleGlobalDrop,
  }
}
