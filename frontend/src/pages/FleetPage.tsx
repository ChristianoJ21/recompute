import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { describeError, getFleetSummary, listDevices } from '../api/client'
import { OUTCOMES, type DeviceSummary, type FleetSummary } from '../api/types'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { ErrorNotice, Loading } from '../components/ui'
import { OUTCOME_STYLE } from '../lib/outcomes'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; devices: DeviceSummary[]; summary: FleetSummary }

export function FleetPage() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    Promise.all([listDevices(), getFleetSummary()])
      .then(([devices, summary]) => {
        if (active) setState({ status: 'ready', devices, summary })
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: describeError(error) })
      })
    return () => {
      active = false
    }
  }, [attempt])

  const retry = () => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Fleet</h1>
        <p className="mt-1 text-sm text-gray-600">
          What ReCompute recommends for each device, from its latest evaluation.
        </p>
      </div>
      {state.status === 'loading' && <Loading label="Loading the fleet…" />}
      {state.status === 'error' && <ErrorNotice message={state.message} onRetry={retry} />}
      {state.status === 'ready' && <Fleet devices={state.devices} summary={state.summary} />}
    </div>
  )
}

function Fleet({ devices, summary }: { devices: DeviceSummary[]; summary: FleetSummary }) {
  if (devices.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-600">
        No devices yet. Load the sample fleet with <code className="font-mono">python scripts/seed.py</code>.
      </p>
    )
  }

  return (
    <>
      <section aria-labelledby="counts-heading">
        <h2 id="counts-heading" className="sr-only">
          Devices per outcome
        </h2>
        <p className="mb-3 text-sm text-gray-600">
          {summary.devices} {summary.devices === 1 ? 'device' : 'devices'}
          {summary.not_evaluated > 0 && ` · ${summary.not_evaluated} not evaluated yet`}
        </p>
        <ul aria-labelledby="counts-heading" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {OUTCOMES.map((outcome) => (
            <li key={outcome} className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <span className="text-3xl font-semibold tabular-nums text-gray-900">{summary.counts[outcome]}</span>
              <span>
                <OutcomeBadge outcome={outcome} />
              </span>
              <span className="text-xs leading-snug text-gray-500">{OUTCOME_STYLE[outcome].meaning}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="devices-heading">
        <h2 id="devices-heading" className="text-base font-semibold">
          Devices
        </h2>
        <ul
          aria-labelledby="devices-heading"
          className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          {devices.map((device) => (
            <li key={device.id}>
              <Link
                to={`/device/${encodeURIComponent(device.id)}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50/60 focus-visible:bg-emerald-50 focus-visible:outline-none"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-semibold text-gray-900">{device.id}</span>
                  <span className="block truncate text-sm text-gray-600">{device.location}</span>
                  <span className="block truncate text-xs text-gray-500">{device.model}</span>
                </span>
                <OutcomeBadge outcome={device.latest_outcome} />
                <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="size-5 shrink-0 text-gray-400">
                  <path
                    fillRule="evenodd"
                    d="M7.2 14.8a.75.75 0 0 1 0-1.06L10.94 10 7.2 6.26a.75.75 0 1 1 1.06-1.06l4.27 4.27a.75.75 0 0 1 0 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0Z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
