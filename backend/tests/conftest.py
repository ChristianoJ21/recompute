import pytest
from fastapi.testclient import TestClient

from api.auth import create_technician, issue_token
from api.main import create_app

TECH = {"username": "tech-1", "name": "Technician One", "password": "correct horse battery"}


@pytest.fixture
def app():
    app = create_app(database_url="sqlite://", frontend_url="http://localhost:5173/device/{device_id}",
                     secret_key="test-secret")
    with app.state.session_factory() as session:
        create_technician(session, **TECH)
    return app


@pytest.fixture
def anon(app):
    """A visitor: no login token."""
    return TestClient(app)


@pytest.fixture
def client(app):
    """A logged-in technician (tech-1)."""
    token = issue_token(app.state.secret_key, TECH["username"])["token"]
    return TestClient(app, headers={"Authorization": f"Bearer {token}"})
