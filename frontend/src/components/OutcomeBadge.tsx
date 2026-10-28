import type { Outcome } from '../api/types'
import { NOT_EVALUATED_STYLE, OUTCOME_STYLE } from '../lib/outcomes'

export function OutcomeBadge({ outcome, size = 'sm' }: { outcome: Outcome | null; size?: 'sm' | 'lg' }) {
  const style = outcome ? OUTCOME_STYLE[outcome] : NOT_EVALUATED_STYLE
  const sizing = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'
  return (
    <span
      title={style.meaning}
      className={`inline-flex items-center whitespace-nowrap rounded-full border font-semibold tracking-wide ${sizing} ${style.badge}`}
    >
      {style.label}
    </span>
  )
}
