# ReCompute demo app

Working demo of ReCompute for the GYEBC 2026 Grand Final. Spec: [`docs/PRD_ReCompute_App.md`](docs/PRD_ReCompute_App.md).
**Every device, price and passport in this app is SAMPLE DATA**: toy values to show the logic, never measurements and
never essay evidence. The one exception is the Market page (`/market`): published figures from verified evidence-sheet
rows (`data/market_forecast.json`), each with its source, page and evidence row.

| Folder | Owner |
|---|---|
| `contracts/` | Panji (decides changes; tells Jose) |
| `backend/` | Panji + Agent A |
| `frontend/`, `data/`, `scripts/` | Jose + Agent B |

## Backend (Python 3.11+, Windows: use `py`)

```
cd backend
py -m pip install -r requirements.txt
py -m pytest                                              # all tests must pass
py -m uvicorn api.main:create_app --factory --port 8000   # API at http://localhost:8000/docs
```

- Database: `backend/recompute.db` (SQLite, created on first start). Override with env `RECOMPUTE_DB_URL`.
- QR codes point to `http://localhost:5173/device/<id>`. Override with env `RECOMPUTE_FRONTEND_URL` (use `{device_id}` as the placeholder), e.g. the laptop's LAN address so a phone can open it at the exhibition.
- **Login (contract v2.0):** every write endpoint needs a technician token. Create a login once: `py -m tools.create_technician tech-1 "Technician One"` (asks for a password, min. 10 characters; there is no sign-up page). Then `POST /auth/login` and send `Authorization: Bearer <token>`; in `/docs` use the **Authorize** button. Set env `RECOMPUTE_SECRET_KEY` to a long random string so tokens survive a restart (required when hosted).
- After changing an endpoint: update `contracts/api_contract.md`, run `py -m tools.export_examples`, tell Jose.

## Frontend

React + Vite + TypeScript + Tailwind (Node 20.19+ or 22.12+). It reaches the API through the Vite proxy (`/api/*` → `http://localhost:8000/*`, prefix stripped, in both `dev` and `preview`), so no CORS setup is needed. Tailwind is compiled at build time and the fonts are bundled (`@fontsource`), so the built app runs offline. Only `frontend/src/api/client.ts` calls the backend.

With the backend running (see above), in a second terminal:

```
cd frontend
npm install        # first time only
npm run dev        # http://localhost:5173
npm test           # Vitest; all tests must pass
```

Pages: **public** (no login) `/` Home, `/hardware` Available hardware (listed devices, sample price, contact box), `/market` market-forecast charts (empty until verified figures are in `data/market_forecast.json`), `/device/<id>` passport (read only). **Technician** (log in via "Technician login"): `/fleet` dashboard with stats, `/devices/new` Add device (a new SAMPLE DATA passport record; blank rule inputs are sent as missing), `/technicians/new` Add technician, and on the passport page the action form, Evaluate and List for sale / Remove from sale. The token is kept in `sessionStorage` (gone when the tab closes); Log out forgets it. `/settings`: everyone picks Light / Dark / Match device (stored in `localStorage["rc-theme"]`); a technician also changes their full name and password there (contract v2.3). Times are shown in WIB. Design: the clay redesign from Claude Design (mint paper, Chip the robot, scroll-driven "how it works"); its illustrations, motion engine and what is still open are in `frontend/src/design/README.md`. Older reference: `docs/design_handoff/`.

### Technician accounts

There is no public sign-up for technicians: they are the admins. **Customer accounts (contract v2.4)** are separate: buyers sign up at `/signup` (or log in at `/account/login`), save listed devices, ask questions from a passport and see both on `/account`; technicians read the questions and the customer list on the Fleet dashboard. Customers never write passport data and there is still no buy button. Visitors without an account keep the contact box / "Ask about this device" e-mail link. Make the **first** technician in `backend/`: `py -m tools.create_technician tech-1 "Technician One"` (asks for a password, min. 10 characters). After that, a logged-in technician adds colleagues on the Fleet dashboard → "+ Add technician". The seed and telemetry scripts log in with a technician account through env vars.

Load the sample fleet from the repo root (backend running):

```
$env:RECOMPUTE_USERNAME = "tech-1"; $env:RECOMPUTE_PASSWORD = "<password>"   # PowerShell; bash: export ...
py scripts/seed.py                                          # workloads, 14 devices, evaluates each (every outcome appears), lists 6 for sale
py scripts/simulate_telemetry.py                            # one SIMULATED telemetry event per device
py scripts/simulate_telemetry.py --rounds 0 --interval 10   # keep adding readings until Ctrl+C
```

- `data/sample_devices.json` holds the fleet and the sample `listings` (every value is sample data). `seed.py` is safe to re-run: existing records and listings are kept, and it checks each outcome against `expected_outcomes`. A listed device needs a wipe event, so the seed adds a sample wipe record where none exists.
- Both scripts use only the Python standard library. `--api <url>` (or env `RECOMPUTE_API_URL`) points them at another backend.

### Hosting the backend (Render, free plan)

`render.yaml` (repo root) is a Render Blueprint: Render dashboard → New → Blueprint → this repo. The free plan has **no persistent disk**, so each new container runs `python -m tools.boot_demo` first, which builds a fresh SAMPLE DATA database (`/tmp/recompute.db`) with the demo technicians `tech-1` and `tech-2`. Their passwords come from the env vars `RECOMPUTE_DEMO_PASSWORD_TECH_1` / `_TECH_2` (at least 10 characters; the start fails without them); the values live only in the gitignored `demo_accounts.hosted.local.txt`, never in git. `RECOMPUTE_SECRET_KEY` is generated by Render; set `RECOMPUTE_FRONTEND_URL=https://<vercel-app>/device/{device_id}`. Changes made on the hosted site (events, listings, new technicians) are lost when the service restarts, redeploys or sleeps (after 15 min idle; waking takes about a minute, so open the site a minute before a demo).

### Hosting the frontend (Vercel)

`frontend/vercel.json` builds with Vite, sends every page path to `index.html` (so `/device/<id>` deep links work) and rewrites `/api/*` to the backend (same origin, no CORS). **Before deploying, replace `REPLACE-WITH-BACKEND-HOST`** with the Render service's domain (PRD §15.6). Set the Vercel project's root directory to `frontend/`. The dev-only mock market data is never in a build (`VITE_MARKET_MOCK` is set only in `.env.development`).

### Exhibition mode (offline, phones on the laptop's network)

1. Find the laptop's LAN address: macOS `ipconfig getifaddr en0`, Windows `ipconfig` (IPv4 Address).
2. Start the backend with QR codes pointing at that address (`{device_id}` stays literally as written):
   - macOS/Linux: `RECOMPUTE_FRONTEND_URL="http://<laptop-ip>:5173/device/{device_id}" python -m uvicorn api.main:create_app --factory --port 8000`
   - Windows PowerShell: `$env:RECOMPUTE_FRONTEND_URL="http://<laptop-ip>:5173/device/{device_id}"; py -m uvicorn api.main:create_app --factory --port 8000`
3. Build and serve the frontend:
   ```
   cd frontend
   npm run build
   npx vite preview --host --port 5173     # or both steps at once: npm run exhibit
   ```
4. Phones open `http://<laptop-ip>:5173/device/<id>`, which is exactly where a printed QR code leads. If a phone cannot connect, allow Node through the laptop's firewall.

Port 5173 is fixed (`strictPort`): if it is busy, Vite stops with an error instead of moving to another port, because the QR codes point at 5173. `frontend/.npmrc` sets `legacy-peer-deps=true` to work around an npm 10.9 install crash with Vitest 4; keep it.
