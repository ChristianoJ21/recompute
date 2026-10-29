/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import html from '../../index.html?raw'
import { outcomeColours } from '../lib/outcomes'

// Vitest stubs CSS imports (even ?raw), so the stylesheet is read from disk; npm test runs in frontend/.
const css = readFileSync('src/index.css', 'utf8')

// A10 phase 1 (Panji, 30 Oct): white + green palette (essay Mode C, sustainability theme).
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

describe('white + green palette (A10 phase 1)', () => {
  it('uses white pages and a green accent in the light theme', () => {
    expect(LIGHT.page).toBe('#FFFFFF')
    expect(LIGHT.surface).toBe('#FFFFFF')
    expect(isGreen(LIGHT.accent), LIGHT.accent).toBe(true)
    expect(isGreen(LIGHT['accent-hover']), LIGHT['accent-hover']).toBe(true)
  })

  it('turns the dark hero bands, header, footer and menu a deep forest green', () => {
    for (const name of ['night', 'night-2', 'bar']) {
      expect(isGreen(LIGHT[name]), `${name} ${LIGHT[name]}`).toBe(true)
      expect(luminance(LIGHT[name]), name).toBeLessThan(0.04)
    }
    expect(isGreen(LIGHT['night-accent']), LIGHT['night-accent']).toBe(true)
  })

  it('keeps dark mode green-tinted with a soft green accent', () => {
    for (const name of ['page', 'surface', 'raised', 'sunken', 'line']) expect(greenTinted(DARK[name]), `${name} ${DARK[name]}`).toBe(true)
    expect(isGreen(DARK.accent), DARK.accent).toBe(true)
  })

  it('gives KEEP its own green, clearly apart from the accent in both themes', () => {
    expect(outcomeColours('KEEP')).toEqual({ fg: 'var(--color-keep)', bg: 'var(--color-keep-bg)', line: 'var(--color-keep-line)' })
    for (const [theme, t] of THEMES) {
      expect(isGreen(t.keep), `${theme} keep ${t.keep}`).toBe(true)
      expect(Math.abs(hue(t.keep) - hue(t.accent)), `${theme}: keep ${t.keep} vs accent ${t.accent}`).toBeGreaterThanOrEqual(30)
    }
  })

  it('keeps text at 4.5:1 or more on every surface in both themes', () => {
    for (const [theme, t] of THEMES) {
      for (const fg of [...TEXT, ...OUTCOME_TONES]) {
        for (const bg of SURFACES) expect(contrast(t[fg], t[bg]), `${theme}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
      }
      for (const tone of [...OUTCOME_TONES, 'ok']) {
        expect(contrast(t[tone], t[`${tone}-bg`]), `${theme}: ${tone} on its badge`).toBeGreaterThanOrEqual(4.5)
      }
    }
    for (const fg of ['night-fg', 'night-fg2', 'night-fg3', 'night-accent', 'night-ok']) {
      for (const bg of ['night', 'night-2']) expect(contrast(LIGHT[fg], LIGHT[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('paints the browser bar in the forest green of the header', () => {
    expect(html).toContain(`<meta name="theme-color" content="${LIGHT.night}" />`)
  })

  it('leaves none of the old blue and periwinkle literals in the pages, components or stylesheet', () => {
    const sources = import.meta.glob(['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!./**'], {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
    // The chart series are checked with the dataviz palette validator instead (see the comment in index.css).
    const stylesheet = css.replace(/--color-series-\d:[^;]*;/g, '')
    const old = /#2443C9|#16298A|#8EA2FF|#B5C2FF|#0B0D10|142,\s*162,\s*255|36,\s*67,\s*201/i
    // Purple and light-blue glows and gradients were decoration; as outcome colours they stay tokens in index.css.
    const decoration = /#C2A6F2|#79C4EC|91,\s*53,\s*151/i
    expect(Object.keys(sources).length).toBeGreaterThan(20)
    for (const [file, text] of Object.entries({ ...sources, 'index.html': html, 'index.css': stylesheet })) {
      expect(text.match(old)?.[0], file).toBeUndefined()
    }
    for (const [file, text] of Object.entries(sources)) expect(text.match(decoration)?.[0], file).toBeUndefined()
  })
})
