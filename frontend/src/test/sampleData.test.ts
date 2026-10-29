import { describe, expect, it } from 'vitest'
import createRequest from '../../../contracts/examples/device_create_request.json'
import forecast from '../../../data/market_forecast.json'
import fleet from '../../../data/sample_devices.json'
import { OUTCOMES, type ForecastPoint, type Range } from '../api/types'
import { locationSite } from '../lib/format'

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

  it('puts every device in a sample Indonesian city (A10: "City, Indonesia · hall / use")', () => {
    for (const device of fleet.devices) {
      expect(locationSite(device.location), device.id).toMatch(/^(Jakarta|Cikarang|Batam|Surabaya), Indonesia$/)
    }
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
  const REQUIRED = ['evidence_row', 'kind', 'page', 'series', 'source', 'unit', 'value', 'year']
  const OPTIONAL = ['chart', 'note']
  const panel = (point: ForecastPoint) => point.chart ?? point.series
  const line = (point: ForecastPoint) => `${panel(point)} / ${point.series}`
  const valuesBy = (key: (point: ForecastPoint) => string, value: (point: ForecastPoint) => string) => {
    const seen = new Map<string, Set<string>>()
    for (const point of points) seen.set(key(point), (seen.get(key(point)) ?? new Set()).add(value(point)))
    return seen
  }

  it('holds only points traced to a source page and an evidence row', () => {
    expect(points.length).toBeGreaterThan(0)
    for (const point of points) {
      const keys = Object.keys(point)
      for (const key of REQUIRED) expect(keys, key).toContain(key)
      for (const key of keys) expect([...REQUIRED, ...OPTIONAL], key).toContain(key)
      expect(['actual', 'forecast']).toContain(point.kind)
      expect(point.source.trim()).not.toBe('')
      expect(String(point.page).trim()).not.toBe('')
      expect(point.evidence_row).toMatch(/^E\d+$/)
      expect(Number.isFinite(point.value) && point.value >= 0, point.series).toBe(true)
    }
  })

  it('uses one unit and one source per chart, so no chart mixes units or publications', () => {
    for (const [chart, units] of valuesBy(panel, (point) => point.unit)) expect(units.size, chart).toBe(1)
    for (const [chart, sources] of valuesBy(panel, (point) => point.source)) expect(sources.size, chart).toBe(1)
  })

  it('draws at most three lines per chart (the validated series palette has three slots)', () => {
    for (const [chart, series] of valuesBy(panel, (point) => point.series)) expect(series.size, chart).toBeLessThanOrEqual(3)
  })

  it('has at most one point per year on each line', () => {
    for (const [name, years] of valuesBy(line, (point) => String(point.year))) {
      expect(years.size, name).toBe(points.filter((point) => line(point) === name).length)
    }
  })

  it('keeps decisions 8 and 10 and open item 11', () => {
    const has = (name: string) => points.some((point) => point.source.startsWith(name))
    expect(has('Wang') && has('de Vries-Gao'), 'decision 8: never Wang with de Vries-Gao').toBe(false)
    expect(has('Shehabi') && has('Smith'), 'decision 10: Shehabi or Smith, never both').toBe(false)
    expect(has('WSTS'), 'open item 11: WSTS 2026 forecast not verified').toBe(false)
  })
})
