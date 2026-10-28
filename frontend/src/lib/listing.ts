import type { PassportEvent } from '../api/types'

/** The device's 'list' event if its newest listing event is a 'list' (it is for sale now), else null. */
export function currentListing(events: PassportEvent[]): PassportEvent | null {
  const newest = events
    .filter((event) => event.kind === 'list' || event.kind === 'unlist')
    .reduce<PassportEvent | null>((latest, event) => (!latest || event.id > latest.id ? event : latest), null)
  return newest?.kind === 'list' ? newest : null
}

/** The API refuses a listing until the passport holds a wipe event. */
export const hasWipe = (events: PassportEvent[]): boolean => events.some((event) => event.kind === 'wipe')
