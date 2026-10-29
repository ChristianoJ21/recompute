import { useEffect, useState } from 'react'
import type { Evaluation } from '../api/types'
import { formatDateTime, formatKg, formatSigned, netBarGeometry } from '../lib/format'
import { prefersReducedMotion } from '../lib/theme'
import { PlayIcon } from './icons'
import { OutcomeBadge } from './OutcomeBadge'
import { ErrorNotice, Panel, monoLabel, primaryButton } from './ui'

interface Props {
  evaluation: Evaluation | null
  evaluating: boolean
  error: string | null
  /** Left out when logged out: only a technician may run the engine. */
  onEvaluate?: () => void
}

export function WhyPanel({ evaluation, evaluating, error, onEvaluate }: Props) {
  const controls = onEvaluate && (
    <div className="flex flex-wrap items-center gap-3">
      {evaluation && <span className="font-mono text-xs text-ink-2">last run {formatDateTime(evaluation.evaluated_at)}</span>}
      <button type="button" className={primaryButton} onClick={onEvaluate} disabled={evaluating}>
        <PlayIcon />
        {evaluating ? 'Evaluating…' : 'Evaluate'}
      </button>
    </div>
  )

  return (
    <Panel title="Why this recommendation" eyebrow="01 · DECISION" aside={controls}>
      {error && <ErrorNotice message={error} />}
      {evaluation ? (
        <EvaluationDetails evaluation={evaluation} />
      ) : (
        <p className="text-[15px] text-ink-2">
          {onEvaluate
            ? "Not evaluated yet. Press Evaluate to run the decision rule on this device's inputs."
            : 'Not evaluated yet. A logged-in technician can run the decision rule on this device.'}
        </p>
      )}
    </Panel>
  )
}

const SCENARIOS = [
  { key: 'pro_keep', name: 'Pro-keep end', text: 'Inputs set to the values that most favour keeping.' },
  { key: 'pro_replace', name: 'Pro-replace end', text: 'Inputs set to the values that most favour replacing.' },
] as const

const dt = 'pt-0.5 font-mono text-xs text-ink-2'

function EvaluationDetails({ evaluation }: { evaluation: Evaluation }) {
  const { outcome, reason, target, missing_fields, net_min_kg, net_max_kg, scenarios } = evaluation
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start gap-3">
        <OutcomeBadge outcome={outcome} size="md" />
        <p className="flex-[1_1_280px] text-[clamp(17px,1.6vw,19px)] leading-[1.4] font-medium text-pretty">{reason}</p>
      </div>
      {net_min_kg !== null && net_max_kg !== null && <NetSavingBar min={net_min_kg} max={net_max_kg} />}
      {scenarios && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
          {SCENARIOS.map(({ key, name, text }) => (
            <div key={key} className="flex flex-col gap-2 rounded-2xl border border-line bg-raised p-4">
              <span className={monoLabel}>{name}</span>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <OutcomeBadge outcome={scenarios[key].outcome} />
                <span className="font-mono text-[15px] font-bold">net {formatKg(scenarios[key].net_kg)}</span>
              </div>
              <span className="text-[13px] text-ink-2">{text}</span>
            </div>
          ))}
        </div>
      )}
      {(target || missing_fields.length > 0) && (
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
          {target && (
            <>
              <dt className={dt}>target</dt>
              <dd>{target}</dd>
            </>
          )}
          {missing_fields.length > 0 && (
            <>
              <dt className={dt}>missing inputs</dt>
              <dd className="flex flex-col gap-1.5">
                <ul className="flex flex-wrap gap-2">
                  {missing_fields.map((field) => (
                    <li key={field} className="border border-dashed border-insufficient-line bg-insufficient-bg px-2 py-0.5 font-mono text-xs text-insufficient">
                      {field}
                    </li>
                  ))}
                </ul>
                <span className="text-[13px] text-ink-2">The engine never estimates them.</span>
              </dd>
            </>
          )}
        </dl>
      )}
    </div>
  )
}

const dimension = 'absolute transition-opacity delay-800 duration-400'

/** The range of net saving if replaced, drawn against zero; it grows from the zero line when shown. */
function NetSavingBar({ min, max }: { min: number; max: number }) {
  const [ready, setReady] = useState(prefersReducedMotion)
  useEffect(() => {
    if (ready) return
    const timer = setTimeout(() => setReady(true), 350)
    return () => clearTimeout(timer)
  }, [ready])

  const { start, end, zero } = netBarGeometry(min, max)
  const low = formatSigned(Math.min(min, max))
  const high = formatSigned(Math.max(min, max))
  const shown = ready ? 'opacity-100' : 'opacity-0'
  const at = (value: number) => ({ left: `${value}%` })

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap justify-between gap-2 font-mono text-xs text-ink-2">
        <span className="font-bold tracking-[.06em] text-ink uppercase">Net saving if replaced</span>
        <span>
          {low} to {high} kg CO₂e
        </span>
      </div>
      <div
        role="img"
        aria-label={`Net saving from replacing ranges from ${formatKg(min)} to ${formatKg(max)}; zero is marked`}
        className="relative h-24"
      >
        <div
          className="absolute top-[26px] left-0 h-3.5 rounded-l-full"
          style={{ width: `${zero}%`, backgroundImage: 'repeating-linear-gradient(135deg, var(--color-sunken) 0 4px, var(--color-surface) 4px 8px)' }}
        />
        <div className="absolute top-[26px] right-0 h-3.5 rounded-r-full bg-sunken" style={at(zero)} />
        <div
          className="absolute top-[19px] h-7 min-w-1 rounded-full bg-accent shadow-[0_10px_24px_-8px_var(--color-accent)] transition-[left,width] duration-1000 ease-draw"
          style={{ left: `${ready ? start : zero}%`, width: `${ready ? end - start : 0}%` }}
        />
        <div className="absolute top-3 -ml-px h-10 w-0.5 bg-ink" style={at(zero)} />
        <span className="absolute -top-1.5 -translate-x-1/2 font-mono text-[11px] font-bold" style={at(zero)}>
          0
        </span>
        <div className={`${dimension} top-11 h-[26px] border-l border-dashed border-ink-2 ${shown}`} style={at(start)} />
        <div className={`${dimension} top-11 h-[26px] border-l border-dashed border-ink-2 ${shown}`} style={at(end)} />
        <div className={`${dimension} top-[63px] h-px bg-ink-2 ${shown}`} style={{ left: `${start}%`, width: `${end - start}%` }}>
          <span className="absolute -top-1 left-0 border-y-[4.5px] border-r-[7px] border-y-transparent border-r-ink-2" />
          <span className="absolute -top-1 right-0 border-y-[4.5px] border-l-[7px] border-y-transparent border-l-ink-2" />
        </div>
        <span
          className={`${dimension} top-[72px] -translate-x-1/2 bg-surface px-1.5 font-mono text-[11px] font-bold whitespace-nowrap ${shown}`}
          style={{ left: `clamp(84px, ${(start + end) / 2}%, calc(100% - 84px))` }}
        >
          {low} … {high} kg CO₂e
        </span>
      </div>
      <div className="flex justify-between gap-2 text-[13px] text-ink-2">
        <span>← Keeping pays back</span>
        <span>Replacing pays back →</span>
      </div>
    </div>
  )
}
