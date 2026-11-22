import { useState } from 'react'
import type { Palette, Photo, SizeSystem } from '../types'
import { CATALOG, CATEGORY_BY_ID, defaultCategoryId } from '../lib/catalog'
import { imageElement } from '../lib/image'
import { extractPalette } from '../lib/palette'
import { useStore } from '../state/store'
import { Arrow, Button, StepHead, UploadZone } from '../components/ui'

export function StepGarment() {
  const { state, dispatch } = useStore()
  const [error, setError] = useState('')
  const draft = state.draft
  const groups = CATALOG[draft.sizeSystem]
  const category = CATEGORY_BY_ID[draft.categoryId]

  async function acceptGarment(photo: Photo | null) {
    if (!photo) return
    try {
      const img = await imageElement(photo.dataUrl)
      const palette = extractPalette(img)
      dispatch({ type: 'garment', photo, palette })
      setError('')
    } catch {
      setError('Не удалось разобрать цвет вещи — загрузите другой скриншот')
    }
  }

  function chooseGender(next: SizeSystem) {
    dispatch({
      type: 'draft',
      patch: { sizeSystem: next, categoryId: defaultCategoryId(next) },
    })
  }

  function addItem() {
    if (!state.garment || !state.palette) {
      setError('Сначала загрузите фото вещи')
      return
    }
    if (state.items.length >= 6) {
      setError('В одном образе можно собрать до 6 вещей')
      return
    }
    dispatch({ type: 'addItem' })
    setError('')
  }

  return (
    <section className="step">
      <StepHead
        index="02 — вещи"
        title="Что примеряем"
        lead="Соберите образ из одной или нескольких вещей: верх, низ, обувь, верхняя одежда. У каждой вещи свой артикул и размер."
        aside={state.palette ? <PaletteChips palette={state.palette} /> : undefined}
      />

      <div className="garment-grid">
        <UploadZone
          title="Фото вещи"
          hint="Лучше вещь без модели: так в макет не попадёт чужое тело"
          value={state.garment}
          onChange={(photo) => void acceptGarment(photo)}
          onClear={() => dispatch({ type: 'garmentClear' })}
          maxSide={1200}
          keepAlpha
        />

        <div className="garment-fields">
          <div className="field">
            <span className="field-label" id="gender-label">
              Для кого
            </span>
            <div className="segmented" role="group" aria-labelledby="gender-label">
              {(
                [
                  ['women', 'Женское'],
                  ['men', 'Мужское'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`segment${draft.sizeSystem === id ? ' is-active' : ''}`}
                  aria-pressed={draft.sizeSystem === id}
                  onClick={() => chooseGender(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="category">
              Категория
            </label>
            <select
              id="category"
              className="text-input select-input"
              value={draft.categoryId}
              onChange={(event) =>
                dispatch({ type: 'draft', patch: { categoryId: event.target.value } })
              }
            >
              {groups.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="article">
              Артикул
            </label>
            <input
              id="article"
              className="text-input"
              value={draft.article}
              placeholder="например, 5132-815"
              onChange={(event) => dispatch({ type: 'draft', patch: { article: event.target.value } })}
            />
            <p className="field-hint">Ссылку на магазин не сохраняем — только артикул для заметки.</p>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="brand-size">
              Размер на бирке
            </label>
            <input
              id="brand-size"
              className="text-input"
              value={draft.brandSize}
              placeholder="S, M, 48 — как указано у бренда"
              onChange={(event) => dispatch({ type: 'draft', patch: { brandSize: event.target.value } })}
            />
          </div>

          <details className="chart-details">
            <summary>Мерки вещи (если указаны)</summary>
            <p className="field-hint">
              Обхваты самой вещи в сантиметрах. По ним посчитаем свободу посадки — насколько вещь больше вас.
            </p>
            <div className="chart-grid">
              {(
                [
                  ['chest', 'Грудь'],
                  ['waist', 'Талия'],
                  ['hips', 'Бёдра'],
                ] as const
              ).map(([key, label]) => (
                <div className="field" key={key}>
                  <label className="field-label" htmlFor={`g-${key}`}>
                    {label}
                  </label>
                  <div className="field-input">
                    <input
                      id={`g-${key}`}
                      type="number"
                      inputMode="decimal"
                      value={draft[key]}
                      placeholder="—"
                      onChange={(event) => dispatch({ type: 'draft', patch: { [key]: event.target.value } })}
                    />
                    <span className="field-suffix">см</span>
                  </div>
                </div>
              ))}
            </div>
          </details>

          <Button variant="ghost" onClick={addItem} disabled={!state.garment || !state.palette}>
            Добавить в образ
          </Button>

          {error && (
            <p className="upload-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      {state.items.length > 0 && (
        <div className="look-list">
          <div className="look-list-head">
            <h3>В образе: {state.items.length}</h3>
            <span>{state.items.length >= 6 ? 'максимум 6' : 'можно добавить ещё'}</span>
          </div>
          {state.items.map((item) => (
            <div className="look-item" key={item.id}>
              <img className="look-thumb" src={item.photo.dataUrl} alt={item.label} />
              <div className="look-info">
                <strong>{item.label}</strong>
                <span>
                  {[item.article, item.brandSize].filter(Boolean).join(' · ') || 'без артикула'}
                </span>
              </div>
              <button
                type="button"
                className="link"
                onClick={() => dispatch({ type: 'removeItem', id: item.id })}
              >
                Убрать
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="actions">
        <Button variant="quiet" onClick={() => dispatch({ type: 'step', step: 1 })}>
          Назад
        </Button>
        <div className="actions-right">
          <span className="actions-hint">
            {state.items.length > 0
              ? `${state.items.length} ${itemsWord(state.items.length)} в образе`
              : state.garment
                ? 'Нажмите «Добавить в образ»'
                : 'Добавьте хотя бы одну вещь'}
          </span>
          <Button disabled={state.items.length === 0} onClick={() => dispatch({ type: 'step', step: 3 })}>
            К меркам
            <Arrow />
          </Button>
        </div>
      </div>

      {category && state.items.length === 0 && (
        <p className="note">
          Сейчас выбрано: {category.label.toLowerCase()}. Можно добавить несколько вещей — например, рубашку,
          брюки и обувь — и примерить их вместе.
        </p>
      )}
    </section>
  )
}

function itemsWord(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'вещь'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'вещи'
  return 'вещей'
}

function PaletteChips({ palette }: { palette: Palette }) {  return (
    <div className="palette" aria-label="Цвета вещи">
      <span className="palette-label">цвет вещи</span>
      <span className="swatch" style={{ background: palette.base }} title={palette.base} />
      <span className="swatch" style={{ background: palette.light }} title={palette.light} />
      <span className="swatch" style={{ background: palette.dark }} title={palette.dark} />
      {palette.pattern && <span className="palette-tag">принт</span>}
    </div>
  )
}
