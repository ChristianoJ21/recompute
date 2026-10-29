import { vi } from 'vitest'

/** setup.ts runs every test as a device that asked for reduced motion; this one allows motion. Restore it after use. */
export const allowMotion = () =>
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList,
  )
