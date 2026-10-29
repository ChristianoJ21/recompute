/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import html from '../../index.html?raw'
import { outcomeColours } from '../lib/outcomes'

// Vitest stubs CSS imports (even ?raw), so the stylesheet is read from disk; npm test runs in frontend/.
const css = readFileSync('src/index.css', 'utf8')

// Clay redesign (Claude Design, 30 Oct): mint paper, forest ink, cardboard band, copper notes, tangerine buttons.
type Tokens = Record<string, string>

const between = (start: string, end: string) => css.slice(css.indexOf(start), css.indexOf(end))
const tokens = (text: string): Tokens =>
  Object.fromEntries([...text.matchAll(/--color-([\w-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)].map(([, name, hex]) => [name, hex.toUpperCase()]))

const LIGHT = tokens(between('@theme {', '[data-theme="dark"] {'))
const DARK = { ...LIGHT, ...tokens(between('[data-theme="dark"] {', '@layer base')) }

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => v / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const hue = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  if (d === 0) return NaN
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}
/** A green: hue between yellow-green and teal-green. */
const isGreen = (hex: string) => hue(hex) >= 75 && hue(hex) <= 165
/** A near-neutral with a green cast: the green channel leads. */
const greenTinted = (hex: string) => {
  const [r, g, b] = rgb(hex)
  return g > r && g >= b
}

const THEMES: [string, Tokens][] = [
  ['light', LIGHT],
  ['dark', DARK],
]
const TEXT = ['ink', 'ink-2', 'ink-3', 'accent', 'ok', 'danger', 'not-evaluated']
const OUTCOME_TONES = ['keep', 'upgrade', 'redeploy', 'recycle', 'uncertain', 'insufficient']
const SURFACES = ['page', 'surface', 'raised']

describe('clay palette (Claude Design redesign)', () => {
  it('is mint paper with cream cards and forest ink in the light theme', () => {
    expect(LIGHT.page).toBe('#F1F7F2')
    expect(LIGHT.surface).toBe('#FFFCF5')
    expect(LIGHT.ink).toBe('#1E3B2C')
    expect(LIGHT.band).toBe('#E9D7B7')
    expect(isGreen(LIGHT.accent), LIGHT.accent).toBe(true)
    expect(greenTinted(LIGHT.page), LIGHT.page).toBe(true)
    expect(luminance(LIGHT.ink)).toBeLessThan(0.05)
  })

  it('keeps tangerine for buttons and the SAMPLE DATA sticker, always with forest ink on it', () => {
    expect(LIGHT.cta).toBe('#FF7A33')
    expect(LIGHT.sample).toBe(LIGHT.cta)
    expect(LIGHT['cta-ink']).toBe(LIGHT.ink)
    expect(contrast(LIGHT['cta-ink'], LIGHT.cta)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(LIGHT['sample-ink'], LIGHT.sample)).toBeGreaterThanOrEqual(4.5)
    // The same in the dark theme: the button does not change with the page.
    expect(DARK.cta).toBe(LIGHT.cta)
    expect(DARK.sample).toBe(LIGHT.sample)
  })

  it('keeps dark mode forest-tinted with a soft green accent', () => {
    for (const name of ['page', 'surface', 'raised', 'sunken', 'line']) expect(greenTinted(DARK[name]), `${name} ${DARK[name]}`).toBe(true)
    expect(isGreen(DARK.accent), DARK.accent).toBe(true)
    expect(luminance(DARK.page)).toBeLessThan(0.04)
  })

  it('keeps text at 4.5:1 or more on every surface in both themes', () => {
    for (const [theme, t] of THEMES) {
      for (const fg of [...TEXT, ...OUTCOME_TONES]) {
        for (const bg of SURFACES) expect(contrast(t[fg], t[bg]), `${theme}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
      }
      // The soft panels (stat tiles, event rows) hold the main text, labels and the accent.
      for (const fg of ['ink', 'ink-2', 'accent']) expect(contrast(t[fg], t.sunken), `${theme}: ${fg} on sunken`).toBeGreaterThanOrEqual(4.5)
      for (const tone of [...OUTCOME_TONES, 'ok']) {
        expect(contrast(t[tone], t[`${tone}-bg`]), `${theme}: ${tone} on its tint`).toBeGreaterThanOrEqual(4.5)
      }
      // Outcome stickers print the word in forest ink on the tint.
      for (const tone of OUTCOME_TONES) expect(contrast(t.ink, t[`${tone}-bg`]), `${theme}: ink on ${tone} sticker`).toBeGreaterThanOrEqual(4.5)
      // The cardboard band behind the hardware section.
      for (const fg of ['ink', 'redeploy']) expect(contrast(t[fg], t.band), `${theme}: ${fg} on band`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps the forest strips (footer, toasts, session bar) readable in both themes', () => {
    for (const [theme, t] of THEMES) {
      for (const fg of ['forest-fg', 'forest-fg2', 'forest-fg3', 'forest-accent']) {
        expect(contrast(t[fg], t.forest), `${theme}: ${fg} on forest`).toBeGreaterThanOrEqual(4.5)
      }
      for (const fg of ['bar-fg', 'bar-fg2', 'bar-fg3', 'sample']) expect(contrast(t[fg], t.bar), `${theme}: ${fg} on bar`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('gives every outcome its own tint, and KEEP its own green clearly apart from the accent', () => {
    expect(outcomeColours('KEEP')).toEqual({
      fg: 'var(--color-keep)',
      bg: 'var(--color-keep-bg)',
      line: 'var(--color-keep-line)',
      dot: 'var(--color-keep-dot)',
    })
    for (const [theme, t] of THEMES) {
      expect(new Set(OUTCOME_TONES.map((tone) => t[`${tone}-bg`])).size, `${theme}: outcome tints`).toBe(OUTCOME_TONES.length)
      expect(isGreen(t.keep), `${theme} keep ${t.keep}`).toBe(true)
      expect(Math.abs(hue(t.keep) - hue(t.accent)), `${theme}: keep ${t.keep} vs accent ${t.accent}`).toBeGreaterThanOrEqual(30)
    }
  })

  it('paints the browser bar in the colour of the paper', () => {
    expect(html).toContain(`<meta name="theme-color" content="${LIGHT.page}" />`)
  })

  it('runs offline: the fonts and the paper grain are bundled, nothing is fetched from a font service', () => {
    for (const font of ['@fontsource/baloo-2', '@fontsource-variable/figtree', '@fontsource/gochi-hand']) expect(css).toContain(font)
    expect(css).toContain('./design/grain.png')
    expect(css).not.toMatch(/https?:\/\//)
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/)
  })

  it('leaves none of the old design in the pages or components (Tailwind would silently drop an unknown class)', () => {
    const sources = import.meta.glob(['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!../design/**'], {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
    // Tokens and helpers of the white + green design that no longer exist: night bands, blueprint grid, photo bands, glow animations.
    const old =
      /\bnight-|bg-night|text-night|bg-blueprint|nightButton|nightGhostButton|NightBackdrop|BandPhoto|CardPhoto|shadow-hero-card|text-code-fg|text-on-ink-2|data-band|data-theme="dark"|animate-(rise|drift|glow|glow-slow|sweep|marquee|flow-x|flow-y|scan|shift)\b/
    expect(Object.keys(sources).length).toBeGreaterThan(20)
    for (const [file, text] of Object.entries({ ...sources, 'index.html': html })) {
      expect(text.match(old)?.[0], file).toBeUndefined()
    }
  })
})
