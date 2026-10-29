import { describe, expect, it } from 'vitest'
import type { PassportEvent } from '../api/types'
import { sparkPath, telemetrySeries } from './telemetry'

const event = (id: number, kind: PassportEvent['kind'], payload: Record<string, unknown>): PassportEvent => ({
  id,
  device_id: 'GPU-SRV-001',
  created_at: `2026-10-28T13:0${id}:00Z`,
  kind,
  payload,
  actor: 'tech-1',
  prev_hash: null,
  hash: null,
})

describe('telemetrySeries', () => {
  it('takes one reading from the telemetry events only, oldest first, newest N', () => {
    const events = [
      event(4, 'telemetry', { utilization_pct: 70 }),
      event(3, 'wipe', { utilization_pct: 1 }),
      event(2, 'telemetry', { utilization_pct: 50, power_w: 500 }),
      event(1, 'telemetry', { power_w: 480 }),
    ]

    expect(telemetrySeries(events, 'utilization_pct')).toEqual([50, 70])
    expect(telemetrySeries(events, 'power_w')).toEqual([480, 500])
    expect(telemetrySeries(events, 'utilization_pct', 1)).toEqual([70])
  })
})

describe('sparkPath', () => {
  it('draws a line across the full width, low values at the bottom', () => {
    const { line, area } = sparkPath([0, 10], 100, 20)!

    expect(line).toBe('M0.0 17.0 L100.0 3.0')
    expect(area).toBe('M0.0 17.0 L100.0 3.0 L100 20 L0 20 Z')
  })

  it('draws nothing for fewer than two points', () => {
    expect(sparkPath([5], 100, 20)).toBeNull()
  })
})
