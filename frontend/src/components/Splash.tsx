import { useEffect, useLayoutEffect, useState } from 'react'
import { Chip } from '../design/Art'

const SHOW_MS = 1800
const FADE_MS = 430

/**
 * The first-visit splash: Chip at work on his laptop while the passports "check". It tells the hero scene when it is gone
 * (data-rc-splash on <html> and the rc:splashdone event), so the exploded-view animation starts after it, not behind it.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  // Before the first paint, so the motion engine sees "on" when it binds the hero scene.
  useLayoutEffect(() => {
    document.documentElement.dataset.rcSplash = 'on'
    return () => {
      document.documentElement.dataset.rcSplash = 'done'
      window.dispatchEvent(new Event('rc:splashdone'))
    }
  }, [])

  useEffect(() => {
    if (leaving) {
      const gone = setTimeout(onDone, FADE_MS)
      return () => clearTimeout(gone)
    }
    const timer = setTimeout(() => setLeaving(true), SHOW_MS)
    return () => clearTimeout(timer)
  }, [leaving, onDone])

  return (
    <div
      onClick={() => setLeaving(true)}
      className="fixed inset-0 z-[120] flex cursor-pointer flex-col items-center justify-center gap-3.5 bg-page transition-opacity duration-[420ms] ease-out"
      style={{ opacity: leaving ? 0 : 1 }}
    >
      <Chip pose="work" anim={['work', 'blink']} className="aspect-[280/214] w-[min(300px,70vw)]" />
      <span className="font-display text-[34px] leading-none font-extrabold tracking-[-.02em]">ReCompute</span>
      <span className="rc-hand text-[21px] leading-none">checking passports…</span>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onDone()
        }}
        className="absolute bottom-6 rounded-full px-4 py-2 text-sm font-semibold text-ink-2 underline underline-offset-[3px]"
      >
        Skip intro
      </button>
    </div>
  )
}
