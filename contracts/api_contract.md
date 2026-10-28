# ReCompute API contract v2.0

> **Owner:** Panji (backend). **Changes need Jose's OK.** The frontend calls the backend only through `frontend/src/api/client.ts`, via `/api/*` (Vite proxy on the laptop, Vercel rewrite when hosted; both forward to the backend, so no CORS is needed).
> Spec: `PRD_ReCompute_App.md` Sections 5–7 and 15. Base URL (local): `http://localhost:8000`. Interactive docs: `/docs`.
> **Every device number is SAMPLE DATA.** Show the label on every page; never present a value as a measurement.

## What changed in v2.0 (breaking)
1. **Every write endpoint needs a login token** (header `Authorization: Bearer <token>`); without a valid one it returns **401**. Reads stay public.
2. **`actor` is set by the server** to the logged-in technician's username. The event body no longer needs `actor`; if sent, it is ignored.
3. New: login (`/auth/*`), listings (`/listings`, `/devices/{id}/list`, `/devices/{id}/unlist`), contact box (`/contact`).

Status: **built** = live in the backend; **planned** = shape agreed here, backend not built yet (build the page against this contract; examples follow when built).

## Example responses
`contracts/examples/*.json` are generated from the live API (`py -m tools.export_examples` in `backend/`), and the backend tests fail if the live shapes stop matching them.

| File | Endpoint |
|---|---|
| `login_request.json` | body for `POST /auth/login` |
| `login_response.json` | `POST /auth/login` (the token value is a placeholder) |
| `auth_me.json` | `GET /auth/me` |
| `devices_list.json` | `GET /devices` |
| `device_detail.json` | `GET /devices/{id}` |
| `device_create_request.json` | body for `POST /devices` |
| `event_created.json` | `POST /devices/{id}/events` |
| `events_verify.json` | `GET /devices/{id}/events/verify` |
| `evaluation_keep.json` … `evaluation_insufficient_data.json` | `POST /devices/{id}/evaluate`, one per outcome |
| `fleet_summary.json` | `GET /fleet/summary` |
| `workloads_list.json` | `GET /workloads` |
| `error_401.json`, `error_404.json` | errors |

## Endpoints

🔒 = needs `Authorization: Bearer <token>`.

| Method | Path | Auth | Success | Returns | Status |
|---|---|---|---|---|---|
| POST | `/auth/login` | — | 200 | `{token, token_type: "bearer", expires_at, technician: {username, name}}` | built |
| GET | `/auth/me` | 🔒 | 200 | `{username, name}` (use it to check a stored token is still valid) | built |
| GET | `/devices` | — | 200 | `[{id, model, location, latest_outcome, sample_data}]`, sorted by id; `latest_outcome` is null until evaluated | built |
| GET | `/devices/{id}` | — | 200 | `{device, events, latest_evaluation}`; `events` newest first; `latest_evaluation` null until evaluated | built |
| POST | `/devices` | 🔒 | 201 | the created device | built |
| POST | `/devices/{id}/events` | 🔒 | 201 | `{id, device_id, created_at, kind, payload, actor, prev_hash, hash}` (see Hash chain) | built |
| GET | `/devices/{id}/events/verify` | — | 200 | `{device_id, valid, events_checked, head_hash, first_bad_event_id, reason}`; `first_bad_event_id` and `reason` are null when `valid` | built |
| POST | `/devices/{id}/evaluate` | 🔒 | 200 | evaluation object (below); also stored as the device's latest evaluation | built |
| GET | `/fleet/summary` | — | 200 | `{counts: {KEEP, UPGRADE, REDEPLOY, RECYCLE, UNCERTAIN, INSUFFICIENT_DATA}, devices, not_evaluated, sample_data}`; counts use each device's latest evaluation; all six keys always present | built |
| GET | `/devices/{id}/qr` | — | 200 | PNG; encodes the frontend device-page URL (default `http://localhost:5173/device/{id}`, set with env `RECOMPUTE_FRONTEND_URL` using the placeholder `{device_id}`) | built |
| GET | `/workloads` | — | 200 | `[{id, name, W}]` (lighter jobs for REDEPLOY) | built |
| POST | `/workloads` | 🔒 | 201 | the created workload | built |
| GET | `/listings` | — | 200 | `[Listing]` (below), devices currently listed, newest listing first | planned |
| POST | `/devices/{id}/list` | 🔒 | 201 | body `{note?}` → the `list` event; **400 if the passport has no `wipe` event**, 400 if already listed | planned |
| POST | `/devices/{id}/unlist` | 🔒 | 201 | body `{note?}` → the `unlist` event; 400 if not listed | planned |
| GET | `/contact` | — | 200 | `{organisation, email, phone, hours, note, sample_data: true}` (below) | planned |

**No PUT, PATCH or DELETE exist.** Events are append-only (the database also refuses UPDATE/DELETE on events). Devices are not edited: a changed device is a new record. Listing and unlisting are **passport events** (`kind` `list` / `unlist`), so they appear in the history and the hash chain; `POST /devices/{id}/events` refuses those two kinds so the wipe rule cannot be skipped.

## Login
- `POST /auth/login` body `{"username": "tech-1", "password": "..."}`. Wrong username and wrong password give the same 401 message. After **5 failed logins for one username within 15 minutes**, the API answers **429** until the window ends.
- Tokens last **12 hours** (`expires_at`, ISO 8601 UTC). There is no logout endpoint: logging out = the frontend forgets the token. Keep it in `sessionStorage`, not `localStorage`.
- On any 401 from a 🔒 endpoint, clear the token and show the login page.
- There is no sign-up. Accounts are made on the backend machine: `py -m tools.create_technician tech-1 "Technician One"` (asks for a password, min. 10 characters).
- Reads are public on purpose (a buyer must be able to read a passport). Never put a secret in a device record or event payload.

## Hash chain (stretch S1)
Each device's events form a SHA-256 chain: `prev_hash` is the hash of the device's previous event (64 zeros for the first one) and `hash` covers the event's `device_id, created_at, kind, payload, actor, prev_hash`. Changing or removing an event, even directly in the database, makes `/events/verify` return `valid: false` and name the first bad event. Removing the newest event, or rewriting the whole chain, is only caught by comparing `head_hash` with a copy kept outside the database (e.g. printed on the passport label). Suggested UI: a "Passport intact ✔ / ✘" badge on the device page.

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

**Event** (`POST /devices/{id}/events`): `{kind, payload}`; `kind` ∈ `telemetry | scan | repair | upgrade | wipe | move | note`; `payload` is any JSON object. The stored `actor` is the logged-in username.

**Workload** (`POST /workloads`): `{id, name, W: Range}`.

**Listing** (planned)
```json
{
  "device_id": "GPU-SRV-001",
  "model": "Sample GPU server A",
  "device_type": "GPU server",
  "components": [{"type": "GPU", "model": "Sample accelerator"}],
  "latest_outcome": "REDEPLOY",
  "passport_intact": true,
  "wiped_at": "2026-11-03T09:00:00Z",
  "listed_at": "2026-11-03T10:00:00Z",
  "note": "Released after REDEPLOY review (sample)",
  "sample_data": true
}
```
`wiped_at` = time of the newest `wipe` event; `passport_intact` = `valid` from `/events/verify`. No price, no stock count, no buy button: buyers use the contact box.

**Contact** (planned): one **fictional** sample data centre, e.g. `{"organisation": "Sample Data Centre (fictional)", "email": "hardware@example.com", "phone": null, "hours": "Mon–Fri 09:00–17:00 WIB", "note": "Demo only: no real sales.", "sample_data": true}`. Never a real person's details. Read-only: there is no message form (the app collects no visitor data).

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
`{"error": "<what went wrong and how to fix it>"}` with **400** (invalid body, duplicate id, invalid range, listing rule broken), **401** (missing, invalid or expired token; wrong username or password; also sends `WWW-Authenticate: Bearer`), **404** (unknown device / endpoint), **409** (two events for one device written at the same moment; send the event again) or **429** (too many failed logins; wait and try again). 405 for PUT/PATCH/DELETE on events.

## Changelog
- **v1.1 (28 Oct 2026)**: engine aligned with essay safeguard 2 (whole pathway run at both ends; any flip → UNCERTAIN). Added `scenarios` to the evaluation object and `not_evaluated` to the fleet summary.
- **v1.2 (28 Oct 2026)**: frontend is React + Vite; QR codes now open `http://localhost:5173/device/{id}` (was the Streamlit URL on port 8501). No endpoint or JSON shape changed.
- **v1.3 (28 Oct 2026)**: stretch S1. Events gain `prev_hash` and `hash`; new `GET /devices/{id}/events/verify`; new error 409. Additive only: existing fields are unchanged.
- **v2.0 (28 Oct 2026)**: phase 2 (PRD §15). **Breaking:** writes need a bearer token (401 without); `actor` comes from the token. New: `POST /auth/login`, `GET /auth/me`, errors 401 and 429 (built); `GET /listings`, `POST /devices/{id}/list|unlist`, `GET /contact` (planned). Response shapes of v1.3 endpoints are unchanged.
