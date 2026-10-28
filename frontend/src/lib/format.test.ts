import { describe, expect, it } from 'vitest'
import { formatKg, formatRange, netBarGeometry } from './format'

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
    expect(zero).toBeCloseTo((552 / 754) * 100)
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
