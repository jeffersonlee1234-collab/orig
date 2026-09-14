// frontend/src/utils/fileUpload.ts

/**
 * Converts an uploaded File to a base64 Data URL.
 * Automatically compresses large image files to prevent memory & localStorage bloat
 * while preserving clear visual fidelity for admin and user verification.
 */
export async function readFileAsDataUrl(
  file: File,
  maxDimension = 1200,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve) => {
    if (!file) {
      resolve("")
      return
    }

    const reader = new FileReader()

    // If it's a PDF or non-image format, read directly
    if (
      file.type === "application/pdf" ||
      (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|jfif|gif|bmp)$/i.test(file.name))
    ) {
      reader.onload = () => resolve((reader.result as string) || "")
      reader.onerror = () => resolve("")
      reader.readAsDataURL(file)
      return
    }

    reader.onload = (e) => {
      const rawDataUrl = (e.target?.result as string) || ""
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas")
          let width = img.width
          let height = img.height

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width)
              width = maxDimension
            } else {
              width = Math.round((width * maxDimension) / height)
              height = maxDimension
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)
            const compressedUrl = canvas.toDataURL("image/jpeg", quality)
            resolve(compressedUrl)
            return
          }
        } catch {
          // fallback to raw
        }
        resolve(rawDataUrl)
      }
      img.onerror = () => resolve(rawDataUrl)
      img.src = rawDataUrl
    }
    reader.onerror = () => resolve("")
    reader.readAsDataURL(file)
  })
}
