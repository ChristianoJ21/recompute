import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { describeError, getContact, getListings } from '../api/client'
import type { Contact, Listing, PassportEvent } from '../api/types'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { Card, ErrorNotice, Loading, secondaryButton } from '../components/ui'
import { formatDate, formatDateTime, formatPrice } from '../lib/format'

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Available hardware</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          Devices a (fictional) data centre has released after a ReCompute review. Each one carries its passport:
          open it to check the history, the data wipe and whether the record is still intact. Prices are sample asking
          prices; this demo sells nothing.
        </p>
      </div>
      <HowItWorks />
      {state.status === 'loading' && <Loading label="Loading the listed hardware…" />}
      {state.status === 'error' && <ErrorNotice message={state.message} onRetry={retry} />}
      {state.status === 'ready' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {state.listings.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-600">
                No hardware is listed right now.
              </p>
            ) : (
              <ul aria-label="Listed hardware" className="space-y-4">
                {state.listings.map((listing) => (
                  <ListingCard key={listing.device_id} listing={listing} email={state.contact.email} />
                ))}
              </ul>
            )}
          </div>
          <ContactBox contact={state.contact} />
        </div>
      )}
    </div>
  )
}

function ListingCard({ listing, email }: { listing: Listing; email: string }) {
  const components = listing.components.map((c) => `${c.type} ${c.model}`).join(', ')
  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">{listing.model}</h2>
          <p className="font-mono text-xs text-gray-500">{listing.device_id}</p>
        </div>
        <OutcomeBadge outcome={listing.latest_outcome} />
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-gray-900">{formatPrice(listing.price)}</p>
          <p className="text-xs text-gray-500">Sample asking price</p>
        </div>
        <IntactBadge intact={listing.passport_intact} />
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Fact label="Type">{listing.device_type}</Fact>
        <Fact label="Installed">{formatDate(listing.install_date)}</Fact>
        <Fact label="Components">{components || 'none recorded'}</Fact>
        <Fact label="Reliability check">{listing.reliability_ok ? 'passed' : 'failed'}</Fact>
        <Fact label="Data wiped">{listing.wiped_at ? formatDateTime(listing.wiped_at) : 'not recorded'}</Fact>
        <Fact label="Latest telemetry">
          {listing.latest_telemetry ? <TelemetrySummary event={listing.latest_telemetry} /> : 'none yet'}
        </Fact>
      </dl>
      {listing.note && <p className="mt-3 text-sm text-gray-800">{listing.note}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link
          to={`/device/${encodeURIComponent(listing.device_id)}`}
          className="text-sm font-semibold text-emerald-800 hover:underline"
        >
          Open the passport →
        </Link>
        {/* Opens the visitor's own e-mail app: no account, and the app stores nothing. */}
        <a href={enquiryLink(email, listing)} className={secondaryButton}>
          Ask about this device
        </a>
      </div>
    </li>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-gray-900">{children}</dd>
    </div>
  )
}

// Labels like "simulated" and "sample_data" are shown by the page itself, so only readings are listed here.
function TelemetrySummary({ event }: { event: PassportEvent }) {
  const readings = Object.entries(event.payload)
    .filter(([key, value]) => key !== 'simulated' && key !== 'sample_data' && typeof value !== 'object')
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`)
  return (
    <>
      <span className="block">{readings.join(', ') || 'no readings'}</span>
      <span className="block text-xs text-gray-500">{formatDateTime(event.created_at)}</span>
    </>
  )
}

function IntactBadge({ intact }: { intact: boolean }) {
  const base = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold'
  return intact ? (
    <span className={`${base} border-emerald-300 bg-emerald-50 text-emerald-900`}>
      <span aria-hidden>✔</span> Passport intact
    </span>
  ) : (
    <span className={`${base} border-red-300 bg-red-50 text-red-900`}>
      <span aria-hidden>✘</span> Passport changed
    </span>
  )
}

function ContactBox({ contact }: { contact: Contact }) {
  return (
    <aside>
      <Card title="Contact the data centre">
        <p className="font-semibold text-gray-900">{contact.organisation}</p>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-xs text-gray-500">E-mail</dt>
            <dd>
              <a href={`mailto:${contact.email}`} className="font-semibold text-emerald-800 underline underline-offset-2">
                {contact.email}
              </a>
            </dd>
          </div>
          {contact.phone && (
            <div>
              <dt className="text-xs text-gray-500">Phone</dt>
              <dd>{contact.phone}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-gray-500">Hours</dt>
            <dd>{contact.hours}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-gray-600">Quote the device ID when you ask about it. {contact.note}</p>
      </Card>
    </aside>
  )
}

function enquiryLink(email: string, listing: Listing): string {
  const subject = `Enquiry about ${listing.device_id} (${listing.model})`
  const body = `Hello,\n\nI am interested in device ${listing.device_id} listed at ${formatPrice(listing.price)}.\n`
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

const STEPS = [
  { title: 'Every device has a passport', text: 'Repairs, upgrades, data wipes and readings are recorded and cannot be changed unnoticed.' },
  { title: 'A rule decides its next life', text: 'Keep, upgrade, redeploy or recycle: chosen by whether replacing it would really save emissions.' },
  { title: 'Released hardware is offered here', text: 'Only after a recorded data wipe, with the full passport for any buyer to check.' },
]

function HowItWorks() {
  return (
    <ol aria-label="How ReCompute works" className="grid gap-3 sm:grid-cols-3">
      {STEPS.map((step, i) => (
        <li key={step.title} className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-700 text-sm font-semibold text-white"
          >
            {i + 1}
          </span>
          <span>
            <span className="block text-sm font-semibold text-gray-900">{step.title}</span>
            <span className="block text-xs leading-snug text-gray-600">{step.text}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}
