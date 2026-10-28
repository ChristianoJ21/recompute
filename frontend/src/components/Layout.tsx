import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { logout } from '../api/client'
import { useSession } from '../lib/session'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-2 py-1 font-medium ${isActive ? 'bg-emerald-50 text-emerald-900' : 'text-gray-600 hover:text-emerald-800'}`

export function Layout() {
  const session = useSession()
  const navigate = useNavigate()

  // Leave the page first: on /fleet, forgetting the token first would bounce to the login page.
  const logOut = () => {
    loggingOut.current = true
    navigate('/')
    logout()
  }

  // A login that ends without the Log out button (expired or refused token) gets a visible note,
  // because the action buttons disappear from the page at the same moment.
  const [loginEnded, setLoginEnded] = useState(false)
  const previous = useRef(session)
  const loggingOut = useRef(false)
  useEffect(() => {
    if (previous.current && !session && !loggingOut.current) setLoginEnded(true)
    if (session) setLoginEnded(false)
    loggingOut.current = false
    previous.current = session
  }, [session])

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-emerald-900">
            <LogoMark />
            ReCompute
          </Link>
          <SampleDataLabel />
        </div>
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-1 gap-y-2 px-4 pb-2 text-sm"
        >
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
          <span className="ml-auto flex items-center gap-2">
            {session ? (
              <>
                <span className="text-gray-600">{session.technician.name}</span>
                <button
                  type="button"
                  onClick={logOut}
                  className="rounded-md px-2 py-1 font-semibold text-emerald-800 hover:bg-emerald-50"
                >
                  Log out
                </button>
              </>
            ) : (
              <NavLink to="/login" className={navClass}>
                Technician login
              </NavLink>
            )}
          </span>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-12">
        {loginEnded && (
          <div
            role="status"
            className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          >
            <span className="flex-1">Your login has ended, so the technician buttons are hidden. Log in again to continue.</span>
            <Link to="/login" className="font-semibold underline underline-offset-2">
              Log in
            </Link>
            <button type="button" onClick={() => setLoginEnded(false)} className="font-semibold">
              Dismiss
            </button>
          </div>
        )}
        <Outlet />
      </main>
      <footer className="border-t border-gray-100 bg-gray-50">
        <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-gray-500">
          Every number in this demo is sample data that shows how the decision rule works. Nothing here is a
          measurement.
        </p>
      </footer>
    </div>
  )
}

function SampleDataLabel() {
  return (
    <span
      title="All numbers are sample values, not measurements"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold tracking-wider text-amber-900"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
      SAMPLE DATA
    </span>
  )
}

function LogoMark() {
  return (
    <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-emerald-700 text-white">
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    </span>
  )
}
