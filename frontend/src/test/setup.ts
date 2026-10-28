import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom has no matchMedia. Tests run as a light-themed device that asked for reduced motion,
// so animated states (passport verification, net-saving bar) show their final state at once.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query.includes('reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
})

// Testing Library only cleans up on its own when Vitest globals are enabled; they are not here.
afterEach(() => {
  cleanup()
  sessionStorage.clear()
})
