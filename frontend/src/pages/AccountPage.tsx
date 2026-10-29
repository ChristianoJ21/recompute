import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { describeError, getListings, getMyEnquiries, logout } from '../api/client'
import type { Enquiry, Listing } from '../api/types'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { EmptyState, ErrorNotice, HeroChip, Loading, NightBackdrop, Panel, band, container, linkClass, nightGhostButton } from '../components/ui'
import { useFavourites } from '../lib/favourites'
import { formatDateTime, formatPrice } from '../lib/format'
import { useCustomer } from '../lib/session'

const row = 'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-sunken py-3.5 last:border-b-0'
const removeButton =
  'inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm font-semibold text-ink transition-colors duration-200 hover:border-ink hover:bg-raised'

/** A customer's own page (contract v2.4): saved devices, questions sent, log out. Shown only when logged in (App). */
export function AccountPage() {
  const customer = useCustomer()
  const favourites = useFavourites()
  const [listings, setListings] = useState<Listing[] | null>(null)
  const [enquiries, setEnquiries] = useState<Enquiry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([getListings(), getMyEnquiries()])
      .then(([rows, sent]) => {
        if (!active) return
        setListings(rows)
        setEnquiries(sent)
      })
      .catch((err) => {
        if (active) setError(describeError(err))
      })
    return () => {
      active = false
    }
  }, [])

  if (!customer) return null
  return (
    <>
      <section data-band className="relative overflow-hidden bg-night text-night-fg">
        <NightBackdrop />
        <div className={`${container} relative flex flex-wrap items-end justify-between gap-x-10 gap-y-5 pt-[clamp(32px,4vw,56px)] pb-[clamp(36px,4vw,56px)]`}>
          <div className="flex flex-col gap-3.5">
            <HeroChip>CUSTOMER ACCOUNT</HeroChip>
            <h1 className="text-[clamp(40px,5.4vw,84px)] leading-none font-[750] tracking-[-.045em] text-white">My account</h1>
            <p className="text-[clamp(16px,1.35vw,19px)] text-night-fg2">
              {customer.customer.name} · <span className="font-mono text-[0.9em]">{customer.customer.email}</span>
            </p>
          </div>
          <button type="button" onClick={logout} className={`${nightGhostButton} min-h-[52px] px-6`}>
            Log out
          </button>
        </div>
      </section>
      <div className={band}>
        <div className={`${container} flex flex-col gap-[clamp(20px,2.4vw,32px)]`}>
          {error && <ErrorNotice message={error} />}
          {favourites.error && <ErrorNotice message={favourites.error} />}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,480px),1fr))] items-start gap-[clamp(20px,2.4vw,32px)]">
            <Panel title="Saved devices">
              <SavedDevices ids={favourites.saved} listings={listings} onRemove={favourites.toggle} />
            </Panel>
            <Panel title="Your questions">
              <Questions enquiries={enquiries} />
            </Panel>
          </div>
        </div>
      </div>
    </>
  )
}

interface SavedDevicesProps {
  ids: readonly string[] | null
  listings: Listing[] | null
  onRemove: (deviceId: string) => void
}

function SavedDevices({ ids, listings, onRemove }: SavedDevicesProps) {
  if (ids === null) return <Loading label="Loading your saved devices…" />
  if (ids.length === 0) {
    return (
      <EmptyState title="No saved devices yet">
        Press Save on a device in{' '}
        <Link to="/hardware" className={linkClass}>
          Available hardware
        </Link>
        .
      </EmptyState>
    )
  }
  return (
    <ul aria-label="Saved devices" className="flex flex-col">
      {ids.map((id) => {
        const listing = listings?.find((item) => item.device_id === id)
        return (
          <li key={id} className={row}>
            <span className="flex min-w-0 flex-col gap-1">
              <Link to={`/device/${encodeURIComponent(id)}`} className={`${linkClass} font-mono text-[15px]`}>
                {id}
              </Link>
              <span className="text-sm text-ink-2">{listing ? listing.model : listings ? 'No longer listed for sale' : ' '}</span>
            </span>
            <span className="flex flex-wrap items-center gap-3">
              {listing && <OutcomeBadge outcome={listing.latest_outcome} />}
              {listing?.price && <span className="font-bold tabular-nums">{formatPrice(listing.price)}</span>}
              <button type="button" aria-label={`Remove ${id} from saved devices`} onClick={() => onRemove(id)} className={removeButton}>
                Remove
              </button>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function Questions({ enquiries }: { enquiries: Enquiry[] | null }) {
  if (enquiries === null) return <Loading label="Loading your questions…" />
  if (enquiries.length === 0) {
    return <EmptyState title="No questions yet">Open a device's passport and use the question box under its price.</EmptyState>
  }
  return (
    <ul aria-label="Your questions" className="flex flex-col">
      {enquiries.map((enquiry) => (
        <li key={enquiry.id} className="flex flex-col gap-1.5 border-b border-sunken py-3.5 last:border-b-0">
          <span className="flex flex-wrap items-baseline gap-x-3 font-mono text-xs text-ink-2">
            <Link to={`/device/${encodeURIComponent(enquiry.device_id)}`} className={`${linkClass} text-[13px]`}>
              {enquiry.device_id}
            </Link>
            {formatDateTime(enquiry.created_at)}
          </span>
          <p className="text-[15px] text-pretty whitespace-pre-line">{enquiry.message}</p>
        </li>
      ))}
    </ul>
  )
}
