import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react'
import type {
  BackgroundId,
  Category,
  GarmentDraft,
  GarmentItem,
  Measurements,
  Palette,
  Photo,
  Step,
  TryOnResult,
  ViewId,
} from '../types'
import { DEFAULT_MEASUREMENTS, estimateFromHeight, validateMeasurements } from '../lib/measure'
import { CATEGORY_BY_ID, defaultCategoryId } from '../lib/catalog'
import { lookLayers, primaryCategory, primaryItem } from '../lib/look'
import { genApiProvider } from '../providers'

const STORAGE_KEY = 'vporu.v1'
const LEGACY_STORAGE_KEY = 'vpory.v1'
const OLD_STORAGE_KEY = 'atelier.v1'

export type Status = 'idle' | 'working' | 'ready' | 'error'
export type ProviderId = 'mock' | 'genapi'

export interface ServerInfo {
  genapi: boolean
  price: number
  checked: boolean
}

export interface State {
  step: Step
  bodyFront: Photo | null
  bodySide: Photo | null
  measurements: Measurements
  /** Текущая вещь в конструкторе, ещё не добавленная в образ. */
  garment: Photo | null
  palette: Palette | null
  draft: GarmentDraft
  /** Вещи образа: одна или несколько. */
  items: GarmentItem[]
  status: Status
  progress: string
  error: string
  result: TryOnResult | null
  view: ViewId
  background: BackgroundId
  compare: boolean
  liked: boolean
  provider: ProviderId
  server: ServerInfo
}

const EMPTY_DRAFT: GarmentDraft = {
  article: '',
  categoryId: 'w-dress',
  sizeSystem: 'women',
  brandSize: '',
  chest: '',
  waist: '',
  hips: '',
}

function persisted(): Partial<State> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY) ?? localStorage.getItem(OLD_STORAGE_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw) as {
      measurements?: Partial<Measurements>
      draft?: Partial<GarmentDraft>
      background?: BackgroundId
    }
    const backgrounds: BackgroundId[] = ['white', 'studio', 'city', 'kremlin', 'street']
    const system = data.draft?.sizeSystem === 'men' ? 'men' : 'women'
    const rawId = data.draft?.categoryId
    const validId =
      rawId && CATEGORY_BY_ID[rawId] && rawId.startsWith(system === 'men' ? 'm-' : 'w-')
        ? rawId
        : defaultCategoryId(system)
    return {
      measurements: { ...DEFAULT_MEASUREMENTS, ...(data.measurements ?? {}) },
      draft: {
        ...EMPTY_DRAFT,
        ...(data.draft ?? {}),
        sizeSystem: system,
        categoryId: validId,
      },
      background: backgrounds.includes(data.background as BackgroundId)
        ? (data.background as BackgroundId)
        : 'white',
    }
  } catch {
    return {}
  }
}

function initialState(): State {
  return {
    step: 1,
    bodyFront: null,
    bodySide: null,
    measurements: DEFAULT_MEASUREMENTS,
    garment: null,
    palette: null,
    draft: EMPTY_DRAFT,
    items: [],
    status: 'idle',
    progress: '',
    error: '',
    result: null,
    view: 'front',
    background: 'white',
    compare: false,
    liked: false,
    provider: 'genapi',
    server: { genapi: false, price: 9.75, checked: false },
    ...persisted(),
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

type Action =
  | { type: 'step'; step: Step }
  | { type: 'body'; photo: Photo }
  | { type: 'bodyClear' }
  | { type: 'bodySide'; photo: Photo | null }
  | { type: 'measurements'; patch: Partial<Measurements> }
  | { type: 'estimate' }
  | { type: 'garment'; photo: Photo; palette: Palette }
  | { type: 'garmentClear' }
  | { type: 'draft'; patch: Partial<GarmentDraft> }
  | { type: 'addItem' }
  | { type: 'removeItem'; id: string }
  | { type: 'itemsClear' }
  | { type: 'start' }
  | { type: 'progress'; text: string }
  | { type: 'ready'; result: TryOnResult }
  | { type: 'error'; message: string }
  | { type: 'view'; view: ViewId }
  | { type: 'background'; background: BackgroundId }
  | { type: 'compare'; compare: boolean }
  | { type: 'like' }
  | { type: 'idle' }
  | { type: 'provider'; provider: ProviderId }
  | { type: 'server'; genapi: boolean; price: number }
  | { type: 'reset' }

function invalidate(state: State): State {
  if (!state.result && state.status === 'idle') return state
  return {
    ...state,
    result: null,
    status: 'idle',
    progress: '',
    error: '',
    liked: false,
    compare: false,
    step: state.step === 5 ? 4 : state.step,
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'step':
      return { ...state, step: action.step }
    case 'body':
      return invalidate({ ...state, bodyFront: action.photo })
    case 'bodyClear':
      return invalidate({ ...state, bodyFront: null })
    case 'bodySide':
      return invalidate({ ...state, bodySide: action.photo })
    case 'measurements':
      return invalidate({
        ...state,
        measurements: { ...state.measurements, ...action.patch },
      })
    case 'estimate':
      return invalidate({
        ...state,
        measurements: estimateFromHeight(state.measurements.height),
      })
    case 'garment':
      return invalidate({
        ...state,
        garment: action.photo,
        palette: action.palette,
      })
    case 'garmentClear':
      return invalidate({ ...state, garment: null, palette: null })
    case 'draft':
      return invalidate({ ...state, draft: { ...state.draft, ...action.patch } })
    case 'addItem': {
      if (!state.garment || !state.palette) return state
      if (state.items.length >= 6) return state
      const def = CATEGORY_BY_ID[state.draft.categoryId]
      if (!def) return state
      const item: GarmentItem = {
        id: newId(),
        photo: state.garment,
        palette: state.palette,
        categoryId: def.id,
        label: def.label,
        layer: def.layer,
        article: state.draft.article.trim(),
        brandSize: state.draft.brandSize.trim(),
        sizeSystem: state.draft.sizeSystem,
        chest: state.draft.chest,
        waist: state.draft.waist,
        hips: state.draft.hips,
      }
      const next = invalidate({
        ...state,
        items: [...state.items, item],
        garment: null,
        palette: null,
        draft: {
          ...state.draft,
          article: '',
          brandSize: '',
          chest: '',
          waist: '',
          hips: '',
        },
      })
      return next
    }
    case 'removeItem':
      return invalidate({
        ...state,
        items: state.items.filter((item) => item.id !== action.id),
      })
    case 'itemsClear':
      return invalidate({ ...state, items: [] })
    case 'start':
      return {
        ...state,
        step: 4,
        status: 'working',
        progress: 'Готовим сцену',
        error: '',
        result: null,
        liked: false,
        compare: false,
        view: 'front',
        background: 'white',
      }
    case 'progress':
      return { ...state, progress: action.text }
    case 'ready':
      return { ...state, status: 'ready', result: action.result, progress: '' }
    case 'error':
      return { ...state, status: 'error', error: action.message, progress: '' }
    case 'view':
      return { ...state, view: action.view }
    case 'background':
      return { ...state, background: action.background }
    case 'compare':
      return { ...state, compare: action.compare }
    case 'like':
      return {
        ...state,
        liked: true,
        step: 5,
        background: state.background === 'white' ? 'white' : state.background,
      }
    case 'idle':
      return { ...state, status: 'idle', error: '', progress: '', result: null }
    case 'provider':
      return { ...state, provider: action.provider }
    case 'server':
      return {
        ...state,
        server: { genapi: action.genapi, price: action.price, checked: true },
        provider: 'genapi',
      }
    case 'reset':
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(LEGACY_STORAGE_KEY)
      localStorage.removeItem(OLD_STORAGE_KEY)
      return { ...initialState(), server: state.server, provider: state.provider }
    default:
      return state
  }
}

export function canGo(step: Step, state: State): boolean {
  if (step === 1) return true
  if (step === 2 || step === 3) return Boolean(state.bodyFront)
  if (step === 4) {
    return (
      Boolean(state.bodyFront) &&
      state.items.length > 0 &&
      Object.keys(validateMeasurements(state.measurements)).length === 0
    )
  }
  return state.status === 'ready' && Boolean(state.result)
}

interface StoreValue {
  state: State
  dispatch: Dispatch<Action>
  generate: (confirmed?: boolean) => Promise<void>
  category: Category
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const running = useRef(false)

  const generate = useCallback(
    async (confirmed = false) => {
      if (running.current) return
      const primary = primaryItem(state.items)
      if (!state.bodyFront || !primary) return

      if (!state.server.genapi) {
        dispatch({
          type: 'error',
          message: 'GenAPI не настроен. Проверьте GENAPI_KEY в .env и перезапустите сервер.',
        })
        return
      }
      if (!confirmed) {
        dispatch({ type: 'error', message: `Подтвердите стоимость: ${state.server.price} ₽.` })
        return
      }

      running.current = true
      dispatch({ type: 'start' })
      try {
        const jobId =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`

        const result = await genApiProvider.generate(
          {
            bodyFront: state.bodyFront,
            bodySide: state.bodySide,
            garment: primary.photo,
            items: state.items,
            look: lookLayers(state.items),
            palette: primary.palette,
            measurements: state.measurements,
            category: primaryCategory(state.items),
            size: primary.brandSize,
            views: ['front', 'side', 'back'],
          },
          (text) => dispatch({ type: 'progress', text }),
          { confirm: true, jobId },
        )
        dispatch({ type: 'ready', result })
      } catch (error) {
        dispatch({
          type: 'error',
          message: error instanceof Error ? error.message : 'Не получилось собрать примерку',
        })
      } finally {
        running.current = false
      }
    },
    [
      state.bodyFront,
      state.bodySide,
      state.items,
      state.measurements,
      state.server.genapi,
      state.server.price,
    ],
  )

  useEffect(() => {
    let alive = true
    fetch('/api/health', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (!alive) return
        const genapi = data?.providers?.genapi
        dispatch({
          type: 'server',
          genapi: Boolean(genapi?.configured),
          price: Number(genapi?.price) || 9.75,
        })
      })
      .catch(() => {
        if (alive) dispatch({ type: 'server', genapi: false, price: 9.75 })
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const payload = {
      measurements: state.measurements,
      draft: state.draft,
      background: state.background,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // Приватный режим или переполнение — не критично для работы.
    }
  }, [state.measurements, state.draft, state.background])

  const value = useMemo<StoreValue>(
    () => ({
      state,
      dispatch,
      generate,
      category: primaryCategory(state.items),
    }),
    [state, generate],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore вне StoreProvider')
  return value
}
