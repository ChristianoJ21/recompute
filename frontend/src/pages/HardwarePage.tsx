import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { describeError, getContact, getDevice, getListings } from '../api/client'
import type { Contact, Listing, Outcome, PassportEvent } from '../api/types'
import { SaveButton } from '../components/CustomerActions'
import { DeviceStage } from '../components/DeviceStage'
import { IntegrityBadge } from '../components/IntegrityBadge'
import { SolidBadge } from '../components/SolidBadge'
import { Sparkline } from '../components/Sparkline'
import {
  EmptyState,
  ErrorNotice,
  HandNote,
  HeroChip,
  HeroText,
  Loading,
  PageHero,
  container,
  monoLabel,
  primaryButton,
  secondaryButton,
} from '../components/ui'
import { Chip } from '../design/Art'
import { formatComponents, formatDate, formatDateTime, formatDeviceType, formatPrice, locationSite, telemetryReadings } from '../lib/format'
import { useFavourites } from '../lib/favourites'
import { enquiryLink } from '../lib/listing'
import { OUTCOME_STYLE, outcomeColours } from '../lib/outcomes'
import { telemetrySeries } from '../lib/telemetry'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; listings: Listing[]; contact: Contact }

type Sort = 'desc' | 'asc'

/** Public "Available hardware" (PRD 15.1): released devices with their passport; buyers e-mail, no buy button. */
export function HardwarePage() {
  const favourites = useFavourites()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [filter, setFilter] = useState<Outcome | 'all'>('all')
  const [sort, setSort] = useState<Sort>('desc')
  const history = useListingHistory(state.status === 'ready' ? state.listings : null)

  useEffect(() => {
    let active = true
    Promise.all([getListings(), getContact()])
      .then(([listings, contact]) => {
        if (active) setState({ status: 'ready', listings, contact })
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

  const listings = state.status === 'ready' ? state.listings : []
  const shown = listings
    .filter((listing) => filter === 'all' || listing.latest_outcome === filter)
    .sort((a, b) => (sort === 'desc' ? b.price.amount - a.price.amount : a.price.amount - b.price.amount))

  return (
    <>
      <PageHero
        eyebrow={<HeroChip live>{heroChip(state)}</HeroChip>}
        title="Available hardware"
        mascot={
          <div data-reveal="1" className="flex items-end gap-1.5">
            <HandNote className="max-w-[9em] -rotate-3 pb-10 text-right">pick one and read its passport</HandNote>
            <Chip pose="carry" anim={['bob', 'blink']} parallax={0.05} className="aspect-[204/214] w-[140px]" />
          </div>
        }
      >
        <HeroText>
          Released devices are listed below with their passport and data-wipe record. The QR label on each device opens it.
          Buyers e-mail the data centre; there is no shop or checkout.
        </HeroText>
      </PageHero>
      <section aria-labelledby="listed" className="py-[clamp(16px,2vw,32px)]">
        <div className={`${container} flex flex-col gap-[clamp(24px,3vw,40px)]`}>
          <h2 id="listed" className="sr-only">
            Listed hardware
          </h2>
          {state.status === 'ready' && listings.length > 0 && (
            <Toolbar listings={listings} shown={shown.length} filter={filter} onFilter={setFilter} sort={sort} onSort={setSort} />
          )}
          {state.status === 'loading' && <Loading label="Loading listings…" />}
          {state.status === 'error' && <ErrorNotice message={state.message} onRetry={retry} />}
          {state.status === 'ready' &&
            (listings.length === 0 ? (
              <EmptyState title="No hardware is listed right now">Released devices appear here with their passport.</EmptyState>
            ) : (
              <ul
                aria-label="Listed hardware"
                data-stagger="1"
                className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-[clamp(18px,2.4vw,28px)]"
              >
                {shown.map((listing, i) => (
                  <ListingCard
                    key={listing.device_id}
                    listing={listing}
                    events={history[listing.device_id] ?? []}
                    email={state.contact.email}
                    tilt={TILTS[i % TILTS.length]}
                    saved={favourites.saved?.includes(listing.device_id) ?? null}
                    onToggleSave={favourites.toggle}
                  />
                ))}
              </ul>
            ))}
        </div>
      </section>
      {state.status === 'ready' && <ContactBand contact={state.contact} />}
    </>
  )
}

function heroChip(state: State): string {
  if (state.status !== 'ready') return 'AVAILABLE HARDWARE'
  const count = state.listings.length
  const changed = state.listings.filter((listing) => !listing.passport_intact).length
  const devices = `${count} ${count === 1 ? 'DEVICE' : 'DEVICES'} RELEASED`
  if (count === 0) return devices
  return `${devices} · ${changed === 0 ? 'PASSPORTS INTACT' : `${changed} PASSPORT${changed === 1 ? '' : 'S'} CHANGED`}`
}

/** Each listed device's passport events, for its telemetry trend; a failed read just leaves the trend out. */
function useListingHistory(listings: Listing[] | null): Record<string, PassportEvent[]> {
  const [history, setHistory] = useState<Record<string, PassportEvent[]>>({})
  const ids = listings?.map((listing) => listing.device_id).join('|') ?? ''
  useEffect(() => {
    if (!ids) return
    let active = true
    for (const id of ids.split('|')) {
      getDevice(id)
        .then((detail) => {
          if (active) setHistory((current) => ({ ...current, [id]: detail.events }))
        })
        .catch(() => {})
    }
    return () => {
      active = false
    }
  }, [ids])
  return history
}

interface ToolbarProps {
  listings: Listing[]
  shown: number
  filter: Outcome | 'all'
  onFilter: (filter: Outcome | 'all') => void
  sort: Sort
  onSort: (sort: Sort) => void
}

const chip =
  'inline-flex min-h-11 items-center gap-2 rounded-[14px] border-2 px-4 text-sm font-bold transition-[scale,background-color] duration-200 ease-spring active:scale-95'

function Toolbar({ listings, shown, filter, onFilter, sort, onSort }: ToolbarProps) {
  const outcomes = [...new Set(listings.map((listing) => listing.latest_outcome))].filter((o): o is Outcome => o !== null)
  const options: { key: Outcome | 'all'; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: listings.length },
    ...outcomes.map((outcome) => ({
      key: outcome,
      label: titleCase(OUTCOME_STYLE[outcome].label),
      count: listings.filter((listing) => listing.latest_outcome === outcome).length,
    })),
  ]
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-4">
      <span className="rc-eyebrow text-ink-2">
        Showing {shown} of {listings.length}
      </span>
      <div className="flex flex-wrap items-center gap-2.5">
        <div role="group" aria-label="Filter by outcome" className="flex flex-wrap gap-1.5">
          {options.map((option) => {
            const on = filter === option.key
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={on}
                onClick={() => onFilter(option.key)}
                className={`${chip} ${on ? 'border-ink bg-ink text-surface' : 'border-line-strong bg-surface text-ink hover:border-ink'}`}
              >
                {option.label}
                <span className={`min-w-[22px] rounded-full px-[7px] py-px text-center font-mono text-xs ${on ? 'bg-surface/25' : 'bg-sunken'}`}>{option.count}</span>
              </button>
            )
          })}
        </div>
        <button type="button" onClick={() => onSort(sort === 'desc' ? 'asc' : 'desc')} className={`${chip} border-line-strong bg-surface text-ink hover:border-ink`}>
          Price {sort === 'desc' ? 'high → low' : 'low → high'}
        </button>
      </div>
    </div>
  )
}

const titleCase = (label: string) => label[0] + label.slice(1).toLowerCase()

const TILTS = [-0.8, 0.6, -0.5, 0.9]

interface ListingCardProps {
  listing: Listing
  events: PassportEvent[]
  email: string
  /** How crooked the card sits, in degrees. */
  tilt: number
  /** Whether a logged-in customer saved it; null for visitors and technicians (no Save button). */
  saved: boolean | null
  onToggleSave: (deviceId: string) => void
}

function ListingCard({ listing, events, email, tilt, saved, onToggleSave }: ListingCardProps) {
  const colours = outcomeColours(listing.latest_outcome)
  const util = telemetrySeries(events, 'utilization_pct')
  const telemetry = listing.latest_telemetry
  const readings = telemetry ? telemetryReadings(telemetry.payload).filter((reading) => reading.label !== 'util') : []
  const latestUtil = telemetry?.payload.utilization_pct
  // Older backends (contract < v2.5) send no location, e.g. while Vercel and Render redeploy at different times.
  const site = listing.location ? (locationSite(listing.location) ?? listing.location) : null
  const specs: [string, string][] = [
    ['type', formatDeviceType(listing.device_type)],
    ['installed', formatDate(listing.install_date)],
    ['components', formatComponents(listing.components) || 'none recorded'],
    ['reliability', listing.reliability_ok ? '✔ Check passed' : '✘ Check failed'],
    ['data wipe', listing.wiped_at ? formatDateTime(listing.wiped_at) : 'not recorded'],
    readings.length > 0
      ? [readings.map((r) => r.label).join(' · '), readings.map((r) => r.value).join(' · ')]
      : ['telemetry', 'none yet'],
  ]
  return (
    <li className="flex">
      <article
        data-wiggle-host="1"
        style={{ '--tilt': `${tilt}deg` } as CSSProperties}
        className="relative flex w-full rotate-[var(--tilt)] flex-col gap-4 rounded-[24px] bg-surface p-3.5 pb-5 shadow-panel transition-[translate,rotate,box-shadow] duration-300 ease-spring hover:-translate-y-1.5 hover:rotate-0 hover:shadow-panel-hover"
      >
        <DeviceStage deviceType={listing.device_type} components={listing.components} height={168}>
          <span className="absolute top-2.5 left-2.5">
            <SolidBadge outcome={listing.latest_outcome} />
          </span>
          <span className="absolute top-2.5 right-2.5">
            <IntegrityBadge integrity={{ status: listing.passport_intact ? 'intact' : 'changed' }} />
          </span>
        </DeviceStage>
        <div className="flex flex-col gap-1 px-1.5">
          <span className="font-mono text-base leading-none font-extrabold">{listing.device_id}</span>
          <h3 className="text-[22px] leading-[1.15] font-extrabold tracking-[-.01em]">{listing.model}</h3>
          {site && (
            <span className="flex flex-wrap items-baseline gap-x-2 pt-1">
              <span className={monoLabel}>Sample location</span>
              <span className="text-sm font-bold">{site}</span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 border-y-2 border-dashed border-line px-1.5 py-3.5">
          <div className="flex min-w-0 flex-col gap-1">
            <span className={monoLabel}>Sample asking price</span>
            <span className="font-display text-[clamp(30px,3vw,38px)] leading-[1.05] font-extrabold tracking-[-.01em] tabular-nums">{formatPrice(listing.price)}</span>
          </div>
          <div className="flex min-w-[130px] flex-[0_1_180px] flex-col gap-1">
            <span className="flex justify-between font-mono text-[11px] text-ink-2">
              <span>util</span>
              <strong className="text-ink">{typeof latestUtil === 'number' ? `${latestUtil} %` : '—'}</strong>
            </span>
            <Sparkline values={util} colour={colours.dot} height={40} />
          </div>
        </div>
        <dl className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))] gap-x-4 gap-y-3 px-1.5">
          {specs.map(([key, value]) => (
            <div key={key} className="flex min-w-0 flex-col gap-0.5">
              <dt className="font-mono text-[11px] tracking-[.06em] text-ink-2">{key}</dt>
              <dd className="text-sm font-bold break-words">{value}</dd>
            </div>
          ))}
        </dl>
        {listing.note && <p className="rc-hand px-1.5 text-lg leading-[1.2]">{listing.note}</p>}
        <div className="mt-auto flex flex-wrap gap-3 px-1.5 pt-1">
          <Link to={`/device/${encodeURIComponent(listing.device_id)}`} className={`${primaryButton} flex-[1_1_200px]`}>
            Open the passport →
          </Link>
          {/* Opens the visitor's own e-mail app: no account, and the app stores nothing. */}
          <a href={enquiryLink(email, listing.device_id)} className={`${secondaryButton} flex-[1_1_200px]`}>
            Ask about this device
          </a>
          {saved !== null && <SaveButton deviceId={listing.device_id} saved={saved} onToggle={onToggleSave} className="flex-[1_1_120px]" />}
        </div>
      </article>
    </li>
  )
}

const contactRow = 'border-b-2 border-dashed border-line py-4'

function ContactBand({ contact }: { contact: Contact }) {
  return (
    <section aria-labelledby="contact" className="mt-[clamp(24px,4vw,48px)] rounded-t-[clamp(28px,4vw,56px)] bg-band">
      <div className={`${container} grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-x-[clamp(40px,6vw,96px)] gap-y-10 py-[clamp(56px,7vw,96px)]`}>
        <div className="flex flex-col gap-4">
          <span className="rc-eyebrow text-redeploy">02 · CONTACT THE DATA CENTRE</span>
          <h2 id="contact" className="text-[clamp(34px,4.4vw,56px)] leading-[.95] font-extrabold tracking-[-.02em]">
            Interested in a device?
          </h2>
          <p className="max-w-[46ch] text-[clamp(16px,1.3vw,19px)] leading-[1.55] font-medium text-ink">
            E-mail the data centre with its device ID. There is no order form; your own e-mail app opens.
          </p>
          <a href={`mailto:${contact.email}`} className={`${primaryButton} mt-1.5 min-h-14 self-start px-[26px]`}>
            {contact.email}
            <span aria-hidden>→</span>
          </a>
        </div>
        <div className="relative">
          <Chip pose="wave" anim={['wave', 'blink', 'antenna']} eyes className="absolute -top-[84px] right-4 aspect-[204/214] w-[100px]" />
          <dl className="relative grid grid-cols-[max-content_minmax(0,1fr)] rounded-[24px] bg-surface shadow-panel">
            <span aria-hidden className="rc-tape" />
            <dt className={`${contactRow} px-5 pt-5 font-mono text-xs text-ink-2`}>organisation</dt>
            <dd className={`${contactRow} pt-5 pr-5 font-bold`}>{contact.organisation}</dd>
            {contact.phone && (
              <>
                <dt className={`${contactRow} px-5 font-mono text-xs text-ink-2`}>phone</dt>
                <dd className={`${contactRow} pr-5 font-bold`}>{contact.phone}</dd>
              </>
            )}
            <dt className={`${contactRow} px-5 font-mono text-xs text-ink-2`}>hours</dt>
            <dd className={`${contactRow} pr-5 font-bold`}>{contact.hours}</dd>
            <dt className="px-5 py-4 font-mono text-xs text-ink-2">note</dt>
            <dd className="py-4 pr-5 font-bold">{contact.note}</dd>
          </dl>
        </div>
      </div>
    </section>
  )
}
