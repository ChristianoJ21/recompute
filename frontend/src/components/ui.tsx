import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Chip, type ChipPose } from '../design/Art'
import { CheckIcon, CrossIcon, NoteIcon } from './icons'

// Shared classes and building blocks of the clay design system (Claude Design, 30 Oct): cream cards on mint paper,
// forest ink outlines, tangerine buttons that squish when pressed, hand-written copper notes.

// The spring easing is the one from the design (recompute-motion.js uses the same curve for its own animations).
const buttonBase =
  'inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-[18px] border-[2.5px] px-6 text-base font-extrabold no-underline transition-[translate,rotate,scale,box-shadow,background-color] duration-200 ease-spring active:translate-y-1 active:scale-x-[.97] active:scale-y-[.92] disabled:cursor-not-allowed disabled:translate-y-0 disabled:rotate-0 disabled:scale-100 disabled:border-line-strong disabled:bg-sunken disabled:text-ink-3 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:rotate-0'

/** The tangerine call to action: forest ink text and outline, a hard drop shadow, squishes on press. */
export const primaryButton = `${buttonBase} border-cta-ink bg-cta text-cta-ink shadow-pop hover:-translate-y-0.5 hover:-rotate-1 hover:text-cta-ink`

/** The cream button with an ink outline, next to a primary one or on its own for lighter actions. */
export const secondaryButton = `${buttonBase} border-ink bg-surface text-ink shadow-[0_5px_0_color-mix(in_srgb,var(--color-ink)_85%,transparent)] hover:-translate-y-0.5 hover:rotate-1 hover:text-ink`

export const fieldClass =
  'min-h-[50px] w-full rounded-ctl border-2 border-line-strong bg-surface px-4 text-base font-normal text-ink placeholder:text-ink-3 focus:border-ink focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-accent)_22%,transparent)] focus:outline-none disabled:border-line disabled:bg-sunken disabled:text-ink-3 aria-invalid:border-danger'

export const labelClass = 'flex flex-col gap-2 text-sm font-semibold'

export const hintClass = 'text-[13px] font-normal text-ink-2'

export const monoLabel = 'font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-ink-2'

export const panelClass = 'rounded-panel bg-surface shadow-panel'

/** Content column: full width up to 1240px (the design's width), side padding about 16px on a phone and 40px wide. */
export const container = 'mx-auto w-full max-w-[1240px] px-[clamp(16px,4vw,40px)]'

/** A content area under a page heading: plain paper, generous vertical padding. */
export const band = 'pt-[clamp(8px,2vw,24px)] pb-[clamp(48px,6vw,96px)]'

export const linkClass = 'font-semibold text-accent underline-offset-[3px] hover:text-accent-hover hover:underline'

const panelPad = 'px-5 sm:px-6'

interface PanelProps {
  title: ReactNode
  /** Small caps line above the title: "01 · DECISION". */
  eyebrow?: string
  /** Right side of the title strip: a mono tag, a badge or a button. */
  aside?: ReactNode
  id?: string
  className?: string
  /** Masking tape on the top edge. */
  tape?: boolean
  children: ReactNode
}

/** A titled clay card: cream, soft shadow, a dashed rule under the title strip, padded body. */
export function Panel({ title, eyebrow, aside, id, className = '', tape = false, children }: PanelProps) {
  const headingId = useId()
  return (
    <section id={id} aria-labelledby={headingId} className={`relative scroll-mt-24 ${panelClass} ${className}`}>
      {tape && <span aria-hidden className="rc-tape" />}
      <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b-2 border-dashed border-line py-[18px] ${panelPad}`}>
        <div className="flex flex-col gap-1.5">
          {eyebrow && <span className="rc-eyebrow text-accent">{eyebrow}</span>}
          <h2 id={headingId} className="text-[clamp(22px,2vw,26px)] leading-[1.1] font-extrabold tracking-[-.01em]">
            {title}
          </h2>
        </div>
        {aside}
      </div>
      <div className={`flex flex-col gap-4 py-6 ${panelPad}`}>{children}</div>
    </section>
  )
}

/** Small tag on the right of a panel title strip ("TECHNICIAN", "02"). */
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

/** Small caps eyebrow over a large Baloo section heading. */
export function SectionTitle({ eyebrow, title, id, children }: SectionTitleProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
      <div data-reveal="1" className="flex flex-col gap-2.5">
        <span className="rc-eyebrow text-accent">{eyebrow}</span>
        <h2 id={id} className="text-[clamp(36px,5vw,60px)] leading-[.95] font-extrabold tracking-[-.02em] text-balance">
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

/** Tangerine dot with a soft pulsing ring ("live"). */
export function LiveDot() {
  return <span aria-hidden className="size-2 shrink-0 animate-ring rounded-full bg-cta" />
}

/** A sticker at the top of a page heading: cream pill, forest outline, tilted a little. */
export function HeroChip({ live = false, children }: { live?: boolean; children: ReactNode }) {
  return (
    <span className="rc-eyebrow inline-flex -rotate-[1.5deg] items-center gap-2.5 self-start rounded-full border-[1.5px] border-ink bg-surface px-3.5 py-2 leading-[1.2]">
      {live ? <LiveDot /> : <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent-fill" />}
      {children}
    </span>
  )
}

interface PageHeroProps {
  /** Above the title: a HeroChip or a HeroLabel. */
  eyebrow?: ReactNode
  title: ReactNode
  /** Right column on wide screens, below on phones: an action or a paragraph. */
  aside?: ReactNode
  /** Beside the title on wide screens: a Chip pose or another illustration. */
  mascot?: ReactNode
  /** Under the title: intro text. */
  children?: ReactNode
}

/** The heading that opens every page: sticker, large Baloo H1, intro, optional aside and mascot. */
export function PageHero({ eyebrow, title, aside, mascot, children }: PageHeroProps) {
  return (
    <section className="relative">
      <div className={`${container} flex flex-wrap items-end justify-between gap-x-10 gap-y-7 pt-[clamp(28px,5vw,64px)] pb-[clamp(20px,3vw,40px)]`}>
        <div className="flex max-w-[860px] min-w-0 flex-[1_1_480px] flex-col gap-5">
          {eyebrow}
          <h1 className="text-[clamp(42px,6vw,80px)] leading-[.95] font-extrabold tracking-[-.025em] text-balance">{title}</h1>
          {children}
        </div>
        {aside}
        {mascot}
      </div>
    </section>
  )
}

/** Small caps label above a page heading ("SETTINGS", "MARKET"). */
export function HeroLabel({ children }: { children: ReactNode }) {
  return <span className="rc-eyebrow text-accent">{children}</span>
}

/** Intro paragraph under a page heading. */
export function HeroText({ children }: { children: ReactNode }) {
  return <p className="max-w-[44em] text-[clamp(17px,1.5vw,19px)] leading-[1.6] font-medium text-pretty text-ink-2">{children}</p>
}

/** A hand-written note in copper ink. Decorative commentary only: the facts are always in plain text elsewhere. */
export function HandNote({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`rc-hand text-[clamp(17px,1.8vw,22px)] leading-[1.1] ${className}`}>{children}</span>
}

/** The cream card of a form (put `<span aria-hidden className="rc-tape" />` first inside it for the tape). */
export const formCard = 'relative flex w-full flex-col gap-5 rounded-panel bg-surface p-[clamp(22px,3vw,36px)] shadow-float'

/** Pill link back to where you came from ("← Fleet"). */
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-10 items-center rounded-[14px] border-[1.5px] border-line-strong px-3.5 text-sm font-bold whitespace-nowrap text-ink no-underline transition-[scale,background-color] duration-200 ease-spring hover:bg-sunken hover:text-ink active:scale-95"
    >
      {children}
    </Link>
  )
}

interface FormPageProps {
  title: string
  intro: string
  /** Above the heading: a BackLink. */
  back?: ReactNode
  /** Width of the form column in px. */
  width?: number
  /** Chip's pose over the heading. */
  pose?: ChipPose
  children: ReactNode
}

/** A centred page for one form: Chip, a large heading, an intro, then the form card (and any links) under it. */
export function FormPage({ title, intro, back, width = 520, pose = 'wave', children }: FormPageProps) {
  return (
    <>
      <section className="relative">
        <div className={`${container} flex flex-col items-center gap-4 pt-[clamp(24px,4vw,48px)] pb-[clamp(20px,3vw,32px)] text-center`}>
          {back}
          <Chip pose={pose} anim={['blink', 'antenna']} eyes className="aspect-[204/214] w-[clamp(84px,10vw,112px)]" />
          <h1 className="text-[clamp(38px,5vw,64px)] leading-[.95] font-extrabold tracking-[-.025em] text-balance">{title}</h1>
          <p className="max-w-[54ch] text-[clamp(15px,1.3vw,18px)] font-medium text-pretty text-ink-2">{intro}</p>
        </div>
      </section>
      <div className="flex justify-center px-[clamp(16px,4vw,40px)] pb-[clamp(48px,6vw,96px)]">
        <div className="relative flex w-full flex-col gap-5" style={{ maxWidth: width }}>
          {children}
        </div>
      </div>
    </>
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
    <div role={role} className={`flex items-start gap-2.5 rounded-ctl border-[1.5px] px-3.5 py-3 text-sm font-medium ${box}`}>
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
      className="min-h-9 shrink-0 rounded-full border-[1.5px] border-danger bg-surface px-3.5 text-[13px] font-bold text-danger-ink"
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
    <span id={id} role="alert" className="text-[13px] font-medium text-danger">
      <span aria-hidden>✘ </span>
      {children}
    </span>
  )
}

/** While data loads: Chip at work on his laptop, with skeleton lines. */
export function Loading({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" className={`flex items-center gap-5 p-6 ${panelClass}`}>
      <Chip pose="work" anim={['work', 'blink']} className="aspect-[280/214] w-[clamp(96px,16vw,140px)] shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <span className="rc-hand text-xl leading-none">{label}</span>
        <span className="h-3 w-2/5 rounded-full bg-sunken" />
        <span className="h-3 w-[90%] rounded-full bg-sunken" />
      </div>
    </div>
  )
}

/** Nothing to show: Chip asleep under a dashed outline. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-panel border-2 border-dashed border-line-strong bg-surface px-6 py-10 text-center">
      <Chip pose="sleep" anim={['zzz']} className="aspect-[204/214] w-24" />
      <strong className="font-display text-2xl font-extrabold">{title}</strong>
      {children && <span className="max-w-[34em] text-[15px] text-ink-2">{children}</span>}
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
      <label htmlFor={id} className="text-sm font-bold">
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
      <label htmlFor={id} className="text-sm font-bold">
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
          className="absolute inset-y-1.5 right-1.5 rounded-[10px] bg-sunken px-3.5 text-[13px] font-bold text-ink"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
      {meter && (
        <span aria-hidden className="h-2 overflow-hidden rounded-full bg-sunken">
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
