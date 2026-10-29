import type { Outcome } from '../api/types'
import { NOT_EVALUATED_STYLE, OUTCOME_STYLE } from '../lib/outcomes'

const SIZE = { sm: 'px-2.5 py-[5px] text-[11px]', md: 'px-3 py-1.5 text-xs', lg: 'px-3.5 py-2 text-[13px]' } as const

interface OutcomeBadgeProps {
  outcome: Outcome | null
  size?: keyof typeof SIZE
  /** Stick it on a little crooked, like the stickers on the cards. */
  tilt?: boolean
}

/** Outcome sticker: the word in forest ink on a tint, with a coloured dot; null means the rule has not run yet. */
export function OutcomeBadge({ outcome, size = 'sm', tilt = false }: OutcomeBadgeProps) {
  const style = outcome ? OUTCOME_STYLE[outcome] : NOT_EVALUATED_STYLE
  return (
    <span
      title={style.meaning}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border-[1.5px] leading-none font-extrabold tracking-[.12em] whitespace-nowrap ${SIZE[size]} ${style.badge} ${tilt ? '-rotate-3' : ''}`}
    >
      <span aria-hidden className={`size-[7px] shrink-0 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  )
}
