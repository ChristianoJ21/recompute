# PRD: ReCompute Demo App

> **Version:** 2.2 · 28 October 2026 · Owner: Panji · v1.1: decision engine (§5.2) aligned with the essay · v1.2: frontend switched from Streamlit to React + Vite + TypeScript + Tailwind · **v2.0: phase 2 (§15): public showcase, technician login, market-forecast charts, hosting** · **v2.1: listings show a sample price (§15); still no buy button or payment** · **v2.2: a logged-in technician can add technicians (§15.5); no public sign-up, no buyer accounts**
> **Readers:** Panji, Jose, AI Agent A (backend), AI Agent B (frontend)
> **Architecture overview:** https://claude.ai/artifact/BNMfdbkQ71VdABKVZMjBjD (share it from the page's Share menu)
> **Essay first.** No app work before the essay is submitted (Fri 30 Oct). Build during judging (1–8 Nov) so the demo is ready if we reach the Top 5 (announced 9 Nov, Grand Final 14 Nov).

---

## 1. Purpose

Build a working demo of ReCompute for the Grand Final exhibition and board defence. The demo must show, live, that ReCompute:

1. keeps a **hardware passport** for each device,
2. runs the **decision rule** and recommends **KEEP / UPGRADE / REDEPLOY / RECYCLE**,
3. says **"uncertain"** or **"insufficient data"** instead of guessing,
4. lets a technician **scan a QR code** to open a device's passport and log an action.

It must match Section 4 of the essay exactly: same rule, same outcomes, same safeguards.

### Non-goals (do not build)
- Real data-centre integration (no real BMC/Redfish, no real Prometheus scraping). Telemetry is **simulated** and labelled as such.
- IoT sensors, blockchain, big-data stack.
- Resale marketplace with payments, orders, carts or customer accounts. (v2.0 adds a public **showcase** with a contact box, §15; v2.1 shows a sample asking price; buying stays outside the app.)
- Any real CO₂ figure presented as a measurement. **All numbers in the demo are sample values, shown with a visible "SAMPLE DATA" label.**

---

## 2. Users and stories

| User | Story | Acceptance |
|---|---|---|
| Data-centre manager | I see my whole fleet and what ReCompute recommends for each device | Fleet page lists every device with outcome badge; counts per outcome at the top |
| Data-centre manager | I understand *why* a device got its recommendation | Device page shows the rule inputs, the low/high calculation, and a one-sentence reason |
| Technician | I scan a device's QR code and see its passport | QR opens the device page; passport history listed newest first |
| Technician | I log what I did (repair, upgrade, wipe, move) | Form adds an event; it appears in the history immediately; old events cannot be edited |
| Judge (demo viewer) | I see the safeguards working | At least one sample device returns UNCERTAIN and one returns INSUFFICIENT_DATA |
| Visitor / buyer, logged-in technician | Phase 2 stories | See §15.2 |

---

## 3. MVP features (must have)

| ID | Feature | Owner | Done when |
|---|---|---|---|
| F1 | Passport data model + append-only event log | Panji + Agent A | Tables exist; API cannot update or delete events (tested) |
| F2 | Decision engine (Section 5) | Panji + Agent A | All engine unit tests pass, including the 6 reference devices |
| F3 | REST API (Section 7) | Panji + Agent A | All endpoints return the contract shapes; tests pass |
| F4 | Sample data + telemetry simulator | Jose + Agent B | `data/sample_devices.json` loads; simulator appends telemetry events |
| F5 | Fleet dashboard | Jose + Agent B | Fleet page per Section 2 |
| F6 | Device / passport page with "why" panel | Jose + Agent B | Device page per Section 2 |
| F7 | QR codes + technician action form | Jose + Agent B | Each device has a QR that opens its page; form posts an event |

### Stretch (only if F1–F7 are done by 8 Nov)
| ID | Feature | Owner |
|---|---|---|
| S1 | Hash-chained events (tamper-evident) | Panji + Agent A |
| S2 | "What if" sliders: change W, T or grid intensity and re-run | Jose + Agent B |
| S3 | Resale channel placeholder screen ("future phase") | Jose + Agent B |

---

## 4. Architecture and repo layout

```
recompute-app/
├── README.md                  # how to run (both)
├── contracts/                 # OWNED BY PANJI (decides changes; tells Jose)
│   ├── api_contract.md        # copy of Section 7
│   └── examples/*.json        # example responses, used by both sides' tests
├── backend/                   # Panji + Agent A ONLY
│   ├── engine/decision.py     # pure functions, no DB, no I/O
│   ├── db/models.py           # SQLAlchemy models
│   ├── api/main.py            # FastAPI app
│   └── tests/
├── frontend/                  # Jose + Agent B ONLY
│   ├── package.json           # React + Vite + TypeScript + Tailwind, Vitest
│   ├── vite.config.ts         # proxy /api -> http://localhost:8000 (dev + preview)
│   ├── src/pages/             # fleet (/), device (/device/:id)
│   └── src/api/client.ts      # the only file that calls the backend
├── data/
│   └── sample_devices.json    # Jose + Agent B; every value labelled sample
└── scripts/
    ├── seed.py                # loads sample_devices.json via the API (Jose)
    └── simulate_telemetry.py  # appends fake telemetry events (Jose)
```

**Stack:** backend: Python 3.11+, FastAPI, SQLAlchemy, SQLite for the demo (same models run on PostgreSQL, which the essay names), `qrcode` library, pytest. Frontend: Node 20+, React + Vite + TypeScript + Tailwind CSS (compiled at build time, no CDN), React Router, Vitest. The frontend reaches the API through Vite's proxy (`/api/*` → `http://localhost:8000/*`), so no CORS setup is needed; at the venue, `vite build` + `vite preview --host` serves it offline to phones on the laptop's network.

**Why this split works:** the backend and frontend meet only at `contracts/`. Each person and agent writes only in their own folder, so two humans and two AI agents can work in parallel without merge conflicts.

---

## 5. Decision engine specification

This is the team's design from Section 4 of the essay. If this spec and the essay disagree, **the essay wins**; Panji fixes the spec.

### 5.1 Rule
Replace only if **(I_old − I_new) × W × T > E_new**

| Symbol | Meaning | Demo unit |
|---|---|---|
| I_old, I_new | Operational emissions per unit of computation, current vs replacement | kgCO₂e per compute-unit |
| W | Computation the device performs per year | compute-units / year |
| T | Years of service ahead | years |
| E_new | Embodied emissions of manufacturing the replacement | kgCO₂e |

Every input is a **range**: `{low, high}`. A point value is stored as low = high.

### 5.2 Algorithm (in this order)
> **v1.1 (28 Oct), aligned with essay Section 4 safeguard 2:** "runs every calculation at both the low and the high end of each factor's reported range; if the recommendation changes within that range, it is reported as uncertain." v1.0 only checked the KEEP/replace step for a flip and settled UPGRADE/REDEPLOY conservatively; the whole pathway is now run once per scenario, as in `recompute_demo.py`.

1. **Reliability:** if `reliability_ok` is false → **RECYCLE**.
2. **Missing data:** if any of I_old, I_new, W, T, E_new is missing, or an upgrade option lacks I_upgraded or E_component → **INSUFFICIENT_DATA** (list the missing fields).
3. **Two scenarios** (the ends of every range):
   - `pro_replace` (everything favours change): I_old.high; I_new.low, I_upgraded.low; E_new.low, E_component.low; W.high, T.high, W_light.high
   - `pro_keep`: the opposite end of every range.
4. **Pathway, run once per scenario:**
   1. `net = (I_old − I_new) × W × T − E_new`. If `net ≤ 0` → **KEEP** (the break-even inequality does not hold).
   2. For each upgrade option: `net_up = (I_old − I_upgraded) × W × T − E_component`. If any `net_up ≥ net` → **UPGRADE** (candidates: those options).
   3. For each workload in the fleet: if `(I_old − I_new) × W_light × T ≤ E_new` (keeping it there is below the break-even) → **REDEPLOY** (candidates: those workloads).
   4. Otherwise → **RECYCLE**.
5. **Combine:** different outcomes in the two scenarios → **UNCERTAIN** (the reason names both). Same outcome → that outcome. For UPGRADE / REDEPLOY the `target` must be a candidate in **both** scenarios (none → UNCERTAIN): the upgrade with the highest `net_up` in `pro_keep`, or the workload with the highest `W.high` (the most useful second life).

`net_min_kg` = `net` in `pro_keep`; `net_max_kg` = `net` in `pro_replace` (null when the engine stops at step 1 or 2).

Output object (also the API shape, Section 7):
```json
{
  "device_id": "GPU-SRV-004",
  "outcome": "UNCERTAIN",
  "reason": "The recommendation changes within the input ranges (KEEP at the pro-keep end, REDEPLOY at the pro-replace end); a human decides.",
  "net_min_kg": -1200.0,
  "net_max_kg": 3400.0,
  "missing_fields": [],
  "target": null,
  "scenarios": {
    "pro_keep": {"outcome": "KEEP", "net_kg": -1200.0},
    "pro_replace": {"outcome": "REDEPLOY", "net_kg": 3400.0}
  },
  "evaluated_at": "2026-11-03T10:00:00Z",
  "sample_data": true
}
```
`scenarios` is null when the engine stops at step 1 or 2.
`outcome` ∈ `KEEP | UPGRADE | REDEPLOY | RECYCLE | UNCERTAIN | INSUFFICIENT_DATA`.

### 5.3 Reference devices (engine tests)
Start from `Penjelasan_ReCompute/recompute_demo.py` (6 devices → 6 outcomes). Agent A ports them as pytest cases. The suite must cover all six outcomes. These are **toy numbers**; they never go into the essay.

---

## 6. Data model

```
devices
  id (text, PK, e.g. "GPU-SRV-004")   model (text)   device_type (text)
  install_date (date)                 location (text)
  components (json: [{type, model}])  reliability_ok (bool)
  inputs (json: {I_old, I_new, W, T, E_new} each {low, high} or null)
  upgrade_options (json: [{component, I_upgraded, E_component}])
  sample_data (bool, default true)

events            -- APPEND-ONLY: no UPDATE, no DELETE anywhere in the code
  id (int, PK)   device_id (FK)   created_at (timestamp, UTC)
  kind (text: telemetry | scan | repair | upgrade | wipe | move | note)
  payload (json)   actor (text; v2.0: the logged-in technician's username)
  prev_hash, hash (text, nullable; used only by stretch S1)
  -- v2.0 (F9) adds kinds list | unlist, written only by the listing endpoints

technicians       -- v2.0 (F8); created only by tools/create_technician.py
  username (text, PK)   name (text)   password_hash (text, salted scrypt)   created_at

evaluations
  id (int, PK)   device_id (FK)   created_at   result (json, Section 5.2 shape)

workloads
  id (text, PK)   name (text)   W (json {low, high})   -- lighter jobs for REDEPLOY
```

Dates: ISO 8601, UTC (`2026-11-03T10:00:00Z`).

---

## 7. API contract (FastAPI, JSON)

| Method | Path | Returns |
|---|---|---|
| GET | `/devices` | `[{id, model, location, latest_outcome, sample_data}]` |
| GET | `/devices/{id}` | `{device, events (newest first), latest_evaluation}` |
| POST | `/devices` | create device (used by `seed.py`) |
| POST | `/devices/{id}/events` | body `{kind, payload, actor}` → created event |
| POST | `/devices/{id}/evaluate` | runs the engine, stores and returns the Section 5.2 object |
| GET | `/fleet/summary` | `{counts: {KEEP: n, …}, devices: n, not_evaluated: n, sample_data: true}` |
| GET | `/devices/{id}/qr` | PNG QR code encoding the frontend device-page URL |
| GET | `/workloads` · POST `/workloads` | list / create lighter workloads |

Errors: `{"error": "<what went wrong and how to fix it>"}` with 400 / 404. No PUT/PATCH/DELETE on events. If an endpoint must change, Panji updates `contracts/` first and tells Jose.

**v2.0:** the binding list is `contracts/api_contract.md` v2.0. It adds login (`POST /auth/login`, `GET /auth/me`), a bearer token on every write endpoint, listings (`GET /listings`, `POST /devices/{id}/list`, `POST /devices/{id}/unlist`) and `GET /contact`. See §15.

---

## 8. Data integrity rules (binding)

1. Every number in the demo is **sample data** and the UI shows a **SAMPLE DATA** label on every page.
2. Never present a demo number as a real measurement or as ReCompute's real-world impact.
3. Never copy a demo number into the essay, and never copy an essay statistic into the demo as if the demo produced it.
4. The engine never fills a missing input with a guess; it returns INSUFFICIENT_DATA.

---

## 9. Job split

### Panji (backend lead) + AI Agent A
- F1 data model, F2 decision engine, F3 API, S1 hash chain.
- Owns `contracts/` and the engine spec (keeps it identical to essay Section 4).
- Reviews and merges Agent A's work; runs the backend tests before every merge.

### Jose (frontend lead) + AI Agent B
- F4 sample data and simulator, F5 fleet page, F6 device page, F7 QR and technician form, S2 sliders, S3 placeholder.
- Writes the 3-minute demo script for the exhibition (Section 12).
- Reviews and merges Agent B's work; runs the frontend tests before every merge.

### Handoffs
| When | From → To | What |
|---|---|---|
| Day 1 end | Panji → Jose | `contracts/` final + example JSON responses |
| Day 1–2 | Jose | Builds pages against the example JSON (no backend needed yet) |
| Day 3 | Panji → Jose | Running API; Jose switches `src/api/client.ts` from examples to live |
| Day 4 | Both | Integration test with seeded sample fleet |

---

## 10. Instructions for the AI agents

Paste the block for your agent at the start of its session, together with this PRD.

**Agent A (backend):**
> You are building the ReCompute backend. Read `PRD_ReCompute_App.md` Sections 4–8. Write code only in `recompute-app/backend/` and `recompute-app/contracts/` (contracts only when Panji asks). Implement the engine as pure functions in `engine/decision.py` exactly as Section 5.2 says, test-first with pytest, covering all six outcomes. Events are append-only: never write UPDATE or DELETE for events. Do not invent data or sources. Ask Panji when the spec is unclear instead of guessing.

**Agent B (frontend):**
> You are building the ReCompute frontend with React + Vite + TypeScript + Tailwind CSS. Read `PRD_ReCompute_App.md` Sections 2–4, 7 and 8. Write code only in `recompute-app/frontend/`, `recompute-app/data/` and `recompute-app/scripts/`. Call the backend only through `frontend/src/api/client.ts` via the Vite proxy (`/api/*` → `http://localhost:8000/*`), and build against `contracts/examples/*.json` until the API is live. The device page lives at `/device/:id` (the QR codes open it) and must work on a phone screen. Show a visible "SAMPLE DATA" label on every page. Colours: white and green. Do not invent real-world figures. Ask Jose when the spec is unclear instead of guessing.

**Both agents:** small commits, one feature per commit (`feat:`, `fix:`, `test:`), tests passing before handing back.

---

## 11. Timeline (build during judging)

| Day | Date | Panji + Agent A | Jose + Agent B |
|---|---|---|---|
| 0 | Fri 30 Oct | Submit the essay. No app work. | Submit the essay. No app work. |
| 1 | Sun 1 Nov | Repo, contracts, data model | Sample devices (6+, all outcomes), page skeletons on example JSON |
| 2 | Mon 2 Nov | Decision engine + tests | Fleet page, device page |
| 3 | Tue 3 Nov | API + tests, QR endpoint | QR + technician form, simulator |
| 4 | Wed 4 Nov | Integration with Jose | Switch to live API, seed script |
| 5–6 | Thu–Fri 5–6 Nov | Bug fixes; S1 if time | Polish; S2/S3 if time; demo script draft |
| 7–8 | 7–8 Nov | Buffer | Buffer |
| — | Mon 9 Nov | Top 5 announced: confirm within 24 h | |
| 10–13 | 10–13 Nov | Rehearse the defence with the demo | Print QR codes for the exhibition |
| — | Sat 14 Nov | **Grand Final** | |

If we are not in the Top 5, stop on 9 Nov; the work stays useful for portfolios.

---

## 12. Demo script outline (3 minutes)

1. Fleet page: "Six servers, six different answers. Replacing everything is not always greener." (30 s)
2. Open a KEEP device, show the "why" panel: savings vs embodied cost. (40 s)
3. Open the UNCERTAIN device: "When the inputs disagree, ReCompute says so." (30 s)
4. Scan a printed QR code with a phone, log a "wipe" event, show it in the passport. (50 s)
5. Close: "Software only, no new hardware; it reads data servers already report." (30 s)

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| App work delays the essay | Rule: no app work before submission |
| Spec drifts from essay Section 4 | Panji owns the spec; essay wins on conflict |
| Agents edit each other's folders | Folder ownership in Section 4 and agent prompts |
| Judges mistake sample numbers for results | SAMPLE DATA label on every page; say it aloud in the demo |
| Wi-Fi fails at the venue | Runs fully offline on a laptop (SQLite + built frontend via `vite preview --host`; Tailwind compiled at build time, no CDN) |

## 14. Definition of done
- F1–F7 work end to end on a seeded sample fleet.
- All six outcomes appear in the fleet.
- Backend and frontend tests pass.
- `README.md` lets someone else run it in under 10 minutes.
- Demo script rehearsed twice.

---

## 15. Phase 2 (v2.0): public showcase, technician login, market forecast, hosting

> Proposed by Panji 28 Oct (SESSION_CONTEXT open item A7); **Panji decides the contract and tells Jose; Hanif supplies the forecast numbers.** F1–F7 and §5 are unchanged. Order: contract v2.0 → F8 login → F9 listings → F10 showcase + F11 dashboard → F12 forecast → F13 deploy.

### 15.1 Two areas
| Area | Who | Login | Pages |
|---|---|---|---|
| **Public showcase** | anyone (judges, buyers, visitors) | none | "Available hardware" (listed devices), each linking to its passport page; one **contact box**; market-forecast charts |
| **Technician area** | data-centre technicians | username + password | fleet dashboard, device page with action form and Evaluate, list / unlist for sale, stats dashboard |

The device/passport page stays **public to read** (a buyer must be able to check the history); its action form, Evaluate button and list/unlist buttons appear only when logged in. Reads are public on purpose: never put a secret in a device record.

### 15.2 Users and stories (added to §2)
| User | Story | Acceptance |
|---|---|---|
| Visitor / buyer | I browse hardware the data centre has released and check its history | "Available hardware" lists only listed devices with model, components, latest outcome, passport-intact badge, wipe date and asking price (SAMPLE); each opens the passport page |
| Visitor / buyer | I know whom to contact | One contact box on the showcase, filled from `GET /contact`: a **fictional** sample data centre (`example.com` address), never a real person's details. No message form, no payment, no order |
| Technician | I add a colleague | A logged-in technician fills in username, name and a password (min. 10 characters) on an "Add technician" page; there is no public sign-up |
| Technician | I log in before changing anything | Write actions without a valid login are refused (401); the passport records the logged-in username as the event's actor |
| Technician | I put a released device up for sale | "List for sale" takes an asking price `{amount, currency}` and works only if the passport holds a `wipe` event; otherwise the API refuses and says why. Listing and unlisting are passport events (the price is in the `list` event), so the history shows them; to change the price, unlist and list again |
| Technician | I see the fleet at a glance | Stats dashboard: counts per outcome, devices not evaluated, devices listed, passports intact vs changed |
| Judge | I see the market context | Forecast charts on the public site; every point shows its source and page |

### 15.3 Features
| ID | Feature | Owner | Done when |
|---|---|---|---|
| F8 | Technician login | Panji + Agent A | `POST /auth/login` returns a token; every write endpoint returns 401 without one; actor = logged-in username; technicians are created only with `py -m tools.create_technician` (no sign-up page); tests pass |
| F9 | Listings | Panji + Agent A | `list`/`unlist` events with price; listing refused without a `wipe` event; `GET /listings` (hardware data + price); `GET /contact`; tests pass |
| F10 | Public showcase + contact box | Jose + Agent B | Pages per 15.1 work without login on a phone; SAMPLE DATA label shown |
| F11 | Login page + technician stats dashboard | Jose + Agent B | Login/logout; stats per 15.2 from `/fleet/summary`, `/listings` and `/events/verify` |
| F12 | Market-forecast charts | Jose + Agent B (numbers: Hanif) | Rules in 15.4 met; no unverified point shown |
| F13 | Hosting | Panji (backend), Jose (frontend) | Rules in 15.5; offline laptop mode still works |

### 15.4 Market-forecast charts (binding)
- **Hanif supplies the numbers** from his Analysis 1 sources. A point enters the chart only when it is a **verified** row of the evidence sheet (exact quote + page filled). Jose stores them in `data/market_forecast.json`: each point `{series, year, value, unit, kind: "actual" | "forecast", source, page, evidence_row}`.
- Each chart shows source + page for every point (tooltip or caption) and labels forecasts as forecasts.
- Until Hanif's verified rows arrive, `data/market_forecast.json` is an empty list and the page shows an empty state ("waiting for verified figures"), never placeholder numbers.
- Decision 8: Wang et al. (Mt cumulative) and de Vries-Gao (kt/yr) are **never** in the same chart. Decision 10: Shehabi **or** Smith for installed base, never mixed years. Open item 11: the WSTS 2026 forecast stays out until verified.
- These are published figures, not demo results: label them with their source, **not** "SAMPLE DATA", and never mix them with demo numbers in one chart.

### 15.5 Login and security
- Passwords are stored only as salted scrypt hashes. Tokens are signed (HMAC-SHA256) with `RECOMPUTE_SECRET_KEY`, last 12 hours, and are sent as `Authorization: Bearer <token>`. The frontend keeps the token in `sessionStorage` (cleared on logout or when the tab closes), never in `localStorage`.
- **No public sign-up and no buyer accounts** (the app collects no visitor data; buyers use the contact box). The first technician is made with `py -m tools.create_technician`; after that a logged-in technician can add colleagues (`POST /auth/technicians`).
- Wrong username and wrong password give the same message. After 5 failed logins for one username in 15 minutes the API answers 429 for the rest of that window.
- Without `RECOMPUTE_SECRET_KEY` the backend makes a random key at start, so tokens end on restart (fine on the laptop; **always set it on Railway**).

### 15.6 Hosting
- **Frontend: Vercel** (`vite build`). `vercel.json` rewrites `/api/*` to the Railway backend URL, so the browser still calls `/api/*` (same origin, no CORS), and sends every other path to `index.html` so `/device/:id` deep links work.
- **Backend: Railway Hobby** (about USD 5/month). SQLite on a Railway volume (`RECOMPUTE_DB_URL=sqlite:////data/recompute.db`); env `RECOMPUTE_SECRET_KEY` and `RECOMPUTE_FRONTEND_URL=https://<vercel-app>/device/{device_id}` (so printed QR codes open the hosted page).
- **Offline fallback** stays as in §4/§13: laptop backend + `vite preview --host`. Print two QR sets (hosted and laptop) or re-print at the venue; test both before 14 Nov.
- The hosted database holds only sample data and the technician accounts; seed it with `scripts/seed.py` after logging in.

### 15.7 Risks (added to §13)
| Risk | Mitigation |
|---|---|
| Public site mistaken for a real shop | Prices are SAMPLE asking prices; no buy button, payment, cart or orders; fictional contact; SAMPLE DATA label; showcase text says "demo" |
| A forecast number is wrong | Only verified evidence rows; source + page on every point; Hanif checks the JSON before release |
| Leaked or weak technician password | No public sign-up; first account by CLI, others added by a logged-in technician; min. 10 characters; 429 after repeated failures; demo accounts deleted after 14 Nov |
| Hosting down at the venue | Offline laptop mode (above) |
