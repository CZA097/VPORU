import type { Palette } from '../types'

function clamp(v: number, min = 0, max = 255) {
  return Math.min(max, Math.max(min, v))
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  const n = Number.parseInt(full, 16)
  if (!Number.isFinite(n)) return [128, 128, 128]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => clamp(Math.round(v)).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  if (amount < 0) {
    const k = 1 + amount
    return rgbToHex(r * k, g * k, b * k)
  }
  return mix(hex, '#ffffff', amount)
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

export function contrastLine(hex: string): string {
  return luminance(hex) < 0.32 ? shade(hex, 0.55) : shade(hex, -0.52)
}

export const FALLBACK_PALETTE: Palette = {
  base: '#B9A38C',
  dark: '#6E5C4A',
  light: '#DCCBB6',
  pattern: false,
  patternAngle: 45,
}

function average(pixels: Uint8ClampedArray, indices: number[]): [number, number, number] {
  let r = 0
  let g = 0
  let b = 0
  for (const i of indices) {
    r += pixels[i]
    g += pixels[i + 1]
    b += pixels[i + 2]
  }
  const n = Math.max(1, indices.length)
  return [r / n, g / n, b / n]
}

/**
 * Достаёт доминирующий цвет вещи и признак рисунка.
 * Белый фон карточки товара игнорируется, прозрачность — тоже.
 */
export function extractPalette(source: HTMLImageElement | ImageBitmap): Palette {
  const size = 96
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return FALLBACK_PALETTE
  ctx.clearRect(0, 0, size, size)
  ctx.drawImage(source, 0, 0, size, size)
  const { data } = ctx.getImageData(0, 0, size, size)

  const buckets = new Map<number, number[]>()
  const kept: number[] = []
  let rSum = 0
  let gSum = 0
  let bSum = 0
  let count = 0

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a < 128) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    rSum += r
    gSum += g
    bSum += b
    count += 1

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const isPaper = luma > 238 && Math.max(r, g, b) - Math.min(r, g, b) < 14
    if (isPaper) continue

    kept.push(i)
    const key = ((r >> 5) << 10) | ((g >> 5) << 5) | (b >> 5)
    const list = buckets.get(key)
    if (list) list.push(i)
    else buckets.set(key, [i])
  }

  if (kept.length < count * 0.04 || buckets.size === 0) {
    // Почти всё — белый фон или белая вещь: берём средний тон и делаем его тёплым.
    const avg: [number, number, number] =
      count > 0 ? [rSum / count, gSum / count, bSum / count] : [190, 178, 162]
    const base = rgbToHex(
      clamp(avg[0] * 0.97 + 8),
      clamp(avg[1] * 0.96 + 5),
      clamp(avg[2] * 0.94),
    )
    return {
      base,
      dark: shade(base, -0.38),
      light: shade(base, 0.28),
      pattern: false,
      patternAngle: 45,
    }
  }

  let best: number[] = []
  for (const list of buckets.values()) {
    if (list.length > best.length) best = list
  }

  const [r, g, b] = average(data, best)
  let base = rgbToHex(r, g, b)
  if (luminance(base) > 0.92) base = shade(base, -0.12)

  // Разброс яркости внутри вещи — грубый, но устойчивый признак принта.
  let mean = 0
  for (const i of kept) mean += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
  mean /= kept.length
  let variance = 0
  for (const i of kept) {
    const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    variance += (l - mean) ** 2
  }
  const deviation = Math.sqrt(variance / kept.length)

  return {
    base,
    dark: shade(base, -0.36),
    light: shade(base, 0.34),
    pattern: deviation > 55,
    patternAngle: 45,
  }
}
