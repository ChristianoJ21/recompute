import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { describeError, getFleetSummary, getListings, listDevices, verifyEvents } from '../api/client'
import { OUTCOMES, type DeviceSummary, type FleetSummary } from '../api/types'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { ErrorNotice, Loading } from '../components/ui'
import { OUTCOME_STYLE } from '../lib/outcomes'

/** Technician stats (PRD 15.2) beyond the outcome counts. */
interface Stats {
  listed: number
  intact: number
  changed: number
  /** Passports whose hash chain could be checked; the rest failed to answer. */
  checked: number
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; devices: DeviceSummary[]; summary: FleetSummary; stats: Stats }

async function loadFleet() {
  const [devices, summary, listings] = await Promise.all([listDevices(), getFleetSummary(), getListings()])
  // One check per device; a failed check is left out of the counts instead of failing the page.
  const checks = await Promise.allSettled(devices.map((device) => verifyEvents(device.id)))
  const results = checks.flatMap((check) => (check.status === 'fulfilled' ? [check.value] : []))
  const intact = results.filter((result) => result.valid).length
  const stats = { listed: listings.length, intact, changed: results.length - intact, checked: results.length }
  return { devices, summary, stats }
}

export function FleetPage() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    loadFleet()
      .then((fleet) => {
        if (active) setState({ status: 'ready', ...fleet })
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
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Fleet dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          What ReCompute recommends for each device, from its latest evaluation.
        </p>
      </div>
      {state.status === 'loading' && <Loading label="Loading the fleet…" />}
      {state.status === 'error' && <ErrorNotice message={state.message} onRetry={retry} />}
      {state.status === 'ready' && <Fleet devices={state.devices} summary={state.summary} stats={state.stats} />}
    </div>
  )
}

function Fleet({ devices, summary, stats }: { devices: DeviceSummary[]; summary: FleetSummary; stats: Stats }) {
  if (devices.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-600">
        No devices yet. Load the sample fleet with <code className="font-mono">py scripts/seed.py</code> (see README).
      </p>
    )
  }

  return (
    <>
      <StatsTiles summary={summary} stats={stats} />
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

function StatsTiles({ summary, stats }: { summary: FleetSummary; stats: Stats }) {
  const tiles = [
    { label: 'Devices', value: String(summary.devices) },
    { label: 'Not evaluated', value: String(summary.not_evaluated) },
    { label: 'Listed for sale', value: String(stats.listed) },
    { label: 'Passports intact', value: `${stats.intact} of ${stats.checked}` },
  ]
  const tileClass = 'flex flex-col gap-1 rounded-xl border bg-white p-3 shadow-sm'
  return (
    <ul aria-label="Fleet stats" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {tiles.map((tile) => (
        <li key={tile.label} className={`${tileClass} border-gray-200`}>
          <span className="text-2xl font-semibold tabular-nums text-gray-900">{tile.value}</span>
          <span className="text-xs text-gray-600">{tile.label}</span>
        </li>
      ))}
      {/* Status shown with an icon and words, never colour alone. */}
      <li className={`${tileClass} ${stats.changed > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
        <span className="text-2xl font-semibold tabular-nums text-gray-900">
          {stats.changed > 0 && (
            <span aria-hidden className="mr-1 text-red-700">
              ✘
            </span>
          )}
          {stats.changed}
        </span>
        <span className="text-xs text-gray-600">Passports changed</span>
      </li>
    </ul>
  )
}
