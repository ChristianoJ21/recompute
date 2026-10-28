"""Write contracts/examples/*.json from the live API, so the frontend builds against real shapes.

Run from backend/:  py -m tools.export_examples
Uses the reference fleet (toy numbers, sample_data: true) in a throwaway in-memory database.
"""
import json
import secrets
from pathlib import Path

from fastapi.testclient import TestClient

from api.auth import create_technician
from api.main import create_app
from reference_fleet import DEVICES, EXPECTED, WORKLOADS

OUT = Path(__file__).resolve().parents[2] / "contracts" / "examples"
TOKEN_PLACEHOLDER = "<token: send as 'Authorization: Bearer <token>'>"


def main():
    client = TestClient(create_app(database_url="sqlite://"))
    password = secrets.token_urlsafe(16)  # throwaway login in a throwaway database
    with client.app.state.session_factory() as session:
        create_technician(session, "tech-1", "Technician One (sample)", password)
    examples = {"error_401": client.get("/auth/me").json(),
                "login_request": {"username": "tech-1", "password": "<password>"}}
    login = client.post("/auth/login", json={"username": "tech-1", "password": password}).json()
    client.headers["Authorization"] = f"Bearer {login['token']}"
    examples["login_response"] = {**login, "token": TOKEN_PLACEHOLDER}
    examples["auth_me"] = client.get("/auth/me").json()

    for workload in WORKLOADS:
        client.post("/workloads", json=workload)
    for device in DEVICES:
        client.post("/devices", json=device)

    examples.update({f"evaluation_{outcome.lower()}": client.post(f"/devices/{device_id}/evaluate").json()
                     for device_id, outcome in EXPECTED.items()})
    examples["event_created"] = client.post(
        "/devices/GPU-SRV-001/events", json={"kind": "wipe", "payload": {"note": "NIST SP 800-88 Purge (sample)"}}).json()
    examples["events_verify"] = client.get("/devices/GPU-SRV-001/events/verify").json()
    examples["device_create_request"] = DEVICES[0]
    examples["devices_list"] = client.get("/devices").json()
    examples["device_detail"] = client.get("/devices/GPU-SRV-001").json()
    examples["fleet_summary"] = client.get("/fleet/summary").json()
    examples["workloads_list"] = client.get("/workloads").json()
    examples["error_404"] = client.get("/devices/NOPE").json()
    # listing last, so the examples above keep their v1.3 content
    client.post("/devices/GPU-SRV-001/events", json={"kind": "telemetry", "payload": {"gpu_temp_c": 61}})
    examples["list_request"] = {"price": {"amount": 45000000, "currency": "IDR"},
                                "note": "Released after REDEPLOY review (sample)"}
    examples["list_created"] = client.post("/devices/GPU-SRV-001/list", json=examples["list_request"]).json()
    examples["listings"] = client.get("/listings").json()
    examples["contact"] = client.get("/contact").json()

    OUT.mkdir(parents=True, exist_ok=True)
    for name, body in examples.items():
        (OUT / f"{name}.json").write_text(json.dumps(body, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(examples)} examples to {OUT}")


if __name__ == "__main__":
    main()
