/**
 * Client-side photo shrink before Gemini upload.
 * Browser-only — call from client components / event handlers.
 */

// EDIT HERE: max dimension — longer side (Math.max(width, height)) capped here
// 1280 keeps dots readable for 3.8 Flash without huge uploads
export const SCAN_MAX_WIDTH = 1280

// EDIT HERE — JPEG quality 0–1
export const SCAN_JPEG_QUALITY = 0.85

export interface CompressedScanImage {
  /** Raw base64 payload without `data:` prefix. */
  imageBase64: string
  mimeType: "image/jpeg"
  width: number
  height: number
}

async function loadImageBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file)
    } catch {
      // fall through to <img> (some Android HEIC paths)
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not read photo — use Upload and pick a JPEG/PNG"))
    }
    img.src = url
  })
}

/**
 * Resize + JPEG-compress a captured/uploaded photo for `/api/scan/hand`.
 * Scales so Math.max(width, height) <= SCAN_MAX_WIDTH (portrait-safe).
 */
export async function compressScanImage(
  file: Blob,
  options?: { maxWidth?: number; quality?: number },
): Promise<CompressedScanImage> {
  // EDIT HERE — override per-call if needed
  const maxDim = options?.maxWidth ?? SCAN_MAX_WIDTH
  const quality = options?.quality ?? SCAN_JPEG_QUALITY

  const img = await loadImageBitmap(file)
  const srcW = "naturalWidth" in img && img.naturalWidth ? img.naturalWidth : img.width
  const srcH =
    "naturalHeight" in img && img.naturalHeight ? img.naturalHeight : img.height
  const longEdge = Math.max(srcW, srcH)
  const scale = longEdge > maxDim ? maxDim / longEdge : 1
  const width = Math.max(1, Math.round(srcW * scale))
  const height = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas not available")
  ctx.drawImage(img, 0, 0, width, height)
  if ("close" in img && typeof img.close === "function") img.close()

  const dataUrl = canvas.toDataURL("image/jpeg", quality)
  const comma = dataUrl.indexOf(",")
  const imageBase64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  if (!imageBase64 || imageBase64.length < 32) {
    throw new Error("Could not encode photo — try Upload from gallery")
  }

  return { imageBase64, mimeType: "image/jpeg", width, height }
}
