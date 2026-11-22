import { DEFAULT_MEASUREMENTS } from '../lib/measure'
import { useStore } from '../state/store'
import { Arrow, Button, NumberField, StepHead, UploadZone } from '../components/ui'

export function StepBody() {
  const { state, dispatch } = useStore()

  return (
    <section className="step">
      <StepHead
        index="01 — тело"
        title="Ваше фото"
        lead="Одно фото в полный рост, спереди. Свет ровный, руки не закрывают корпус, телефон на уровне груди."
        aside={<span className="step-aside-note">остаётся в браузере</span>}
      />

      <div className="body-grid">
        <UploadZone
          title="Фото в полный рост"
          hint="Перетащите файл или нажмите"
          value={state.bodyFront}
          onChange={(photo) => dispatch({ type: 'body', photo })}
          onClear={() => dispatch({ type: 'bodyClear' })}
          maxSide={1500}
        />

        <div className="body-side">
          <div className="tip-card">
            <h3>Как снять, чтобы сработало</h3>
            <ul>
              <li>Встаньте прямо, стопы на ширине плеч.</li>
              <li>Однотонный фон, без зеркала и складок.</li>
              <li>Одежда по фигуре — она не попадёт в кадр.</li>
              <li>Вся фигура целиком, от макушки до стоп.</li>
            </ul>
          </div>

          <NumberField
            label="Рост"
            value={state.measurements.height}
            onChange={(height) => dispatch({ type: 'measurements', patch: { height } })}
            min={140}
            max={210}
            hint={`По умолчанию ${DEFAULT_MEASUREMENTS.height} см`}
          />

          <UploadZone
            title="Профиль"
            hint="Поможет точнее построить боковой ракурс"
            value={state.bodySide}
            onChange={(photo) => dispatch({ type: 'bodySide', photo })}
            onClear={() => dispatch({ type: 'bodySide', photo: null })}
            maxSide={1200}
            compact
            optional
          />
        </div>
      </div>

      <div className="actions">
        <span className="actions-hint">
          {state.bodyFront ? 'Фото загружено — можно идти дальше' : 'Нужно хотя бы одно фото спереди'}
        </span>
        <Button disabled={!state.bodyFront} onClick={() => dispatch({ type: 'step', step: 2 })}>
          К вещи
          <Arrow />
        </Button>
      </div>
    </section>
  )
}
