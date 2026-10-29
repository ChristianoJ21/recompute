import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ApiError, describeError, login } from '../api/client'
import { SpinnerIcon } from '../components/icons'
import { ErrorNotice, NightBackdrop, Notice, PasswordField, TextField, linkClass, panelClass, primaryButton } from '../components/ui'
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
    <div className="grid min-h-[calc(100dvh-68px)] grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))]">
      <StaffPanel />
      <div className="flex items-center justify-center bg-blueprint px-[clamp(20px,4vw,72px)] py-[clamp(40px,5vw,72px)]">
        <div className="flex w-full max-w-[460px] animate-rise flex-col gap-[22px]">
          <div className="flex flex-col gap-2">
            <h1 className="text-[clamp(32px,3.2vw,44px)] leading-[1.05] font-[750] tracking-[-.035em]">Technician login</h1>
            <p className="text-base text-pretty text-ink-2">
              Reading passports needs no login. There is no sign-up: an admin or a colleague creates your account.
            </p>
          </div>
          {session && (
            <Notice tone="success">
              You are logged in as {session.technician.name}.{' '}
              <Link to="/fleet" className="font-semibold underline underline-offset-[3px]">
                Open the fleet dashboard
              </Link>
            </Notice>
          )}
          <form onSubmit={submit} className={`flex flex-col gap-[18px] p-[clamp(20px,2.4vw,32px)] ${panelClass} shadow-float`}>
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
            <PasswordField
              label="Password"
              required
              autoComplete="current-password"
              value={password}
              invalid={wrongLogin}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" className={`${primaryButton} min-h-[54px] w-full text-base`} disabled={sending}>
              {sending && <SpinnerIcon size={16} />}
              {sending ? 'Logging in…' : 'Log in'}
            </button>
          </form>
          <p className="text-[15px] text-ink-2">
            Buying hardware?{' '}
            <Link to="/account/login" className={linkClass}>
              Customer login
            </Link>
          </p>
          <Link to="/hardware" className={`${linkClass} inline-flex min-h-11 items-center self-start text-[15px]`}>
            ← Back to available hardware
          </Link>
        </div>
      </div>
    </div>
  )
}

// Decoration only: how logged actions join a passport. No ✔ here, because nothing was checked.
const SAMPLE_CHAIN = [
  { n: 44, kind: 'Telemetry read' },
  { n: 45, kind: 'QR scan' },
  { n: 46, kind: 'Data wipe' },
  { n: 47, kind: 'Listed for sale' },
]

function StaffPanel() {
  return (
    <section
      aria-hidden
      data-theme="dark"
      className="relative flex min-h-[420px] flex-col justify-center gap-7 overflow-hidden bg-night px-[clamp(20px,4vw,72px)] py-[clamp(40px,6vw,96px)] text-night-fg"
    >
      <NightBackdrop />
      <div className="relative flex max-w-[520px] flex-col gap-3.5">
        <span className="font-mono text-xs font-semibold tracking-[.12em] text-night-accent-2">STAFF ONLY</span>
        <p className="text-[clamp(30px,3.6vw,56px)] leading-[1.02] font-[750] tracking-[-.04em] text-white">
          Every action you log becomes part of the device&apos;s passport.
        </p>
      </div>
      <ol className="relative flex max-w-[460px] flex-col gap-2">
        {SAMPLE_CHAIN.map((row, i) => (
          <li
            key={row.n}
            className="grid animate-rise grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-night-line bg-white/[.035] px-3.5 py-[11px] font-mono text-xs"
            style={{ animationDelay: `${0.2 + i * 0.12}s` }}
          >
            <span className="font-bold text-night-accent">#{row.n}</span>
            <span className="truncate text-night-fg">{row.kind}</span>
            <span className="text-night-fg3">→ #{row.n - 1}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
