import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { getListings, verifyEvents } from '../api/client'
import type { Listing } from '../api/types'
import { DeviceStage } from '../components/DeviceStage'
import { HeroScene } from '../components/HeroScene'
import { HowItWorks } from '../components/HowItWorks'
import { LivePassportCard, useLiveDevice } from '../components/LivePassportCard'
import { SolidBadge } from '../components/SolidBadge'
import { Splash } from '../components/Splash'
import { HandNote, HeroChip, container, primaryButton, secondaryButton } from '../components/ui'
import { Art, Chip } from '../design/Art'
import { formatDateTime, formatPrice } from '../lib/format'
import { markIntroSeen, shouldPlayIntro } from '../lib/intro'
import { useWide } from '../lib/useMediaQuery'

/** Public home page: what ReCompute is, a live passport, how it works, and the released devices. */
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
      {intro && <Splash onDone={endIntro} />}
      <Hero listings={listings} live={live} />
      {featured && <LivePassport listing={featured} live={live} />}
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
  live: ReturnType<typeof useLiveDevice>
}

function Hero({ listings, live }: HeroProps) {
  const wide = useWide()
  const stats = useChainStats(listings)
  const count = listings?.length
  const newest = live?.events.reduce<string | null>((latest, event) => (!latest || event.created_at > latest ? event.created_at : latest), null)
  return (
    <section
      id="top"
      aria-labelledby="hero-h"
      className={`${container} grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-[clamp(28px,4vw,56px)] pt-[clamp(28px,5vw,64px)] pb-[clamp(24px,4vw,40px)]`}
    >
      <div className="relative z-[2] flex flex-col items-start gap-6">
        <HeroChip>
          AVAILABLE HARDWARE{count === undefined ? '' : ` · ${count} ${count === 1 ? 'DEVICE' : 'DEVICES'} RELEASED`}
        </HeroChip>
        <h1 id="hero-h" className="text-[clamp(46px,6.6vw,86px)] leading-[.94] font-extrabold tracking-[-.025em] text-balance">
          Second-life AI servers, each with a{' '}
          <span className="relative inline-block text-accent">
            passport
            <Art name="squiggle" className="absolute inset-x-0 -bottom-1.5 h-3 text-copper" />
          </span>{' '}
          <span className="text-accent">you can check.</span>
        </h1>
        <p className="max-w-[34em] text-[clamp(17px,1.5vw,19px)] leading-[1.6] font-medium text-pretty text-ink-2">
          ReCompute helps a data centre keep AI servers in use longer instead of scrapping them early. Every device carries a digital
          passport of what happened to it, a decision rule recommends its next life, and released hardware is listed here with that
          passport attached.
        </p>
        <div className="flex flex-wrap gap-3.5 pb-1.5">
          <a href="#hardware" className={`${primaryButton} px-[26px] py-[17px]`}>
            Browse hardware
            <span aria-hidden>↓</span>
          </a>
          <a href="#how" className={`${secondaryButton} px-[26px] py-[17px]`}>
            How it works
          </a>
        </div>
        <div className="flex w-full max-w-[560px] flex-col gap-2.5 border-t-2 border-dashed border-line pt-[18px] text-[15px] leading-[1.4] font-medium text-ink-2">
          <ul aria-label="Passport checks" className="flex flex-wrap items-center gap-x-7 gap-y-2.5">
            <li className="inline-flex items-baseline gap-2">
              {stats ? (
                <b data-count={stats.verified} className="font-display text-[28px] leading-none font-extrabold text-ink tabular-nums">
                  {stats.verified}
                </b>
              ) : (
                <b className="font-display text-[28px] leading-none font-extrabold text-ink">—</b>
              )}
              passport events verified
            </li>
            <li className="relative inline-flex items-center gap-2">
              <b className={`font-display text-[28px] leading-none font-extrabold ${stats && stats.broken > 0 ? 'text-danger' : 'text-accent'}`}>
                {stats ? stats.broken : '—'}
              </b>
              {stats && stats.broken > 0 && <span aria-hidden>✘ </span>}
              broken link{stats?.broken === 1 ? '' : 's'}
              <Art name="chain" anim={['links']} className="inline-block h-6 w-16" />
            </li>
          </ul>
          {newest && (
            <span>
              last event <b className="font-bold text-ink">{formatDateTime(newest)}</b>
            </span>
          )}
        </div>
      </div>
      <HeroScene wide={wide} />
    </section>
  )
}

function LivePassport({ listing, live }: { listing: Listing; live: ReturnType<typeof useLiveDevice> }) {
  return (
    <section className={`${container} flex flex-wrap items-center gap-[clamp(16px,3vw,40px)] py-[clamp(24px,4vw,48px)]`}>
      <div data-reveal="1" className="mx-auto flex max-w-[320px] flex-[1_1_220px] flex-col items-center gap-2">
        <Chip pose="magnify" anim={['magnify', 'blink']} parallax={0.04} className="aspect-[204/214] w-[min(220px,60vw)]" />
        <HandNote className="max-w-[15em] -rotate-2 text-center">Live: new readings show up here by themselves, and Chip re-checks the chain.</HandNote>
      </div>
      <div className="min-w-0 flex-[999_1_560px]">
        <LivePassportCard listing={listing} detail={live} />
      </div>
    </section>
  )
}

const TILTS = [-1.2, 0.8, -0.6, 1.1, -0.9, 0.7]

function Released({ listings }: { listings: Listing[] | null }) {
  return (
    <section
      id="hardware"
      aria-labelledby="hw-h"
      className="relative mt-[clamp(24px,4vw,48px)] rounded-t-[clamp(28px,4vw,56px)] bg-band"
    >
      <div className={`${container} pt-[clamp(48px,7vw,88px)] pb-[clamp(56px,7vw,96px)]`}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div data-reveal="1" className="flex max-w-[560px] flex-col gap-3">
            <span className="rc-eyebrow text-redeploy">02 · AVAILABLE HARDWARE</span>
            <h2 id="hw-h" className="text-[clamp(38px,5vw,60px)] leading-[.95] font-extrabold tracking-[-.02em]">
              Available hardware
            </h2>
            <p className="text-lg leading-[1.55] font-medium text-ink">Released devices are listed with their passport and data-wipe record.</p>
            <div className="pt-2">
              <Link to="/hardware" className={primaryButton}>
                See available hardware →
              </Link>
            </div>
          </div>
          <div data-reveal="1" className="flex items-end gap-1.5">
            <HandNote className="max-w-[10em] -rotate-3 pb-10 text-right">each one ships with its passport</HandNote>
            <Chip pose="carry" anim={['bob', 'blink']} parallax={0.05} className="aspect-[204/214] w-[150px]" />
          </div>
        </div>

        {listings && listings.length > 0 && (
          <ul
            aria-label="Released devices"
            data-stagger="1"
            className="mt-[clamp(28px,4vw,44px)] grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-[clamp(18px,2.4vw,28px)]"
          >
            {listings.map((listing, i) => {
              const [kind, ...rest] = listing.model.split(' · ')
              return (
                <li key={listing.device_id} className="flex">
                  <Link
                    to={`/device/${encodeURIComponent(listing.device_id)}`}
                    data-wiggle-host="1"
                    style={{ '--tilt': `${TILTS[i % TILTS.length]}deg` } as CSSProperties}
                    className="relative flex w-full rotate-[var(--tilt)] flex-col gap-3 rounded-[24px] bg-surface px-3.5 pt-3.5 pb-[18px] text-ink no-underline shadow-panel transition-[translate,rotate,scale,box-shadow] duration-300 ease-spring hover:-translate-y-2 hover:rotate-0 hover:text-ink hover:shadow-panel-hover active:-translate-y-0.5 active:scale-[.98]"
                  >
                    <DeviceStage deviceType={listing.device_type} components={listing.components}>
                      <span className="absolute top-2.5 left-2.5">
                        <SolidBadge outcome={listing.latest_outcome} />
                      </span>
                    </DeviceStage>
                    <div className="flex flex-col gap-1.5 px-1">
                      <span className="font-mono text-base leading-none font-extrabold">{listing.device_id}</span>
                      <span className="text-[14.5px] leading-[1.45] font-medium text-pretty text-ink-2">
                        <b className="font-bold text-ink">{kind}</b>
                        {rest.length > 0 && ` · ${rest.join(' · ')}`}
                      </span>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2.5 border-t-2 border-dashed border-line px-1 pt-3">
                      <span className="font-display text-2xl leading-none font-extrabold tabular-nums">{formatPrice(listing.price)}</span>
                      <span aria-hidden className="grid size-10 place-items-center rounded-[13px] bg-sunken text-lg font-extrabold">
                        →
                      </span>
                    </div>
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
