import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Listing, PassportEvent } from '../api/types'
import { Art, Chip } from '../design/Art'
import { formatPrice } from '../lib/format'
import { outcomeColours } from '../lib/outcomes'
import { useReducedMotion, useWide } from '../lib/useMediaQuery'
import { OutcomeBadge } from './OutcomeBadge'
import { SolidBadge } from './SolidBadge'
import { container } from './ui'

const RULE_MS = 2800
const CHECK_MS = 900
/** The card of the active step wears a tangerine ring. */
const RING_ON = '0 0 0 3px var(--color-cta), 0 22px 34px -20px rgba(30,59,44,.6)'
const RING_OFF = '0 1px 0 rgba(30,59,44,.06), 0 16px 28px -20px rgba(30,59,44,.5)'
const SPRING = 'cubic-bezier(.34,1.56,.64,1)'

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
  { id: 'GPU-SRV-001', outcome: 'REDEPLOY', low: 120, high: 410, note: 'whole range above zero → Redeploy' },
  { id: 'GPU-SRV-002', outcome: 'KEEP', low: -620, high: -180, note: 'whole range below zero → Keep' },
  { id: 'GPU-SRV-006', outcome: 'UNCERTAIN', low: -500, high: 150, note: 'crosses zero → a person decides' },
] as const
const AXIS_FROM = -700
const AXIS_TO = 500
const onAxis = (value: number) => `${(((value - AXIS_FROM) / (AXIS_TO - AXIS_FROM)) * 100).toFixed(2)}%`

function useInterval(ms: number, run: () => void, enabled: boolean) {
  const latest = useRef(run)
  latest.current = run
  useEffect(() => {
    if (!enabled) return
    const timer = setInterval(() => latest.current(), ms)
    return () => clearInterval(timer)
  }, [ms, enabled])
}

const stationLabel =
  'absolute top-1 rounded-[9px] border-[1.5px] border-ink bg-[#FFFCF5] px-2.5 py-1.5 text-xs leading-none font-extrabold tracking-[.12em] text-cta-ink'

interface HowItWorksProps {
  /** Newest events of the live device (step 1 draws its last three blocks). */
  events: PassportEvent[]
  /** A released device (step 3); null when nothing is listed. */
  listing: Listing | null
}

/**
 * "01 · HOW IT WORKS". On a wide screen the section is pinned while you scroll: a server rolls along a conveyor from
 * station to station (recompute-motion.js, data-scene="journey") and the active card lights up. On a phone, or for a
 * visitor who asked for less motion, it is three plain cards in a column.
 */
export function HowItWorks({ events, listing }: HowItWorksProps) {
  const wide = useWide()
  const reduced = useReducedMotion()
  const sticky = wide && !reduced
  const [step, setStep] = useState(0)
  const [ruleIndex, setRuleIndex] = useState(0)
  useInterval(RULE_MS, () => setRuleIndex((n) => (n + 1) % RULES.length), !reduced)

  // The conveyor reports the active step while scrolling.
  useEffect(() => {
    const onStep = (event: CustomEvent<number>) => setStep(event.detail)
    document.addEventListener('rc:step', onStep)
    return () => document.removeEventListener('rc:step', onStep)
  }, [])

  const pick = (i: number) => {
    if (window.RCMotion?.full()) window.RCMotion.go('#how', i)
    setStep(i)
  }
  const figures = [<ChainFigure key="chain" events={events} />, <RuleFigure key="rule" index={ruleIndex} />, <ReleaseFigure key="release" listing={listing} />]
  const tilt = ['-.8deg', '.6deg', '-.4deg']

  return (
    <section
      id="how"
      aria-labelledby="how-h"
      data-scene="journey"
      data-mode={sticky ? 'sticky' : 'flow'}
      data-path-style={wide ? 'none' : 'dots'}
      className="relative"
      style={{ minHeight: sticky ? '250vh' : undefined }}
    >
      <div className={`${container} sticky top-[72px] pt-[clamp(40px,6vw,64px)] pb-10`}>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div data-reveal="1" className="flex flex-col gap-2.5">
            <span className="rc-eyebrow text-accent">01 · HOW IT WORKS</span>
            <h2 id="how-h" className="text-[clamp(38px,5vw,60px)] leading-[.95] font-extrabold tracking-[-.02em]">
              How ReCompute works
            </h2>
          </div>
          <div role="group" aria-label="Steps" className="flex gap-1 rounded-[18px] bg-surface p-[5px] shadow-[0_10px_22px_-16px_rgba(30,59,44,.5)]">
            {STEPS.map((s, i) => (
              <button
                key={s.short}
                type="button"
                aria-pressed={step === i}
                onClick={() => pick(i)}
                className={`rounded-[13px] px-4 py-[11px] text-[15px] leading-none font-bold transition-[scale,background-color] duration-200 ease-spring active:scale-95 ${
                  step === i ? 'bg-ink text-surface' : 'text-ink'
                }`}
              >
                {s.short}
              </button>
            ))}
          </div>
        </div>

        <div data-journey-track="1" className="relative mt-[clamp(20px,3vw,32px)]">
          <div data-path-layer="1" className="pointer-events-none absolute inset-0 z-[1]" />
          {wide && <Conveyor />}
          <Traveler wide={wide} />
          <ol
            aria-label="How ReCompute works"
            className="relative z-[2] grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-[22px]"
            style={{ marginLeft: wide ? 0 : 48 }}
          >
            {STEPS.map((s, i) => (
              <li
                key={s.short}
                data-step-card={i}
                className="relative flex flex-col gap-3.5 rounded-[24px] bg-surface p-5"
                style={{
                  boxShadow: step === i ? RING_ON : RING_OFF,
                  rotate: tilt[i],
                  transition: `opacity 450ms ease, translate 600ms ${SPRING}, box-shadow 250ms ease`,
                }}
              >
                {!wide && (
                  <span
                    data-station={i}
                    aria-hidden
                    className="rc-hand absolute top-[40%] -left-10 grid size-7 place-items-center rounded-full border-2 border-ink bg-surface text-base leading-none"
                  >
                    {i + 1}
                  </span>
                )}
                {figures[i]}
                <span className="rc-hand text-xl leading-none">0{i + 1}</span>
                <h3 className="-mt-2 text-2xl leading-[1.1] font-extrabold">{s.title}</h3>
                <p className="text-[15.5px] leading-[1.55] font-medium text-pretty text-ink-2">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/** The three stations on the belt (wide screens): a label and a small illustration for each. */
function Conveyor() {
  return (
    <div className="relative mb-[22px] grid h-[178px] grid-cols-3 gap-x-[22px]" aria-hidden>
      <div
        className="absolute -right-[1%] -left-[1%] bottom-0 h-[52px] rounded-[26px]"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, #A3B2AB 0 7px, #66786F 7px 9px, transparent 10px) 0 50% / 46px 100% repeat-x, #2E3E37',
          boxShadow: 'inset 0 -7px 0 rgba(0,0,0,.25), 0 14px 20px -14px rgba(30,59,44,.7)',
        }}
      />
      <div className="relative">
        <span className={`${stationLabel} left-0 -rotate-3`}>01 · PASSPORT</span>
        <Art name="passport" float={5} className="absolute top-0 right-[4%] w-16" style={{ aspectRatio: '150 / 170' }} />
        <div data-station="0" className="absolute bottom-[52px] left-1/2 size-0.5" />
      </div>
      <div className="relative">
        <span className={`${stationLabel} left-0 rotate-2`}>02 · DECISION</span>
        <Chip pose="magnify" anim={['magnify', 'blink']} className="absolute -top-3.5 right-0 w-24" style={{ aspectRatio: '204 / 214' }} />
        <div data-station="1" className="absolute bottom-[52px] left-1/2 size-0.5" />
      </div>
      <div className="relative">
        <span className={`${stationLabel} left-0 -rotate-2`}>03 · SECOND LIFE</span>
        <Art name="box" variant="open" float={4} className="absolute top-1.5 right-[2%] w-[88px]" style={{ aspectRatio: '160 / 140' }} />
        <div data-station="2" className="absolute bottom-[52px] left-1/2 size-0.5" />
      </div>
    </div>
  )
}

const stateStyle = (extra: CSSProperties): CSSProperties => ({
  opacity: 0,
  transform: 'scale(.6)',
  transition: `opacity 400ms ease, transform 600ms ${SPRING}`,
  ...extra,
})

/** The server that rides the conveyor. recompute-motion.js moves it and switches its props by the active step (data-state). */
function Traveler({ wide }: { wide: boolean }) {
  return (
    <div
      data-traveler="1"
      data-anchor={wide ? 'bottom' : 'center'}
      aria-hidden
      className="pointer-events-none absolute top-0 left-0 z-[3] will-change-transform"
      style={{ width: wide ? 150 : 62, aspectRatio: '290 / 114', opacity: 0, visibility: 'hidden' }}
    >
      <div className="relative h-full w-full origin-bottom">
        <Art name="rack" variant="gpu" className="absolute inset-0" />
        <Art
          name="dust"
          data={{ state: '0 1' }}
          className="absolute inset-0"
          style={{ transition: `opacity 500ms ease, transform 500ms ${SPRING}` }}
        />
        <Art
          name="passport"
          data={{ state: '0 1 2' }}
          className="absolute"
          style={{ left: '-8%', top: '-36%', width: '22%', aspectRatio: '150 / 170', transformOrigin: '50% 0', transition: `opacity 400ms ease, transform 600ms ${SPRING}` }}
        />
        <Art name="magnifier" data={{ state: '1' }} className="absolute" style={stateStyle({ left: '34%', top: '-60%', width: '34%', aspectRatio: '1' })} />
        <Art name="shield" data={{ state: '2' }} className="absolute" style={stateStyle({ right: '-6%', top: '-62%', width: '26%', aspectRatio: '130 / 152' })} />
        <Art name="qr" data={{ state: '2' }} className="absolute" style={stateStyle({ left: '16%', top: '-44%', width: '20%', aspectRatio: '110 / 114' })} />
        <Art name="sparkle" data={{ state: '2' }} className="absolute" style={stateStyle({ left: 0, right: 0, top: '-30%', height: '60%' })} />
      </div>
    </div>
  )
}

const figureBox = 'relative flex min-h-[120px] rounded-2xl bg-sunken'

/** The last three real events of the live device as hash-linked blocks; the newest is filled. */
function ChainFigure({ events }: { events: PassportEvent[] }) {
  const blocks = [...events].sort((a, b) => a.id - b.id).slice(-3)
  if (blocks.length === 0) {
    return <div className={`${figureBox} items-center justify-center font-mono text-xs text-ink-2`}>No events yet</div>
  }
  return (
    <div aria-hidden data-stagger="1" className={`${figureBox} flex-wrap items-center justify-center gap-1.5 px-2.5 py-4`}>
      {blocks.map((event, i) => {
        const newest = i === blocks.length - 1
        return (
          <div key={event.id} className="flex items-center gap-1.5">
            <span
              className={`rounded-[10px] border-[1.5px] px-2.5 py-2 text-center font-mono text-[13px] leading-[1.3] font-bold ${
                newest ? 'rotate-2 border-ink bg-[#9CC9A9] text-cta-ink' : 'border-line-mid bg-surface'
              }`}
            >
              #{event.id}
              <br />
              <span className={`font-normal ${newest ? '' : 'text-ink-2'}`}>{event.hash?.slice(0, 6) ?? '—'}</span>
            </span>
            {!newest && <span className="h-[3px] w-3.5 rounded-sm bg-copper" />}
          </div>
        )
      })}
    </div>
  )
}

/** How the rule reads a range against zero (illustrative sample ranges), with Chip pointing at the verdict. */
function RuleFigure({ index }: { index: number }) {
  const rule = RULES[index]
  const colours = outcomeColours(rule.outcome)
  const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`).replace('-', '−')
  return (
    <div aria-hidden data-draw="1" className={`${figureBox} flex-col gap-3 px-4 py-3.5`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[13px] font-bold">{rule.id}</span>
        <OutcomeBadge outcome={rule.outcome} />
      </div>
      <div className="relative mr-11 h-4 rounded-lg bg-surface">
        <div
          data-bar="1"
          className="absolute inset-y-0.5 origin-left rounded-md transition-[left,width,background-color] duration-700 ease-draw"
          style={{ left: onAxis(rule.low), width: `calc(${onAxis(rule.high)} - ${onAxis(rule.low)})`, background: colours.dot }}
        />
        <div className="absolute -inset-y-1.5 w-[3px] rounded-sm bg-ink" style={{ left: onAxis(0) }} />
      </div>
      <div className="mr-11 flex justify-between font-mono text-xs text-ink-2">
        <span>
          {signed(rule.low)} … {signed(rule.high)}
        </span>
        <span>0 = break-even</span>
      </div>
      <span className="rc-hand text-lg leading-[1.1] -rotate-[1.5deg]">{rule.note}</span>
      <Chip pose="point" anim={['point']} className="absolute -right-3.5 -bottom-[18px] w-[58px] -scale-x-100" style={{ aspectRatio: '204 / 214' }} />
    </div>
  )
}

/** A released device with what its listing record shows: wipe, reliability check, passport. */
function ReleaseFigure({ listing }: { listing: Listing | null }) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(3)
  useInterval(CHECK_MS, () => setShown((n) => (n + 1) % 4), !reduced)
  if (!listing) {
    return <div className={`${figureBox} items-center justify-center font-mono text-xs text-ink-2`}>No device is listed right now</div>
  }
  const checks = [
    { ok: listing.wiped_at !== null, yes: 'Data wiped', no: 'No data wipe recorded' },
    { ok: listing.reliability_ok, yes: 'Reliability check passed', no: 'Reliability check failed' },
    { ok: true, yes: 'Passport attached', no: '' },
  ]
  return (
    <div aria-hidden className={`${figureBox} items-center gap-3 p-3`}>
      <div className="flex min-w-0 flex-1 -rotate-[1.5deg] flex-col gap-1.5 rounded-xl bg-surface p-3 shadow-[0_8px_16px_-12px_rgba(30,59,44,.6)]">
        <div className="flex items-center justify-between gap-1.5">
          <span className="font-mono text-xs leading-none font-bold">{listing.device_id}</span>
          <SolidBadge outcome={listing.latest_outcome} />
        </div>
        <span className="font-display text-[19px] leading-none font-extrabold tabular-nums">{formatPrice(listing.price)}</span>
        {checks.map((check, i) => {
          const visible = shown === 0 || i < shown
          return (
            <span
              key={check.yes}
              className="text-[12.5px] leading-[1.3] font-semibold transition-[opacity,translate] duration-400"
              style={{ opacity: visible ? 1 : 0.15, translate: visible ? '0' : '-6px 0' }}
            >
              <b className={check.ok ? 'text-ok' : 'text-danger'}>{check.ok ? '✓' : '✘'}</b> {check.ok ? check.yes : check.no}
            </span>
          )
        })}
      </div>
      <Art name="qr" seed={12} wiggle className="w-[62px] flex-none rotate-[5deg]" style={{ aspectRatio: '110 / 114' }} />
    </div>
  )
}
