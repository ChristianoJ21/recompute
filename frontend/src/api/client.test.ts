import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import devicesList from '../../../contracts/examples/devices_list.json'
import error404 from '../../../contracts/examples/error_404.json'
import listCreated from '../../../contracts/examples/list_created.json'
import listRequest from '../../../contracts/examples/list_request.json'
import listings from '../../../contracts/examples/listings.json'
import { TECH_SESSION, signIn } from '../test/session'
import {
  ApiError,
  SESSION_KEY,
  addEvent,
  addTechnician,
  currentSession,
  evaluateDevice,
  getContact,
  getDevice,
  getListings,
  listDevice,
  listDevices,
  login,
  logout,
  qrCodeUrl,
  subscribeSession,
  unlistDevice,
} from './client'

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
    const event = { kind: 'wipe' as const, payload: { note: 'sample' } }

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

const authHeader = (call: number) => (fetchMock.mock.calls[call][1]?.headers as Record<string, string>).Authorization

describe('technician session', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    localStorage.clear()
  })

  it('logs in, keeps the session in sessionStorage only and sends the token as a bearer token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(TECH_SESSION)).mockResolvedValueOnce(jsonResponse({ id: 1 }, 201))

    await login('tech-1', 'correct horse battery')
    await addEvent('GPU-SRV-001', { kind: 'scan', payload: {} })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/login')
    expect(JSON.parse(init?.body as string)).toEqual({ username: 'tech-1', password: 'correct horse battery' })
    expect(currentSession()?.technician.username).toBe('tech-1')
    expect(sessionStorage.getItem(SESSION_KEY)).toContain('test-token')
    expect(localStorage.length).toBe(0)
    expect(authHeader(1)).toBe('Bearer test-token')
  })

  it('sends no token when logged out', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]))

    await listDevices()

    expect(authHeader(0)).toBeUndefined()
  })

  it('forgets the token and tells subscribers when the API answers 401', async () => {
    signIn()
    const listener = vi.fn()
    const unsubscribe = subscribeSession(listener)
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Token expired; log in again.' }, 401))

    await expect(evaluateDevice('GPU-SRV-001')).rejects.toMatchObject({ status: 401 })

    expect(currentSession()).toBeNull()
    expect(listener).toHaveBeenCalled()
    unsubscribe()
  })

  it('ignores a stored session that has expired', () => {
    signIn({ ...TECH_SESSION, expires_at: '2020-01-01T00:00:00Z' })

    expect(currentSession()).toBeNull()
  })

  it('ignores a stored value that is not a session', () => {
    sessionStorage.setItem(SESSION_KEY, '{"token": 5}')

    expect(currentSession()).toBeNull()
  })

  it('logs out by forgetting the token', () => {
    signIn()
    const listener = vi.fn()
    const unsubscribe = subscribeSession(listener)

    logout()

    expect(currentSession()).toBeNull()
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })
})

describe('listings', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  it('lists a device for sale with its price', async () => {
    fetchMock.mockResolvedValue(jsonResponse(listCreated, 201))

    await expect(listDevice('GPU-SRV-001', listRequest)).resolves.toEqual(listCreated)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/devices/GPU-SRV-001/list')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual(listRequest)
  })

  it('unlists a device, with an optional note', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({}, 201))

    await unlistDevice('GPU-SRV-001')
    await unlistDevice('GPU-SRV-001', 'sold (sample)')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/devices/GPU-SRV-001/unlist')
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({})
    expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({ note: 'sold (sample)' })
  })

  it('reads the public listings and contact box', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(listings))

    await getListings()
    await getContact()

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(['/api/listings', '/api/contact'])
  })
})

describe('adding a technician', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  it('posts the new account to /auth/technicians', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ username: 'tech-2', name: 'Two' }, 201))
    const account = { username: 'tech-2', name: 'Two', password: 'long enough pw' }

    await expect(addTechnician(account)).resolves.toEqual({ username: 'tech-2', name: 'Two' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/technicians')
    expect(JSON.parse(init?.body as string)).toEqual(account)
  })
})
