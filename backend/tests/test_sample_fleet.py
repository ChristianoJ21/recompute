"""data/sample_devices.json: the SAMPLE DATA fleet that seed.py and the demo database load."""
import json
from pathlib import Path

from engine.decision import OUTCOMES

FLEET = json.loads((Path(__file__).resolve().parents[2] / "data" / "sample_devices.json").read_text(encoding="utf-8"))
DEVICES = {device["id"]: device for device in FLEET["devices"]}


def test_the_fleet_has_about_a_dozen_fictional_devices_of_four_kinds():
    assert 12 <= len(DEVICES) <= 14
    assert {d["device_type"] for d in DEVICES.values()} == {"gpu_server", "storage_server", "network_switch", "workstation"}
    assert sum(d["device_type"] == "gpu_server" for d in DEVICES.values()) >= 8
    assert all(d["model"].endswith("(sample)") and d["sample_data"] is True for d in DEVICES.values())


def test_every_device_has_an_expected_outcome_and_every_outcome_appears():
    assert set(FLEET["expected_outcomes"]) == set(DEVICES)
    assert set(FLEET["expected_outcomes"].values()) == set(OUTCOMES)


def test_about_five_listed_devices_of_more_than_one_kind_none_failed_or_unknown():
    listed = [row["device_id"] for row in FLEET["listings"]]
    assert 4 <= len(listed) <= 6 and len(set(listed)) == len(listed)
    assert len({DEVICES[device_id]["device_type"] for device_id in listed}) >= 3
    assert all(FLEET["expected_outcomes"][device_id] in ("KEEP", "UPGRADE", "REDEPLOY") for device_id in listed)
    assert all(row["note"].endswith("(sample)") and row["price"]["currency"] == "IDR" for row in FLEET["listings"])
