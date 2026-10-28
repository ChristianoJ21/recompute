import type { Outcome } from '../api/types'

export interface OutcomeStyle {
  label: string
  /** One plain-language line, worded like the engine's reasons. */
  meaning: string
  badge: string
}

// Full class strings (not built from parts) so Tailwind finds them at build time.
export const OUTCOME_STYLE: Record<Outcome, OutcomeStyle> = {
  KEEP: {
    label: 'KEEP',
    meaning: 'Replacing would not pay back its manufacturing emissions',
    badge: 'border-emerald-300 bg-emerald-100 text-emerald-900',
  },
  UPGRADE: {
    label: 'UPGRADE',
    meaning: 'Replace one component instead of the whole device',
    badge: 'border-sky-300 bg-sky-100 text-sky-900',
  },
  REDEPLOY: {
    label: 'REDEPLOY',
    meaning: 'Move it to a lighter workload',
    badge: 'border-violet-300 bg-violet-100 text-violet-900',
  },
  RECYCLE: {
    label: 'RECYCLE',
    meaning: 'Formal recycling, with its passport',
    badge: 'border-slate-300 bg-slate-200 text-slate-800',
  },
  UNCERTAIN: {
    label: 'UNCERTAIN',
    meaning: 'The answer changes within the input ranges; a human decides',
    badge: 'border-amber-300 bg-amber-100 text-amber-900',
  },
  INSUFFICIENT_DATA: {
    label: 'INSUFFICIENT DATA',
    meaning: 'Inputs are missing, and the engine never guesses them',
    badge: 'border-gray-300 bg-gray-100 text-gray-700',
  },
}

export const NOT_EVALUATED_STYLE: OutcomeStyle = {
  label: 'NOT EVALUATED',
  meaning: 'The decision rule has not run on this device yet',
  badge: 'border-dashed border-gray-300 bg-white text-gray-500',
}
