import type { Evaluation, ScenarioResult } from '../api/types'
import { formatDateTime, formatKg, netBarGeometry } from '../lib/format'
import { OutcomeBadge } from './OutcomeBadge'
import { Card, ErrorNotice, primaryButton } from './ui'

interface Props {
  evaluation: Evaluation | null
  evaluating: boolean
  error: string | null
  onEvaluate: () => void
}

export function WhyPanel({ evaluation, evaluating, error, onEvaluate }: Props) {
  const evaluateButton = (
    <button type="button" className={primaryButton} onClick={onEvaluate} disabled={evaluating}>
      {evaluating ? 'Evaluating…' : 'Evaluate'}
    </button>
  )

  return (
    <Card title="Why this recommendation" action={evaluateButton}>
      {error && (
        <div className="mb-4">
          <ErrorNotice message={error} />
        </div>
      )}
      {evaluation ? (
        <EvaluationDetails evaluation={evaluation} />
      ) : (
        <p className="text-sm text-gray-600">
          Not evaluated yet. Press Evaluate to run the decision rule on this device's inputs.
        </p>
      )}
    </Card>
  )
}

function EvaluationDetails({ evaluation }: { evaluation: Evaluation }) {
  const { outcome, reason, target, missing_fields, net_min_kg, net_max_kg, scenarios } = evaluation
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <OutcomeBadge outcome={outcome} size="lg" />
        <p className="text-base leading-relaxed text-gray-900">{reason}</p>
        {target && (
          <p className="text-sm text-gray-700">
            {outcome === 'UPGRADE' ? 'Component to replace' : 'Lighter workload'}:{' '}
            <strong className="font-semibold text-gray-900">{target}</strong>
          </p>
        )}
        {missing_fields.length > 0 && (
          <div className="text-sm text-gray-700">
            <p>Missing inputs (the engine never estimates them):</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {missing_fields.map((field) => (
                <li
                  key={field}
                  className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-xs text-amber-900"
                >
                  {field}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {net_min_kg !== null && net_max_kg !== null && <NetRangeBar min={net_min_kg} max={net_max_kg} />}

      {scenarios && (
        <div className="grid gap-3 sm:grid-cols-2">
          <ScenarioCard title="Pro-keep end" hint="Every range set to the end that favours keeping" result={scenarios.pro_keep} />
          <ScenarioCard
            title="Pro-replace end"
            hint="Every range set to the end that favours replacing"
            result={scenarios.pro_replace}
          />
        </div>
      )}

      <p className="text-xs text-gray-500">Evaluated {formatDateTime(evaluation.evaluated_at)} · sample data</p>
    </div>
  )
}

function NetRangeBar({ min, max }: { min: number; max: number }) {
  const { start, end, zero } = netBarGeometry(min, max)
  const keepEnd = Math.min(end, zero)
  const replaceStart = Math.max(start, zero)

  return (
    <figure className="space-y-2 rounded-xl bg-gray-50 p-3 sm:p-4">
      <figcaption className="text-sm text-gray-700">
        Net saving from replacing, <span className="font-mono text-xs">(I_old − I_new) × W × T − E_new</span>
      </figcaption>
      <div
        role="img"
        aria-label={`Net saving from replacing ranges from ${formatKg(min)} to ${formatKg(max)}; zero is marked`}
        className="relative h-12"
      >
        <div className="absolute inset-x-0 top-6 h-3 rounded-full bg-gray-200" />
        {keepEnd > start && (
          <div className="absolute top-6 h-3 bg-emerald-500" style={{ left: `${start}%`, width: `${keepEnd - start}%` }} />
        )}
        {end > replaceStart && (
          <div
            className="absolute top-6 h-3 bg-sky-500"
            style={{ left: `${replaceStart}%`, width: `${end - replaceStart}%` }}
          />
        )}
        {start === end && (
          <div className="absolute top-5 h-5 w-1.5 -translate-x-1/2 rounded bg-gray-700" style={{ left: `${start}%` }} />
        )}
        <div className="absolute top-4 h-7 w-0.5 -translate-x-1/2 bg-gray-900" style={{ left: `${zero}%` }} />
        <span
          className="absolute top-0 -translate-x-1/2 text-xs font-semibold leading-none text-gray-900"
          style={{ left: `${zero}%` }}
        >
          0
        </span>
      </div>
      <div className="flex justify-between gap-4 text-sm text-gray-600">
        <span>
          Pro-keep end
          <strong className="block font-semibold tabular-nums text-gray-900">{formatKg(min)}</strong>
        </span>
        <span className="text-right">
          Pro-replace end
          <strong className="block font-semibold tabular-nums text-gray-900">{formatKg(max)}</strong>
        </span>
      </div>
      <div className="flex justify-between gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-emerald-500" />
          below 0: keeping is better
        </span>
        <span className="flex items-center gap-1.5 text-right">
          <span aria-hidden className="size-2 rounded-full bg-sky-500" />
          above 0: replacing pays back
        </span>
      </div>
    </figure>
  )
}

function ScenarioCard({ title, hint, result }: { title: string; hint: string; result: ScenarioResult }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="text-xs text-gray-500">{hint}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <OutcomeBadge outcome={result.outcome} />
        <span className="text-sm tabular-nums text-gray-700">net {formatKg(result.net_kg)}</span>
      </div>
    </div>
  )
}
