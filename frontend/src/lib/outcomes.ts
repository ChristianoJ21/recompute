import type { Outcome } from '../api/types'

export interface OutcomeStyle {
  label: string
  /** One plain-language line, worded like the engine's reasons. */
  meaning: string
  /** Border, background and text colour of the badge (full class strings so Tailwind finds them). */
  badge: string
}

export const OUTCOME_STYLE: Record<Outcome, OutcomeStyle> = {
  KEEP: {
    label: 'KEEP',
    meaning: 'Replacing would not pay back its manufacturing emissions',
    badge: 'border-keep-line bg-keep-bg text-keep',
  },
  UPGRADE: {
    label: 'UPGRADE',
    meaning: 'Replace one component instead of the whole device',
    badge: 'border-upgrade-line bg-upgrade-bg text-upgrade',
  },
  REDEPLOY: {
    label: 'REDEPLOY',
    meaning: 'Move it to a lighter workload',
    badge: 'border-redeploy-line bg-redeploy-bg text-redeploy',
  },
  RECYCLE: {
    label: 'RECYCLE',
    meaning: 'Formal recycling, with its passport',
    badge: 'border-recycle-line bg-recycle-bg text-recycle',
  },
  UNCERTAIN: {
    label: 'UNCERTAIN',
    meaning: 'The answer changes within the input ranges; a human decides',
    badge: 'border-uncertain-line bg-uncertain-bg text-uncertain',
  },
  INSUFFICIENT_DATA: {
    label: 'INSUFFICIENT DATA',
    meaning: 'Inputs are missing, and the engine never guesses them',
    badge: 'border-dashed border-insufficient-line bg-insufficient-bg text-insufficient',
  },
}

export const NOT_EVALUATED_STYLE: OutcomeStyle = {
  label: 'NOT EVALUATED',
  meaning: 'The decision rule has not run on this device yet',
  badge: 'border-dashed border-line-strong bg-transparent text-not-evaluated',
}

const TONE: Record<Outcome, string> = {
  KEEP: 'keep',
  UPGRADE: 'upgrade',
  REDEPLOY: 'redeploy',
  RECYCLE: 'recycle',
  UNCERTAIN: 'uncertain',
  INSUFFICIENT_DATA: 'insufficient',
}

export interface OutcomeColours {
  fg: string
  bg: string
  line: string
}

/** CSS colours (theme tokens) of an outcome, for tinted cards, bars and dots; null = not evaluated. */
export function outcomeColours(outcome: Outcome | null): OutcomeColours {
  if (!outcome) return { fg: 'var(--color-not-evaluated)', bg: 'var(--color-sunken)', line: 'var(--color-line-strong)' }
  const tone = TONE[outcome]
  return { fg: `var(--color-${tone})`, bg: `var(--color-${tone}-bg)`, line: `var(--color-${tone}-line)` }
}
