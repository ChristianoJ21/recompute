import { useSyncExternalStore } from 'react'

// Appearance is a per-browser convenience, so it lives in localStorage (unlike the login, which is in
// sessionStorage). index.html applies the same rule in an inline script before the first paint.
export const THEME_KEY = 'rc-theme'
export const THEMES = ['light', 'dark', 'system'] as const
export type Theme = (typeof THEMES)[number]

export const THEME_LABEL: Record<Theme, string> = { light: 'Light', dark: 'Dark', system: 'Match device' }

const listeners = new Set<() => void>()

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    return (THEMES as readonly string[]).includes(stored ?? '') ? (stored as Theme) : 'light'
  } catch {
    return 'light' // storage blocked: the page still renders, in the default theme
  }
}

const deviceIsDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

/** Sets data-theme on <html>; the colour tokens in index.css switch on it. */
export function applyTheme(theme: Theme): void {
  const dark = theme === 'dark' || (theme === 'system' && deviceIsDark())
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Not saved, but still applied for this page view.
  }
  applyTheme(theme)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  // "Match device" follows the phone or laptop when its setting changes while the page is open.
  const media = window.matchMedia?.('(prefers-color-scheme: dark)')
  const onDeviceChange = () => {
    if (readTheme() === 'system') applyTheme('system')
  }
  media?.addEventListener?.('change', onDeviceChange)
  return () => {
    listeners.delete(listener)
    media?.removeEventListener?.('change', onDeviceChange)
  }
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme)
}

/** True when the visitor asked for less motion; animations then show their final state at once. */
export const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
