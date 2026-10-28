import { Link } from 'react-router'
import { container, linkClass, panelClass } from '../components/ui'

export function NotFoundPage() {
  return (
    <div className={`${container} py-[clamp(32px,6vw,72px)]`}>
      <NotFoundPanel />
    </div>
  )
}

/** Also shown for an unknown device ID, e.g. a mistyped or damaged QR label. */
export function NotFoundPanel() {
  return (
    <div className={`flex flex-col gap-2 p-8 ${panelClass}`}>
        <span className="font-mono text-[13px] font-bold text-accent">404</span>
        <h1 className="text-2xl font-bold tracking-[-.02em]">No page or device at this address</h1>
        <p className="text-[15px] text-ink-2">If you scanned a QR label, check the device ID printed under the code.</p>
        <Link to="/" className={`${linkClass} inline-flex min-h-11 items-center self-start text-sm`}>
          ← Available hardware
        </Link>
    </div>
  )
}
