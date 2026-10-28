"""Write contracts/examples/*.json from the live API, so the frontend builds against real shapes.

Run from backend/:  py -m tools.export_examples
Uses the reference fleet (toy numbers, sample_data: true) in a throwaway in-memory database.
"""
import json
from pathlib import Path

from fastapi.testclient import TestClient

from api.main import create_app
from reference_fleet import DEVICES, EXPECTED, WORKLOADS

OUT = Path(__file__).resolve().parents[2] / "contracts" / "examples"


def main():
    client = TestClient(create_app(database_url="sqlite://"))
    for workload in WORKLOADS:
        client.post("/workloads", json=workload)
    for device in DEVICES:
        client.post("/devices", json=device)

    examples = {f"evaluation_{outcome.lower()}": client.post(f"/devices/{device_id}/evaluate").json()
                for device_id, outcome in EXPECTED.items()}
    examples["event_created"] = client.post(
        "/devices/GPU-SRV-001/events",
        json={"kind": "wipe", "payload": {"note": "NIST SP 800-88 Purge (sample)"}, "actor": "tech-1"}).json()
    examples["events_verify"] = client.get("/devices/GPU-SRV-001/events/verify").json()
    examples["device_create_request"] = DEVICES[0]
    examples["devices_list"] = client.get("/devices").json()
    examples["device_detail"] = client.get("/devices/GPU-SRV-001").json()
    examples["fleet_summary"] = client.get("/fleet/summary").json()
    examples["workloads_list"] = client.get("/workloads").json()
    examples["error_404"] = client.get("/devices/NOPE").json()

    OUT.mkdir(parents=True, exist_ok=True)
    for name, body in examples.items():
        (OUT / f"{name}.json").write_text(json.dumps(body, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(examples)} examples to {OUT}")


if __name__ == "__main__":
    main()
