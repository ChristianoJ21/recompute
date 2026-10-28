import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { describeError, getFleetSummary, getListings, listDevices, verifyEvents } from '../api/client'
import { OUTCOMES, type DeviceSummary, type FleetSummary } from '../api/types'
import { CheckIcon, CrossIcon } from '../components/icons'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { EmptyState, ErrorNotice, Loading, PageIntro, SectionHeader, container, panelClass, secondaryButton } from '../components/ui'
import { formatDateTime } from '../lib/format'
import { OUTCOME_STYLE } from '../lib/outcomes'

/** Technician stats (PRD 15.2) beyond the outcome counts. */
interface Stats {
  listed: string[]
  intact: number
  changed: string[]
  /** Passports whose hash chain could be checked; the rest failed to answer. */
  checked: number
  checkedAt: string
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
  const stats: Stats = {
    listed: listings.map((listing) => listing.device_id),
    intact: results.filter((result) => result.valid).length,
    changed: results.filter((result) => !result.valid).map((result) => result.device_id),
    checked: results.length,
    checkedAt: new Date().toISOString(),
  }
  return { devices, summary, stats }
}

/** "Hall A" from locations like "Hall A / Row 1". */
const halls = (devices: DeviceSummary[]) => [...new Set(devices.map((d) => d.location.split(' / ')[0]))].join(', ')
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

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
    <div className={`${container} flex flex-col gap-8 pt-[clamp(24px,4vw,40px)] pb-16`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageIntro eyebrow="/ Fleet" title="Fleet dashboard">
          {state.status === 'ready' && state.devices.length > 0 && (
            <p className="text-sm text-ink-2">{`${halls(state.devices)} · ${plural(state.summary.devices, 'device')}`}</p>
          )}
        </PageIntro>
        <Link to="/technicians/new" className={secondaryButton}>
          + Add technician
        </Link>
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
      <EmptyState title="No devices yet">
        Load the sample fleet with <code className="font-mono">py scripts/seed.py</code> (see README).
      </EmptyState>
    )
  }

  return (
    <>
      <StatsTiles devices={devices} summary={summary} stats={stats} />
      <section aria-labelledby="per-outcome" className="flex flex-col gap-3.5">
        <SectionHeader index="01" title="Devices per outcome" id="per-outcome" />
        <ul
          aria-label="Devices per outcome"
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-px border border-line bg-line"
        >
          {OUTCOMES.map((outcome) => (
            <li key={outcome} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 bg-surface px-4 py-3.5">
              <span className="justify-self-start">
                <OutcomeBadge outcome={outcome} />
              </span>
              <span className="font-mono text-[22px] font-bold tabular-nums">{summary.counts[outcome]}</span>
              <span className="col-span-full text-sm text-ink-2">{OUTCOME_STYLE[outcome].meaning}</span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="devices" className="flex flex-col gap-3.5">
        <SectionHeader index="02" title="Devices" id="devices" />
        <ul aria-label="Devices" className={panelClass}>
          {devices.map((device) => (
            <li key={device.id} className="border-b border-sunken last:border-b-0">
              <Link
                to={`/device/${encodeURIComponent(device.id)}`}
                className="flex min-h-14 flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5 text-ink no-underline hover:bg-raised"
              >
                <span className="flex-[0_0_120px] font-mono text-sm font-bold">{device.id}</span>
                <span className="flex min-w-0 flex-[1_1_220px] flex-col">
                  <span className="text-[15px] font-semibold">{device.model}</span>
                  <span className="text-[13px] text-ink-2">{device.location}</span>
                </span>
                <OutcomeBadge outcome={device.latest_outcome} />
                <span aria-hidden className="font-mono text-accent">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

interface Tile {
  label: string
  value: string
  sub: string
  tone?: 'ok' | 'danger'
}

function StatsTiles({ devices, summary, stats }: { devices: DeviceSummary[]; summary: FleetSummary; stats: Stats }) {
  const allIntact = stats.checked > 0 && stats.intact === stats.checked
  const tiles: Tile[] = [
    { label: 'Devices', value: String(summary.devices), sub: `in ${halls(devices)}` },
    {
      label: 'Not evaluated',
      value: String(summary.not_evaluated),
      sub: summary.not_evaluated === 0 ? 'rule has run on all' : 'press Evaluate on each',
    },
    { label: 'Listed for sale', value: String(stats.listed.length), sub: stats.listed.join(', ') || 'none listed' },
    {
      label: 'Passports intact',
      value: `${stats.intact} of ${stats.checked}`,
      sub:
        stats.checked < devices.length
          ? `${devices.length - stats.checked} could not be checked`
          : `checked ${formatDateTime(stats.checkedAt)}`,
      tone: allIntact ? 'ok' : undefined,
    },
    {
      label: 'Passports changed',
      value: String(stats.changed.length),
      sub: stats.changed.join(', ') || 'none detected',
      tone: stats.changed.length > 0 ? 'danger' : undefined,
    },
  ]
  return (
    <ul aria-label="Fleet stats" className="flex flex-wrap gap-px border border-line bg-line">
      {tiles.map((tile) => (
        // Status is shown with an icon and words, never colour alone.
        <li
          key={tile.label}
          className={`flex min-w-0 flex-[1_1_160px] flex-col gap-1.5 p-4 ${tile.tone === 'danger' ? 'bg-danger-bg shadow-[inset_3px_0_0_var(--color-danger)]' : 'bg-surface'}`}
        >
          <span className={`font-mono text-[11px] font-semibold tracking-[.06em] uppercase ${tile.tone === 'danger' ? 'text-danger-ink' : 'text-ink-2'}`}>
            {tile.label}
          </span>
          <span
            className={`flex items-center gap-2 text-[30px] leading-[1.1] font-bold tracking-[-.02em] tabular-nums ${
              tile.tone === 'ok' ? 'text-ok' : tile.tone === 'danger' ? 'text-danger' : 'text-ink'
            }`}
          >
            {tile.tone === 'ok' && <CheckIcon size={18} />}
            {tile.tone === 'danger' && <CrossIcon size={18} />}
            {tile.value}
          </span>
          <span className="text-xs break-words text-ink-2">{tile.sub}</span>
        </li>
      ))}
    </ul>
  )
}
