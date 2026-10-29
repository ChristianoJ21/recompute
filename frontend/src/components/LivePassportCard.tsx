import { useEffect, useState } from 'react'
import { getDevice } from '../api/client'
import type { DeviceDetail, Listing } from '../api/types'
import { usePassportCheck } from '../lib/passportCheck'
import { telemetrySeries } from '../lib/telemetry'
import { IntegrityBadge } from './IntegrityBadge'
import { OutcomeBadge } from './OutcomeBadge'
import { eventLabel } from './PassportHistory'
import { Sparkline } from './Sparkline'
import { LiveDot } from './ui'

/** The card re-reads the passport this often, so readings logged by the telemetry agent appear by themselves. */
export const LIVE_REFRESH_MS = 15000
const FEED_LENGTH = 6

/** The device's passport, read again every LIVE_REFRESH_MS while the page is visible; null until the first answer or without an id. */
export function useLiveDevice(id: string | null): DeviceDetail | null {
  const [detail, setDetail] = useState<DeviceDetail | null>(null)
  useEffect(() => {
    if (!id) return
    let active = true
    const load = () => {
      if (document.hidden) return
      getDevice(id)
        .then((value) => {
          if (active) setDetail(value)
        })
        .catch(() => {}) // keeps the last good answer; the hardware page shows errors
    }
    load()
    const timer = setInterval(load, LIVE_REFRESH_MS)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [id])
  return detail
}

const TILES = [
  { key: 'utilization_pct', label: 'UTIL', unit: ' %', colour: 'var(--color-accent-fill)' },
  { key: 'power_w', label: 'POWER', unit: ' W', colour: 'var(--color-copper)' },
  { key: 'inlet_temp_c', label: 'INLET', unit: ' °C', colour: 'var(--color-ink-2)' },
] as const

interface LivePassportCardProps {
  listing: Listing
  detail: DeviceDetail | null
}

/**
 * Card on the home page: the newest real events and sample telemetry of one released device, taped to the page.
 * "Passport intact" and the ✔ links appear only after GET /events/verify says the chain is valid.
 */
export function LivePassportCard({ listing, detail }: LivePassportCardProps) {
  const events = detail?.events ?? []
  const check = usePassportCheck(listing.device_id, events)
  const newestFirst = [...events].sort((a, b) => b.id - a.id)

  return (
    <section
      data-reveal="1"
      aria-label={`Live passport of ${listing.device_id}`}
      className="relative min-w-0 -rotate-[.6deg] rounded-[28px] bg-surface p-[clamp(18px,2.4vw,28px)] shadow-float"
    >
      <span aria-hidden className="rc-tape" />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <span className="font-mono text-[22px] leading-none font-extrabold tracking-[-.01em]">{listing.device_id}</span>
        <OutcomeBadge outcome={listing.latest_outcome} size="md" tilt />
        <span className="ml-auto">
          <IntegrityBadge integrity={check.integrity} live />
        </span>
      </div>
      <div data-draw="1" className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {TILES.map((tile) => {
          const series = telemetrySeries(events, tile.key)
          const latest = series.at(-1)
          return (
            <div key={tile.key} className="flex min-w-0 flex-col gap-1.5 rounded-[18px] bg-sunken px-3.5 pt-3.5 pb-2.5">
              <span className="text-xs leading-none font-bold tracking-[.16em] text-ink-2">{tile.label}</span>
              <span className="font-display text-[32px] leading-none font-extrabold tabular-nums">
                {latest === undefined ? '—' : `${latest}${tile.unit}`}
              </span>
              <Sparkline values={series} colour={tile.colour} height={34} draw />
            </div>
          )
        })}
      </div>
      <div className="mx-0.5 mt-[22px] mb-2.5 flex items-baseline justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs leading-none font-bold tracking-[.16em] text-ink-2">
          <LiveDot />
          PASSPORT HISTORY · LIVE
        </span>
        <span className="rc-hand text-lg leading-none">hash-linked</span>
      </div>
      <ol
        aria-label={`Newest events of ${listing.device_id}`}
        className="flex flex-col gap-2 [mask-image:linear-gradient(to_bottom,#000_72%,transparent)]"
      >
        {newestFirst.slice(0, FEED_LENGTH).map((event, i) => {
          const link = check.linkState(event)
          const previous = newestFirst[i + 1]?.id
          const hash = event.hash ? `${event.hash.slice(0, 4)}…${event.hash.slice(-2)}` : ''
          return (
            <li
              key={event.id}
              className={`grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] bg-sunken px-3.5 py-[11px] font-mono text-[15px] leading-[1.3] ${
                i === 0 ? 'animate-in' : ''
              }`}
            >
              <b className="text-accent">#{event.id}</b>
              <span className="truncate">
                <span>{eventLabel(event.kind)}</span>
                <span className="text-ink-2">{`  ${hash}`}</span>
              </span>
              <span className="whitespace-nowrap text-ink-2">
                {link === 'verified' && (
                  <>
                    {previous === undefined ? '✔ first' : '✔ → '}
                    {previous !== undefined && <b className="text-ink">#{previous}</b>}
                  </>
                )}
                {link === 'bad' && <span className="font-bold text-danger">✘ changed</span>}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
