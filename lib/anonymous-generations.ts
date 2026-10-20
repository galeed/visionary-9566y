import type { Generation } from "@/components/image-combiner/types"

// Local, browser-only generation history. Images themselves live in Vercel
// Blob; this just keeps the list of recent generations (URLs + metadata) in
// localStorage so the gallery survives reloads without any database.
const HISTORY_KEY = "img_gen_history"
const MAX_GENERATIONS = 50

export function getAnonymousGenerations(): Generation[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    return stored ? (JSON.parse(stored) as Generation[]) : []
  } catch (error) {
    console.error("Failed to read generation history:", error)
    return []
  }
}

/** Insert or update a generation by id (loading → complete upserts in place). */
export function saveAnonymousGeneration(generation: Generation) {
  try {
    const existing = getAnonymousGenerations()
    const withoutDup = existing.filter((g) => g.id !== generation.id)
    const updated = [generation, ...withoutDup].slice(0, MAX_GENERATIONS)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error("Failed to save generation:", error)
  }
}

export function clearAnonymousGenerations() {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch (error) {
    console.error("Failed to clear generation history:", error)
  }
}

export function deleteAnonymousGeneration(id: string) {
  try {
    const filtered = getAnonymousGenerations().filter((g) => g.id !== id)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error("Failed to delete generation:", error)
  }
}
