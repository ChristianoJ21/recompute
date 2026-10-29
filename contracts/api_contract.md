# ReCompute API contract v2.5

> **Owner:** Panji (backend). **Panji decides changes and tells Jose before they land.** The frontend calls the backend only through `frontend/src/api/client.ts`, via `/api/*` (Vite proxy on the laptop, Vercel rewrite when hosted; both forward to the backend, so no CORS is needed).
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
| `profile_request.json` / `profile_updated.json` | body and answer of `PATCH /auth/me` |
| `password_change_request.json` / `password_changed.json` | body (placeholders) and answer of `POST /auth/password` |
| `devices_list.json` | `GET /devices` |
| `device_detail.json` | `GET /devices/{id}` |
| `device_create_request.json` | body for `POST /devices` |
| `event_created.json` | `POST /devices/{id}/events` |
| `events_verify.json` | `GET /devices/{id}/events/verify` |
| `evaluation_keep.json` … `evaluation_insufficient_data.json` | `POST /devices/{id}/evaluate`, one per outcome |
| `fleet_summary.json` | `GET /fleet/summary` |
| `workloads_list.json` | `GET /workloads` |
| `list_request.json` | body for `POST /devices/{id}/list` |
| `list_created.json` | `POST /devices/{id}/list` (the `list` event) |
| `listings.json` | `GET /listings` |
| `contact.json` | `GET /contact` |
| `customer_signup_request.json` / `customer_session.json` | body (placeholder password) and answer of `POST /customers/signup` (same answer as `POST /customers/login`; the token is a placeholder) |
| `customer_me.json` | `GET /customers/me` |
| `favourite_saved.json` / `favourites_list.json` | `PUT /customers/me/favourites/{id}` / `GET /customers/me/favourites` |
| `enquiry_request.json` / `enquiry_created.json` | body and answer of `POST /customers/me/enquiries` |
| `enquiries_list.json` | `GET /enquiries` (technicians) |
| `customers_list.json` | `GET /customers` (technicians) |
| `error_401.json`, `error_404.json` | errors |

## Endpoints

🔒 = needs a **technician** token (`Authorization: Bearer <token>` from `POST /auth/login`); technicians are the admins. 👤 = needs a **customer** token (from `POST /customers/signup` or `/customers/login`). A token of the other role gets **403**; no valid token gets **401**.

| Method | Path | Auth | Success | Returns | Status |
|---|---|---|---|---|---|
| POST | `/auth/login` | — | 200 | `{token, token_type: "bearer", expires_at, technician: {username, name}}` | built |
| GET | `/auth/me` | 🔒 | 200 | `{username, name}` (use it to check a stored token is still valid) | built |
| PATCH | `/auth/me` | 🔒 | 200 | body `{name}` → `{username, name}`: the logged-in technician changes their own full name (trimmed, 1–200 characters; 400 otherwise). The username never changes: it is the `actor` in the hash chain | built |
| POST | `/auth/password` | 🔒 | 200 | body `{current_password, new_password}` → `{username, name}`. **400** (not 401, so the login is kept) if the current password is wrong, the new one is under 10 characters or equals the current one; wrong current passwords count towards the login lock (**429** after 5 in 15 min) | built |
| POST | `/auth/technicians` | 🔒 | 201 | body `{username, name, password}` → `{username, name}`: a logged-in technician adds a colleague; 400 if the username is taken or invalid, or the password is under 10 characters | built |
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
| GET | `/listings` | — | 200 | `[Listing]` (below), devices currently listed, newest listing first | built |
| POST | `/devices/{id}/list` | 🔒 | 201 | body `{price: {amount, currency}, note?}` → the `list` event (payload = the body); **400 if the passport has no `wipe` event**, 400 if already listed, 400 if the price is invalid | built |
| POST | `/devices/{id}/unlist` | 🔒 | 201 | body `{note?}` → the `unlist` event; 400 if not listed | built |
| GET | `/contact` | — | 200 | `{organisation, email, phone, hours, note, sample_data: true}` (below) | built |
| POST | `/customers/signup` | — | 201 | body `{email, name, password}` → `{token, token_type: "bearer", expires_at, customer: {email, name}}` (logged in at once). E-mail trimmed and lower-cased; 400 if the e-mail is invalid or already has an account, the name is empty or the password is under 10 characters; **429** after 5 sign-ups from one address in 15 min | built |
| POST | `/customers/login` | — | 200 | body `{email, password}` → same as sign-up. Wrong e-mail and wrong password give the same **401**; **429** after 5 failed logins for one e-mail in 15 min | built |
| GET | `/customers/me` | 👤 | 200 | `{email, name}` | built |
| GET | `/customers/me/favourites` | 👤 | 200 | `[{device_id, saved_at}]`, newest first | built |
| PUT | `/customers/me/favourites/{id}` | 👤 | 200 | `{device_id, saved_at}`; saving again keeps the one entry; **400** unless the device is listed for sale; 404 unknown device | built |
| DELETE | `/customers/me/favourites/{id}` | 👤 | 200 | `{device_id, removed: true}` (also when it was not saved) | built |
| POST | `/customers/me/enquiries` | 👤 | 201 | body `{device_id, message}` (message trimmed, 1–2000 characters) → `{id, device_id, message, created_at, customer: {email, name}}`; 404 unknown device; **429** after 10 enquiries in 15 min | built |
| GET | `/customers/me/enquiries` | 👤 | 200 | the customer's own enquiries, newest first | built |
| GET | `/enquiries` | 🔒 | 200 | every enquiry, newest first, same shape (technicians reply by e-mail) | built |
| GET | `/customers` | 🔒 | 200 | `[{email, name, created_at, favourites, enquiries}]` (counts), newest account first; never a password hash | built |

**Passport data has no PUT or DELETE; the only PATCH is `/auth/me` (a technician's own name).** The one exception is a customer's own saved-devices list (`PUT`/`DELETE /customers/me/favourites/{id}`), which is not passport data. Favourites and enquiries live in their own tables and **never enter the passport or its hash chain**. Events are append-only (the database also refuses UPDATE/DELETE on events). Devices are not edited: a changed device is a new record. Listing and unlisting are **passport events** (`kind` `list` / `unlist`), so they appear in the history and the hash chain; `POST /devices/{id}/events` refuses those two kinds so the wipe rule cannot be skipped.

## Login
- `POST /auth/login` body `{"username": "tech-1", "password": "..."}`. Wrong username and wrong password give the same 401 message. After **5 failed logins for one username within 15 minutes**, the API answers **429** until the window ends.
- Tokens last **12 hours** (`expires_at`, ISO 8601 UTC). There is no logout endpoint: logging out = the frontend forgets the token. Keep it in `sessionStorage`, not `localStorage`.
- On any 401 from a 🔒 endpoint, clear the token and show the login page.
- There is no public sign-up. The first account is made on the backend machine: `py -m tools.create_technician tech-1 "Technician One"` (asks for a password, min. 10 characters); after that, a logged-in technician can add colleagues with `POST /auth/technicians`. There is no public sign-up for technicians.
- **Customers (v2.4)** sign up themselves (`POST /customers/signup`) and log in with `POST /customers/login`. A customer token carries `role: "customer"` and is refused (403) by every technician endpoint; customers can only read passports, save listed devices and send enquiries. Still no buy button, cart, payment or order. Tokens issued before v2.4 carry no role and count as technician tokens. Visitors without an account keep the contact box and e-mail link.
- A logged-in technician can change their own full name (`PATCH /auth/me`) and password (`POST /auth/password`, needs the current password). Tokens issued before a password change **stay valid until they expire** (12 h at most): they carry no password version. Log out on shared devices.
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

**Price** `{"amount": 45000000, "currency": "IDR"}`: `amount` is a whole number > 0 in units of the currency; `currency` is a 3-letter ISO 4217 code in capitals. A price is a **sample asking price**: show it with the SAMPLE DATA label.

**List** (`POST /devices/{id}/list`): `{price: Price, note?: text (max 500)}`. To change a price: unlist, then list again (both stay in the history).

**Listing** (`GET /listings`, see `examples/listings.json`)
```
device_id, model, device_type, location, install_date, components, reliability_ok   from the device record
latest_outcome     outcome of the latest evaluation, or null
passport_intact    `valid` from /events/verify
wiped_at           time of the newest `wipe` event
listed_at          time of the `list` event
price              Price from the `list` event
note               note from the `list` event, or null
latest_telemetry   the newest `telemetry` event (full event object), or null
sample_data        bool
```
The price is shown, but there is **no buy button, cart, payment or order**: buyers use the contact box. `location` (v2.5) is the same text the public passport already shows; the sample fleet writes it `City, Country · hall / use`, and the `/hardware` card shows the city part.

**Contact** (`GET /contact`): one **fictional** sample data centre, see `examples/contact.json` (`phone` may be null). Never a real person's details. Read-only: there is no message form (the app collects no visitor data).

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
`{"error": "<what went wrong and how to fix it>"}` with **400** (invalid body, duplicate id, invalid range, listing rule broken), **401** (missing, invalid or expired token; wrong username or password; also sends `WWW-Authenticate: Bearer`), **403** (a valid token of the wrong role: a customer on a technician endpoint or the reverse), **404** (unknown device / endpoint), **409** (two events for one device written at the same moment; send the event again) or **429** (too many failed logins or wrong current passwords; wait and try again). 405 for PUT/PATCH/DELETE on events.

## Changelog
- **v1.1 (28 Oct 2026)**: engine aligned with essay safeguard 2 (whole pathway run at both ends; any flip → UNCERTAIN). Added `scenarios` to the evaluation object and `not_evaluated` to the fleet summary.
- **v1.2 (28 Oct 2026)**: frontend is React + Vite; QR codes now open `http://localhost:5173/device/{id}` (was the Streamlit URL on port 8501). No endpoint or JSON shape changed.
- **v1.3 (28 Oct 2026)**: stretch S1. Events gain `prev_hash` and `hash`; new `GET /devices/{id}/events/verify`; new error 409. Additive only: existing fields are unchanged.
- **v2.0 (28 Oct 2026)**: phase 2 (PRD §15). **Breaking:** writes need a bearer token (401 without); `actor` comes from the token. New: `POST /auth/login`, `GET /auth/me`, errors 401 and 429 (built); `GET /listings`, `POST /devices/{id}/list|unlist`, `GET /contact` (planned). Response shapes of v1.3 endpoints are unchanged.
- **v2.1 (28 Oct 2026)**: listings and contact **built**. `POST /devices/{id}/list` now **requires** `price: {amount, currency}` (stored in the `list` event); Listing gains `install_date`, `reliability_ok`, `price`, `latest_telemetry`. Still no buy button or payment. New examples: `list_request`, `list_created`, `listings`, `contact`.
- **v2.2 (28 Oct 2026)**: new `POST /auth/technicians` (🔒): technicians add technicians. Additive only; still no public sign-up.
- **v2.3 (29 Oct 2026)**: new `PATCH /auth/me` (own full name) and `POST /auth/password` (own password, needs the current one) for the frontend `/settings` page, both 🔒. Additive only. New examples: `profile_request`, `profile_updated`, `password_change_request`, `password_changed`.
- **v2.4 (29 Oct 2026)**: **customer accounts** (Panji, 29 Oct): public `POST /customers/signup` and `/customers/login`, 👤 `GET /customers/me`, saved devices (`GET`/`PUT`/`DELETE /customers/me/favourites…`, listed devices only) and enquiries (`POST`/`GET /customers/me/enquiries`); technicians (the admins) read `GET /enquiries` and `GET /customers`. Tokens gain a `role` claim; a token of the wrong role gets **403** (new error). Customer data never enters a passport. Rate limits: 5 sign-ups per address and 10 enquiries per customer in 15 min (429). Additive for existing callers. New examples: `customer_signup_request`, `customer_session`, `customer_me`, `favourite_saved`, `favourites_list`, `enquiry_request`, `enquiry_created`, `enquiries_list`, `customers_list`.
- **v2.5 (30 Oct 2026)**: Listing gains `location` (A10 phase 1: sample city on the `/hardware` cards). Additive only; it was already public on `GET /devices/{id}`. Examples regenerated (reference fleet now named with real parts, e.g. "GPU server · 4× NVIDIA A100 (sample)", in "Jakarta, Indonesia · Hall A / …"; still toy numbers).
