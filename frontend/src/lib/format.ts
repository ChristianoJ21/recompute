import type { Price, Range } from '../api/types'

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

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'medium' })
}

/** "IDR 45,000,000": the currency code, never a symbol, and whole units only. */
export function formatPrice(price: Price): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: price.currency,
      currencyDisplay: 'code',
      maximumFractionDigits: 0,
    }).format(price.amount)
  } catch {
    return `${price.currency} ${plain.format(price.amount)}` // a code Intl does not know
  }
}

/** Reads a price out of an event payload, or null if it is not one. */
export function asPrice(value: unknown): Price | null {
  if (!value || typeof value !== 'object') return null
  const { amount, currency } = value as Partial<Price>
  return typeof amount === 'number' && typeof currency === 'string' ? { amount, currency } : null
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
