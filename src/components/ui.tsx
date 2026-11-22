import {
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from 'react'
import type { Photo } from '../types'
import { readPhoto } from '../lib/image'

/* ------------------------------------------------------------------ button */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'quiet'
  block?: boolean
}

export function Button({ variant = 'primary', block, className = '', ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`btn btn-${variant}${block ? ' btn-block' : ''}${className ? ` ${className}` : ''}`}
      {...rest}
    />
  )
}

/* ------------------------------------------------------------------- field */

interface FieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  hint?: string
  error?: string
  min?: number
  max?: number
  suffix?: string
}

export function NumberField({ label, value, onChange, hint, error, min, max, suffix = 'см' }: FieldProps) {
  const id = useId()
  return (
    <div className={`field${error ? ' field-error' : ''}`}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="field-input">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value === 0 ? '' : value}
          min={min}
          max={max}
          step={1}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          onChange={(event) => {
            const next = Number.parseFloat(event.target.value)
            onChange(Number.isFinite(next) ? next : 0)
          }}
        />
        <span className="field-suffix">{suffix}</span>
      </div>
      {error ? (
        <p className="field-hint field-hint-error" id={`${id}-err`}>
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------- upload zone */

interface UploadZoneProps {
  title: string
  hint: string
  value: Photo | null
  onChange: (photo: Photo) => void
  onClear: () => void
  maxSide: number
  keepAlpha?: boolean
  compact?: boolean
  optional?: boolean
}

export function UploadZone({
  title,
  hint,
  value,
  onChange,
  onClear,
  maxSide,
  keepAlpha = false,
  compact = false,
  optional = false,
}: UploadZoneProps) {
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function accept(file: File | undefined) {
    if (!file) return
    setError('')
    setBusy(true)
    try {
      const photo = await readPhoto(file, maxSide, keepAlpha)
      onChange(photo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить фото')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    void accept(event.dataTransfer.files[0])
  }

  return (
    <div className={`upload${compact ? ' upload-compact' : ''}`}>
      <label
        htmlFor={inputId}
        className={`drop${dragging ? ' is-dragging' : ''}${value ? ' has-value' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={input}
          id={inputId}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event: ChangeEvent<HTMLInputElement>) => void accept(event.target.files?.[0])}
        />
        {value ? (
          <>
            <img className="drop-image" src={value.dataUrl} alt={title} />
            <span className="drop-overlay">
              <span className="drop-action">Заменить фото</span>
            </span>
          </>
        ) : (
          <span className="drop-empty">
            <span className="drop-plus" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="30" height="30">
                <path d="M16 7v18M7 16h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <span className="drop-title">{title}</span>
            <span className="drop-hint">{busy ? 'Читаем фото…' : hint}</span>
            {optional && <span className="drop-optional">необязательно</span>}
          </span>
        )}
      </label>

      {value && (
        <div className="upload-meta">
          <span className="upload-name" title={value.name}>
            {value.name}
          </span>
          <button type="button" className="link" onClick={onClear}>
            Убрать
          </button>
        </div>
      )}
      {error && (
        <p className="upload-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- headings */

interface StepHeadProps {
  index: string
  title: string
  lead: string
  aside?: ReactNode
}

export function StepHead({ index, title, lead, aside }: StepHeadProps) {
  return (
    <header className="step-head">
      <div>
        <p className="eyebrow">{index}</p>
        <h2>{title}</h2>
        <p className="lead">{lead}</p>
      </div>
      {aside && <div className="step-head-aside">{aside}</div>}
    </header>
  )
}

export function Note({ children, tone = 'quiet' }: { children: ReactNode; tone?: 'quiet' | 'warn' }) {
  return <p className={`note note-${tone}`}>{children}</p>
}

export function Arrow() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" className="btn-arrow">
      <path
        d="M4 10h11M11 5l5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
