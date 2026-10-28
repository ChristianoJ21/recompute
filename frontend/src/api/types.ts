// Shapes from contracts/api_contract.md (v2.3). Every number in them is SAMPLE DATA.

export const OUTCOMES = ['KEEP', 'UPGRADE', 'REDEPLOY', 'RECYCLE', 'UNCERTAIN', 'INSUFFICIENT_DATA'] as const
export type Outcome = (typeof OUTCOMES)[number]

export const EVENT_KINDS = ['telemetry', 'scan', 'repair', 'upgrade', 'wipe', 'move', 'note'] as const
export type EventKind = (typeof EVENT_KINDS)[number]

/** Written only by POST /devices/{id}/list and /unlist, never by the generic events endpoint. */
export type ListingKind = 'list' | 'unlist'

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
  kind: EventKind | ListingKind
  payload: Record<string, unknown>
  actor: string
  prev_hash: string | null
  hash: string | null
}

/** GET /devices/{id}/events/verify: is the device's hash chain intact? */
export interface ChainCheck {
  device_id: string
  valid: boolean
  events_checked: number
  head_hash: string
  /** Null when valid. */
  first_bad_event_id: number | null
  /** Null when valid. */
  reason: string | null
}

/** The server sets the actor from the login token (contract v2.0). */
export interface NewEvent {
  kind: EventKind
  payload: Record<string, unknown>
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

export interface Technician {
  username: string
  name: string
}

/** POST /auth/login answer, kept in sessionStorage while the technician is logged in. */
export interface Session {
  token: string
  token_type: string
  expires_at: string
  technician: Technician
}

/** A sample asking price: whole units of an ISO 4217 currency. */
export interface Price {
  amount: number
  currency: string
}

/** Body of POST /devices/{id}/list. */
export interface NewListing {
  price: Price
  note?: string
}

/** One row of GET /listings: a device currently listed for sale. */
export interface Listing {
  device_id: string
  model: string
  device_type: string
  install_date: string
  components: { type: string; model: string }[]
  reliability_ok: boolean
  latest_outcome: Outcome | null
  passport_intact: boolean
  wiped_at: string | null
  listed_at: string
  price: Price
  note: string | null
  latest_telemetry: PassportEvent | null
  sample_data: boolean
}

/** GET /contact: one fictional sample data centre. */
export interface Contact {
  organisation: string
  email: string
  phone: string | null
  hours: string
  note: string
  sample_data: boolean
}

/** One point of data/market_forecast.json (PRD 15.4): a published figure, never demo data. */
export interface ForecastPoint {
  series: string
  year: number
  value: number
  unit: string
  kind: 'actual' | 'forecast'
  source: string
  page: string
  evidence_row: string
}

/** Body of POST /auth/technicians: a logged-in technician adds a colleague. */
export interface NewTechnician {
  username: string
  name: string
  password: string
}
