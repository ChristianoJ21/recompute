"""Technician login (PRD 15.5, contract v2.0): scrypt password hashes, HMAC-signed bearer tokens.

Standard library only. A token is base64url(JSON {sub, exp}) + "." + base64url(HMAC-SHA256 of that part).
"""
import base64
import hashlib
import hmac
import json
import re
import secrets
import threading
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from db.models import Technician, iso, utcnow

TOKEN_TTL = timedelta(hours=12)
MAX_FAILED_LOGINS = 5
LOCK_WINDOW = timedelta(minutes=15)
MIN_PASSWORD_LENGTH = 10
USERNAME_PATTERN = r"^[A-Za-z0-9._-]{1,64}$"
SCRYPT = {"n": 2 ** 14, "r": 8, "p": 1}
WRONG_LOGIN = "Wrong username or password."


# ---- passwords ------------------------------------------------------------------

def hash_password(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, **SCRYPT)
    return f"scrypt${salt.hex()}${digest.hex()}"


def check_password(password, stored):
    _, salt, digest = stored.split("$")
    candidate = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), **SCRYPT)
    return hmac.compare_digest(candidate.hex(), digest)


# Checked when the username is unknown, so both wrong-login cases take the same time.
DUMMY_HASH = hash_password(secrets.token_hex(16))


def create_technician(session, username, name, password):
    if not re.fullmatch(USERNAME_PATTERN, username):
        raise ValueError("username: use 1-64 letters, digits, '.', '_' or '-'")
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"password must be at least {MIN_PASSWORD_LENGTH} characters")
    if session.get(Technician, username) is not None:
        raise ValueError(f"technician '{username}' already exists")
    technician = Technician(username=username, name=name, password_hash=hash_password(password))
    session.add(technician)
    session.commit()
    return technician


# ---- tokens ---------------------------------------------------------------------

def _b64(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(text):
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _sign(secret_key, payload):
    return _b64(hmac.new(secret_key.encode(), payload.encode(), hashlib.sha256).digest())


def issue_token(secret_key, username):
    expires = utcnow() + TOKEN_TTL
    payload = _b64(json.dumps({"sub": username, "exp": int(expires.timestamp())}).encode())
    return {"token": f"{payload}.{_sign(secret_key, payload)}", "expires_at": iso(expires)}


def read_token(secret_key, token):
    """Username inside a valid token; ValueError says why a token is refused."""
    payload, _, signature = token.partition(".")
    if not payload or not hmac.compare_digest(signature.encode(), _sign(secret_key, payload).encode()):
        raise ValueError("invalid login token")
    claims = json.loads(_unb64(payload))
    if utcnow() >= datetime.fromtimestamp(claims["exp"], timezone.utc):
        raise ValueError("login token expired")
    return claims["sub"]


def unauthorized(message):
    return HTTPException(401, message, headers={"WWW-Authenticate": "Bearer"})


bearer = HTTPBearer(auto_error=False)


def require_technician(request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    """Dependency for every write endpoint: the logged-in technician, or 401."""
    if credentials is None:
        raise unauthorized("Log in first: send 'Authorization: Bearer <token>' from POST /auth/login.")
    try:
        username = read_token(request.app.state.secret_key, credentials.credentials)
    except ValueError as error:
        raise unauthorized(f"{str(error).capitalize()}; log in again with POST /auth/login.") from error
    with request.app.state.session_factory() as session:
        technician = session.get(Technician, username)
    if technician is None:
        raise unauthorized("This login no longer exists; log in again with POST /auth/login.")
    return technician


# ---- failed-login lock ----------------------------------------------------------

class LoginLock:
    """Counts failed logins per username in memory; MAX_FAILED_LOGINS within LOCK_WINDOW locks it."""

    def __init__(self):
        self._failures = {}
        self._mutex = threading.Lock()

    def _recent(self, username):
        cutoff = utcnow() - LOCK_WINDOW
        recent = [moment for moment in self._failures.pop(username, []) if moment > cutoff]
        if recent:  # forget usernames with no recent failures, so the dict cannot grow without bound
            self._failures[username] = recent
        return recent

    def is_locked(self, username):
        with self._mutex:
            return len(self._recent(username)) >= MAX_FAILED_LOGINS

    def failed(self, username):
        with self._mutex:
            self._failures[username] = [*self._recent(username), utcnow()]

    def succeeded(self, username):
        with self._mutex:
            self._failures.pop(username, None)


# ---- routes ---------------------------------------------------------------------

class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=200)


router = APIRouter(prefix="/auth")


@router.post("/login")
def login(body: LoginIn, request: Request):
    lock = request.app.state.login_lock
    if lock.is_locked(body.username):
        raise HTTPException(429, "Too many failed logins for this username; try again in 15 minutes.")
    with request.app.state.session_factory() as session:
        technician = session.get(Technician, body.username)
    stored = technician.password_hash if technician else DUMMY_HASH
    if not check_password(body.password, stored) or technician is None:
        lock.failed(body.username)
        raise unauthorized(WRONG_LOGIN)
    lock.succeeded(body.username)
    return {**issue_token(request.app.state.secret_key, technician.username),
            "token_type": "bearer", "technician": technician.to_dict()}


@router.get("/me")
def me(technician: Technician = Depends(require_technician)):
    return technician.to_dict()
