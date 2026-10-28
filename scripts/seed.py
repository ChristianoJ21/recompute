"""Load the SAMPLE DATA fleet (data/sample_devices.json) into the ReCompute API (PRD F4).

Logs in, posts the workloads first, then the devices, then evaluates every device and checks
that each one gets the outcome listed in "expected_outcomes". Finally lists the devices in
"listings" for sale (sample prices), adding a sample wipe record first where the passport has none.
Safe to re-run: records that already exist are kept as they are (the API never overwrites them).

Writes need a technician login (PowerShell):
    $env:RECOMPUTE_USERNAME = "tech-1"; $env:RECOMPUTE_PASSWORD = "<password>"
    py scripts/seed.py                                  # API at http://localhost:8000
    py scripts/seed.py --api http://192.168.1.20:8000   # or set RECOMPUTE_API_URL
"""
import argparse
import json
import sys
from pathlib import Path
from urllib.parse import quote

from recompute_api import ApiError, call, default_api_url, login_from_env

SAMPLE_WIPE = {"kind": "wipe", "payload": {"note": "NIST SP 800-88 Purge (sample record)", "sample_data": True}}

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "sample_devices.json"


def load_fleet(path):
    fleet = json.loads(Path(path).read_text(encoding="utf-8"))
    not_sample = [d["id"] for d in fleet["devices"] if d.get("sample_data") is not True]
    if fleet.get("sample_data") is not True or not_sample:
        raise SystemExit(f"Refusing to seed: every record must be marked sample_data: true (not marked: {not_sample}).")
    return fleet


def post_new(api_url, token, kind, path, records, existing_ids):
    for record in records:
        if record["id"] in existing_ids:
            print(f"  {kind} {record['id']}: already exists, kept as is")
        else:
            call(api_url, "POST", path, record, token)
            print(f"  {kind} {record['id']}: created")


def list_for_sale(api_url, token, listings):
    """List each sample device; one that is already listed keeps its listing."""
    listed = {row["device_id"] for row in call(api_url, "GET", "/listings")}
    for listing in listings:
        device_id = listing["device_id"]
        if device_id in listed:
            print(f"  {device_id:<16} already listed, kept as is")
            continue
        path = f"/devices/{quote(device_id, safe='')}"
        if not any(event["kind"] == "wipe" for event in call(api_url, "GET", path)["events"]):
            call(api_url, "POST", f"{path}/events", SAMPLE_WIPE, token)  # the API lists only wiped devices
        call(api_url, "POST", f"{path}/list", {"price": listing["price"], "note": listing["note"]}, token)
        price = listing["price"]
        print(f"  {device_id:<16} listed at {price['currency']} {price['amount']:,} (sample)")


def seed(api_url, fleet):
    print(f"Seeding SAMPLE DATA into {api_url}")
    token = login_from_env(api_url)
    print("Workloads:")
    post_new(api_url, token, "workload", "/workloads", fleet["workloads"],
             {w["id"] for w in call(api_url, "GET", "/workloads")})
    print("Devices:")
    post_new(api_url, token, "device", "/devices", fleet["devices"],
             {d["id"] for d in call(api_url, "GET", "/devices")})

    print("Evaluations:")
    expected = fleet.get("expected_outcomes", {})
    mismatches = []
    for device in fleet["devices"]:
        outcome = call(api_url, "POST", f"/devices/{quote(device['id'], safe='')}/evaluate", token=token)["outcome"]
        want = expected.get(device["id"])
        flag = "" if want in (None, outcome) else f"   <-- expected {want}"
        print(f"  {device['id']:<16} {outcome}{flag}")
        if flag:
            mismatches.append(device["id"])

    print("Listings:")
    list_for_sale(api_url, token, fleet.get("listings", []))
    return mismatches


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--api", default=default_api_url(), help="API base URL (default: %(default)s)")
    parser.add_argument("--data", default=DATA_FILE, help="fleet file (default: data/sample_devices.json)")
    args = parser.parse_args()

    try:
        mismatches = seed(args.api, load_fleet(args.data))
    except ApiError as error:
        sys.exit(f"Seeding failed: {error}")
    if mismatches:
        sys.exit(f"Outcome check failed for {', '.join(mismatches)}. If those devices already existed with other "
                 "inputs, start from a fresh database (delete backend/recompute.db) and seed again.")
    print("Done. Every outcome matches data/sample_devices.json.")


if __name__ == "__main__":
    main()
