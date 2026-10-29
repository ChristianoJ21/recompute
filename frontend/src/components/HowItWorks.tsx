import { useEffect, useRef, useState } from 'react'
import type { Listing, PassportEvent } from '../api/types'
import { formatPrice } from '../lib/format'
import { outcomeColours } from '../lib/outcomes'
import { prefersReducedMotion } from '../lib/theme'
import { SolidBadge } from './SolidBadge'
import { SectionTitle, container } from './ui'

const STEP_MS = 4200
const PAUSE_AFTER_PICK_MS = 12000
const RULE_MS = 2800

const STEPS = [
  {
    short: 'Passport',
    title: 'A passport for every device',
    text: "Each scan, repair, wipe or reading is appended to the device's history and linked by hash to the event before it, so any later change is detected.",
  },
  {
    short: 'Decision',
    title: 'A rule picks its next life',
    text: 'It compares the emissions a newer device would save with the emissions of making it, as a range. If the range sits on one side of zero it recommends Keep, Upgrade, Redeploy or Recycle; if it crosses zero, a person decides.',
  },
  {
    short: 'Second life',
    title: 'Released with its passport',
    text: 'Released devices are listed below with their passport and data-wipe record. The QR label on each device opens it. Buyers e-mail the data centre; there is no shop or checkout.',
  },
] as const

// Step 2 is a drawing of how the rule reads a range, with illustrative sample ranges (kg CO₂e).
const RULES = [
  { id: 'GPU-SRV-001', outcome: 'REDEPLOY', low: 120, high: 410 },
  { id: 'GPU-SRV-002', outcome: 'KEEP', low: -620, high: -180 },
  { id: 'GPU-SRV-006', outcome: 'UNCERTAIN', low: -500, high: 150 },
] as const
const AXIS_FROM = -700
const AXIS_TO = 500
const onAxis = (value: number) => `${(((value - AXIS_FROM) / (AXIS_TO - AXIS_FROM)) * 100).toFixed(2)}%`

function useInterval(ms: number, run: () => void) {
  const latest = useRef(run)
  latest.current = run
  useEffect(() => {
    if (prefersReducedMotion()) return
    const timer = setInterval(() => latest.current(), ms)
    return () => clearInterval(timer)
  }, [ms])
}

interface HowItWorksProps {
  /** Newest events of the live device (step 1 draws its last three blocks). */
  events: PassportEvent[]
  /** A released device (step 3); null when nothing is listed. */
  listing: Listing | null
}

/** "01 · HOW IT WORKS": three cards that take turns; hovering or picking a step holds it for a while. */
export function HowItWorks({ events, listing }: HowItWorksProps) {
  const [step, setStep] = useState(0)
  const [ruleIndex, setRuleIndex] = useState(0)
  const pausedUntil = useRef(0)
  useInterval(STEP_MS, () => {
    if (Date.now() > pausedUntil.current) setStep((n) => (n + 1) % STEPS.length)
  })
  useInterval(RULE_MS, () => setRuleIndex((n) => (n + 1) % RULES.length))
  const pick = (i: number) => {
    pausedUntil.current = Date.now() + PAUSE_AFTER_PICK_MS
    setStep(i)
  }
  const figures = [<ChainFigure key="chain" events={events} />, <RuleFigure key="rule" index={ruleIndex} />, <ReleaseFigure key="release" listing={listing} />]

  return (
    <section id="how" aria-labelledby="how-h" className="scroll-mt-20 bg-blueprint py-[clamp(56px,7vw,112px)]">
      <div className={`${container} flex flex-col gap-[clamp(28px,3vw,48px)]`}>
        <SectionTitle eyebrow="01 · HOW IT WORKS" title="How ReCompute works" id="how-h">
          <div role="group" aria-label="Steps" className="flex gap-1.5 rounded-full border border-line bg-surface p-[5px] shadow-panel">
            {STEPS.map((s, i) => (
              <button
                key={s.short}
                type="button"
                aria-pressed={step === i}
                onClick={() => pick(i)}
                className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-colors duration-200 ${
                  step === i ? 'bg-ink text-surface' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {s.short}
              </button>
            ))}
          </div>
        </SectionTitle>
        <ol aria-label="How ReCompute works" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-[clamp(16px,2vw,28px)]">
          {STEPS.map((s, i) => {
            const on = step === i
            return (
              <li
                key={s.short}
                onMouseEnter={() => pick(i)}
                className={`relative flex flex-col overflow-hidden rounded-[20px] border bg-surface transition-[translate,box-shadow,border-color] duration-400 ease-[cubic-bezier(.2,.8,.2,1)] ${
                  on ? '-translate-y-1.5 border-accent shadow-[0_2px_4px_rgba(14,17,22,.06),0_30px_60px_-24px_color-mix(in_srgb,var(--color-accent)_45%,transparent)]' : 'border-line shadow-panel'
                }`}
              >
                <div className="h-[3px] bg-sunken">
                  <div
                    className="h-full bg-accent"
                    style={{ width: on ? '100%' : '0%', transition: on && !prefersReducedMotion() ? `width ${STEP_MS}ms linear` : 'none' }}
                  />
                </div>
                <div className="flex h-[190px] items-center justify-center border-b border-line bg-raised p-5">{figures[i]}</div>
                <div className="flex flex-col gap-2.5 px-6 pt-[22px] pb-[26px]">
                  <span className={`font-mono text-[13px] font-bold transition-colors ${on ? 'text-accent' : 'text-ink-3'}`}>0{i + 1}</span>
                  <h3 className="text-[22px] font-bold tracking-[-.02em]">{s.title}</h3>
                  <p className="text-[15px] text-pretty text-ink-2">{s.text}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/** The last three real events of the live device as hash-linked blocks; the newest is filled. */
function ChainFigure({ events }: { events: PassportEvent[] }) {
  const blocks = [...events].sort((a, b) => a.id - b.id).slice(-3)
  if (blocks.length === 0) return <span className="font-mono text-xs text-ink-2">No events yet</span>
  return (
    <div aria-hidden className="flex w-full max-w-[320px] items-center">
      {blocks.map((event, i) => {
        const newest = i === blocks.length - 1
        return (
          <div key={event.id} className="flex min-w-0 flex-1 items-center">
            <div
              className={`min-w-0 flex-1 rounded-[10px] border-[1.5px] px-2 py-2.5 text-center font-mono text-[11px] leading-[1.4] transition-all duration-500 ${
                newest ? 'border-accent bg-accent text-surface' : 'border-line-strong bg-surface text-ink'
              }`}
            >
              <strong className="block text-[13px]">#{event.id}</strong>
              {event.hash?.slice(0, 6) ?? '—'}
            </div>
            {!newest && <span className="h-0.5 w-3.5 shrink-0 bg-line-strong" />}
          </div>
        )
      })}
    </div>
  )
}

/** How the rule reads a range against zero (illustrative sample ranges). */
function RuleFigure({ index }: { index: number }) {
  const rule = RULES[index]
  const colours = outcomeColours(rule.outcome)
  const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`).replace('-', '−')
  return (
    <div aria-hidden className="flex w-full max-w-[320px] flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold">{rule.id}</span>
        <span
          className="rounded-full border px-2.5 py-[3px] font-mono text-[11px] font-bold tracking-[.06em] transition-colors duration-400"
          style={{ background: colours.bg, color: colours.fg, borderColor: colours.fg }}
        >
          {rule.outcome}
        </span>
      </div>
      <div className="relative h-[34px]">
        <div className="absolute inset-x-0 top-[15px] h-1 rounded bg-sunken" />
        <div
          className="absolute top-[9px] h-4 rounded-full opacity-90 transition-[left,width,background-color] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{ left: onAxis(rule.low), width: `calc(${onAxis(rule.high)} - ${onAxis(rule.low)})`, background: colours.fg }}
        />
        <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: onAxis(0) }} />
      </div>
      <div className="flex justify-between font-mono text-[11px] text-ink-2">
        <span>
          {signed(rule.low)} … {signed(rule.high)}
        </span>
        <span>0 = break-even</span>
      </div>
    </div>
  )
}

/** A released device with what its listing record shows: wipe, reliability check, passport. */
function ReleaseFigure({ listing }: { listing: Listing | null }) {
  const [shown, setShown] = useState(3)
  useInterval(900, () => setShown((n) => (n + 1) % 4))
  if (!listing) return <span className="font-mono text-xs text-ink-2">No device is listed right now</span>
  const checks = [
    { ok: listing.wiped_at !== null, yes: 'Data wiped', no: 'No data wipe recorded' },
    { ok: listing.reliability_ok, yes: 'Reliability check passed', no: 'Reliability check failed' },
    { ok: true, yes: 'Passport attached', no: '' },
  ]
  return (
    <div aria-hidden className="flex w-full max-w-[300px] flex-col gap-2.5 rounded-[14px] border border-line bg-surface px-4 py-3.5 shadow-panel">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-bold">{listing.device_id}</span>
        <SolidBadge outcome={listing.latest_outcome} />
      </div>
      <span className="text-[22px] font-[750] tracking-[-.02em] tabular-nums">{formatPrice(listing.price)}</span>
      {checks.map((check, i) => {
        const visible = shown === 0 || i < shown
        return (
          <div
            key={check.yes}
            className="flex items-center gap-2 text-[13px] transition-[opacity,translate] duration-400"
            style={{ opacity: visible ? 1 : 0.15, translate: visible ? '0' : '-6px 0' }}
          >
            <span className={`flex size-4 items-center justify-center rounded-[5px] text-[10px] text-surface ${check.ok ? 'bg-ok' : 'bg-danger'}`}>
              {check.ok ? '✔' : '✘'}
            </span>
            {check.ok ? check.yes : check.no}
          </div>
        )
      })}
    </div>
  )
}
