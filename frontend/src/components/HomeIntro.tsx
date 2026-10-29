// Home intro, once per browser session (lib/intro.ts): the ReCompute mark assembles from dots, the wordmark is
// drawn on construction lines, then a glass strip with the tagline rises over a colour field and the page appears.
// Decorative only (no data, no numbers): the stage is hidden from assistive technology; any key, tap or scroll skips it.
import { useCallback, useEffect, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { LogoMark } from './icons'
import { nightGhostButton } from './ui'

/** Length of the whole intro; the stage fades out from OUT_S seconds on. */
export const INTRO_MS = 4400
const OUT_S = 3.9
const EASE = 'cubic-bezier(.2,.8,.2,1)'
const DRAW = 'cubic-bezier(.4,0,.2,1)'

const play = (name: string, seconds: number, delay: number, easing = EASE): CSSProperties => ({
  animation: `${name} ${seconds}s ${easing} ${delay}s both`,
})

interface Dot {
  x: number
  y: number
  solid: boolean
}

/** The outline of one block of the mark, one dot per unit. */
function outline(x0: number, y0: number, w: number, h: number): Dot[] {
  const dots: Dot[] = []
  for (let i = 0; i <= w; i++) dots.push({ x: x0 + i, y: y0, solid: false }, { x: x0 + i, y: y0 + h, solid: false })
  for (let j = 1; j < h; j++) dots.push({ x: x0, y: y0 + j, solid: false }, { x: x0 + w, y: y0 + j, solid: false })
  return dots
}

/** The logo mark (LogoMark, 34 × 14 units) as dots: two outlined blocks, the links between them, the solid block. */
const DOTS: Dot[] = [
  ...outline(1, 3, 7, 8),
  ...outline(13.5, 3, 7, 8),
  ...[9, 10, 11, 12, 13, 21, 22, 23, 24, 25].map((x) => ({ x, y: 7, solid: false })),
  ...Array.from({ length: 72 }, (_, i) => ({ x: 26 + (i % 8), y: 3 + Math.floor(i / 8), solid: true })),
]

/** Each dot flies in from its own fixed offset (no randomness: the same intro every time), sweeping left to right. */
function dotStyle(dot: Dot, index: number): CSSProperties {
  return {
    '--dx': `${((index * 37) % 23) - 11}px`,
    '--dy': `${((index * 53) % 17) - 8}px`,
    transformBox: 'fill-box',
    transformOrigin: 'center',
    ...play('rc-intro-dot', 0.7, 0.05 + (dot.x / 34) * 0.4 + (index % 4) * 0.03),
  } as CSSProperties
}

const GUIDES_H = [54, 77, 122, 138]
const GUIDES_V = [48, 252, 292, 628]
const NODES = [
  [48, 54],
  [252, 138],
  [292, 122],
  [628, 77],
]

/** Mark and wordmark on blueprint construction lines. */
function Lockup() {
  return (
    <svg viewBox="0 0 660 220" className="block h-auto w-[min(88vw,760px)]" focusable="false">
      <g fill="none" className="stroke-night-fg3" strokeOpacity={0.5}>
        {GUIDES_H.map((y, i) => (
          <path key={`h${y}`} d={`M12 ${y}H648`} pathLength={1} strokeDasharray="1" style={play('rc-intro-draw', 0.8, 1.05 + i * 0.06, DRAW)} />
        ))}
        {GUIDES_V.map((x, i) => (
          <path key={`v${x}`} d={`M${x} 22V198`} pathLength={1} strokeDasharray="1" style={play('rc-intro-draw', 0.7, 1.25 + i * 0.06, DRAW)} />
        ))}
      </g>
      {NODES.map(([x, y], i) => (
        <rect key={`${x}-${y}`} x={x - 3} y={y - 3} width="6" height="6" className="fill-night-accent" style={play('rc-intro-in', 0.3, 1.7 + i * 0.05)} />
      ))}
      <g transform="translate(48 54) scale(6)">
        <g style={play('rc-intro-dim', 0.6, 1.45, 'ease-out')}>
          {DOTS.map((dot, i) => (
            <circle key={i} cx={dot.x} cy={dot.y} r="0.42" className={dot.solid ? 'fill-night-accent' : 'fill-night-fg'} style={dotStyle(dot, i)} />
          ))}
        </g>
        <g fill="none" className="stroke-night-fg" strokeWidth="0.32">
          <path d="M1 3h7v8H1Z" pathLength={1} strokeDasharray="1" style={play('rc-intro-draw', 0.6, 1.0, DRAW)} />
          <path d="M13.5 3h7v8h-7Z" pathLength={1} strokeDasharray="1" style={play('rc-intro-draw', 0.6, 1.1, DRAW)} />
          <path d="M8 7h5.5M20.5 7h5" pathLength={1} strokeDasharray="1" style={play('rc-intro-draw', 0.5, 1.2, DRAW)} />
        </g>
        <path d="M25.5 2.5h8v9h-8Z" className="fill-night-accent" style={play('rc-intro-in', 0.4, 1.3)} />
      </g>
      <text
        x="292"
        y="122"
        fontSize="64"
        fontWeight="750"
        letterSpacing="-2.4"
        className="fill-white"
        style={{ transformBox: 'fill-box', transformOrigin: 'left bottom', ...play('rc-intro-rise', 0.7, 1.45) }}
      >
        ReCompute
      </text>
      <g fontSize="10" letterSpacing="1.6" className="fill-night-fg3 font-mono max-sm:hidden" style={play('rc-intro-in', 0.5, 1.8)}>
        <text x="48" y="214">
          FIG. A · MARK
        </text>
        <text x="292" y="214">
          FIG. B · WORDMARK
        </text>
      </g>
    </svg>
  )
}

const FIELD = [
  'top-[-20%] left-[-10%] h-[80%] w-[60%] bg-[radial-gradient(closest-side,rgba(19,114,58,.8),transparent)]',
  'top-[5%] right-[-12%] h-[85%] w-[55%] bg-[radial-gradient(closest-side,rgba(74,111,12,.7),transparent)]',
  'bottom-[-30%] left-[18%] h-[75%] w-[60%] bg-[radial-gradient(closest-side,rgba(111,208,143,.38),transparent)]',
  'right-[12%] bottom-[-12%] h-[55%] w-[38%] bg-[radial-gradient(closest-side,rgba(121,196,236,.5),transparent)]',
]

/** Soft blue, violet, green and sky glows that bloom behind the glass strip. */
function ColourField() {
  return (
    <div className="absolute inset-0" style={play('rc-intro-in', 1.1, 2.15, 'ease-out')}>
      {FIELD.map((blob) => (
        <div key={blob} className={`absolute ${blob} animate-glow blur-[30px]`} />
      ))}
    </div>
  )
}

function GlassStrip() {
  return (
    <div
      className="grid w-[min(94vw,1120px)] grid-cols-1 items-center gap-5 rounded-[28px] border border-white/15 bg-white/[.07] p-[clamp(22px,3vw,40px)] shadow-[0_40px_80px_-30px_rgba(0,0,0,.6)] backdrop-blur-[18px] md:grid-cols-[1.3fr_1fr_auto] md:gap-10"
      style={play('rc-intro-rise', 0.8, 2.55)}
    >
      <p className="text-[clamp(28px,3.4vw,50px)] leading-[1.02] font-[700] tracking-[-.035em] text-balance text-white">
        Keep, upgrade, redeploy. Recycle last.
      </p>
      <p className="max-w-[42ch] text-[15px] leading-relaxed text-night-fg2">
        ReCompute helps a data centre keep AI servers in use longer instead of scrapping them early.
      </p>
      <span className="flex items-center gap-3 text-white [&_svg]:h-6 [&_svg]:w-auto">
        <LogoMark />
        <span className="text-[22px] font-bold tracking-[-.02em]">ReCompute</span>
      </span>
    </div>
  )
}

export function HomeIntro({ onDone }: { onDone: () => void }) {
  // The timer runs once from mount; a new onDone from a re-render must not restart it.
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })
  const ended = useRef(false)
  const end = useCallback(() => {
    if (ended.current) return
    ended.current = true
    onDoneRef.current()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(end, INTRO_MS)
    const skips = ['keydown', 'pointerdown', 'wheel'] as const
    skips.forEach((type) => window.addEventListener(type, end, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      skips.forEach((type) => window.removeEventListener(type, end))
    }
  }, [end])

  return createPortal(
    <div data-theme="dark" className="fixed inset-0 z-[60] overflow-hidden bg-night text-night-fg" style={play('rc-intro-out', 0.5, OUT_S, 'ease-in')}>
      <div data-intro-stage aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.07)_1px,transparent_1px)] bg-size-[26px_26px]" />
        <ColourField />
        <div className="absolute inset-0 flex items-center justify-center px-6" style={play('rc-intro-recede', 0.6, 2.35, 'cubic-bezier(.4,0,1,1)')}>
          <Lockup />
        </div>
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <GlassStrip />
        </div>
      </div>
      <button
        type="button"
        onClick={end}
        className={`${nightGhostButton} absolute right-[clamp(16px,4vw,48px)] bottom-[clamp(16px,4vw,40px)] min-h-11 font-mono text-[13px]`}
      >
        Skip intro
      </button>
    </div>,
    document.body,
  )
}
