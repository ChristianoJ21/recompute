import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { describeError, getFleetSummary, getListings, listDevices, verifyEvents } from '../api/client'
import { OUTCOMES, type DeviceSummary, type FleetSummary, type Outcome } from '../api/types'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { SolidBadge } from '../components/SolidBadge'
import {
  EmptyState,
  ErrorNotice,
  HeroChip,
  Loading,
  NightBackdrop,
  SectionTitle,
  band,
  container,
  nightButton,
  panelClass,
} from '../components/ui'
import { formatDateTime } from '../lib/format'
import { OUTCOME_STYLE, outcomeColours } from '../lib/outcomes'

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

  const ready = state.status === 'ready' && state.devices.length > 0 ? state : null
  return (
    <>
      <section data-theme="dark" aria-labelledby="fleet-h" className="relative overflow-hidden bg-night text-night-fg">
        <NightBackdrop />
        <div className={`${container} relative flex flex-col gap-[clamp(28px,3.5vw,48px)] pt-[clamp(36px,4.5vw,72px)] pb-[clamp(36px,4.5vw,64px)]`}>
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
            <div className="flex flex-col gap-3.5">
              <HeroChip live>FLEET{ready ? ` · ${halls(ready.devices).toUpperCase()}` : ''}</HeroChip>
              <h1 id="fleet-h" className="text-[clamp(40px,5.4vw,84px)] leading-none font-[750] tracking-[-.045em] text-white">
                Fleet dashboard
              </h1>
              {ready && (
                <p className="text-[clamp(16px,1.35vw,19px)] text-night-fg2">{`${halls(ready.devices)} · ${plural(ready.summary.devices, 'device')}`}</p>
              )}
            </div>
            <Link to="/technicians/new" className={nightButton}>
              + Add technician
            </Link>
          </div>
          {ready && <StatsTiles devices={ready.devices} summary={ready.summary} stats={ready.stats} />}
        </div>
      </section>
      <div className={band}>
        <div className={`${container} flex flex-col gap-[clamp(32px,4vw,56px)]`}>
          {state.status === 'loading' && <Loading label="Loading the fleet…" />}
          {state.status === 'error' && <ErrorNotice message={state.message} onRetry={retry} />}
          {state.status === 'ready' && <Fleet devices={state.devices} summary={state.summary} />}
        </div>
      </div>
    </>
  )
}

function Fleet({ devices, summary }: { devices: DeviceSummary[]; summary: FleetSummary }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [query, setQuery] = useState('')

  if (devices.length === 0) {
    return (
      <EmptyState title="No devices yet">
        Load the sample fleet with <code className="font-mono">py scripts/seed.py</code> (see README).
      </EmptyState>
    )
  }

  const needle = query.trim().toLowerCase()
  const shown = devices.filter(
    (device) =>
      (!outcome || device.latest_outcome === outcome) &&
      (!needle || [device.id, device.location, device.model].some((text) => text.toLowerCase().includes(needle))),
  )
  const clear = () => {
    setOutcome(null)
    setQuery('')
  }

  return (
    <>
      <section aria-labelledby="per-outcome" className="flex flex-col gap-[18px]">
        <SectionTitle eyebrow="01 · OUTCOMES" title="Devices per outcome" id="per-outcome">
          <span className="text-sm text-ink-2">Pick an outcome to filter the device list.</span>
        </SectionTitle>
        <OutcomeBar summary={summary} selected={outcome} />
        <ul aria-label="Devices per outcome" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-3.5">
          {OUTCOMES.map((key) => {
            const on = outcome === key
            const colours = outcomeColours(key)
            return (
              <li key={key}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setOutcome(on ? null : key)}
                  className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2.5 rounded-[18px] border-[1.5px] px-5 py-[18px] text-left text-ink transition-[translate,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-panel-hover ${
                    on ? '-translate-y-[3px] shadow-panel-hover' : 'border-line bg-surface'
                  }`}
                  style={on ? { background: colours.bg, borderColor: colours.fg } : undefined}
                >
                  <span className="justify-self-start">
                    <SolidBadge outcome={key} />
                  </span>
                  <span className="font-mono text-[28px] leading-none font-bold tabular-nums">{summary.counts[key]}</span>
                  <span className="col-span-full text-sm text-ink-2">{OUTCOME_STYLE[key].meaning}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
      <section aria-labelledby="devices" className="flex flex-col gap-[18px]">
        <SectionTitle eyebrow="02 · DEVICES" title="Devices" id="devices">
          <div className="flex flex-wrap items-center gap-2.5">
            {outcome && (
              <button
                type="button"
                onClick={() => setOutcome(null)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-surface"
              >
                {OUTCOME_STYLE[outcome].label} <span aria-hidden>✕</span>
              </button>
            )}
            <input
              type="search"
              aria-label="Search devices"
              placeholder="Search ID or location"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-[46px] w-[min(300px,80vw)] rounded-full border border-line-strong bg-surface px-4 text-[15px] text-ink placeholder:text-ink-3"
            />
          </div>
        </SectionTitle>
        <ul aria-label="Devices" className={panelClass}>
          {shown.map((device) => (
            <li key={device.id} className="border-b border-sunken last:border-b-0">
              <Link
                to={`/device/${encodeURIComponent(device.id)}`}
                className="grid min-h-[72px] grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] items-center gap-x-6 gap-y-2 px-6 py-3.5 text-ink no-underline hover:bg-raised"
              >
                <span className="flex items-center gap-3">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: outcomeColours(device.latest_outcome).fg }} />
                  <span className="font-mono text-[15px] font-bold">{device.id}</span>
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-semibold">{device.model}</span>
                  <span className="text-[13px] text-ink-2">{device.location}</span>
                </span>
                <span className="flex items-center justify-between gap-3">
                  <OutcomeBadge outcome={device.latest_outcome} />
                  <span aria-hidden className="flex size-9 items-center justify-center rounded-full border border-line text-accent">
                    →
                  </span>
                </span>
              </Link>
            </li>
          ))}
          {shown.length === 0 && (
            <li className="px-6 py-10 text-center text-ink-2">
              No devices match.{' '}
              <button type="button" onClick={clear} className="font-semibold text-accent underline">
                Clear filters
              </button>
            </li>
          )}
        </ul>
      </section>
    </>
  )
}

/** One bar split by outcome, so the mix shows at a glance; the cards below carry the numbers in words. */
function OutcomeBar({ summary, selected }: { summary: FleetSummary; selected: Outcome | null }) {
  const total = OUTCOMES.reduce((sum, key) => sum + summary.counts[key], 0)
  if (total === 0) return null
  const label = OUTCOMES.filter((key) => summary.counts[key] > 0)
    .map((key) => `${summary.counts[key]} ${OUTCOME_STYLE[key].label}`)
    .join(', ')
  return (
    <div role="img" aria-label={`Devices per outcome: ${label}`} className="flex h-[18px] gap-[3px] overflow-hidden rounded-full bg-sunken">
      {OUTCOMES.filter((key) => summary.counts[key] > 0).map((key) => (
        <span
          key={key}
          className="h-full transition-opacity duration-300"
          style={{
            width: `${(summary.counts[key] / total) * 100}%`,
            background: outcomeColours(key).fg,
            opacity: selected && selected !== key ? 0.25 : 1,
          }}
        />
      ))}
    </div>
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
    // Two tiles per row on phones (the odd last one spans both), one row of five on desktop.
    <ul
      aria-label="Fleet stats"
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-3 max-sm:[&>li:last-child:nth-child(odd)]:col-span-2"
    >
      {tiles.map((tile) => (
        // Status is shown with an icon and words, never colour alone.
        <li
          key={tile.label}
          className={`flex min-w-0 flex-col gap-1.5 rounded-[18px] border px-5 py-[18px] backdrop-blur-[6px] ${
            tile.tone === 'danger' ? 'border-danger-line bg-danger-bg' : 'border-white/10 bg-white/4'
          }`}
        >
          <span className="font-mono text-[11px] font-semibold tracking-[.1em] text-night-fg3 uppercase">{tile.label}</span>
          <span
            className={`flex items-center gap-2.5 text-[clamp(32px,3.2vw,46px)] leading-none font-[750] tracking-[-.03em] tabular-nums ${
              tile.tone === 'ok' ? 'text-ok' : tile.tone === 'danger' ? 'text-danger' : 'text-white'
            }`}
          >
            {tile.tone === 'ok' && <span aria-hidden className="text-[0.6em]">✔</span>}
            {tile.tone === 'danger' && <span aria-hidden className="text-[0.6em]">✘</span>}
            {tile.value}
          </span>
          <span className="text-[13px] break-words text-night-fg2">{tile.sub}</span>
        </li>
      ))}
    </ul>
  )
}
