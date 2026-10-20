"use client"

import { useState, useRef, useEffect } from "react"
import { isImageFile, isHeicFile } from "@/lib/image-utils"

interface UseImageUploadOptions {
  onImageLoaded?: (width: number, height: number, imageNumber: 1 | 2) => void
}

export function useImageUpload(options?: UseImageUploadOptions) {
  const [image1, setImage1] = useState<File | null>(null)
  const [image1Preview, setImage1Preview] = useState("")
  const [image1Url, setImage1Url] = useState("")
  const [image2, setImage2] = useState<File | null>(null)
  const [image2Preview, setImage2Preview] = useState("")
  const [image2Url, setImage2Url] = useState("")

  const showToast = useRef<((message: string, type?: "success" | "error") => void) | null>(null)

  const objectUrlsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url)
      })
      objectUrlsRef.current.clear()
    }
  }, [])

  const validateImageFormat = (file: File): boolean => {
    return isImageFile(file)
  }

  const compressImage = async (file: File, maxWidth = 1280, quality = 0.75): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")!
      const img = new Image()

      const objectUrl = URL.createObjectURL(file)
      objectUrlsRef.current.add(objectUrl)

      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        objectUrlsRef.current.delete(objectUrl)

        let { width, height } = img
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxWidth) {
            width = (width * maxWidth) / height
            height = maxWidth
          }
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            canvas.width = 0
            canvas.height = 0

            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          "image/jpeg",
          quality,
        )
      }

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        objectUrlsRef.current.delete(objectUrl)
        resolve(file)
      }

      img.crossOrigin = "anonymous"
      img.src = objectUrl
    })
  }

  const convertHeicToJpeg = async (file: File): Promise<File> => {
    try {
      let convertedBlob: Blob

      try {
        const heic2any = (await import("heic2any")).default
        const result = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.9,
        })
        convertedBlob = Array.isArray(result) ? result[0] : result
      } catch (heic2anyError) {
        const { heicTo } = await import("heic-to")
        convertedBlob = await heicTo({
          blob: file,
          type: "image/jpeg",
          quality: 0.9,
        })
      }

      return new File([convertedBlob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
        type: "image/jpeg",
      })
    } catch (error) {
      throw new Error("Could not convert HEIC image")
    }
  }

  const handleImageUpload = async (file: File, imageNumber: 1 | 2) => {
    if (!validateImageFormat(file)) {
      showToast.current?.("Please select a valid image file.", "error")
      return
    }

    let processedFile = file

    const isHeic = await isHeicFile(file)
    if (isHeic) {
      try {
        processedFile = await convertHeicToJpeg(file)
      } catch (error) {
        showToast.current?.("Error converting image. Please try a different format.", "error")
        return
      }
    }

    try {
      processedFile = await compressImage(processedFile)
    } catch (error) {
      // Continue with uncompressed file if compression fails
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string

      const img = new Image()
      img.onload = () => {
        if (options?.onImageLoaded) {
          options.onImageLoaded(img.width, img.height, imageNumber)
        }
      }
      img.src = result

      if (imageNumber === 1) {
        setImage1(processedFile)
        setImage1Preview(result)
      } else {
        setImage2(processedFile)
        setImage2Preview(result)
      }
    }
    reader.onerror = () => {
      showToast.current?.("Error reading the image file. Please try again.", "error")
    }
    reader.readAsDataURL(processedFile)
  }

  const handleUrlChange = (url: string, imageNumber: 1 | 2) => {
    if (imageNumber === 1) {
      setImage1Url(url)
      setImage1Preview(url)
      setImage1(null)
    } else {
      setImage2Url(url)
      setImage2Preview(url)
      setImage2(null)
    }
  }

  const clearImage = (imageNumber: 1 | 2) => {
    if (imageNumber === 1) {
      if (image1Preview.startsWith("blob:")) {
        URL.revokeObjectURL(image1Preview)
        objectUrlsRef.current.delete(image1Preview)
      }
      setImage1(null)
      setImage1Preview("")
      setImage1Url("")
    } else {
      if (image2Preview.startsWith("blob:")) {
        URL.revokeObjectURL(image2Preview)
        objectUrlsRef.current.delete(image2Preview)
      }
      setImage2(null)
      setImage2Preview("")
      setImage2Url("")
    }
  }

  const restoreImageFromDataUrl = async (dataUrl: string, imageNumber: 1 | 2) => {
    try {
      const response = await fetch(dataUrl)
      const blob = await response.blob()

      const file = new File([blob], `restored-image-${imageNumber}.png`, {
        type: blob.type || "image/png",
      })

      const img = new Image()
      img.onload = () => {
        if (options?.onImageLoaded) {
          options.onImageLoaded(img.width, img.height, imageNumber)
        }
      }
      img.src = dataUrl

      if (imageNumber === 1) {
        setImage1(file)
        setImage1Preview(dataUrl)
      } else {
        setImage2(file)
        setImage2Preview(dataUrl)
      }
    } catch (error) {
      console.error(`Error restoring image ${imageNumber}:`, error)
    }
  }

  return {
    image1,
    image1Preview,
    image1Url,
    image2,
    image2Preview,
    image2Url,
    handleImageUpload,
    handleUrlChange,
    clearImage,
    restoreImageFromDataUrl,
    showToast,
  }
}
