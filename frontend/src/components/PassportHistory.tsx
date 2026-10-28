import { useEffect, useState } from 'react'
import { verifyEvents } from '../api/client'
import type { ChainCheck, PassportEvent } from '../api/types'
import { formatDateTime } from '../lib/format'
import { Card } from './ui'

const FIRST_PAGE = 15

export function PassportHistory({ deviceId, events }: { deviceId: string; events: PassportEvent[] }) {
  const [showAll, setShowAll] = useState(false)
  const newestFirst = [...events].sort((a, b) => b.id - a.id)
  const visible = showAll ? newestFirst : newestFirst.slice(0, FIRST_PAGE)

  return (
    <Card
      title={`Passport history (${events.length})`}
      action={<IntegrityBadge deviceId={deviceId} headHash={newestFirst[0]?.hash ?? null} />}
    >
      <p className="-mt-2 mb-4 text-xs text-gray-500">
        Newest first. Events are append-only: the app cannot edit or delete them, and any change made in the database is
        detected.
      </p>
      {events.length === 0 ? (
        <p className="text-sm text-gray-600">No events yet.</p>
      ) : (
        <ol aria-label="Passport events" className="space-y-3">
          {visible.map((event) => (
            <EventItem key={event.id} event={event} />
          ))}
        </ol>
      )}
      {newestFirst.length > FIRST_PAGE && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="mt-4 text-sm font-semibold text-emerald-800 underline-offset-2 hover:underline"
        >
          {showAll ? 'Show fewer' : `Show all ${newestFirst.length} events`}
        </button>
      )}
    </Card>
  )
}

type Check = { status: 'checking' } | { status: 'done'; result: ChainCheck } | { status: 'unavailable' }

// Re-checks whenever a new event arrives (the newest hash changes). The check only detects changes;
// it cannot prevent them, so the wording says "changed", never "protected".
function IntegrityBadge({ deviceId, headHash }: { deviceId: string; headHash: string | null }) {
  const [check, setCheck] = useState<Check>({ status: 'checking' })

  useEffect(() => {
    let active = true
    setCheck({ status: 'checking' })
    verifyEvents(deviceId)
      .then((result) => {
        if (active) setCheck({ status: 'done', result })
      })
      .catch(() => {
        if (active) setCheck({ status: 'unavailable' })
      })
    return () => {
      active = false
    }
  }, [deviceId, headHash])

  const base = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold'
  if (check.status === 'checking') {
    return <span className={`${base} border-gray-200 bg-gray-50 text-gray-500`}>Checking passport…</span>
  }
  if (check.status === 'unavailable') {
    return <span className={`${base} border-gray-200 bg-gray-50 text-gray-600`}>Integrity check unavailable</span>
  }
  const { valid, first_bad_event_id, reason, events_checked } = check.result
  return valid ? (
    <span
      role="status"
      title={`Hash chain of ${events_checked} events verified`}
      className={`${base} border-emerald-300 bg-emerald-50 text-emerald-900`}
    >
      <span aria-hidden>✔</span> Passport intact
    </span>
  ) : (
    <span role="alert" title={reason ?? undefined} className={`${base} border-red-300 bg-red-50 text-red-900`}>
      <span aria-hidden>✘</span> Passport changed at event #{first_bad_event_id}
    </span>
  )
}

function EventItem({ event }: { event: PassportEvent }) {
  const note = typeof event.payload.note === 'string' ? event.payload.note : null
  const details = Object.entries(event.payload).filter(([key]) => !(key === 'note' && note !== null))
  const kindStyle = event.kind === 'telemetry' ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-900'

  return (
    <li className="rounded-xl border border-gray-200 p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${kindStyle}`}>
          {event.kind}
        </span>
        <time dateTime={event.created_at} className="text-sm text-gray-700">
          {formatDateTime(event.created_at)}
        </time>
        <span className="text-sm text-gray-500">by {event.actor}</span>
      </div>
      {note && <p className="mt-2 text-sm text-gray-900">{note}</p>}
      {details.length > 0 && (
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
          {details.map(([key, value]) => (
            <div key={key}>
              <dt className="inline">{key}: </dt>
              <dd className="inline font-mono">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {event.hash && (
        <p className="mt-2 font-mono text-[11px] text-gray-400" title={event.hash}>
          #{event.id} · hash {event.hash.slice(0, 12)}…
        </p>
      )}
    </li>
  )
}
