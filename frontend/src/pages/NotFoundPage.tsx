import { Link } from 'react-router'
import { band, container, linkClass, panelClass } from '../components/ui'

export function NotFoundPage() {
  return (
    <div className={band}>
      <div className={container}>
        <NotFoundPanel />
      </div>
    </div>
  )
}

/** Also shown for an unknown device ID, e.g. a mistyped or damaged QR label. */
export function NotFoundPanel() {
  return (
    <div className={`flex flex-col gap-2.5 p-[clamp(24px,4vw,48px)] ${panelClass}`}>
        <span className="font-mono text-[13px] font-bold text-accent">404</span>
        <h1 className="text-[clamp(28px,3vw,40px)] leading-[1.05] font-[750] tracking-[-.03em]">No page or device at this address</h1>
        <p className="text-[15px] text-ink-2">If you scanned a QR label, check the device ID printed under the code.</p>
        <Link to="/hardware" className={`${linkClass} inline-flex min-h-11 items-center self-start text-[15px]`}>
          ← Available hardware
        </Link>
    </div>
  )
}
