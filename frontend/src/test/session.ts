import loginResponse from '../../../contracts/examples/login_response.json'
import { SESSION_KEY } from '../api/client'
import type { Session } from '../api/types'

/** A stored login that is still valid (the example's own expiry is only 12 h after it was generated). */
export const TECH_SESSION: Session = { ...loginResponse, token: 'test-token', expires_at: '2099-01-01T00:00:00Z' }

export function signIn(session: Session = TECH_SESSION) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}
