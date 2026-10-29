import { useSyncExternalStore } from 'react'
import { currentCustomer, currentSession, subscribeSession } from '../api/client'
import type { CustomerSession, Session } from '../api/types'

/** The logged-in technician's session, or null; re-renders on login, logout and a refused token. */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribeSession, currentSession)
}

/** The logged-in customer's session (contract v2.4), or null; same updates as useSession. */
export function useCustomer(): CustomerSession | null {
  return useSyncExternalStore(subscribeSession, currentCustomer)
}
