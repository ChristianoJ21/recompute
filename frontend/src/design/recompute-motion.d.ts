// Types for recompute-motion.js (the motion engine from Claude Design). The file sets window.RCMotion when imported.
export {}

declare global {
  interface Window {
    RCMotion?: {
      setMode(mode: 'system' | 'full' | 'reduced' | 'off'): void
      level(): 'full' | 'reduced' | 'off'
      /** True when motion is fully on (not reduced, not off). */
      full(): boolean
      /** Scrolls the pinned "journey" section at `selector` to step `index`. */
      go(selector: string, index: number): void
      /** The spring easing (a CSS linear() curve, or a cubic-bezier fallback) used for the squish and bounce. */
      SPRING: string
    }
  }

  interface DocumentEventMap {
    /** Fired by the journey scene while scrolling: detail is the active step (0-based). */
    'rc:step': CustomEvent<number>
  }
}
