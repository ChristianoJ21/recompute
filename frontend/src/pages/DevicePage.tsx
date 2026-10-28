import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { describeError, evaluateDevice, getDevice } from '../api/client'
import type { DeviceDetail } from '../api/types'
import { DeviceDetails, RuleInputs } from '../components/DeviceFacts'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { PassportHistory } from '../components/PassportHistory'
import { ErrorNotice, Loading } from '../components/ui'
import { WhyPanel } from '../components/WhyPanel'

export function DevicePage() {
  const { id = '' } = useParams()
  // Keyed by id: opening another device starts from a clean state instead of showing the previous one.
  return <DevicePassport key={id} id={id} />
}

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; detail: DeviceDetail }

function DevicePassport({ id }: { id: string }) {
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
      <Link to="/" className="inline-block text-sm font-semibold text-emerald-800 hover:underline">
        ← Fleet
      </Link>
      {state.status === 'loading' && <Loading label="Loading the passport…" />}
      {state.status === 'error' && <ErrorNotice message={state.message} onRetry={retry} />}
      {state.status === 'ready' && (
        <Passport detail={state.detail} evaluating={evaluating} evaluateError={evaluateError} onEvaluate={evaluate} />
      )}
    </div>
  )
}

interface PassportProps {
  detail: DeviceDetail
  evaluating: boolean
  evaluateError: string | null
  onEvaluate: () => void
}

function Passport({ detail, evaluating, evaluateError, onEvaluate }: PassportProps) {
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
      </header>
      <WhyPanel evaluation={latest_evaluation} evaluating={evaluating} error={evaluateError} onEvaluate={onEvaluate} />
      <PassportHistory events={events} />
      <RuleInputs device={device} />
      <DeviceDetails device={device} />
    </>
  )
}
