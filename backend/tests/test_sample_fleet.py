"""data/sample_devices.json: the SAMPLE DATA fleet that seed.py and the demo database load."""
import json
import re
from pathlib import Path

from engine.decision import OUTCOMES
from reference_fleet import DEVICES as REFERENCE_DEVICES

FLEET = json.loads((Path(__file__).resolve().parents[2] / "data" / "sample_devices.json").read_text(encoding="utf-8"))
DEVICES = {device["id"]: device for device in FLEET["devices"]}

# A10 phase 1 (Panji, 30 Oct): sample sites in Indonesian data-centre hubs, written "City, Indonesia · hall / use".
SAMPLE_CITIES = {"Jakarta, Indonesia", "Cikarang, Indonesia", "Batam, Indonesia", "Surabaya, Indonesia"}
FICTIONAL_NAMES = re.compile(r"AccelServer|BulkStore|EdgeSwitch|DeskNode|-[vw]\d\b")
# Real parts on a generic box: no server or switch maker's model is tied to a sample price.
SERVER_MAKERS = re.compile(r"Dell|PowerEdge|HPE|ProLiant|Supermicro|Lenovo|ThinkSystem|Gigabyte|Arista|Cisco|Juniper", re.I)


def city(device):
    return device["location"].partition(" · ")[0]


def test_the_fleet_has_about_a_dozen_sample_devices_of_four_kinds():
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


def test_the_reference_devices_are_the_same_records_as_backend_reference_fleet():
    for device in REFERENCE_DEVICES:
        assert DEVICES[device["id"]] == device


def test_every_device_sits_in_a_sample_city_followed_by_its_hall_and_use():
    for device in DEVICES.values():
        site, separator, place = device["location"].partition(" · ")
        assert site in SAMPLE_CITIES and separator and place.strip(), device["id"]
    assert len({city(DEVICES[row["device_id"]]) for row in FLEET["listings"]}) >= 3


def test_models_and_parts_carry_real_product_names_on_a_generic_box():
    for device in DEVICES.values():
        names = [device["model"]] + [part["model"] for part in device["components"]]
        assert not any(FICTIONAL_NAMES.search(name) for name in names), device["id"]
        assert not SERVER_MAKERS.search(device["model"]), device["id"]
    gpus = [part["model"] for d in DEVICES.values() for part in d["components"] if part["type"] == "gpu"]
    assert gpus and all(name.startswith("NVIDIA ") for name in gpus)


def test_workstations_name_their_desktop_processor_and_graphics_card():
    workstations = [d for d in DEVICES.values() if d["device_type"] == "workstation"]
    assert len(workstations) >= 2
    for device in workstations:
        assert re.match(r"Workstation · (AMD Ryzen|Intel Core) .+ \+ NVIDIA GeForce RTX \d{4} \(sample\)$", device["model"]), device["id"]
