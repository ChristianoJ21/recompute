import type { Outcome } from '../api/types'

export interface OutcomeStyle {
  label: string
  /** One plain-language line, worded like the engine's reasons. */
  meaning: string
  /** Sticker classes: tinted fill, forest outline, ink text (dashed outline when the rule gave no verdict). Full class strings so Tailwind finds them. */
  badge: string
  /** The coloured dot in the sticker. */
  dot: string
}

export const OUTCOME_STYLE: Record<Outcome, OutcomeStyle> = {
  KEEP: {
    label: 'KEEP',
    meaning: 'Replacing would not pay back its manufacturing emissions',
    badge: 'border-ink bg-keep-bg text-ink',
    dot: 'bg-keep-dot',
  },
  UPGRADE: {
    label: 'UPGRADE',
    meaning: 'Replace one component instead of the whole device',
    badge: 'border-ink bg-upgrade-bg text-ink',
    dot: 'bg-upgrade-dot',
  },
  REDEPLOY: {
    label: 'REDEPLOY',
    meaning: 'Move it to a lighter workload',
    badge: 'border-ink bg-redeploy-bg text-ink',
    dot: 'bg-redeploy-dot',
  },
  RECYCLE: {
    label: 'RECYCLE',
    meaning: 'Formal recycling, with its passport',
    badge: 'border-ink bg-recycle-bg text-ink',
    dot: 'bg-recycle-dot',
  },
  UNCERTAIN: {
    label: 'UNCERTAIN',
    meaning: 'The answer changes within the input ranges; a human decides',
    badge: 'border-ink bg-uncertain-bg text-ink',
    dot: 'bg-uncertain-dot',
  },
  INSUFFICIENT_DATA: {
    label: 'INSUFFICIENT DATA',
    meaning: 'Inputs are missing, and the engine never guesses them',
    badge: 'border-dashed border-ink bg-insufficient-bg text-ink',
    dot: 'bg-insufficient-dot',
  },
}

export const NOT_EVALUATED_STYLE: OutcomeStyle = {
  label: 'NOT EVALUATED',
  meaning: 'The decision rule has not run on this device yet',
  badge: 'border-dashed border-line-strong bg-transparent text-not-evaluated',
  dot: 'bg-not-evaluated',
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
  /** The marker colour: the clay bin's colour, for dots and bars (not for text). */
  dot: string
}

/** CSS colours (theme tokens) of an outcome, for tinted cards, bars and dots; null = not evaluated. */
export function outcomeColours(outcome: Outcome | null): OutcomeColours {
  if (!outcome) {
    return { fg: 'var(--color-not-evaluated)', bg: 'var(--color-sunken)', line: 'var(--color-line-strong)', dot: 'var(--color-not-evaluated)' }
  }
  const tone = TONE[outcome]
  return {
    fg: `var(--color-${tone})`,
    bg: `var(--color-${tone}-bg)`,
    line: `var(--color-${tone}-line)`,
    dot: `var(--color-${tone}-dot)`,
  }
}
