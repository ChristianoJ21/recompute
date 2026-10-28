// Inline SVG icons from the design handoff. All decorative: the words next to them carry the meaning.

const box = { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': true, className: 'shrink-0' } as const

export function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg {...box} width={size} height={size}>
      <rect width="16" height="16" rx="2" className="fill-ok" />
      <path d="M4.5 8.2l2.3 2.3 4.7-4.9" fill="none" strokeWidth="1.9" className="stroke-surface" />
    </svg>
  )
}

export function CrossIcon({ size = 16 }: { size?: number }) {
  return (
    <svg {...box} width={size} height={size}>
      <rect width="16" height="16" rx="2" className="fill-danger" />
      <path d="M5.2 5.2l5.6 5.6M10.8 5.2l-5.6 5.6" strokeWidth="1.9" className="stroke-surface" />
    </svg>
  )
}

export function NoteIcon() {
  return (
    <svg {...box}>
      <rect width="16" height="16" rx="2" className="fill-note-icon" />
      <path d="M8 4v5M8 11.2v.8" strokeWidth="2" className="stroke-surface" />
    </svg>
  )
}

export function SpinnerIcon({ size = 14 }: { size?: number }) {
  return (
    <svg {...box} width={size} height={size} className="shrink-0 animate-spin">
      <circle cx="8" cy="8" r="6.5" fill="none" strokeWidth="2" className="stroke-line-mid" />
      <path d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5" fill="none" strokeWidth="2" className="stroke-ink-2" />
    </svg>
  )
}

export function UnavailableIcon({ size = 14 }: { size?: number }) {
  return (
    <svg {...box} width={size} height={size}>
      <rect x=".8" y=".8" width="14.4" height="14.4" rx="2" fill="none" strokeWidth="1.6" strokeDasharray="2.5 2" className="stroke-ink-3" />
      <path d="M5 8h6" strokeWidth="1.8" className="stroke-ink-3" />
    </svg>
  )
}

export function EnvelopeIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden className="shrink-0">
      <rect x=".8" y=".8" width="14.4" height="10.4" fill="none" strokeWidth="1.5" className="stroke-current" />
      <path d="M1.5 1.8L8 7l6.5-5.2" fill="none" strokeWidth="1.5" className="stroke-current" />
    </svg>
  )
}

export function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="shrink-0">
      <path d="M2 1l9 5-9 5z" className="fill-current" />
    </svg>
  )
}

export function LogoMark() {
  return (
    <svg width="34" height="14" viewBox="0 0 34 14" aria-hidden className="shrink-0">
      <path d="M8 7h5.5M20.5 7h5" className="stroke-ink" strokeWidth="1.6" />
      <rect x="1" y="3" width="7" height="8" fill="none" className="stroke-ink" strokeWidth="1.6" />
      <rect x="13.5" y="3" width="7" height="8" fill="none" className="stroke-ink" strokeWidth="1.6" />
      <rect x="25.5" y="2.5" width="8" height="9" className="fill-accent" />
    </svg>
  )
}

/** The hatched square in the SAMPLE DATA chip (same colours in both themes). */
export function SampleIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className="shrink-0">
      <rect x=".5" y=".5" width="9" height="9" fill="none" stroke="#2E2100" />
      <path d="M0 10L10 0M-2 6L4 0M6 10L10 6" stroke="#2E2100" />
    </svg>
  )
}
