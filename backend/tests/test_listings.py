import json

import pytest

from reference_fleet import DEVICES, WORKLOADS
from test_api import EXAMPLES, shape

PRICE = {"amount": 45000000, "currency": "IDR"}


@pytest.fixture
def fleet(client):
    for workload in WORKLOADS:
        client.post("/workloads", json=workload)
    for device in DEVICES[:2]:
        client.post("/devices", json=device)
    return client


def wipe(client, device_id="GPU-SRV-001"):
    return client.post(f"/devices/{device_id}/events", json={"kind": "wipe", "payload": {"method": "NIST SP 800-88 Purge"}})


def list_device(client, device_id="GPU-SRV-001", price=PRICE, note="Released after review (sample)"):
    return client.post(f"/devices/{device_id}/list", json={"price": price, "note": note})


# ---- listing rules -----------------------------------------------------------

def test_listing_needs_a_wipe_event(fleet):
    response = list_device(fleet)

    assert response.status_code == 400
    assert "wipe" in response.json()["error"]
    assert fleet.get("/listings").json() == []


def test_listing_is_a_passport_event_in_the_chain(fleet):
    wipe(fleet)

    response = list_device(fleet)

    event = response.json()
    assert response.status_code == 201
    assert event["kind"] == "list" and event["actor"] == "tech-1"
    assert event["payload"] == {"price": PRICE, "note": "Released after review (sample)"}
    assert fleet.get("/devices/GPU-SRV-001").json()["events"][0]["id"] == event["id"]
    assert fleet.get("/devices/GPU-SRV-001/events/verify").json()["valid"] is True


def test_listing_shows_where_the_device_is(fleet):
    wipe(fleet)
    list_device(fleet)

    (row,) = fleet.get("/listings").json()

    assert row["location"] == DEVICES[0]["location"]


def test_device_cannot_be_listed_twice(fleet):
    wipe(fleet)
    list_device(fleet)

    response = list_device(fleet)

    assert response.status_code == 400
    assert "already listed" in response.json()["error"]


def test_unlist_removes_the_listing_and_keeps_history(fleet):
    wipe(fleet)
    list_device(fleet)

    response = fleet.post("/devices/GPU-SRV-001/unlist", json={"note": "sold (sample)"})

    assert response.status_code == 201 and response.json()["kind"] == "unlist"
    assert fleet.get("/listings").json() == []
    kinds = [e["kind"] for e in fleet.get("/devices/GPU-SRV-001").json()["events"]]
    assert kinds == ["unlist", "list", "wipe"]


def test_unlist_needs_a_listed_device(fleet):
    response = fleet.post("/devices/GPU-SRV-001/unlist", json={})

    assert response.status_code == 400
    assert "not listed" in response.json()["error"]


def test_relisting_after_unlist_works(fleet):
    wipe(fleet)
    list_device(fleet)
    fleet.post("/devices/GPU-SRV-001/unlist", json={})

    assert list_device(fleet, price={"amount": 40000000, "currency": "IDR"}).status_code == 201
    assert fleet.get("/listings").json()[0]["price"]["amount"] == 40000000


@pytest.mark.parametrize("price", [{"amount": 0, "currency": "IDR"}, {"amount": -5, "currency": "IDR"},
                                   {"amount": 100, "currency": "rupiah"}, None])
def test_invalid_price_is_rejected(fleet, price):
    wipe(fleet)

    response = list_device(fleet, price=price)

    assert response.status_code == 400
    assert "price" in response.json()["error"]


@pytest.mark.parametrize("kind", ["list", "unlist"])
def test_generic_event_endpoint_cannot_skip_the_wipe_rule(fleet, kind):
    response = fleet.post("/devices/GPU-SRV-001/events", json={"kind": kind, "payload": {}})

    assert response.status_code == 400


def test_listing_endpoints_need_a_login(fleet, anon):
    wipe(fleet)

    assert anon.post("/devices/GPU-SRV-001/list", json={"price": PRICE}).status_code == 401
    assert anon.post("/devices/GPU-SRV-001/unlist", json={}).status_code == 401


def test_listing_unknown_device_returns_404(client):
    assert list_device(client, device_id="NOPE").status_code == 404


# ---- public listings and contact -----------------------------------------------

def test_listings_show_hardware_price_and_passport_facts(fleet, anon):
    fleet.post("/devices/GPU-SRV-001/events", json={"kind": "telemetry", "payload": {"gpu_temp_c": 61}})
    wiped = wipe(fleet).json()
    fleet.post("/devices/GPU-SRV-001/evaluate")
    listed = list_device(fleet).json()

    rows = anon.get("/listings").json()

    assert len(rows) == 1
    row = rows[0]
    device = DEVICES[0]
    assert row["device_id"] == "GPU-SRV-001"
    assert row["model"] == device["model"] and row["device_type"] == device["device_type"]
    assert row["components"] == device["components"] and row["install_date"] == device["install_date"]
    assert row["reliability_ok"] is True
    assert row["latest_outcome"] == "REDEPLOY"
    assert row["passport_intact"] is True
    assert row["wiped_at"] == wiped["created_at"]
    assert row["listed_at"] == listed["created_at"]
    assert row["price"] == PRICE
    assert row["note"] == "Released after review (sample)"
    assert row["latest_telemetry"]["payload"] == {"gpu_temp_c": 61}
    assert row["sample_data"] is True


def test_listings_are_newest_first(fleet):
    for device_id in ("GPU-SRV-001", "GPU-SRV-002"):
        wipe(fleet, device_id)
        list_device(fleet, device_id)

    assert [row["device_id"] for row in fleet.get("/listings").json()] == ["GPU-SRV-002", "GPU-SRV-001"]


def test_contact_is_a_fictional_sample(anon):
    body = anon.get("/contact").json()

    assert body["email"].endswith("@example.com")
    assert "fictional" in body["organisation"].lower()
    assert body["sample_data"] is True
    assert set(body) == {"organisation", "email", "phone", "hours", "note", "sample_data"}


@pytest.mark.parametrize("name, path", [("listings", "/listings"), ("contact", "/contact")])
def test_contract_examples_have_live_shape(fleet, name, path):
    fleet.post("/devices/GPU-SRV-001/events", json={"kind": "telemetry", "payload": {"gpu_temp_c": 61}})
    wipe(fleet)
    fleet.post("/devices/GPU-SRV-001/evaluate")
    list_device(fleet)

    example = json.loads((EXAMPLES / f"{name}.json").read_text(encoding="utf-8"))

    assert shape(fleet.get(path).json()) == shape(example)
