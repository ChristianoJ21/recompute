import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import type { CustomerSession, Session } from '../api/types'
import { useCustomer } from '../lib/session'
import { THEMES, setTheme, useTheme, type Theme } from '../lib/theme'
import { LogoMark } from './icons'
import { initials } from './ui'

interface HeaderProps {
  session: Session | null
  onLogOut: () => void
}

interface Page {
  to: string
  label: string
}

const PUBLIC_PAGES: Page[] = [
  { to: '/', label: 'Home' },
  { to: '/hardware', label: 'Available hardware' },
  { to: '/market', label: 'Market' },
]
const TECHNICIAN_PAGES: Page[] = [{ to: '/fleet', label: 'Fleet' }]
const CUSTOMER_PAGES: Page[] = [{ to: '/account', label: 'My account' }]
/** Drawer only: forms reached from the fleet dashboard. */
const TECHNICIAN_ACTIONS: Page[] = [
  { to: '/devices/new', label: 'Add device' },
  { to: '/technicians/new', label: 'Add technician' },
]

const navClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-10 items-center rounded-full px-3.5 text-sm font-semibold whitespace-nowrap no-underline transition-colors duration-150 ${
    isActive ? 'bg-night-accent/15 text-white' : 'text-night-fg2 hover:bg-white/8 hover:text-white'
  }`

/** On these pages the header's login link would point at the page itself. */
const LOGIN_PATHS = ['/login', '/account/login', '/signup']

const roundButton =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-transparent text-night-fg transition-colors duration-150 hover:bg-white/8'

const isDark = (theme: Theme) =>
  theme === 'dark' || (theme === 'system' && (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false))

/** v3 header: always dark glass, sticky; ☰ opens a drawer from the right. */
export function Header({ session, onLogOut }: HeaderProps) {
  const location = useLocation()
  // The menu belongs to the page it was opened on, so it closes by itself on navigation.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === location.pathname
  const headerRef = useRef<HTMLElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const theme = useTheme()
  const dark = isDark(theme)
  const customer = useCustomer()
  const pages = session ? [...PUBLIC_PAGES, ...TECHNICIAN_PAGES] : customer ? [...PUBLIC_PAGES, ...CUSTOMER_PAGES] : PUBLIC_PAGES

  const close = (refocus = false) => {
    setOpenOn(null)
    if (refocus) buttonRef.current?.focus()
  }

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
    <header
      ref={headerRef}
      data-theme="dark"
      className="sticky top-0 z-40 border-b border-white/8 text-night-fg"
    >
      {/* The glass lives on its own layer: a filter on <header> itself would trap the fixed drawer inside the bar. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-night/95 backdrop-blur-[14px] backdrop-saturate-[1.4]" />
      <div className="flex min-h-[68px] items-center gap-[clamp(16px,3vw,40px)] px-[clamp(20px,4vw,72px)]">
        <Link to="/" className="inline-flex min-h-11 shrink-0 items-center gap-2.5 text-white no-underline">
          <LogoMark />
          <span className="text-[19px] font-bold tracking-[-.02em]">ReCompute</span>
        </Link>
        <nav aria-label="Main" className="hidden gap-1 min-[860px]:flex">
          {pages.map((page) => (
            <NavLink key={page.to} to={page.to} end className={navClass}>
              {page.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          <span
            title="All numbers are sample values, not measurements"
            className="inline-flex items-center rounded-full bg-sample px-[9px] py-[5px] font-mono text-[11px] leading-none font-extrabold tracking-[.1em] whitespace-nowrap text-sample-ink"
          >
            SAMPLE DATA
          </span>
          <button
            type="button"
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            className={`${roundButton} text-[17px]`}
          >
            <span aria-hidden>{dark ? '☀' : '☾'}</span>
          </button>
          {session ? (
            <AccountChip to="/settings" name={session.technician.name} />
          ) : customer ? (
            <AccountChip to="/account" name={customer.customer.name} />
          ) : (
            !LOGIN_PATHS.includes(location.pathname) && (
              <Link
                to="/account/login"
                className="hidden min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold whitespace-nowrap text-white no-underline transition-colors duration-150 hover:border-night-accent hover:bg-night-accent/10 min-[1120px]:inline-flex"
              >
                Log in
                <span aria-hidden>→</span>
              </Link>
            )
          )}
          <button
            ref={buttonRef}
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="rc-menu"
            onClick={() => setOpenOn(open ? null : location.pathname)}
            className={`${roundButton} flex-col gap-1`}
          >
            {[0, 1, 2].map((bar) => (
              <span key={bar} aria-hidden className="h-0.5 w-4 bg-night-fg" />
            ))}
          </button>
        </div>
      </div>
      {open && (
        <Drawer
          session={session}
          customer={customer}
          pages={session ? [...pages, ...TECHNICIAN_ACTIONS] : pages}
          theme={theme}
          onClose={close}
          onLogOut={onLogOut}
        />
      )}
    </header>
  )
}

const drawerLabel = 'font-mono text-[11px] tracking-[.1em] text-night-fg3'
const THEME_SHORT: Record<Theme, string> = { light: 'Light', dark: 'Dark', system: 'Auto' }

interface DrawerProps {
  session: Session | null
  customer: CustomerSession | null
  pages: Page[]
  theme: Theme
  onClose: (refocus?: boolean) => void
  onLogOut: () => void
}

function Drawer({ session, customer, pages, theme, onClose, onLogOut }: DrawerProps) {
  const accountRow =
    'flex min-h-[60px] flex-col justify-center rounded-xl px-3.5 py-1.5 text-left text-white no-underline hover:bg-white/6'
  return (
    <>
      <div aria-hidden onClick={() => onClose()} className="fixed inset-0 z-50 bg-[rgba(4,18,10,.55)] backdrop-blur-[3px]" />
      <nav
        id="rc-menu"
        aria-label="Menu"
        className="fixed inset-y-0 right-0 z-51 flex w-[min(380px,92vw)] animate-drawer flex-col overflow-y-auto border-l border-night-line bg-night-2 text-night-fg shadow-[-30px_0_60px_rgba(0,0,0,.4)]"
      >
        <div className="flex items-center justify-between border-b border-night-line px-5 py-4">
          <span className={`${drawerLabel} text-xs`}>MENU</span>
          <button type="button" aria-label="Close menu" onClick={() => onClose(true)} className={`${roundButton} border-night-line text-lg`}>
            <span aria-hidden>✕</span>
          </button>
        </div>
        <span className={`${drawerLabel} px-[26px] pt-4 pb-1`}>PAGES</span>
        <div className="flex flex-col px-3 pt-1 pb-3">
          {pages.map((page) => (
            <NavLink
              key={page.to}
              to={page.to}
              end
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex min-h-[54px] items-center justify-between rounded-xl px-3.5 text-[17px] font-semibold text-white no-underline hover:bg-white/6 ${
                  isActive ? 'bg-night-accent/14' : ''
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {page.label}
                  <span className={`font-mono text-xs font-normal ${isActive ? 'text-night-accent' : 'text-night-fg3'}`}>{page.to}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
        <div className="flex flex-col gap-2.5 border-t border-night-line px-[26px] py-4">
          <span className={drawerLabel}>APPEARANCE</span>
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-full border border-night-line bg-night p-1">
            {THEMES.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={theme === option}
                onClick={() => setTheme(option)}
                className={`min-h-[38px] rounded-full text-[13px] font-semibold transition-colors duration-200 ${
                  theme === option ? 'bg-night-accent text-night' : 'text-night-fg2 hover:bg-white/6'
                }`}
              >
                {THEME_SHORT[option]}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-auto flex flex-col gap-1 border-t border-night-line p-3">
          <span className={`${drawerLabel} px-3.5 py-1.5`}>ACCOUNT</span>
          {session ? (
            <AccountCard name={session.technician.name} detail={`${session.technician.username} · Technician (admin)`} />
          ) : customer ? (
            <AccountCard name={customer.customer.name} detail={`${customer.customer.email} · Customer`} />
          ) : (
            <>
              <Link to="/account/login" onClick={() => onClose()} className={accountRow}>
                <span className="text-base font-semibold">Customer login</span>
                <span className="text-[13px] text-night-fg2">Save devices and ask the data centre about them</span>
              </Link>
              <Link to="/signup" onClick={() => onClose()} className={accountRow}>
                <span className="text-base font-semibold">Create an account</span>
                <span className="text-[13px] text-night-fg2">For buyers. No checkout: prices are sample values</span>
              </Link>
              <Link to="/login" onClick={() => onClose()} className={accountRow}>
                <span className="text-base font-semibold">Technician login</span>
                <span className="text-[13px] text-night-fg2">Staff only. An admin creates staff accounts.</span>
              </Link>
            </>
          )}
          <Link to="/settings" onClick={() => onClose()} className={accountRow}>
            <span className="text-base font-semibold">Settings</span>
            <span className="text-[13px] text-night-fg2">{session ? 'Profile, password, appearance' : 'Appearance'}</span>
          </Link>
          {(session || customer) && (
            <button
              type="button"
              onClick={() => {
                onClose()
                onLogOut()
              }}
              className={accountRow}
            >
              <span className="text-base font-semibold">Log out</span>
              <span className="text-[13px] text-night-fg2">Ends your login on this device</span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}

const chipClass =
  'hidden min-h-11 items-center gap-2.5 rounded-full border border-white/15 py-0 pr-3.5 pl-[5px] text-sm font-semibold whitespace-nowrap text-white no-underline hover:bg-white/5 min-[1120px]:inline-flex'

/** The logged-in person in the header: technicians open Settings, customers My account. */
function AccountChip({ to, name }: { to: string; name: string }) {
  return (
    <Link to={to} className={chipClass}>
      <span aria-hidden className="flex size-[34px] items-center justify-center rounded-full bg-night-accent font-mono text-xs font-extrabold text-night">
        {initials(name)}
      </span>
      {name.replace(/\s*\(.*?\)/g, '')}
    </Link>
  )
}

function AccountCard({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 px-3.5 pt-1.5 pb-2.5">
      <span aria-hidden className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-night-accent font-mono text-sm font-extrabold text-night">
        {initials(name)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[15px] font-bold">{name}</span>
        <span className="font-mono text-xs break-all text-night-fg2">{detail}</span>
      </span>
    </div>
  )
}
