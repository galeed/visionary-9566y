import type React from "react"
import type { MODEL_CATALOG } from "./model-catalog"

export type ModelType = (typeof MODEL_CATALOG)[number]["id"]
export type ThinkingLevel = "minimal" | "high"
export type Resolution = "1K" | "2K" | "4K"
export type Quality = "auto" | "low" | "medium" | "high"

export interface GeneratedImage {
  url: string
  prompt: string
  description?: string
}

export type GenerationPhase = "sending" | "generating" | "processing" | "loading"

export interface Generation {
  id: string
  status: "loading" | "complete" | "error"
  progress: number
  phase?: GenerationPhase
  imageUrl: string | null
  prompt: string
  error?: string
  timestamp: number
  abortController?: AbortController
  model?: ModelType
  thinkingLevel?: ThinkingLevel
  resolution?: Resolution
  useGrounding?: boolean
  aspectRatio?: string
  mode?: string
  workflowRunId?: string
  sdkRunId?: string
}

export type AspectRatioOption = {
  value: string
  label: string
  ratio: number
  icon: React.ReactNode
}
