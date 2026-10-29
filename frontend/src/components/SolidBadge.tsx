import type { Outcome } from '../api/types'
import { NOT_EVALUATED_STYLE, OUTCOME_STYLE, outcomeColours } from '../lib/outcomes'

/** Filled outcome pill (v3 listing cards and fleet rows); the word is always shown, never colour alone. */
export function SolidBadge({ outcome }: { outcome: Outcome | null }) {
  const style = outcome ? OUTCOME_STYLE[outcome] : NOT_EVALUATED_STYLE
  return (
    <span
      title={style.meaning}
      className="inline-flex shrink-0 items-center rounded-full px-2.5 py-[3px] font-mono text-[11px] font-bold tracking-[.06em] whitespace-nowrap text-surface"
      style={{ background: outcomeColours(outcome).fg }}
    >
      {style.label}
    </span>
  )
}
