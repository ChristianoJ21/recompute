import { useId, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { describeError, login } from '../api/client'
import { ErrorNotice, primaryButton } from '../components/ui'
import { useSession } from '../lib/session'

const fieldClass =
  'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30'

export function LoginPage() {
  const session = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ids = useId()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSending(true)
    setError(null)
    try {
      await login(username.trim(), password)
      // Shown in place on a technician page (see App), that page now appears by itself.
      if (location.pathname === '/login') navigate('/fleet', { replace: true })
    } catch (err) {
      setError(describeError(err))
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Technician login</h1>
        <p className="mt-1 text-sm text-gray-600">
          Logging in lets you record actions, run the decision rule and list devices for sale. Reading passports needs
          no login. There is no sign-up: the data-centre admin creates technician accounts.
        </p>
      </div>
      {session && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          You are logged in as {session.technician.name}.{' '}
          <Link to="/fleet" className="font-semibold underline underline-offset-2">
            Open the fleet dashboard
          </Link>
        </p>
      )}
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div>
          <label htmlFor={`${ids}-username`} className="text-sm font-medium text-gray-900">
            Username
          </label>
          <input
            id={`${ids}-username`}
            required
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor={`${ids}-password`} className="text-sm font-medium text-gray-900">
            Password
          </label>
          <input
            id={`${ids}-password`}
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
          />
        </div>
        {error && <ErrorNotice message={error} />}
        <button type="submit" className={`${primaryButton} w-full`} disabled={sending}>
          {sending ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  )
}
