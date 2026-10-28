import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import devicesList from '../../../contracts/examples/devices_list.json'
import error404 from '../../../contracts/examples/error_404.json'
import { ApiError, addEvent, evaluateDevice, getDevice, listDevices, qrCodeUrl } from './client'

const fetchMock = vi.fn<typeof fetch>()

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('api client', () => {
  it('reads the device list from the relative /api URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse(devicesList))

    await expect(listDevices()).resolves.toEqual(devicesList)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/devices')
  })

  it('escapes the device id in the path', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))

    await getDevice('rack 1/a')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/devices/rack%201%2Fa')
  })

  it('posts to the evaluate endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ outcome: 'KEEP' }))

    await evaluateDevice('GPU-SRV-002')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/devices/GPU-SRV-002/evaluate')
    expect(init?.method).toBe('POST')
  })

  it('posts a new event as JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 7 }, 201))
    const event = { kind: 'wipe' as const, payload: { note: 'sample' }, actor: 'tech-1' }

    await addEvent('GPU-SRV-001', event)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/devices/GPU-SRV-001/events')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init?.body as string)).toEqual(event)
  })

  it('throws the message from an API error body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(error404, 404))

    const error = await getDevice('NOPE').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, message: error404.error })
  })

  it('points at the backend when the proxy answers without JSON', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 500 }))

    await expect(listDevices()).rejects.toThrow(/backend running on port 8000/)
  })

  it('explains a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(listDevices()).rejects.toMatchObject({ status: 0, message: /Cannot reach/ })
  })

  it('builds the QR image URL under /api', () => {
    expect(qrCodeUrl('GPU-SRV-001')).toBe('/api/devices/GPU-SRV-001/qr')
  })
})
