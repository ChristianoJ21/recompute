// What a logged-in customer (contract v2.4) can do with a listed device: save it, or ask about it in the app.
// Still no buy button, cart or payment.
import { useId, useState, type FormEvent } from 'react'
import { describeError, sendEnquiry } from '../api/client'
import { ErrorNotice, Notice, fieldClass, primaryButton } from './ui'

const saveBase =
  'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border px-5 text-[15px] font-semibold transition-colors duration-200'
const saveOff = 'border-line-strong bg-transparent text-ink hover:border-ink hover:bg-raised'
const saveOn = 'border-accent bg-accent/10 text-accent'

interface SaveButtonProps {
  deviceId: string
  saved: boolean
  onToggle: (deviceId: string) => void
  className?: string
}

/** A toggle with a fixed name ("Save GPU-SRV-001"); aria-pressed and the filled heart show that it is saved. */
export function SaveButton({ deviceId, saved, onToggle, className = '' }: SaveButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={`Save ${deviceId}`}
      onClick={() => onToggle(deviceId)}
      className={`${saveBase} ${saved ? saveOn : saveOff} ${className}`}
    >
      <span aria-hidden className="text-lg leading-none">
        {saved ? '♥' : '♡'}
      </span>
      Save
    </button>
  )
}

/** Sends a question about the device to the data centre; the technicians reply by e-mail. */
export function EnquiryForm({ deviceId, email }: { deviceId: string; email: string }) {
  const fieldId = useId()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const text = message.trim()
    setSent(false)
    if (!text) {
      setError('Write your question first.')
      return
    }
    setSending(true)
    setError(null)
    try {
      await sendEnquiry({ device_id: deviceId, message: text })
      setMessage('')
      setSent(true)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2.5">
      <label htmlFor={fieldId} className="text-sm font-semibold">
        Your question
      </label>
      <textarea
        id={fieldId}
        rows={3}
        maxLength={2000}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className={`${fieldClass} min-h-[96px] resize-y py-3`}
      />
      {sent && (
        <Notice tone="success">
          <strong>Question sent.</strong> The data centre replies by e-mail to {email}.
        </Notice>
      )}
      {error && <ErrorNotice message={error} />}
      <button type="submit" className={`${primaryButton} min-h-[52px]`} disabled={sending}>
        {sending ? 'Sending…' : 'Send question'}
      </button>
    </form>
  )
}
