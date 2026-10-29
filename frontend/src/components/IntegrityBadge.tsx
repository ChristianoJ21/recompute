import { CheckIcon, CrossIcon, SpinnerIcon, UnavailableIcon } from './icons'

/** Result of the passport's hash-chain check. `changed` without an event id is the listing's yes/no flag. */
export type Integrity =
  | { status: 'checking' }
  | { status: 'intact' }
  | { status: 'changed'; eventId?: number | null }
  | { status: 'unavailable' }

interface IntegrityBadgeProps {
  integrity: Integrity
  size?: 'md' | 'lg'
  /** Announce changes to screen readers; set on one badge per page. */
  live?: boolean
}

// Wording rule: the chain *detects* changes ("changed at event #N"); it never claims to prevent them.
export function IntegrityBadge({ integrity, size = 'md', live = false }: IntegrityBadgeProps) {
  const sizing = size === 'lg' ? 'py-[7px] pr-3 pl-2 text-[15px]' : 'py-[5px] pr-2.5 pl-1.5 text-[13px]'
  const { icon, label, tone } = describe(integrity)
  const role = live ? (integrity.status === 'changed' ? 'alert' : 'status') : undefined
  return (
    <span
      role={role}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border-[1.5px] leading-[1.1] font-bold whitespace-nowrap ${sizing} ${tone}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  )
}

function describe(integrity: Integrity) {
  switch (integrity.status) {
    case 'intact':
      return { icon: <CheckIcon size={14} />, label: 'Passport intact', tone: 'border-transparent bg-sunken text-ink' }
    case 'changed':
      return {
        icon: <CrossIcon size={14} />,
        label: integrity.eventId ? `Passport changed at event #${integrity.eventId}` : 'Passport changed',
        tone: 'border-danger-line bg-danger-bg text-danger',
      }
    case 'checking':
      return { icon: <SpinnerIcon />, label: 'Checking passport…', tone: 'border-line bg-surface text-ink-2' }
    case 'unavailable':
      return { icon: <UnavailableIcon />, label: 'Integrity check unavailable', tone: 'border-line-mid bg-sunken text-ink-2' }
  }
}
