import type { Price, Range } from '../api/types'

const plain = new Intl.NumberFormat('en', { maximumFractionDigits: 2 })
const signed = new Intl.NumberFormat('en', { maximumFractionDigits: 1, signDisplay: 'exceptZero' })

/** "+1,200" or "−860" (typographic minus). */
export function formatSigned(value: number): string {
  return signed.format(value).replace('-', '−')
}

/** "+1,200 kg CO₂e" or "−860 kg CO₂e". */
export function formatKg(value: number): string {
  return `${formatSigned(value)} kg CO₂e`
}

/** "8–10", or "100" for a point value. */
export function formatRange(range: Range): string {
  return range.low === range.high ? plain.format(range.low) : `${plain.format(range.low)}–${plain.format(range.high)}`
}

// The demo runs in Jakarta: API times are UTC, the page shows WIB (UTC+7, no daylight saving).
const WIB = 'Asia/Jakarta'
const DAY = { day: 'numeric', month: 'short', year: 'numeric' } as const
const wibDateTime = new Intl.DateTimeFormat('en-GB', { ...DAY, hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: WIB })
const wibDate = new Intl.DateTimeFormat('en-GB', { ...DAY, timeZone: WIB })
const calendarDate = new Intl.DateTimeFormat('en-GB', { ...DAY, timeZone: 'UTC' })

/** "28 Oct 2026, 20:39 WIB". */
export function formatDateTime(iso: string): string {
  return `${wibDateTime.format(new Date(iso))} WIB`
}

/** "1 Mar 2022": a plain YYYY-MM-DD as written, a timestamp as its WIB date. */
export function formatDate(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? calendarDate.format(new Date(`${value}T00:00:00Z`)) : wibDate.format(new Date(value))
}

const READINGS: Record<string, { label: string; unit: string }> = {
  utilization_pct: { label: 'util', unit: '%' },
  power_w: { label: 'power', unit: 'W' },
  inlet_temp_c: { label: 'inlet', unit: '°C' },
  gpu_temp_c: { label: 'gpu temp', unit: '°C' },
  corrected_memory_errors: { label: 'mem errors', unit: '' },
}

/** Up to four telemetry readings as short label + value ("util" "55 %"); the simulated / sample_data flags are left out. */
export function telemetryReadings(payload: Record<string, unknown>): { label: string; value: string }[] {
  return Object.entries(payload)
    .filter(([key, value]) => key !== 'simulated' && key !== 'sample_data' && typeof value !== 'object')
    .slice(0, 4)
    .map(([key, value]) => {
      const known = READINGS[key]
      return known ? { label: known.label, value: `${String(value)} ${known.unit}`.trim() } : { label: key, value: String(value) }
    })
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

/** Places the range [min, max] on a bar that always includes zero, padded 18 % at both ends. */
export function netBarGeometry(min: number, max: number): NetBarGeometry {
  const low = Math.min(min, max)
  const high = Math.max(min, max)
  const domainLow = Math.min(low, 0)
  const domainHigh = Math.max(high, 0)
  const pad = (domainHigh - domainLow || 1) * 0.18
  const from = domainLow - pad
  const span = domainHigh + pad - from
  const at = (value: number) => ((value - from) / span) * 100
  return { start: at(low), end: at(high), zero: at(0) }
}

const ACRONYMS = new Set(['gpu', 'cpu', 'tpu', 'npu', 'ssd', 'hdd', 'nic', 'psu'])
const word = (w: string, i: number) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : i === 0 ? w[0].toUpperCase() + w.slice(1) : w)

/** "gpu_server" gives "GPU server". */
export function formatDeviceType(type: string): string {
  return type.split(/[_\s]+/).filter(Boolean).map(word).join(' ')
}

/** "GPU Accel-v1 · Memory HBM-v1". */
export function formatComponents(components: { type: string; model: string }[]): string {
  return components.map((c) => `${word(c.type, 0)} ${c.model}`).join(' · ')
}
