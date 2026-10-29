import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ApiError, customerLogin, describeError } from '../api/client'
import { SpinnerIcon } from '../components/icons'
import { ErrorNotice, NightBackdrop, Notice, PasswordField, TextField, container, linkClass, primaryButton } from '../components/ui'
import { useCustomer } from '../lib/session'

const card = 'flex w-full flex-col gap-5 rounded-[24px] border border-line bg-surface p-[clamp(22px,3vw,36px)] shadow-float'

/** Dark title band over a form card, shared by the customer login and sign-up pages. */
export function AccountShell({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <>
      <section data-band className="relative overflow-hidden bg-night text-night-fg">
        <NightBackdrop />
        <div className={`${container} relative flex flex-col items-center gap-4 pt-[clamp(32px,4vw,56px)] pb-[clamp(100px,10vw,150px)] text-center`}>
          <h1 className="text-[clamp(36px,4.6vw,72px)] leading-none font-[750] tracking-[-.045em] text-white">{title}</h1>
          <p className="max-w-[54ch] text-[clamp(15px,1.3vw,18px)] text-pretty text-night-fg2">{intro}</p>
        </div>
      </section>
      <div className="flex justify-center bg-blueprint px-[clamp(20px,4vw,72px)] pb-[clamp(48px,6vw,96px)]">
        <div className="relative -mt-[clamp(72px,8vw,110px)] flex w-full max-w-[520px] animate-rise flex-col gap-5">{children}</div>
      </div>
    </>
  )
}

/** Buyers log in here (contract v2.4); staff use /login. Also shown in place on /account when logged out. */
export function CustomerLoginPage() {
  const customer = useCustomer()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSending(true)
    setError(null)
    try {
      await customerLogin(email.trim(), password)
      // Shown in place on /account, that page now appears by itself.
      if (location.pathname !== '/account') navigate('/account', { replace: true })
    } catch (err) {
      setError(err)
      setSending(false)
    }
  }

  const wrongLogin = error instanceof ApiError && error.status === 401
  return (
    <AccountShell
      title="Customer login"
      intro="Save devices you are interested in and ask the data centre about them. Prices are sample values; there is no checkout."
    >
      {customer && (
        <Notice tone="success">
          You are logged in as {customer.customer.name}.{' '}
          <Link to="/account" className="font-semibold underline underline-offset-[3px]">
            Open My account
          </Link>
        </Notice>
      )}
      <form onSubmit={submit} className={card}>
        {wrongLogin ? (
          <Notice tone="error">
            <strong>Wrong e-mail or password.</strong> Check both and try again.
          </Notice>
        ) : (
          error !== null && <ErrorNotice message={describeError(error)} />
        )}
        <TextField
          label="E-mail"
          type="email"
          required
          autoComplete="email"
          autoCapitalize="none"
          maxLength={254}
          value={email}
          invalid={wrongLogin}
          onChange={(e) => setEmail(e.target.value)}
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
      <div className="flex flex-col gap-1.5 text-[15px]">
        <p>
          New here?{' '}
          <Link to="/signup" className={linkClass}>
            Create an account
          </Link>
        </p>
        <p className="text-ink-2">
          Staff?{' '}
          <Link to="/login" className={linkClass}>
            Technician login
          </Link>
        </p>
      </div>
    </AccountShell>
  )
}
