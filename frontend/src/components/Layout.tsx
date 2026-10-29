import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'
import { logout } from '../api/client'
import { Chip } from '../design/Art'
import { useSession } from '../lib/session'
import { Header } from './Header'
import { container } from './ui'

export function Layout() {
  const session = useSession()
  const navigate = useNavigate()
  const loggingOut = useRef(false)

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
  useEffect(() => {
    if (previous.current && !session && !loggingOut.current) setLoginEnded(true)
    if (session) setLoginEnded(false)
    loggingOut.current = false
    previous.current = session
  }, [session])

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <Header session={session} onLogOut={logOut} />
      {loginEnded && <SessionEnded onDismiss={() => setLoginEnded(false)} />}
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-forest text-forest-fg">
        <div className={`${container} flex flex-wrap items-end justify-between gap-5 py-[clamp(32px,5vw,48px)]`}>
          <div className="flex flex-[1_1_360px] items-end gap-4">
            <Chip pose="sleep" anim={['zzz']} className="aspect-[204/214] w-[84px] flex-none" />
            <p className="max-w-[30em] text-sm leading-[1.6] font-medium text-forest-fg2">
              Devices, prices and passports in this demo are sample data (toy values), not measurements. Market charts
              show published figures, each with its source and page.
            </p>
          </div>
          <p className="font-mono text-[13px] font-semibold tracking-[.04em] text-forest-fg3">ReCompute · Sanggar Maos Tradisi · GYEBC 2026</p>
        </div>
      </footer>
    </div>
  )
}

function SessionEnded({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div role="status" className="bg-bar text-sm text-bar-fg">
      <div className={`${container} flex flex-wrap items-center gap-3 py-2.5`}>
        <span className="flex-[1_1_200px]">
          Your login has ended.{' '}
          <Link to="/login" className="font-bold text-sample underline underline-offset-[3px]">
            Log in again
          </Link>
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-9 rounded-full border-[1.5px] border-bar-fg3 bg-transparent px-3 text-[13px] font-bold text-bar-fg hover:border-bar-fg"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
