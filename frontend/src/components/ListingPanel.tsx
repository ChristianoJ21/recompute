import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { describeError, getContact, listDevice, unlistDevice } from '../api/client'
import type { Contact, PassportEvent } from '../api/types'
import { useFavourites } from '../lib/favourites'
import { asPrice, formatDate, formatPrice } from '../lib/format'
import { enquiryLink, hasWipe } from '../lib/listing'
import { useCustomer, useSession } from '../lib/session'
import { EnquiryForm, SaveButton } from './CustomerActions'
import { EnvelopeIcon } from './icons'
import { ErrorNotice, Notice, Panel, PillTag, fieldClass, linkClass, monoLabel, primaryButton, secondaryButton } from './ui'

const CURRENCIES = ['IDR', 'USD', 'EUR']
const askToggle =
  'inline-flex min-h-[52px] cursor-pointer list-none items-center justify-center rounded-full border border-line-strong px-5 text-[15px] font-semibold text-ink transition-colors duration-200 hover:border-ink hover:bg-raised [&::-webkit-details-marker]:hidden'

/** Price, note and date of the device's current `list` event. */
function ListedPrice({ listing, large = false }: { listing: PassportEvent; large?: boolean }) {
  const price = asPrice(listing.payload.price)
  const note = typeof listing.payload.note === 'string' ? listing.payload.note : null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className={monoLabel}>Sample asking price</span>
        {price && (
          <span className={`${large ? 'text-[clamp(32px,3.2vw,46px)]' : 'text-[30px]'} leading-[1.05] font-[750] tracking-[-.03em] tabular-nums`}>
            {formatPrice(price)}
          </span>
        )}
      </div>
      {note && <p className="text-[15px] text-ink-2">{note}</p>}
    </div>
  )
}

/** The fictional contact box; on failure the visitor is sent to the home page, where it also shows. */
function useContact(): Contact | null {
  const [contact, setContact] = useState<Contact | null>(null)
  useEffect(() => {
    let active = true
    getContact()
      .then((value) => {
        if (active) setContact(value)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  return contact
}

/** What a buyer sees next to the passport when the device is listed. No buy button: they e-mail. */
export function ForSaleBox({ deviceId, listing }: { deviceId: string; listing: PassportEvent }) {
  const headingId = useId()
  const contact = useContact()
  const customer = useCustomer()
  const technician = useSession()
  const favourites = useFavourites()
  return (
    <section
      aria-labelledby={headingId}
      className="flex w-full max-w-[560px] min-w-0 flex-col overflow-hidden rounded-[22px] bg-surface text-ink shadow-hero-card min-[1100px]:justify-self-end"
    >
      <div className="flex items-center justify-between gap-2.5 border-b border-line px-[22px] py-3.5">
        <h2 id={headingId} className="flex items-center gap-2 font-mono text-xs font-bold tracking-[.1em] uppercase">
          <span aria-hidden className="size-2 rounded-full bg-ok" />
          For sale
        </h2>
        <span className="font-mono text-xs text-ink-2">listed {formatDate(listing.created_at)}</span>
      </div>
      <div className="flex flex-1 flex-col gap-3.5 px-[22px] pt-5 pb-[22px]">
        <ListedPrice listing={listing} large />
        {customer ? (
          <>
            {favourites.error && <ErrorNotice message={favourites.error} />}
            <div className="flex flex-wrap items-start gap-2.5">
              <SaveButton deviceId={deviceId} saved={favourites.saved?.includes(deviceId) ?? false} onToggle={favourites.toggle} />
              {/* Folded so the hero stays compact; open, it takes the full width. */}
              <details className="min-w-0 open:basis-full">
                <summary className={askToggle}>Ask a question</summary>
                <div className="pt-3.5">
                  <EnquiryForm deviceId={deviceId} email={customer.customer.email} />
                </div>
              </details>
            </div>
          </>
        ) : contact ? (
          <>
            <a href={enquiryLink(contact.email, deviceId)} className={`${primaryButton} min-h-[52px]`}>
              <EnvelopeIcon />
              Ask about this device
            </a>
            <p className="text-[13px] text-ink-2">
              <a href={`mailto:${contact.email}`} className={linkClass}>
                {contact.email}
              </a>{' '}
              · {contact.organisation}
            </p>
            {!technician && (
              <p className="text-[13px] text-ink-2">
                <Link to="/account/login" className={linkClass}>
                  Log in
                </Link>{' '}
                to save this device or ask about it here.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm">
            Ask through the{' '}
            <Link to="/hardware" className={linkClass}>
              contact box
            </Link>
            , quoting the device ID.
          </p>
        )}
      </div>
    </section>
  )
}

interface SaleListingProps {
  deviceId: string
  events: PassportEvent[]
  listing: PassportEvent | null
  onChanged: () => Promise<void>
}

/** Technician controls: list with a sample price (needs a wipe event first) or unlist. */
export function SaleListing({ deviceId, events, listing, onChanged }: SaleListingProps) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(CURRENCIES[0])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wiped = hasWipe(events)

  const run = async (action: () => Promise<unknown>) => {
    setSaving(true)
    setError(null)
    try {
      await action()
      await onChanged()
    } catch (err) {
      setError(describeError(err))
    } finally {
      setSaving(false)
    }
  }

  const list = async (event: FormEvent) => {
    event.preventDefault()
    const value = Number(amount)
    if (!Number.isInteger(value) || value <= 0) {
      setError('Enter the asking price as a whole amount above 0.')
      return
    }
    const details = note.trim()
    await run(async () => {
      await listDevice(deviceId, { price: { amount: value, currency }, ...(details ? { note: details } : {}) })
      setAmount('')
      setNote('')
    })
  }

  if (listing) {
    return (
      <Panel title="Sale listing" aside={<PillTag tone="ok">LISTED</PillTag>}>
        <ListedPrice listing={listing} />
        {error && <ErrorNotice message={error} />}
        <div>
          <button type="button" className={secondaryButton} disabled={saving} onClick={() => run(() => unlistDevice(deviceId))}>
            {saving ? 'Saving…' : 'Remove from sale'}
          </button>
        </div>
      </Panel>
    )
  }

  const label = `flex flex-col gap-2 text-sm font-semibold ${wiped ? '' : 'text-ink-3'}`
  return (
    <Panel title="Sale listing" aside={wiped ? <PillTag tone="ready">READY</PillTag> : <PillTag tone="muted">NOT LISTED</PillTag>}>
      <form onSubmit={list} noValidate className="flex flex-col gap-3.5">
        {!wiped && (
          <Notice tone="warning">
            Listing needs a <strong>Data wipe</strong> event in the passport first. Log a Wipe on the left.
          </Notice>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2.5">
          <label className={label}>
            Asking price
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              placeholder="45000000"
              disabled={!wiped}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${fieldClass} font-mono text-[15px]`}
            />
          </label>
          <label className={label}>
            Currency
            <select disabled={!wiped} value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${fieldClass} px-2 text-[15px]`}>
              {CURRENCIES.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
          </label>
        </div>
        <label className={label}>
          Note
          <input
            maxLength={500}
            disabled={!wiped}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. released after REDEPLOY review"
            className={`${fieldClass} text-[15px]`}
          />
        </label>
        {error && <ErrorNotice message={error} />}
        <div>
          <button type="submit" className={`${primaryButton} border-accent bg-accent`} disabled={saving || !wiped}>
            {saving ? 'Saving…' : 'List for sale'}
          </button>
        </div>
      </form>
    </Panel>
  )
}
