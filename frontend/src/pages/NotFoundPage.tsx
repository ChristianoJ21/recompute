import { Link } from 'react-router'
import { Chip } from '../design/Art'
import { band, container, panelClass, secondaryButton } from '../components/ui'

export function NotFoundPage() {
  return (
    <div className={band}>
      <div className={container}>
        <NotFoundPanel />
      </div>
    </div>
  )
}

/** Also shown for an unknown device ID, e.g. a mistyped or damaged QR label. Chip looks for it with his magnifier. */
export function NotFoundPanel() {
  return (
    <div className={`relative flex flex-wrap items-center gap-x-10 gap-y-6 p-[clamp(24px,4vw,48px)] ${panelClass}`}>
      <span aria-hidden className="rc-tape" />
      <Chip pose="magnify" anim={['magnify', 'blink']} eyes className="aspect-[204/214] w-[clamp(120px,18vw,190px)] shrink-0" />
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3">
        <span className="rc-hand text-2xl leading-none">404</span>
        <h1 className="text-[clamp(30px,3.6vw,48px)] leading-[1] font-extrabold tracking-[-.02em] text-balance">No page or device at this address</h1>
        <p className="text-[15px] font-medium text-ink-2">If you scanned a QR label, check the device ID printed under the code.</p>
        <Link to="/hardware" className={`${secondaryButton} min-h-11 self-start px-5 text-[15px]`}>
          ← Available hardware
        </Link>
      </div>
    </div>
  )
}
