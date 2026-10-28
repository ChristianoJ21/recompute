import { useSyncExternalStore } from 'react'
import { currentSession, subscribeSession } from '../api/client'
import type { Session } from '../api/types'

/** The logged-in technician's session, or null; re-renders on login, logout and a refused token. */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribeSession, currentSession)
}
