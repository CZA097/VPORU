import type { Category, Measurements, SizeRow, SizeSystem } from '../types'

export const DEFAULT_MEASUREMENTS: Measurements = {
  height: 170,
  chest: 88,
  waist: 70,
  hips: 96,
  shoulders: 40,
  head: 56,
  neck: 37,
  inseam: 78,
  arm: 58,
  foot: 25,
}

interface FieldSpec {
  key: keyof Measurements
  label: string
  hint: string
  min: number
  max: number
  group: 'main' | 'extra'
}

export const FIELDS: FieldSpec[] = [
  {
    key: 'height',
    label: 'Рост',
    hint: 'Без обуви, от пола до макушки',
    min: 140,
    max: 210,
    group: 'main',
  },
  {
    key: 'chest',
    label: 'Грудь',
    hint: 'Обхват по самой выступающей точке',
    min: 70,
    max: 140,
    group: 'main',
  },
  {
    key: 'waist',
    label: 'Талия',
    hint: 'Самый узкий участок, не втягивая живот',
    min: 50,
    max: 140,
    group: 'main',
  },
  {
    key: 'hips',
    label: 'Бёдра',
    hint: 'Обхват по самым выступающим точкам',
    min: 75,
    max: 150,
    group: 'main',
  },
  {
    key: 'shoulders',
    label: 'Плечи',
    hint: 'Ширина от плечевого сустава до сустава',
    min: 30,
    max: 60,
    group: 'extra',
  },
  {
    key: 'head',
    label: 'Голова',
    hint: 'Обхват через лоб и затылок',
    min: 50,
    max: 64,
    group: 'extra',
  },
  {
    key: 'neck',
    label: 'Шея',
    hint: 'Обхват у основания шеи',
    min: 28,
    max: 50,
    group: 'extra',
  },
  {
    key: 'inseam',
    label: 'Нога',
    hint: 'Внутренняя длина от паха до пола',
    min: 60,
    max: 100,
    group: 'extra',
  },
  {
    key: 'arm',
    label: 'Рука',
    hint: 'От плеча до запястья',
    min: 50,
    max: 80,
    group: 'extra',
  },
  {
    key: 'foot',
    label: 'Стопа',
    hint: 'Длина стопы в сантиметрах',
    min: 21,
    max: 32,
    group: 'extra',
  },
]

export const FIELD_BY_KEY = Object.fromEntries(FIELDS.map((f) => [f.key, f])) as Record<
  keyof Measurements,
  FieldSpec
>

export function estimateFromHeight(height: number): Measurements {
  const h = Math.min(210, Math.max(140, height || 170))
  const r = (v: number) => Math.round(v)
  const raw: Measurements = {
    height: r(h),
    chest: r(h * 0.52),
    waist: r(h * 0.41),
    hips: r(h * 0.56),
    shoulders: r(h * 0.235),
    head: r(h * 0.33),
    neck: r(h * 0.22),
    inseam: r(h * 0.45),
    arm: r(h * 0.34),
    foot: r(h * 0.15),
  }

  // Оценка не должна выходить за допустимые границы: иначе кнопка
  // «подставить по росту» сама создаёт ошибку валидации.
  for (const field of FIELDS) {
    raw[field.key] = Math.min(field.max, Math.max(field.min, raw[field.key]))
  }
  return raw
}

export function validateMeasurements(m: Measurements): Partial<Record<keyof Measurements, string>> {
  const errors: Partial<Record<keyof Measurements, string>> = {}
  for (const field of FIELDS) {
    const value = m[field.key]
    if (!Number.isFinite(value)) {
      errors[field.key] = 'Введите число'
    } else if (value < field.min || value > field.max) {
      errors[field.key] = `Допустимо ${field.min}–${field.max} см`
    }
  }
  return errors
}

// Женская размерная сетка (RU), обхваты тела в сантиметрах.
export const SIZE_CHART_WOMEN: SizeRow[] = [
  { label: 'XS', ru: '40', chest: [76, 80], waist: [60, 64], hips: [84, 88] },
  { label: 'S', ru: '42', chest: [80, 84], waist: [64, 68], hips: [88, 92] },
  { label: 'M', ru: '44', chest: [84, 88], waist: [68, 72], hips: [92, 96] },
  { label: 'M–L', ru: '46', chest: [88, 92], waist: [72, 76], hips: [96, 100] },
  { label: 'L', ru: '48', chest: [92, 96], waist: [76, 80], hips: [100, 104] },
  { label: 'XL', ru: '50', chest: [96, 100], waist: [80, 84], hips: [104, 108] },
  { label: 'XXL', ru: '52', chest: [100, 104], waist: [84, 88], hips: [108, 112] },
  { label: 'XXL+', ru: '54', chest: [104, 108], waist: [88, 92], hips: [112, 116] },
]

// Мужская сетка: размер RU — это обхват груди / 2.
export const SIZE_CHART_MEN: SizeRow[] = [
  { label: 'XS', ru: '44', chest: [86, 90], waist: [74, 78], hips: [92, 96] },
  { label: 'S', ru: '46', chest: [90, 94], waist: [78, 82], hips: [96, 100] },
  { label: 'M', ru: '48', chest: [94, 98], waist: [82, 86], hips: [100, 104] },
  { label: 'L', ru: '50', chest: [98, 102], waist: [86, 90], hips: [104, 108] },
  { label: 'XL', ru: '52', chest: [102, 106], waist: [90, 94], hips: [108, 112] },
  { label: 'XXL', ru: '54', chest: [106, 110], waist: [94, 98], hips: [112, 116] },
]

export function sizeChart(system: SizeSystem): SizeRow[] {
  return system === 'men' ? SIZE_CHART_MEN : SIZE_CHART_WOMEN
}

export interface SizeAdvice {
  row: SizeRow | null
  reason: string
  fit: string
  key: string[]
}

export function recommendSize(
  m: Measurements,
  category: Category,
  system: SizeSystem = 'women',
): SizeAdvice {
  const keys: (keyof Measurements)[] =
    category === 'bottom' ? ['waist', 'hips'] : category === 'dress' ? ['chest', 'waist', 'hips'] : ['chest']

  // Небольшой запас на свободное облегание: одежда не должна быть в облипку.
  const ease = category === 'outerwear' ? 6 : category === 'top' ? 4 : category === 'dress' ? 2 : 2
  const chart = sizeChart(system)

  const fits = chart.filter((row) =>
    keys.every((key) => {
      const range = row[key as 'chest' | 'waist' | 'hips']
      return m[key as 'chest' | 'waist' | 'hips'] + ease <= range[1]
    }),
  )

  const row = fits[0] ?? chart[chart.length - 1]
  const keyLabels = keys.map((k) => FIELD_BY_KEY[k].label.toLowerCase())

  const fitParts: string[] = []
  if (keys.includes('chest')) {
    const margin = Math.round((row.chest[1] - m.chest) * 10) / 10
    fitParts.push(`по груди ${margin > 0 ? '+' : ''}${margin} см`)
  }
  if (keys.includes('waist') && category !== 'top') {
    const margin = Math.round((row.waist[1] - m.waist) * 10) / 10
    fitParts.push(`по талии ${margin > 0 ? '+' : ''}${margin} см`)
  }

  const reason =
    fits.length > 0
      ? `Подходит по параметрам: ${keyLabels.join(', ')}.`
      : `Параметры выше сетки — берите ${row.label} и проверяйте посадку у бренда.`

  return {
    row,
    reason,
    fit: fitParts.join(', '),
    key: keys,
  }
}

export function easeNote(garment: number | null, body: number): string {
  if (garment === null || !Number.isFinite(garment)) return ''
  const ease = Math.round((garment - body) * 10) / 10
  if (ease < 0) return `Вещь меньше вас на ${Math.abs(ease)} см — почти наверняка мало.`
  if (ease < 2) return `Свобода ${ease} см — сидит в облипку.`
  if (ease <= 6) return `Свобода ${ease} см — посадка по фигуре.`
  if (ease <= 12) return `Свобода ${ease} см — свободная посадка.`
  return `Свобода ${ease} см — оверсайз.`
}
