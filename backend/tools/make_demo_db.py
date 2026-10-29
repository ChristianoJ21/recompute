"""Build a fresh local demo database: sample fleet, listings, simulated telemetry and demo logins.

Run from backend/:  py -m tools.make_demo_db
An existing database file is moved aside as recompute.backup-<time>.db (never deleted). Two demo
technicians get random passwords, written only to ../demo_accounts.local.txt (gitignored), never
printed. Every device record and reading is SAMPLE DATA; delete the demo accounts after 14 Nov.
"""
import argparse
import os
import random
import secrets
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

from fastapi.testclient import TestClient

from api.auth import create_technician
from api.main import create_app

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from seed import DATA_FILE, SAMPLE_WIPE, load_fleet  # noqa: E402  (shared with the HTTP seeder)
from simulate_telemetry import reading  # noqa: E402

DEFAULT_DB = Path(__file__).resolve().parents[1] / "recompute.db"
DEFAULT_ACCOUNTS = ROOT / "demo_accounts.local.txt"
DEMO_TECHNICIANS = [("tech-1", "Technician One (sample)"), ("tech-2", "Technician Two (sample)")]
TELEMETRY_ROUNDS = 12  # enough points for the telemetry trend lines on the home and hardware pages
SCAN = {"kind": "scan", "payload": {"note": "QR label scanned at the rack (sample)", "sample_data": True}}


def backup_existing(db):
    """Move an existing database aside (kept as *.db, so git still ignores it); None if there was none."""
    if not db.exists():
        return None
    backup = db.with_name(f"{db.stem}.backup-{datetime.now():%Y%m%d-%H%M%S}.db")
    db.rename(backup)
    return backup


def write_accounts(path, accounts):
    lines = ["# ReCompute demo technician logins: local only, not in git. Delete these accounts after 14 Nov.",
             "# username<TAB>password<TAB>full name"]
    lines += ["\t".join(account) for account in accounts]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def read_accounts(path):
    """[(username, password, name)] from a file written by write_accounts."""
    rows = [line.split("\t") for line in Path(path).read_text(encoding="utf-8").splitlines()]
    return [tuple(row) for row in rows if row and not row[0].startswith("#") and len(row) == 3]


def load_sample_data(client, fleet, seed):
    """Workloads, devices, evaluations, a scan each, sample listings (after a wipe) and simulated telemetry."""
    for workload in fleet["workloads"]:
        client.post("/workloads", json=workload).raise_for_status()
    for device in fleet["devices"]:
        client.post("/devices", json=device).raise_for_status()
    paths = {device["id"]: f"/devices/{quote(device['id'], safe='')}" for device in fleet["devices"]}
    for path in paths.values():
        client.post(f"{path}/events", json=SCAN).raise_for_status()
        client.post(f"{path}/evaluate").raise_for_status()
    for listing in fleet.get("listings", []):
        path = paths[listing["device_id"]]
        client.post(f"{path}/events", json=SAMPLE_WIPE).raise_for_status()
        client.post(f"{path}/list", json={"price": listing["price"], "note": listing["note"]}).raise_for_status()
    rng = random.Random(seed)
    for _ in range(TELEMETRY_ROUNDS):
        for path in paths.values():
            client.post(f"{path}/events", json={"kind": "telemetry", "payload": reading(rng)}).raise_for_status()


def build_demo_db(db, accounts_file, seed=42):
    db, accounts_file = Path(db), Path(accounts_file)
    backup = backup_existing(db)
    app = create_app(database_url=f"sqlite:///{db.as_posix()}", secret_key=secrets.token_urlsafe(32))
    accounts = [(username, secrets.token_urlsafe(12), name) for username, name in DEMO_TECHNICIANS]
    with app.state.session_factory() as session:
        for username, password, name in accounts:
            create_technician(session, username, name, password)
    write_accounts(accounts_file, accounts)

    client = TestClient(app)
    token = client.post("/auth/login", json={"username": accounts[0][0], "password": accounts[0][1]}).json()["token"]
    client.headers["Authorization"] = f"Bearer {token}"
    fleet = load_fleet(DATA_FILE)
    load_sample_data(client, fleet, seed)
    return {"backup": backup, "devices": len(fleet["devices"]), "listings": len(fleet.get("listings", [])),
            "accounts": [username for username, _, _ in accounts]}


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--db", type=Path, default=DEFAULT_DB, help="SQLite file (default: backend/recompute.db)")
    parser.add_argument("--accounts", type=Path, default=DEFAULT_ACCOUNTS, help="where the demo logins are written")
    args = parser.parse_args()
    if os.environ.get("RECOMPUTE_DB_URL"):
        print("Note: RECOMPUTE_DB_URL is set; this tool writes the file given by --db, check they match.")
    summary = build_demo_db(args.db, args.accounts)
    if summary["backup"]:
        print(f"Previous database kept as {summary['backup']}")
    print(f"Built {args.db}: {summary['devices']} devices, {summary['listings']} listed for sale (SAMPLE DATA).")
    print(f"Demo logins for {', '.join(summary['accounts'])} written to {args.accounts} (not printed, not in git).")


if __name__ == "__main__":
    main()
