import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { addTechnician, describeError } from '../api/client'
import {
  ErrorNotice,
  NightBackdrop,
  Notice,
  PasswordField,
  TextField,
  container,
  initials,
  nightGhostButton,
  primaryButton,
  secondaryButton,
} from '../components/ui'

const MIN_PASSWORD = 10 // same rule as the backend (api/auth.py)

type Field = 'username' | 'name' | 'password'

/** Technicians add technicians; there is no public sign-up and no buyer account (PRD 15.5). */
export function AddTechnicianPage() {
  const [values, setValues] = useState<Record<Field, string>>({ username: '', name: '', password: '' })
  const [problems, setProblems] = useState<Partial<Record<Field, string>>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<string | null>(null)
  const set = (field: Field) => (event: { target: { value: string } }) => setValues({ ...values, [field]: event.target.value })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setAdded(null)
    const username = values.username.trim()
    const name = values.name.trim()
    const found: Partial<Record<Field, string>> = {}
    if (!username) found.username = 'Enter a username.'
    if (!name) found.name = 'Enter the full name.'
    if (values.password.length < MIN_PASSWORD) found.password = `Password needs at least ${MIN_PASSWORD} characters.`
    setProblems(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      const technician = await addTechnician({ username, name, password: values.password })
      setAdded(technician.username)
      setValues({ username: '', name: '', password: '' })
    } catch (err) {
      setError(describeError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <section data-band className="relative overflow-hidden bg-night text-night-fg">
        <NightBackdrop />
        <div className={`${container} relative flex flex-col items-center gap-5 pt-[clamp(24px,3vw,40px)] pb-[clamp(100px,10vw,150px)] text-center`}>
          <Link to="/fleet" className={`${nightGhostButton} min-h-9 px-3.5 font-mono text-[13px] font-normal`}>
            ← Fleet
          </Link>
          <h1 className="text-[clamp(36px,4.6vw,72px)] leading-none font-[750] tracking-[-.045em] text-white">Add a technician</h1>
          <p className="max-w-[52ch] text-[clamp(15px,1.3vw,18px)] text-night-fg2">
            Creates a login for a colleague. Share the password with them in person.
          </p>
        </div>
      </section>
      <div className="flex justify-center bg-blueprint px-[clamp(20px,4vw,72px)] pb-[clamp(48px,6vw,96px)]">
        <form
          onSubmit={submit}
          noValidate
          className="relative -mt-[clamp(72px,8vw,110px)] flex w-full max-w-[620px] animate-rise flex-col gap-5 rounded-[24px] border border-line bg-surface p-[clamp(22px,3vw,36px)] shadow-float"
        >
          {added && (
            <Notice tone="success">
              <strong>Technician added.</strong> {added} can log in now.
            </Notice>
          )}
          {error && <ErrorNotice message={error} />}
          <div aria-hidden className="flex items-center gap-3.5 border-b border-sunken pb-[18px]">
            <span
              className={`flex size-[52px] shrink-0 items-center justify-center rounded-full font-mono text-base font-extrabold transition-colors duration-300 ${
                values.name.trim() ? 'bg-accent text-surface' : 'bg-sunken text-ink-3'
              }`}
            >
              {values.name.trim() ? initials(values.name) : '?'}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[17px] font-bold">{values.name.trim() || 'New technician'}</span>
              <span className="font-mono text-[13px] text-ink-2">{values.username.trim() || 'username'} · Technician</span>
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-[18px]">
            <TextField
              label="Username"
              mono
              autoComplete="off"
              autoCapitalize="none"
              maxLength={64}
              hint="Letters, digits, dot, dash or underscore."
              error={problems.username}
              value={values.username}
              onChange={set('username')}
            />
            <TextField label="Full name" maxLength={200} error={problems.name} value={values.name} onChange={set('name')} />
          </div>
          <PasswordField
            label="Password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            error={problems.password}
            value={values.password}
            onChange={set('password')}
          />
          <div className="flex flex-wrap gap-3 pt-1">
            <button type="submit" className={`${primaryButton} min-h-[54px] px-7 text-base`} disabled={saving}>
              {saving ? 'Adding…' : 'Add technician'}
            </button>
            <Link to="/fleet" className={`${secondaryButton} min-h-[54px]`}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </>
  )
}
