import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { addTechnician, describeError } from '../api/client'
import { ErrorNotice, primaryButton } from '../components/ui'

const MIN_PASSWORD = 10 // same rule as the backend (api/auth.py)

const fieldClass =
  'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30'

/** Technicians add technicians; there is no public sign-up and no buyer account (PRD 15.5). */
export function AddTechnicianPage() {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<string | null>(null)
  const ids = useId()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setAdded(null)
    if (!username.trim() || !name.trim()) {
      setError('Fill in a username and the full name.')
      return
    }
    if (password.length < MIN_PASSWORD) {
      setError(`The password needs at least ${MIN_PASSWORD} characters.`)
      return
    }
    setSaving(true)
    try {
      const technician = await addTechnician({ username: username.trim(), name: name.trim(), password })
      setAdded(`Added ${technician.name}: ${technician.username} can now log in.`)
      setUsername('')
      setName('')
      setPassword('')
    } catch (err) {
      setError(describeError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-4">
      <div>
        <Link to="/fleet" className="text-sm font-semibold text-emerald-800 hover:underline">
          ← Fleet dashboard
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Add a technician</h1>
        <p className="mt-1 text-sm text-gray-600">
          Give a colleague their own login, so the passport records who did what. Only logged-in technicians can add
          accounts; buyers never need one (they use the contact box). Tell your colleague the password in person.
        </p>
      </div>
      <form
        onSubmit={submit}
        noValidate
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <div>
          <label htmlFor={`${ids}-username`} className="text-sm font-medium text-gray-900">
            Username
          </label>
          <input
            id={`${ids}-username`}
            autoComplete="off"
            autoCapitalize="none"
            maxLength={64}
            placeholder="e.g. tech-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={fieldClass}
          />
          <p className="mt-1 text-xs text-gray-500">Letters, digits, dot, dash or underscore.</p>
        </div>
        <div>
          <label htmlFor={`${ids}-name`} className="text-sm font-medium text-gray-900">
            Full name
          </label>
          <input
            id={`${ids}-name`}
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor={`${ids}-password`} className="text-sm font-medium text-gray-900">
            Password <span className="font-normal text-gray-500">(at least {MIN_PASSWORD} characters)</span>
          </label>
          <input
            id={`${ids}-password`}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
          />
        </div>
        {error && <ErrorNotice message={error} />}
        {added && (
          <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
            ✔ {added}
          </p>
        )}
        <button type="submit" className={`${primaryButton} w-full`} disabled={saving}>
          {saving ? 'Adding…' : 'Add technician'}
        </button>
      </form>
    </div>
  )
}
