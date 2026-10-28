import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError, describeError, evaluateDevice, getDevice } from '../api/client'
import type { DeviceDetail } from '../api/types'
import { TechnicalDetails } from '../components/DeviceFacts'
import { IntegrityBadge } from '../components/IntegrityBadge'
import { ForSaleBox, SaleListing } from '../components/ListingPanel'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { PassportHistory } from '../components/PassportHistory'
import { TechnicianForm } from '../components/TechnicianForm'
import { CornerMarks, ErrorNotice, Loading, container, monoLabel, panelClass } from '../components/ui'
import { WhyPanel } from '../components/WhyPanel'
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

  return (
    <div className={`${container} flex flex-col gap-4 pt-5 pb-16`}>
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 font-mono text-xs text-ink-2">
        <Link to={canEdit ? '/fleet' : '/'} className="inline-flex min-h-8 items-center text-accent no-underline hover:underline">
          {canEdit ? '← Fleet' : '← Available hardware'}
        </Link>
        <span aria-hidden>/</span>
        <span>device</span>
        <span aria-hidden>/</span>
        <span className="break-all text-ink">{id}</span>
      </nav>
      {state.status === 'loading' && <Loading label="Loading the passport…" />}
      {state.status === 'missing' && <NotFoundPanel />}
      {state.status === 'error' && <ErrorNotice message={state.message} onRetry={retry} />}
      {state.status === 'ready' && (
        <Passport
          detail={state.detail}
          canEdit={canEdit}
          evaluating={evaluating}
          evaluateError={evaluateError}
          onEvaluate={evaluate}
          onEventAdded={refresh}
        />
      )}
    </div>
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
      <div className="flex flex-wrap items-stretch gap-4">
        <IdentityCard detail={detail} check={check} />
        {listing && <ForSaleBox deviceId={device.id} listing={listing} />}
      </div>
      <WhyPanel
        evaluation={latest_evaluation}
        evaluating={evaluating}
        error={evaluateError}
        onEvaluate={canEdit ? onEvaluate : undefined}
      />
      {canEdit && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-start gap-4">
          <TechnicianForm deviceId={device.id} onAdded={onEventAdded} />
          <SaleListing deviceId={device.id} events={events} listing={listing} onChanged={onEventAdded} />
        </div>
      )}
      <PassportHistory events={events} check={check} />
      <TechnicalDetails device={device} />
    </>
  )
}

function IdentityCard({ detail, check }: { detail: DeviceDetail; check: PassportCheck }) {
  const { device, events, latest_evaluation } = detail
  const head = [...events].sort((a, b) => b.id - a.id)[0]?.hash
  // A machine-readable-zone style summary line, built from the real record.
  const mrz = [
    device.id,
    device.device_type.toUpperCase(),
    `INSTALLED<${device.install_date}`,
    `${events.length}<EVENTS`,
    `HEAD<${head ? `${head.slice(0, 4)}…${head.slice(-4)}` : 'NONE'}`,
  ].join('<<')
  return (
    <section aria-label="Device" className={`relative flex min-w-0 flex-[2_1_520px] flex-col ${panelClass}`}>
      <CornerMarks />
      <div className="flex flex-col gap-3 p-4 sm:p-6">
        <span className={monoLabel}>Device passport</span>
        <h1 className="font-mono text-[clamp(28px,3.2vw,38px)] leading-[1.05] font-bold tracking-[-.02em] break-all">{device.id}</h1>
        <p className="text-[15px] text-ink-2">
          {device.model} · {device.location}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <OutcomeBadge outcome={latest_evaluation?.outcome ?? null} size="lg" />
          <IntegrityBadge integrity={check.integrity} size="lg" />
        </div>
      </div>
      <div aria-hidden className="mt-auto border-t border-dashed border-line-mid bg-raised px-4 py-2.5 font-mono text-[11px] tracking-[.12em] break-all text-ink-3 sm:px-6">
        {mrz}
      </div>
    </section>
  )
}
