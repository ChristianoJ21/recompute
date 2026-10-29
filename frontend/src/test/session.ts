import customerSession from '../../../contracts/examples/customer_session.json'
import loginResponse from '../../../contracts/examples/login_response.json'
import { CUSTOMER_KEY, SESSION_KEY } from '../api/client'
import type { CustomerSession, Session } from '../api/types'

/** A stored login that is still valid (the example's own expiry is only 12 h after it was generated). */
export const TECH_SESSION: Session = { ...loginResponse, token: 'test-token', expires_at: '2099-01-01T00:00:00Z' }

export function signIn(session: Session = TECH_SESSION) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

/** A logged-in customer (contract v2.4), stored apart from the technician login. */
export const CUSTOMER_SESSION: CustomerSession = { ...customerSession, token: 'customer-token', expires_at: '2099-01-01T00:00:00Z' }

export function signInCustomer(session: CustomerSession = CUSTOMER_SESSION) {
  sessionStorage.setItem(CUSTOMER_KEY, JSON.stringify(session))
}
