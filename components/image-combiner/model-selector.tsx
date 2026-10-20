"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { MODEL_CATALOG, PROVIDERS, type ModelDefinition } from "./model-catalog"
import { ProviderLogo } from "./provider-logos"
import type { ModelType } from "./types"

interface ModelSelectorProps {
  value: ModelType
  onChange: (model: ModelType) => void
}

function ModelCard({ model, selected, onClick }: { model: ModelDefinition; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full px-2.5 py-2 text-left transition-all",
        selected
          ? "bg-white text-black"
          : "text-gray-300 hover:text-white hover:bg-white/10",
      )}
    >
      <span className={cn("flex-shrink-0", selected ? "text-black" : "text-white")}>
        {ProviderLogo[model.provider as keyof typeof ProviderLogo]}
      </span>
      <span className="text-xs font-medium truncate flex-1">{model.name}</span>
      {model.badge && (
        <span className={cn(
          "text-[9px] font-semibold px-1 py-0.5 flex-shrink-0",
          selected ? "bg-black/15 text-black" : "bg-white/10 text-gray-400",
        )}>
          {model.badge}
        </span>
      )}
    </button>
  )
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 256 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const current = MODEL_CATALOG.find((m) => m.id === value)

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setDropdownStyle({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(256, rect.width),
    })
  }, [])

  const handleOpen = useCallback(() => {
    updatePosition()
    setOpen((o) => !o)
  }, [updatePosition])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (btnRef.current?.contains(target) || dropdownRef.current?.contains(target)) return
      setOpen(false)
    }
    function onScroll() { updatePosition() }
    document.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", updatePosition)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", updatePosition)
    }
  }, [open, updatePosition])

  const dropdown = open && (
    <div
      ref={dropdownRef}
      style={{ position: "fixed", top: dropdownStyle.top, left: dropdownStyle.left, width: dropdownStyle.width, zIndex: 9999 }}
      className="bg-black/95 border border-gray-600 shadow-xl"
    >
      <div className="max-h-80 overflow-y-auto">
        {PROVIDERS.filter((p) => MODEL_CATALOG.some((m) => m.provider === p.key)).map((provider, groupIndex) => (
          <div key={provider.key}>
            {groupIndex > 0 && <div className="border-b border-gray-800/50" />}
            {MODEL_CATALOG.filter((m) => m.provider === provider.key).map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                selected={value === model.id}
                onClick={() => {
                  onChange(model.id as ModelType)
                  setOpen(false)
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        aria-label="Select model"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1.5 h-7 md:h-10 px-2 md:px-3 bg-black/50 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 transition-all max-w-[140px] md:max-w-[220px]",
          open && "border-gray-400 text-white",
        )}
      >
        {current && (
          <span className="flex-shrink-0 text-white">
            {ProviderLogo[current.provider as keyof typeof ProviderLogo]}
          </span>
        )}
        <span className="text-xs font-medium truncate">{current?.name ?? "Model"}</span>
        <svg className="w-3 h-3 flex-shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
        </svg>
      </button>
      {typeof document !== "undefined" && dropdown && createPortal(dropdown, document.body)}
    </>
  )
}
