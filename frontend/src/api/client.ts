// The only module that talks to the backend. Every URL is relative under /api, which the
// Vite server (dev and preview) proxies to FastAPI with the prefix stripped; see vite.config.ts.
// Also the only module that holds the technician's login: the token lives in sessionStorage
// (gone when the tab closes, never in localStorage) and goes out as a bearer token on every call.
import type {
  ChainCheck,
  Contact,
  DeviceDetail,
  DeviceSummary,
  Evaluation,
  FleetSummary,
  Listing,
  NewEvent,
  NewListing,
  NewTechnician,
  PassportEvent,
  Session,
  Technician,
} from './types'

const API_BASE = '/api'
export const SESSION_KEY = 'recompute.session'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// ---- session ---------------------------------------------------------------------

const sessionListeners = new Set<() => void>()
let cachedRaw: string | null = null
let cachedSession: Session | null = null

function readStoredSession(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null // storage blocked (private mode): the technician stays logged out
  }
}

function parseSession(raw: string | null): Session | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const session = value as Session
    const valid =
      typeof session.token === 'string' &&
      typeof session.expires_at === 'string' &&
      typeof session.technician?.username === 'string'
    return valid ? session : null
  } catch {
    return null
  }
}

/** The logged-in technician's session, or null. Returns the same object until it changes (for useSyncExternalStore). */
export function currentSession(): Session | null {
  const raw = readStoredSession()
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedSession = parseSession(raw)
  }
  return cachedSession && Date.parse(cachedSession.expires_at) > Date.now() ? cachedSession : null
}

function storeSession(session: Session | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Storage blocked: currentSession() keeps answering null, so the login page stays visible.
  }
  sessionListeners.forEach((listener) => listener())
}

/** Calls the listener whenever the technician logs in or out (or the token is refused). */
export function subscribeSession(listener: () => void): () => void {
  sessionListeners.add(listener)
  return () => {
    sessionListeners.delete(listener)
  }
}

// ---- requests --------------------------------------------------------------------

const devicePath = (id: string) => `/devices/${encodeURIComponent(id)}`

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = currentSession()?.token
  let response: Response
  try {
    response = await fetch(API_BASE + path, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the ReCompute server. Check the network connection and try again.')
  }
  // Expired or refused token: forget it, so the page shows the logged-out view and the login link.
  if (response.status === 401 && token) storeSession(null)
  if (!response.ok) throw new ApiError(response.status, await errorMessage(response))
  return (await response.json()) as T
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') return body.error
  } catch {
    // Not JSON: this is how the Vite proxy answers when the backend is down.
  }
  return `The API did not answer (HTTP ${response.status}). Is the backend running on port 8000?`
}

/** A readable message for anything a client call can throw. */
export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const listDevices = () => request<DeviceSummary[]>('/devices')

export const getFleetSummary = () => request<FleetSummary>('/fleet/summary')

export const getDevice = (id: string) => request<DeviceDetail>(devicePath(id))

export const evaluateDevice = (id: string) => request<Evaluation>(`${devicePath(id)}/evaluate`, { method: 'POST' })

export const addEvent = (id: string, event: NewEvent) =>
  request<PassportEvent>(`${devicePath(id)}/events`, { method: 'POST', body: JSON.stringify(event) })

export const verifyEvents = (id: string) => request<ChainCheck>(`${devicePath(id)}/events/verify`)

/** URL of the device's QR code PNG, for an <img src>. The QR opens /device/{id} on this frontend. */
export const qrCodeUrl = (id: string) => `${API_BASE}${devicePath(id)}/qr`

export async function login(username: string, password: string): Promise<Session> {
  const session = await request<Session>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  storeSession(session)
  return session
}

/** There is no logout endpoint: logging out means forgetting the token. */
export function logout(): void {
  storeSession(null)
}

export const getListings = () => request<Listing[]>('/listings')

export const getContact = () => request<Contact>('/contact')

export const listDevice = (id: string, listing: NewListing) =>
  request<PassportEvent>(`${devicePath(id)}/list`, { method: 'POST', body: JSON.stringify(listing) })

export const unlistDevice = (id: string, note?: string) =>
  request<PassportEvent>(`${devicePath(id)}/unlist`, { method: 'POST', body: JSON.stringify(note ? { note } : {}) })

export const addTechnician = (account: NewTechnician) =>
  request<Technician>('/auth/technicians', { method: 'POST', body: JSON.stringify(account) })
