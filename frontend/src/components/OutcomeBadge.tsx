import type { Outcome } from '../api/types'
import { NOT_EVALUATED_STYLE, OUTCOME_STYLE } from '../lib/outcomes'

const SIZE = { sm: 'px-[7px] py-1 text-[11px]', md: 'px-[9px] py-1.5 text-xs', lg: 'px-[11px] py-2 text-[13px]' } as const

interface OutcomeBadgeProps {
  outcome: Outcome | null
  size?: keyof typeof SIZE
}

/** Outcome in words with a small square marker; null means the rule has not run yet. */
export function OutcomeBadge({ outcome, size = 'sm' }: OutcomeBadgeProps) {
  const style = outcome ? OUTCOME_STYLE[outcome] : NOT_EVALUATED_STYLE
  return (
    <span
      title={style.meaning}
      className={`inline-flex shrink-0 items-center gap-[7px] rounded-ctl border font-mono leading-none font-bold tracking-[.04em] whitespace-nowrap ${SIZE[size]} ${style.badge}`}
    >
      <span aria-hidden className="size-[7px] shrink-0 bg-current" />
      {style.label}
    </span>
  )
}
