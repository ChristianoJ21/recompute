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
- After changing an endpoint: update `contracts/api_contract.md`, run `py -m tools.export_examples`, tell Jose.

## Frontend

React + Vite + TypeScript + Tailwind (Node 20+). It reaches the API through the Vite proxy (`/api` → `http://localhost:8000`).

(Jose: add run instructions here.)
