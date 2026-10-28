import { useState } from 'react'
import type { PassportEvent } from '../api/types'
import { formatDateTime } from '../lib/format'
import { Card } from './ui'

const FIRST_PAGE = 15

export function PassportHistory({ events }: { events: PassportEvent[] }) {
  const [showAll, setShowAll] = useState(false)
  const newestFirst = [...events].sort((a, b) => b.id - a.id)
  const visible = showAll ? newestFirst : newestFirst.slice(0, FIRST_PAGE)

  return (
    <Card title={`Passport history (${events.length})`}>
      <p className="-mt-2 mb-4 text-xs text-gray-500">
        Newest first. Events are append-only: nobody can edit or delete them.
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
