import type { GenerateOptions, TryOnProvider, ViewId } from '../types'
import { composeGarmentBoard } from '../lib/board'
import { CATEGORY_BY_ID } from '../lib/catalog'

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

/**
 * Демо-провайдер: не зовёт сеть и не тратит кредиты.
 * Возвращает палитру вещи — по ней сцена строит пропорциональный макет
 * по меркам пользователя. Честно подписан как макет, а не как try-on.
 */
export const mockProvider: TryOnProvider = {
  id: 'mock',
  label: 'Демо-макет',
  ready: true,
  async generate(request, onProgress, _options?: GenerateOptions) {
    const started = performance.now()
    onProgress('Разбираем фото вещи')
    await wait(480)
    onProgress('Сверяем мерки и пропорции')
    await wait(620)
    onProgress('Строим три ракурса')
    await wait(680)
    return {
      kind: 'vector',
      palette: request.palette,
      meta: {
        model: 'vporu-mock/1',
        ms: Math.round(performance.now() - started),
        note: 'Пропорциональный макет по вашим меркам. Не фотореалистичная примерка.',
      },
    }
  },
}

interface ServerResponse {
  images?: Partial<Record<ViewId, string>>
  meta?: { model?: string; ms?: number; cost?: number; note?: string }
  message?: string
  error?: string
}

/**
 * Реальная примерка через сервер.
 * Ключ GenAPI живёт только на сервере; браузер отправляет два фото и ждёт ответ.
 */
export const genApiProvider: TryOnProvider = {
  id: 'genapi',
  label: 'AI-примерка',
  ready: true,
  async generate(request, onProgress, options?: GenerateOptions) {
    onProgress(request.items.length > 1 ? 'Собираем вещи в один образ' : 'Загружаем фото')

    let stage = 0
    const stages = [
      'Создаём задачу в GenAPI',
      'Ждём результат — обычно 20–30 секунд',
      'Собираем готовый кадр',
    ]
    const timer = window.setInterval(() => {
      onProgress(stages[Math.min(stage, stages.length - 1)])
      stage += 1
    }, 6000)

    try {
      const board = request.items.length > 1 ? await composeGarmentBoard(request.items) : request.garment.dataUrl
      const items = request.items.map((item) => ({
        label: item.label,
        layer: item.layer,
        noun: CATEGORY_BY_ID[item.categoryId]?.noun ?? item.label.toLowerCase(),
      }))

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'genapi',
          confirm: options?.confirm === true,
          jobId: options?.jobId,
          views: request.views,
          category: request.category,
          measurements: request.measurements,
          size: request.size ?? '',
          items,
          bodyFront: request.bodyFront.dataUrl,
          garment: board,
          bodyWidth: request.bodyFront.width,
          bodyHeight: request.bodyFront.height,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as ServerResponse
      if (!response.ok) {
        throw new Error(data.message || 'GenAPI не смог выполнить примерку. Попробуйте ещё раз.')
      }
      if (!data.images?.front) {
        throw new Error('GenAPI не вернул изображение')
      }
      return {
        kind: 'image',
        images: data.images,
        meta: {
          model: data.meta?.model ?? 'nano-banana',
          ms: data.meta?.ms ?? 0,
          cost: data.meta?.cost,
          note:
            data.meta?.note ??
            'Готовый кадр примерки.',
        },
      }
    } finally {
      window.clearInterval(timer)
    }
  },
}
