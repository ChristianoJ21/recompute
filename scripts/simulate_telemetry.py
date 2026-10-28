"""Append SIMULATED telemetry events to device passports (PRD F4).

Nothing is read from real hardware (no BMC/Redfish/Prometheus): every reading is a random
toy value, and each payload says "simulated": true and "sample_data": true.

    python scripts/simulate_telemetry.py                              # one reading per device
    python scripts/simulate_telemetry.py --rounds 0 --interval 10     # keep going until Ctrl+C
    python scripts/simulate_telemetry.py --device GPU-SRV-001 --rounds 3 --seed 42
"""
import argparse
import random
import sys
import time
from urllib.parse import quote

from recompute_api import ApiError, call, default_api_url

ACTOR = "telemetry-simulator"


def reading(rng):
    """One random, clearly labelled toy reading."""
    return {
        "simulated": True,
        "sample_data": True,
        "utilization_pct": rng.randint(5, 95),
        "power_w": rng.randint(250, 650),
        "inlet_temp_c": round(rng.uniform(18, 32), 1),
        "corrected_memory_errors": rng.randint(0, 3),
    }


def append_telemetry(api_url, device_id, payload):
    path = f"/devices/{quote(device_id, safe='')}/events"
    body = {"kind": "telemetry", "payload": payload, "actor": ACTOR}
    try:
        return call(api_url, "POST", path, body)
    except ApiError as error:
        if error.status != 409:  # 409: another event was written at the same moment; send it again
            raise
        return call(api_url, "POST", path, body)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--api", default=default_api_url(), help="API base URL (default: %(default)s)")
    parser.add_argument("--device", action="append", help="device id (repeatable; default: every device)")
    parser.add_argument("--rounds", type=int, default=1, help="readings per device; 0 = until Ctrl+C (default: 1)")
    parser.add_argument("--interval", type=float, default=5.0, help="seconds between rounds (default: 5)")
    parser.add_argument("--seed", type=int, help="random seed, for repeatable readings")
    args = parser.parse_args()

    rng = random.Random(args.seed)
    try:
        device_ids = args.device or [d["id"] for d in call(args.api, "GET", "/devices")]
        if not device_ids:
            sys.exit("No devices yet. Run python scripts/seed.py first.")
        print(f"Appending SIMULATED telemetry to {len(device_ids)} device(s) at {args.api} (Ctrl+C stops)")
        done = 0
        while args.rounds == 0 or done < args.rounds:
            if done:
                time.sleep(args.interval)
            for device_id in device_ids:
                event = append_telemetry(args.api, device_id, reading(rng))
                p = event["payload"]
                print(f"  {device_id:<16} event #{event['id']}: {p['utilization_pct']}% busy, "
                      f"{p['power_w']} W, {p['inlet_temp_c']} °C (simulated)")
            done += 1
    except ApiError as error:
        sys.exit(f"Telemetry simulation failed: {error}")
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
