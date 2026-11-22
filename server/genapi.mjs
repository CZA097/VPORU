const API = 'https://api.gen-api.ru'
const MODEL = 'nano-banana'
export const GENAPI_PRICE = Number(process.env.GENAPI_PRICE || 9.75)

function currentKey() {
  return String(process.env.GENAPI_KEY || '').trim()
}

export class GenApiError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.name = 'GenApiError'
    this.status = status
  }
}

function authHeaders() {
  const key = currentKey()
  if (!key) throw new GenApiError('Ключ GenAPI не настроен на сервере.', 501)
  return { Authorization: `Bearer ${key}` }
}

/**
 * Проверяет ключ бесплатно: запрашивает несуществующую генерацию.
 * Валидный ключ получает 404, неверный — 401. Деньги не списываются.
 */
export async function verifyKey(key) {
  const clean = String(key || '').trim()
  if (!clean) throw new GenApiError('Вставьте ключ GenAPI.', 400)
  const response = await fetch(
    `${API}/api/v1/request/get/00000000-0000-0000-0000-000000000000`,
    {
      headers: { Authorization: `Bearer ${clean}` },
      signal: AbortSignal.timeout(20_000),
    },
  )
  if (response.status === 401 || response.status === 403) {
    throw new GenApiError('GenAPI не принял этот ключ.', 401)
  }
  if (response.status >= 500) {
    throw new GenApiError('GenAPI временно недоступен. Попробуйте ещё раз.', 502)
  }
  return true
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseDataUrl(dataUrl, fallbackName) {
  const match = /^data:(image\/[a-z+.-]+);base64,(.+)$/i.exec(String(dataUrl || ''))
  if (!match) {
    throw new GenApiError('Ожидалось изображение в формате data URL.', 400)
  }
  const mime = match[1].toLowerCase()
  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.length === 0) throw new GenApiError('Пустое изображение.', 400)
  if (buffer.length > 8 * 1024 * 1024) {
    throw new GenApiError('Изображение больше 8 МБ. Уменьшите его перед загрузкой.', 413)
  }
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
  return { buffer, mime, ext, name: fallbackName }
}

function errorMessage(text, status) {
  try {
    const data = JSON.parse(text)
    if (data?.errors_validation) {
      const messages = Object.values(data.errors_validation).flat()
      if (messages.length) return messages.join(' ')
    }
    if (typeof data?.message === 'string') return data.message
    if (typeof data?.error === 'string') return data.error
  } catch {
    // не JSON — покажем текст ниже
  }
  if (status === 401) return 'GenAPI не принял ключ. Проверьте GENAPI_KEY.'
  if (status === 402) return 'На балансе GenAPI недостаточно средств.'
  if (status === 429) return 'GenAPI ограничил частоту запросов. Попробуйте позже.'
  return text?.slice(0, 300) || `GenAPI ответил ${status}`
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
    signal: AbortSignal.timeout(options.timeout ?? 30_000),
  })
  const text = await response.text()
  if (!response.ok) {
    const message = errorMessage(text, response.status)
    const status =
      response.status === 401 || response.status === 402 || response.status === 429 || response.status === 422
        ? response.status
        : 502
    throw new GenApiError(message, status)
  }
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new GenApiError('GenAPI вернул неожиданный ответ.', 502)
  }
}

async function uploadImage(image) {
  const form = new FormData()
  form.append('file', new Blob([image.buffer], { type: image.mime }), `${image.name}.${image.ext}`)
  const data = await request('/api/files/upload', {
    method: 'POST',
    body: form,
    timeout: 45_000,
  })
  if (!data.url) throw new GenApiError('GenAPI не вернул ссылку на загруженное фото.', 502)
  return data.url
}

function aspectFor(width, height) {
  if (!width || !height) return '3:4'
  const ratio = width / height
  if (ratio < 0.62) return '9:16'
  if (ratio < 0.82) return '3:4'
  if (ratio < 1.15) return '1:1'
  if (ratio < 1.4) return '4:3'
  return '16:9'
}

const CATEGORY_PROMPT = {
  top: 'Replace the upper-body garment with the shirt or top from image 2.',
  dress: 'Replace the outfit with the dress from image 2.',
  bottom: 'Replace the lower-body garment with the trousers or skirt from image 2.',
  outerwear: 'Put the jacket or coat from image 2 on the person over the current top.',
}

export function buildPrompt({ category, measurements, size, width, height, items }) {
  const list = Array.isArray(items)
    ? items
        .filter((item) => item && typeof item === 'object' && (item.label || item.noun))
        .slice(0, 8)
        .map((item) => ({
          label: String(item.label || '').replace(/\s+/g, ' ').slice(0, 60),
          noun: String(item.noun || '').replace(/\s+/g, ' ').slice(0, 60),
          layer: String(item.layer || '').slice(0, 20),
        }))
    : []

  let garmentLine = ''
  if (list.length > 1) {
    const described = list
      .map((item, index) => `${index + 1}) ${item.label || item.noun} (${item.noun || item.layer || 'garment'})`)
      .join('; ')
    garmentLine = `Image 2 is a reference board with ${list.length} garments, in reading order: ${described}. Apply all of these garments to the person.`
  } else if (list.length === 1) {
    garmentLine = `Image 2 is the ${list[0].noun || list[0].label || 'garment'}. Put it on the person.`
  } else {
    garmentLine = CATEGORY_PROMPT[category] || CATEGORY_PROMPT.top
  }

  const bodyLine =
    measurements?.height && Number.isFinite(Number(measurements.height))
      ? `The person is ${Math.round(Number(measurements.height))} cm tall${size ? ` and wears size ${size}` : ''}.`
      : ''
  return [
    'Virtual try-on photo edit. Image 1 is the person.',
    garmentLine,
    'Replace the matching clothing items and keep all other clothing.',
    'Preserve the person\'s exact identity, face, hair, skin tone, body proportions, pose, hands, framing and crop, background, and lighting.',
    'Keep each garment\'s exact colour, pattern, stripes, collar, buttons, sleeves, length, seams, and natural fabric folds.',
    bodyLine,
    'Photorealistic, natural fit, no text, no extra objects, do not change the background.',
  ]
    .filter(Boolean)
    .join(' ')
}

async function poll(requestId) {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    await sleep(2500)
    const data = await request(`/api/v1/request/get/${requestId}`, { timeout: 20_000 })
    if (data.status === 'success') return data
    if (data.status === 'error') {
      const detail = Array.isArray(data.result) ? data.result[0] : data.result
      throw new GenApiError(detail || 'GenAPI не смог выполнить генерацию.', 502)
    }
  }
  throw new GenApiError('GenAPI не ответил за 110 секунд. Задача могла остаться в очереди.', 504)
}

async function downloadAsDataUrl(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!response.ok) throw new GenApiError('Не удалось скачать результат GenAPI.', 502)
  const mime = (response.headers.get('content-type') || 'image/png').split(';')[0]
  const buffer = Buffer.from(await response.arrayBuffer())
  return `data:${mime};base64,${buffer.toString('base64')}`
}

export async function generateTryOn({
  bodyFront,
  garment,
  category,
  measurements,
  size,
  items,
  width,
  height,
}) {
  const started = Date.now()
  const body = parseDataUrl(bodyFront, 'human')
  const cloth = parseDataUrl(garment, 'garment')

  const [humanUrl, garmentUrl] = await Promise.all([uploadImage(body), uploadImage(cloth)])

  const created = await request(`/api/v1/networks/${MODEL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: buildPrompt({ category, measurements, size, width, height, items }),
      image_urls: [humanUrl, garmentUrl],
      output_format: 'png',
      num_images: 1,
      aspect_ratio: aspectFor(width, height),
    }),
    timeout: 45_000,
  })

  if (!created.request_id) throw new GenApiError('GenAPI не создал задачу.', 502)

  const result = await poll(created.request_id)
  const url = Array.isArray(result.result) ? result.result[0] : result.result
  if (!url) throw new GenApiError('GenAPI вернул пустой результат.', 502)

  const image = await downloadAsDataUrl(url)

  return {
    images: { front: image },
    meta: {
      model: MODEL,
      ms: Date.now() - started,
      cost: Number(result.cost || GENAPI_PRICE),
      note: 'Готовый кадр примерки.',
    },
  }
}
