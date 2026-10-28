import { describe, expect, it } from 'vitest'
import { asPrice, formatDate, formatDateTime, formatKg, formatPrice, formatRange, netBarGeometry, telemetryReadings } from './format'

describe('formatKg', () => {
  it('signs the value and uses a typographic minus', () => {
    expect(formatKg(1200)).toBe('+1,200 kg CO₂e')
    expect(formatKg(-860)).toBe('−860 kg CO₂e')
    expect(formatKg(0)).toBe('0 kg CO₂e')
  })
})

describe('formatRange', () => {
  it('shows low–high, or one number for a point value', () => {
    expect(formatRange({ low: 8, high: 10 })).toBe('8–10')
    expect(formatRange({ low: 100, high: 100 })).toBe('100')
  })
})

describe('netBarGeometry', () => {
  const inside = (value: number) => value > 0 && value < 100

  it('puts zero between the ends when the range straddles it (UNCERTAIN)', () => {
    const { start, end, zero } = netBarGeometry(-500, 150)
    expect(start).toBeLessThan(zero)
    expect(zero).toBeLessThan(end)
    expect([start, end, zero].every(inside)).toBe(true)
    expect(zero).toBeCloseTo((617 / 884) * 100) // 18 % padding each side
  })

  it('keeps zero on the bar when both ends are negative (KEEP)', () => {
    const { start, end, zero } = netBarGeometry(-860, -480)
    expect(start).toBeLessThan(end)
    expect(end).toBeLessThan(zero)
    expect(inside(zero)).toBe(true)
  })

  it('keeps zero on the bar when both ends are positive', () => {
    const { start, end, zero } = netBarGeometry(100, 1200)
    expect(zero).toBeLessThan(start)
    expect(start).toBeLessThan(end)
    expect(inside(zero)).toBe(true)
  })

  it('handles a point value', () => {
    const { start, end } = netBarGeometry(300, 300)
    expect(start).toBe(end)
    expect(inside(start)).toBe(true)
  })
})

describe('formatPrice', () => {
  it('shows the currency code and whole units', () => {
    expect(formatPrice({ amount: 45000000, currency: 'IDR' })).toMatch(/^IDR\s45,000,000$/)
  })

  it('still shows a code that Intl does not know', () => {
    expect(formatPrice({ amount: 12, currency: 'XYZ' })).toMatch(/XYZ\s12/)
  })
})

describe('asPrice', () => {
  it('reads a price from an event payload and rejects anything else', () => {
    expect(asPrice({ amount: 5, currency: 'IDR' })).toEqual({ amount: 5, currency: 'IDR' })
    expect(asPrice({ amount: '5', currency: 'IDR' })).toBeNull()
    expect(asPrice(null)).toBeNull()
  })
})

describe('times in WIB (UTC+7)', () => {
  it('shows an API timestamp as Jakarta time', () => {
    expect(formatDateTime('2026-10-28T13:39:44Z')).toBe('28 Oct 2026, 20:39 WIB')
  })

  it('moves to the next day when UTC evening is already past midnight in Jakarta', () => {
    expect(formatDate('2026-10-28T20:00:00Z')).toBe('29 Oct 2026')
  })

  it('shows a plain calendar date as written, without shifting it', () => {
    expect(formatDate('2022-03-01')).toBe('1 Mar 2022')
  })
})

describe('telemetryReadings', () => {
  it('names known readings with short labels and units, and skips the flags', () => {
    expect(
      telemetryReadings({ utilization_pct: 55, power_w: 583, inlet_temp_c: 23.1, simulated: true, sample_data: true }),
    ).toEqual([
      { label: 'util', value: '55 %' },
      { label: 'power', value: '583 W' },
      { label: 'inlet', value: '23.1 °C' },
    ])
  })

  it('keeps unknown readings under their own key and shows at most four', () => {
    expect(telemetryReadings({ gpu_temp_c: 61, fan: 3 })).toEqual([
      { label: 'gpu temp', value: '61 °C' },
      { label: 'fan', value: '3' },
    ])
    expect(telemetryReadings({ a: 1, b: 2, c: 3, d: 4, e: 5 })).toHaveLength(4)
    expect(telemetryReadings({ corrected_memory_errors: 0 })).toEqual([{ label: 'mem errors', value: '0' }])
  })
})
