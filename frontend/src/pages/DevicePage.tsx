import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError, describeError, evaluateDevice, getDevice } from '../api/client'
import type { DeviceDetail } from '../api/types'
import { TechnicalDetails } from '../components/DeviceFacts'
import { DeviceStage } from '../components/DeviceStage'
import { IntegrityBadge } from '../components/IntegrityBadge'
import { ForSaleBox, SaleListing } from '../components/ListingPanel'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { PassportHistory } from '../components/PassportHistory'
import { TechnicianForm } from '../components/TechnicianForm'
import { ErrorNotice, HeroLabel, Loading, band, container, primaryButton } from '../components/ui'
import { WhyPanel } from '../components/WhyPanel'
import { formatDate } from '../lib/format'
import { currentListing } from '../lib/listing'
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
    <div className={`${container} flex flex-col gap-[clamp(20px,3vw,32px)] pt-[clamp(20px,3vw,40px)] pb-[clamp(48px,6vw,96px)]`}>
      <Breadcrumb id={id} canEdit={canEdit} />
      {state.status === 'loading' && <Loading label="Loading the passport…" />}
      {state.status === 'missing' && <NotFoundPanel />}
      {state.status === 'error' && <ErrorNotice message={state.message} onRetry={retry} />}
    </div>
  )
}

function Breadcrumb({ id, canEdit }: { id: string; canEdit: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2.5 font-mono text-[13px] text-ink-2">
      <Link
        to={canEdit ? '/fleet' : '/hardware'}
        className="inline-flex min-h-10 items-center rounded-[14px] border-[1.5px] border-line-strong px-3.5 font-sans text-sm font-bold whitespace-nowrap text-ink no-underline transition-[scale,background-color] duration-200 ease-spring hover:bg-sunken hover:text-ink active:scale-95"
      >
        {canEdit ? '← Fleet' : '← Available hardware'}
      </Link>
      <span>device</span>
      <span aria-hidden>/</span>
      <span className="break-all text-ink">{id}</span>
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
  return (
    <>
      <section aria-label="Device" className={`${container} flex flex-col gap-[clamp(24px,3vw,40px)] pt-[clamp(20px,3vw,40px)] pb-[clamp(28px,4vw,56px)]`}>
        <Breadcrumb id={device.id} canEdit={canEdit} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,480px),1fr))] items-center gap-x-[clamp(32px,5vw,80px)] gap-y-8">
          <Identity detail={detail} check={check} />
          <div className="flex min-w-0 flex-col gap-6 min-[1100px]:items-end">
            <div data-reveal="1" className="relative w-full max-w-[560px] rotate-[.8deg] rounded-[28px] bg-surface p-3.5 shadow-float">
              <span aria-hidden className="rc-tape" />
              <DeviceStage deviceType={device.device_type} components={device.components} height={240} />
            </div>
            {listing ? (
              <ForSaleBox deviceId={device.id} listing={listing} />
            ) : (
              <NotListed target={latest_evaluation?.target ?? null} canEdit={canEdit} />
            )}
          </div>
        </div>
      </section>
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
    <div className="flex min-w-0 flex-col gap-4">
      <HeroLabel>DEVICE PASSPORT</HeroLabel>
      <h1 className="font-mono text-[clamp(34px,5.4vw,72px)] leading-[.98] font-extrabold tracking-[-.04em] break-all">{device.id}</h1>
      <p className="flex flex-col text-[clamp(16px,1.4vw,19px)] font-medium text-ink-2">
        <span>{device.model}</span>
        <span>{device.location}</span>
      </p>
      <div className="flex flex-wrap gap-2.5 pt-1">
        <OutcomeBadge outcome={latest_evaluation?.outcome ?? null} size="lg" tilt />
        <IntegrityBadge integrity={check.integrity} size="lg" />
      </div>
      <dl className="mt-2 flex flex-wrap gap-x-9 gap-y-3 border-t-2 border-dashed border-line pt-[18px]">
        {facts.map((fact) => (
          <div key={fact.key} className="flex flex-col gap-1">
            <dt className="rc-eyebrow text-[11px] text-ink-2">{fact.key}</dt>
            <dd className="font-mono text-[15px] font-bold">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function NotListed({ target, canEdit }: { target: string | null; canEdit: boolean }) {
  return (
    <div className="flex w-full max-w-[460px] flex-col gap-2.5 rounded-[24px] border-2 border-dashed border-line-strong bg-surface px-[22px] py-5 min-[1100px]:justify-self-end">
      <span className="rc-eyebrow text-ink-2">NOT LISTED FOR SALE</span>
      <p className="text-[15px] font-medium text-ink-2">{target ?? 'This device is not released. Its passport is public.'}</p>
      {canEdit && (
        <a href="#log" className={`${primaryButton} min-h-[46px] self-start px-5`}>
          Log an action ↓
        </a>
      )}
    </div>
  )
}
