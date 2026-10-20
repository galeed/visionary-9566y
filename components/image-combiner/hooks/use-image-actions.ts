"use client"

import { useCallback, useState } from "react"

interface UseImageActionsProps {
  isMobile: boolean
  currentMode: string
  onToast: (message: string, type: "success" | "error") => void
}

interface GeneratedImage {
  url: string
  prompt: string
}

export function useImageActions({ isMobile, currentMode, onToast }: UseImageActionsProps) {
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState("")

  const openFullscreen = useCallback((imageUrl: string) => {
    if (imageUrl) {
      setFullscreenImageUrl(imageUrl)
      setShowFullscreen(true)
      document.body.style.overflow = "hidden"
    }
  }, [])

  const closeFullscreen = useCallback(() => {
    setShowFullscreen(false)
    setFullscreenImageUrl("")
    document.body.style.overflow = "unset"
  }, [])

  const downloadImage = useCallback(
    async (generatedImage: GeneratedImage | null) => {
      if (!generatedImage) return
      try {
        const response = await fetch(generatedImage.url)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `nanobanana-${currentMode}-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error("Error downloading image:", error)
        window.open(generatedImage.url, "_blank")
      }
    },
    [currentMode],
  )

  const openImageInNewTab = useCallback((generatedImage: GeneratedImage | null) => {
    if (!generatedImage?.url) {
      console.error("No image URL available")
      return
    }

    try {
      if (generatedImage.url.startsWith("data:")) {
        const parts = generatedImage.url.split(",")
        const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png"
        const bstr = atob(parts[1])
        const n = bstr.length
        const u8arr = new Uint8Array(n)
        for (let i = 0; i < n; i++) {
          u8arr[i] = bstr.charCodeAt(i)
        }
        const blob = new Blob([u8arr], { type: mime })
        const blobUrl = URL.createObjectURL(blob)
        const newWindow = window.open(blobUrl, "_blank", "noopener,noreferrer")
        if (newWindow) {
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
        }
      } else {
        window.open(generatedImage.url, "_blank", "noopener,noreferrer")
      }
    } catch (error) {
      console.error("Error opening image:", error)
      window.open(generatedImage.url, "_blank")
    }
  }, [])

  const copyImageToClipboard = useCallback(
    async (generatedImage: GeneratedImage | null) => {
      if (!generatedImage) return

      const convertToPngBlob = async (imageUrl: string): Promise<Blob> => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = "anonymous"

          img.onload = () => {
            const canvas = document.createElement("canvas")
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext("2d")

            if (!ctx) {
              reject(new Error("Failed to get canvas context"))
              return
            }

            ctx.drawImage(img, 0, 0)
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob)
                } else {
                  reject(new Error("Failed to convert to blob"))
                }
              },
              "image/png",
              1.0,
            )
          }

          img.onerror = () => reject(new Error("Failed to load image"))
          img.src = imageUrl
        })
      }

      try {
        if (isMobile) {
          try {
            const pngBlob = await convertToPngBlob(generatedImage.url)
            const clipboardItem = new ClipboardItem({ "image/png": pngBlob })
            await navigator.clipboard.write([clipboardItem])
            onToast("Image copied to clipboard!", "success")
            return
          } catch (clipboardError) {
            try {
              const response = await fetch(generatedImage.url)
              const blob = await response.blob()
              const reader = new FileReader()
              reader.onloadend = async () => {
                try {
                  await navigator.clipboard.writeText(reader.result as string)
                  onToast("Image data copied! Paste in compatible apps.", "success")
                } catch (err) {
                  throw new Error("Clipboard not supported")
                }
              }
              reader.readAsDataURL(blob)
              return
            } catch (fallbackError) {
              onToast("Copy not supported. Use download button instead.", "error")
              return
            }
          }
        }

        onToast("Copying image...", "success")
        window.focus()

        const pngBlob = await convertToPngBlob(generatedImage.url)
        const clipboardItem = new ClipboardItem({ "image/png": pngBlob })
        await navigator.clipboard.write([clipboardItem])

        onToast("Image copied to clipboard!", "success")
      } catch (error) {
        console.error("Error copying image:", error)
        if (error instanceof Error && error.message.includes("not focused")) {
          onToast("Please click on the page first, then try copying again", "error")
        } else {
          onToast("Failed to copy image", "error")
        }
      }
    },
    [isMobile, onToast],
  )

  return {
    showFullscreen,
    fullscreenImageUrl,
    setFullscreenImageUrl,
    openFullscreen,
    closeFullscreen,
    downloadImage,
    openImageInNewTab,
    copyImageToClipboard,
  }
}
