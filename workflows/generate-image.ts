import { FatalError, RetryableError, getStepMetadata } from "workflow"
import { generateText, generateImage } from "ai"
import { createGateway } from "@ai-sdk/gateway"
import { google } from "@ai-sdk/google"
import { uploadImageToBlob } from "@/lib/blob-storage"
import { GEMINI_TEXT_MODELS } from "@/components/image-combiner/model-catalog"
import type { ModelType, ThinkingLevel, Resolution, Quality } from "@/components/image-combiner/types"

export interface GenerateImageInput {
  mode: "text-to-image" | "image-editing"
  prompt: string
  aspectRatio: string
  selectedModel: ModelType
  thinkingLevel: ThinkingLevel
  resolution: Resolution
  quality: Quality
  useGrounding: boolean
  userEmail: string | null
  ip: string
  // AI Gateway API key, read from process.env.AI_GATEWAY_API_KEY in the route.
  apiKey: string
  // For image-editing mode, images are passed as data URLs
  image1DataUrl?: string
  image2DataUrl?: string
}

export interface GenerateImageResult {
  url: string
  prompt: string
  description: string
  durationMs: number
}

// --- Step functions (full Node.js access, auto-retry) ---
// google.tools.googleSearch() MUST be called inside steps, not in the workflow sandbox

/** Translate an AI Gateway failure into the right workflow error and rethrow.
 *  Billing/auth errors are fatal (retrying won't help); rate limits retry. */
function throwMappedGatewayError(error: unknown): never {
  const msg = error instanceof Error ? error.message : ""
  if (msg.includes("credit card") || msg.includes("payment method") || msg.includes("insufficient credit")) {
    throw new FatalError(msg)
  }
  if (msg.includes("401") || msg.includes("403") || /unauthori[sz]ed/i.test(msg)) {
    throw new FatalError("AI Gateway rejected the request. Check AI_GATEWAY_API_KEY.")
  }
  if (msg.includes("429") || /rate limit/i.test(msg)) {
    throw new RetryableError("AI Gateway rate limited the request", { retryAfter: "30s" })
  }
  throw error
}

/** Gemini image models generate via generateText with responseModalities.
 *  Pass image data URLs to edit them; omit for text-to-image. */
async function executeGeminiImage(input: {
  apiKey: string
  modelId: string
  prompt: string
  googleOptions: Record<string, any>
  useGrounding: boolean
  image1DataUrl?: string
  image2DataUrl?: string
}): Promise<{ base64: string; mediaType: string; text: string; totalTokens: number; providerMetadata: any; durationMs: number }> {
  "use step"

  const startedAt = Date.now()
  const gateway = createGateway({ apiKey: input.apiKey })
  const model = gateway(input.modelId)

  const isEditing = Boolean(input.image1DataUrl)

  // text-to-image takes a prompt string; editing takes a multimodal message.
  let callOptions: { prompt: string } | { messages: any[] }
  if (isEditing) {
    const editingPrompt = input.image2DataUrl
      ? `${input.prompt}. Combine these two images creatively while following the instructions.`
      : `${input.prompt}. Edit or transform this image based on the instructions.`
    const messageParts: Array<{ type: "text" | "image"; text?: string; image?: string }> = [
      { type: "image", image: input.image1DataUrl },
      ...(input.image2DataUrl ? [{ type: "image" as const, image: input.image2DataUrl }] : []),
      { type: "text", text: editingPrompt },
    ]
    callOptions = { messages: [{ role: "user", content: messageParts }] }
  } else {
    callOptions = {
      prompt: `Generate a high-quality image based on this description: ${input.prompt}. The image should be visually appealing and match the description as closely as possible.`,
    }
  }

  let result
  try {
    // google.tools.googleSearch() returns an object with a non-serializable
    // inputSchema (function). Inline it directly — never store in a local
    // variable, or the workflow runtime will try to serialize it and fail.
    result = await generateText({
      model,
      ...(callOptions as any),
      ...(input.useGrounding && {
        tools: { google_search: google.tools.googleSearch({ mode: "MODE_DYNAMIC" }) as any },
      }),
      providerOptions: {
        google: input.googleOptions,
      },
    })
  } catch (error) {
    throwMappedGatewayError(error)
  }

  const imageFiles = result.files?.filter((f) => f.mediaType?.startsWith("image/")) || []
  if (imageFiles.length === 0) {
    const googleMeta = (result.providerMetadata as any)?.google
    const finishReason = result.finishReason
    const rawFinishReason = (result as any).rawFinishReason
    const blockReason = googleMeta?.promptFeedback?.blockReason
    console.error(`[generateImage] ${isEditing ? "image-editing" : "text-to-image"} returned no image`, {
      text: result.text?.slice(0, 500),
      fileCount: result.files?.length ?? 0,
      fileTypes: result.files?.map((f) => f.mediaType),
      finishReason,
      rawFinishReason,
      blockReason,
      safetyRatings: googleMeta?.safetyRatings ?? googleMeta?.promptFeedback?.safetyRatings,
      usage: result.usage,
      ...(isEditing && {
        hasImage2: Boolean(input.image2DataUrl),
        image1Bytes: input.image1DataUrl?.length ?? 0,
        image2Bytes: input.image2DataUrl?.length ?? 0,
      }),
      prompt: input.prompt.slice(0, 200),
    })
    if (blockReason || finishReason === "content-filter") {
      throw new FatalError(`Blocked by safety filter (${blockReason ?? rawFinishReason ?? finishReason}). ${result.text?.slice(0, 200) ?? ""}`)
    }
    if (finishReason === "length" || rawFinishReason === "MAX_TOKENS") {
      throw new FatalError("Model ran out of tokens before producing an image. Try a shorter prompt or simpler request.")
    }
    throw new FatalError("No image generated by the model")
  }

  return {
    base64: imageFiles[0].base64,
    mediaType: imageFiles[0].mediaType || "image/png",
    text: result.text || "",
    totalTokens: result.usage?.totalTokens || 0,
    providerMetadata: result.providerMetadata,
    durationMs: Date.now() - startedAt,
  }
}

const NATIVE_ASPECT_RATIO_MAP: Record<string, `${number}:${number}`> = {
  portrait: "9:16",
  landscape: "16:9",
  wide: "21:9",
  "4:3": "4:3",
  "3:4": "3:4",
  "3:2": "3:2",
  "2:3": "2:3",
  "5:4": "5:4",
  "4:5": "4:5",
  square: "1:1",
}

// Numeric width/height ratio for each app aspect-ratio option, used to pick the
// closest OpenAI gpt-image size (which only supports square / 3:2 / 2:3).
const APP_ASPECT_VALUE: Record<string, number> = {
  square: 1,
  portrait: 9 / 16,
  landscape: 16 / 9,
  wide: 21 / 9,
  "4:3": 4 / 3,
  "3:4": 3 / 4,
  "3:2": 3 / 2,
  "2:3": 2 / 3,
  "5:4": 5 / 4,
  "4:5": 4 / 5,
}

/** gpt-image-1.5 ignores `aspectRatio` and only accepts three fixed `size`
 *  values (1024x1024, 1536x1024 landscape, 1024x1536 portrait). Map the
 *  requested aspect ratio to the nearest one. */
function openAiSizeFor(aspectRatio: string): `${number}x${number}` {
  const r = APP_ASPECT_VALUE[aspectRatio] ?? 1
  if (r > 1.2) return "1536x1024"
  if (r < 0.83) return "1024x1536"
  return "1024x1024"
}

/** gpt-image-2 accepts arbitrary sizes (ratio 1:3–3:1, each side divisible by
 *  16). Build a size that matches the requested aspect ratio, keeping the
 *  shorter side at 1024. */
function gptImage2SizeFor(aspectRatio: string): `${number}x${number}` {
  const r = Math.max(1 / 3, Math.min(3, APP_ASPECT_VALUE[aspectRatio] ?? 1))
  const round16 = (n: number) => Math.max(16, Math.round(n / 16) * 16)
  const BASE = 1024
  const [w, h] = r >= 1 ? [round16(BASE * r), BASE] : [BASE, round16(BASE / r)]
  return `${w}x${h}`
}

/** Recraft accepts a fixed set of `size` values; map each offered app aspect
 *  ratio to its exact Recraft size. */
const RECRAFT_SIZE_MAP: Record<string, `${number}x${number}`> = {
  square: "1024x1024",
  landscape: "1820x1024", // ~16:9
  portrait: "1024x1820", // ~9:16
  "4:3": "1365x1024",
  "3:4": "1024x1365",
  "3:2": "1536x1024",
  "2:3": "1024x1536",
  "5:4": "1280x1024",
  "4:5": "1024x1280",
}
function recraftSizeFor(aspectRatio: string): `${number}x${number}` {
  return RECRAFT_SIZE_MAP[aspectRatio] || "1024x1024"
}

/** Strip a data URL prefix down to raw base64, which generateImage's image
 *  input (DataContent) accepts. */
function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(",")
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
}

async function executeNativeImage(input: {
  apiKey: string
  modelId: string
  prompt: string
  aspectRatio: string
  mode: "text-to-image" | "image-editing"
  quality?: string
  image1DataUrl?: string
  image2DataUrl?: string
}): Promise<{ base64: string; mediaType: string; text: string; totalTokens: number; providerMetadata: any; durationMs: number }> {
  "use step"

  const startedAt = Date.now()
  const gateway = createGateway({ apiKey: input.apiKey })
  const model = gateway.imageModel(input.modelId)

  const isOpenAI = input.modelId.startsWith("openai/")

  // OpenAI and Recraft are size-enumerated (use `size`); the rest take `aspectRatio`.
  // gpt-image-2 accepts arbitrary sizes, gpt-image-1.5 only three presets.
  const dimensions: { size: `${number}x${number}` } | { aspectRatio: `${number}:${number}` } =
    input.modelId === "openai/gpt-image-2"
      ? { size: gptImage2SizeFor(input.aspectRatio) }
      : isOpenAI
        ? { size: openAiSizeFor(input.aspectRatio) }
        : input.modelId.startsWith("recraft/")
          ? { size: recraftSizeFor(input.aspectRatio) }
          : { aspectRatio: NATIVE_ASPECT_RATIO_MAP[input.aspectRatio] || "1:1" }

  // gpt-image quality (low/medium/high); omit when "auto" (the default).
  const providerOptions =
    isOpenAI && input.quality && input.quality !== "auto"
      ? { openai: { quality: input.quality } }
      : undefined

  // In editing mode, feed the uploaded image(s) to the model instead of
  // silently dropping them and doing an unrelated text-to-image generation.
  const inputImages = [input.image1DataUrl, input.image2DataUrl]
    .filter((u): u is string => Boolean(u))
    .map(dataUrlToBase64)

  const prompt =
    input.mode === "image-editing" && inputImages.length > 0
      ? { images: inputImages, text: input.prompt }
      : input.prompt

  let result
  try {
    result = await generateImage({
      model,
      prompt,
      n: 1,
      ...dimensions,
      ...(providerOptions && { providerOptions }),
    })
  } catch (error) {
    throwMappedGatewayError(error)
  }

  const image = result.images?.[0]
  if (!image) {
    throw new FatalError("No image generated by the model")
  }

  return {
    base64: image.base64,
    mediaType: image.mediaType || "image/png",
    text: "",
    totalTokens: 0,
    providerMetadata: result.providerMetadata ?? {},
    durationMs: Date.now() - startedAt,
  }
}

async function uploadToBlob(input: {
  base64: string
  mediaType: string
  mode: string
}): Promise<string> {
  "use step"

  const { stepId } = getStepMetadata()
  const imageUrl = `data:${input.mediaType};base64,${input.base64}`
  const prefix = input.mode === "text-to-image" ? "generation" : "editing"
  const extension = input.mediaType.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "png"
  const filename = `${prefix}-${stepId}.${extension}`

  // Let errors propagate so the step retries automatically
  return await uploadImageToBlob(imageUrl, filename)
}

// --- Main workflow function ---
// IMPORTANT: No npm package calls here — only orchestration of steps.
// Date.now() is seeded/deterministic in the sandbox, so use step-returned timestamps.

export async function generateImageWorkflow(input: GenerateImageInput): Promise<GenerateImageResult> {
  "use workflow"

  const modelId = input.selectedModel
  const isGeminiTextModel = GEMINI_TEXT_MODELS.has(modelId)

  // Gemini-specific config (aspect ratio, thinking, resolution)
  const googleOptions: Record<string, any> = {
    responseModalities: ["IMAGE"],
    imageConfig: { aspectRatio: NATIVE_ASPECT_RATIO_MAP[input.aspectRatio] || "1:1" },
  }

  // Thinking config:
  //   - gemini-3.1-flash-image-preview: supports minimal | low | medium | high
  //   - gemini-3-pro-image: supports only low | high
  //   - gemini-2.5-flash-image: does not support thinkingConfig
  if (modelId === "google/gemini-3.1-flash-image-preview") {
    googleOptions.thinkingConfig = { thinkingLevel: input.thinkingLevel === "high" ? "high" : "minimal" }
  } else if (modelId === "google/gemini-3-pro-image") {
    googleOptions.thinkingConfig = { thinkingLevel: input.thinkingLevel === "high" ? "high" : "low" }
  }

  if (modelId === "google/gemini-3.1-flash-image-preview" && input.resolution !== "1K") {
    googleOptions.imageConfig.imageSize = input.resolution
  }

  // Step 1: Generate the image
  let genResult
  if (isGeminiTextModel) {
    genResult = await executeGeminiImage({
      apiKey: input.apiKey,
      modelId,
      prompt: input.prompt,
      googleOptions,
      useGrounding: modelId === "google/gemini-3.1-flash-image-preview" && input.useGrounding,
      // Only edit when in image-editing mode; text-to-image ignores any images.
      image1DataUrl: input.mode === "image-editing" ? input.image1DataUrl : undefined,
      image2DataUrl: input.mode === "image-editing" ? input.image2DataUrl : undefined,
    })
  } else {
    genResult = await executeNativeImage({
      apiKey: input.apiKey,
      modelId,
      prompt: input.prompt,
      aspectRatio: input.aspectRatio,
      mode: input.mode,
      quality: input.quality,
      image1DataUrl: input.image1DataUrl,
      image2DataUrl: input.image2DataUrl,
    })
  }

  const durationMs = genResult.durationMs

  console.log("[generateImage] succeeded", {
    mode: input.mode,
    model: modelId,
    durationMs,
    tokens: genResult.totalTokens,
  })

  // Step 2: Upload to blob storage
  const blobUrl = await uploadToBlob({
    base64: genResult.base64,
    mediaType: genResult.mediaType,
    mode: input.mode,
  })

  return {
    url: blobUrl,
    prompt: input.prompt,
    description: genResult.text,
    durationMs,
  }
}
