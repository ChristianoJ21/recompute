import { useEffect, useState } from 'react'
import { verifyEvents } from '../api/client'
import type { ChainCheck, PassportEvent } from '../api/types'
import type { Integrity } from '../components/IntegrityBadge'
import { prefersReducedMotion } from './theme'

const STEP_MS = 260

type Check = { status: 'checking' } | { status: 'done'; result: ChainCheck } | { status: 'unavailable' }

/** Per event: its link to the previous event was verified, is where the chain breaks, or is not known (yet). */
export type LinkState = 'verified' | 'bad' | null

export interface PassportCheck {
  integrity: Integrity
  linkState: (event: PassportEvent) => LinkState
  /** The API's explanation when the chain is broken. */
  reason: string | null
}

/**
 * Runs the real hash-chain check (GET /devices/{id}/events/verify) and, once the API says the chain is
 * valid, ticks the events off oldest to newest. "Passport intact" only shows after that answer; a broken
 * chain shows at once where it breaks. Nothing here is decided by the browser.
 */
export function usePassportCheck(deviceId: string, events: PassportEvent[]): PassportCheck {
  const oldestFirst = [...events].sort((a, b) => a.id - b.id)
  const headHash = oldestFirst.at(-1)?.hash ?? null
  const total = oldestFirst.length
  const [check, setCheck] = useState<Check>({ status: 'checking' })
  const [step, setStep] = useState(0)

  // Again whenever a new event arrives (the newest hash changes).
  useEffect(() => {
    let active = true
    setCheck({ status: 'checking' })
    verifyEvents(deviceId)
      .then((result) => {
        if (active) setCheck({ status: 'done', result })
      })
      .catch(() => {
        if (active) setCheck({ status: 'unavailable' })
      })
    return () => {
      active = false
    }
  }, [deviceId, headHash])

  const valid = check.status === 'done' && check.result.valid
  useEffect(() => {
    if (!valid) return
    if (prefersReducedMotion()) {
      setStep(total)
      return
    }
    setStep(0)
    const timer = setInterval(() => setStep((n) => Math.min(n + 1, total)), STEP_MS)
    return () => clearInterval(timer)
  }, [valid, total])

  if (check.status !== 'done') {
    return { integrity: check, linkState: () => null, reason: null }
  }
  const { result } = check
  if (result.valid) {
    const position = new Map(oldestFirst.map((event, i) => [event.id, i]))
    return {
      integrity: step >= total ? { status: 'intact' } : { status: 'checking' },
      linkState: (event) => ((position.get(event.id) ?? Infinity) < step ? 'verified' : null),
      reason: null,
    }
  }
  const bad = result.first_bad_event_id ?? -1
  return {
    integrity: { status: 'changed', eventId: result.first_bad_event_id },
    linkState: (event) => (event.id < bad ? 'verified' : event.id === bad ? 'bad' : null),
    reason: result.reason,
  }
}
