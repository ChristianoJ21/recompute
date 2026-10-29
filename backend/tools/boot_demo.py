"""Hosted start (Render free plan): build the sample demo database if it does not exist yet, then exit.

Run from backend/ before uvicorn:  python -m tools.boot_demo && uvicorn api.main:create_app --factory ...
The free plan has no persistent disk, so every new container starts with a fresh SAMPLE DATA database.
The demo technicians' passwords come from RECOMPUTE_DEMO_PASSWORD_TECH_1 / _TECH_2 (set in the host's
dashboard, kept locally only in a gitignored *.local.txt); nothing is printed and no password file is written.
"""
import os
import sys
from pathlib import Path

from tools.make_demo_db import DEMO_TECHNICIANS, build_demo_db

PASSWORD_VARS = {username: f"RECOMPUTE_DEMO_PASSWORD_{username.upper().replace('-', '_')}"
                 for username, _ in DEMO_TECHNICIANS}
MIN_PASSWORD = 10  # same minimum as POST /auth/technicians
SQLITE_PREFIX = "sqlite:///"


def db_path_from_url(url):
    if not url.startswith(SQLITE_PREFIX):
        raise SystemExit("RECOMPUTE_DB_URL must be a sqlite:/// URL for the hosted demo.")
    return Path(url[len(SQLITE_PREFIX):])


def demo_passwords(env):
    passwords = {}
    for username, var in PASSWORD_VARS.items():
        password = env.get(var, "")
        if len(password) < MIN_PASSWORD:
            raise SystemExit(f"Set {var} (at least {MIN_PASSWORD} characters) before starting the hosted demo.")
        passwords[username] = password
    return passwords


def boot(env):
    """True if a fresh demo database was built, False if one was already there."""
    db = db_path_from_url(env.get("RECOMPUTE_DB_URL", "sqlite:///./recompute.db"))
    passwords = demo_passwords(env)
    if db.exists():
        return False
    db.parent.mkdir(parents=True, exist_ok=True)
    build_demo_db(db, passwords=passwords)
    return True


def main():
    built = boot(os.environ)
    print("Built a fresh SAMPLE DATA demo database." if built else "Demo database already present; left as it is.")


if __name__ == "__main__":
    sys.exit(main())
