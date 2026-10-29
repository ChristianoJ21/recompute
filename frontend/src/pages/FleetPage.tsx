import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { describeError, getFleetSummary, getListings, listDevices, verifyEvents } from '../api/client'
import { OUTCOMES, type DeviceSummary, type FleetSummary, type Outcome } from '../api/types'
import { CustomerActivity } from '../components/CustomerActivity'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { SolidBadge } from '../components/SolidBadge'
import {
  EmptyState,
  ErrorNotice,
  HandNote,
  HeroChip,
  Loading,
  PageHero,
  SectionTitle,
  band,
  container,
  panelClass,
  primaryButton,
  secondaryButton,
} from '../components/ui'
import { Chip } from '../design/Art'
import { formatDateTime, locationSite } from '../lib/format'
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

/** "Jakarta, Batam" from locations like "Jakarta, Indonesia · Hall A / training"; "Hall A" when one names no city. */
const sites = (devices: DeviceSummary[]) =>
  [...new Set(devices.map((d) => locationSite(d.location)?.split(', ')[0] ?? d.location.split(' / ')[0]))].join(', ')
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
      <PageHero
        eyebrow={<HeroChip live>FLEET{ready ? ` · ${sites(ready.devices).toUpperCase()}` : ''}</HeroChip>}
        title="Fleet dashboard"
        aside={
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/devices/new" className={primaryButton}>
              + Add device
            </Link>
            <Link to="/technicians/new" className={secondaryButton}>
              + Add technician
            </Link>
          </div>
        }
        mascot={
          <div data-reveal="1" className="flex items-end gap-1.5">
            <HandNote className="max-w-[8em] -rotate-3 pb-10 text-right">the whole fleet at a glance</HandNote>
            <Chip pose="point" anim={['point', 'blink']} className="aspect-[204/214] w-[112px]" />
          </div>
        }
      >
        {ready && (
          <p className="text-[clamp(16px,1.35vw,19px)] font-medium text-ink-2">{`${sites(ready.devices)} · ${plural(ready.summary.devices, 'device')}`}</p>
        )}
      </PageHero>
      {ready && (
        <div className={`${container} pb-[clamp(16px,2vw,32px)]`}>
          <StatsTiles devices={ready.devices} summary={ready.summary} stats={ready.stats} />
        </div>
      )}
      <div className={band}>
        <div className={`${container} flex flex-col gap-[clamp(32px,4vw,56px)]`}>
          {state.status === 'loading' && <Loading label="Loading the fleet…" />}
          {state.status === 'error' && <ErrorNotice message={state.message} onRetry={retry} />}
          {state.status === 'ready' && <Fleet devices={state.devices} summary={state.summary} />}
          {state.status === 'ready' && <CustomerActivity />}
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
                  className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2.5 rounded-[20px] border-2 px-5 py-[18px] text-left text-ink shadow-panel transition-[translate,box-shadow] duration-200 ease-spring hover:-translate-y-[3px] hover:shadow-panel-hover ${
                    on ? '-translate-y-[3px] shadow-panel-hover' : 'border-transparent bg-surface'
                  }`}
                  style={on ? { background: colours.bg, borderColor: colours.dot } : undefined}
                >
                  <span className="justify-self-start">
                    <SolidBadge outcome={key} />
                  </span>
                  <span className="font-display text-[34px] leading-none font-extrabold tabular-nums">{summary.counts[key]}</span>
                  <span className="col-span-full text-sm font-medium text-ink-2">{OUTCOME_STYLE[key].meaning}</span>
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
                className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-ink px-4 text-sm font-bold text-surface"
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
              className="min-h-[46px] w-[min(300px,80vw)] rounded-[14px] border-2 border-line-strong bg-surface px-4 text-[15px] text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none"
            />
          </div>
        </SectionTitle>
        <ul aria-label="Devices" className={panelClass}>
          {shown.map((device) => (
            <li key={device.id} className="border-b-2 border-dashed border-line last:border-b-0">
              <Link
                to={`/device/${encodeURIComponent(device.id)}`}
                className="grid min-h-[72px] grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] items-center gap-x-6 gap-y-2 px-6 py-3.5 text-ink no-underline hover:bg-raised"
              >
                <span className="flex items-center gap-3">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: outcomeColours(device.latest_outcome).dot }} />
                  <span className="font-mono text-[15px] font-bold">{device.id}</span>
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-semibold">{device.model}</span>
                  <span className="text-[13px] text-ink-2">{device.location}</span>
                </span>
                <span className="flex items-center justify-between gap-3">
                  <OutcomeBadge outcome={device.latest_outcome} />
                  <span aria-hidden className="flex size-9 items-center justify-center rounded-[12px] bg-sunken font-extrabold text-ink">
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
            background: outcomeColours(key).dot,
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
    { label: 'Devices', value: String(summary.devices), sub: `in ${sites(devices)}` },
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
          className={`flex min-w-0 flex-col gap-1.5 rounded-[20px] px-5 py-[18px] shadow-panel ${
            tile.tone === 'danger' ? 'border-2 border-danger-line bg-danger-bg' : 'bg-surface'
          }`}
        >
          <span className="rc-eyebrow text-[11px] text-ink-2">{tile.label}</span>
          <span
            className={`flex items-center gap-2.5 font-display text-[clamp(30px,3vw,42px)] leading-none font-extrabold whitespace-nowrap tabular-nums ${
              tile.tone === 'ok' ? 'text-ok' : tile.tone === 'danger' ? 'text-danger' : 'text-ink'
            }`}
          >
            {tile.tone === 'ok' && <span aria-hidden className="text-[0.6em]">✔</span>}
            {tile.tone === 'danger' && <span aria-hidden className="text-[0.6em]">✘</span>}
            {tile.value}
          </span>
          <span className="text-[13px] font-medium break-words text-ink-2">{tile.sub}</span>
        </li>
      ))}
    </ul>
  )
}
