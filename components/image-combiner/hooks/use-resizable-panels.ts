"use client"

import type React from "react"

import { useCallback, useEffect, useRef, useState } from "react"

export function useResizablePanels() {
  const [leftWidth, setLeftWidth] = useState(45)
  const [isResizing, setIsResizing] = useState(false)
  const [hasResized, setHasResized] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return

      const container = containerRef.current
      const containerRect = container.getBoundingClientRect()
      const offsetX = e.clientX - containerRect.left
      const percentage = (offsetX / containerRect.width) * 100

      const clampedPercentage = Math.max(35, Math.min(70, percentage))
      setLeftWidth(clampedPercentage)
      setHasResized(true)
    },
    [isResizing],
  )

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  const handleDoubleClick = useCallback(() => {
    setLeftWidth(45)
    setHasResized(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"

      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  // Reset when window drops below xl breakpoint (1280px)
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1280px)")
    const onChange = () => {
      if (!mql.matches) {
        setHasResized(false)
      }
    }
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return {
    leftWidth,
    hasResized,
    containerRef,
    handleMouseDown,
    handleDoubleClick,
  }
}
