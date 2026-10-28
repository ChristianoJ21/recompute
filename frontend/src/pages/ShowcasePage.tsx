import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { describeError, getContact, getListings } from '../api/client'
import type { Contact, Listing } from '../api/types'
import { EnvelopeIcon, CheckIcon, CrossIcon } from '../components/icons'
import { IntegrityBadge } from '../components/IntegrityBadge'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { Schematic } from '../components/Schematic'
import {
  EmptyState,
  ErrorNotice,
  Loading,
  SectionHeader,
  container,
  monoLabel,
  panelClass,
  primaryButton,
  secondaryButton,
} from '../components/ui'
import { formatComponents, formatDate, formatDateTime, formatDeviceType, formatPrice, telemetryReadings } from '../lib/format'
import { enquiryLink } from '../lib/listing'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; listings: Listing[]; contact: Contact }

/** Public showcase (PRD 15.1): no login, no buy button; buyers use the contact box. */
export function ShowcasePage() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

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

  const count = state.status === 'ready' ? `${state.listings.length} ${state.listings.length === 1 ? 'device' : 'devices'}` : undefined

  return (
    <>
      <section className="border-b border-line">
        <div className={`${container} flex flex-col gap-4 py-[clamp(32px,5vw,64px)]`}>
          <p className="font-mono text-xs font-semibold tracking-[.08em] text-accent uppercase">/ Available hardware</p>
          <h1 className="max-w-[20ch] text-[clamp(32px,4.4vw,54px)] leading-[1.05] font-bold tracking-[-.03em] text-balance">
            Second-life AI servers, each with a passport you can check.
          </h1>
          <p className="max-w-[62ch] text-[clamp(16px,1.4vw,18px)] text-pretty text-ink-2">
            ReCompute helps a data centre keep AI servers in use longer instead of scrapping them early. Every device
            carries a digital passport of what happened to it, a decision rule recommends its next life, and released
            hardware is listed here with that passport attached.
          </p>
        </div>
      </section>
      <div className={`${container} flex flex-col gap-[clamp(40px,5vw,56px)] pt-[clamp(32px,4vw,48px)] pb-16`}>
        <section aria-labelledby="how" className="flex flex-col gap-3.5">
          <SectionHeader index="01" title="How ReCompute works" id="how" />
          <Schematic />
        </section>
        <section aria-labelledby="listed" className="flex flex-col gap-3.5">
          <SectionHeader index="02" title="Listed hardware" id="listed" aside={count} />
          {state.status === 'loading' && <Loading label="Loading listings…" />}
          {state.status === 'error' && <ErrorNotice message={state.message} onRetry={retry} />}
          {state.status === 'ready' &&
            (state.listings.length === 0 ? (
              <EmptyState title="No hardware is listed right now">Released devices appear here with their passport.</EmptyState>
            ) : (
              <ul aria-label="Listed hardware" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] gap-4">
                {state.listings.map((listing) => (
                  <ListingCard key={listing.device_id} listing={listing} email={state.contact.email} />
                ))}
              </ul>
            ))}
        </section>
        {state.status === 'ready' && <ContactBox contact={state.contact} />}
      </div>
    </>
  )
}

const dt = 'border-b border-sunken px-4 py-2 font-mono text-xs text-ink-2'
const dd = 'border-b border-sunken py-2 pr-4'

function ListingCard({ listing, email }: { listing: Listing; email: string }) {
  const telemetry = listing.latest_telemetry
  return (
    <li className={`flex flex-col ${panelClass} transition-[translate,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-panel-hover`}>
      <div className="flex items-center justify-between gap-2 border-b border-line bg-raised px-4 py-2.5">
        <span className="font-mono text-[13px] font-bold">{listing.device_id}</span>
        <OutcomeBadge outcome={listing.latest_outcome} />
      </div>
      <div className="flex flex-col gap-3.5 p-4">
        <h3 className="text-[19px] leading-tight font-bold tracking-[-.01em]">{listing.model}</h3>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2.5">
          <div className="flex flex-col gap-0.5">
            <span className={monoLabel}>Sample asking price</span>
            <span className="text-[30px] leading-[1.1] font-bold tracking-[-.02em] tabular-nums">{formatPrice(listing.price)}</span>
          </div>
          <IntegrityBadge integrity={{ status: listing.passport_intact ? 'intact' : 'changed' }} />
        </div>
      </div>
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] border-t border-line text-sm">
        <dt className={dt}>type</dt>
        <dd className={dd}>{formatDeviceType(listing.device_type)}</dd>
        <dt className={dt}>installed</dt>
        <dd className={dd}>{formatDate(listing.install_date)}</dd>
        <dt className={dt}>components</dt>
        <dd className={dd}>{formatComponents(listing.components) || 'none recorded'}</dd>
        <dt className={dt}>reliability</dt>
        <dd className={`${dd} flex items-center gap-1.5`}>
          {listing.reliability_ok ? <CheckIcon size={13} /> : <CrossIcon size={13} />}
          {listing.reliability_ok ? 'Check passed' : 'Check failed'}
        </dd>
        <dt className={dt}>data wipe</dt>
        <dd className={dd}>{listing.wiped_at ? formatDateTime(listing.wiped_at) : 'not recorded'}</dd>
        <dt className={`${dt} border-b-0`}>telemetry</dt>
        <dd className="flex flex-col gap-1.5 py-2 pr-4">
          {telemetry ? (
            <>
              <span className="flex flex-wrap gap-x-3.5 gap-y-1 font-mono text-[13px]">
                {telemetryReadings(telemetry.payload).map((reading) => (
                  <span key={reading.label}>
                    <span className="text-ink-2">{reading.label}</span> <strong className="font-bold">{reading.value}</strong>
                  </span>
                ))}
              </span>
              <span className="text-xs text-ink-2">Read {formatDateTime(telemetry.created_at)}</span>
            </>
          ) : (
            'none yet'
          )}
        </dd>
      </dl>
      {listing.note && <p className="border-t border-line px-4 py-3 text-sm text-ink-2">{listing.note}</p>}
      <div className="mt-auto flex flex-wrap gap-2 px-4 pt-3 pb-4">
        <Link to={`/device/${encodeURIComponent(listing.device_id)}`} className={`${primaryButton} flex-[1_1_170px]`}>
          Open the passport →
        </Link>
        {/* Opens the visitor's own e-mail app: no account, and the app stores nothing. */}
        <a href={enquiryLink(email, listing.device_id)} className={`${secondaryButton} flex-[1_1_170px]`}>
          <EnvelopeIcon />
          Ask about this device
        </a>
      </div>
    </li>
  )
}

const contactKey = 'pt-0.5 font-mono text-xs text-ink-2'

function ContactBox({ contact }: { contact: Contact }) {
  return (
    <section aria-labelledby="contact" className="flex flex-col gap-3.5">
      <SectionHeader index="03" title="Contact the data centre" id="contact" />
      <div className={`grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-x-10 gap-y-4 p-5 ${panelClass}`}>
        <p className="max-w-[46ch] text-[15px] text-ink-2">
          Interested in a device? E-mail the data centre with its device ID. There is no order form; your own e-mail app
          opens.
        </p>
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-2 text-[15px]">
          <dt className={contactKey}>organisation</dt>
          <dd>{contact.organisation}</dd>
          <dt className={contactKey}>e-mail</dt>
          <dd>
            <a href={`mailto:${contact.email}`} className="font-semibold text-accent underline underline-offset-[3px]">
              {contact.email}
            </a>
          </dd>
          {contact.phone && (
            <>
              <dt className={contactKey}>phone</dt>
              <dd>{contact.phone}</dd>
            </>
          )}
          <dt className={contactKey}>hours</dt>
          <dd>{contact.hours}</dd>
          <dt className={contactKey}>note</dt>
          <dd>{contact.note}</dd>
        </dl>
      </div>
    </section>
  )
}
