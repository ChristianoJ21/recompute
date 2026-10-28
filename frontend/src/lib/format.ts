import type { Range } from '../api/types'

const plain = new Intl.NumberFormat('en', { maximumFractionDigits: 2 })
const signed = new Intl.NumberFormat('en', { maximumFractionDigits: 1, signDisplay: 'exceptZero' })

/** "+1,200 kg CO₂e" or "−860 kg CO₂e" (typographic minus). */
export function formatKg(value: number): string {
  return `${signed.format(value).replace('-', '−')} kg CO₂e`
}

/** "8–10", or "100" for a point value. */
export function formatRange(range: Range): string {
  return range.low === range.high ? plain.format(range.low) : `${plain.format(range.low)}–${plain.format(range.high)}`
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

/** Positions on the net-saving bar, as percentages of its width. */
export interface NetBarGeometry {
  start: number
  end: number
  zero: number
}

/** Places the range [min, max] on a bar that always includes zero, with a little padding at both ends. */
export function netBarGeometry(min: number, max: number): NetBarGeometry {
  const low = Math.min(min, max)
  const high = Math.max(min, max)
  const domainLow = Math.min(low, 0)
  const domainHigh = Math.max(high, 0)
  const pad = (domainHigh - domainLow || 1) * 0.08
  const from = domainLow - pad
  const span = domainHigh + pad - from
  const at = (value: number) => ((value - from) / span) * 100
  return { start: at(low), end: at(high), zero: at(0) }
}
