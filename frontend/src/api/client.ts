// The only module that talks to the backend. Every URL is relative under /api, which the
// Vite server (dev and preview) proxies to FastAPI with the prefix stripped; see vite.config.ts.
// Also the only module that holds the technician's login: the token lives in sessionStorage
// (gone when the tab closes, never in localStorage) and goes out as a bearer token on every call.
import type {
  ChainCheck,
  Contact,
  CustomerRow,
  CustomerSession,
  Device,
  DeviceDetail,
  DeviceSummary,
  Enquiry,
  Evaluation,
  Favourite,
  FleetSummary,
  Listing,
  NewCustomer,
  NewEnquiry,
  NewEvent,
  NewListing,
  NewTechnician,
  PassportEvent,
  Session,
  Technician,
} from './types'

const API_BASE = '/api'
export const SESSION_KEY = 'recompute.session'
/** A customer login (contract v2.4) is stored apart; a tab holds at most one of the two logins. */
export const CUSTOMER_KEY = 'recompute.customer'

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

let cachedCustomerRaw: string | null = null
let cachedCustomer: CustomerSession | null = null

function readStored(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null // storage blocked (private mode): nobody stays logged in
  }
}

const readStoredSession = () => readStored(SESSION_KEY)

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

function parseCustomer(raw: string | null): CustomerSession | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const session = value as CustomerSession
    const valid =
      typeof session.token === 'string' && typeof session.expires_at === 'string' && typeof session.customer?.email === 'string'
    return valid ? session : null
  } catch {
    return null
  }
}

/** The logged-in customer's session (contract v2.4), or null. Same caching rule as currentSession(). */
export function currentCustomer(): CustomerSession | null {
  const raw = readStored(CUSTOMER_KEY)
  if (raw !== cachedCustomerRaw) {
    cachedCustomerRaw = raw
    cachedCustomer = parseCustomer(raw)
  }
  return cachedCustomer && Date.parse(cachedCustomer.expires_at) > Date.now() ? cachedCustomer : null
}

function store(key: string, value: unknown) {
  try {
    if (value) sessionStorage.setItem(key, JSON.stringify(value))
    else sessionStorage.removeItem(key)
  } catch {
    // Storage blocked: currentSession() and currentCustomer() keep answering null, so the login pages stay visible.
  }
}

/** Sets both logins at once (one of them is always null) and tells the subscribers once. */
function setLogins(technician: Session | null, customer: CustomerSession | null) {
  store(SESSION_KEY, technician)
  store(CUSTOMER_KEY, customer)
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
  const token = currentSession()?.token ?? currentCustomer()?.token
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
  if (response.status === 401 && token) setLogins(null, null)
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

/** A new passport record; the API never overwrites an existing id (400). */
export const createDevice = (device: Device) => request<Device>('/devices', { method: 'POST', body: JSON.stringify(device) })

export const evaluateDevice =(id: string) => request<Evaluation>(`${devicePath(id)}/evaluate`, { method: 'POST' })

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
  setLogins(session, null) // one login per tab: a technician login ends a customer login
  return session
}

/** There is no logout endpoint: logging out means forgetting the token (technician or customer). */
export function logout(): void {
  setLogins(null, null)
}

export const getListings = () => request<Listing[]>('/listings')

export const getContact = () => request<Contact>('/contact')

export const listDevice = (id: string, listing: NewListing) =>
  request<PassportEvent>(`${devicePath(id)}/list`, { method: 'POST', body: JSON.stringify(listing) })

export const unlistDevice = (id: string, note?: string) =>
  request<PassportEvent>(`${devicePath(id)}/unlist`, { method: 'POST', body: JSON.stringify(note ? { note } : {}) })

export const addTechnician = (account: NewTechnician) =>
  request<Technician>('/auth/technicians', { method: 'POST', body: JSON.stringify(account) })

/** The logged-in technician changes their own full name; the stored login shows the new name at once. */
export async function updateProfile(name: string): Promise<Technician> {
  const technician = await request<Technician>('/auth/me', { method: 'PATCH', body: JSON.stringify({ name }) })
  const session = currentSession()
  if (session) setLogins({ ...session, technician }, null)
  return technician
}

/** Needs the current password. The API answers 400 (not 401) when it is wrong, so the login is kept. */
export const changePassword = (currentPassword: string, newPassword: string) =>
  request<Technician>('/auth/password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })

// ---- customer accounts (contract v2.4) ---------------------------------------------

async function startCustomerSession(path: string, body: unknown): Promise<CustomerSession> {
  const session = await request<CustomerSession>(path, { method: 'POST', body: JSON.stringify(body) })
  setLogins(null, session) // one login per tab: a customer login ends a technician login
  return session
}

/** Public sign-up for buyers; the new customer is logged in at once. */
export const signUp = (account: NewCustomer) => startCustomerSession('/customers/signup', account)

export const customerLogin = (email: string, password: string) => startCustomerSession('/customers/login', { email, password })

const favouritePath = (id: string) => `/customers/me/favourites/${encodeURIComponent(id)}`

export const getFavourites = () => request<Favourite[]>('/customers/me/favourites')

export const saveFavourite = (id: string) => request<Favourite>(favouritePath(id), { method: 'PUT' })

export const removeFavourite = (id: string) => request<{ device_id: string; removed: boolean }>(favouritePath(id), { method: 'DELETE' })

export const sendEnquiry = (enquiry: NewEnquiry) =>
  request<Enquiry>('/customers/me/enquiries', { method: 'POST', body: JSON.stringify(enquiry) })

export const getMyEnquiries = () => request<Enquiry[]>('/customers/me/enquiries')

/** Technicians (the admins) only. */
export const getEnquiries = () => request<Enquiry[]>('/enquiries')

/** Technicians (the admins) only. */
export const getCustomers = () => request<CustomerRow[]>('/customers')
