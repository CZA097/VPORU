import type { GarmentItem } from '../types'
import { imageElement } from './image'

const BOARD_SIZE = 1200

/**
 * GenAPI принимает максимум два изображения: человека и одну ссылку на одежду.
 * Для нескольких вещей собираем одну «доску» на белом фоне. Порядок —
 * слева направо, сверху вниз, его же описывает промпт.
 */
export async function composeGarmentBoard(items: GarmentItem[]): Promise<string> {
  if (items.length === 0) throw new Error('В образе нет вещей')
  if (items.length === 1) return items[0].photo.dataUrl
  if (typeof document === 'undefined') return items[0].photo.dataUrl

  const canvas = document.createElement('canvas')
  canvas.width = BOARD_SIZE
  canvas.height = BOARD_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return items[0].photo.dataUrl

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE)

  const padded = BOARD_SIZE - 48
  const cols = items.length <= 3 ? items.length : 3
  const rows = Math.ceil(items.length / cols)
  const cellW = padded / cols
  const cellH = padded / rows

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    try {
      const img = await imageElement(item.photo.dataUrl)
      const x = 24 + (index % cols) * cellW
      const y = 24 + Math.floor(index / cols) * cellH
      const ratio = Math.min((cellW - 24) / img.naturalWidth, (cellH - 24) / img.naturalHeight)
      const w = img.naturalWidth * ratio
      const h = img.naturalHeight * ratio
      ctx.drawImage(img, x + (cellW - w) / 2, y + (cellH - h) / 2, w, h)
    } catch {
      // пропускаем битую вещь, остальные всё равно попадут на доску
    }
  }

  return canvas.toDataURL('image/png')
}
