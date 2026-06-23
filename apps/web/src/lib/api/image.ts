const DEFAULT_SIZE = 256

// Crops the image to a centered square and re-encodes it as a small WebP blob,
// so avatars stay tiny and uniform regardless of the source file.
export async function resizeImageToSquare(
  file: File,
  size = DEFAULT_SIZE,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('Canvas is not supported in this browser.')
  }
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob =>
        blob ? resolve(blob) : reject(new Error('Could not encode the image.')),
      'image/webp',
      0.85,
    )
  })
}
