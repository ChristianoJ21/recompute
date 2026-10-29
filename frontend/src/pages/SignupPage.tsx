import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { describeError, signUp } from '../api/client'
import { ErrorNotice, Notice, PasswordField, TextField, linkClass, primaryButton } from '../components/ui'
import { AccountShell } from './CustomerLoginPage'

const MIN_PASSWORD = 10 // same rule as the backend (api/customers.py)
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/ // same rule as the backend

type Field = 'name' | 'email' | 'password'

/** Public sign-up for buyers (contract v2.4). Technicians are never made here: an admin adds them. */
export function SignupPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<Record<Field, string>>({ name: '', email: '', password: '' })
  const [problems, setProblems] = useState<Partial<Record<Field, string>>>({})
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (field: Field) => (event: { target: { value: string } }) => setValues({ ...values, [field]: event.target.value })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const name = values.name.trim()
    const email = values.email.trim()
    const found: Partial<Record<Field, string>> = {}
    if (!name) found.name = 'Enter your name.'
    if (!EMAIL_PATTERN.test(email)) found.email = 'Enter an e-mail address like name@example.com.'
    if (values.password.length < MIN_PASSWORD) found.password = `Password needs at least ${MIN_PASSWORD} characters.`
    setProblems(found)
    if (Object.keys(found).length > 0) return

    setSending(true)
    try {
      await signUp({ name, email, password: values.password })
      navigate('/account', { replace: true })
    } catch (err) {
      setError(describeError(err))
      setSending(false)
    }
  }

  return (
    <AccountShell
      title="Create an account"
      intro="For buyers: save listed devices and send questions to the data centre. No checkout and no payment: prices are sample values."
    >
      <form
        onSubmit={submit}
        noValidate
        className="flex w-full flex-col gap-5 rounded-[24px] border border-line bg-surface p-[clamp(22px,3vw,36px)] shadow-float"
      >
        <Notice tone="warning">
          Demo only: the hosted demo forgets accounts when its server restarts. Do not reuse a password from another site.
        </Notice>
        {error && <ErrorNotice message={error} />}
        <TextField label="Full name" autoComplete="name" maxLength={200} error={problems.name} value={values.name} onChange={set('name')} />
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          maxLength={254}
          hint="The data centre answers your questions here."
          error={problems.email}
          value={values.email}
          onChange={set('email')}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          error={problems.password}
          value={values.password}
          onChange={set('password')}
        />
        <button type="submit" className={`${primaryButton} min-h-[54px] w-full text-base`} disabled={sending}>
          {sending ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="text-[15px]">
        Already have an account?{' '}
        <Link to="/account/login" className={linkClass}>
          Log in
        </Link>
      </p>
    </AccountShell>
  )
}
