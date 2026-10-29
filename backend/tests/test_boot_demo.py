import pytest
from fastapi.testclient import TestClient

from api.main import create_app
from tools.boot_demo import PASSWORD_VARS, boot, db_path_from_url

PASSWORDS = {PASSWORD_VARS["tech-1"]: "hosted-pass-one", PASSWORD_VARS["tech-2"]: "hosted-pass-two"}


def login_status(db, username, password):
    client = TestClient(create_app(database_url=f"sqlite:///{db.as_posix()}", secret_key="test-secret"))
    return client.post("/auth/login", json={"username": username, "password": password}).status_code


def test_a_fresh_host_gets_the_sample_db_with_the_passwords_from_the_environment(tmp_path):
    db = tmp_path / "recompute.db"

    built = boot({"RECOMPUTE_DB_URL": f"sqlite:///{db.as_posix()}", **PASSWORDS})

    assert built is True
    assert login_status(db, "tech-1", "hosted-pass-one") == 200
    assert login_status(db, "tech-2", "hosted-pass-two") == 200
    assert [p.name for p in tmp_path.iterdir()] == ["recompute.db"]  # no password file on the server


def test_an_existing_database_is_left_alone(tmp_path):
    db = tmp_path / "recompute.db"
    env = {"RECOMPUTE_DB_URL": f"sqlite:///{db.as_posix()}", **PASSWORDS}
    boot(env)
    before = db.read_bytes()

    assert boot(env) is False
    assert db.read_bytes() == before
    assert len(list(tmp_path.iterdir())) == 1  # no backup made either


@pytest.mark.parametrize("password", [None, "", "short"])
def test_refuses_to_build_without_a_strong_enough_password(tmp_path, password):
    db = tmp_path / "recompute.db"
    env = {"RECOMPUTE_DB_URL": f"sqlite:///{db.as_posix()}", PASSWORD_VARS["tech-1"]: "hosted-pass-one"}
    if password is not None:
        env[PASSWORD_VARS["tech-2"]] = password

    with pytest.raises(SystemExit, match=PASSWORD_VARS["tech-2"]):
        boot(env)
    assert not db.exists()


def test_db_path_comes_from_a_sqlite_url_only():
    assert db_path_from_url("sqlite:////tmp/recompute.db").as_posix() == "/tmp/recompute.db"
    assert db_path_from_url("sqlite:///./recompute.db").as_posix() == "recompute.db"
    with pytest.raises(SystemExit, match="sqlite"):
        db_path_from_url("postgresql://host/db")
