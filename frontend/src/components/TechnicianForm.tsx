import { useId, useState, type FormEvent } from 'react'
import { addEvent, describeError } from '../api/client'
import type { EventKind } from '../api/types'
import { ErrorNotice, Notice, Panel, PanelTag, fieldClass, labelClass, primaryButton } from './ui'

// Telemetry is left out on purpose: only the simulator writes it.
const ACTIONS: { kind: EventKind; label: string }[] = [
  { kind: 'scan', label: 'Scan' },
  { kind: 'repair', label: 'Repair' },
  { kind: 'upgrade', label: 'Upgrade' },
  { kind: 'wipe', label: 'Wipe' },
  { kind: 'move', label: 'Move' },
  { kind: 'note', label: 'Note' },
]

export function TechnicianForm({ deviceId, onAdded }: { deviceId: string; onAdded: () => Promise<void> }) {
  const [kind, setKind] = useState<EventKind>('scan')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<number | null>(null)
  const ids = useId()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const details = note.trim()
    setError(null)
    setAdded(null)

    setSaving(true)
    try {
      // No actor field: the server records the logged-in technician (contract v2.0).
      const created = await addEvent(deviceId, { kind, payload: details ? { note: details } : {} })
      setNote('')
      setAdded(created.id)
    } catch (err) {
      setError(describeError(err))
      setSaving(false)
      return
    }
    try {
      await onAdded()
    } catch (err) {
      setError(`The event was saved, but the history did not refresh: ${describeError(err)}`)
    }
    setSaving(false)
  }

  return (
    <Panel title="Log an action" id="log" aside={<PanelTag>TECHNICIAN</PanelTag>}>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <fieldset className="flex flex-col">
          <legend className="mb-2 text-sm font-semibold">Action</legend>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-2">
            {ACTIONS.map((action) => (
              <label key={action.kind} className="relative">
                <input
                  type="radio"
                  name={`${ids}-kind`}
                  value={action.kind}
                  checked={kind === action.kind}
                  onChange={() => setKind(action.kind)}
                  className="peer sr-only"
                />
                <span className="flex min-h-[46px] cursor-pointer items-center justify-center rounded-full border border-line-strong bg-surface text-sm font-semibold text-ink transition-colors duration-200 hover:border-ink peer-checked:border-ink peer-checked:bg-ink peer-checked:text-surface peer-focus-visible:outline-3 peer-focus-visible:-outline-offset-3 peer-focus-visible:outline-accent">
                  {action.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className={labelClass}>
          <span>
            Details <span className="font-normal text-ink-2">(optional)</span>
          </span>
          <textarea
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. replaced a fan, wiped the disks"
            className={`${fieldClass} resize-y py-2.5 text-[15px]`}
          />
        </label>
        {error && <ErrorNotice message={error} />}
        {added !== null && (
          <Notice tone="success">
            <strong>Added to passport</strong> as event #{added}.
          </Notice>
        )}
        <div>
          <button type="submit" className={primaryButton} disabled={saving}>
            {saving ? 'Saving…' : 'Add to passport'}
          </button>
        </div>
      </form>
    </Panel>
  )
}
