"use client"

import type React from "react"

import { useCallback, useEffect } from "react"
import { isImageFile } from "@/lib/image-utils"

interface UsePasteHandlerProps {
  image1: File | null
  image2: File | null
  image1Url: string
  image2Url: string
  useUrls: boolean
  setUseUrls: (value: boolean) => void
  onImageUpload: (file: File, imageNumber: 1 | 2) => Promise<void>
  onUrlChange: (url: string, imageNumber: 1 | 2) => void
  onToast: (message: string, type: "success" | "error") => void
}

export function usePasteHandler({
  image1,
  image2,
  image1Url,
  image2Url,
  useUrls,
  setUseUrls,
  onImageUpload,
  onUrlChange,
  onToast,
}: UsePasteHandlerProps) {
  const handleGlobalPaste = useCallback(
    async (e: ClipboardEvent) => {
      const activeElement = document.activeElement
      if (activeElement?.tagName !== "TEXTAREA" && activeElement?.tagName !== "INPUT") {
        const items = e.clipboardData?.items
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (item.type.startsWith("image/")) {
              e.preventDefault()
              const file = item.getAsFile()
              if (file && isImageFile(file)) {
                setUseUrls(false)
                if (!image1) {
                  await onImageUpload(file, 1)
                  onToast("Image pasted successfully", "success")
                } else if (!image2) {
                  await onImageUpload(file, 2)
                  onToast("Image pasted to second slot", "success")
                } else {
                  await onImageUpload(file, 1)
                  onToast("Image replaced first slot", "success")
                }
              }
              return
            }
          }
        }

        const pastedText = e.clipboardData?.getData("text")

        if (!pastedText) return

        const urlPattern = /https?:\/\/[^\s]+/i
        const imagePattern = /\.(jpg|jpeg|png|gif|webp|bmp|svg)|format=(jpg|jpeg|png|gif|webp)/i

        const match = pastedText.match(urlPattern)

        if (match) {
          const url = match[0]
          if (imagePattern.test(url) || url.includes("/media/") || url.includes("/images/")) {
            e.preventDefault()

            const targetSlot = !image1Url ? 1 : !image2Url ? 2 : 1

            setUseUrls(true)

            setTimeout(() => {
              onUrlChange(url, targetSlot)
              onToast(`Image URL pasted to ${targetSlot === 1 ? "first" : "second"} slot`, "success")
            }, 150)
          }
        }
      }
    },
    [image1, image2, image1Url, image2Url, onImageUpload, onUrlChange, setUseUrls, onToast],
  )

  const handlePromptPaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (item.type.startsWith("image/")) {
            e.preventDefault()
            const file = item.getAsFile()
            if (file && isImageFile(file)) {
              setUseUrls(false)
              if (!image1) {
                await onImageUpload(file, 1)
                onToast("Image pasted successfully", "success")
              } else if (!image2) {
                await onImageUpload(file, 2)
                onToast("Image pasted to second slot", "success")
              } else {
                await onImageUpload(file, 1)
                onToast("Image replaced first slot", "success")
              }
            }
            return
          }
        }
      }

      const pastedText = e.clipboardData.getData("text")

      const urlPattern = /https?:\/\/[^\s]+/i
      const imagePattern = /\.(jpg|jpeg|png|gif|webp|bmp|svg)|format=(jpg|jpeg|png|gif|webp)/i

      const match = pastedText.match(urlPattern)

      if (match) {
        const url = match[0]
        if (imagePattern.test(url) || url.includes("/media/") || url.includes("/images/")) {
          e.preventDefault()

          if (!useUrls) {
            setUseUrls(true)
          }

          if (!image1Url) {
            onUrlChange(url, 1)
            onToast("Image URL loaded into first slot", "success")
          } else if (!image2Url) {
            onUrlChange(url, 2)
            onToast("Image URL loaded into second slot", "success")
          } else {
            onUrlChange(url, 1)
            onToast("Image URL replaced first slot", "success")
          }
        }
      }
    },
    [useUrls, image1, image2, image1Url, image2Url, onUrlChange, onImageUpload, setUseUrls, onToast],
  )

  useEffect(() => {
    document.addEventListener("paste", handleGlobalPaste)
    return () => {
      document.removeEventListener("paste", handleGlobalPaste)
    }
  }, [handleGlobalPaste])

  return {
    handlePromptPaste,
  }
}
