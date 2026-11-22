import type { Photo } from '../types'

const MAX_BYTES = 15 * 1024 * 1024

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Не удалось прочитать изображение'))
    img.src = src
  })
}

export async function readPhoto(file: File, maxSide: number, keepAlpha: boolean): Promise<Photo> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    throw new Error(
      file.type === 'image/heic'
        ? 'HEIC не поддерживается — сохраните фото как JPG или сделайте скриншот'
        : 'Нужен JPG, PNG или WebP',
    )
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Файл больше 15 МБ — сожмите или сделайте скриншот')
  }

  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.max(1, Math.round(img.naturalWidth * ratio))
    const height = Math.max(1, Math.round(img.naturalHeight * ratio))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Браузер не дал canvas')

    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, width, height)

    // Пересборка через canvas заодно убирает EXIF и геометки из телефона.
    const type = keepAlpha && file.type !== 'image/jpeg' ? 'image/png' : 'image/jpeg'
    const dataUrl = canvas.toDataURL(type, 0.9)
    return { dataUrl, name: file.name, width, height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function imageElement(dataUrl: string): Promise<HTMLImageElement> {
  return loadImage(dataUrl)
}
