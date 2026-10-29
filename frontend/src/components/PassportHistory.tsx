import { useState } from 'react'
import type { PassportEvent } from '../api/types'
import { asPrice, formatDateTime, formatPrice } from '../lib/format'
import type { PassportCheck } from '../lib/passportCheck'
import { IntegrityBadge } from './IntegrityBadge'
import { Panel, secondaryButton } from './ui'

const FIRST_PAGE = 5

// Node fill + border mark the kind; the label says it in words.
const EVENT_STYLE: Record<PassportEvent['kind'], { label: string; node: string; text: string }> = {
  telemetry: { label: 'Telemetry reading', node: 'border-line-strong bg-surface', text: 'text-ink-2' },
  scan: { label: 'Scan', node: 'border-ink bg-ink', text: 'text-ink' },
  repair: { label: 'Repair', node: 'border-ink bg-ink', text: 'text-ink' },
  upgrade: { label: 'Upgrade', node: 'border-ink bg-ink', text: 'text-ink' },
  wipe: { label: 'Data wipe', node: 'border-ok bg-ok', text: 'text-ink' },
  move: { label: 'Move', node: 'border-ink bg-ink', text: 'text-ink' },
  note: { label: 'Note', node: 'border-ink bg-surface', text: 'text-ink' },
  list: { label: 'Listed for sale', node: 'border-accent bg-accent', text: 'text-ink' },
  unlist: { label: 'Removed from sale', node: 'border-accent bg-surface', text: 'text-ink' },
}

/** Plain-language name of an event kind ("Data wipe", "Telemetry reading"). */
export const eventLabel = (kind: PassportEvent['kind']): string => EVENT_STYLE[kind].label

interface PassportHistoryProps {
  events: PassportEvent[]
  check: PassportCheck
}

export function PassportHistory({ events, check }: PassportHistoryProps) {
  const [showAll, setShowAll] = useState(false)
  const newestFirst = [...events].sort((a, b) => b.id - a.id)
  const visible = showAll ? newestFirst : newestFirst.slice(0, FIRST_PAGE)
  // The event each one links to by hash: the next older one of this device.
  const previous = new Map(newestFirst.map((event, i) => [event.id, newestFirst[i + 1]?.id ?? null]))

  const aside = (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-mono text-xs text-ink-2">
        {events.length} {events.length === 1 ? 'event' : 'events'} · newest first
      </span>
      <IntegrityBadge integrity={check.integrity} live />
    </div>
  )

  return (
    <Panel title="Passport history" eyebrow="02 · HISTORY" aside={aside}>
      {events.length === 0 ? (
        <p className="text-sm text-ink-2">No events yet.</p>
      ) : (
        <ol aria-label="Passport events" className="-my-2">
          {visible.map((event) => (
            <EventItem
              key={event.id}
              event={event}
              previousId={previous.get(event.id) ?? null}
              link={check.linkState(event)}
              reason={check.reason}
            />
          ))}
        </ol>
      )}
      {newestFirst.length > FIRST_PAGE && (
        <div>
          <button type="button" onClick={() => setShowAll((value) => !value)} className={secondaryButton}>
            {showAll ? 'Show fewer' : `Show all ${newestFirst.length} events`}
          </button>
        </div>
      )}
    </Panel>
  )
}

interface EventItemProps {
  event: PassportEvent
  previousId: number | null
  link: PassportCheck['linkState'] extends (e: PassportEvent) => infer L ? L : never
  reason: string | null
}

function EventItem({ event, previousId, link, reason }: EventItemProps) {
  const style = EVENT_STYLE[event.kind]
  const note = typeof event.payload.note === 'string' ? event.payload.note : null
  const details = Object.entries(event.payload)
    // The simulated / sample_data flags are said once for the whole demo, not on every row.
    .filter(([key]) => !(key === 'note' && note !== null) && key !== 'simulated' && key !== 'sample_data')
    .map(([key, value]) => `${key}=${showValue(key, value)}`)
    .join('  ')
  const hash = event.hash ? `${event.hash.slice(0, 4)}…${event.hash.slice(-4)}` : 'none'

  return (
    <li className="grid grid-cols-[20px_minmax(0,1fr)] gap-3">
      <div className="relative flex justify-center">
        <div className="absolute inset-y-0 w-px bg-line-mid" />
        <div
          className={`relative mt-[18px] size-2.5 border-[1.5px] transition-shadow duration-300 ${style.node} ${
            link === 'verified' ? 'shadow-[0_0_0_4px_var(--color-ok-bg)]' : link === 'bad' ? 'shadow-[0_0_0_4px_var(--color-danger-bg)]' : ''
          }`}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1 border-b border-sunken py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className={`text-[15px] font-bold ${style.text}`}>{style.label}</span>
          <time dateTime={event.created_at} className="font-mono text-xs text-ink-2">
            {formatDateTime(event.created_at)}
          </time>
        </div>
        <span className="text-[13px] text-ink-2">by {event.actor}</span>
        {note && <span className="text-sm">{note}</span>}
        {details && <span className="self-start bg-page px-2 py-1 font-mono text-xs break-all text-ink">{details}</span>}
        <span className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-ink-3">
          <span title={event.hash ?? undefined}>
            #{event.id} · hash {hash}
          </span>
          {link === 'verified' && (
            <span className="animate-tick font-bold text-ok">
              ✔ {previousId === null ? 'first event of the chain' : `links to #${previousId}`}
            </span>
          )}
          {link === 'bad' && <span className="font-bold text-danger">✘ {reason ?? 'changed after it was written'}</span>}
        </span>
      </div>
    </li>
  )
}

function showValue(key: string, value: unknown): string {
  const price = key === 'price' ? asPrice(value) : null
  if (price) return formatPrice(price)
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}
