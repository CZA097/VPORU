import express from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const isProd = process.argv.includes('--prod') || process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT || 4400)
const bindHost = process.env.HOST || '127.0.0.1'
const displayHost = bindHost === '0.0.0.0' ? '127.0.0.1' : bindHost

// .env без зависимостей: Node 20.12+ умеет читать файл сам.
try {
  process.loadEnvFile(path.join(root, '.env'))
} catch {
  // .env не обязателен — в демо-режиме ключи не нужны.
}

// Импортируем после .env, чтобы модуль увидел GENAPI_KEY и цену.
const genapi = await import('./genapi.mjs')

/**
 * Провайдеры примерки.
 *
 * mock  — полностью в браузере, без ключа и без трат.
 * genapi — Nano Banana за рубли, ключ только здесь, в .env.
 * fashn — зарубежный try-on, включается при наличии FASHN_API_KEY.
 */
const providers = {
  mock: { configured: true, mode: 'client', label: 'Демо-макет' },
  genapi: {
    configured: Boolean(process.env.GENAPI_KEY),
    mode: 'server',
    label: 'AI-примерка',
    price: genapi.GENAPI_PRICE,
  },
  fashn: {
    configured: Boolean(process.env.FASHN_API_KEY),
    mode: 'server',
    label: 'FASHN',
  },
}

const ENV_PATH = path.join(root, '.env')

function syncGenapiFlag() {
  providers.genapi.configured = Boolean(String(process.env.GENAPI_KEY || '').trim())
}

/** Ключ пишем только в локальный .env; в браузер он не возвращается. */
function saveKeyToEnv(key) {
  let text = ''
  try {
    text = fs.readFileSync(ENV_PATH, 'utf8')
  } catch {
    text = ''
  }
  const lines = text
    .split(/\r?\n/)
    .filter((line) => !/^\s*GENAPI_KEY\s*=/.test(line))
  if (key) lines.push(`GENAPI_KEY=${key}`)
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
  fs.writeFileSync(ENV_PATH, `${lines.join('\n')}\n`, 'utf8')
}

const app = express()
app.disable('x-powered-by')

// Ключи и служебные файлы не должны отдаваться даже в dev-режиме.
app.use((req, res, next) => {
  if (/(^|\/)\.env(\.|$)/.test(req.path)) {
    res.status(404).end()
    return
  }
  next()
})

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'same-origin')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  if (isProd) {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    )
  }
  next()
})

app.use(express.json({ limit: '12mb' }))

// Простое ограничение, чтобы случайный цикл не сжёг кредиты API.
const hits = new Map()
function rateLimit(req, res, next) {
  const key = req.ip || 'local'
  const now = Date.now()
  const window = (hits.get(key) || []).filter((t) => now - t < 60_000)
  if (window.length >= 20) {
    res.status(429).json({
      error: 'rate_limited',
      message: 'Слишком много запросов. Подождите минуту.',
    })
    return
  }
  window.push(now)
  hits.set(key, window)
  next()
}

// Платные генерации: не больше двух параллельно и дневной лимит.
const realUsage = { day: new Date().toISOString().slice(0, 10), count: 0 }
const realJobs = new Map()
let activeReal = 0

function takeRealSlot() {
  const today = new Date().toISOString().slice(0, 10)
  if (realUsage.day !== today) {
    realUsage.day = today
    realUsage.count = 0
  }
  const limit = Number(process.env.GENAPI_DAILY_LIMIT || 20)
  if (realUsage.count >= limit) {
    return { ok: false, message: `Дневной лимит — ${limit} платных генераций. Он сбросится завтра.` }
  }
  if (activeReal >= 2) {
    return { ok: false, message: 'Уже идёт генерация. Дождитесь результата.' }
  }
  realUsage.count += 1
  activeReal += 1
  return { ok: true }
}

function runRealJob(jobId, payload) {
  if (jobId && realJobs.has(jobId)) return realJobs.get(jobId)
  const promise = genapi.generateTryOn(payload)
  if (jobId) {
    realJobs.set(jobId, promise)
    promise
      .finally(() => {
        setTimeout(() => realJobs.delete(jobId), 10 * 60_000)
      })
      .catch(() => {})
  }
  return promise
}

app.get('/api/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  syncGenapiFlag()
  res.json({ ok: true, providers })
})

/**
 * Подключение своего ключа GenAPI из интерфейса.
 * Проверка бесплатная — загружаем служебную картинку 1×1, генерацию не запускаем.
 */
app.post('/api/genapi/connect', rateLimit, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  const key = String(req.body?.key || '').trim()
  if (!/^[A-Za-z0-9._-]{8,300}$/.test(key)) {
    res.status(400).json({
      error: 'bad_key',
      message: 'Ключ выглядит странно: проверьте, что скопировали его целиком и без пробелов.',
    })
    return
  }
  try {
    await genapi.verifyKey(key)
  } catch (error) {
    res.status(error?.status === 401 ? 401 : 400).json({
      error: 'invalid_key',
      message:
        error?.status === 401
          ? 'GenAPI не принял этот ключ. Скопируйте ключ из личного кабинета ещё раз.'
          : error?.message || 'Не удалось проверить ключ GenAPI.',
    })
    return
  }
  process.env.GENAPI_KEY = key
  try {
    saveKeyToEnv(key)
  } catch {
    // Ключ всё равно работает до перезапуска сервера.
  }
  syncGenapiFlag()
  res.json({ ok: true, configured: true })
})

app.post('/api/genapi/disconnect', rateLimit, (_req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  delete process.env.GENAPI_KEY
  try {
    saveKeyToEnv('')
  } catch {
    // Если .env недоступен, ключ всё равно убираем из памяти.
  }
  syncGenapiFlag()
  res.json({ ok: true, configured: false })
})

app.post('/api/generate', rateLimit, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  const body = req.body || {}
  const name = String(body.provider || 'genapi')
  const provider = providers[name]

  if (!provider) {
    res.status(400).json({ error: 'unknown_provider' })
    return
  }
  if (!provider.configured) {
    res.status(501).json({
      error: 'provider_not_configured',
      message: `Провайдер «${provider.label}» не подключён: добавьте ключ в .env и перезапустите сервер.`,
    })
    return
  }
  if (provider.mode === 'client') {
    res.status(400).json({
      error: 'mock_is_client_side',
      message: 'Демо-провайдер работает в браузере и не требует сервера.',
    })
    return
  }

  if (name === 'genapi') {
    if (body.confirm !== true) {
      res.status(400).json({
        error: 'confirm_required',
        message: `Подтвердите стоимость: ${genapi.GENAPI_PRICE} ₽ за одну генерацию.`,
      })
      return
    }
    if (!body.bodyFront || !body.garment) {
      res.status(400).json({
        error: 'images_required',
        message: 'Нужны фото тела и вещи.',
      })
      return
    }

    const slot = takeRealSlot()
    if (!slot.ok) {
      res.status(429).json({ error: 'limit_reached', message: slot.message })
      return
    }

    try {
      const result = await runRealJob(String(body.jobId || '').slice(0, 100), {
        bodyFront: body.bodyFront,
        garment: body.garment,
        category: body.category,
        measurements: body.measurements,
        size: body.size,
        items: Array.isArray(body.items) ? body.items : [],
        width: Number(body.bodyWidth),
        height: Number(body.bodyHeight),
      })
      res.json(result)
    } catch (error) {
      const status = error?.status || 502
      res.status(status).json({
        error: 'provider_error',
        message: error?.message || 'GenAPI не смог выполнить примерку.',
      })
    } finally {
      activeReal = Math.max(0, activeReal - 1)
    }
    return
  }

  // FASHN оставлен заглушкой: контракт тот же, адаптер добавим при необходимости.
  res.status(501).json({
    error: 'not_implemented',
    message: 'Этот провайдер пока не подключён.',
  })
})

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found' })
})

app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.too.large') {
    res.status(413).json({ error: 'payload_too_large', message: 'Фото слишком большое.' })
    return
  }
  if (error instanceof SyntaxError) {
    res.status(400).json({ error: 'bad_json', message: 'Некорректный JSON.' })
    return
  }
  console.error(error)
  res.status(500).json({ error: 'internal' })
})

if (isProd) {
  const dist = path.join(root, 'dist')
  if (!fs.existsSync(dist)) {
    console.error('Нет папки dist. Сначала выполните: npm run build')
    process.exit(1)
  }
  app.use(
    express.static(dist, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache')
        }
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }
      },
    }),
  )
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(path.join(dist, 'index.html'))
  })
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({
    root,
    server: { middlewareMode: true },
    appType: 'spa',
  })
  app.use(vite.middlewares)
}

app.listen(port, bindHost, () => {
  console.log(`Впору запущено: http://${displayHost}:${port}`)
})
