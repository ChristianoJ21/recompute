# ReCompute API contract v1.2

> **Owner:** Panji (backend). **Changes need Jose's OK.** The frontend calls the backend only through `frontend/src/api/client.ts`, via the Vite proxy (`/api/*` → `http://localhost:8000/*`; no CORS needed).
> Spec: `PRD_ReCompute_App.md` Sections 5–7. Base URL (local): `http://localhost:8000`. Interactive docs: `/docs`.
> **Every number is SAMPLE DATA.** Show the label on every page; never present a value as a measurement.

## Example responses
`contracts/examples/*.json` are generated from the live API (`py -m tools.export_examples` in `backend/`), and the backend tests fail if the live shapes stop matching them. Build pages against these files until the API runs.

| File | Endpoint |
|---|---|
| `devices_list.json` | `GET /devices` |
| `device_detail.json` | `GET /devices/{id}` |
| `device_create_request.json` | body for `POST /devices` |
| `event_created.json` | `POST /devices/{id}/events` |
| `evaluation_keep.json` … `evaluation_insufficient_data.json` | `POST /devices/{id}/evaluate`, one per outcome |
| `fleet_summary.json` | `GET /fleet/summary` |
| `workloads_list.json` | `GET /workloads` |
| `error_404.json` | any error |

## Endpoints

| Method | Path | Success | Returns |
|---|---|---|---|
| GET | `/devices` | 200 | `[{id, model, location, latest_outcome, sample_data}]`, sorted by id; `latest_outcome` is null until evaluated |
| GET | `/devices/{id}` | 200 | `{device, events, latest_evaluation}`; `events` newest first; `latest_evaluation` null until evaluated |
| POST | `/devices` | 201 | the created device |
| POST | `/devices/{id}/events` | 201 | `{id, device_id, created_at, kind, payload, actor}` |
| POST | `/devices/{id}/evaluate` | 200 | evaluation object (below); also stored as the device's latest evaluation |
| GET | `/fleet/summary` | 200 | `{counts: {KEEP, UPGRADE, REDEPLOY, RECYCLE, UNCERTAIN, INSUFFICIENT_DATA}, devices, not_evaluated, sample_data}`; counts use each device's latest evaluation; all six keys always present |
| GET | `/devices/{id}/qr` | 200 | PNG; encodes the frontend device-page URL (default `http://localhost:5173/device/{id}`, set with env `RECOMPUTE_FRONTEND_URL` using the placeholder `{device_id}`) |
| GET | `/workloads` | 200 | `[{id, name, W}]` (lighter jobs for REDEPLOY) |
| POST | `/workloads` | 201 | the created workload |

**No PUT, PATCH or DELETE exist.** Events are append-only (the database also refuses UPDATE/DELETE on events). Devices are not edited in v1.1: a changed device is a new record.

## Bodies

**Range** `{"low": number, "high": number}` with `0 ≤ low ≤ high`. A point value has `low = high`.

**Device** (`POST /devices`)
```
id              text, letters/digits/._- , max 64     e.g. "GPU-SRV-001"
model, device_type, location   text
install_date    "YYYY-MM-DD"
components      [{type, model}]
reliability_ok  bool
inputs          {I_old, I_new, W, T, E_new}: each a Range or null (null -> INSUFFICIENT_DATA)
upgrade_options [{component (unique), I_upgraded: Range|null, E_component: Range|null}]
sample_data     bool, default true
```

**Event** (`POST /devices/{id}/events`): `{kind, payload, actor}`; `kind` ∈ `telemetry | scan | repair | upgrade | wipe | move | note`; `payload` is any JSON object; `actor` 1–100 chars.

**Workload** (`POST /workloads`): `{id, name, W: Range}`.

## Evaluation object

```json
{
  "device_id": "GPU-SRV-006",
  "outcome": "UNCERTAIN",
  "reason": "One sentence for the 'why' panel.",
  "net_min_kg": -500.0,
  "net_max_kg": 150.0,
  "missing_fields": [],
  "target": null,
  "scenarios": {
    "pro_keep":    {"outcome": "KEEP",     "net_kg": -500.0},
    "pro_replace": {"outcome": "REDEPLOY", "net_kg": 150.0}
  },
  "evaluated_at": "2026-11-03T10:00:00Z",
  "sample_data": true
}
```

| Field | Meaning |
|---|---|
| `outcome` | `KEEP | UPGRADE | REDEPLOY | RECYCLE | UNCERTAIN | INSUFFICIENT_DATA` |
| `net_min_kg`, `net_max_kg` | `(I_old − I_new) × W × T − E_new` at the pro-keep and pro-replace ends of the ranges (kgCO₂e, sample). Positive = replacing pays back. Null for RECYCLE-by-reliability and INSUFFICIENT_DATA |
| `target` | UPGRADE: component name. REDEPLOY: workload id. Otherwise null |
| `missing_fields` | INSUFFICIENT_DATA only, e.g. `["I_old", "upgrade_options[0].E_component"]` |
| `scenarios` | what each end of the range recommends (for the "why" panel); null when no calculation ran |

Dates: ISO 8601 UTC with `Z`. Dates without time: `YYYY-MM-DD`.

## Errors
`{"error": "<what went wrong and how to fix it>"}` with **400** (invalid body, duplicate id, invalid range) or **404** (unknown device / endpoint). 405 for PUT/PATCH/DELETE on events.

## Changelog
- **v1.1 (28 Oct 2026)**: engine aligned with essay safeguard 2 (whole pathway run at both ends; any flip → UNCERTAIN). Added `scenarios` to the evaluation object and `not_evaluated` to the fleet summary.
- **v1.2 (28 Oct 2026)**: frontend is React + Vite; QR codes now open `http://localhost:5173/device/{id}` (was the Streamlit URL on port 8501). No endpoint or JSON shape changed.
