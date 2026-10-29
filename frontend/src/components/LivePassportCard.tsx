import { useEffect, useState, type MouseEvent } from 'react'
import { getDevice } from '../api/client'
import type { DeviceDetail, Listing } from '../api/types'
import { usePassportCheck } from '../lib/passportCheck'
import { telemetrySeries } from '../lib/telemetry'
import { prefersReducedMotion } from '../lib/theme'
import { IntegrityBadge } from './IntegrityBadge'
import { OutcomeBadge } from './OutcomeBadge'
import { eventLabel } from './PassportHistory'
import { Sparkline } from './Sparkline'

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
  { key: 'utilization_pct', label: 'UTIL', unit: ' %', colour: '#9CCFAE' },
  { key: 'power_w', label: 'POWER', unit: ' W', colour: '#C2CF9A' },
  { key: 'inlet_temp_c', label: 'INLET', unit: ' °C', colour: '#9BC7BE' },
] as const

const mono = 'font-mono text-[11px] tracking-[.08em] text-night-fg3'

interface LivePassportCardProps {
  listing: Listing
  detail: DeviceDetail | null
}

/**
 * Hero card on the home page: the newest real events and sample telemetry of one released device.
 * "Passport intact" and the ✔ links appear only after GET /events/verify says the chain is valid.
 */
export function LivePassportCard({ listing, detail }: LivePassportCardProps) {
  const events = detail?.events ?? []
  const check = usePassportCheck(listing.device_id, events)
  const newestFirst = [...events].sort((a, b) => b.id - a.id)
  const [tilt, setTilt] = useState<[number, number]>([0, 0])

  const onMove = (event: MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion()) return
    const box = event.currentTarget.getBoundingClientRect()
    setTilt([(event.clientX - box.left) / box.width - 0.5, (event.clientY - box.top) / box.height - 0.5])
  }

  return (
    <div onMouseMove={onMove} onMouseLeave={() => setTilt([0, 0])} className="[perspective:1200px]">
      <section
        data-theme="dark"
        aria-label={`Live passport of ${listing.device_id}`}
        className="relative overflow-hidden rounded-[20px] border border-night-line bg-[linear-gradient(160deg,#16382A,#0B2116)] shadow-hero-card transition-transform duration-200 ease-out"
        style={{ transform: `rotateX(${(-tilt[1] * 6).toFixed(2)}deg) rotateY(${(tilt[0] * 8).toFixed(2)}deg)` }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-x-0 z-[2] h-20 animate-sweep bg-[linear-gradient(transparent,rgba(156,207,174,.08)_85%,rgba(156,207,174,.35))]" />
        <div className="flex flex-wrap items-center gap-2.5 border-b border-night-line px-5 py-4">
          <span className="font-mono text-[15px] font-bold text-white">{listing.device_id}</span>
          <OutcomeBadge outcome={listing.latest_outcome} />
          <span className="ml-auto">
            <IntegrityBadge integrity={check.integrity} live />
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2.5 px-5 py-[18px]">
          {TILES.map((tile) => {
            const series = telemetrySeries(events, tile.key)
            const latest = series.at(-1)
            return (
              <div key={tile.key} className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-night-line bg-white/3 p-3">
                <span className={mono}>{tile.label}</span>
                <span className="text-[clamp(18px,1.8vw,26px)] font-bold tracking-[-.02em] whitespace-nowrap text-white tabular-nums">
                  {latest === undefined ? '—' : `${latest}${tile.unit}`}
                </span>
                <Sparkline values={series} colour={tile.colour} height={32} />
              </div>
            )
          })}
        </div>
        <div className="flex flex-col gap-2.5 px-5 pb-5">
          <div className="flex items-baseline justify-between">
            <span className={`${mono} tracking-[.1em]`}>PASSPORT HISTORY · LIVE</span>
            <span className="font-mono text-[11px] text-night-ok">hash-linked</span>
          </div>
          <ol
            aria-label={`Newest events of ${listing.device_id}`}
            className="flex h-[228px] flex-col gap-1.5 overflow-hidden [mask-image:linear-gradient(#000_70%,transparent)]"
          >
            {newestFirst.slice(0, FEED_LENGTH).map((event, i) => {
              const link = check.linkState(event)
              const previous = newestFirst[i + 1]?.id
              const hash = event.hash ? `${event.hash.slice(0, 4)}…${event.hash.slice(-2)}` : ''
              return (
                <li
                  key={event.id}
                  className={`grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[10px] border px-3 py-[9px] font-mono text-xs ${
                    i === 0 ? 'animate-in border-night-accent/35 bg-night-accent/10' : 'border-night-line bg-white/[.025]'
                  }`}
                >
                  <span className="font-bold text-night-accent">#{event.id}</span>
                  <span className="truncate text-night-fg">
                    <span>{eventLabel(event.kind)}</span>
                    <span className="text-night-fg3">{`  ${hash}`}</span>
                  </span>
                  <span className="whitespace-nowrap">
                    {link === 'verified' && (
                      <span className="text-night-ok">{previous === undefined ? '✔ first' : `✔ → #${previous}`}</span>
                    )}
                    {link === 'bad' && <span className="text-danger">✘ changed</span>}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      </section>
    </div>
  )
}
