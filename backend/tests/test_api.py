import copy
import json
from pathlib import Path

import pytest
from sqlalchemy import text

from engine.decision import OUTCOMES
from reference_fleet import DEVICES, EXPECTED, WORKLOADS

EXAMPLES = Path(__file__).resolve().parents[2] / "contracts" / "examples"


@pytest.fixture
def fleet(client):
    for workload in WORKLOADS:
        assert client.post("/workloads", json=workload).status_code == 201
    for device in DEVICES:
        assert client.post("/devices", json=device).status_code == 201
    return client


def add_event(client, device_id="GPU-SRV-001", kind="repair", actor="tech-1"):
    return client.post(f"/devices/{device_id}/events", json={"kind": kind, "payload": {"note": "x"}, "actor": actor})


# ---- devices -------------------------------------------------------------

def test_created_device_round_trips(fleet):
    body = fleet.get("/devices/GPU-SRV-003").json()

    assert body["device"]["upgrade_options"][0]["component"] == "memory module"
    assert body["device"]["install_date"] == "2022-03-01"
    assert body["events"] == []
    assert body["latest_evaluation"] is None


def test_unknown_device_returns_404_with_error_message(client):
    response = client.get("/devices/NOPE")

    assert response.status_code == 404
    assert "NOPE" in response.json()["error"]


def test_duplicate_device_id_is_rejected(fleet):
    response = fleet.post("/devices", json=DEVICES[0])

    assert response.status_code == 400
    assert "already exists" in response.json()["error"]


def test_invalid_range_is_rejected_with_field_name(client):
    device = copy.deepcopy(DEVICES[0])
    device["inputs"]["E_new"] = {"low": 1100, "high": 900}

    response = client.post("/devices", json=device)

    assert response.status_code == 400
    assert "E_new" in response.json()["error"]


def test_missing_input_is_allowed_at_creation(client):
    assert client.post("/devices", json=DEVICES[4]).status_code == 201  # I_old is null -> INSUFFICIENT_DATA later


def test_device_list_shows_latest_outcome(fleet):
    fleet.post("/devices/GPU-SRV-002/evaluate")

    rows = {row["id"]: row for row in fleet.get("/devices").json()}

    assert rows["GPU-SRV-002"]["latest_outcome"] == "KEEP"
    assert rows["GPU-SRV-001"]["latest_outcome"] is None
    assert set(rows["GPU-SRV-002"]) == {"id", "model", "location", "latest_outcome", "sample_data"}


# ---- events (append-only passport) ----------------------------------------

def test_event_is_appended_and_listed_newest_first(fleet):
    first = add_event(fleet, kind="scan").json()
    second = add_event(fleet, kind="wipe").json()

    events = fleet.get("/devices/GPU-SRV-001").json()["events"]

    assert [e["id"] for e in events] == [second["id"], first["id"]]
    assert second["created_at"].endswith("Z")


def test_unknown_event_kind_is_rejected(fleet):
    response = add_event(fleet, kind="teleport")

    assert response.status_code == 400
    assert "kind" in response.json()["error"]


def test_event_for_unknown_device_returns_404(client):
    assert add_event(client, device_id="NOPE").status_code == 404


@pytest.mark.parametrize("method", ["put", "patch", "delete"])
def test_api_cannot_change_or_remove_events(fleet, method):
    event_id = add_event(fleet).json()["id"]

    for path in (f"/devices/GPU-SRV-001/events/{event_id}", "/devices/GPU-SRV-001/events"):
        response = getattr(fleet, method)(path)
        assert response.status_code in (404, 405)
        assert "error" in response.json()

    assert len(fleet.get("/devices/GPU-SRV-001").json()["events"]) == 1


@pytest.mark.parametrize("statement", ["UPDATE events SET kind = 'note'", "DELETE FROM events"])
def test_database_refuses_to_rewrite_events(app, fleet, statement):
    add_event(fleet)

    with app.state.session_factory() as session, pytest.raises(Exception, match="append-only"):
        session.execute(text(statement))


# ---- hash chain (stretch S1) -----------------------------------------------

GENESIS = "0" * 64


def without_triggers(app, statement):
    """Simulate someone with direct database access: drop the append-only guards, then rewrite."""
    with app.state.session_factory() as session:
        session.execute(text("DROP TRIGGER events_no_update"))
        session.execute(text("DROP TRIGGER events_no_delete"))
        session.execute(text(statement))
        session.commit()


def test_events_are_linked_into_a_chain_per_device(fleet):
    first = add_event(fleet).json()
    second = add_event(fleet).json()
    other = add_event(fleet, device_id="GPU-SRV-002").json()

    assert first["prev_hash"] == GENESIS
    assert second["prev_hash"] == first["hash"]
    assert other["prev_hash"] == GENESIS
    assert len({first["hash"], second["hash"], other["hash"]}) == 3
    assert all(len(e["hash"]) == 64 and int(e["hash"], 16) >= 0 for e in (first, second, other))


def test_intact_chain_verifies(fleet):
    add_event(fleet, kind="scan")
    last = add_event(fleet, kind="wipe").json()

    body = fleet.get("/devices/GPU-SRV-001/events/verify").json()

    assert body == {"device_id": "GPU-SRV-001", "valid": True, "events_checked": 2,
                    "head_hash": last["hash"], "first_bad_event_id": None, "reason": None}


def test_device_without_events_verifies_as_empty_chain(fleet):
    body = fleet.get("/devices/GPU-SRV-001/events/verify").json()

    assert body["valid"] is True and body["events_checked"] == 0 and body["head_hash"] == GENESIS


def test_changed_event_is_detected(app, fleet):
    add_event(fleet)
    changed = add_event(fleet).json()
    add_event(fleet)
    without_triggers(app, f"UPDATE events SET payload = '{{\"note\": \"forged\"}}' WHERE id = {changed['id']}")

    body = fleet.get("/devices/GPU-SRV-001/events/verify").json()

    assert body["valid"] is False
    assert body["first_bad_event_id"] == changed["id"]
    assert "changed" in body["reason"]


def test_removed_event_is_detected(app, fleet):
    add_event(fleet)
    removed = add_event(fleet).json()
    after = add_event(fleet).json()
    without_triggers(app, f"DELETE FROM events WHERE id = {removed['id']}")

    body = fleet.get("/devices/GPU-SRV-001/events/verify").json()

    assert body["valid"] is False
    assert body["first_bad_event_id"] == after["id"]
    assert "removed" in body["reason"]


def test_verify_unknown_device_returns_404(client):
    assert client.get("/devices/NOPE/events/verify").status_code == 404


def test_simultaneous_write_cannot_fork_the_chain(fleet, monkeypatch):
    import api.main
    add_event(fleet)
    monkeypatch.setattr(api.main, "head_hash", lambda session, device_id: GENESIS)  # a stale read

    response = add_event(fleet)

    assert response.status_code == 409
    assert "again" in response.json()["error"]
    assert fleet.get("/devices/GPU-SRV-001/events/verify").json()["valid"] is True


# ---- evaluation ------------------------------------------------------------

def test_reference_fleet_gets_expected_outcomes_through_the_api(fleet):
    for device_id, expected in EXPECTED.items():
        result = fleet.post(f"/devices/{device_id}/evaluate").json()
        assert result["outcome"] == expected, device_id
        assert result["sample_data"] is True

    latest = fleet.get("/devices/GPU-SRV-001").json()["latest_evaluation"]
    assert latest["outcome"] == "REDEPLOY" and latest["target"] == "WL-LAB"


def test_evaluate_unknown_device_returns_404(client):
    assert client.post("/devices/NOPE/evaluate").status_code == 404


def test_fleet_summary_counts_latest_outcomes(fleet):
    for device_id in EXPECTED:
        fleet.post(f"/devices/{device_id}/evaluate")
    fleet.post("/devices/GPU-SRV-002/evaluate")  # re-evaluating does not double-count

    summary = fleet.get("/fleet/summary").json()

    assert summary["counts"] == {outcome: 1 for outcome in OUTCOMES}
    assert summary["devices"] == 6
    assert summary["not_evaluated"] == 0
    assert summary["sample_data"] is True


# ---- workloads and QR ------------------------------------------------------

def test_workloads_list_and_duplicate(fleet):
    assert fleet.get("/workloads").json() == WORKLOADS
    assert fleet.post("/workloads", json=WORKLOADS[0]).status_code == 400


def test_qr_returns_png(fleet):
    response = fleet.get("/devices/GPU-SRV-001/qr")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content.startswith(b"\x89PNG")


def test_qr_for_unknown_device_returns_404(client):
    assert client.get("/devices/NOPE/qr").status_code == 404


# ---- contract examples stay in sync with the live API -----------------------

@pytest.mark.parametrize("name, path", [
    ("devices_list", "/devices"),
    ("device_detail", "/devices/GPU-SRV-001"),
    ("fleet_summary", "/fleet/summary"),
    ("workloads_list", "/workloads"),
    ("events_verify", "/devices/GPU-SRV-001/events/verify"),
    ("auth_me", "/auth/me"),
])
def test_contract_examples_have_live_shape(fleet, name, path):
    for device_id in EXPECTED:
        fleet.post(f"/devices/{device_id}/evaluate")
    add_event(fleet)

    example = json.loads((EXAMPLES / f"{name}.json").read_text(encoding="utf-8"))

    assert shape(fleet.get(path).json()) == shape(example)


def shape(value):
    """Keys and nesting only, so example values can differ from live ones."""
    if isinstance(value, dict):
        return {key: shape(item) for key, item in value.items()}
    if isinstance(value, list):
        return [shape(value[0])] if value else []
    return "value"
