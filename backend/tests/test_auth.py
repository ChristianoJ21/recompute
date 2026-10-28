from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

import api.auth
from api.auth import create_technician
from api.main import create_app
from conftest import TECH
from db.models import Technician, utcnow
from reference_fleet import DEVICES, WORKLOADS


def login(client, username=TECH["username"], password=TECH["password"]):
    return client.post("/auth/login", json={"username": username, "password": password})


# ---- login -------------------------------------------------------------------

def test_login_returns_token_and_technician(anon):
    response = login(anon)

    body = response.json()
    assert response.status_code == 200
    assert body["token_type"] == "bearer"
    assert body["technician"] == {"username": "tech-1", "name": "Technician One"}
    assert body["expires_at"].endswith("Z")
    me = anon.get("/auth/me", headers={"Authorization": f"Bearer {body['token']}"})
    assert me.json() == {"username": "tech-1", "name": "Technician One"}


@pytest.mark.parametrize("username, password", [("tech-1", "wrong password"), ("nobody", TECH["password"])])
def test_wrong_password_and_unknown_user_get_the_same_401(anon, username, password):
    response = login(anon, username, password)

    assert response.status_code == 401
    assert response.json() == {"error": "Wrong username or password."}


def test_too_many_failed_logins_lock_the_username(anon):
    for _ in range(5):
        assert login(anon, password="wrong password").status_code == 401

    response = login(anon)  # even the right password is refused during the window

    assert response.status_code == 429
    assert "try again" in response.json()["error"]


def test_failed_logins_are_counted_per_username(app, anon):
    with app.state.session_factory() as session:
        create_technician(session, "tech-2", "Technician Two", "another long password")
    for _ in range(5):
        login(anon, password="wrong password")

    assert login(anon, "tech-2", "another long password").status_code == 200


def test_lock_ends_after_the_window(anon, monkeypatch):
    for _ in range(5):
        login(anon, password="wrong password")
    later = utcnow() + timedelta(minutes=16)
    monkeypatch.setattr(api.auth, "utcnow", lambda: later)

    assert login(anon).status_code == 200


# ---- tokens ------------------------------------------------------------------

def test_me_without_token_is_401_with_bearer_challenge(anon):
    response = anon.get("/auth/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert "log in" in response.json()["error"].lower()


def test_tampered_token_is_rejected(anon):
    token = login(anon).json()["token"]
    payload, signature = token.split(".")
    forged = payload[:-2] + ("AA" if payload[-2:] != "AA" else "BB") + "." + signature

    assert anon.get("/auth/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


@pytest.mark.parametrize("token", ["", "garbage", "a.b.c", "abc.def"])
def test_malformed_token_is_rejected(anon, token):
    assert anon.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_token_from_another_secret_is_rejected(anon):
    other = TestClient(create_app(database_url="sqlite://", secret_key="other-secret"))
    with other.app.state.session_factory() as session:
        create_technician(session, **TECH)
    token = login(other).json()["token"]

    assert anon.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_expired_token_is_rejected(anon, monkeypatch):
    token = login(anon).json()["token"]
    later = utcnow() + timedelta(hours=12, seconds=1)
    monkeypatch.setattr(api.auth, "utcnow", lambda: later)

    response = anon.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert "expired" in response.json()["error"]


# ---- write endpoints need a login; reads stay public -------------------------

WRITES = [
    ("/devices", DEVICES[0]),
    ("/workloads", WORKLOADS[0]),
    ("/devices/GPU-SRV-002/events", {"kind": "scan", "payload": {}}),
    ("/devices/GPU-SRV-002/evaluate", None),
]


@pytest.mark.parametrize("path, body", WRITES)
def test_write_without_login_is_refused_and_nothing_is_written(client, anon, path, body):
    client.post("/devices", json=DEVICES[1])  # GPU-SRV-002 exists, so a 401 cannot be a 404 in disguise

    response = anon.post(path, json=body)

    assert response.status_code == 401
    detail = client.get("/devices/GPU-SRV-002").json()
    assert detail["events"] == [] and detail["latest_evaluation"] is None
    assert client.get("/devices/GPU-SRV-001").status_code == 404
    assert client.get("/workloads").json() == []


def test_reads_stay_public(client, anon):
    client.post("/devices", json=DEVICES[1])

    for path in ("/devices", "/devices/GPU-SRV-002", "/devices/GPU-SRV-002/events/verify",
                 "/fleet/summary", "/workloads", "/devices/GPU-SRV-002/qr"):
        assert anon.get(path).status_code == 200, path


def test_event_actor_is_the_logged_in_technician(client):
    client.post("/devices", json=DEVICES[1])

    event = client.post("/devices/GPU-SRV-002/events",
                        json={"kind": "wipe", "payload": {}, "actor": "someone-else"}).json()

    assert event["actor"] == "tech-1"


def test_token_of_a_removed_technician_is_rejected(app, client):
    with app.state.session_factory() as session:
        session.delete(session.get(Technician, "tech-1"))
        session.commit()

    assert client.get("/auth/me").status_code == 401


# ---- accounts ----------------------------------------------------------------

def test_password_is_stored_only_as_a_salted_hash(app):
    with app.state.session_factory() as session:
        create_technician(session, "tech-2", "Technician Two", TECH["password"])
        hashes = session.scalars(select(Technician.password_hash)).all()

    assert all(TECH["password"] not in h for h in hashes)
    assert hashes[0] != hashes[1]  # same password, different salt


@pytest.mark.parametrize("username, password, message", [
    ("tech-1", "long enough password", "already exists"),
    ("tech-3", "short", "at least 10"),
    ("bad name!", "long enough password", "username"),
])
def test_create_technician_rejects_bad_accounts(app, username, password, message):
    with app.state.session_factory() as session, pytest.raises(ValueError, match=message):
        create_technician(session, username, "Someone", password)


def test_cli_creates_a_technician_who_can_log_in(tmp_path, monkeypatch):
    from tools import create_technician as cli
    url = f"sqlite:///{(tmp_path / 'cli.db').as_posix()}"
    monkeypatch.setenv("RECOMPUTE_DB_URL", url)
    monkeypatch.setattr(cli, "getpass", lambda prompt="": "a very long password")

    cli.main(["tech-9", "Technician Nine"])

    client = TestClient(create_app(database_url=url, secret_key="s"))
    assert login(client, "tech-9", "a very long password").status_code == 200
