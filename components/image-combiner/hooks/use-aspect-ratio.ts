"use client"

import { useCallback, useMemo } from "react"
import { ALL_ASPECT_RATIOS } from "../constants"
import { aspectRatiosForModel } from "../model-catalog"
import type { AspectRatioOption } from "../types"

/** Closest option (by width/height ratio) to a target numeric ratio. */
function closestByRatio(targetRatio: number, options: AspectRatioOption[]): AspectRatioOption {
  let closest = options[0]
  let smallestDiff = Math.abs(targetRatio - closest.ratio)
  for (const option of options) {
    const diff = Math.abs(targetRatio - option.ratio)
    if (diff < smallestDiff) {
      smallestDiff = diff
      closest = option
    }
  }
  return closest
}

export function useAspectRatio(modelId: string) {
  // Only the aspect ratios the selected model can actually produce.
  const availableAspectRatios = useMemo(() => {
    const supported = aspectRatiosForModel(modelId)
    return ALL_ASPECT_RATIOS.filter((r) => supported.includes(r.value))
  }, [modelId])

  // Closest supported ratio to a dropped image's dimensions.
  const detectAspectRatio = useCallback(
    (width: number, height: number): string => closestByRatio(width / height, availableAspectRatios).value,
    [availableAspectRatios],
  )

  // Closest supported ratio to an arbitrary current value (used when the model
  // changes and the current ratio is no longer available).
  const closestAvailable = useCallback(
    (value: string): string => {
      if (availableAspectRatios.some((r) => r.value === value)) return value
      const current = ALL_ASPECT_RATIOS.find((r) => r.value === value)
      return closestByRatio(current?.ratio ?? 1, availableAspectRatios).value
    },
    [availableAspectRatios],
  )

  return {
    availableAspectRatios,
    detectAspectRatio,
    closestAvailable,
  }
}
