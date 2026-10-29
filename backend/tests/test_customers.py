"""Customer accounts (contract v2.4): public sign-up, favourites and enquiries. Customers never write passport data."""
import json

import pytest
from fastapi.testclient import TestClient

import api.auth
from test_api import EXAMPLES, shape
from test_listings import fleet, list_device, wipe  # noqa: F401  (fleet is a fixture)

ANA = {"email": "Ana@Example.com ", "name": "Ana (sample)", "password": "a long enough password"}


def signup(client, **changes):
    return client.post("/customers/signup", json={**ANA, **changes})


def customer_client(app, **changes):
    """A logged-in customer (Ana unless changed)."""
    token = signup(TestClient(app), **changes).json()["token"]
    return TestClient(app, headers={"Authorization": f"Bearer {token}"})


@pytest.fixture
def listed(fleet):
    """GPU-SRV-001 wiped and listed for sale; GPU-SRV-002 exists but is not listed."""
    wipe(fleet)
    list_device(fleet)
    return fleet


# ---- sign-up and login -------------------------------------------------------

def test_signup_creates_a_customer_and_logs_them_in(anon):
    response = signup(anon)

    body = response.json()
    assert response.status_code == 201
    assert body["token_type"] == "bearer" and body["expires_at"].endswith("Z")
    assert body["customer"] == {"email": "ana@example.com", "name": "Ana (sample)"}
    me = anon.get("/customers/me", headers={"Authorization": f"Bearer {body['token']}"})
    assert me.json() == {"email": "ana@example.com", "name": "Ana (sample)"}


@pytest.mark.parametrize("changes, message", [
    ({"email": "not-an-email"}, "email"),
    ({"password": "short"}, "at least 10 characters"),
    ({"name": "   "}, "name"),
])
def test_signup_checks_the_form(anon, changes, message):
    response = signup(anon, **changes)

    assert response.status_code == 400
    assert message in response.json()["error"]


def test_an_email_can_have_only_one_account(anon):
    signup(anon)

    response = signup(anon, email="ana@example.com", name="Someone else")

    assert response.status_code == 400
    assert "already has an account" in response.json()["error"]


def test_customer_login_and_the_same_401_for_wrong_password_or_unknown_email(anon):
    signup(anon)

    ok = anon.post("/customers/login", json={"email": "ANA@example.com", "password": ANA["password"]})
    wrong = anon.post("/customers/login", json={"email": "ana@example.com", "password": "wrong password"})
    unknown = anon.post("/customers/login", json={"email": "nobody@example.com", "password": ANA["password"]})

    assert ok.status_code == 200 and ok.json()["customer"]["email"] == "ana@example.com"
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json() == {"error": "Wrong e-mail or password."}


def test_too_many_failed_customer_logins_lock_that_email_only(anon):
    signup(anon)
    for _ in range(5):
        anon.post("/customers/login", json={"email": "ana@example.com", "password": "wrong password"})

    locked = anon.post("/customers/login", json={"email": "ana@example.com", "password": ANA["password"]})
    technician = anon.post("/auth/login", json={"username": "tech-1", "password": "correct horse battery"})

    assert locked.status_code == 429
    assert technician.status_code == 200


def test_sign_ups_from_one_client_are_rate_limited(anon):
    for i in range(5):
        assert signup(anon, email=f"buyer{i}@example.com").status_code == 201

    response = signup(anon, email="buyer9@example.com")

    assert response.status_code == 429


# ---- roles: technicians are the admins, customers only read and ask ----------

def test_a_customer_token_never_passes_as_a_technician(app, listed):
    customer = customer_client(app)

    assert customer.post("/devices/GPU-SRV-002/evaluate").status_code == 403
    assert customer.post("/devices/GPU-SRV-001/unlist", json={}).status_code == 403
    assert customer.get("/customers").status_code == 403
    assert customer.get("/enquiries").status_code == 403


def test_a_technician_token_is_not_a_customer_login(client):
    response = client.get("/customers/me")

    assert response.status_code == 403
    assert "customer" in response.json()["error"]


def test_technician_tokens_from_before_roles_still_work(app):
    payload = api.auth._b64(b'{"sub": "tech-1", "exp": 4102444800}')
    old_token = f"{payload}.{api.auth._sign(app.state.secret_key, payload)}"

    response = TestClient(app).get("/auth/me", headers={"Authorization": f"Bearer {old_token}"})

    assert response.status_code == 200


def test_customer_endpoints_need_a_login(anon):
    assert anon.get("/customers/me").status_code == 401
    assert anon.put("/customers/me/favourites/GPU-SRV-001").status_code == 401
    assert anon.post("/customers/me/enquiries", json={"device_id": "GPU-SRV-001", "message": "Hi"}).status_code == 401
    assert anon.get("/customers").status_code == 401
    assert anon.get("/enquiries").status_code == 401


# ---- favourites ----------------------------------------------------------------

def test_a_customer_saves_and_removes_a_listed_device(app, listed):
    customer = customer_client(app)

    saved = customer.put("/customers/me/favourites/GPU-SRV-001")
    again = customer.put("/customers/me/favourites/GPU-SRV-001")

    assert saved.status_code == 200 and saved.json()["device_id"] == "GPU-SRV-001"
    assert again.json() == saved.json()  # saving twice keeps one entry
    assert customer.get("/customers/me/favourites").json() == [saved.json()]
    removed = customer.delete("/customers/me/favourites/GPU-SRV-001")
    assert removed.status_code == 200 and removed.json() == {"device_id": "GPU-SRV-001", "removed": True}
    assert customer.get("/customers/me/favourites").json() == []


def test_only_devices_listed_for_sale_can_be_saved(app, listed):
    customer = customer_client(app)

    assert customer.put("/customers/me/favourites/GPU-SRV-002").status_code == 400
    assert customer.put("/customers/me/favourites/NOPE-1").status_code == 404


def test_favourites_are_private_to_each_customer(app, listed):
    customer_client(app).put("/customers/me/favourites/GPU-SRV-001")

    other = customer_client(app, email="budi@example.com", name="Budi (sample)")

    assert other.get("/customers/me/favourites").json() == []


# ---- enquiries -------------------------------------------------------------------

def test_an_enquiry_reaches_the_technicians(app, listed):
    customer = customer_client(app)

    sent = customer.post("/customers/me/enquiries", json={"device_id": "GPU-SRV-001", "message": "  Is the PSU included?  "})

    body = sent.json()
    assert sent.status_code == 201
    assert body["device_id"] == "GPU-SRV-001" and body["message"] == "Is the PSU included?"
    assert body["customer"] == {"email": "ana@example.com", "name": "Ana (sample)"}
    assert body["created_at"].endswith("Z")
    assert customer.get("/customers/me/enquiries").json() == [body]
    assert listed.get("/enquiries").json() == [body]


@pytest.mark.parametrize("body, status", [
    ({"device_id": "GPU-SRV-001", "message": "   "}, 400),
    ({"device_id": "GPU-SRV-001", "message": "x" * 2001}, 400),
    ({"device_id": "NOPE-1", "message": "Hello"}, 404),
])
def test_enquiry_rules(app, listed, body, status):
    assert customer_client(app).post("/customers/me/enquiries", json=body).status_code == status


def test_enquiries_from_one_customer_are_rate_limited(app, listed):
    customer = customer_client(app)
    for i in range(10):
        assert customer.post("/customers/me/enquiries", json={"device_id": "GPU-SRV-001", "message": f"Question {i}"}).status_code == 201

    response = customer.post("/customers/me/enquiries", json={"device_id": "GPU-SRV-001", "message": "One more"})

    assert response.status_code == 429


def test_technicians_see_the_customers_with_their_activity(app, listed):
    customer = customer_client(app)
    customer.put("/customers/me/favourites/GPU-SRV-001")
    customer.post("/customers/me/enquiries", json={"device_id": "GPU-SRV-001", "message": "Hello"})

    rows = listed.get("/customers").json()

    assert len(rows) == 1
    assert rows[0]["email"] == "ana@example.com" and rows[0]["name"] == "Ana (sample)"
    assert rows[0]["favourites"] == 1 and rows[0]["enquiries"] == 1
    assert rows[0]["created_at"].endswith("Z")
    assert "password_hash" not in rows[0]


def test_customer_activity_never_enters_the_passport(app, listed):
    before = listed.get("/devices/GPU-SRV-001").json()["events"]
    customer = customer_client(app)
    customer.put("/customers/me/favourites/GPU-SRV-001")
    customer.post("/customers/me/enquiries", json={"device_id": "GPU-SRV-001", "message": "Hello"})

    after = listed.get("/devices/GPU-SRV-001")

    assert after.json()["events"] == before
    assert "ana@example.com" not in after.text
    assert listed.get("/devices/GPU-SRV-001/events/verify").json()["valid"] is True


def test_contract_examples_have_live_shape(app, listed):
    customer = customer_client(app)
    live = {
        "customer_session": signup(TestClient(app), email="cara@example.com").json(),
        "customer_me": customer.get("/customers/me").json(),
        "favourite_saved": customer.put("/customers/me/favourites/GPU-SRV-001").json(),
        "favourites_list": customer.get("/customers/me/favourites").json(),
        "enquiry_created": customer.post("/customers/me/enquiries", json={"device_id": "GPU-SRV-001", "message": "Hello"}).json(),
        "enquiries_list": listed.get("/enquiries").json(),
        "customers_list": listed.get("/customers").json(),
    }

    for name, body in live.items():
        example = json.loads((EXAMPLES / f"{name}.json").read_text(encoding="utf-8"))
        assert shape(body) == shape(example), name
