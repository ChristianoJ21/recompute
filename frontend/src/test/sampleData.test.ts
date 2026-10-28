import { describe, expect, it } from 'vitest'
import createRequest from '../../../contracts/examples/device_create_request.json'
import forecast from '../../../data/market_forecast.json'
import fleet from '../../../data/sample_devices.json'
import { OUTCOMES, type ForecastPoint, type Range } from '../api/types'

const ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/

function expectRange(range: Range | null, where: string) {
  if (range === null) return
  expect(Object.keys(range).sort(), where).toEqual(['high', 'low'])
  expect(range.low, where).toBeGreaterThanOrEqual(0)
  expect(range.low, where).toBeLessThanOrEqual(range.high)
}

describe('data/sample_devices.json', () => {
  it('marks the file and every device as sample data', () => {
    expect(fleet.sample_data).toBe(true)
    for (const device of fleet.devices) expect(device.sample_data, device.id).toBe(true)
  })

  it('gives every device the POST /devices body shape', () => {
    const keys = Object.keys(createRequest).sort()
    for (const device of fleet.devices) {
      expect(Object.keys(device).sort(), device.id).toEqual(keys)
      expect(Object.keys(device.inputs).sort(), device.id).toEqual(Object.keys(createRequest.inputs).sort())
      expect(device.install_date, device.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('uses unique, valid ids', () => {
    const ids = [...fleet.devices, ...fleet.workloads].map((record) => record.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(ID_PATTERN)
  })

  it('uses ranges with 0 <= low <= high, or null for a missing input', () => {
    for (const device of fleet.devices) {
      for (const [name, range] of Object.entries(device.inputs)) expectRange(range, `${device.id}.${name}`)
      for (const option of device.upgrade_options) {
        expectRange(option.I_upgraded, `${device.id}.${option.component}.I_upgraded`)
        expectRange(option.E_component, `${device.id}.${option.component}.E_component`)
      }
    }
    for (const workload of fleet.workloads) expectRange(workload.W, workload.id)
  })

  it('expects all six outcomes, one per device', () => {
    expect(Object.keys(fleet.expected_outcomes).sort()).toEqual(fleet.devices.map((d) => d.id).sort())
    expect(new Set(Object.values(fleet.expected_outcomes))).toEqual(new Set(OUTCOMES))
  })
})

describe('sample listings in data/sample_devices.json', () => {
  it('lists only sample devices, each with a valid sample price', () => {
    const ids = new Set(fleet.devices.map((device) => device.id))
    expect(fleet.listings.length).toBeGreaterThan(0)
    for (const listing of fleet.listings) {
      expect(ids.has(listing.device_id), listing.device_id).toBe(true)
      expect(Number.isInteger(listing.price.amount) && listing.price.amount > 0, listing.device_id).toBe(true)
      expect(listing.price.currency).toMatch(/^[A-Z]{3}$/)
      expect(listing.note).toMatch(/sample/i)
    }
  })

  it('never lists a device that failed its reliability check', () => {
    const failed = new Set(fleet.devices.filter((device) => !device.reliability_ok).map((device) => device.id))
    for (const listing of fleet.listings) expect(failed.has(listing.device_id), listing.device_id).toBe(false)
  })
})

describe('data/market_forecast.json (PRD 15.4)', () => {
  const points = forecast as ForecastPoint[]

  it('holds only points traced to a source page and an evidence row', () => {
    for (const point of points) {
      expect(Object.keys(point).sort()).toEqual(
        ['evidence_row', 'kind', 'page', 'series', 'source', 'unit', 'value', 'year'].sort(),
      )
      expect(['actual', 'forecast']).toContain(point.kind)
      expect(point.source.trim()).not.toBe('')
      expect(String(point.page).trim()).not.toBe('')
      expect(point.evidence_row).toMatch(/^E\d+$/)
    }
  })

  it('uses one unit per series, so no chart mixes units', () => {
    const units = new Map<string, Set<string>>()
    for (const point of points) units.set(point.series, (units.get(point.series) ?? new Set()).add(point.unit))
    for (const [series, seen] of units) expect(seen.size, series).toBe(1)
  })
})
