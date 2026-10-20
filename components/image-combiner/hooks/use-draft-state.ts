"use client"

import { useEffect, useRef, useCallback } from "react"
import type { ModelType, ThinkingLevel, Resolution } from "../types"

const DRAFT_KEY = "draft_form_state"
const SAVE_DEBOUNCE_MS = 500

interface DraftState {
  prompt: string
  aspectRatio: string
  selectedModel: ModelType
  thinkingLevel: ThinkingLevel
  resolution: Resolution
  useGrounding: boolean
  useUrls: boolean
  image1Url: string
  image2Url: string
  image1Preview: string | null
  image2Preview: string | null
}

export function getSavedDraft(): Partial<DraftState> | null {
  try {
    const stored = sessionStorage.getItem(DRAFT_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {}
}

export function useDraftState(state: DraftState) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const save = useCallback(() => {
    // Only save if there's something worth saving
    const hasContent = state.prompt.trim() ||
      state.image1Url ||
      state.image2Url ||
      state.image1Preview ||
      state.image2Preview

    if (!hasContent) {
      clearDraft()
      return
    }

    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(state))
    } catch {}
  }, [state])

  // Debounced auto-save on every state change
  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(save, SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timerRef.current)
  }, [save])
}
