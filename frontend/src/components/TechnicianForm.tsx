import { useId, useState, type FormEvent } from 'react'
import { addEvent, describeError } from '../api/client'
import type { EventKind } from '../api/types'
import { Card, ErrorNotice, primaryButton } from './ui'

// Telemetry is left out on purpose: only the simulator writes it.
const ACTIONS: { kind: EventKind; label: string }[] = [
  { kind: 'scan', label: 'Scan' },
  { kind: 'repair', label: 'Repair' },
  { kind: 'upgrade', label: 'Upgrade' },
  { kind: 'wipe', label: 'Wipe' },
  { kind: 'move', label: 'Move' },
  { kind: 'note', label: 'Note' },
]

const fieldClass =
  'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30'

export function TechnicianForm({ deviceId, onAdded }: { deviceId: string; onAdded: () => Promise<void> }) {
  const [kind, setKind] = useState<EventKind>('scan')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<string | null>(null)
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
      setAdded(`Added ${created.kind} event #${created.id} to the passport.`)
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
    <Card title="Log an action" id="log-action">
      <form onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="text-sm font-medium text-gray-900">What did you do?</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ACTIONS.map((action) => (
              <label key={action.kind} className="cursor-pointer">
                <input
                  type="radio"
                  name={`${ids}-kind`}
                  value={action.kind}
                  checked={kind === action.kind}
                  onChange={() => setKind(action.kind)}
                  className="peer sr-only"
                />
                <span className="block rounded-lg border border-gray-300 px-2 py-2.5 text-center text-sm font-medium text-gray-700 peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-900 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-700">
                  {action.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor={`${ids}-note`} className="text-sm font-medium text-gray-900">
            Details <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <textarea
            id={`${ids}-note`}
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. replaced a fan, wiped the disks"
            className={fieldClass}
          />
        </div>
        {error && <ErrorNotice message={error} />}
        {added && (
          <p role="status" className="text-sm font-medium text-emerald-800">
            {added}
          </p>
        )}
        <button type="submit" className={`${primaryButton} w-full sm:w-auto`} disabled={saving}>
          {saving ? 'Saving…' : 'Add to passport'}
        </button>
      </form>
    </Card>
  )
}
