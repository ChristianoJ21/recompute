import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { addTechnician, describeError } from '../api/client'
import { ErrorNotice, Notice, TextField, panelClass, primaryButton } from '../components/ui'

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
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-5 px-4 pt-[clamp(28px,5vw,56px)] pb-16">
      <Link to="/fleet" className="inline-flex min-h-8 items-center self-start font-mono text-xs text-accent no-underline hover:underline">
        ← Fleet
      </Link>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-.03em]">Add a technician</h1>
        <p className="text-[15px] text-ink-2">Creates a login for a colleague. Share the password with them in person.</p>
      </div>
      <form onSubmit={submit} noValidate className={`flex flex-col gap-4 p-5 ${panelClass}`}>
        {added && (
          <Notice tone="success">
            <strong>Technician added.</strong> {added} can log in now.
          </Notice>
        )}
        {error && <ErrorNotice message={error} />}
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
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters.`}
          error={problems.password}
          value={values.password}
          onChange={set('password')}
        />
        <div>
          <button type="submit" className={`${primaryButton} min-h-12 px-5 text-[15px]`} disabled={saving}>
            {saving ? 'Adding…' : 'Add technician'}
          </button>
        </div>
      </form>
    </div>
  )
}
