// Shapes from contracts/api_contract.md (v1.3). Every number in them is SAMPLE DATA.

export const OUTCOMES = ['KEEP', 'UPGRADE', 'REDEPLOY', 'RECYCLE', 'UNCERTAIN', 'INSUFFICIENT_DATA'] as const
export type Outcome = (typeof OUTCOMES)[number]

export const EVENT_KINDS = ['telemetry', 'scan', 'repair', 'upgrade', 'wipe', 'move', 'note'] as const
export type EventKind = (typeof EVENT_KINDS)[number]

/** A point value has low === high. */
export interface Range {
  low: number
  high: number
}

export interface DeviceInputs {
  I_old: Range | null
  I_new: Range | null
  W: Range | null
  T: Range | null
  E_new: Range | null
}

export interface UpgradeOption {
  component: string
  I_upgraded: Range | null
  E_component: Range | null
}

export interface Device {
  id: string
  model: string
  device_type: string
  install_date: string
  location: string
  components: { type: string; model: string }[]
  reliability_ok: boolean
  inputs: DeviceInputs
  upgrade_options: UpgradeOption[]
  sample_data: boolean
}

/** One row of GET /devices. */
export interface DeviceSummary {
  id: string
  model: string
  location: string
  latest_outcome: Outcome | null
  sample_data: boolean
}

export interface PassportEvent {
  id: number
  device_id: string
  created_at: string
  kind: EventKind
  payload: Record<string, unknown>
  actor: string
  prev_hash: string | null
  hash: string | null
}

export interface NewEvent {
  kind: EventKind
  payload: Record<string, unknown>
  actor: string
}

export interface ScenarioResult {
  outcome: Outcome
  net_kg: number
}

export interface Evaluation {
  device_id: string
  outcome: Outcome
  reason: string
  /** Net saving from replacing at the pro-keep end (kgCO2e, sample). Null when no calculation ran. */
  net_min_kg: number | null
  /** Net saving from replacing at the pro-replace end (kgCO2e, sample). Null when no calculation ran. */
  net_max_kg: number | null
  missing_fields: string[]
  target: string | null
  scenarios: { pro_keep: ScenarioResult; pro_replace: ScenarioResult } | null
  evaluated_at: string
  sample_data: boolean
}

export interface DeviceDetail {
  device: Device
  /** Newest first. */
  events: PassportEvent[]
  latest_evaluation: Evaluation | null
}

export interface FleetSummary {
  counts: Record<Outcome, number>
  devices: number
  not_evaluated: number
  sample_data: boolean
}
