import { FIELDS, recommendSize, validateMeasurements } from '../lib/measure'
import { primaryCategory, primarySizeSystem } from '../lib/look'
import { useStore } from '../state/store'
import { Arrow, Button, NumberField, StepHead } from '../components/ui'

export function StepMeasure() {
  const { state, dispatch } = useStore()
  const errors = validateMeasurements(state.measurements)
  const errorCount = Object.keys(errors).length
  const category = primaryCategory(state.items)
  const system = primarySizeSystem(state.items)
  const advice = recommendSize(state.measurements, category, system)

  const main = FIELDS.filter((field) => field.group === 'main')
  const extra = FIELDS.filter((field) => field.group === 'extra')

  return (
    <section className="step">
      <StepHead
        index="03 — мерки"
        title="Десять значений"
        lead="Мерки задают пропорции макета и рекомендацию размера. Если не измеряли — подставьте оценку по росту и поправьте."
        aside={
          <Button variant="ghost" onClick={() => dispatch({ type: 'estimate' })}>
            Подставить по росту
          </Button>
        }
      />

      <div className="measure-layout">
        <div className="measure-form">
          <div className="field-section">
            <h3 className="field-section-title">Основные</h3>
            <div className="field-grid">
              {main.map((field) => (
                <NumberField
                  key={field.key}
                  label={field.label}
                  value={state.measurements[field.key]}
                  onChange={(value) =>
                    dispatch({ type: 'measurements', patch: { [field.key]: value } })
                  }
                  hint={field.hint}
                  error={errors[field.key]}
                  min={field.min}
                  max={field.max}
                />
              ))}
            </div>
          </div>

          <div className="field-section">
            <h3 className="field-section-title">Дополнительные</h3>
            <div className="field-grid">
              {extra.map((field) => (
                <NumberField
                  key={field.key}
                  label={field.label}
                  value={state.measurements[field.key]}
                  onChange={(value) =>
                    dispatch({ type: 'measurements', patch: { [field.key]: value } })
                  }
                  hint={field.hint}
                  error={errors[field.key]}
                  min={field.min}
                  max={field.max}
                />
              ))}
            </div>
          </div>
        </div>

        <aside className="measure-aside">
          <div className="advice-card">
            <span className="advice-kicker">рекомендованный размер</span>
            <p className="advice-size">
              {advice.row ? `${advice.row.label} · ${advice.row.ru}` : '—'}
            </p>
            <p className="advice-text">{advice.reason}</p>
            {advice.fit && <p className="advice-fit">{advice.fit}</p>}
            <p className="advice-note">Это ориентир по обхватам, а не гарантия посадки у конкретного бренда.</p>
          </div>
        </aside>
      </div>

      <div className="actions">
        <Button variant="quiet" onClick={() => dispatch({ type: 'step', step: 2 })}>
          Назад
        </Button>
        <div className="actions-right">
          <span className={`actions-hint${errorCount ? ' is-error' : ''}`}>
            {errorCount ? `Проверьте ${errorCount} ${plural(errorCount)}` : 'Мерки в порядке'}
          </span>
          <Button disabled={errorCount > 0} onClick={() => dispatch({ type: 'step', step: 4 })}>
            К примерке
            <Arrow />
          </Button>
        </div>
      </div>
    </section>
  )
}

function plural(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'значение'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'значения'
  return 'значений'
}
