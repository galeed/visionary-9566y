"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import type { Generation, GenerationPhase, ModelType, ThinkingLevel, Resolution, Quality } from "../types"

interface UseImageGenerationProps {
  prompt: string
  aspectRatio: string
  image1: File | null
  image2: File | null
  image1Url: string
  image2Url: string
  useUrls: boolean
  selectedModel: ModelType
  thinkingLevel: ThinkingLevel
  resolution: Resolution
  quality: Quality
  useGrounding: boolean
  generations: Generation[]
  setGenerations: React.Dispatch<React.SetStateAction<Generation[]>>
  addGeneration: (generation: Generation) => Promise<void>
  onToast: (message: string, type?: "success" | "error") => void
  onImageUpload: (file: File, imageNumber: 1 | 2) => Promise<void>
}

interface GenerateImageOptions {
  prompt?: string
  aspectRatio?: string
  image1?: File | null
  image2?: File | null
  image1Url?: string
  image2Url?: string
  useUrls?: boolean
  selectedModel?: ModelType
  thinkingLevel?: ThinkingLevel
  resolution?: Resolution
  quality?: Quality
  useGrounding?: boolean
}

let sharedAudioContext: AudioContext | null = null

const playSuccessSound = () => {
  try {
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    const oscillator = sharedAudioContext.createOscillator()
    const gainNode = sharedAudioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(sharedAudioContext.destination)

    oscillator.frequency.setValueAtTime(659.25, sharedAudioContext.currentTime)

    gainNode.gain.setValueAtTime(0.15, sharedAudioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, sharedAudioContext.currentTime + 0.15)

    oscillator.start(sharedAudioContext.currentTime)
    oscillator.stop(sharedAudioContext.currentTime + 0.15)
  } catch (error) {
    console.log("Could not play sound:", error)
  }
}

const getPhaseFromProgress = (progress: number): GenerationPhase => {
  if (progress < 20) return "sending"
  if (progress < 80) return "generating"
  if (progress < 95) return "processing"
  return "loading"
}

// Adaptive progress: calibrated from real generation durations.
// Module-level so it persists across re-renders and updates mid-session.
// No backing database here, so we just start from a sane default and let
// expectedDurationMs self-calibrate from each completed generation below.
let expectedDurationMs = 35_000

function fetchExpectedDuration() {
  // No-op: this template has no database to read historical stats from.
}

/** Two-phase progress curve:
 *  Phase 1 (0→90%): fast ease-out over expectedDurationMs
 *  Phase 2 (90→99%): slow crawl that never stops — user always sees movement */
function adaptiveProgress(elapsedMs: number): number {
  const t = elapsedMs / expectedDurationMs
  if (t < 1) {
    // Phase 1: 0→90% over the expected duration
    return 90 * (1 - Math.exp(-3 * t))
  }
  // Phase 2: 90→99%, asymptotically approaching 99
  // Each additional expectedDuration gets ~half the remaining distance
  const overtime = t - 1
  return 90 + 9 * (1 - Math.exp(-0.5 * overtime))
}

/** Poll workflow run until completed or failed.
 *  Never gives up on transient errors — the workflow is durable, so we keep trying. */
async function pollWorkflowStatus(
  runId: string,
  signal?: AbortSignal,
): Promise<{ status: "completed"; result: any } | { status: "failed"; error: string }> {
  const POLL_INTERVAL = 2000
  const MAX_POLLS = 180 // 6 minutes max (workflow can take long with retries)

  for (let i = 0; i < MAX_POLLS; i++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))

    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")

    try {
      const res = await fetch(`/api/generation-status?runId=${encodeURIComponent(runId)}`, { signal })

      if (!res.ok) continue // transient error — just keep polling

      const data = await res.json()

      if (data.status === "completed") {
        return { status: "completed", result: data.result }
      }
      if (data.status === "failed") {
        return { status: "failed", error: data.error || "Generation failed" }
      }
      // "running" or "pending" — keep polling
    } catch (e) {
      if (signal?.aborted) throw e
      // Network error — keep polling, workflow is still running
    }
  }

  return { status: "failed", error: "Generation timed out after 6 minutes" }
}

export function useImageGeneration({
  prompt,
  aspectRatio,
  image1,
  image2,
  image1Url,
  image2Url,
  useUrls,
  selectedModel,
  thinkingLevel,
  resolution,
  quality,
  useGrounding,
  generations,
  setGenerations,
  addGeneration,
  onToast,
  onImageUpload,
}: UseImageGenerationProps) {
  // Check for pending runs BEFORE first render to avoid flash
  const pendingRunsRef = useRef(() => {
    try {
      const raw = localStorage.getItem("pending_workflow_runs")
      if (!raw) return null
      const runs = JSON.parse(raw) as Record<string, { generationId: string; prompt: string; aspectRatio: string; mode: string; startedAt: number }>
      const now = Date.now()
      const active = Object.entries(runs).filter(([, v]) => now - v.startedAt < 6 * 60 * 1000)
      return active.length > 0 ? active : null
    } catch { return null }
  })
  const initialPending = useRef(pendingRunsRef.current()).current

  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(
    initialPending?.[0]?.[1]?.generationId || null
  )
  const [imageLoaded, setImageLoaded] = useState(false)
  const resumeAttempted = useRef(false)
  // Map generationId → runId for cancellation
  const runIdMap = useRef<Map<string, string>>(new Map())
  // Map generationId → stopProgress function so markGenerationComplete can stop the animation
  const stopProgressMap = useRef<Map<string, () => void>>(new Map())

  // Inject pending loading entries into generations on first render
  useEffect(() => {
    if (!initialPending) return
    for (const [runId, info] of initialPending) {
      runIdMap.current.set(info.generationId, runId)
      setGenerations((prev) => {
        if (prev.some((g) => g.id === info.generationId)) return prev
        const loadingGen: Generation = {
          id: info.generationId,
          status: "loading",
          progress: 5,
          phase: "sending",
          imageUrl: null,
          prompt: info.prompt,
          timestamp: info.startedAt,
        }
        return [loadingGen, ...prev]
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resume pending workflow runs after page refresh
  useEffect(() => {
    if (resumeAttempted.current) return
    resumeAttempted.current = true

    let pendingRuns: Record<string, { generationId: string; prompt: string; aspectRatio: string; mode: string; startedAt: number }>
    try {
      pendingRuns = JSON.parse(localStorage.getItem("pending_workflow_runs") || "{}")
    } catch {
      return
    }

    const entries = Object.entries(pendingRuns)
    if (entries.length === 0) return

    // Filter out stale runs (older than 5 minutes)
    const now = Date.now()
    const activeEntries = entries.filter(([, v]) => now - v.startedAt < 5 * 60 * 1000)
    if (activeEntries.length === 0) {
      localStorage.removeItem("pending_workflow_runs")
      return
    }

    for (const [runId, info] of activeEntries) {
      const { generationId, prompt: savedPrompt, aspectRatio: savedAspectRatio, mode: savedMode } = info

      // Immediately check status — might already be completed
      const resumeAsync = async () => {
        // Quick initial poll to get real startedAt or detect completion
        let realElapsedMs = Date.now() - info.startedAt // fallback from localStorage
        try {
          const res = await fetch(`/api/generation-status?runId=${encodeURIComponent(runId)}`)
          if (res.ok) {
            const data = await res.json()
            if (data.status === "completed") {
              // Already done! Set URL — component renders image behind progress,
              // markGenerationComplete fires on onLoad for instant reveal.
              const result = data.result
              if (result?.url) {
                setGenerations((prev) => {
                  const existing = prev.find((g) => g.id === generationId)
                  if (existing) {
                    return prev.map((g) =>
                      g.id === generationId
                        ? { ...g, imageUrl: result.url, aspectRatio: savedAspectRatio, mode: savedMode }
                        : g,
                    )
                  }
                  // Not yet in list — add as loading with URL
                  return [
                    {
                      id: generationId, status: "loading" as const, progress: 95, phase: "loading" as const,
                      imageUrl: result.url, prompt: savedPrompt, timestamp: Date.now(),
                      aspectRatio: savedAspectRatio, mode: savedMode,
                    },
                    ...prev,
                  ]
                })
                setSelectedGenerationId(generationId)
              }
              // Clean up
              try {
                const pending = JSON.parse(localStorage.getItem("pending_workflow_runs") || "{}")
                delete pending[runId]
                localStorage.setItem("pending_workflow_runs", JSON.stringify(pending))
              } catch {}
              return
            }
            if (data.status === "failed") {
              try {
                const pending = JSON.parse(localStorage.getItem("pending_workflow_runs") || "{}")
                delete pending[runId]
                localStorage.setItem("pending_workflow_runs", JSON.stringify(pending))
              } catch {}
              return
            }
            // Running — use server startedAt for accurate progress
            if (data.startedAt) {
              realElapsedMs = Date.now() - new Date(data.startedAt).getTime()
            }
          }
        } catch {}

        // Show loading with accurate progress from real elapsed time
        const initialProgress = adaptiveProgress(realElapsedMs)
        const resumedGeneration: Generation = {
          id: generationId, status: "loading", progress: initialProgress,
          phase: getPhaseFromProgress(initialProgress),
          imageUrl: null, prompt: savedPrompt, timestamp: info.startedAt,
        }

        setGenerations((prev) => {
          if (prev.some((g) => g.id === generationId)) return prev
          return [resumedGeneration, ...prev]
        })
        setSelectedGenerationId(generationId)

        // rAF with real elapsed offset
        let rafRunning = true
        let rafId: number
        const rafStart = performance.now()

        const updateProgress = (currentTime: number) => {
          if (!rafRunning) return
          const elapsedMs = realElapsedMs + (currentTime - rafStart)
          const progress = adaptiveProgress(elapsedMs)
          const phase = getPhaseFromProgress(progress)
          setGenerations((prev) =>
            prev.map((gen) =>
              gen.id === generationId && gen.status === "loading" ? { ...gen, progress, phase } : gen,
            ),
          )
          rafId = requestAnimationFrame(updateProgress)
        }
        rafId = requestAnimationFrame(updateProgress)

        // Continue polling
        const pollResult = await pollWorkflowStatus(runId)

        rafRunning = false
        cancelAnimationFrame(rafId)

        // Clean up localStorage
        try {
          const pending = JSON.parse(localStorage.getItem("pending_workflow_runs") || "{}")
          delete pending[runId]
          localStorage.setItem("pending_workflow_runs", JSON.stringify(pending))
        } catch {}

        if (pollResult.status === "failed") {
          setGenerations((prev) => prev.filter((gen) => gen.id !== generationId))
          onToast(pollResult.error || "Generation failed", "error")
          return
        }

        const data = pollResult.result
        if (data?.url) {
          // Set URL while keeping status "loading" — component renders image
          // behind progress bar. markGenerationComplete handles the rest on onLoad.
          const stopResumedProgress = () => {
            rafRunning = false
            cancelAnimationFrame(rafId)
          }
          stopProgressMap.current.set(generationId, stopResumedProgress)

          setGenerations((prev) =>
            prev.map((gen) =>
              gen.id === generationId && gen.status === "loading"
                ? { ...gen, imageUrl: data.url, aspectRatio: savedAspectRatio, mode: savedMode }
                : gen,
            ),
          )
        }
      }

      resumeAsync()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cancelGeneration = (generationId: string) => {
    const generation = generations.find((g) => g.id === generationId)
    if (generation?.abortController) {
      generation.abortController.abort()
    }

    // Cancel the workflow server-side
    const runId = runIdMap.current.get(generationId)
    if (runId) {
      fetch("/api/cancel-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      }).catch(() => {})

      // Clean up localStorage
      try {
        const pending = JSON.parse(localStorage.getItem("pending_workflow_runs") || "{}")
        delete pending[runId]
        localStorage.setItem("pending_workflow_runs", JSON.stringify(pending))
      } catch {}

      runIdMap.current.delete(generationId)
    }

    // Remove entirely — don't leave a "cancelled" thumbnail
    setGenerations((prev) => prev.filter((gen) => gen.id !== generationId))
    onToast("Generation cancelled", "error")
  }

  const generateImage = async (options?: GenerateImageOptions) => {
    fetchExpectedDuration()
    const effectivePrompt = options?.prompt ?? prompt
    const effectiveAspectRatio = options?.aspectRatio ?? aspectRatio
    const effectiveImage1 = options?.image1 !== undefined ? options.image1 : image1
    const effectiveImage2 = options?.image2 !== undefined ? options.image2 : image2
    const effectiveImage1Url = options?.image1Url !== undefined ? options.image1Url : image1Url
    const effectiveImage2Url = options?.image2Url !== undefined ? options.image2Url : image2Url
    const effectiveUseUrls = options?.useUrls !== undefined ? options.useUrls : useUrls
    const effectiveSelectedModel = options?.selectedModel !== undefined ? options.selectedModel : selectedModel
    const effectiveThinkingLevel = options?.thinkingLevel !== undefined ? options.thinkingLevel : thinkingLevel
    const effectiveResolution = options?.resolution !== undefined ? options.resolution : resolution
    const effectiveQuality = options?.quality !== undefined ? options.quality : quality
    const effectiveUseGrounding = options?.useGrounding !== undefined ? options.useGrounding : useGrounding

    const hasImages = effectiveUseUrls ? effectiveImage1Url || effectiveImage2Url : effectiveImage1 || effectiveImage2
    const currentMode = hasImages ? "image-editing" : "text-to-image"

    if (currentMode === "image-editing" && !effectiveUseUrls && !effectiveImage1) {
      onToast("Please upload at least one image for editing mode", "error")
      return
    }
    if (currentMode === "image-editing" && effectiveUseUrls && !effectiveImage1Url) {
      onToast("Please provide at least one image URL for editing mode", "error")
      return
    }
    if (!effectivePrompt.trim()) {
      onToast("Please enter a prompt", "error")
      return
    }

    const numVariations = 1
    const generationPromises = []

    for (let i = 0; i < numVariations; i++) {
      const generationId = `gen-${Date.now()}-${Math.random().toString(36).substring(7)}`
      const controller = new AbortController()

      const newGeneration: Generation = {
        id: generationId,
        status: "loading",
        progress: 0,
        phase: "sending",
        imageUrl: null,
        prompt: effectivePrompt,
        timestamp: Date.now() + i,
        abortController: controller,
      }

      setGenerations((prev) => [newGeneration, ...prev])

      if (i === 0) {
        setSelectedGenerationId(generationId)
      }

      let isRunning = true
      let rafId: number
      const startTime = performance.now()
      let lastUpdateTime = startTime
      let currentProgress = 0

      const updateProgress = (currentTime: number) => {
        if (!isRunning) return

        const deltaTime = currentTime - lastUpdateTime

        // Update every 50ms for smooth animation
        if (deltaTime >= 50) {
          lastUpdateTime = currentTime
          const elapsedMs = currentTime - startTime
          currentProgress = adaptiveProgress(elapsedMs)
          const phase = getPhaseFromProgress(currentProgress)

          setGenerations((prev) =>
            prev.map((gen) =>
              gen.id === generationId && gen.status === "loading" ? { ...gen, progress: currentProgress, phase } : gen,
            ),
          )
        }

        rafId = requestAnimationFrame(updateProgress)
      }

      rafId = requestAnimationFrame(updateProgress)

      const stopProgress = () => {
        isRunning = false
        cancelAnimationFrame(rafId)
      }

      stopProgressMap.current.set(generationId, stopProgress)

      const generationPromise = (async () => {
        try {
          const formData = new FormData()
          formData.append("mode", currentMode)
          formData.append("prompt", effectivePrompt)
          formData.append("aspectRatio", effectiveAspectRatio)
          formData.append("selectedModel", effectiveSelectedModel)
          formData.append("thinkingLevel", effectiveThinkingLevel)
          formData.append("resolution", effectiveResolution)
          formData.append("quality", effectiveQuality)
          formData.append("useGrounding", String(effectiveUseGrounding))

          if (currentMode === "image-editing") {
            if (effectiveUseUrls) {
              formData.append("image1Url", effectiveImage1Url)
              if (effectiveImage2Url) {
                formData.append("image2Url", effectiveImage2Url)
              }
            } else {
              if (effectiveImage1) {
                formData.append("image1", effectiveImage1)
              }
              if (effectiveImage2) {
                formData.append("image2", effectiveImage2)
              }
            }
          }

          // Step 1: Start the workflow
          const response = await fetch("/api/generate-image", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          })

          if (response.status === 429) {
            const errorData = await response.json()
            stopProgress()
            setGenerations((prev) => prev.filter((gen) => gen.id !== generationId))
            onToast(errorData.error || "Service temporarily unavailable. Please try again shortly.", "error")
            return
          }

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
            // Prefer the actionable `details` (e.g. "connect Vercel Blob") when present.
            throw new Error(errorData.details || errorData.error || "Failed to generate image")
          }

          const { runId } = await response.json()

          // Track runId for cancellation
          runIdMap.current.set(generationId, runId)

          // rAF keeps running for smooth progress animation — poll only detects completion

          // Save runId → generationId mapping so we can resume after refresh
          try {
            const pending = JSON.parse(localStorage.getItem("pending_workflow_runs") || "{}")
            pending[runId] = { generationId, prompt: effectivePrompt, aspectRatio: effectiveAspectRatio, mode: currentMode, startedAt: Date.now() }
            localStorage.setItem("pending_workflow_runs", JSON.stringify(pending))
          } catch {}

          // Step 2: Poll for completion — no progress callback, rAF handles animation
          const pollResult = await pollWorkflowStatus(runId, controller.signal)

          // Clean up localStorage
          try {
            const pending = JSON.parse(localStorage.getItem("pending_workflow_runs") || "{}")
            delete pending[runId]
            localStorage.setItem("pending_workflow_runs", JSON.stringify(pending))
          } catch {}

          if (pollResult.status === "failed") {
            throw new Error(pollResult.error || "Generation failed")
          }

          const data = pollResult.result

          if (data.durationMs && data.durationMs > 0) {
            expectedDurationMs = data.durationMs
          }

          if (data.url) {
            // Set the URL while keeping status "loading" — the component renders
            // the image behind the progress bar. When the image's onLoad fires,
            // markGenerationComplete removes the progress bar instantly (0ms gap).
            setGenerations((prev) =>
              prev.map((gen) =>
                gen.id === generationId && gen.status === "loading"
                  ? { ...gen, imageUrl: data.url, aspectRatio: effectiveAspectRatio, mode: currentMode }
                  : gen,
              ),
            )
            // Don't stopProgress or playSound — markGenerationComplete handles that
            // when the actual <Image> onLoad fires in the component.
          } else {
            stopProgress()
            stopProgressMap.current.delete(generationId)
          }
        } catch (error) {
          stopProgress()
          stopProgressMap.current.delete(generationId)

          if (error instanceof Error && error.name === "AbortError") {
            return
          }

          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

          setGenerations((prev) => prev.filter((gen) => gen.id !== generationId))

          onToast(errorMessage, "error")
        }
      })()

      generationPromises.push(generationPromise)
    }

    await Promise.all(generationPromises)
  }

  const loadGeneratedAsInput = async () => {
    const selectedGeneration = generations.find((g) => g.id === selectedGenerationId)
    if (!selectedGeneration?.imageUrl) return

    try {
      const response = await fetch(selectedGeneration.imageUrl)
      const blob = await response.blob()
      const file = new File([blob], "generated-image.png", { type: "image/png" })

      await onImageUpload(file, 1)
      onToast("Image loaded into Input 1", "success")
    } catch (error) {
      console.error("Error loading image as input:", error)
      onToast("Error loading image", "error")
    }
  }

  // Called by the component when the <Image> onLoad fires.
  // At that point the image is decoded and painted — safe to remove progress bar.
  const markGenerationComplete = useCallback((generationId: string) => {
    // Stop the progress animation
    const stopFn = stopProgressMap.current.get(generationId)
    if (stopFn) {
      stopFn()
      stopProgressMap.current.delete(generationId)
    }

    let completedGen: Generation | null = null

    setGenerations((prev) => {
      const gen = prev.find((g) => g.id === generationId)
      if (!gen || gen.status !== "loading" || !gen.imageUrl) return prev

      completedGen = {
        ...gen,
        status: "complete" as const,
        progress: 100,
        phase: undefined,
        timestamp: Date.now(),
        abortController: undefined,
      }

      return prev.map((g) => (g.id === generationId ? completedGen! : g))
    })

    // setGenerations callback runs synchronously, so completedGen is set here
    if (completedGen) {
      const gen = completedGen as Generation
      setImageLoaded(true)
      playSuccessSound()
      addGeneration({
        ...gen,
        createdAt: new Date().toISOString(),
      } as any).catch(() => {})
    }
  }, [setGenerations, setImageLoaded, addGeneration])

  return {
    selectedGenerationId,
    setSelectedGenerationId,
    imageLoaded,
    setImageLoaded,
    generateImage,
    cancelGeneration,
    loadGeneratedAsInput,
    markGenerationComplete,
  }
}
