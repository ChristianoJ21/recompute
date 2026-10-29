// When the home intro plays: once per browser session, never for a visitor who asked for less motion.
import { prefersReducedMotion } from './theme'

const INTRO_KEY = 'rc-intro-seen'

export function shouldPlayIntro(): boolean {
  if (prefersReducedMotion()) return false
  try {
    return sessionStorage.getItem(INTRO_KEY) === null
  } catch {
    return false // storage blocked: it could not be remembered as seen, so it would replay on every visit
  }
}

export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO_KEY, '1')
  } catch {
    // Storage blocked: shouldPlayIntro() already answers false.
  }
}
