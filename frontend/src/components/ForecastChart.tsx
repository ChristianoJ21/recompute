import { useId, useState } from 'react'
import type { ForecastPoint } from '../api/types'
import { panelClass } from './ui'

// PRD 15.4: one chart per series (never two units on one axis), source + page on every point,
// forecasts marked as forecasts, and only points traced to an evidence-sheet row.
const W = 560
const H = 240
const PAD = { top: 16, right: 20, bottom: 30, left: 56 }
const number = new Intl.NumberFormat('en', { maximumFractionDigits: 2 })

const isTraceable = (point: ForecastPoint) =>
  point.source.trim() !== '' && String(point.page).trim() !== '' && /^E\d+$/.test(point.evidence_row)

const cite = (point: ForecastPoint) => `${point.source}, p. ${point.page}`
const kindLabel = (point: ForecastPoint) => (point.kind === 'forecast' ? 'Forecast' : 'Actual')

export function ForecastCharts({ points }: { points: ForecastPoint[] }) {
  const groups = new Map<string, ForecastPoint[]>()
  for (const point of points.filter(isTraceable)) {
    const key = `${point.series}\u0000${point.unit}`
    groups.set(key, [...(groups.get(key) ?? []), point])
  }

  if (groups.size === 0) {
    return (
      <section className="flex flex-col items-center gap-2.5 border border-dashed border-line-strong bg-surface px-5 py-[clamp(32px,6vw,64px)] text-center">
        <svg width="56" height="40" viewBox="0 0 56 40" aria-hidden>
          <path d="M2 2v36h52" fill="none" strokeWidth="1.5" className="stroke-line-strong" />
          <path d="M8 30l12-8 10 4 10-12 10 4" fill="none" strokeWidth="1.5" strokeDasharray="3 3" className="stroke-line-mid" />
        </svg>
        <h2 className="text-xl font-bold">Waiting for verified figures</h2>
        <p className="max-w-[46ch] text-[15px] text-ink-2">
          Charts appear here once published figures have been checked against their source and page. No placeholder
          numbers are shown.
        </p>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {[...groups].map(([key, series]) => (
        <SeriesPanel key={key} points={[...series].sort((a, b) => a.year - b.year)} />
      ))}
    </div>
  )
}

function SeriesPanel({ points }: { points: ForecastPoint[] }) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const headingId = useId()
  const { series, unit } = points[0]
  const sources = [...new Set(points.map(cite))]
  const toggle = (value: 'chart' | 'table', label: string) => (
    <button
      type="button"
      aria-pressed={view === value}
      onClick={() => setView(value)}
      className={`min-h-10 px-3.5 text-[13px] font-semibold ${view === value ? 'bg-ink text-surface' : 'bg-surface text-ink'}`}
    >
      {label}
    </button>
  )

  return (
    <section aria-labelledby={headingId} className={panelClass}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex flex-col">
          <h2 id={headingId} className="text-lg font-bold">
            {series}
          </h2>
          <span className="font-mono text-xs text-ink-2">unit: {unit}</span>
        </div>
        <div role="group" aria-label="View" className="flex border border-line-strong">
          {toggle('chart', 'Chart')}
          {toggle('table', 'Table')}
        </div>
      </div>
      {view === 'chart' ? (
        <div className="flex flex-col gap-3 p-4">
          <Legend />
          <Plot points={points} />
          <p className="text-xs text-ink-2">Sources: {sources.join(' · ')}. Published figures, not demo data.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left font-mono text-[11px] tracking-[.06em] text-ink-2 uppercase">
                {['Year', `Value (${unit})`, 'Type', 'Source', 'Evidence row'].map((title) => (
                  <th key={title} className="border-b border-line px-4 py-2.5 font-semibold">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.year}>
                  <td className="border-b border-sunken px-4 py-2.5 font-mono">{point.year}</td>
                  <td className="border-b border-sunken px-4 py-2.5 font-mono tabular-nums">{number.format(point.value)}</td>
                  <td className="border-b border-sunken px-4 py-2.5">{kindLabel(point)}</td>
                  <td className="border-b border-sunken px-4 py-2.5 text-ink-2">{cite(point)}</td>
                  <td className="border-b border-sunken px-4 py-2.5 font-mono">{point.evidence_row}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-[13px] text-ink-2">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-[9px] rounded-full bg-accent" />
        Published actual
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-[9px] rounded-full border-2 border-accent bg-surface" />
        <span aria-hidden className="w-4 border-t-2 border-dashed border-accent" />
        Forecast
      </span>
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

function Plot({ points }: { points: ForecastPoint[] }) {
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
  const { series, unit } = points[0]
  const shown = active === null ? null : points[active]

  return (
    <div className="relative">
      <svg
        role="img"
        aria-label={`${series}: ${points.length} points from ${first} to ${last}; forecasts drawn hollow and dashed. Values are in the table view.`}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full overflow-visible"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            {tick > 0 && <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} className="stroke-sunken" strokeWidth="1" />}
            <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize="11" className="fill-ink-2 font-mono">
              {number.format(tick)}
            </text>
          </g>
        ))}
        <path d={`M${PAD.left} ${PAD.top}V${H - PAD.bottom}H${W - PAD.right}`} fill="none" className="stroke-ink" strokeWidth="1" />
        {points.map((point) => (
          <text key={point.year} x={x(point.year)} y={H - 8} textAnchor="middle" fontSize="11" className="fill-ink-2 font-mono">
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
            className="stroke-accent"
            strokeWidth="2"
            strokeDasharray={point.kind === 'forecast' ? '5 4' : undefined}
          />
        ))}
        {points.map((point, i) => (
          <g key={point.year}>
            <circle
              cx={x(point.year)}
              cy={y(point.value)}
              r="4.5"
              className={`stroke-accent ${point.kind === 'forecast' ? 'fill-surface' : 'fill-accent'}`}
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
          className="pointer-events-none absolute z-10 w-max max-w-64 -translate-x-1/2 -translate-y-[calc(100%+14px)] bg-ink px-2.5 py-2 font-mono text-xs leading-[1.45] text-surface"
          style={{ left: `${(x(shown.year) / W) * 100}%`, top: `${(y(shown.value) / H) * 100}%` }}
        >
          {number.format(shown.value)} {unit} · {shown.year} · {shown.kind}
          <br />
          <span className="text-on-ink-2">Source: {cite(shown)}</span>
        </div>
      )}
    </div>
  )
}
