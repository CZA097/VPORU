import type { Category, GarmentItem, LookLayer, Measurements } from '../types'
import { categoryForLayer } from './catalog'
import { recommendSize, type SizeAdvice } from './measure'

export function primaryItem(items: GarmentItem[]): GarmentItem | null {
  return items[0] ?? null
}

/** Первая вещь, для которой вообще есть размер (не сумка и не обувь). */
export function sizeItem(items: GarmentItem[]): GarmentItem | null {
  return items.find((item) => categoryForLayer(item.layer) !== null) ?? null
}

/** Один слой на категорию; последняя добавленная вещь перекрывает предыдущую. */
export function lookLayers(items: GarmentItem[]): LookLayer[] {
  const layers = new Map<LookLayer['layer'], LookLayer>()
  for (const item of items) {
    if (item.layer === 'accessory') continue
    layers.set(item.layer, { layer: item.layer, palette: item.palette, categoryId: item.categoryId })
  }
  return [...layers.values()]
}

export function primaryCategory(items: GarmentItem[], fallback: Category = 'top'): Category {
  const item = sizeItem(items)
  if (!item) return fallback
  return categoryForLayer(item.layer) ?? fallback
}

export function primarySizeSystem(items: GarmentItem[]): 'women' | 'men' {
  return sizeItem(items)?.sizeSystem ?? 'women'
}

export function itemSizeAdvice(item: GarmentItem, measurements: Measurements): SizeAdvice | null {
  const category = categoryForLayer(item.layer)
  if (!category) return null
  return recommendSize(measurements, category, item.sizeSystem)
}

export function itemsSummary(items: GarmentItem[]): string {
  return items.map((item) => item.label).join(' + ')
}
