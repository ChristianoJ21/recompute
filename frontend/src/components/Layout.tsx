import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'
import { logout } from '../api/client'
import { useSession } from '../lib/session'
import { Header } from './Header'
import { container, secondaryButton } from './ui'

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
    <div className="flex min-h-dvh flex-col">
      <Header session={session} onLogOut={logOut} />
      {loginEnded && <SessionEnded onDismiss={() => setLoginEnded(false)} />}
      <main className="flex-1">
        <Outlet />
      </main>
      <footer data-theme="dark" className="bg-night text-[13px] text-night-fg2">
        <div className={`${container} flex flex-wrap justify-between gap-x-8 gap-y-2.5 py-7`}>
          <p className="max-w-[62ch] text-night-fg">
            Every number in this demo is sample data (toy values). Nothing here is a measurement.
          </p>
          <p className="font-mono text-xs">ReCompute · student demo · GYEBC 2026</p>
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
          <Link to="/login" className="font-semibold text-sample underline underline-offset-[3px]">
            Log in again
          </Link>
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className={`${secondaryButton} min-h-9 border-bar-fg3 bg-transparent px-3 text-[13px] text-bar-fg hover:border-bar-fg hover:bg-transparent`}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
