import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import type { Session } from '../api/types'
import { THEME_LABEL, useTheme } from '../lib/theme'
import { LogoMark, SampleIcon } from './icons'
import { container, initials } from './ui'

interface HeaderProps {
  session: Session | null
  onLogOut: () => void
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-[52px] items-center px-3 text-sm font-semibold ${
    isActive ? 'text-ink shadow-[inset_0_-2px_0_var(--color-accent)]' : 'text-ink-2 hover:text-ink'
  }`

export function Header({ session, onLogOut }: HeaderProps) {
  const location = useLocation()
  // The menu belongs to the page it was opened on, so it closes by itself on navigation.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === location.pathname
  const headerRef = useRef<HTMLElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const close = () => setOpenOn(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpenOn(null)
      buttonRef.current?.focus()
    }
    const onPointer = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpenOn(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <header ref={headerRef} className="relative z-20 border-b border-line bg-surface">
      <UtilityBar session={session} onLogOut={onLogOut} onLogin={location.pathname === '/login'} />
      <div className={`${container} relative flex min-h-[60px] items-center gap-6`}>
        <Link to="/" className="inline-flex min-h-14 shrink-0 items-center gap-2.5 text-ink no-underline">
          <LogoMark />
          <span className="text-lg font-bold tracking-[-.02em]">ReCompute</span>
        </Link>
        <nav aria-label="Main" className="hidden items-stretch min-[720px]:flex">
          <NavLink to="/" end className={navClass}>
            Available hardware
          </NavLink>
          <NavLink to="/market" className={navClass}>
            Market
          </NavLink>
          {session && (
            <NavLink to="/fleet" className={navClass}>
              Fleet
            </NavLink>
          )}
        </nav>
        <button
          ref={buttonRef}
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          aria-controls="rc-menu"
          onClick={() => setOpenOn(open ? null : location.pathname)}
          className={`ml-auto flex size-11 shrink-0 flex-col items-center justify-center gap-1 rounded-ctl border ${
            open ? 'border-ink bg-ink' : 'border-line-strong bg-surface'
          }`}
        >
          {open ? (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M2 2l12 12M14 2L2 14" className="stroke-surface" strokeWidth="2" />
            </svg>
          ) : (
            [0, 1, 2].map((bar) => <span key={bar} aria-hidden className="h-0.5 w-[18px] bg-ink" />)
          )}
        </button>
        {open && <Menu session={session} onClose={close} onLogOut={onLogOut} />}
      </div>
    </header>
  )
}

interface UtilityBarProps extends HeaderProps {
  onLogin: boolean
}

function UtilityBar({ session, onLogOut, onLogin }: UtilityBarProps) {
  return (
    <div className="border-b border-bar-line bg-bar text-bar-fg2">
      <div className={`${container} flex min-h-11 flex-wrap items-center justify-between gap-3 font-mono text-xs`}>
        <span
          title="All numbers are sample values, not measurements"
          className="inline-flex items-center gap-[7px] rounded-ctl bg-sample px-2 py-1 text-[11px] leading-none font-extrabold tracking-[.1em] text-sample-ink"
        >
          <SampleIcon />
          SAMPLE DATA
        </span>
        {session ? (
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="size-1.5 bg-[#5FD08A]" />
            <span>{session.technician.name}</span>
            <span aria-hidden className="text-bar-fg3">
              /
            </span>
            <button
              type="button"
              onClick={onLogOut}
              className="inline-flex min-h-11 items-center font-semibold text-bar-fg underline underline-offset-[3px]"
            >
              Log out
            </button>
          </span>
        ) : (
          <Link
            to="/login"
            className={`inline-flex min-h-11 items-center gap-1.5 font-semibold text-bar-fg no-underline ${
              onLogin ? 'shadow-[inset_0_-2px_0_var(--color-sample)]' : ''
            }`}
          >
            Technician login
            <span aria-hidden className="text-bar-fg3">
              →
            </span>
          </Link>
        )}
      </div>
    </div>
  )
}

const menuLabel = 'px-4 pt-3 pb-1.5 font-mono text-[11px] font-semibold tracking-[.08em] text-ink-2'

interface MenuProps {
  session: Session | null
  onClose: () => void
  onLogOut: () => void
}

function Menu({ session, onClose, onLogOut }: MenuProps) {
  const theme = useTheme()
  const pages = [
    { to: '/', label: 'Available hardware' },
    { to: '/market', label: 'Market' },
    ...(session
      ? [
          { to: '/fleet', label: 'Fleet' },
          { to: '/technicians/new', label: 'Add technician' },
        ]
      : []),
  ]
  const accountRow = 'flex min-h-[52px] flex-col justify-center border-t border-sunken px-4 py-1.5 text-left text-ink no-underline hover:bg-raised'

  return (
    <nav
      id="rc-menu"
      aria-label="Menu"
      className="absolute top-[calc(100%+1px)] right-[clamp(16px,4vw,40px)] flex w-[min(340px,calc(100vw-32px))] flex-col border border-ink bg-surface text-ink shadow-offset"
    >
      <span className={menuLabel}>PAGES</span>
      {pages.map((page) => (
        <NavLink
          key={page.to}
          to={page.to}
          end
          onClick={onClose}
          className={({ isActive }) =>
            `flex min-h-12 items-center justify-between gap-3 px-4 text-[15px] font-semibold text-ink no-underline hover:bg-raised ${
              isActive ? 'bg-raised shadow-[inset_3px_0_0_var(--color-accent)]' : ''
            }`
          }
        >
          <span>{page.label}</span>
          <span className="font-mono text-xs font-normal text-ink-3">{page.to}</span>
        </NavLink>
      ))}
      <div className="mt-1.5 flex flex-col border-t border-line">
        <span className={menuLabel}>ACCOUNT</span>
        {session && (
          <div className="flex items-center gap-3 px-4 pt-1.5 pb-3">
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center bg-accent font-mono text-sm font-bold text-surface">
              {initials(session.technician.name)}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[15px] font-bold">{session.technician.name}</span>
              <span className="font-mono text-xs text-ink-2">{session.technician.username} · Technician</span>
            </span>
          </div>
        )}
        {!session && (
          <Link to="/login" onClick={onClose} className={accountRow}>
            <span className="text-[15px] font-semibold">Technician login</span>
            <span className="text-[13px] text-ink-2">Staff only. There is no sign-up.</span>
          </Link>
        )}
        <Link to="/settings" onClick={onClose} className={accountRow}>
          <span className="text-[15px] font-semibold">Settings</span>
          <span className="text-[13px] text-ink-2">{session ? 'Profile, password, appearance' : 'Appearance'}</span>
        </Link>
        {session && (
          <button
            type="button"
            onClick={() => {
              onClose()
              onLogOut()
            }}
            className={accountRow}
          >
            <span className="text-[15px] font-semibold">Log out</span>
            <span className="text-[13px] text-ink-2">Ends your login on this device</span>
          </button>
        )}
      </div>
      <div className="flex justify-between gap-3 border-t border-line bg-raised px-4 py-2.5 font-mono text-xs text-ink-2">
        <span>Appearance</span>
        <span className="font-semibold text-ink">{THEME_LABEL[theme]}</span>
      </div>
    </nav>
  )
}
