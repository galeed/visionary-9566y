import { put } from "@vercel/blob"

/**
 * Uploads a base64 image to Vercel Blob storage
 * @param base64Image - Base64 encoded image string (with or without data URI prefix)
 * @param filename - Name for the file (e.g., 'image-123.png')
 * @returns The public CDN URL of the uploaded image
 */
export async function uploadImageToBlob(base64Image: string, filename: string): Promise<string> {
  // Remove data URI prefix if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "")

  // Extract content type from data URI or default to PNG
  const contentTypeMatch = base64Image.match(/^data:(image\/\w+);base64,/)
  const contentType = contentTypeMatch ? contentTypeMatch[1] : "image/png"

  // Convert base64 to binary
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  // Create a Blob from the binary data
  const blob = new Blob([bytes], { type: contentType })

  // Upload to Vercel Blob
  const uploadedBlob = await put(filename, blob, {
    access: "public",
    contentType,
    addRandomSuffix: true,
  })

  return uploadedBlob.url
}
