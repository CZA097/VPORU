import { useRef, useState } from 'react'
import { primaryCategory, primaryItem, sizeItem } from '../lib/look'
import { exportImagePng } from '../lib/export'
import { useStore } from '../state/store'
import { Arrow, Button, Note, StepHead } from '../components/ui'
import { Preview } from '../components/Preview'

export function StepBackground() {
  const { state, dispatch } = useStore()
  const primary = primaryItem(state.items)
  const sized = sizeItem(state.items)
  const category = primaryCategory(state.items)
  const image = useRef<HTMLImageElement>(null)
  const images = state.result?.kind === 'image' ? state.result.images : undefined
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)
  const [exportError, setExportError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  async function download() {
    if (exporting) return
    setExporting(true)
    setExported(false)
    setExportError('')
    try {
      const article = (sized?.article || primary?.article || state.draft.article).replace(/[^\wа-яА-Я-]+/g, '-').replace(/^-|-$/g, '')
      const name = `vporu-${article || 'look'}-${state.view}`
      const providerImage = images?.[state.view]
      if (!providerImage) throw new Error('Нет кадра для сохранения')
      await exportImagePng(providerImage, name)
      setExported(true)
    } catch {
      setExported(false)
      setExportError('Не удалось скачать PNG. Если провайдер отдаёт изображение с другого домена, нужен CORS.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="step">
      <StepHead
        index="05 — сохранение"
        title="Сохранение"
        lead="Реальный кадр спереди готов. Скачайте PNG или сравните его с исходным фото."
        aside={<span className="step-aside-note">PNG 1800 × 2400</span>}
      />

      <div className="result-grid">
        <Preview
          view={state.view}
          bodyFront={state.bodyFront}
          compare={state.compare}
          onView={(view) => dispatch({ type: 'view', view })}
          images={images}
          imageRef={image}
        />

        <aside className="result-panel">
          <div className="bg-section">
            <h3 className="panel-title">Сохранение</h3>
            <Note>
              Реальный кадр спереди приходит от Nano Banana с исходным фоном. Бок и зад эта модель не
              генерирует. Скачайте PNG или вернитесь к примерке.
            </Note>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={state.compare}
              onChange={(event) => dispatch({ type: 'compare', compare: event.target.checked })}
            />
            <span className="switch-track" aria-hidden="true" />
            <span>Сравнить с моим фото</span>
          </label>

          <div className="result-actions">
            <Button onClick={() => void download()} disabled={exporting}>
              {exporting ? 'Собираем PNG…' : 'Скачать PNG'}
            </Button>
            <Button variant="ghost" onClick={() => dispatch({ type: 'step', step: 4 })}>
              Назад к примерке
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                if (!confirmReset) {
                  setConfirmReset(true)
                  window.setTimeout(() => setConfirmReset(false), 4000)
                  return
                }
                dispatch({ type: 'reset' })
              }}
            >
              {confirmReset ? 'Точно начать заново?' : 'Начать заново'}
            </Button>
          </div>

          {exported && (
            <Note tone="quiet">
              PNG сохранён. Если браузер спросил разрешение на скачивание — подтвердите.
            </Note>
          )}
          {exportError && (
            <p className="upload-error" role="alert">
              {exportError}
            </p>
          )}

          <div className="facts">
            <h3>Что в кадре</h3>
            <dl>
              <div>
                <dt>Артикул</dt>
                <dd>{sized?.article || primary?.article || '—'}</dd>
              </div>
              <div>
                <dt>Категория</dt>
                <dd>{categoryLabel(category)}</dd>
              </div>
              <div>
                <dt>Размер</dt>
                <dd>{sized?.brandSize || '—'}</dd>
              </div>
              <div>
                <dt>Вещей</dt>
                <dd>{state.items.length || '—'}</dd>
              </div>
            </dl>
          </div>

          <p className="meta-note">
            Спереди — реальный кадр Nano Banana. Бок и зад эта модель не генерирует. Фон — из исходного
            фото.
          </p>
        </aside>
      </div>

      <div className="actions">
        <span className="actions-hint">Реальный кадр готов</span>
        <button type="button" className="link" onClick={() => dispatch({ type: 'step', step: 4 })}>
          Вернуться к примерке
          <Arrow />
        </button>
      </div>
    </section>
  )
}

function categoryLabel(category: string): string {
  if (category === 'dress') return 'Платье'
  if (category === 'bottom') return 'Низ'
  if (category === 'outerwear') return 'Верхняя одежда'
  return 'Верх'
}
