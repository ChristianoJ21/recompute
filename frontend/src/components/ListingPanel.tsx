import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { describeError, listDevice, unlistDevice } from '../api/client'
import type { PassportEvent } from '../api/types'
import { asPrice, formatDate, formatPrice } from '../lib/format'
import { currentListing, hasWipe } from '../lib/listing'
import { Card, ErrorNotice, primaryButton, secondaryButton } from './ui'

const CURRENCIES = ['IDR', 'USD', 'EUR']

const fieldClass =
  'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30'

interface ListingPanelProps {
  deviceId: string
  events: PassportEvent[]
  canEdit: boolean
  onChanged: () => Promise<void>
}

/** Sale status from the passport's list/unlist events; technicians can list or unlist, visitors only read. */
export function ListingPanel({ deviceId, events, canEdit, onChanged }: ListingPanelProps) {
  const listing = currentListing(events)
  if (canEdit) return <ListingControls deviceId={deviceId} events={events} listing={listing} onChanged={onChanged} />
  if (!listing) return null
  return (
    <Card title="For sale">
      <ListedPrice listing={listing} />
      <p className="mt-3 text-sm text-gray-600">
        No online purchase: ask the data centre through the{' '}
        <Link to="/" className="font-semibold text-emerald-800 underline underline-offset-2">
          contact box
        </Link>
        , quoting the device ID.
      </p>
    </Card>
  )
}

function ListedPrice({ listing }: { listing: PassportEvent }) {
  const price = asPrice(listing.payload.price)
  const note = typeof listing.payload.note === 'string' ? listing.payload.note : null
  return (
    <div>
      {price && <p className="text-2xl font-semibold tabular-nums text-gray-900">{formatPrice(price)}</p>}
      <p className="text-xs text-gray-500">Sample asking price · listed {formatDate(listing.created_at)}</p>
      {note && <p className="mt-2 text-sm text-gray-800">{note}</p>}
    </div>
  )
}

interface ListingControlsProps {
  deviceId: string
  events: PassportEvent[]
  listing: PassportEvent | null
  onChanged: () => Promise<void>
}

function ListingControls({ deviceId, events, listing, onChanged }: ListingControlsProps) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(CURRENCIES[0])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ids = useId()
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
      <Card title="Sale listing">
        <ListedPrice listing={listing} />
        {error && (
          <div className="mt-4">
            <ErrorNotice message={error} />
          </div>
        )}
        <button
          type="button"
          className={`${secondaryButton} mt-4`}
          disabled={saving}
          onClick={() => run(() => unlistDevice(deviceId))}
        >
          {saving ? 'Saving…' : 'Unlist'}
        </button>
      </Card>
    )
  }

  return (
    <Card title="Sale listing">
      <form onSubmit={list} noValidate className="space-y-4">
        <p className="text-sm text-gray-600">
          Not listed. A listing shows this device, its passport and the price on the public Available hardware page.
          It is a passport event, so the history keeps it.
        </p>
        {!wiped && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Record a wipe event first: a device can only be listed after its data has been wiped (log a Wipe action
            above).
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <div>
            <label htmlFor={`${ids}-amount`} className="text-sm font-medium text-gray-900">
              Asking price <span className="font-normal text-gray-500">(sample, whole amount)</span>
            </label>
            <input
              id={`${ids}-amount`}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={`${ids}-currency`} className="text-sm font-medium text-gray-900">
              Currency
            </label>
            <select
              id={`${ids}-currency`}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={fieldClass}
            >
              {CURRENCIES.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor={`${ids}-note`} className="text-sm font-medium text-gray-900">
            Note for buyers <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <input
            id={`${ids}-note`}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. released after REDEPLOY review"
            className={fieldClass}
          />
        </div>
        {error && <ErrorNotice message={error} />}
        <button type="submit" className={`${primaryButton} w-full sm:w-auto`} disabled={saving || !wiped}>
          {saving ? 'Saving…' : 'List for sale'}
        </button>
      </form>
    </Card>
  )
}
