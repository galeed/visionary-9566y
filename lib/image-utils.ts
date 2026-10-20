// Helper function to check if a file is an image
// Safari sometimes reports empty or incorrect MIME types
export function isImageFile(file: File): boolean {
  const fileType = file.type.toLowerCase()
  const fileName = file.name.toLowerCase()

  // Check MIME type first
  if (fileType.startsWith("image/")) {
    return true
  }

  // Fallback: check file extension for Safari/iOS compatibility
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff", ".heic", ".heif", ".svg"]
  return imageExtensions.some((ext) => fileName.endsWith(ext))
}

// Check if file is HEIC using magic bytes (most reliable method)
export async function isHeicFile(file: File): Promise<boolean> {
  return await checkHeicMagicBytes(file)
}

// Check the file's magic bytes to determine if it's actually HEIC/HEIF
async function checkHeicMagicBytes(file: File): Promise<boolean> {
  try {
    // Read first 12 bytes of the file
    const buffer = await file.slice(0, 12).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // HEIC/HEIF files have "ftyp" at offset 4, followed by brand
    // Common brands: heic, heix, hevc, hevx, mif1, msf1
    if (bytes.length >= 12) {
      const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7])
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])

      if (ftyp === "ftyp") {
        const heicBrands = ["heic", "heix", "hevc", "hevx", "mif1", "msf1"]
        return heicBrands.includes(brand)
      }
    }

    return false
  } catch (error) {
    // If we can't read the file, fall back to extension check
    const fileName = file.name.toLowerCase()
    return fileName.endsWith(".heic") || fileName.endsWith(".heif")
  }
}
