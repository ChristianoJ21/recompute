import { useId } from 'react'
import { qrCodeUrl } from '../api/client'
import type { Device, DeviceInputs, Range } from '../api/types'
import { formatRange } from '../lib/format'
import { panelClass } from './ui'

const INPUTS: { key: keyof DeviceInputs; meaning: string; unit: string }[] = [
  { key: 'I_old', meaning: 'Operational emissions per unit of computation, this device', unit: 'kg CO₂e / unit' },
  { key: 'I_new', meaning: 'Operational emissions per unit of computation, replacement', unit: 'kg CO₂e / unit' },
  { key: 'W', meaning: 'Computation the device performs per year', unit: 'units / yr' },
  { key: 'T', meaning: 'Years of service ahead', unit: 'yr' },
  { key: 'E_new', meaning: 'Embodied emissions of manufacturing the replacement', unit: 'kg CO₂e' },
]

/** Meaning and unit per rule input, e.g. for the Add device form. */
export const INPUT_MEANINGS = Object.fromEntries(INPUTS.map(({ key, ...rest }) => [key, rest])) as Record<
  keyof DeviceInputs,
  { meaning: string; unit: string }
>

const heading = 'rc-eyebrow text-[11px] text-ink-2'
const row = 'border-b-2 border-dashed border-line py-1.5'

function RangeValue({ range, unit }: { range: Range | null; unit: string }) {
  if (!range) return <span className="font-semibold text-uncertain">missing</span>
  return (
    <>
      {formatRange(range)} {unit}
    </>
  )
}

function RuleInputs({ device }: { device: Device }) {
  const rows = [
    ...INPUTS.map(({ key, meaning, unit }) => ({ name: meaning, key, value: <RangeValue range={device.inputs[key]} unit={unit} /> })),
    ...device.upgrade_options.flatMap((option) => [
      { name: `${option.component}: emissions after upgrade`, key: 'I_upgraded', value: <RangeValue range={option.I_upgraded} unit="kg CO₂e / unit" /> },
      { name: `${option.component}: making the part`, key: 'E_component', value: <RangeValue range={option.E_component} unit="kg CO₂e" /> },
    ]),
  ]
  return (
    <div className="flex flex-col gap-2">
      <h3 className={heading}>Rule inputs (ranges)</h3>
      <p className="text-[13px] text-ink-2">
        Replace only if <span className="font-mono text-ink">(I_old − I_new) × W × T &gt; E_new</span>, run at both ends of every
        range.
      </p>
      <dl className="grid grid-cols-[minmax(0,1fr)_max-content] border-t-2 border-dashed border-line text-[13px]">
        {rows.map(({ name, key, value }) => (
          <div key={name} className="contents">
            <dt className={row}>
              {name} <span className="font-mono text-ink-3">{key}</span>
            </dt>
            <dd className={`${row} pl-3 text-right font-mono tabular-nums`}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function deviceRecord(device: Device): string {
  const components = device.components.map((c) => `  - ${c.type}: ${c.model}`).join('\n') || '  (none listed)'
  return [
    `device_id: ${device.id}`,
    `device_type: ${device.device_type}`,
    `model: ${device.model}`,
    `location: ${device.location}`,
    `install_date: ${device.install_date}`,
    'components:',
    components,
    `reliability_ok: ${device.reliability_ok}`,
    `sample_data: ${device.sample_data}`,
  ].join('\n')
}

/** Collapsed by default: what a curious judge or technician may want, not what a buyer needs first. */
export function TechnicalDetails({ device }: { device: Device }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={panelClass}>
      <details className="group">
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 sm:px-6 [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col">
            <span id={headingId} className="font-display text-xl font-extrabold">
              Technical details
            </span>
            <span className="text-[13px] text-ink-2">Rule inputs, device record, QR label</span>
          </span>
          <span aria-hidden className="font-mono text-lg">
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">−</span>
          </span>
        </summary>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-6 border-t-2 border-dashed border-line p-4 sm:p-6">
          <RuleInputs device={device} />
          <div className="flex flex-col gap-2">
            <h3 className={heading}>Device record</h3>
            <pre className="rounded-xl bg-forest p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-forest-fg">{deviceRecord(device)}</pre>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className={heading}>QR label</h3>
            {/* A QR code must stay dark on light to scan, so it keeps a white background in the dark theme. */}
            <img
              src={qrCodeUrl(device.id)}
              alt={`QR code that opens the passport of ${device.id}`}
              width={160}
              height={160}
              className="size-40 rotate-2 rounded-xl bg-white p-2 shadow-panel"
            />
            <span className="font-mono text-[11px] text-ink-2">→ /device/{device.id}</span>
          </div>
        </div>
      </details>
    </section>
  )
}
