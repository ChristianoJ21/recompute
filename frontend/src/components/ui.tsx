import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { CheckIcon, CrossIcon, NoteIcon } from './icons'

// Shared classes and building blocks of the design system (docs/design_handoff/README.md).

const buttonBase =
  'inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full border px-6 text-[15px] font-bold no-underline transition-[translate,box-shadow,border-color,background-color] duration-200 disabled:cursor-not-allowed disabled:translate-y-0 disabled:border-transparent disabled:bg-sunken disabled:text-ink-3 disabled:shadow-none'

export const primaryButton = `${buttonBase} border-ink bg-ink text-surface hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0 active:shadow-none`

export const secondaryButton = `${buttonBase} border-line-strong bg-transparent font-semibold text-ink hover:border-ink hover:bg-raised`

/** The light-blue pill on the dark hero bands ("Browse hardware", "+ Add technician"). */
export const nightButton =
  'inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-night-accent px-6 text-[15px] font-bold text-night no-underline shadow-[0_10px_30px_-8px_rgba(142,162,255,.6)] transition-[translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-8px_rgba(142,162,255,.9)]'

/** Outlined pill on the dark bands ("How it works", "← Fleet"). */
export const nightGhostButton =
  'inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-5 font-semibold text-white no-underline transition-colors duration-200 hover:border-white/40 hover:bg-white/5'

export const fieldClass =
  'min-h-[50px] w-full rounded-ctl border border-line-strong bg-surface px-4 text-base font-normal text-ink placeholder:text-ink-3 focus:border-accent focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-accent)_15%,transparent)] focus:outline-none disabled:border-line disabled:bg-sunken disabled:text-ink-3 aria-invalid:border-danger'

export const labelClass = 'flex flex-col gap-2 text-sm font-semibold'

export const hintClass = 'text-[13px] font-normal text-ink-2'

export const monoLabel = 'font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-ink-2'

export const panelClass = 'overflow-hidden rounded-panel border border-line bg-surface shadow-panel'

/** Content column: full width up to 1440px, side padding about 20px on a phone and 72px on a wide screen. */
export const container = 'mx-auto w-full max-w-[1440px] px-[clamp(20px,4vw,72px)]'

/** A light content band under a hero: blueprint grid, generous vertical padding. */
export const band = 'bg-blueprint pt-[clamp(28px,4vw,64px)] pb-[clamp(48px,6vw,96px)]'

export const linkClass = 'font-semibold text-accent underline-offset-[3px] hover:underline'

const panelPad = 'px-5 sm:px-6'

interface PanelProps {
  title: ReactNode
  /** Mono accent line above the title: "01 · DECISION". */
  eyebrow?: string
  /** Right side of the title strip: a mono tag, a badge or a button. */
  aside?: ReactNode
  id?: string
  className?: string
  children: ReactNode
}

/** A titled panel: rounded, hairline border, title strip, padded body. */
export function Panel({ title, eyebrow, aside, id, className = '', children }: PanelProps) {
  const headingId = useId()
  return (
    <section id={id} aria-labelledby={headingId} className={`relative scroll-mt-24 ${panelClass} ${className}`}>
      <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line py-[18px] ${panelPad}`}>
        <div className="flex flex-col gap-0.5">
          {eyebrow && <span className="font-mono text-xs font-bold tracking-[.08em] text-accent">{eyebrow}</span>}
          <h2 id={headingId} className="text-[clamp(20px,1.8vw,22px)] font-bold tracking-[-.02em]">
            {title}
          </h2>
        </div>
        {aside}
      </div>
      <div className={`flex flex-col gap-4 py-6 ${panelPad}`}>{children}</div>
    </section>
  )
}

/** Mono tag on the right of a panel title strip ("TECHNICIAN", "02"). */
export function PanelTag({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] font-semibold tracking-[.08em] text-ink-2">{children}</span>
}

const PILL_TONE = { ok: 'bg-ok-bg text-ok', ready: 'bg-upgrade-bg text-upgrade', muted: 'bg-sunken text-ink-2' } as const

/** Small pill tag ("LISTED", "NOT LISTED", "READY"). */
export function PillTag({ tone, children }: { tone: keyof typeof PILL_TONE; children: ReactNode }) {
  return (
    <span className={`rounded-full px-2.5 py-[3px] font-mono text-[11px] font-bold tracking-[.08em] ${PILL_TONE[tone]}`}>
      {children}
    </span>
  )
}

interface SectionTitleProps {
  /** "01 · HOW IT WORKS". */
  eyebrow: string
  title: string
  id: string
  /** Right side: filters, a count. */
  children?: ReactNode
}

/** Mono accent eyebrow over a large section heading. */
export function SectionTitle({ eyebrow, title, id, children }: SectionTitleProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
      <div className="flex flex-col gap-2.5">
        <span className="font-mono text-[13px] font-bold tracking-[.08em] text-accent">{eyebrow}</span>
        <h2 id={id} className="text-[clamp(28px,3.4vw,48px)] leading-[1.02] font-[750] tracking-[-.035em]">
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

/** Green pulsing dot in the hero chips ("FLEET · HALL A"). */
export function LiveDot() {
  return <span aria-hidden className="size-2 shrink-0 animate-ring rounded-full bg-night-ok" />
}

/** Rounded mono chip at the top of a hero. */
export function HeroChip({ live = false, children }: { live?: boolean; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5 self-start rounded-full border border-night-accent/30 bg-night-accent/8 py-[7px] pr-3.5 pl-2.5 font-mono text-xs font-semibold tracking-[.06em] text-night-accent-2">
      {live && <LiveDot />}
      {children}
    </span>
  )
}

/** Drifting grid and a soft glow behind a dark band (decoration only). */
export function NightBackdrop({ glow = 'rgba(36,67,201,.55)' }: { glow?: string }) {
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 animate-drift bg-night-grid" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[30%] -right-[10%] h-[110%] w-[60%] animate-glow blur-[20px]"
        style={{ background: `radial-gradient(closest-side, ${glow}, transparent)` }}
      />
    </>
  )
}

interface PageHeroProps {
  /** Above the title: a HeroChip or a HeroLabel. */
  eyebrow?: ReactNode
  title: ReactNode
  /** Right column on wide screens, below on phones: an action or a paragraph. */
  aside?: ReactNode
  /** Under the title: intro text. */
  children?: ReactNode
}

/** The dark band that opens every v3 page: eyebrow, large H1, intro, optional aside. */
export function PageHero({ eyebrow, title, aside, children }: PageHeroProps) {
  return (
    <section data-theme="dark" className="relative overflow-hidden bg-night text-night-fg">
      <NightBackdrop />
      <div className={`${container} relative flex flex-wrap items-end justify-between gap-x-10 gap-y-7 py-[clamp(40px,5vw,80px)]`}>
        <div className="flex max-w-[860px] min-w-0 flex-col gap-4">
          {eyebrow}
          <h1 className="text-[clamp(40px,5.4vw,84px)] leading-none font-[750] tracking-[-.045em] text-white">{title}</h1>
          {children}
        </div>
        {aside}
      </div>
    </section>
  )
}

/** Plain mono eyebrow on a dark hero ("SETTINGS", "MARKET"). */
export function HeroLabel({ children }: { children: ReactNode }) {
  return <span className="font-mono text-xs font-semibold tracking-[.12em] text-night-accent-2">{children}</span>
}

/** Intro paragraph on a dark hero. */
export function HeroText({ children }: { children: ReactNode }) {
  return <p className="max-w-[62ch] text-[clamp(16px,1.35vw,19px)] text-pretty text-night-fg2">{children}</p>
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
    <div role={role} className={`flex items-start gap-2.5 rounded-ctl border px-3.5 py-3 text-sm ${box}`}>
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
      className="min-h-9 shrink-0 rounded-full border border-danger bg-surface px-3.5 text-[13px] font-semibold text-danger-ink"
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
    <div role="status" aria-busy="true" className={`flex flex-col gap-3 p-6 ${panelClass}`}>
      <span className="font-mono text-xs text-ink-2">{label}</span>
      <span className="h-3 w-2/5 rounded-full bg-sunken" />
      <span className="h-7 w-[70%] rounded-full bg-sunken" />
      <span className="h-3 w-[90%] rounded-full bg-sunken" />
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-panel border border-dashed border-line-strong bg-surface px-6 py-10 text-center">
      <strong className="text-lg">{title}</strong>
      {children && <span className="text-sm text-ink-2">{children}</span>}
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

interface PasswordFieldProps extends Omit<TextFieldProps, 'type' | 'mono'> {
  /** Minimum length: shows a meter and a live hint under the field instead of the fixed hint. */
  minLength?: number
}

/** Password input with a Show/Hide button (outside the label, so the field keeps its plain name). */
export function PasswordField({ label, hint, error, invalid, minLength, className = '', value, ...input }: PasswordFieldProps) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const length = typeof value === 'string' ? value.length : 0
  const meter = minLength ? passwordMeter(length, minLength) : null
  const shownHint = meter ? meter.text : hint
  const describedBy = [shownHint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <span className="relative flex">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error || invalid ? true : undefined}
          aria-describedby={describedBy}
          value={value}
          className={`${fieldClass} pr-[88px] ${className}`}
          {...input}
        />
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-1.5 right-1.5 rounded-[10px] bg-sunken px-3.5 text-[13px] font-semibold text-ink"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
      {meter && (
        <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-sunken">
          <span className="block h-full rounded-full transition-[width] duration-300" style={{ width: `${meter.share * 100}%`, background: meter.colour }} />
        </span>
      )}
      {shownHint && (
        <span id={`${id}-hint`} className={hintClass} style={meter?.done ? { color: 'var(--color-ok)' } : undefined}>
          {shownHint}
        </span>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  )
}

function passwordMeter(length: number, min: number) {
  const done = length >= min
  const missing = min - length
  return {
    done,
    share: Math.min(length / min, 1),
    colour: done ? 'var(--color-ok)' : length >= min / 2 ? 'var(--color-uncertain)' : 'var(--color-danger)',
    text: length === 0 ? `At least ${min} characters.` : done ? '✔ Long enough.' : `${missing} more character${missing === 1 ? '' : 's'}`,
  }
}
