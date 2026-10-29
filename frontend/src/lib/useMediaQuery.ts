import { useSyncExternalStore } from 'react'

/** Follows a CSS media query, e.g. useMediaQuery('(min-width: 900px)'). False where matchMedia does not exist. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia?.(query)
      media?.addEventListener?.('change', onChange)
      return () => media?.removeEventListener?.('change', onChange)
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  )
}

/** Wide layout of the redesign: the pinned "how it works" conveyor and the full hero scene start here. */
export const useWide = () => useMediaQuery('(min-width: 900px)')

/** True when the visitor asked for less motion; the motion engine reads the same setting. */
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')
