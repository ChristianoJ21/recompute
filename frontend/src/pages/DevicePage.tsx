import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError, describeError, evaluateDevice, getDevice } from '../api/client'
import type { DeviceDetail } from '../api/types'
import { TechnicalDetails } from '../components/DeviceFacts'
import { HardwareArt } from '../components/HardwareArt'
import { IntegrityBadge } from '../components/IntegrityBadge'
import { ForSaleBox, SaleListing } from '../components/ListingPanel'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { PassportHistory } from '../components/PassportHistory'
import { TechnicianForm } from '../components/TechnicianForm'
import { ErrorNotice, Loading, NightBackdrop, band, container, nightButton } from '../components/ui'
import { WhyPanel } from '../components/WhyPanel'
import { formatDate } from '../lib/format'
import { currentListing } from '../lib/listing'
import { outcomeColours } from '../lib/outcomes'
import { usePassportCheck, type PassportCheck } from '../lib/passportCheck'
import { useSession } from '../lib/session'
import { NotFoundPanel } from './NotFoundPage'

export function DevicePage() {
  const { id = '' } = useParams()
  // Keyed by id: opening another device starts from a clean state instead of showing the previous one.
  return <DevicePassport key={id} id={id} />
}

type State =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; detail: DeviceDetail }

function DevicePassport({ id }: { id: string }) {
  // Reading is public; the forms, Evaluate and listing buttons appear only for a logged-in technician.
  const canEdit = useSession() !== null
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [evaluating, setEvaluating] = useState(false)
  const [evaluateError, setEvaluateError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getDevice(id)
      .then((detail) => {
        if (active) setState({ status: 'ready', detail })
      })
      .catch((error: unknown) => {
        if (!active) return
        const missing = error instanceof ApiError && error.status === 404
        setState(missing ? { status: 'missing' } : { status: 'error', message: describeError(error) })
      })
    return () => {
      active = false
    }
  }, [id, attempt])

  const retry = () => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }

  // After a technician adds an event; throws so the form can say the history did not refresh.
  const refresh = async () => {
    const detail = await getDevice(id)
    setState({ status: 'ready', detail })
  }

  const evaluate = async () => {
    setEvaluating(true)
    setEvaluateError(null)
    try {
      const evaluation = await evaluateDevice(id)
      setState((current) =>
        current.status === 'ready' ? { status: 'ready', detail: { ...current.detail, latest_evaluation: evaluation } } : current,
      )
    } catch (error) {
      setEvaluateError(describeError(error))
    } finally {
      setEvaluating(false)
    }
  }

  if (state.status === 'ready') {
    return (
      <Passport
        detail={state.detail}
        canEdit={canEdit}
        evaluating={evaluating}
        evaluateError={evaluateError}
        onEvaluate={evaluate}
        onEventAdded={refresh}
      />
    )
  }
  return (
    <>
      <DarkBand>
        <Breadcrumb id={id} canEdit={canEdit} />
      </DarkBand>
      <div className={band}>
        <div className={container}>
          {state.status === 'loading' && <Loading label="Loading the passport…" />}
          {state.status === 'missing' && <NotFoundPanel />}
          {state.status === 'error' && <ErrorNotice message={state.message} onRetry={retry} />}
        </div>
      </div>
    </>
  )
}

function DarkBand({ glow, children, footer }: { glow?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section aria-label="Device" className="relative overflow-hidden bg-night text-night-fg">
      <NightBackdrop glow={glow} />
      <div className={`${container} relative flex flex-col gap-[clamp(24px,3vw,40px)] pt-[clamp(24px,3vw,40px)] pb-[clamp(36px,4.5vw,64px)]`}>
        {children}
      </div>
      {footer}
    </section>
  )
}

function Breadcrumb({ id, canEdit }: { id: string; canEdit: boolean }) {
  return (
    <nav data-theme="dark" aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2.5 font-mono text-[13px] text-night-fg3">
      <Link
        to={canEdit ? '/fleet' : '/hardware'}
        className="inline-flex min-h-9 items-center rounded-full border border-white/15 px-3.5 whitespace-nowrap text-night-fg no-underline hover:bg-white/5 hover:text-white"
      >
        {canEdit ? '← Fleet' : '← Available hardware'}
      </Link>
      <span>device</span>
      <span aria-hidden>/</span>
      <span className="break-all text-night-fg">{id}</span>
    </nav>
  )
}

interface PassportProps {
  detail: DeviceDetail
  canEdit: boolean
  evaluating: boolean
  evaluateError: string | null
  onEvaluate: () => void
  onEventAdded: () => Promise<void>
}

function Passport({ detail, canEdit, evaluating, evaluateError, onEvaluate, onEventAdded }: PassportProps) {
  const { device, events, latest_evaluation } = detail
  const check = usePassportCheck(device.id, events)
  const listing = currentListing(events)
  const glow = latest_evaluation?.outcome === 'UNCERTAIN' ? 'rgba(138,70,0,.45)' : 'rgba(19,114,58,.55)'
  return (
    <>
      <DarkBand glow={glow} footer={<Mrz detail={detail} />}>
        <Breadcrumb id={device.id} canEdit={canEdit} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,480px),1fr))] items-end gap-x-[clamp(40px,5vw,96px)] gap-y-8">
          <Identity detail={detail} check={check} />
          <div className="flex min-w-0 flex-col gap-6 min-[1100px]:items-end">
            {/* The hero is always dark, so the drawing uses the dark outcome colours and captions. */}
            <div data-theme="dark" className="w-full max-w-[560px]">
              <HardwareArt
                deviceType={device.device_type}
                components={device.components}
                colour={outcomeColours(latest_evaluation?.outcome ?? null).fg}
              />
            </div>
            {listing ? (
              <ForSaleBox deviceId={device.id} listing={listing} />
            ) : (
              <NotListed target={latest_evaluation?.target ?? null} canEdit={canEdit} />
            )}
          </div>
        </div>
      </DarkBand>
      <div className={band}>
        <div className={`${container} flex flex-col gap-[clamp(20px,2.4vw,32px)]`}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,540px),1fr))] items-start gap-[clamp(20px,2.4vw,32px)]">
            <WhyPanel
              evaluation={latest_evaluation}
              evaluating={evaluating}
              error={evaluateError}
              onEvaluate={canEdit ? onEvaluate : undefined}
            />
            <PassportHistory events={events} check={check} />
          </div>
          {canEdit && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,480px),1fr))] items-start gap-[clamp(20px,2.4vw,32px)]">
              <TechnicianForm deviceId={device.id} onAdded={onEventAdded} />
              <SaleListing deviceId={device.id} events={events} listing={listing} onChanged={onEventAdded} />
            </div>
          )}
          <TechnicalDetails device={device} />
        </div>
      </div>
    </>
  )
}

const shortHash = (hash: string | null | undefined) => (hash ? `${hash.slice(0, 4)}…${hash.slice(-4)}` : 'none')

function Identity({ detail, check }: { detail: DeviceDetail; check: PassportCheck }) {
  const { device, events, latest_evaluation } = detail
  const head = [...events].sort((a, b) => b.id - a.id)[0]?.hash
  const facts = [
    { key: 'EVENTS', value: String(events.length) },
    { key: 'HEAD HASH', value: shortHash(head) },
    { key: 'INSTALLED', value: formatDate(device.install_date) },
  ]
  return (
    <div data-theme="dark" className="flex min-w-0 flex-col gap-4">
      <span className="font-mono text-xs font-semibold tracking-[.12em] text-night-accent-2">DEVICE PASSPORT</span>
      <h1 className="font-mono text-[clamp(36px,5.6vw,88px)] leading-[.95] font-bold tracking-[-.04em] break-all text-white">{device.id}</h1>
      <p className="flex flex-col text-[clamp(16px,1.4vw,19px)] text-night-fg2">
        <span>{device.model}</span>
        <span>{device.location}</span>
      </p>
      <div className="flex flex-wrap gap-2.5 pt-1">
        <OutcomeBadge outcome={latest_evaluation?.outcome ?? null} size="lg" />
        <IntegrityBadge integrity={check.integrity} size="lg" />
      </div>
      <dl className="mt-2 flex flex-wrap gap-x-9 gap-y-3 border-t border-white/8 pt-[18px]">
        {facts.map((fact) => (
          <div key={fact.key} className="flex flex-col gap-0.5">
            <dt className="font-mono text-[11px] tracking-[.1em] text-night-fg3">{fact.key}</dt>
            <dd className="font-mono text-[15px] font-bold text-white">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function NotListed({ target, canEdit }: { target: string | null; canEdit: boolean }) {
  return (
    <div
      data-theme="dark"
      className="flex w-full max-w-[460px] flex-col gap-2.5 rounded-[22px] border border-white/12 bg-white/4 px-[22px] py-5 min-[1100px]:justify-self-end"
    >
      <span className="font-mono text-xs font-bold tracking-[.1em] text-night-fg3">NOT LISTED FOR SALE</span>
      <p className="text-[15px] text-night-fg2">{target ?? 'This device is not released. Its passport is public.'}</p>
      {canEdit && (
        <a href="#log" className={`${nightButton} min-h-[46px] self-start px-5`}>
          Log an action ↓
        </a>
      )}
    </div>
  )
}

/** A machine-readable-zone style summary line, built from the real record, scrolling under the hero. */
function Mrz({ detail }: { detail: DeviceDetail }) {
  const { device, events } = detail
  const head = [...events].sort((a, b) => b.id - a.id)[0]?.hash
  const mrz = [
    device.id,
    device.device_type.toUpperCase(),
    `INSTALLED<${device.install_date}`,
    `${events.length}<EVENTS`,
    `HEAD<${shortHash(head)}`,
  ].join('<<')
  return (
    <div aria-hidden className="relative overflow-hidden border-t border-white/8 bg-white/[.02] py-3 font-mono text-xs tracking-[.18em] whitespace-nowrap text-night-fg3">
      <div className="inline-flex animate-marquee gap-12">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <span key={n}>{mrz}</span>
        ))}
      </div>
    </div>
  )
}
