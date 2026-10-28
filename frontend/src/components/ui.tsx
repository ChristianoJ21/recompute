import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { CheckIcon, CrossIcon, NoteIcon } from './icons'

// Shared classes and building blocks of the design system (docs/design_handoff/README.md).

const buttonBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-ctl border px-[18px] text-sm font-semibold no-underline transition-[translate,box-shadow,border-color,background-color] duration-150 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:border-line disabled:bg-sunken disabled:text-ink-3 disabled:shadow-none'

export const primaryButton = `${buttonBase} border-ink bg-ink text-surface hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-lift active:translate-x-0 active:translate-y-0 active:shadow-none`

export const secondaryButton = `${buttonBase} border-line-strong bg-surface text-ink hover:border-ink hover:bg-raised`

export const fieldClass =
  'min-h-11 w-full rounded-ctl border border-line-strong bg-surface px-3 text-base font-normal text-ink placeholder:text-ink-3 disabled:border-line disabled:bg-page disabled:text-ink-3 aria-invalid:border-danger'

export const labelClass = 'flex flex-col gap-1.5 text-sm font-semibold'

export const hintClass = 'text-[13px] font-normal text-ink-2'

export const monoLabel = 'font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-ink-2'

export const panelClass = 'border border-line bg-surface shadow-panel'

/** Content column: max 1160px, side padding about 16px on a phone and 40px on a laptop. */
export const container = 'mx-auto w-full max-w-[1160px] px-[clamp(16px,4vw,40px)]'

export const linkClass = 'font-semibold text-accent underline-offset-[3px] hover:underline'

const panelPad = 'px-4 sm:px-6'

/** Four accent L-shapes on the corners of a key figure (passport card, Why panel, FIG. 1). */
export function CornerMarks() {
  const mark = 'pointer-events-none absolute size-3 border-accent'
  return (
    <>
      <span aria-hidden className={`${mark} -top-px -left-px border-t-2 border-l-2`} />
      <span aria-hidden className={`${mark} -top-px -right-px border-t-2 border-r-2`} />
      <span aria-hidden className={`${mark} -bottom-px -left-px border-b-2 border-l-2`} />
      <span aria-hidden className={`${mark} -right-px -bottom-px border-r-2 border-b-2`} />
    </>
  )
}

interface PanelProps {
  title: ReactNode
  /** Right side of the title strip: a mono tag, a badge or a button. */
  aside?: ReactNode
  corners?: boolean
  id?: string
  className?: string
  children: ReactNode
}

/** A titled panel: square corners, hairline border, title strip, padded body. */
export function Panel({ title, aside, corners, id, className = '', children }: PanelProps) {
  const headingId = useId()
  return (
    <section id={id} aria-labelledby={headingId} className={`relative scroll-mt-4 ${panelClass} ${className}`}>
      {corners && <CornerMarks />}
      <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line py-3 ${panelPad}`}>
        <h2 id={headingId} className="text-lg font-bold tracking-[-.01em]">
          {title}
        </h2>
        {aside}
      </div>
      <div className={`flex flex-col gap-4 py-4 sm:py-6 ${panelPad}`}>{children}</div>
    </section>
  )
}

/** Mono tag on the right of a panel title strip ("TECHNICIAN", "02"). */
export function PanelTag({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] tracking-[.06em] text-ink-2">{children}</span>
}

interface SectionHeaderProps {
  index: string
  title: string
  id: string
  aside?: ReactNode
}

/** "01  How ReCompute works" over a 1px ink rule. */
export function SectionHeader({ index, title, id, aside }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline gap-3 border-b border-ink pb-2.5">
      <span className="font-mono text-xs font-semibold text-accent">{index}</span>
      <h2 id={id} className="text-xl font-bold tracking-[-.01em]">
        {title}
      </h2>
      {aside && <span className="ml-auto font-mono text-xs text-ink-2">{aside}</span>}
    </div>
  )
}

interface PageIntroProps {
  eyebrow: string
  title: string
  /** 30px title for the small forms (login). */
  compact?: boolean
  children?: ReactNode
}

/** "/ Fleet" eyebrow, H1 and an optional intro line. */
export function PageIntro({ eyebrow, title, compact = false, children }: PageIntroProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-mono text-xs font-semibold tracking-[.08em] text-accent uppercase">{eyebrow}</p>
      <h1 className={`${compact ? 'text-[30px]' : 'text-[clamp(28px,3.4vw,40px)]'} leading-[1.1] font-bold tracking-[-.03em]`}>
        {title}
      </h1>
      {children}
    </div>
  )
}

const TONES = {
  error: { box: 'border-danger-line bg-danger-bg text-danger-ink', icon: <CrossIcon />, role: 'alert' },
  success: { box: 'border-ok-line bg-ok-bg text-ok-ink', icon: <CheckIcon />, role: 'status' },
  warning: { box: 'border-note-line bg-note-bg text-note-ink', icon: <NoteIcon />, role: undefined },
} as const

interface NoticeProps {
  tone: keyof typeof TONES
  children: ReactNode
  action?: ReactNode
}

/** Error, success or warning line with its square icon (never colour alone). */
export function Notice({ tone, children, action }: NoticeProps) {
  const { box, icon, role } = TONES[tone]
  return (
    <div role={role} className={`flex items-start gap-2.5 border px-3 py-2.5 text-sm ${box}`}>
      <span className="mt-0.5">{icon}</span>
      <span className="min-w-0 flex-1">{children}</span>
      {action}
    </div>
  )
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const retry = onRetry && (
    <button
      type="button"
      onClick={onRetry}
      className="min-h-8 shrink-0 rounded-ctl border border-danger bg-surface px-2.5 text-[13px] font-semibold text-danger-ink"
    >
      Try again
    </button>
  )
  return (
    <Notice tone="error" action={retry}>
      {message}
    </Notice>
  )
}

/** "✘ message" under a form field. */
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span id={id} role="alert" className="text-[13px] font-normal text-danger">
      <span aria-hidden>✘ </span>
      {children}
    </span>
  )
}

/** Skeleton panel while data loads. */
export function Loading({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" className={`flex flex-col gap-2.5 p-4 ${panelClass}`}>
      <span className="font-mono text-xs text-ink-2">{label}</span>
      <span className="h-3 w-2/5 bg-sunken" />
      <span className="h-7 w-[70%] bg-sunken" />
      <span className="h-3 w-[90%] bg-sunken" />
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border border-dashed border-line-strong bg-surface p-5 text-center">
      <strong className="text-[15px]">{title}</strong>
      {children && <span className="text-[13px] text-ink-2">{children}</span>}
    </div>
  )
}

/** Two-letter avatar from a name: "Technician One (sample)" gives "TO". */
export function initials(name: string): string {
  const words = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean)
  return (words.slice(0, 2).map((word) => word[0]).join('') || '?').toUpperCase()
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  /** Shown as "✘ message" under the field. */
  error?: string | null
  /** Red border without a message of its own (e.g. a wrong login shown above the form). */
  invalid?: boolean
  mono?: boolean
}

/** Label, input, hint and error; hint and error are linked with aria-describedby, outside the label. */
export function TextField({ label, hint, error, invalid, mono = false, className = '', ...input }: TextFieldProps) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error || invalid ? true : undefined}
        aria-describedby={describedBy}
        className={`${fieldClass} ${mono ? 'font-mono' : ''} ${className}`}
        {...input}
      />
      {hint && (
        <span id={`${id}-hint`} className={hintClass}>
          {hint}
        </span>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  )
}
