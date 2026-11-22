import { useEffect, useRef } from 'react'
import { StepBody } from './steps/StepBody'
import { StepGarment } from './steps/StepGarment'
import { StepMeasure } from './steps/StepMeasure'
import { StepTryOn } from './steps/StepTryOn'
import { StepBackground } from './steps/StepBackground'
import { Stepper } from './components/Stepper'
import { useStore } from './state/store'

const TITLES: Record<number, string> = {
  1: 'Тело',
  2: 'Вещь',
  3: 'Мерки',
  4: 'Примерка',
  5: 'Фон',
}

export default function App() {
  const { state } = useStore()
  const main = useRef<HTMLElement>(null)
  const live = state.server.genapi
  const price = `${new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(state.server.price)} ₽`

  useEffect(() => {
    document.title = `${TITLES[state.step]} — Впору`
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    document.documentElement.scrollTop = 0
    main.current?.focus({ preventScroll: true })
  }, [state.step])

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Впору, на главную">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="18" height="18">
              <path d="M16 8.5a3 3 0 1 1 3 3c-1.65 0-3 1.35-3 3v1.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M16 15.7 5 24h22L16 15.7Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="brand-name">Впору</span>
        </a>

        <div className="topbar-side">
          <span
            className={`demo-badge${live ? ' is-live' : ''}`}
            title={
              live
                ? 'AI-примерка подключена'
                : 'GenAPI не подключён: вставьте ключ на шаге примерки'
            }
          >
            {live ? 'AI-примерка' : 'нет ключа'}
          </span>
          <span className="topbar-note">{live ? `${price} / кадр` : 'ключ не подключён'}</span>
        </div>
      </header>

      <div className="shell">
        <aside className="rail">
          <p className="rail-kicker">AI-примерочная</p>
          <h1 className="rail-title">
            Примерьте вещь
            <br />
            до покупки.
          </h1>
          <p className="rail-lead">
            Фото тела, фото вещи и мерки. Реальный кадр, посадка и размер — на одном экране.
          </p>

          <Stepper />
        </aside>

        <main className="stage" ref={main} tabIndex={-1}>
          <div className="step-wrap" key={state.step}>
            {state.step === 1 && <StepBody />}
            {state.step === 2 && <StepGarment />}
            {state.step === 3 && <StepMeasure />}
            {state.step === 4 && <StepTryOn />}
            {state.step === 5 && <StepBackground />}
          </div>
        </main>
      </div>
    </div>
  )
}
