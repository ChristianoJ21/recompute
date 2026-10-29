import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { describeError, getContact, getDevice, getListings } from '../api/client'
import type { Contact, Listing, Outcome, PassportEvent } from '../api/types'
import { IntegrityBadge } from '../components/IntegrityBadge'
import { SolidBadge } from '../components/SolidBadge'
import { Sparkline } from '../components/Sparkline'
import {
  EmptyState,
  ErrorNotice,
  HeroChip,
  HeroText,
  Loading,
  PageHero,
  container,
  monoLabel,
  primaryButton,
  secondaryButton,
} from '../components/ui'
import { formatComponents, formatDate, formatDateTime, formatDeviceType, formatPrice, telemetryReadings } from '../lib/format'
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
      <PageHero eyebrow={<HeroChip live>{heroChip(state)}</HeroChip>} title="Available hardware">
        <HeroText>
          Released devices are listed below with their passport and data-wipe record. The QR label on each device opens it.
          Buyers e-mail the data centre; there is no shop or checkout.
        </HeroText>
      </PageHero>
      <section aria-labelledby="listed" className="bg-surface py-[clamp(32px,4vw,56px)]">
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
              <ul aria-label="Listed hardware" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,520px),1fr))] gap-[clamp(16px,2vw,28px)]">
                {shown.map((listing, i) => (
                  <ListingCard
                    key={listing.device_id}
                    listing={listing}
                    events={history[listing.device_id] ?? []}
                    email={state.contact.email}
                    delay={i * 120}
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

const chip = 'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-200'

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
      <span className="font-mono text-[13px] text-ink-2">
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
                className={`${chip} ${on ? 'border-ink bg-ink text-surface' : 'border-line-strong bg-transparent text-ink hover:border-ink'}`}
              >
                {option.label}
                <span className={`min-w-[22px] rounded-full px-[7px] py-px font-mono text-xs ${on ? 'bg-white/20' : 'bg-sunken'}`}>{option.count}</span>
              </button>
            )
          })}
        </div>
        <button type="button" onClick={() => onSort(sort === 'desc' ? 'asc' : 'desc')} className={`${chip} border-line-strong text-ink hover:border-ink`}>
          Price {sort === 'desc' ? 'high → low' : 'low → high'}
        </button>
      </div>
    </div>
  )
}

const titleCase = (label: string) => label[0] + label.slice(1).toLowerCase()

interface ListingCardProps {
  listing: Listing
  events: PassportEvent[]
  email: string
  /** Stagger of the rise-in animation, in ms. */
  delay: number
}

function ListingCard({ listing, events, email, delay }: ListingCardProps) {
  const colours = outcomeColours(listing.latest_outcome)
  const util = telemetrySeries(events, 'utilization_pct')
  const telemetry = listing.latest_telemetry
  const readings = telemetry ? telemetryReadings(telemetry.payload).filter((reading) => reading.label !== 'util') : []
  const latestUtil = telemetry?.payload.utilization_pct
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
    <li
      className="flex animate-rise flex-col overflow-hidden rounded-[22px] border border-line bg-surface shadow-panel transition-shadow duration-200 hover:shadow-panel-hover"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex flex-col gap-3.5 border-b px-6 py-[22px]" style={{ background: colours.bg, borderColor: colours.line }}>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-sm font-bold">{listing.device_id}</span>
          <SolidBadge outcome={listing.latest_outcome} />
          <span className="ml-auto">
            <IntegrityBadge integrity={{ status: listing.passport_intact ? 'intact' : 'changed' }} />
          </span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="text-xl font-bold tracking-[-.01em]">{listing.model}</h3>
            <span className={monoLabel}>Sample asking price</span>
            <span className="text-[clamp(30px,3vw,42px)] leading-[1.05] font-[750] tracking-[-.03em] tabular-nums">{formatPrice(listing.price)}</span>
          </div>
          <div className="flex min-w-[150px] flex-[0_1_200px] flex-col gap-1">
            <span className="flex justify-between font-mono text-[11px] text-ink-2">
              <span>util</span>
              <strong className="text-ink">{typeof latestUtil === 'number' ? `${latestUtil} %` : '—'}</strong>
            </span>
            <Sparkline values={util} colour={colours.fg} height={40} />
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,max(150px,calc((100%-2px)/3))),1fr))] gap-px bg-line">
        {specs.map(([key, value]) => (
          <div key={key} className="flex min-w-0 flex-col gap-[3px] bg-surface px-5 py-3.5">
            <dt className="font-mono text-[11px] tracking-[.06em] text-ink-2">{key}</dt>
            <dd className="text-sm font-semibold break-words">{value}</dd>
          </div>
        ))}
      </dl>
      {listing.note && <p className="border-t border-line px-6 py-3.5 text-sm text-ink-2">{listing.note}</p>}
      <div className="mt-auto flex flex-wrap gap-2.5 px-6 pt-1 pb-6">
        <Link to={`/device/${encodeURIComponent(listing.device_id)}`} className={`${primaryButton} min-h-[52px] flex-[1_1_200px]`}>
          Open the passport →
        </Link>
        {/* Opens the visitor's own e-mail app: no account, and the app stores nothing. */}
        <a href={enquiryLink(email, listing.device_id)} className={`${secondaryButton} min-h-[52px] flex-[1_1_200px]`}>
          Ask about this device
        </a>
      </div>
    </li>
  )
}

const contactRow = 'border-b border-line py-4'

function ContactBand({ contact }: { contact: Contact }) {
  return (
    <section aria-labelledby="contact" className="relative overflow-hidden border-t border-line bg-page py-[clamp(56px,7vw,104px)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-blueprint [mask-image:radial-gradient(ellipse_at_80%_50%,#000,transparent_70%)]" />
      <div className={`${container} relative grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-x-[clamp(40px,6vw,120px)] gap-y-10`}>
        <div className="flex flex-col gap-4">
          <span className="font-mono text-[13px] font-bold tracking-[.08em] text-accent">02 · CONTACT THE DATA CENTRE</span>
          <h2 id="contact" className="text-[clamp(30px,4vw,60px)] leading-none font-[750] tracking-[-.035em]">
            Interested in a device?
          </h2>
          <p className="max-w-[46ch] text-[clamp(16px,1.3vw,19px)] text-ink-2">
            E-mail the data centre with its device ID. There is no order form; your own e-mail app opens.
          </p>
          <a href={`mailto:${contact.email}`} className={`${primaryButton} mt-1.5 min-h-14 self-start text-base`}>
            {contact.email}
            <span aria-hidden>→</span>
          </a>
        </div>
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] overflow-hidden rounded-[18px] border border-line bg-surface shadow-panel">
          <dt className={`${contactRow} px-5 font-mono text-xs text-ink-2`}>organisation</dt>
          <dd className={`${contactRow} pr-5 font-semibold`}>{contact.organisation}</dd>
          {contact.phone && (
            <>
              <dt className={`${contactRow} px-5 font-mono text-xs text-ink-2`}>phone</dt>
              <dd className={`${contactRow} pr-5 font-semibold`}>{contact.phone}</dd>
            </>
          )}
          <dt className={`${contactRow} px-5 font-mono text-xs text-ink-2`}>hours</dt>
          <dd className={`${contactRow} pr-5 font-semibold`}>{contact.hours}</dd>
          <dt className="px-5 py-4 font-mono text-xs text-ink-2">note</dt>
          <dd className="py-4 pr-5 font-semibold">{contact.note}</dd>
        </dl>
      </div>
    </section>
  )
}
