import { useEffect, useState, type ReactNode } from 'react'
import { prefersReducedMotion } from '../lib/theme'
import { IntegrityBadge } from './IntegrityBadge'
import { OutcomeBadge } from './OutcomeBadge'
import { CornerMarks, panelClass } from './ui'

// FIG. 1 on the home page: passport -> decision -> second life. Every value here is an illustration
// (labelled SAMPLE DATA); the real checks happen on each passport page.
const TICK_MS = 2400
const EXAMPLES = [
  { id: 'GPU-SRV-002', outcome: 'KEEP', low: -620, high: -180 },
  { id: 'GPU-SRV-001', outcome: 'REDEPLOY', low: 120, high: 410 },
  { id: 'GPU-SRV-006', outcome: 'UNCERTAIN', low: -500, high: 150 },
] as const
const AXIS_FROM = -700
const AXIS_TO = 500
const onAxis = (value: number) => ((value - AXIS_FROM) / (AXIS_TO - AXIS_FROM)) * 100
const shortHash = (n: number) => ((Math.imul(n + 7, 2654435761) >>> 0).toString(16) + '0000').slice(0, 4)

// A 9×9 drawing of a QR label: three solid finder squares plus a fixed pattern. Not scannable.
const QR_CELLS = Array.from({ length: 81 }, (_, i) => {
  const [row, col] = [Math.floor(i / 9), i % 9]
  const finder = (row < 3 && (col < 3 || col > 5)) || (row > 5 && col < 3)
  return finder || (row * 7 + col * 3 + row * col) % 5 < 2
})

const mono = 'font-mono text-[11px] text-ink-2'
const insetFigure = 'relative h-[120px] overflow-hidden border border-dashed border-line-strong bg-raised p-3'

function useTick(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (prefersReducedMotion()) return
    const timer = setInterval(() => setTick((n) => n + 1), TICK_MS)
    return () => clearInterval(timer)
  }, [])
  return tick
}

export function Schematic() {
  const tick = useTick()
  return (
    <div className={`@container relative ${panelClass}`}>
      <CornerMarks />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-2.5 font-mono text-[11px] tracking-[.08em] text-ink-2">
        <span>
          <strong className="text-ink">FIG. 1</strong> · PASSPORT → DECISION → SECOND LIFE
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-[7px] animate-pulse-live bg-ok" />
          LIVE · SAMPLE DATA
        </span>
      </div>
      <ol
        aria-label="How ReCompute works"
        className="m-0 grid list-none grid-cols-1 gap-14 p-[clamp(20px,3cqi,32px)] @min-[860px]:grid-cols-3 @min-[860px]:gap-[72px]"
      >
        <Step n={1} tag="PASSPORT" title="A passport for every device" connector="events" figure={<ChainFigure tick={tick} />}>
          Each scan, repair, wipe or reading is appended to the device's history and linked by hash to the event before
          it, so any later change is detected.
        </Step>
        <Step n={2} tag="DECISION RULE" title="A rule picks its next life" connector="outcome" figure={<RuleFigure tick={tick} />}>
          It compares the emissions a newer device would save with the emissions of making it, as a range. If the range
          sits on one side of zero it recommends Keep, Upgrade, Redeploy or Recycle; if it crosses zero, a person decides.
        </Step>
        <Step n={3} tag="SECOND LIFE" title="Released with its passport" figure={<LabelFigure />}>
          Released devices are listed below with their passport and data-wipe record. The QR label on each device opens
          it. Buyers e-mail the data centre; there is no shop or checkout.
        </Step>
      </ol>
      <div className="flex flex-wrap border-t border-line font-mono text-[11px]">
        {[
          ['DRAWING', 'RC-001'],
          ['REVISION', '3'],
          ['SCALE', 'Not to scale'],
          ['VALUES', 'All sample data'],
        ].map(([key, value]) => (
          <div key={key} className="flex flex-[1_1_140px] flex-col gap-0.5 border-r border-line px-4 py-2">
            <span className="text-[9px] tracking-[.1em] text-ink-3">{key}</span>
            <span className="font-bold text-ink">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface StepProps {
  n: number
  tag: string
  title: string
  figure: ReactNode
  connector?: string
  children: ReactNode
}

function Step({ n, tag, title, figure, connector, children }: StepProps) {
  return (
    <li className="relative flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-accent font-mono text-xs font-bold text-accent">
          {n}
        </span>
        <span className="font-mono text-[11px] font-semibold tracking-[.08em] text-ink-2">{tag}</span>
      </div>
      <div aria-hidden>{figure}</div>
      <h3 className="text-[17px] font-bold">{title}</h3>
      <p className="text-[15px] text-pretty text-ink-2">{children}</p>
      {connector && <Connector label={connector} />}
    </li>
  )
}

/** Animated dashed arrow to the next step: sideways on wide screens, downwards when stacked. */
function Connector({ label }: { label: string }) {
  const dash = (angle: number) => ({
    backgroundImage: `repeating-linear-gradient(${angle}deg, var(--color-accent) 0 6px, transparent 6px 12px)`,
  })
  const labelEl = <span className="font-mono text-[10px] tracking-[.06em] text-ink-2">{label}</span>
  return (
    <>
      <div aria-hidden className="absolute top-[88px] left-full hidden w-[72px] flex-col items-center gap-1.5 px-1.5 @min-[860px]:flex">
        {labelEl}
        <div className="relative h-0.5 w-full animate-flow-x bg-[length:24px_2px]" style={dash(90)}>
          <span className="absolute -top-1 -right-[3px] border-y-[5px] border-l-8 border-y-transparent border-l-accent" />
        </div>
      </div>
      <div aria-hidden className="absolute inset-x-0 top-full flex h-14 items-center justify-center gap-2.5 @min-[860px]:hidden">
        <div className="relative h-[64%] w-0.5 animate-flow-y bg-[length:2px_24px]" style={dash(180)}>
          <span className="absolute -bottom-[3px] -left-1 border-x-[5px] border-t-8 border-x-transparent border-t-accent" />
        </div>
        {labelEl}
      </div>
    </>
  )
}

function ChainFigure({ tick }: { tick: number }) {
  const newest = 10 + tick
  const numbers = [4, 3, 2, 1, 0].map((back) => newest - back)
  return (
    <div className={`${insetFigure} flex flex-col justify-between`}>
      <div className="flex justify-end overflow-hidden">
        {/* Keyed by the newest number, so the row slides in again on every tick. */}
        <div key={newest} className="flex animate-shift">
          {numbers.map((n, i) => {
            const last = n === newest
            return (
              <span key={n} className="flex">
                {i > 0 && <span className="h-0.5 w-2 shrink-0 self-center bg-ink-3" />}
                <span
                  className={`flex size-11 shrink-0 flex-col items-center justify-center border-[1.5px] font-mono text-[10px] leading-tight ${
                    last ? 'animate-pop border-accent bg-accent text-surface' : 'border-ink bg-surface text-ink'
                  }`}
                >
                  <b>#{n}</b>
                  <span className="opacity-75">{shortHash(n)}</span>
                </span>
              </span>
            )
          })}
        </div>
      </div>
      <span className={mono}>
        event #{newest} appended · links to #{newest - 1}
      </span>
    </div>
  )
}

function RuleFigure({ tick }: { tick: number }) {
  const example = EXAMPLES[Math.floor(tick / 2) % EXAMPLES.length]
  return (
    <div className={`${insetFigure} flex flex-col justify-between`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-bold">{example.id}</span>
        <OutcomeBadge outcome={example.outcome} />
      </div>
      <div className="relative h-[30px]">
        <div className="absolute inset-x-0 top-3 h-1.5 bg-sunken" />
        <div
          className="absolute top-[9px] h-3 bg-accent transition-[left,width] duration-900 ease-draw"
          style={{ left: `${onAxis(example.low)}%`, width: `${onAxis(example.high) - onAxis(example.low)}%` }}
        />
        <div className="absolute inset-y-0 -ml-px w-0.5 bg-ink" style={{ left: `${onAxis(0)}%` }} />
      </div>
      <div className="flex justify-between gap-2 font-mono text-[10px] text-ink-2">
        <span>← keep pays back</span>
        <span>0</span>
        <span>replace pays back →</span>
      </div>
    </div>
  )
}

function LabelFigure() {
  return (
    <div className={`${insetFigure} flex items-center gap-3.5`}>
      {/* A QR label is printed black on white, so it keeps these colours in the dark theme too. */}
      <div className="relative grid size-[88px] shrink-0 grid-cols-9 overflow-hidden border border-[#0E1116] bg-white p-1.5">
        {QR_CELLS.map((on, i) => (
          <span key={i} className={on ? 'bg-[#0E1116]' : 'bg-white'} />
        ))}
        <span className="absolute inset-x-0 h-0.5 animate-scan bg-[#2443C9] shadow-[0_0_8px_2px_rgba(36,67,201,.55)]" />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="font-mono text-xs font-bold">GPU-SRV-001</span>
        <span className={`${mono} break-all`}>→ /device/GPU-SRV-001</span>
        <IntegrityBadge integrity={{ status: 'intact' }} />
      </div>
    </div>
  )
}
