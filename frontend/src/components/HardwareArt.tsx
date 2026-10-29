// Bundled line drawings of the (fictional) hardware: no photos of real products, nothing loaded at runtime.
// Decorative only: the spec table and passport text next to them carry the meaning.
import type { ReactNode } from 'react'

type DeviceArt = 'gpu_server' | 'storage_server' | 'network_switch' | 'workstation' | 'generic'
type PartArt = 'gpu' | 'memory' | 'cpu' | 'storage' | 'nic' | 'psu'

const DEVICE_ART: readonly DeviceArt[] = ['gpu_server', 'storage_server', 'network_switch', 'workstation']
/** Drawing order of the parts, whatever order the passport lists them in. */
const PART_ART: readonly PartArt[] = ['gpu', 'memory', 'cpu', 'storage', 'nic', 'psu']
/** Component types that share a drawing: any drive is drawn as one drive. */
const PART_ALIAS: Record<string, PartArt> = { ssd: 'storage', hdd: 'storage' }

export interface ArtChoice {
  device: DeviceArt
  parts: PartArt[]
}

/** Picks the drawings for a device: its chassis by `device_type`, one part drawing per known component type. */
export function pickArt(deviceType: string, components: readonly { type: string }[]): ArtChoice {
  const type = deviceType.toLowerCase()
  const device = DEVICE_ART.find((art) => art === type) ?? 'generic'
  const types = new Set(components.map((c) => c.type.toLowerCase()).map((t) => PART_ALIAS[t] ?? t))
  return { device, parts: PART_ART.filter((part) => types.has(part)) }
}

interface HardwareArtProps {
  deviceType: string
  components: readonly { type: string }[]
  /** Stroke colour: the outcome colour token, so the drawing follows the theme. */
  colour: string
  className?: string
}

const DEVICE_DRAWING: Record<DeviceArt, { view: string; Drawing: () => ReactNode }> = {
  gpu_server: { view: 'FRONT VIEW', Drawing: GpuServer },
  storage_server: { view: 'FRONT VIEW', Drawing: StorageServer },
  network_switch: { view: 'FRONT VIEW', Drawing: NetworkSwitch },
  workstation: { view: 'FRONT AND SIDE VIEW', Drawing: Workstation },
  generic: { view: 'FRONT VIEW', Drawing: GenericChassis },
}
const PART_DRAWING: Record<PartArt, { name: string; Drawing: () => ReactNode }> = {
  gpu: { name: 'GPU', Drawing: GpuCard },
  memory: { name: 'MEMORY', Drawing: MemoryModule },
  cpu: { name: 'CPU', Drawing: Processor },
  storage: { name: 'STORAGE', Drawing: Drive },
  nic: { name: 'NETWORK CARD', Drawing: NetworkCard },
  psu: { name: 'POWER SUPPLY', Drawing: PowerSupply },
}
const caption = 'font-mono text-[10px] font-semibold tracking-[.12em] text-ink-3'
/** FIG. A is the device; its parts follow as B, C, D… */
const figure = (index: number) => `FIG. ${String.fromCharCode(65 + index)}`

export function HardwareArt({ deviceType, components, colour, className = '' }: HardwareArtProps) {
  const { device, parts } = pickArt(deviceType, components)
  const { view, Drawing } = DEVICE_DRAWING[device]
  return (
    <div aria-hidden data-art={device} className={`flex flex-wrap items-center gap-x-6 gap-y-4 ${className}`} style={{ color: colour }}>
      <div className="flex min-w-0 flex-[2_1_220px] flex-col gap-1.5">
        <Drawing />
        <span className={caption}>{`${figure(0)} · ${view}`}</span>
      </div>
      {parts.length > 0 && (
        // Beside the device the parts stack; once wrapped below it (phones) they sit side by side, all the same width.
        <div className="grid min-w-0 flex-[1_1_120px] grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
          {parts.map((part, index) => {
            const { name, Drawing: Part } = PART_DRAWING[part]
            return (
              <div key={part} data-part={part} className="flex min-w-0 flex-col gap-1">
                <Part />
                <span className={caption}>{`${figure(index + 1)} · ${name}`}</span>
              </div>
            )
          })}
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

/** Rack ears with their screw holes, either side of a chassis that runs from y to y + h. */
function RackEars({ y, h }: { y: number; h: number }) {
  const inset = Math.min(12, h / 4)
  return (
    <>
      {[0, 306].map((x) => (
        <g key={x}>
          <rect x={x} y={y} width="14" height={h} {...line} />
          <circle cx={x + 7} cy={y + inset} r="2.5" {...faint} />
          <circle cx={x + 7} cy={y + h - inset} r="2.5" {...faint} />
        </g>
      ))}
    </>
  )
}

const DRIVE_COLUMNS = Array.from({ length: 6 }, (_, i) => 20 + i * 47)
const DRIVE_ROWS = Array.from({ length: 4 }, (_, i) => 27 + i * 25)

/** 4U storage server, front view: control strip and 24 hot-swap 3.5" drive carriers. */
function StorageServer() {
  return (
    <Svg viewBox="0 0 320 150">
      <rect x="14" y="4" width="292" height="124" {...tint} />
      <rect x="14" y="4" width="292" height="124" {...line} />
      <RackEars y={4} h={124} />
      <path d="M14 22H306" {...faint} />
      <circle cx="28" cy="13" r="4" {...line} />
      <rect x="40" y="11" width="4" height="4" fill="currentColor" />
      <rect x="48" y="11" width="4" height="4" {...line} />
      <rect x="236" y="9" width="62" height="8" {...faint} />
      {DRIVE_ROWS.map((y) =>
        DRIVE_COLUMNS.map((x) => (
          <g key={`${x}-${y}`}>
            <rect x={x} y={y} width="45" height="22" {...line} />
            <path d={`M${x + 12} ${y + 5}H${x + 40}M${x + 12} ${y + 11}H${x + 40}M${x + 12} ${y + 17}H${x + 40}`} {...faint} />
            <rect x={x + 4} y={y + 4} width="3" height="3" fill="currentColor" />
            <path d={`M${x + 5.5} ${y + 11}V${y + 18}`} {...faint} />
          </g>
        )),
      )}
      <Dimension x1={14} x2={306} y={142} from={128} />
    </Svg>
  )
}

const PORT_BANKS = [0, 1, 2, 3].map((bank) => 70 + bank * 46)
const PORT_COLUMNS = PORT_BANKS.flatMap((x) => Array.from({ length: 6 }, (_, i) => x + i * 7))

/** 1U switch, front view: 48 ports in banks of 12, four uplink cages, console port and status lights. */
function NetworkSwitch() {
  // Same width (so the same scale) as the other chassis, cropped to the 1U band so the caption stays close.
  return (
    <Svg viewBox="0 40 320 80">
      <rect x="14" y="50" width="292" height="44" {...tint} />
      <rect x="14" y="50" width="292" height="44" {...line} />
      <RackEars y={50} h={44} />
      <circle cx="28" cy="62" r="3.5" {...line} />
      <rect x="24" y="72" width="4" height="4" fill="currentColor" />
      <rect x="31" y="72" width="4" height="4" {...line} />
      <rect x="38" y="72" width="4" height="4" {...line} />
      <rect x="24" y="81" width="22" height="8" {...faint} />
      {[57, 72].map((y) => PORT_COLUMNS.map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="5.5" height="5.5" {...line} />))}
      <path d={PORT_BANKS.map((x) => `M${x} 86H${x + 40}`).join('')} {...faint} />
      <path d="M252 52V92" {...faint} />
      {[258, 278].map((x) =>
        [58, 72].map((y) => (
          <g key={`${x}-${y}`}>
            <rect x={x} y={y} width="16" height="9" {...line} />
            <path d={`M${x + 3} ${y + 6.5}H${x + 13}`} {...faint} />
          </g>
        )),
      )}
      <Dimension x1={14} x2={306} y={112} from={94} />
    </Svg>
  )
}

const SIDE_VENTS = Array.from({ length: 10 }, (_, i) => 180 + i * 9)

/** Tower workstation in two views: front (power button, drive bay, two intake fans) and side (window, card, cooler). */
function Workstation() {
  return (
    <Svg viewBox="0 0 320 150">
      <rect x="30" y="6" width="66" height="118" rx="3" {...tint} />
      <rect x="30" y="6" width="66" height="118" rx="3" {...line} />
      <circle cx="63" cy="17" r="4" {...line} />
      <rect x="73" y="15" width="4" height="4" fill="currentColor" />
      <rect x="38" y="26" width="50" height="9" {...faint} />
      <Fan cx={63} cy={62} r={19} />
      <Fan cx={63} cy={102} r={19} />
      <path d="M36 124V129H46V124M80 124V129H90V124" {...line} />

      <rect x="120" y="6" width="180" height="118" rx="3" {...tint} />
      <rect x="120" y="6" width="180" height="118" rx="3" {...line} />
      <rect x="132" y="18" width="150" height="94" rx="6" {...faint} />
      <path d={SIDE_VENTS.map((x) => `M${x} 10V15`).join('')} {...faint} />
      <circle cx="234" cy="46" r="14" {...line} />
      <circle cx="234" cy="46" r="5" {...faint} />
      <rect x="160" y="76" width="96" height="14" rx="2" {...line} />
      <path d="M256 79H268V87H256" {...faint} />
      <rect x="140" y="26" width="10" height="44" {...faint} />
      <path d="M126 124V129H136V124M284 124V129H294V124" {...line} />
      <Dimension x1={30} x2={96} y={142} from={129} />
      <Dimension x1={120} x2={300} y={142} from={129} />
    </Svg>
  )
}

const PADS = Array.from({ length: 9 }, (_, i) => 108 + i * 9)

/** Processor: top view (substrate, heat spreader, corner mark) and side elevation (spreader on substrate, pads). */
function Processor() {
  return (
    <Svg viewBox="0 0 200 80">
      <rect x="14" y="8" width="64" height="64" rx="2" {...tint} />
      <rect x="14" y="8" width="64" height="64" rx="2" {...line} />
      <rect x="24" y="18" width="44" height="44" rx="4" {...line} />
      <path d="M17 11H23L17 17Z" fill="currentColor" />
      <path d="M30 40H62M46 24V56" {...faint} />
      <rect x="102" y="46" width="86" height="7" {...line} />
      <rect x="112" y="34" width="66" height="12" rx="2" {...tint} />
      <rect x="112" y="34" width="66" height="12" rx="2" {...line} />
      <path d={PADS.map((x) => `M${x} 53V58`).join('')} {...faint} />
    </Svg>
  )
}

const SCREWS = [
  [16, 16],
  [168, 16],
  [16, 62],
  [168, 62],
]

/** Drive: casing with label, screw holes and the data + power connector on its edge. */
function Drive() {
  return (
    <Svg viewBox="0 0 200 80">
      <rect x="8" y="8" width="168" height="62" rx="4" {...tint} />
      <rect x="8" y="8" width="168" height="62" rx="4" {...line} />
      <rect x="40" y="20" width="92" height="38" rx="2" {...faint} />
      <path d="M50 30H110M50 38H96M50 46H104" {...faint} />
      {SCREWS.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.5" {...line} />
      ))}
      <path d="M176 20H184V34H180V38H184V58H176" {...line} />
      <path d="M180 24V31M180 42V55" {...faint} />
    </Svg>
  )
}

const FINS = Array.from({ length: 12 }, (_, i) => 92 + i * 5)

/** Network card, side view: bracket with two cages, heat sink, chip and edge connector. */
function NetworkCard() {
  return (
    <Svg viewBox="0 0 200 80">
      <rect x="10" y="8" width="170" height="50" rx="3" {...tint} />
      <rect x="10" y="8" width="170" height="50" rx="3" {...line} />
      <path d="M2 4H10V76H6" {...line} />
      <rect x="12" y="14" width="22" height="14" {...line} />
      <rect x="12" y="34" width="22" height="14" {...line} />
      <rect x="86" y="16" width="64" height="34" {...line} />
      <path d={FINS.map((x) => `M${x} 18V48`).join('')} {...faint} />
      <rect x="44" y="22" width="22" height="22" {...faint} />
      <path d={FINGERS.map((x) => `M${x + 60} 58V66`).join('')} {...faint} />
    </Svg>
  )
}

const VENTS = Array.from({ length: 8 }, (_, i) => 92 + i * 6)

/** Power supply: casing, fan grille, vents, mains inlet and switch. */
function PowerSupply() {
  return (
    <Svg viewBox="0 0 200 80">
      <rect x="6" y="6" width="188" height="64" rx="2" {...tint} />
      <rect x="6" y="6" width="188" height="64" rx="2" {...line} />
      <Fan cx={44} cy={38} r={24} />
      <path d={VENTS.map((x) => `M${x} 16V60`).join('')} {...faint} />
      <path d="M148 24H174L178 30V48H148Z" {...line} />
      <path d="M156 32V40M163 32V40M170 32V40" {...faint} />
      <rect x="152" y="54" width="10" height="8" {...line} />
    </Svg>
  )
}
