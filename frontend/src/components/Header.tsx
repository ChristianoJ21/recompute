import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import type { CustomerSession, Session } from '../api/types'
import { Chip } from '../design/Art'
import { useCustomer } from '../lib/session'
import { THEMES, setTheme, useTheme, type Theme } from '../lib/theme'
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
  `inline-flex min-h-10 items-center rounded-[13px] px-3.5 text-[15px] whitespace-nowrap text-ink no-underline transition-colors duration-150 hover:bg-sunken ${
    isActive ? 'bg-sunken font-bold' : 'font-semibold'
  }`

/** On these pages the header's login link would point at the page itself. */
const LOGIN_PATHS = ['/login', '/account/login', '/signup']

// The buttons squish on press (the same spring as the page buttons). The display (inline-flex) is added where it is used,
// because a `hidden` class cannot reliably beat an `inline-flex` in the same class list.
const roundButton =
  'size-11 shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-line-strong bg-transparent text-ink transition-[scale,background-color] duration-200 ease-spring hover:bg-sunken active:scale-90'

const isDark = (theme: Theme) =>
  theme === 'dark' || (theme === 'system' && (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false))

/** Sticky header: a floating cream bar with Chip as the logo; ☰ opens a drawer from the right. */
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

  // No filter, transform or will-change on <header> itself: that would make it the containing block of the fixed drawer.
  return (
    <header ref={headerRef} className="sticky top-0 z-40 px-[clamp(10px,2.4vw,24px)] py-2.5">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 rounded-[22px] bg-surface py-2 pr-2 pl-3.5 shadow-nav">
        <div className="flex min-w-0 items-center gap-[clamp(8px,2vw,24px)]">
          <Link to="/" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-ink no-underline hover:text-ink">
            <Chip pose="head" anim={['antenna']} className="block size-9" />
            <span className="pt-[3px] font-display text-[22px] leading-none font-extrabold tracking-[-.02em] min-[420px]:text-[25px]">ReCompute</span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 min-[900px]:flex">
            {pages.map((page) => (
              <NavLink key={page.to} to={page.to} end className={navClass}>
                {page.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            title="All numbers are sample values, not measurements"
            className="inline-flex -rotate-2 items-center rounded-full border-[1.5px] border-ink bg-sample px-2 py-[6px] text-[10px] leading-none font-extrabold tracking-[.1em] whitespace-nowrap text-sample-ink min-[420px]:px-[11px] min-[420px]:py-[7px] min-[420px]:text-[11px] min-[420px]:tracking-[.14em]"
          >
            SAMPLE DATA
          </span>
          <button
            type="button"
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            className={`${roundButton} hidden sm:inline-flex`}
          >
            <span aria-hidden className="size-[18px] rounded-full border-2 border-ink bg-[linear-gradient(90deg,var(--color-ink)_50%,transparent_50%)]" />
          </button>
          {session ? (
            <AccountChip to="/settings" name={session.technician.name} />
          ) : customer ? (
            <AccountChip to="/account" name={customer.customer.name} />
          ) : (
            !LOGIN_PATHS.includes(location.pathname) && (
              <Link
                to="/account/login"
                className="hidden min-h-11 items-center gap-2 rounded-[14px] border-[1.5px] border-line-strong px-4 text-[15px] font-bold whitespace-nowrap text-ink no-underline transition-[scale,background-color] duration-200 ease-spring hover:bg-sunken hover:text-ink active:scale-95 min-[1000px]:inline-flex"
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
            className={`${roundButton} inline-flex flex-col gap-1`}
          >
            <span aria-hidden className="h-[2.5px] w-[18px] rounded-sm bg-ink" />
            <span aria-hidden className="h-[2.5px] w-3.5 rounded-sm bg-ink" />
            <span aria-hidden className="h-[2.5px] w-[18px] rounded-sm bg-ink" />
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

const drawerLabel = 'rc-eyebrow text-[11px] text-ink-2'
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
  const accountRow = 'flex min-h-[60px] flex-col justify-center gap-1 rounded-[14px] px-3 py-2 text-left text-ink no-underline hover:bg-sunken hover:text-ink'
  return (
    <>
      <div aria-hidden onClick={() => onClose()} className="fixed inset-0 z-50 bg-[rgba(18,36,27,.45)]" />
      <nav
        id="rc-menu"
        aria-label="Menu"
        className="fixed top-2.5 right-2.5 bottom-2.5 z-51 flex w-[min(380px,calc(100vw-20px))] animate-drawer flex-col overflow-y-auto rounded-[26px] bg-surface text-ink shadow-[0_30px_60px_-20px_rgba(18,36,27,.6)]"
      >
        <div className="flex items-center justify-between border-b-2 border-dashed border-line py-3 pr-4 pl-[22px]">
          <span className={drawerLabel}>MENU</span>
          <button type="button" aria-label="Close menu" onClick={() => onClose(true)} className={`${roundButton} inline-flex text-xl leading-none font-bold`}>
            <span aria-hidden>×</span>
          </button>
        </div>
        <div className="flex flex-col gap-1 px-3.5 pt-[18px] pb-2">
          <span className={`${drawerLabel} px-2 pb-2`}>PAGES</span>
          {pages.map((page) => (
            <NavLink
              key={page.to}
              to={page.to}
              end
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex min-h-[50px] items-center justify-between rounded-[14px] px-3 text-[17px] font-bold text-ink no-underline hover:bg-sunken hover:text-ink ${isActive ? 'bg-sunken' : ''}`
              }
            >
              {page.label}
              <span className="font-mono text-[13px] font-medium text-ink-2">{page.to}</span>
            </NavLink>
          ))}
        </div>
        <div className="flex flex-col gap-2.5 border-b-2 border-dashed border-line px-[22px] pt-3.5 pb-[18px]">
          <span className={drawerLabel}>APPEARANCE</span>
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-2xl bg-sunken p-1">
            {THEMES.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={theme === option}
                onClick={() => setTheme(option)}
                className={`min-h-[42px] rounded-xl text-sm font-bold transition-[scale,background-color] duration-200 ease-spring active:scale-95 ${
                  theme === option ? 'bg-ink text-surface' : 'text-ink'
                }`}
              >
                {THEME_SHORT[option]}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-auto flex flex-col gap-0.5 px-3.5 py-[18px]">
          <span className={`${drawerLabel} px-2 pb-2`}>ACCOUNT</span>
          {session ? (
            <AccountCard name={session.technician.name} detail={`${session.technician.username} · Technician (admin)`} />
          ) : customer ? (
            <AccountCard name={customer.customer.name} detail={`${customer.customer.email} · Customer`} />
          ) : (
            <>
              <Link to="/account/login" onClick={() => onClose()} className={accountRow}>
                <span className="text-base font-bold">Customer login</span>
                <span className="text-[13.5px] leading-[1.35] text-ink-2">Save devices and ask the data centre about them</span>
              </Link>
              <Link to="/signup" onClick={() => onClose()} className={accountRow}>
                <span className="text-base font-bold">Create an account</span>
                <span className="text-[13.5px] leading-[1.35] text-ink-2">For buyers. No checkout: prices are sample values</span>
              </Link>
              <Link to="/login" onClick={() => onClose()} className={accountRow}>
                <span className="text-base font-bold">Technician login</span>
                <span className="text-[13.5px] leading-[1.35] text-ink-2">Staff only. An admin creates staff accounts.</span>
              </Link>
            </>
          )}
          <Link to="/settings" onClick={() => onClose()} className={accountRow}>
            <span className="text-base font-bold">Settings</span>
            <span className="text-[13.5px] leading-[1.35] text-ink-2">{session ? 'Profile, password, appearance' : 'Appearance'}</span>
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
              <span className="text-base font-bold">Log out</span>
              <span className="text-[13.5px] leading-[1.35] text-ink-2">Ends your login on this device</span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}

const chipClass =
  'hidden min-h-11 items-center gap-2.5 rounded-[14px] border-[1.5px] border-line-strong py-0 pr-3.5 pl-[5px] text-[15px] font-bold whitespace-nowrap text-ink no-underline hover:bg-sunken hover:text-ink min-[1000px]:inline-flex'

/** The logged-in person in the header: technicians open Settings, customers My account. */
function AccountChip({ to, name }: { to: string; name: string }) {
  return (
    <Link to={to} className={chipClass}>
      <span aria-hidden className="flex size-[34px] items-center justify-center rounded-[10px] bg-ink font-mono text-xs font-extrabold text-surface">
        {initials(name)}
      </span>
      {name.replace(/\s*\(.*?\)/g, '')}
    </Link>
  )
}

function AccountCard({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 px-3 pt-1.5 pb-2.5">
      <span aria-hidden className="flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-ink font-mono text-sm font-extrabold text-surface">
        {initials(name)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[15px] font-bold">{name}</span>
        <span className="font-mono text-xs break-all text-ink-2">{detail}</span>
      </span>
    </div>
  )
}
