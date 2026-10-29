// Bundled line drawings of the (fictional) hardware: no photos of real products, nothing loaded at runtime.
// Decorative only: the spec table and passport text next to them carry the meaning.
import type { ReactNode } from 'react'

type DeviceArt = 'gpu_server' | 'generic'
type PartArt = 'gpu' | 'memory'

const PART_ART: readonly PartArt[] = ['gpu', 'memory']

export interface ArtChoice {
  device: DeviceArt
  parts: PartArt[]
}

/** Picks the drawings for a device: its chassis by `device_type`, one part drawing per known component type. */
export function pickArt(deviceType: string, components: readonly { type: string }[]): ArtChoice {
  const device: DeviceArt = deviceType.toLowerCase() === 'gpu_server' ? 'gpu_server' : 'generic'
  const types = new Set(components.map((c) => c.type.toLowerCase()))
  return { device, parts: PART_ART.filter((part) => types.has(part)) }
}

interface HardwareArtProps {
  deviceType: string
  components: readonly { type: string }[]
  /** Stroke colour: the outcome colour token, so the drawing follows the theme. */
  colour: string
  className?: string
}

const PART_CAPTION: Record<PartArt, string> = { gpu: 'FIG. B · GPU', memory: 'FIG. C · MEMORY' }
const caption = 'font-mono text-[10px] font-semibold tracking-[.12em] text-ink-3'

export function HardwareArt({ deviceType, components, colour, className = '' }: HardwareArtProps) {
  const { device, parts } = pickArt(deviceType, components)
  return (
    <div aria-hidden data-art={device} className={`flex flex-wrap items-center gap-x-6 gap-y-4 ${className}`} style={{ color: colour }}>
      <div className="flex min-w-0 flex-[2_1_220px] flex-col gap-1.5">
        {device === 'gpu_server' ? <GpuServer /> : <GenericChassis />}
        <span className={caption}>FIG. A · FRONT VIEW</span>
      </div>
      {parts.length > 0 && (
        // Beside the server the parts stack; once wrapped below it (phones) they sit side by side.
        <div className="flex min-w-0 flex-[1_1_120px] flex-wrap gap-3">
          {parts.map((part) => (
            <div key={part} data-part={part} className="flex min-w-0 flex-[1_1_120px] flex-col gap-1">
              {part === 'gpu' ? <GpuCard /> : <MemoryModule />}
              <span className={caption}>{PART_CAPTION[part]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Thin strokes at any size; `currentColor` is the outcome colour set on the wrapper. */
const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.25, vectorEffect: 'non-scaling-stroke' } as const
const faint = { ...line, strokeOpacity: 0.45 } as const
const tint = { fill: 'currentColor', fillOpacity: 0.07 } as const

function Svg({ viewBox, children }: { viewBox: string; children: ReactNode }) {
  return (
    <svg viewBox={viewBox} className="block h-auto w-full" focusable="false">
      {children}
    </svg>
  )
}

/** A fan seen from the front: guard rings, hub and four swept blades. */
function Fan({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const blade = `M${cx + r * 0.25} ${cy} Q${cx + r * 0.7} ${cy - r * 0.45} ${cx + r * 0.2} ${cy - r * 0.9}`
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} {...line} />
      <circle cx={cx} cy={cy} r={r * 0.62} {...faint} />
      <circle cx={cx} cy={cy} r={r * 0.24} {...line} />
      {[0, 90, 180, 270].map((angle) => (
        <path key={angle} d={blade} transform={`rotate(${angle} ${cx} ${cy})`} {...faint} />
      ))}
    </g>
  )
}

/** Engineering-drawing dimension line under a part, with extension lines and arrowheads. */
function Dimension({ x1, x2, y, from }: { x1: number; x2: number; y: number; from: number }) {
  return (
    <g {...faint}>
      <path d={`M${x1} ${from + 3}V${y + 4}M${x2} ${from + 3}V${y + 4}`} strokeDasharray="3 3" />
      <path d={`M${x1} ${y}H${x2}M${x1 + 6} ${y - 3}L${x1} ${y}l6 3M${x2 - 6} ${y - 3}L${x2} ${y}l-6 3`} />
    </g>
  )
}

const BAYS = Array.from({ length: 8 }, (_, i) => 22 + i * 35)

/** 4U GPU server, front view: rack ears, control strip, eight drive bays, four intake fans. */
function GpuServer() {
  return (
    <Svg viewBox="0 0 320 150">
      <rect x="14" y="4" width="292" height="124" {...tint} />
      <rect x="14" y="4" width="292" height="124" {...line} />
      {[0, 306].map((x) => (
        <g key={x}>
          <rect x={x} y="4" width="14" height="124" {...line} />
          <circle cx={x + 7} cy="16" r="2.5" {...faint} />
          <circle cx={x + 7} cy="116" r="2.5" {...faint} />
        </g>
      ))}
      <path d="M14 22H306" {...faint} />
      <circle cx="28" cy="13" r="4" {...line} />
      <rect x="40" y="11" width="4" height="4" fill="currentColor" />
      <rect x="48" y="11" width="4" height="4" {...line} />
      <rect x="236" y="9" width="62" height="8" {...faint} />
      {BAYS.map((x) => (
        <g key={x}>
          <rect x={x} y="28" width="31" height="38" {...line} />
          <path d={`M${x + 5} 58H${x + 26}`} {...faint} />
          <rect x={x + 4} y="32" width="3" height="3" fill="currentColor" />
        </g>
      ))}
      <path d="M14 70H306" {...faint} />
      {[57, 126, 195, 264].map((cx) => (
        <Fan key={cx} cx={cx} cy={99} r={22} />
      ))}
      <Dimension x1={14} x2={306} y={142} from={128} />
    </Svg>
  )
}

/** A plain 2U chassis for device types without their own drawing. */
function GenericChassis() {
  return (
    <Svg viewBox="0 0 320 150">
      <rect x="14" y="40" width="292" height="72" {...tint} />
      <rect x="14" y="40" width="292" height="72" {...line} />
      {[0, 306].map((x) => (
        <rect key={x} x={x} y="40" width="14" height="72" {...line} />
      ))}
      <circle cx="30" cy="56" r="4" {...line} />
      <rect x="42" y="54" width="4" height="4" fill="currentColor" />
      {Array.from({ length: 22 }, (_, i) => (
        <path key={i} d={`M${120 + i * 8} 52V100`} {...faint} />
      ))}
      <Dimension x1={14} x2={306} y={130} from={112} />
    </Svg>
  )
}

const FINGERS = Array.from({ length: 26 }, (_, i) => 40 + i * 4.4).filter((x) => x < 82 || x > 88)

/** GPU card, side view: bracket, shroud with two fans, power socket, edge connector. */
function GpuCard() {
  return (
    <Svg viewBox="0 0 200 80">
      <rect x="10" y="8" width="186" height="56" rx="3" {...tint} />
      <rect x="10" y="8" width="186" height="56" rx="3" {...line} />
      <path d="M2 4H10V76H6" {...line} />
      <path d="M5 16V40M5 46V60" {...faint} />
      <Fan cx={64} cy={36} r={20} />
      <Fan cx={138} cy={36} r={20} />
      <rect x="168" y="2" width="18" height="6" {...line} />
      <path d={FINGERS.map((x) => `M${x} 64V72`).join('')} {...faint} />
    </Svg>
  )
}

const CHIPS = Array.from({ length: 8 }, (_, i) => 14 + i * 22)
const PINS = Array.from({ length: 44 }, (_, i) => 6 + i * 4.3).filter((x) => x < 106 || x > 114)

/** Memory module: board, eight chips, keyed edge contacts. */
function MemoryModule() {
  return (
    <Svg viewBox="0 0 200 48">
      <rect x="2" y="4" width="196" height="32" {...tint} />
      <path d="M2 4H198V36H114V31H106V36H2Z" {...line} />
      {CHIPS.map((x) => (
        <rect key={x} x={x} y="10" width="17" height="18" {...line} />
      ))}
      <path d={PINS.map((x) => `M${x} 37V44`).join('')} {...faint} />
    </Svg>
  )
}
