"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"

interface KeyboardShortcutsDialogProps {
  triggerVariant?: "default" | "icon-only"
}

export function KeyboardShortcutsDialog({ triggerVariant = "default" }: KeyboardShortcutsDialogProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const shortcuts = [
    { key: "Cmd/Ctrl + Enter", description: "Generate image" },
    { key: "Cmd/Ctrl + V", description: "Paste image from clipboard" },
    { key: "Cmd/Ctrl + C", description: "Copy generated image" },
    { key: "Cmd/Ctrl + D", description: "Download image" },
    { key: "Cmd/Ctrl + U", description: "Use as input" },
    { key: "Escape", description: "Close fullscreen or dialogs" },
    { key: "Cmd/Ctrl + /", description: "Toggle this help" },
  ]

  if (isMobile) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "icon-only" ? (
          <button className="text-xs md:text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2">
            <span className="text-xs font-mono bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5">?</span>
          </button>
        ) : (
          <button className="text-xs md:text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2">
            <span>Keyboard Shortcuts</span>
            <span className="text-xs font-mono bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5">?</span>
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-black border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {shortcuts.map((shortcut, i) => (
            <div key={i} className="flex justify-between items-center">
              <span className="text-gray-400">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs font-mono bg-gray-800 border border-gray-600 rounded">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
