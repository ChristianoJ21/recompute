// The Add device form: what a technician types, checked and turned into a POST /devices body (contract v2.3).
import type { Device, DeviceInputs, Range } from '../api/types'

/** Device types with their own line drawing; the API accepts any text, the form offers these. */
export const DEVICE_TYPES = ['gpu_server', 'storage_server', 'network_switch', 'workstation'] as const
export const COMPONENT_TYPES = ['gpu', 'memory', 'cpu', 'storage', 'ssd', 'nic', 'psu'] as const
export const INPUT_KEYS = ['I_old', 'I_new', 'W', 'T', 'E_new'] as const satisfies readonly (keyof DeviceInputs)[]

const ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/ // same rule as the backend (api/main.py)

type InputKey = (typeof INPUT_KEYS)[number]

export interface RangeText {
  low: string
  high: string
}

export interface DeviceForm {
  id: string
  model: string
  deviceType: string
  installDate: string
  location: string
  reliabilityOk: boolean
  components: { type: string; model: string }[]
  inputs: Record<InputKey, RangeText>
}

export type FormField = 'id' | 'model' | 'installDate' | InputKey

export interface BuiltDevice {
  device: Device | null
  problems: Partial<Record<FormField, string>>
}

export function emptyDeviceForm(): DeviceForm {
  return {
    id: '',
    model: '',
    deviceType: DEVICE_TYPES[0],
    installDate: '',
    location: '',
    reliabilityOk: true,
    components: [{ type: COMPONENT_TYPES[0], model: '' }],
    inputs: { I_old: { low: '', high: '' }, I_new: { low: '', high: '' }, W: { low: '', high: '' }, T: { low: '', high: '' }, E_new: { low: '', high: '' } },
  }
}

/** Both empty: missing (the engine answers INSUFFICIENT_DATA, it never guesses). Only low: a point value. */
function parseRange({ low, high }: RangeText): { range: Range | null; problem?: string } {
  const [lowText, highText] = [low.trim(), high.trim()]
  if (!lowText && !highText) return { range: null }
  if (!lowText) return { range: null, problem: 'Enter the low value (or leave both empty).' }
  const values = [Number(lowText), Number(highText || lowText)]
  if (values.some((value) => !Number.isFinite(value) || value < 0)) return { range: null, problem: 'Use numbers of 0 or more.' }
  if (values[0] > values[1]) return { range: null, problem: 'Low must not be above high.' }
  return { range: { low: values[0], high: values[1] } }
}

export function buildDevice(form: DeviceForm): BuiltDevice {
  const problems: BuiltDevice['problems'] = {}
  const id = form.id.trim()
  const model = form.model.trim()
  if (!id) problems.id = 'Enter a device ID.'
  else if (!ID_PATTERN.test(id)) problems.id = 'Use 1–64 letters, digits, dot, dash or underscore.'
  if (!model) problems.model = 'Enter the model.'
  if (!form.installDate) problems.installDate = 'Enter the install date.'

  const inputs = {} as DeviceInputs
  for (const key of INPUT_KEYS) {
    const { range, problem } = parseRange(form.inputs[key])
    inputs[key] = range
    if (problem) problems[key] = problem
  }
  if (Object.keys(problems).length > 0) return { device: null, problems }

  return {
    problems,
    device: {
      id,
      model,
      device_type: form.deviceType,
      install_date: form.installDate,
      location: form.location.trim(),
      components: form.components
        .map((part) => ({ type: part.type, model: part.model.trim() }))
        .filter((part) => part.model),
      reliability_ok: form.reliabilityOk,
      inputs,
      upgrade_options: [],
      sample_data: true,
    },
  }
}
