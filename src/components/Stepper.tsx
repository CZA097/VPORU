import type { Step } from '../types'
import { canGo, useStore } from '../state/store'

const ITEMS: { step: Step; label: string; meta: string }[] = [
  { step: 1, label: 'Тело', meta: 'фото и рост' },
  { step: 2, label: 'Вещь', meta: 'фото и артикул' },
  { step: 3, label: 'Мерки', meta: 'десять значений' },
  { step: 4, label: 'Примерка', meta: 'реальный кадр' },
  { step: 5, label: 'Сохранение', meta: 'экспорт PNG' },
]

export function Stepper() {
  const { state, dispatch } = useStore()

  return (
    <nav className="stepper" aria-label="Этапы">
      <ol>
        {ITEMS.map((item) => {
          const allowed = canGo(item.step, state)
          const active = state.step === item.step
          const done = state.step > item.step && allowed
          const label = item.label
          const meta = item.meta
          return (
            <li key={item.step} className={`step-item${active ? ' is-active' : ''}${done ? ' is-done' : ''}`}>
              <button
                type="button"
                className="step-link"
                disabled={!allowed}
                aria-current={active ? 'step' : undefined}
                aria-label={`Шаг ${item.step}: ${label}`}
                onClick={() => dispatch({ type: 'step', step: item.step })}
              >
                <span className="step-num">{done ? '✓' : String(item.step).padStart(2, '0')}</span>
                <span className="step-text">
                  <span className="step-label">{label}</span>
                  <span className="step-meta">{meta}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
