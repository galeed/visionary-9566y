export type ModelApi = "generateText" | "generateImage"

export interface ModelDefinition {
  id: string
  name: string
  provider: string
  api: ModelApi
  badge?: string
}

export const MODEL_CATALOG: ModelDefinition[] = [
  // OpenAI
  { id: "openai/gpt-image-2",      name: "GPT Image 2",      provider: "openai", api: "generateImage", badge: "New" },
  { id: "openai/gpt-image-1.5",    name: "GPT Image 1.5",    provider: "openai", api: "generateImage" },

  // xAI
  { id: "xai/grok-imagine-image", name: "Grok Imagine", provider: "xai", api: "generateImage" },

  // Google Gemini (via generateText + responseModalities)
  { id: "google/gemini-3.1-flash-image-preview", name: "Gemini 3.1 Flash", provider: "google", api: "generateText", badge: "New" },
  { id: "google/gemini-3-pro-image",             name: "Gemini 3 Pro",     provider: "google", api: "generateText" },
  { id: "google/gemini-2.5-flash-image",         name: "Gemini 2.5 Flash", provider: "google", api: "generateText" },

  // Black Forest Labs (FLUX)
  { id: "bfl/flux-2-max",          name: "FLUX.2 Max", provider: "bfl", api: "generateImage" },
  { id: "bfl/flux-2-pro",          name: "FLUX.2 Pro", provider: "bfl", api: "generateImage" },

  // Recraft
  { id: "recraft/recraft-v4.1-pro", name: "Recraft V4.1 Pro", provider: "recraft", api: "generateImage" },

  // ByteDance Seedream
  { id: "bytedance/seedream-5.0-lite", name: "Seedream 5.0 Lite", provider: "bytedance", api: "generateImage" },
  { id: "bytedance/seedream-4.5",      name: "Seedream 4.5",      provider: "bytedance", api: "generateImage" },
]

export const MODEL_IDS = MODEL_CATALOG.map((m) => m.id) as [string, ...string[]]

export const DEFAULT_MODEL_ID = "openai/gpt-image-2"

export const GEMINI_TEXT_MODELS = new Set(
  MODEL_CATALOG.filter((m) => m.api === "generateText").map((m) => m.id),
)

// All app aspect-ratio option values (must match constants.tsx ALL_ASPECT_RATIOS).
export const ALL_ASPECT_RATIO_VALUES = [
  "square", "portrait", "landscape", "wide", "4:3", "3:4", "3:2", "2:3", "5:4", "4:5",
] as const

// Aspect ratios each model actually supports, expressed in app vocabulary.
// Verified against provider docs (Dec 2025):
//   - OpenAI gpt-image-2: arbitrary ratios 1:3–3:1 (full set, default below).
//   - OpenAI gpt-image-1.5: only square / 3:2 (1536x1024) / 2:3 (1024x1536).
//   - xAI Grok Imagine: 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3 (no 21:9 / 5:4 / 4:5).
//   - Recraft: 15 fixed sizes covering everything except 21:9.
//   - ByteDance Seedream: documented set 1:1, 4:3, 3:4, 2:3, 3:2, 9:16, 16:9.
//   - Google Gemini and FLUX.2 accept the full set (default below).
const ASPECT_RATIO_SUPPORT: Record<string, readonly string[]> = {
  "openai/gpt-image-1.5": ["square", "3:2", "2:3"],
  "xai/grok-imagine-image": ["square", "portrait", "landscape", "4:3", "3:4", "3:2", "2:3"],
  "recraft/recraft-v4.1-pro": ["square", "portrait", "landscape", "4:3", "3:4", "3:2", "2:3", "5:4", "4:5"],
  "bytedance/seedream-5.0-lite": ["square", "portrait", "landscape", "4:3", "3:4", "3:2", "2:3"],
  "bytedance/seedream-4.5": ["square", "portrait", "landscape", "4:3", "3:4", "3:2", "2:3"],
}

/** App aspect-ratio values supported by a model (full set if unrestricted). */
export function aspectRatiosForModel(modelId: string): readonly string[] {
  return ASPECT_RATIO_SUPPORT[modelId] ?? ALL_ASPECT_RATIO_VALUES
}

export const PROVIDERS = [
  { key: "openai",     label: "OpenAI" },
  { key: "xai",        label: "xAI" },
  { key: "google",     label: "Google" },
  { key: "bfl",        label: "FLUX" },
  { key: "recraft",    label: "Recraft" },
  { key: "bytedance",  label: "ByteDance" },
]
