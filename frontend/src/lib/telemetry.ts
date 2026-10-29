import type { PassportEvent } from '../api/types'

/** One numeric reading (e.g. utilization_pct) from the device's telemetry events, oldest first, the newest `count`. */
export function telemetrySeries(events: PassportEvent[], key: string, count = 20): number[] {
  return events
    .filter((event) => event.kind === 'telemetry' && typeof event.payload[key] === 'number')
    .sort((a, b) => a.id - b.id)
    .slice(-count)
    .map((event) => event.payload[key] as number)
}

export interface SparkPath {
  line: string
  /** The line closed down to the bottom edge, for the soft fill. */
  area: string
}

/** SVG path of a small trend line in a width × height box (3px inset top and bottom); null below two points. */
export function sparkPath(values: number[], width: number, height: number): SparkPath | null {
  if (values.length < 2) return null
  const low = Math.min(...values)
  const span = Math.max(...values) - low || 1
  const points = values.map((value, i) => [(i / (values.length - 1)) * width, height - 3 - ((value - low) / span) * (height - 6)])
  const line = 'M' + points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')
  return { line, area: `${line} L${width} ${height} L0 ${height} Z` }
}
