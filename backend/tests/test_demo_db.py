import json
from pathlib import Path

from fastapi.testclient import TestClient

from api.main import create_app
from tools.make_demo_db import build_demo_db, read_accounts

FLEET = json.loads((Path(__file__).resolve().parents[2] / "data" / "sample_devices.json").read_text(encoding="utf-8"))


def open_db(db):
    return TestClient(create_app(database_url=f"sqlite:///{db}", secret_key="test-secret"))


def test_demo_db_holds_the_sample_fleet_listings_telemetry_and_working_logins(tmp_path):
    db, accounts = tmp_path / "demo.db", tmp_path / "accounts.txt"

    summary = build_demo_db(db, accounts)

    client = open_db(db)
    logins = read_accounts(accounts)
    assert [username for username, _, _ in logins] == ["tech-1", "tech-2"]
    for username, password, _ in logins:
        assert len(password) >= 10
        assert client.post("/auth/login", json={"username": username, "password": password}).status_code == 200
    devices = client.get("/devices").json()
    assert {d["id"]: d["latest_outcome"] for d in devices} == FLEET["expected_outcomes"]
    listings = client.get("/listings").json()
    assert {row["device_id"] for row in listings} == {row["device_id"] for row in FLEET["listings"]}
    assert all(row["latest_telemetry"] for row in listings)
    assert all(client.get(f"/devices/{d['id']}/events/verify").json()["valid"] for d in devices)
    assert summary["backup"] is None


def test_an_existing_database_is_kept_as_a_backup_not_deleted(tmp_path):
    db, accounts = tmp_path / "recompute.db", tmp_path / "accounts.txt"
    db.write_bytes(b"old data")

    summary = build_demo_db(db, accounts)

    assert summary["backup"].read_bytes() == b"old data"
    assert summary["backup"].suffix == ".db"
    assert db.read_bytes() != b"old data"
