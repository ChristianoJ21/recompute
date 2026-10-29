import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { createDevice, describeError } from '../api/client'
import { INPUT_MEANINGS } from '../components/DeviceFacts'
import {
  BackLink,
  ErrorNotice,
  FieldError,
  FormPage,
  TextField,
  fieldClass,
  formCard,
  hintClass,
  monoLabel,
  primaryButton,
  secondaryButton,
} from '../components/ui'
import { COMPONENT_TYPES, DEVICE_TYPES, INPUT_KEYS, buildDevice, emptyDeviceForm, type BuiltDevice, type DeviceForm, type RangeText } from '../lib/deviceForm'
import { formatDeviceType } from '../lib/format'

const selectClass = `${fieldClass} px-3`
const fieldset = 'flex flex-col gap-4 border-t-2 border-dashed border-line pt-5'
const smallLabel = 'flex flex-col gap-1.5 text-sm font-bold'
const squareButton =
  'inline-flex size-[50px] shrink-0 items-center justify-center rounded-[14px] border-2 border-line-strong text-ink transition-[scale,background-color] duration-200 ease-spring hover:border-ink hover:bg-sunken active:scale-90'

/** A technician adds a device record (SAMPLE DATA); its passport opens next, where Evaluate runs the rule. */
export function AddDevicePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<DeviceForm>(emptyDeviceForm)
  const [problems, setProblems] = useState<BuiltDevice['problems']>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (field: 'id' | 'model' | 'deviceType' | 'installDate' | 'location') => (event: { target: { value: string } }) =>
    setForm({ ...form, [field]: event.target.value })
  const setPart = (index: number, change: Partial<DeviceForm['components'][number]>) =>
    setForm({ ...form, components: form.components.map((part, i) => (i === index ? { ...part, ...change } : part)) })
  const setInput = (key: (typeof INPUT_KEYS)[number], end: keyof RangeText) => (event: { target: { value: string } }) =>
    setForm({ ...form, inputs: { ...form.inputs, [key]: { ...form.inputs[key], [end]: event.target.value } } })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const built = buildDevice(form)
    setProblems(built.problems)
    if (!built.device) return
    setSaving(true)
    try {
      const device = await createDevice(built.device)
      navigate(`/device/${encodeURIComponent(device.id)}`)
    } catch (err) {
      setError(describeError(err))
      setSaving(false)
    }
  }

  return (
    <FormPage
      title="Add a device"
      intro="Starts a passport for a device in the fleet. Every value is SAMPLE DATA. Records are never edited later, so check the ID."
      back={<BackLink to="/fleet">← Fleet</BackLink>}
      width={760}
      pose="carry"
    >
        <form onSubmit={submit} noValidate className={formCard}>
          <span aria-hidden className="rc-tape" />
          {error && <ErrorNotice message={error} />}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-[18px]">
            <TextField
              label="Device ID"
              mono
              autoComplete="off"
              autoCapitalize="none"
              maxLength={64}
              hint="e.g. GPU-SRV-014. Letters, digits, dot, dash or underscore."
              error={problems.id}
              value={form.id}
              onChange={set('id')}
            />
            <TextField label="Model" maxLength={200} hint='Fictional names end in "(sample)".' error={problems.model} value={form.model} onChange={set('model')} />
            <label className={smallLabel}>
              Device type
              <select value={form.deviceType} onChange={set('deviceType')} className={selectClass}>
                {DEVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {formatDeviceType(type)}
                  </option>
                ))}
              </select>
            </label>
            <TextField label="Install date" type="date" error={problems.installDate} value={form.installDate} onChange={set('installDate')} />
          </div>
          <TextField label="Location" maxLength={200} hint="City, country · hall / use, e.g. Batam, Indonesia · Hall B / object storage." value={form.location} onChange={set('location')} />
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.reliabilityOk}
              onChange={(e) => setForm({ ...form, reliabilityOk: e.target.checked })}
              className="size-5 accent-accent"
            />
            Passed the reliability check
          </label>

          <fieldset className={fieldset}>
            <legend className={`${monoLabel} mb-1`}>Parts</legend>
            {form.components.map((part, index) => (
              <div key={index} className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-end gap-3">
                <div className={smallLabel}>
                  <span aria-hidden>Type</span>
                  <select
                    aria-label={`Part ${index + 1} type`}
                    value={part.type}
                    onChange={(e) => setPart(index, { type: e.target.value })}
                    className={selectClass}
                  >
                    {COMPONENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {formatDeviceType(type)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={smallLabel}>
                  <span aria-hidden>Model</span>
                  <input
                    aria-label={`Part ${index + 1} model`}
                    maxLength={200}
                    value={part.model}
                    onChange={(e) => setPart(index, { model: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <button
                  type="button"
                  aria-label={`Remove part ${index + 1}`}
                  onClick={() => setForm({ ...form, components: form.components.filter((_, i) => i !== index) })}
                  className={squareButton}
                >
                  <span aria-hidden>✕</span>
                </button>
              </div>
            ))}
            <span className={hintClass}>A part without a model is left out.</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, components: [...form.components, { type: COMPONENT_TYPES[0], model: '' }] })}
              className={`${secondaryButton} self-start`}
            >
              + Add part
            </button>
          </fieldset>

          <fieldset className={fieldset}>
            <legend className={`${monoLabel} mb-1`}>Rule inputs (sample values)</legend>
            <p className={hintClass}>
              Leave both boxes empty when a value is not known: the engine then answers INSUFFICIENT_DATA instead of guessing. Fill only
              “low” for a single value.
            </p>
            {INPUT_KEYS.map((key) => (
              <div key={key} className="grid grid-cols-2 items-center gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_120px_120px]">
                <span className="col-span-2 flex min-w-0 flex-col sm:col-span-1">
                  <span className="font-mono text-sm font-semibold">{key}</span>
                  <span className={hintClass}>
                    {INPUT_MEANINGS[key].meaning} ({INPUT_MEANINGS[key].unit})
                  </span>
                  {problems[key] && <FieldError id={`${key}-error`}>{problems[key]}</FieldError>}
                </span>
                <input
                  aria-label={`${key} low`}
                  aria-invalid={problems[key] ? true : undefined}
                  inputMode="decimal"
                  placeholder="low"
                  value={form.inputs[key].low}
                  onChange={setInput(key, 'low')}
                  className={`${fieldClass} font-mono`}
                />
                <input
                  aria-label={`${key} high`}
                  aria-invalid={problems[key] ? true : undefined}
                  inputMode="decimal"
                  placeholder="high"
                  value={form.inputs[key].high}
                  onChange={setInput(key, 'high')}
                  className={`${fieldClass} font-mono`}
                />
              </div>
            ))}
          </fieldset>

          <div className="flex flex-wrap gap-3 pt-1">
            <button type="submit" className={`${primaryButton} min-h-[54px] px-7 text-base`} disabled={saving}>
              {saving ? 'Adding…' : 'Add device'}
            </button>
            <Link to="/fleet" className={`${secondaryButton} min-h-[54px]`}>
              Cancel
            </Link>
          </div>
        </form>
    </FormPage>
  )
}
