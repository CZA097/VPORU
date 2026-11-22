import { type RefObject } from 'react'
import type { Photo, ViewId } from '../types'

const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'front', label: 'Спереди' },
  { id: 'side', label: 'Сбоку' },
  { id: 'back', label: 'Сзади' },
]

interface PreviewProps {
  images?: Partial<Record<ViewId, string>>
  imageRef?: RefObject<HTMLImageElement | null>
  view: ViewId
  onView: (view: ViewId) => void
  bodyFront: Photo | null
  compare: boolean
  compact?: boolean
}

export function Preview({
  images,
  imageRef,
  view,
  onView,
  bodyFront,
  compare,
  compact = false,
}: PreviewProps) {
  const available = images ? VIEWS.filter((item) => Boolean(images[item.id])) : []
  const active = available.some((item) => item.id === view) ? view : (available[0]?.id ?? view)
  const activeLabel = VIEWS.find((item) => item.id === active)?.label ?? ''
  const image = images?.[active]

  return (
    <div className={`preview${compact ? ' preview-compact' : ''}`}>
      {available.length > 1 && (
        <div className="preview-tabs" role="tablist" aria-label="Ракурс">
          {available.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active === item.id}
              aria-controls="preview-panel"
              className={`preview-tab${active === item.id ? ' is-active' : ''}`}
              onClick={() => onView(item.id)}
            >
              <span className="preview-tab-num">0{index + 1}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div
        className="scene-wrap"
        id="preview-panel"
        role="tabpanel"
        aria-label={`Ракурс: ${activeLabel}`}
      >
        {image ? (
          <img
            ref={imageRef}
            className="scene scene-image"
            src={image}
            alt={`Примерка: вид ${activeLabel.toLowerCase()}`}
          />
        ) : (
          <div className="scene-empty">Кадр появится после примерки</div>
        )}
        {compare && bodyFront && (
          <div className="compare-layer">
            <img src={bodyFront.dataUrl} alt="Ваше исходное фото" />
            <span className="compare-badge">ваше фото</span>
          </div>
        )}
        <span className="scene-caption">{activeLabel} · реальный кадр</span>
      </div>
    </div>
  )
}
