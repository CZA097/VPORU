import { useState } from 'react'
import type { Measurements } from '../types'
import { easeNote, recommendSize } from '../lib/measure'
import { itemSizeAdvice, primaryCategory, primaryItem, primarySizeSystem } from '../lib/look'
import { useStore } from '../state/store'
import { Arrow, Button, Note, StepHead } from '../components/ui'
import { Preview } from '../components/Preview'
import { SizeTable } from '../components/SizeTable'

export function StepTryOn() {
  const { state, dispatch, generate } = useStore()
  const primary = primaryItem(state.items)
  const category = primaryCategory(state.items)
  const system = primarySizeSystem(state.items)
  const advice = recommendSize(state.measurements, category, system)
  const images = state.result?.kind === 'image' ? state.result.images : undefined
  const available = state.server.genapi
  const price = `${new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(state.server.price)} ₽`
  const itemAdvice = state.items.flatMap((item) => {
    const itemAdviceValue = itemSizeAdvice(item, state.measurements)
    return itemAdviceValue ? [{ item, advice: itemAdviceValue }] : []
  })

  const [confirming, setConfirming] = useState(false)
  const [repeatConfirm, setRepeatConfirm] = useState(false)

  const ease = (() => {
    const notes: string[] = []
    const chest = primary?.chest ? Number.parseFloat(primary.chest) : null
    const waist = primary?.waist ? Number.parseFloat(primary.waist) : null
    const hips = primary?.hips ? Number.parseFloat(primary.hips) : null
    if (chest) notes.push(easeNote(chest, state.measurements.chest))
    if (waist && category !== 'top') notes.push(easeNote(waist, state.measurements.waist))
    if (hips && category !== 'top') notes.push(easeNote(hips, state.measurements.hips))
    return notes.filter(Boolean)
  })()

  function start() {
    if (!available) return
    if (!confirming) {
      setConfirming(true)
      return
    }
    setConfirming(false)
    void generate(true)
  }

  function repeat() {
    if (!repeatConfirm) {
      setRepeatConfirm(true)
      return
    }
    setRepeatConfirm(false)
    void generate(true)
  }

  return (
    <section className="step">
      <StepHead
        index="04 — примерка"
        title="Реальный кадр"
        lead="AI примеряет вещь на вашем фото. Спереди — готовый кадр."
        aside={<span className="step-aside-note">AI-примерка</span>}
      />

      {state.status === 'working' && (
        <div className="working">
          <div className="working-stage working-stage-wait" aria-hidden="true">
            <span className="working-spinner" />
            <span className="working-mark">AI-примерка</span>
          </div>
          <div className="working-copy" role="status" aria-live="polite">
            <span className="working-kicker">собираем примерку</span>
            <p className="working-text">{state.progress}</p>
            <div className="working-bar">
              <span />
            </div>
            <p className="working-note">Обычно 20–30 секунд.</p>
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="error-card" role="alert">
          <span className="error-kicker">не получилось</span>
          <p className="error-text">{state.error}</p>
          <Button variant="ghost" onClick={() => dispatch({ type: 'idle' })}>
            Вернуться к примерке
          </Button>
          <p className="working-note">Повторная генерация может списать стоимость ещё раз.</p>
        </div>
      )}

      {state.status === 'idle' && (
        <div className="compose-wrap">
          <div className="compose">
            <figure className="compose-item">
              {state.bodyFront && <img src={state.bodyFront.dataUrl} alt="Фото тела" />}
              <figcaption>тело</figcaption>
            </figure>
            <span className="compose-op" aria-hidden="true">
              +
            </span>
            <figure className="compose-item">
              {primary && <img src={primary.photo.dataUrl} alt="Фото вещи" />}
              <figcaption>
                вещь{state.items.length > 1 ? ` · ${state.items.length}` : ''}
              </figcaption>
            </figure>
            <span className="compose-op" aria-hidden="true">
              =
            </span>
            <div className="compose-item compose-result">
              <strong>{advice.row ? `${advice.row.label} · ${advice.row.ru}` : '—'}</strong>
              <span>размер</span>
            </div>
          </div>

          <GenApiConnect
            connected={available}
            price={price}
            onChange={(connected) => {
              dispatch({ type: 'server', genapi: connected, price: state.server.price })
            }}
          />

          <div className="compose-actions">
            <Button onClick={start} disabled={!available}>
              {confirming ? `Подтвердить ${price}` : `Примерить за ${price}`}
              <Arrow />
            </Button>
            <button type="button" className="link" onClick={() => dispatch({ type: 'step', step: 3 })}>
              Изменить мерки
            </button>
          </div>

          {!available ? (
            <Note>Подключите ключ GenAPI выше, чтобы включить реальную примерку.</Note>
          ) : confirming ? (
            <Note tone="warn">
              Спишется {price} за одну генерацию. Нажмите «Подтвердить» ещё раз, чтобы запустить.
            </Note>
          ) : (
            <Note>{price} за кадр · обычно 20–30 секунд.</Note>
          )}
        </div>
      )}

      {state.status === 'ready' && state.result && (
        <div className="result-grid">
          <Preview
            view={state.view}
            bodyFront={state.bodyFront}
            compare={state.compare}
            onView={(view) => dispatch({ type: 'view', view })}
            images={images}
          />

          <aside className="result-panel">
            <div className="size-card">
              <span className="advice-kicker">реальный кадр · ваш размер</span>
              <p className="advice-size">
                {advice.row ? `${advice.row.label} · ${advice.row.ru}` : '—'}
              </p>
              <p className="advice-text">{advice.reason}</p>
              {advice.fit && <p className="advice-fit">{advice.fit}</p>}
            </div>

            {ease.length > 0 && (
              <div className="ease-list">
                <h3>Посадка вещи</h3>
                {ease.map((text) => (
                  <p key={text}>{text}</p>
                ))}
              </div>
            )}

            {state.items.length > 1 && itemAdvice.length > 0 && (
              <div className="ease-list">
                <h3>Размеры образа</h3>
                {itemAdvice.map(({ item, advice: itemSize }) => (
                  <p key={item.id}>
                    {item.label}:{' '}
                    <strong>
                      {itemSize.row ? `${itemSize.row.label} · ${itemSize.row.ru}` : '—'}
                    </strong>
                  </p>
                ))}
              </div>
            )}

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
              <Button onClick={() => dispatch({ type: 'like' })}>
                Нравится — к сохранению
                <Arrow />
              </Button>
              <Button variant="ghost" onClick={() => dispatch({ type: 'step', step: 3 })}>
                Изменить мерки
              </Button>
              <Button variant="quiet" onClick={repeat}>
                {repeatConfirm ? `Подтвердить ещё раз · ${price}` : `Ещё раз · ${price}`}
              </Button>
            </div>

            <div className="facts">
              <h3>Мерки</h3>
              <dl>
                <Fact label="Рост" value={state.measurements.height} />
                <Fact label="Грудь" value={state.measurements.chest} />
                <Fact label="Талия" value={state.measurements.waist} />
                <Fact label="Бёдра" value={state.measurements.hips} />
                <Fact label="Плечи" value={state.measurements.shoulders} />
                <Fact label="Нога" value={state.measurements.inseam} />
              </dl>
            </div>

            <p className="meta-note">{state.result.meta.note}</p>
          </aside>
        </div>
      )}

      {state.status === 'ready' && (
        <details className="size-details">
          <summary>Показать размерную сетку</summary>
          <SizeTable measurements={state.measurements} category={category} system={system} />
        </details>
      )}
    </section>
  )
}

function Fact({ label, value }: { label: string; value: Measurements[keyof Measurements] }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value} см</dd>
    </div>
  )
}

function GenApiConnect({
  connected,
  price,
  onChange,
}: {
  connected: boolean
  price: string
  onChange: (connected: boolean) => void
}) {
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function connect() {
    if (busy) return
    setBusy(true)
    setError('')
    setDone(false)
    try {
      const response = await fetch('/api/genapi/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim() }),
      })
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string }
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Не удалось подключить ключ GenAPI.')
      }
      setKey('')
      setDone(true)
      onChange(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось подключить ключ GenAPI.')
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    if (busy) return
    setBusy(true)
    setError('')
    setDone(false)
    try {
      await fetch('/api/genapi/disconnect', { method: 'POST' })
      onChange(false)
    } catch {
      setError('Не удалось отключить ключ. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="genapi-connect">
      <div className="genapi-connect-head">
        <strong>GenAPI</strong>
        <span className={connected ? 'genapi-state is-on' : 'genapi-state'}>
          {connected ? 'подключён' : 'не подключён'}
        </span>
      </div>

      {connected ? (
        <>
          <p>
            Ключ сохранён в локальном <code>.env</code> на этом компьютере. В браузер он не передаётся.
            Один кадр — {price}.
          </p>
          <div className="genapi-actions">
            <button type="button" className="link" onClick={disconnect} disabled={busy}>
              {busy ? 'Отключаем…' : 'Отключить ключ'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p>
            Вставьте свой ключ из личного кабинета GenAPI. Проверка бесплатная: генерация не
            запускается, деньги не списываются.
          </p>
          <div className="genapi-row">
            <input
              className="text-input"
              type="password"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="ключ GenAPI"
              aria-label="Ключ GenAPI"
              autoComplete="off"
              spellCheck={false}
            />
            <Button variant="ghost" onClick={connect} disabled={busy || key.trim().length < 8}>
              {busy ? 'Проверяем…' : 'Подключить'}
            </Button>
          </div>
          <p className="genapi-hint">
            Ключ хранится только на этом компьютере, в файле <code>.env</code>. В интерфейсе и в
            браузере он не показывается.
          </p>
          {error && (
            <p className="upload-error" role="alert">
              {error}
            </p>
          )}
          {done && (
            <p className="genapi-ok" role="status">
              Готово: GenAPI подключён.
            </p>
          )}
        </>
      )}
    </div>
  )
}
