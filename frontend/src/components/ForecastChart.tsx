import { useState } from 'react'
import type { ForecastPoint } from '../api/types'

// PRD 15.4: one chart per series (never two units on one axis), source + page on every point,
// forecasts marked as forecasts, and only points traced to an evidence-sheet row.
const LINE = '#047857' // emerald-700, the app's accent; one series per chart, so one hue
const W = 560
const H = 240
const PAD = { top: 16, right: 20, bottom: 30, left: 56 }
const number = new Intl.NumberFormat('en', { maximumFractionDigits: 2 })

const isTraceable = (point: ForecastPoint) =>
  point.source.trim() !== '' && String(point.page).trim() !== '' && /^E\d+$/.test(point.evidence_row)

const cite = (point: ForecastPoint) => `${point.source}, p. ${point.page}`

export function ForecastCharts({ points }: { points: ForecastPoint[] }) {
  const groups = new Map<string, ForecastPoint[]>()
  for (const point of points.filter(isTraceable)) {
    const key = `${point.series} (${point.unit})`
    groups.set(key, [...(groups.get(key) ?? []), point])
  }

  if (groups.size === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
        <p className="font-semibold text-gray-900">Waiting for verified figures.</p>
        <p className="mt-1">
          Charts appear here once verified rows of the team's evidence sheet are added to{' '}
          <code className="font-mono">data/market_forecast.json</code>. No placeholder numbers are shown.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {[...groups].map(([title, series]) => (
        <SeriesChart key={title} title={title} points={[...series].sort((a, b) => a.year - b.year)} />
      ))}
    </div>
  )
}

/** Axis top and step: 4 even steps of 1, 2, 2.5 or 5 × 10^n. */
function niceScale(max: number): { top: number; step: number } {
  const raw = (max || 1) / 4
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw
  return { top: step * 4, step }
}

function SeriesChart({ title, points }: { title: string; points: ForecastPoint[] }) {
  const [active, setActive] = useState<number | null>(null)
  const years = points.map((p) => p.year)
  const first = Math.min(...years)
  const last = Math.max(...years)
  const { top, step } = niceScale(Math.max(...points.map((p) => p.value)))
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const x = (year: number) => PAD.left + (last === first ? plotW / 2 : ((year - first) / (last - first)) * plotW)
  const y = (value: number) => PAD.top + plotH - (value / top) * plotH
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step)
  const unit = points[0].unit
  const sources = [...new Set(points.map(cite))]
  const shown = active === null ? null : points[active]

  return (
    <figure className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <figcaption className="mb-2">
        <span className="block text-sm font-semibold text-gray-900">{title}</span>
        <span className="mt-1 flex gap-4 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <svg aria-hidden viewBox="0 0 10 10" className="size-2.5">
              <circle cx="5" cy="5" r="4" fill={LINE} />
            </svg>
            actual
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg aria-hidden viewBox="0 0 10 10" className="size-2.5">
              <circle cx="5" cy="5" r="3.5" fill="white" stroke={LINE} strokeWidth="1.5" />
            </svg>
            forecast (dashed)
          </span>
        </span>
      </figcaption>
      <div className="relative">
        <svg
          role="img"
          aria-label={`${title}: ${points.length} points from ${first} to ${last}; forecasts drawn hollow and dashed. Values are in the table below.`}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full overflow-visible"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke="#e5e7eb" strokeWidth="1" />
              <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize="11" fill="#6b7280">
                {number.format(tick)}
              </text>
            </g>
          ))}
          {points.map((point) => (
            <text key={point.year} x={x(point.year)} y={H - 8} textAnchor="middle" fontSize="11" fill="#6b7280">
              {point.year}
            </text>
          ))}
          {points.slice(1).map((point, i) => (
            <line
              key={point.year}
              x1={x(points[i].year)}
              y1={y(points[i].value)}
              x2={x(point.year)}
              y2={y(point.value)}
              stroke={LINE}
              strokeWidth="2"
              strokeDasharray={point.kind === 'forecast' ? '6 4' : undefined}
            />
          ))}
          {points.map((point, i) => (
            <g key={point.year}>
              <circle
                cx={x(point.year)}
                cy={y(point.value)}
                r="4.5"
                fill={point.kind === 'forecast' ? 'white' : LINE}
                stroke={point.kind === 'forecast' ? LINE : 'white'}
                strokeWidth="2"
              />
              {/* Hit target bigger than the mark; keyboard users reach it with Tab. */}
              <circle
                cx={x(point.year)}
                cy={y(point.value)}
                r="14"
                fill="transparent"
                tabIndex={0}
                aria-label={`${point.year}: ${number.format(point.value)} ${unit} (${point.kind}), ${cite(point)}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              />
            </g>
          ))}
        </svg>
        {shown && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 w-max max-w-56 -translate-x-1/2 -translate-y-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md"
            style={{ left: `${(x(shown.year) / W) * 100}%`, top: `calc(${(y(shown.value) / H) * 100}% - 10px)` }}
          >
            <p className="font-semibold text-gray-900">
              {number.format(shown.value)} {unit}
            </p>
            <p className="text-gray-600">
              {shown.year} · {shown.kind}
            </p>
            <p className="text-gray-600">{cite(shown)}</p>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-500">Source: {sources.join('; ')}. Published figures, not demo data.</p>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer font-semibold text-emerald-800">Table view</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-gray-500">
            <tr>
              <th className="py-1 font-medium">Year</th>
              <th className="py-1 font-medium">Value ({unit})</th>
              <th className="py-1 font-medium">Kind</th>
              <th className="py-1 font-medium">Source</th>
              <th className="py-1 font-medium">Evidence row</th>
            </tr>
          </thead>
          <tbody className="text-gray-800">
            {points.map((point) => (
              <tr key={point.year} className="border-t border-gray-100">
                <td className="py-1">{point.year}</td>
                <td className="py-1 tabular-nums">{number.format(point.value)}</td>
                <td className="py-1">{point.kind}</td>
                <td className="py-1">{cite(point)}</td>
                <td className="py-1 font-mono">{point.evidence_row}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
