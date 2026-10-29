import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getListings, verifyEvents } from '../api/client'
import type { Listing } from '../api/types'
import { HomeIntro } from '../components/HomeIntro'
import { HowItWorks } from '../components/HowItWorks'
import { LivePassportCard, useLiveDevice } from '../components/LivePassportCard'
import { SolidBadge } from '../components/SolidBadge'
import { HeroChip, NightBackdrop, SectionTitle, container, nightButton, nightGhostButton, primaryButton } from '../components/ui'
import { formatDateTime, formatPrice } from '../lib/format'
import { markIntroSeen, shouldPlayIntro } from '../lib/intro'
import { outcomeColours } from '../lib/outcomes'

/** Public home page (v3): what ReCompute is, a live passport, how it works, and the released devices. */
export function HomePage() {
  const [intro, setIntro] = useState(shouldPlayIntro)
  useEffect(() => {
    if (intro) markIntroSeen() // seen once it starts, so leaving mid-intro does not replay it
  }, [intro])
  const endIntro = useCallback(() => setIntro(false), [])
  const [listings, setListings] = useState<Listing[] | null>(null)
  useEffect(() => {
    let active = true
    getListings()
      .then((value) => {
        if (active) setListings(value)
      })
      .catch(() => {
        if (active) setListings([]) // the hardware page shows the error and a retry
      })
    return () => {
      active = false
    }
  }, [])

  const featured = listings?.[0] ?? null
  const live = useLiveDevice(featured?.device_id ?? null)
  const events = live?.events ?? []

  return (
    <>
      {intro && <HomeIntro onDone={endIntro} />}
      <Hero listings={listings} featured={featured} live={live} />
      <HowItWorks events={events} listing={featured} />
      <Released listings={listings} />
    </>
  )
}

interface ChainStats {
  verified: number
  broken: number
}

/** The real chain check of every released passport: events verified (valid chains) and broken chains. */
function useChainStats(listings: Listing[] | null): ChainStats | null {
  const [stats, setStats] = useState<ChainStats | null>(null)
  const ids = listings?.map((listing) => listing.device_id).join('|') ?? ''
  useEffect(() => {
    if (!ids) return
    let active = true
    Promise.allSettled(ids.split('|').map((id) => verifyEvents(id))).then((results) => {
      if (!active) return
      const checks = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
      setStats({
        verified: checks.filter((check) => check.valid).reduce((sum, check) => sum + check.events_checked, 0),
        broken: checks.filter((check) => !check.valid).length,
      })
    })
    return () => {
      active = false
    }
  }, [ids])
  return stats
}

interface HeroProps {
  listings: Listing[] | null
  featured: Listing | null
  live: ReturnType<typeof useLiveDevice>
}

function Hero({ listings, featured, live }: HeroProps) {
  const stats = useChainStats(listings)
  const count = listings?.length
  const newest = live?.events.reduce<string | null>((latest, event) => (!latest || event.created_at > latest ? event.created_at : latest), null)
  return (
    <section data-band aria-labelledby="hero-h" className="relative overflow-hidden bg-night text-night-fg">
      <NightBackdrop />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[25%] -left-[10%] h-[60%] w-[40%] animate-glow-slow bg-[radial-gradient(closest-side,rgba(19,114,58,.12),transparent)] blur-[20px]"
      />
      <div className={`${container} relative grid grid-cols-[repeat(auto-fit,minmax(min(100%,520px),1fr))] items-center gap-[clamp(40px,5vw,88px)] pt-[clamp(48px,7vw,120px)] pb-[clamp(56px,7vw,112px)]`}>
        <div className="flex animate-rise flex-col gap-[clamp(18px,2vw,28px)]">
          <HeroChip live>
            AVAILABLE HARDWARE{count === undefined ? '' : ` · ${count} ${count === 1 ? 'DEVICE' : 'DEVICES'} RELEASED`}
          </HeroChip>
          <h1 id="hero-h" className="text-[clamp(40px,6.2vw,96px)] leading-[.98] font-[750] tracking-[-.045em] text-balance text-white">
            Second-life AI servers, each with a{' '}
            <span className="text-night-accent">passport you can check.</span>
          </h1>
          <p className="max-w-[58ch] text-[clamp(16px,1.35vw,19px)] text-pretty text-night-fg2">
            ReCompute helps a data centre keep AI servers in use longer instead of scrapping them early. Every device carries a
            digital passport of what happened to it, a decision rule recommends its next life, and released hardware is listed
            here with that passport attached.
          </p>
          <div className="mt-1 flex flex-wrap gap-3">
            <Link to="/hardware" className={`${nightButton} min-h-[54px] px-[26px] text-base`}>
              Browse hardware
              <span aria-hidden>↓</span>
            </Link>
            <a href="#how" className={`${nightGhostButton} min-h-[54px] px-6 text-base`}>
              How it works
            </a>
          </div>
          <ul
            aria-label="Passport checks"
            className="mt-2 flex flex-wrap gap-x-7 gap-y-2.5 border-t border-white/8 pt-5 font-mono text-[13px] text-night-fg3"
          >
            <li>
              <strong className="text-[15px] text-white">{stats ? stats.verified : '—'}</strong> passport events verified
            </li>
            <li>
              <strong className={`text-[15px] ${stats && stats.broken > 0 ? 'text-danger' : 'text-night-ok'}`}>
                {stats ? stats.broken : '—'}
              </strong>{' '}
              {stats && stats.broken > 0 && <span aria-hidden>✘ </span>}
              broken link{stats?.broken === 1 ? '' : 's'}
            </li>
            {newest && (
              <li>
                last event <strong className="text-white">{formatDateTime(newest)}</strong>
              </li>
            )}
          </ul>
        </div>
        {featured && (
          <div className="animate-rise [animation-delay:200ms]">
            <LivePassportCard listing={featured} detail={live} />
          </div>
        )}
      </div>
    </section>
  )
}

function Released({ listings }: { listings: Listing[] | null }) {
  return (
    <section aria-labelledby="hw-h" className="border-t border-line bg-surface py-[clamp(56px,7vw,112px)]">
      <div className={`${container} grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-x-[clamp(40px,6vw,120px)] gap-y-8`}>
        <div className="flex flex-col gap-3.5">
          <SectionTitle eyebrow="02 · AVAILABLE HARDWARE" title="Available hardware" id="hw-h" />
          <p className="max-w-[48ch] text-[clamp(16px,1.3vw,18px)] text-pretty text-ink-2">
            Released devices are listed with their passport and data-wipe record.
          </p>
          <Link to="/hardware" className={`${primaryButton} mt-1.5 min-h-[54px] self-start px-[26px] text-base`}>
            See available hardware →
          </Link>
        </div>
        {listings && listings.length > 0 && (
          <ul aria-label="Released devices" className="flex flex-col gap-3">
            {listings.map((listing, i) => {
              const colours = outcomeColours(listing.latest_outcome)
              return (
                <li key={listing.device_id} className="animate-rise" style={{ animationDelay: `${i * 120}ms` }}>
                  <Link
                    to="/hardware"
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-1.5 rounded-[18px] border px-[22px] py-[18px] text-ink no-underline transition-[translate,box-shadow] duration-200 hover:translate-x-1 hover:shadow-[0_18px_40px_-22px_rgba(14,17,22,.45)]"
                    style={{ background: colours.bg, borderColor: colours.line }}
                  >
                    <span className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-sm font-bold">{listing.device_id}</span>
                      <SolidBadge outcome={listing.latest_outcome} />
                    </span>
                    <span aria-hidden className="row-span-2 text-[22px]">
                      →
                    </span>
                    <span className="flex flex-wrap items-baseline justify-between gap-3">
                      <span className="text-[15px] text-ink-2">{listing.model}</span>
                      <strong className="text-[clamp(20px,1.8vw,26px)] tracking-[-.02em] tabular-nums">{formatPrice(listing.price)}</strong>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
