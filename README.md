# ReCompute demo app

Working demo of ReCompute for the GYEBC 2026 Grand Final. Spec: [`docs/PRD_ReCompute_App.md`](docs/PRD_ReCompute_App.md).
**Every number in this app is SAMPLE DATA**: toy values to show the logic, never measurements and never essay evidence.

| Folder | Owner |
|---|---|
| `contracts/` | Panji (changes need Jose's OK) |
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

React + Vite + TypeScript + Tailwind (Node 20.19+ or 22.12+). It reaches the API through the Vite proxy (`/api/*` → `http://localhost:8000/*`, prefix stripped, in both `dev` and `preview`), so no CORS setup is needed. Tailwind is compiled at build time, so the built app runs offline. Only `frontend/src/api/client.ts` calls the backend.

With the backend running (see above), in a second terminal:

```
cd frontend
npm install        # first time only
npm run dev        # http://localhost:5173  (fleet at /, passports at /device/<id>)
npm test           # Vitest; all tests must pass
```

Load the sample fleet from the repo root (backend running; Windows: use `py`):

```
python scripts/seed.py                                          # workloads, then 6 devices, then evaluates each (one per outcome)
python scripts/simulate_telemetry.py                            # one SIMULATED telemetry event per device
python scripts/simulate_telemetry.py --rounds 0 --interval 10   # keep adding readings until Ctrl+C
```

- `data/sample_devices.json` holds the fleet (every value is sample data). `seed.py` is safe to re-run: existing records are kept, and it checks each outcome against `expected_outcomes`.
- Both scripts use only the Python standard library. `--api <url>` (or env `RECOMPUTE_API_URL`) points them at another backend.

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
