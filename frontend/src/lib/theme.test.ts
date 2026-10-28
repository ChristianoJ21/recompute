import { afterEach, describe, expect, it, vi } from 'vitest'
import { THEME_KEY, applyTheme, readTheme, setTheme } from './theme'

const darkDevice = (dark: boolean) =>
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches: dark && query.includes('dark'), media: query }) as MediaQueryList,
  )

describe('theme preference', () => {
  afterEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    vi.restoreAllMocks()
  })

  it('defaults to light and ignores values it does not know', () => {
    expect(readTheme()).toBe('light')
    localStorage.setItem(THEME_KEY, 'purple')
    expect(readTheme()).toBe('light')
  })

  it('stores the choice in localStorage and themes the page at once', () => {
    setTheme('dark')

    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(readTheme()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('follows the device when set to match it', () => {
    darkDevice(true)
    applyTheme('system')
    expect(document.documentElement.dataset.theme).toBe('dark')

    darkDevice(false)
    applyTheme('system')
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
