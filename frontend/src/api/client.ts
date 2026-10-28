// The only module that talks to the backend. Every URL is relative under /api, which the
// Vite server (dev and preview) proxies to FastAPI with the prefix stripped; see vite.config.ts.
import type { DeviceDetail, DeviceSummary, Evaluation, FleetSummary, NewEvent, PassportEvent } from './types'

const API_BASE = '/api'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const devicePath = (id: string) => `/devices/${encodeURIComponent(id)}`

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(API_BASE + path, {
      ...init,
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the ReCompute server. Check the network connection and try again.')
  }
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

/** URL of the device's QR code PNG, for an <img src>. The QR opens /device/{id} on this frontend. */
export const qrCodeUrl = (id: string) => `${API_BASE}${devicePath(id)}/qr`
