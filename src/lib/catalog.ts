import type { Category, Gender, GarmentLayer } from '../types'

export interface CategoryDef {
  id: string
  label: string
  layer: GarmentLayer
  noun: string
}

export interface CategoryGroup {
  group: string
  items: CategoryDef[]
}

const MEN: CategoryGroup[] = [
  {
    group: 'Верхняя одежда',
    items: [
      { id: 'm-outerwear', label: 'Верхняя одежда', layer: 'outerwear', noun: 'outerwear' },
      { id: 'm-blazer', label: 'Блейзеры', layer: 'outerwear', noun: 'blazer' },
      { id: 'm-puffer', label: 'Пуховики', layer: 'outerwear', noun: 'puffer jacket' },
    ],
  },
  {
    group: 'Костюмы и комплекты',
    items: [
      { id: 'm-suit', label: 'Классические костюмы', layer: 'set', noun: 'classic suit' },
      { id: 'm-set', label: 'Комплекты', layer: 'set', noun: 'matching set' },
    ],
  },
  {
    group: 'Верх',
    items: [
      { id: 'm-shirt', label: 'Рубашки', layer: 'top', noun: 'shirt' },
      { id: 'm-polo', label: 'Поло', layer: 'top', noun: 'polo shirt' },
      { id: 'm-sweater', label: 'Свитеры | кардиганы', layer: 'top', noun: 'sweater or cardigan' },
      { id: 'm-tshirt', label: 'Футболки | лонгсливы', layer: 'top', noun: 't-shirt or long sleeve' },
      { id: 'm-hoodie', label: 'Толстовки', layer: 'top', noun: 'hoodie' },
    ],
  },
  {
    group: 'Низ',
    items: [
      { id: 'm-trousers', label: 'Брюки', layer: 'bottom', noun: 'trousers' },
      { id: 'm-jeans', label: 'Джинсы', layer: 'bottom', noun: 'jeans' },
    ],
  },
  {
    group: 'Дом',
    items: [
      {
        id: 'm-home',
        label: 'Нижнее бельё | одежда для дома',
        layer: 'set',
        noun: 'loungewear set',
      },
    ],
  },
  {
    group: 'Обувь',
    items: [{ id: 'm-shoes', label: 'Обувь', layer: 'shoes', noun: 'shoes' }],
  },
  {
    group: 'Аксессуары',
    items: [
      { id: 'm-bag', label: 'Сумки | рюкзаки', layer: 'accessory', noun: 'bag or backpack' },
      { id: 'm-accessory', label: 'Аксессуары', layer: 'accessory', noun: 'accessory' },
      { id: 'm-hat', label: 'Шапка', layer: 'accessory', noun: 'hat' },
    ],
  },
]

const WOMEN: CategoryGroup[] = [
  {
    group: 'Верхняя одежда',
    items: [
      { id: 'w-outerwear', label: 'Верхняя одежда', layer: 'outerwear', noun: 'outerwear' },
      { id: 'w-puffer', label: 'Пуховики', layer: 'outerwear', noun: 'puffer jacket' },
      { id: 'w-fur', label: 'Мех', layer: 'outerwear', noun: 'fur coat' },
      { id: 'w-blazer', label: 'Блейзеры | жилеты', layer: 'outerwear', noun: 'blazer or vest' },
    ],
  },
  {
    group: 'Платья и костюмы',
    items: [
      { id: 'w-dress', label: 'Платья', layer: 'dress', noun: 'dress' },
      { id: 'w-suit', label: 'Костюмы | комплекты', layer: 'set', noun: 'suit or matching set' },
      { id: 'w-sport', label: 'Спортивные комплекты', layer: 'set', noun: 'sport set' },
    ],
  },
  {
    group: 'Верх',
    items: [
      { id: 'w-knit', label: 'Трикотаж', layer: 'top', noun: 'knitwear' },
      { id: 'w-top', label: 'Топы | боди', layer: 'top', noun: 'top or bodysuit' },
      { id: 'w-blouse', label: 'Рубашки | блузы', layer: 'top', noun: 'shirt or blouse' },
      { id: 'w-tshirt', label: 'Футболки | лонгсливы', layer: 'top', noun: 't-shirt or long sleeve' },
      { id: 'w-sweater', label: 'Свитеры | кардиганы', layer: 'top', noun: 'sweater or cardigan' },
      { id: 'w-hoodie', label: 'Толстовки', layer: 'top', noun: 'hoodie' },
    ],
  },
  {
    group: 'Низ',
    items: [
      { id: 'w-trousers', label: 'Брюки', layer: 'bottom', noun: 'trousers' },
      { id: 'w-jeans', label: 'Джинсы', layer: 'bottom', noun: 'jeans' },
      { id: 'w-skirt', label: 'Юбки | шорты', layer: 'bottom', noun: 'skirt or shorts' },
    ],
  },
  {
    group: 'Дом',
    items: [
      {
        id: 'w-home',
        label: 'Нижнее бельё | одежда для дома',
        layer: 'set',
        noun: 'loungewear set',
      },
    ],
  },
  {
    group: 'Обувь',
    items: [{ id: 'w-shoes', label: 'Обувь', layer: 'shoes', noun: 'shoes' }],
  },
  {
    group: 'Аксессуары',
    items: [
      { id: 'w-bag', label: 'Сумки', layer: 'accessory', noun: 'bag' },
      { id: 'w-jewelry', label: 'Украшения', layer: 'accessory', noun: 'jewelry' },
      { id: 'w-accessory', label: 'Аксессуары', layer: 'accessory', noun: 'accessory' },
      { id: 'w-hat', label: 'Шапка', layer: 'accessory', noun: 'hat' },
    ],
  },
]

export const CATALOG: Record<Gender, CategoryGroup[]> = {
  men: MEN,
  women: WOMEN,
}

export const ALL_CATEGORIES: CategoryDef[] = [...MEN, ...WOMEN].flatMap((group) => group.items)

export const CATEGORY_BY_ID: Record<string, CategoryDef> = Object.fromEntries(
  ALL_CATEGORIES.map((item) => [item.id, item]),
)

export function defaultCategoryId(gender: Gender): string {
  return gender === 'men' ? 'm-shirt' : 'w-dress'
}

export function categoryForLayer(layer: GarmentLayer): Category | null {
  if (layer === 'top') return 'top'
  if (layer === 'bottom') return 'bottom'
  if (layer === 'dress') return 'dress'
  if (layer === 'set') return 'dress'
  if (layer === 'outerwear') return 'outerwear'
  return null
}
