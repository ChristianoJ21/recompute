// Types for recompute-art.js (the clay SVG library from Claude Design). The file sets window.RCArt when imported.
export {}

declare global {
  interface Window {
    RCArt?: {
      /** The SVG markup of one asset, e.g. svg('chip', { pose: 'wave' }). */
      svg(name: string, options?: Record<string, string | undefined>): string
      names: string[]
      C: Record<string, string>
    }
  }
}
