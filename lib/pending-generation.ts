export interface PendingGeneration {
  prompt: string
  aspectRatio: string
  image1?: File | null
  image2?: File | null
  image1Url?: string
  image2Url?: string
  useUrls: boolean
  timestamp: number
}

const PENDING_KEY = "pending_generation"
const EXPIRY_MS = 10 * 60 * 1000

export function savePendingGeneration(data: Omit<PendingGeneration, "timestamp">) {
  try {
    const pending: PendingGeneration = {
      ...data,
      timestamp: Date.now(),
    }

    const serializable = {
      prompt: pending.prompt,
      aspectRatio: pending.aspectRatio,
      image1Url: pending.image1Url || "",
      image2Url: pending.image2Url || "",
      useUrls: pending.useUrls,
      timestamp: pending.timestamp,
    }

    sessionStorage.setItem(PENDING_KEY, JSON.stringify(serializable))
  } catch (error) {
    console.error("Failed to save pending generation:", error)
  }
}

export function getPendingGeneration(): PendingGeneration | null {
  try {
    const stored = sessionStorage.getItem(PENDING_KEY)
    if (!stored) return null

    const pending: PendingGeneration = JSON.parse(stored)

    if (Date.now() - pending.timestamp > EXPIRY_MS) {
      clearPendingGeneration()
      return null
    }

    return pending
  } catch (error) {
    console.error("Failed to get pending generation:", error)
    return null
  }
}

export function clearPendingGeneration() {
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch (error) {
    console.error("Failed to clear pending generation:", error)
  }
}
