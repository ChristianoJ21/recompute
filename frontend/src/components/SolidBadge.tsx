import type { Outcome } from '../api/types'
import { OutcomeBadge } from './OutcomeBadge'

/** The outcome sticker on listing cards and fleet rows (stuck on a little crooked); the word is always shown, never colour alone. */
export function SolidBadge({ outcome }: { outcome: Outcome | null }) {
  return <OutcomeBadge outcome={outcome} tilt />
}
