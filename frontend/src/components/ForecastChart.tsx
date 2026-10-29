import { useId, useState } from 'react'
import type { ForecastPoint } from '../api/types'
import { Notice, panelClass } from './ui'

// PRD 15.4: one unit and one source per chart (never two units on one axis), source + page on every point,
// forecasts marked as forecasts, and only points traced to an evidence-sheet row.
const W = 560
const H = 240
const PAD = { top: 16, right: 20, bottom: 30, left: 56 }
const LABEL_GAP = 10
const CHAR_W = 6.6 // rough width of one 11 px character: room for the direct labels right of the lines
const number = new Intl.NumberFormat('en', { maximumFractionDigits: 2 })

// Line colours in fixed order (index.css --color-series-*): colour follows the line, never its rank.
// data/market_forecast.json is tested to have at most three lines per chart.
const SLOTS = [
  { stroke: 'stroke-series-1', fill: 'fill-series-1', key: 'border-series-1' },
  { stroke: 'stroke-series-2', fill: 'fill-series-2', key: 'border-series-2' },
  { stroke: 'stroke-series-3', fill: 'fill-series-3', key: 'border-series-3' },
]

interface Line {
  name: string
  points: ForecastPoint[]
}

const isTraceable = (point: ForecastPoint) =>
  point.source.trim() !== '' && String(point.page).trim() !== '' && /^E\d+$/.test(point.evidence_row)

const chartTitle = (point: ForecastPoint) => point.chart ?? point.series
const pointId = (point: ForecastPoint) => `${point.series}\u0000${point.year}`
const cite = (point: ForecastPoint) => `${point.source}, p. ${point.page}`
const kindLabel = (point: ForecastPoint) => (point.kind === 'forecast' ? 'Forecast or scenario' : 'Published figure')

/** "Source: Author, year, pp. 9, 12": pages grouped per source. */
function citeAll(points: ForecastPoint[]): string {
  const pages = new Map<string, Set<string>>()
  for (const point of points) pages.set(point.source, (pages.get(point.source) ?? new Set()).add(String(point.page)))
  const parts = [...pages].map(([source, set]) => {
    const sorted = [...set].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b))
    return `${source}, ${sorted.length === 1 ? 'p.' : 'pp.'} ${sorted.join(', ')}`
  })
  return `${parts.length === 1 ? 'Source' : 'Sources'}: ${parts.join(' · ')}`
}

function toLines(points: ForecastPoint[]): Line[] {
  const lines = new Map<string, ForecastPoint[]>()
  for (const point of points) lines.set(point.series, [...(lines.get(point.series) ?? []), point])
  return [...lines].map(([name, linePoints]) => ({ name, points: [...linePoints].sort((a, b) => a.year - b.year) }))
}

interface ForecastChartsProps {
  points: ForecastPoint[]
  /** Dev-server layout data (data/market_forecast.mock.json): no evidence rows, shown under a MOCK DATA banner. */
  mock?: boolean
}

export function ForecastCharts({ points, mock = false }: ForecastChartsProps) {
  const groups = new Map<string, ForecastPoint[]>()
  for (const point of mock ? points : points.filter(isTraceable)) {
    const key = `${chartTitle(point)}\u0000${point.unit}`
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

  // Two charts per row on wide screens keeps the chart text near its drawn size (the SVG scales with its width).
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {mock && (
        <div className="lg:col-span-2">
          <Notice tone="warning">
            <strong>MOCK DATA, dev server only.</strong> Made-up numbers to try the layout. They are not published
            figures and never appear in the built app; verified rows in data/market_forecast.json replace them.
          </Notice>
        </div>
      )}
      {[...groups].map(([key, group]) => (
        <ChartPanel key={key} points={group} />
      ))}
    </div>
  )
}

function ChartPanel({ points }: { points: ForecastPoint[] }) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const headingId = useId()
  const title = chartTitle(points[0])
  const { unit } = points[0]
  const lines = toLines(points)
  const multi = lines.length > 1
  const hasNotes = points.some((point) => point.note)
  const columns = ['Year', ...(multi ? ['Series'] : []), `Value (${unit})`, 'Type', 'Source', 'Evidence row', ...(hasNotes ? ['Note'] : [])]
  const cell = 'border-b border-sunken px-4 py-2.5'
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
            {title}
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
          <Legend lines={multi ? lines : []} />
          <Plot title={title} unit={unit} lines={lines} />
          <p className="text-xs text-ink-2">{citeAll(points)}. Published figures, not demo data.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left font-mono text-[11px] tracking-[.06em] text-ink-2 uppercase">
                {columns.map((column) => (
                  <th key={column} className="border-b border-line px-4 py-2.5 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.flatMap((line) => line.points).map((point) => (
                <tr key={pointId(point)}>
                  <td className={`${cell} font-mono`}>{point.year}</td>
                  {multi && <td className={cell}>{point.series}</td>}
                  <td className={`${cell} font-mono tabular-nums`}>{number.format(point.value)}</td>
                  <td className={cell}>{kindLabel(point)}</td>
                  <td className={`${cell} text-ink-2`}>{cite(point)}</td>
                  <td className={`${cell} font-mono`}>{point.evidence_row}</td>
                  {hasNotes && <td className={`${cell} text-ink-2`}>{point.note}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/** Series keys (only when a chart has two or more lines) and the published/forecast marker key. */
function Legend({ lines }: { lines: Line[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-ink-2">
      {lines.length > 0 && (
        <ul aria-label="Series" className="flex flex-wrap gap-x-4 gap-y-2">
          {lines.map((line, i) => (
            <li key={line.name} className="inline-flex items-center gap-1.5 text-ink">
              <span aria-hidden className={`w-4 border-t-2 ${SLOTS[i % SLOTS.length].key}`} />
              {line.name}
            </li>
          ))}
        </ul>
      )}
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-[9px] rounded-full bg-ink-2" />
        Published figure
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-[9px] rounded-full border-2 border-ink-2 bg-surface" />
        <span aria-hidden className="w-4 border-t-2 border-dashed border-ink-2" />
        Forecast or scenario
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

interface PlotProps {
  title: string
  unit: string
  lines: Line[]
}

function Plot({ title, unit, lines }: PlotProps) {
  const [active, setActive] = useState<string | null>(null)
  const points = lines.flatMap((line) => line.points)
  const years = [...new Set(points.map((p) => p.year))].sort((a, b) => a - b)
  const first = years[0]
  const last = years[years.length - 1]
  const { top, step } = niceScale(Math.max(...points.map((p) => p.value)))
  const multi = lines.length > 1
  const right = multi ? LABEL_GAP + Math.max(...lines.map((line) => line.name.length)) * CHAR_W : PAD.right
  const plotW = W - PAD.left - right
  const plotH = H - PAD.top - PAD.bottom
  const x = (year: number) => PAD.left + (last === first ? plotW / 2 : ((year - first) / (last - first)) * plotW)
  const y = (value: number) => PAD.top + plotH - (value / top) * plotH
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step)
  const ends = lines.map((line) => line.points[line.points.length - 1])
  // Direct labels only while the line ends stay apart; if two would collide, the legend alone names the lines.
  const labelled =
    multi && ends.every((a, i) => ends.every((b, j) => i === j || a.year !== b.year || Math.abs(y(a.value) - y(b.value)) >= 13))
  const shown = points.find((point) => pointId(point) === active) ?? null
  const describe = (point: ForecastPoint) =>
    [
      `${multi ? `${point.series}, ` : ''}${point.year}: ${number.format(point.value)} ${unit} (${kindLabel(point).toLowerCase()})`,
      point.note,
      cite(point),
    ]
      .filter(Boolean)
      .join(', ')

  return (
    <div className="relative">
      <svg
        role="img"
        aria-label={`${title}: ${multi ? `${lines.length} lines, ` : ''}${points.length} points from ${first} to ${last}; forecasts drawn hollow and dashed. Values are in the table view.`}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full overflow-visible"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            {tick > 0 && <line x1={PAD.left} x2={W - right} y1={y(tick)} y2={y(tick)} className="stroke-sunken" strokeWidth="1" />}
            <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize="11" className="fill-ink-2 font-mono">
              {number.format(tick)}
            </text>
          </g>
        ))}
        <path d={`M${PAD.left} ${PAD.top}V${H - PAD.bottom}H${W - right}`} fill="none" className="stroke-ink" strokeWidth="1" />
        {years.map((year) => (
          <text key={year} x={x(year)} y={H - 8} textAnchor="middle" fontSize="11" className="fill-ink-2 font-mono">
            {year}
          </text>
        ))}
        {lines.map((line, i) =>
          line.points.slice(1).map((point, k) => (
            <line
              key={pointId(point)}
              x1={x(line.points[k].year)}
              y1={y(line.points[k].value)}
              x2={x(point.year)}
              y2={y(point.value)}
              className={SLOTS[i % SLOTS.length].stroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={point.kind === 'forecast' ? '5 4' : undefined}
            />
          )),
        )}
        {lines.map((line, i) =>
          line.points.map((point) => (
            <g key={pointId(point)}>
              {/* Surface ring keeps markers readable where lines cross or points coincide. */}
              <circle cx={x(point.year)} cy={y(point.value)} r="6.5" className="fill-surface" />
              <circle
                cx={x(point.year)}
                cy={y(point.value)}
                r="4.5"
                className={`${SLOTS[i % SLOTS.length].stroke} ${point.kind === 'forecast' ? 'fill-surface' : SLOTS[i % SLOTS.length].fill}`}
                strokeWidth="2"
              />
            </g>
          )),
        )}
        {labelled &&
          lines.map((line, i) => (
            <text key={line.name} x={x(ends[i].year) + LABEL_GAP} y={y(ends[i].value)} dy="0.32em" fontSize="11" className="fill-ink-2">
              {line.name}
            </text>
          ))}
        {points.map((point) => (
          // Hit target bigger than the mark; keyboard users reach it with Tab.
          <circle
            key={pointId(point)}
            cx={x(point.year)}
            cy={y(point.value)}
            r="14"
            fill="transparent"
            tabIndex={0}
            aria-label={describe(point)}
            onMouseEnter={() => setActive(pointId(point))}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(pointId(point))}
            onBlur={() => setActive(null)}
          />
        ))}
      </svg>
      {shown && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 w-max max-w-64 -translate-x-1/2 -translate-y-[calc(100%+14px)] bg-ink px-2.5 py-2 font-mono text-xs leading-[1.45] text-surface"
          style={{ left: `${(x(shown.year) / W) * 100}%`, top: `${(y(shown.value) / H) * 100}%` }}
        >
          {multi && (
            <>
              {shown.series}
              <br />
            </>
          )}
          {number.format(shown.value)} {unit} · {shown.year} · {kindLabel(shown).toLowerCase()}
          {shown.note && (
            <>
              <br />
              {shown.note}
            </>
          )}
          <br />
          <span className="text-on-ink-2">Source: {cite(shown)}</span>
        </div>
      )}
    </div>
  )
}
