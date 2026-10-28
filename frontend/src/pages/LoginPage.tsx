import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ApiError, describeError, login } from '../api/client'
import { ErrorNotice, Notice, PageIntro, TextField, linkClass, panelClass, primaryButton } from '../components/ui'
import { useSession } from '../lib/session'

export function LoginPage() {
  const session = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSending(true)
    setError(null)
    try {
      await login(username.trim(), password)
      // Shown in place on a technician page (see App), that page now appears by itself.
      if (location.pathname === '/login') navigate('/fleet', { replace: true })
    } catch (err) {
      setError(err)
      setSending(false)
    }
  }

  const wrongLogin = error instanceof ApiError && error.status === 401
  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-5 px-4 pt-[clamp(32px,6vw,72px)] pb-16">
      <PageIntro eyebrow="/ Login" title="Technician login" compact>
        <p className="text-[15px] text-pretty text-ink-2">
          Reading passports needs no login. There is no sign-up: an admin or a colleague creates your account.
        </p>
      </PageIntro>
      {session && (
        <Notice tone="success">
          You are logged in as {session.technician.name}.{' '}
          <Link to="/fleet" className="font-semibold underline underline-offset-[3px]">
            Open the fleet dashboard
          </Link>
        </Notice>
      )}
      <form onSubmit={submit} className={`flex flex-col gap-4 p-5 ${panelClass}`}>
        {wrongLogin ? (
          <Notice tone="error">
            <strong>Wrong username or password.</strong> Check both and try again.
          </Notice>
        ) : (
          error !== null && <ErrorNotice message={describeError(error)} />
        )}
        <TextField
          label="Username"
          mono
          required
          autoComplete="username"
          autoCapitalize="none"
          value={username}
          invalid={wrongLogin}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          invalid={wrongLogin}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className={`${primaryButton} min-h-12 w-full text-[15px]`} disabled={sending}>
          {sending ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <Link to="/" className={`${linkClass} inline-flex min-h-11 items-center self-start text-sm`}>
        ← Back to available hardware
      </Link>
    </div>
  )
}
