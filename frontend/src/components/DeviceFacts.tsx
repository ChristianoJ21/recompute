import type { Device, DeviceInputs, Range } from '../api/types'
import { formatRange } from '../lib/format'
import { Card } from './ui'

const INPUTS: { key: keyof DeviceInputs; meaning: string; unit: string }[] = [
  { key: 'I_old', meaning: 'Operational emissions per unit of computation, this device', unit: 'kgCO₂e per compute-unit' },
  { key: 'I_new', meaning: 'Operational emissions per unit of computation, replacement', unit: 'kgCO₂e per compute-unit' },
  { key: 'W', meaning: 'Computation the device performs per year', unit: 'compute-units / year' },
  { key: 'T', meaning: 'Years of service ahead', unit: 'years' },
  { key: 'E_new', meaning: 'Embodied emissions of manufacturing the replacement', unit: 'kgCO₂e' },
]

function RangeValue({ range, unit }: { range: Range | null; unit: string }) {
  if (!range) return <span className="font-semibold text-amber-800">missing</span>
  return (
    <>
      <span className="font-semibold text-gray-900">{formatRange(range)}</span>
      <span className="block text-xs text-gray-500">{unit}</span>
    </>
  )
}

export function RuleInputs({ device }: { device: Device }) {
  return (
    <Card title="Rule inputs (sample)">
      <p className="-mt-2 mb-3 text-sm text-gray-600">
        Replace only if <span className="font-mono text-xs text-gray-900">(I_old − I_new) × W × T &gt; E_new</span>. Each
        input is a low–high range, and the engine runs the rule at both ends.
      </p>
      <dl className="divide-y divide-gray-100">
        {INPUTS.map(({ key, meaning, unit }) => (
          <div key={key} className="flex items-baseline justify-between gap-4 py-2">
            <dt>
              <span className="font-mono text-sm font-semibold text-gray-900">{key}</span>
              <span className="block text-xs text-gray-500">{meaning}</span>
            </dt>
            <dd className="shrink-0 text-right text-sm tabular-nums">
              <RangeValue range={device.inputs[key]} unit={unit} />
            </dd>
          </div>
        ))}
      </dl>
      {device.upgrade_options.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-900">Upgrade options</h3>
          <ul className="mt-2 space-y-2">
            {device.upgrade_options.map((option) => (
              <li key={option.component} className="rounded-lg border border-gray-200 p-3 text-sm">
                <p className="font-semibold text-gray-900">{option.component}</p>
                <dl className="mt-1 grid grid-cols-2 gap-3 tabular-nums">
                  <div>
                    <dt className="font-mono text-xs text-gray-500">I_upgraded</dt>
                    <dd>
                      <RangeValue range={option.I_upgraded} unit="kgCO₂e per compute-unit" />
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-xs text-gray-500">E_component</dt>
                    <dd>
                      <RangeValue range={option.E_component} unit="kgCO₂e" />
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

export function DeviceDetails({ device }: { device: Device }) {
  const rows: [string, string][] = [
    ['Type', device.device_type],
    ['Installed', device.install_date],
    ['Location', device.location],
    ['Reliability check', device.reliability_ok ? 'Passed' : 'Failed'],
    ['Components', device.components.map((c) => `${c.type}: ${c.model}`).join(', ') || 'None listed'],
  ]
  return (
    <Card title="Device">
      <dl className="divide-y divide-gray-100 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2">
            <dt className="text-gray-500">{label}</dt>
            <dd className="text-right text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
