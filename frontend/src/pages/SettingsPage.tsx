import { useState, type FormEvent } from 'react'
import { changePassword, describeError, updateProfile } from '../api/client'
import type { Session } from '../api/types'
import {
  ErrorNotice,
  HeroLabel,
  HeroText,
  Notice,
  PageHero,
  Panel,
  PanelTag,
  PasswordField,
  TextField,
  band,
  container,
  initials,
  primaryButton,
} from '../components/ui'
import { Chip } from '../design/Art'
import { THEMES, THEME_LABEL, setTheme, useTheme, type Theme } from '../lib/theme'
import { useSession } from '../lib/session'

const MIN_PASSWORD = 10 // same rule as the backend (api/auth.py)

/** Appearance for everyone; profile and password for a logged-in technician (contract v2.3). */
export function SettingsPage() {
  const session = useSession()
  const sections = session
    ? [
        ['01', 'Profile', '#profile'],
        ['02', 'Credentials', '#credentials'],
        ['03', 'Appearance', '#appearance'],
      ]
    : [['01', 'Appearance', '#appearance']]

  return (
    <>
      <PageHero
        eyebrow={<HeroLabel>SETTINGS</HeroLabel>}
        title="Settings"
        mascot={
          session ? (
            <span
              aria-hidden
              className="flex size-[clamp(72px,7vw,104px)] shrink-0 rotate-3 items-center justify-center rounded-[24px] bg-ink font-mono text-[clamp(22px,2.2vw,32px)] font-extrabold text-surface shadow-float"
            >
              {initials(session.technician.name)}
            </span>
          ) : (
            <Chip pose="work" anim={['work', 'blink']} className="aspect-[280/214] w-[150px]" />
          )
        }
      >
        <HeroText>
          {session
            ? `Signed in as ${session.technician.name}. Profile and password changes apply to this account only.`
            : 'Visitors can change the appearance. Log in to manage a technician profile and password.'}
        </HeroText>
      </PageHero>
      <div className={band}>
        <div className={`${container} flex flex-wrap items-start gap-[clamp(20px,3vw,48px)]`}>
          <nav
            aria-label="Settings sections"
            className="flex max-w-full flex-[1_1_220px] flex-row flex-wrap gap-1.5 rounded-[24px] bg-surface p-2 shadow-panel md:sticky md:top-[93px] md:flex-col"
          >
            {sections.map(([n, label, href]) => (
              <a
                key={href}
                href={href}
                className="flex min-h-[52px] items-center gap-3 rounded-[16px] px-3.5 text-[15px] font-bold text-ink no-underline hover:bg-sunken hover:text-ink"
              >
                <span className="font-mono text-xs text-accent">{n}</span>
                {label}
              </a>
            ))}
          </nav>
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-[clamp(20px,2.4vw,28px)]">
            {session && <ProfilePanel session={session} />}
            {session && <CredentialsPanel />}
            <AppearancePanel index={session ? '03' : '01'} />
          </div>
        </div>
      </div>
    </>
  )
}

function ProfilePanel({ session }: { session: Session }) {
  const { username, name: savedName } = session.technician
  const [name, setName] = useState(savedName)
  const [problem, setProblem] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaved(false)
    setError(null)
    const trimmed = name.trim()
    setProblem(trimmed ? null : 'Enter your full name.')
    if (!trimmed) return
    setSaving(true)
    try {
      const technician = await updateProfile(trimmed)
      setName(technician.name)
      setSaved(true)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setSaving(false)
    }
  }

  const readOnly = 'flex min-h-[50px] items-center rounded-[14px] bg-sunken px-4 text-[15px]'
  return (
    <Panel id="profile" title="Profile" aside={<PanelTag>01</PanelTag>}>
      <div className="flex items-center gap-3.5">
        <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-ink font-mono text-lg font-bold text-surface">
          {initials(savedName)}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-[17px] font-bold">{savedName}</span>
          <span className="font-mono text-[13px] text-ink-2">{username} · Technician</span>
        </div>
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField label="Full name" maxLength={200} autoComplete="name" error={problem} value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Username</span>
            <span className={`${readOnly} font-mono`}>{username}</span>
            <span className="text-[13px] text-ink-2">Only an admin can change it.</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Role</span>
            <span className={readOnly}>Technician</span>
          </div>
        </div>
        {error && <ErrorNotice message={error} />}
        {saved && (
          <Notice tone="success">
            <strong>Profile saved.</strong> New passport events still record your username.
          </Notice>
        )}
        <div>
          <button type="submit" className={primaryButton} disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </Panel>
  )
}

const EMPTY = { current: '', next: '', confirm: '' }

function CredentialsPanel() {
  const [values, setValues] = useState(EMPTY)
  const [problem, setProblem] = useState<{ field: 'current' | 'next' | 'confirm'; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [changed, setChanged] = useState(false)
  const [saving, setSaving] = useState(false)
  const set = (field: keyof typeof EMPTY) => (event: { target: { value: string } }) => setValues({ ...values, [field]: event.target.value })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setChanged(false)
    setError(null)
    const found = !values.current
      ? ({ field: 'current', text: 'Enter your current password.' } as const)
      : values.next.length < MIN_PASSWORD
        ? ({ field: 'next', text: `Password needs at least ${MIN_PASSWORD} characters.` } as const)
        : values.confirm !== values.next
          ? ({ field: 'confirm', text: 'The two new passwords do not match.' } as const)
          : null
    setProblem(found)
    if (found) return
    setSaving(true)
    try {
      await changePassword(values.current, values.next)
      setValues(EMPTY)
      setChanged(true)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setSaving(false)
    }
  }

  const problemFor = (field: 'current' | 'next' | 'confirm') => (problem?.field === field ? problem.text : null)
  return (
    <Panel id="credentials" title="Credentials" aside={<PanelTag>02</PanelTag>}>
      <p className="text-sm text-ink-2">You stay logged in on this device after the change.</p>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <PasswordField
          label="Current password"
          autoComplete="current-password"
          error={problemFor('current')}
          value={values.current}
          onChange={set('current')}
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4">
          <PasswordField
            label="New password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            error={problemFor('next')}
            value={values.next}
            onChange={set('next')}
          />
          <PasswordField
            label="Confirm new password"
            autoComplete="new-password"
            hint={values.confirm && values.confirm !== values.next ? 'Passwords don’t match yet.' : undefined}
            error={problemFor('confirm')}
            value={values.confirm}
            onChange={set('confirm')}
          />
        </div>
        {error && <ErrorNotice message={error} />}
        {changed && (
          <Notice tone="success">
            <strong>Password changed.</strong> Use the new one next time you log in.
          </Notice>
        )}
        <div>
          <button type="submit" className={primaryButton} disabled={saving}>
            {saving ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </Panel>
  )
}

// Fixed preview colours: each card shows its own theme whatever the page is in (mint paper + cream card, forest paper + card).
const PREVIEW = {
  light: { page: '#F1F7F2', bar: '#FFFCF5', panel: '#FFFCF5', line: '#D2E0D6', ink: '#1E3B2C', accent: '#FF7A33' },
  dark: { page: '#12241B', bar: '#1B3327', panel: '#1B3327', line: '#2A4636', ink: '#EAF3EC', accent: '#FF7A33' },
}

const THEME_TEXT: Record<Theme, { sub: string; previews: (keyof typeof PREVIEW)[] }> = {
  light: { sub: 'Light background', previews: ['light'] },
  dark: { sub: 'Dark background, easier in dim rooms', previews: ['dark'] },
  system: { sub: 'Follows your phone or laptop setting', previews: ['light', 'dark'] },
}

function AppearancePanel({ index }: { index: string }) {
  const theme = useTheme()
  return (
    <Panel id="appearance" title="Appearance" aside={<PanelTag>{index}</PanelTag>}>
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-3">
        {THEMES.map((value) => {
          const on = theme === value
          return (
            <label
              key={value}
              className={`flex cursor-pointer flex-col overflow-hidden rounded-[20px] border-2 bg-surface transition-[translate,box-shadow] duration-200 ease-spring hover:-translate-y-[3px] has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${
                on ? '-translate-y-[3px] border-ink shadow-[0_5px_0_var(--color-ink)]' : 'border-line hover:border-line-strong'
              }`}
            >
              <input type="radio" name="theme" value={value} checked={on} onChange={() => setTheme(value)} className="sr-only" />
              <span aria-hidden className="flex h-[104px] border-b border-line">
                {THEME_TEXT[value].previews.map((key) => {
                  const p = PREVIEW[key]
                  return (
                    <span key={key} className="flex flex-1 flex-col gap-[5px] p-2" style={{ background: p.page }}>
                      <span className="h-[7px]" style={{ background: p.bar }} />
                      <span className="flex flex-1 flex-col gap-[5px] border p-1.5" style={{ background: p.panel, borderColor: p.line }}>
                        <span className="h-1 w-[64%]" style={{ background: p.ink }} />
                        <span className="h-1 w-[36%]" style={{ background: p.accent }} />
                      </span>
                    </span>
                  )
                })}
              </span>
              <span className="flex items-start gap-2.5 px-3 py-2.5">
                <span
                  aria-hidden
                  className={`mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-ink' : 'border-line-strong'}`}
                >
                  <span className={`size-2 rounded-full ${on ? 'bg-ink' : ''}`} />
                </span>
                <span className="flex flex-col">
                  <span className="text-[15px] font-bold">{THEME_LABEL[value]}</span>
                  <span className="text-[13px] text-ink-2">{THEME_TEXT[value].sub}</span>
                </span>
              </span>
            </label>
          )
        })}
      </div>
      <p className="text-[13px] text-ink-2">Saved on this device. Applies to every page, including passports opened from a QR label.</p>
    </Panel>
  )
}
