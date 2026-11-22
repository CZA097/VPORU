export type Category = 'top' | 'dress' | 'bottom' | 'outerwear'
export type SizeSystem = 'women' | 'men'
export type Gender = 'women' | 'men'
export type GarmentLayer = 'top' | 'bottom' | 'dress' | 'set' | 'outerwear' | 'shoes' | 'accessory'
export type ViewId = 'front' | 'side' | 'back'
export type BackgroundId = 'white' | 'studio' | 'city' | 'kremlin' | 'street'
export type Step = 1 | 2 | 3 | 4 | 5

export interface Measurements {
  height: number
  chest: number
  waist: number
  hips: number
  shoulders: number
  head: number
  neck: number
  inseam: number
  arm: number
  foot: number
}

export interface Photo {
  dataUrl: string
  name: string
  width: number
  height: number
}

export interface Palette {
  base: string
  dark: string
  light: string
  pattern: boolean
  patternAngle: number
}

export interface GarmentDraft {
  article: string
  categoryId: string
  sizeSystem: SizeSystem
  brandSize: string
  chest: string
  waist: string
  hips: string
}

export interface GarmentItem {
  id: string
  photo: Photo
  palette: Palette
  categoryId: string
  label: string
  layer: GarmentLayer
  article: string
  brandSize: string
  sizeSystem: SizeSystem
  chest: string
  waist: string
  hips: string
}

export interface LookLayer {
  layer: Exclude<GarmentLayer, 'accessory'>
  palette: Palette
  categoryId?: string
}

export interface VectorResult {
  kind: 'vector'
  palette: Palette
  meta: { model: string; ms: number; note: string; cost?: number }
}

export interface ImageResult {
  kind: 'image'
  images: Partial<Record<ViewId, string>>
  meta: { model: string; ms: number; note: string; cost?: number }
}

export type TryOnResult = VectorResult | ImageResult

export interface TryOnRequest {
  bodyFront: Photo
  bodySide: Photo | null
  garment: Photo
  items: GarmentItem[]
  look: LookLayer[]
  palette: Palette
  measurements: Measurements
  category: Category
  views: ViewId[]
  size?: string
}

export interface GenerateOptions {
  confirm?: boolean
  jobId?: string
}

export interface TryOnProvider {
  id: string
  label: string
  ready: boolean
  generate: (
    request: TryOnRequest,
    onProgress: (message: string) => void,
    options?: GenerateOptions,
  ) => Promise<TryOnResult>
}

export interface SizeRow {
  label: string
  ru: string
  chest: [number, number]
  waist: [number, number]
  hips: [number, number]
}
