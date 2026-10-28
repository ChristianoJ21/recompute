import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { describeError, evaluateDevice, getDevice } from '../api/client'
import type { DeviceDetail } from '../api/types'
import { DeviceDetails, QrLabel, RuleInputs } from '../components/DeviceFacts'
import { ListingPanel } from '../components/ListingPanel'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { PassportHistory } from '../components/PassportHistory'
import { TechnicianForm } from '../components/TechnicianForm'
import { ErrorNotice, Loading, secondaryButton } from '../components/ui'
import { WhyPanel } from '../components/WhyPanel'
import { useSession } from '../lib/session'

export function DevicePage() {
  const { id = '' } = useParams()
  // Keyed by id: opening another device starts from a clean state instead of showing the previous one.
  return <DevicePassport key={id} id={id} />
}

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; detail: DeviceDetail }

function DevicePassport({ id }: { id: string }) {
  // Reading is public; the form, Evaluate and listing buttons appear only for a logged-in technician.
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
        if (active) setState({ status: 'error', message: describeError(error) })
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
        current.status === 'ready'
          ? { status: 'ready', detail: { ...current.detail, latest_evaluation: evaluation } }
          : current,
      )
    } catch (error) {
      setEvaluateError(describeError(error))
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to={canEdit ? '/fleet' : '/'}
        className="inline-block text-sm font-semibold text-emerald-800 hover:underline"
      >
        {canEdit ? '← Fleet' : '← Available hardware'}
      </Link>
      {state.status === 'loading' && <Loading label="Loading the passport…" />}
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
  return (
    <>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold tracking-tight sm:text-3xl">{device.id}</h1>
          <OutcomeBadge outcome={latest_evaluation?.outcome ?? null} size="lg" />
        </div>
        <p className="text-gray-700">
          {device.model} · {device.location}
        </p>
        {/* Technicians arrive here from the QR code; take them straight to the form. */}
        {canEdit && (
          <a href="#log-action" className={`${secondaryButton} mt-2`}>
            Log an action
          </a>
        )}
      </header>
      {!canEdit && <ListingPanel deviceId={device.id} events={events} canEdit={false} onChanged={onEventAdded} />}
      <WhyPanel
        evaluation={latest_evaluation}
        evaluating={evaluating}
        error={evaluateError}
        onEvaluate={canEdit ? onEvaluate : undefined}
      />
      {canEdit && <TechnicianForm deviceId={device.id} onAdded={onEventAdded} />}
      {canEdit && <ListingPanel deviceId={device.id} events={events} canEdit onChanged={onEventAdded} />}
      <PassportHistory deviceId={device.id} events={events} />
      <details className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <summary className="cursor-pointer px-4 py-4 sm:px-6">
          <span className="font-semibold text-gray-900">Technical details</span>
          <span className="ml-2 text-sm text-gray-500">rule inputs, device record, QR label</span>
        </summary>
        <div className="space-y-6 px-4 pb-4 sm:px-6 sm:pb-6">
          <RuleInputs device={device} />
          <div className="grid gap-6 sm:grid-cols-2">
            <DeviceDetails device={device} />
            <QrLabel deviceId={device.id} />
          </div>
        </div>
      </details>
    </>
  )
}
