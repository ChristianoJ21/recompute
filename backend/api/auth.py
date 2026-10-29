"""Logins (PRD 15.5, contract v2.0; customers v2.4): scrypt password hashes, HMAC-signed bearer tokens.

Standard library only. A token is base64url(JSON {sub, role, exp}) + "." + base64url(HMAC-SHA256 of that part).
Technicians are the admins: every passport write needs a technician token, and a customer token is refused (403).
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


def issue_token(secret_key, subject, role="technician"):
    expires = utcnow() + TOKEN_TTL
    payload = _b64(json.dumps({"sub": subject, "role": role, "exp": int(expires.timestamp())}).encode())
    return {"token": f"{payload}.{_sign(secret_key, payload)}", "expires_at": iso(expires)}


def read_token(secret_key, token):
    """(subject, role) inside a valid token; ValueError says why a token is refused.

    Tokens issued before customer accounts (contract v2.4) carry no role: only technicians had logins then.
    """
    payload, _, signature = token.partition(".")
    if not payload or not hmac.compare_digest(signature.encode(), _sign(secret_key, payload).encode()):
        raise ValueError("invalid login token")
    claims = json.loads(_unb64(payload))
    if utcnow() >= datetime.fromtimestamp(claims["exp"], timezone.utc):
        raise ValueError("login token expired")
    return claims["sub"], claims.get("role", "technician")


def unauthorized(message):
    return HTTPException(401, message, headers={"WWW-Authenticate": "Bearer"})


bearer = HTTPBearer(auto_error=False)


def token_subject(request, credentials, role, login_path):
    """Subject of a valid token of this role: 401 without a valid token, 403 for a token of the other role."""
    if credentials is None:
        raise unauthorized(f"Log in first: send 'Authorization: Bearer <token>' from {login_path}.")
    try:
        subject, token_role = read_token(request.app.state.secret_key, credentials.credentials)
    except ValueError as error:
        raise unauthorized(f"{str(error).capitalize()}; log in again with {login_path}.") from error
    if token_role != role:
        raise HTTPException(403, f"This needs a {role} login.")
    return subject


def require_technician(request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    """Dependency for every write endpoint (technicians are the admins): the logged-in technician, or 401/403."""
    username = token_subject(request, credentials, "technician", "POST /auth/login")
    with request.app.state.session_factory() as session:
        technician = session.get(Technician, username)
    if technician is None:
        raise unauthorized("This login no longer exists; log in again with POST /auth/login.")
    return technician


# ---- failed-login lock ----------------------------------------------------------

class LoginLock:
    """Counts failed logins per key in memory; `limit` of them within LOCK_WINDOW locks that key.

    Also a plain rate limit (sign-ups per client, enquiries per customer): record() counts one attempt.
    """

    def __init__(self, limit=MAX_FAILED_LOGINS):
        self._limit = limit
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
            return len(self._recent(username)) >= self._limit

    def failed(self, username):
        with self._mutex:
            self._failures[username] = [*self._recent(username), utcnow()]

    record = failed

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


class NewTechnicianIn(BaseModel):
    username: str = Field(max_length=64)
    name: str = Field(min_length=1, max_length=200)
    password: str = Field(max_length=200)


@router.post("/technicians", status_code=201, dependencies=[Depends(require_technician)])
def add_technician(body: NewTechnicianIn, request: Request):
    """A logged-in technician adds a colleague. There is still no public sign-up (PRD 15.5)."""
    with request.app.state.session_factory() as session:
        try:
            technician = create_technician(session, body.username, body.name, body.password)
        except ValueError as error:
            raise HTTPException(400, f"{error}.") from error
        return technician.to_dict()


# ---- a technician edits their own account (contract v2.3) -----------------------

class ProfileIn(BaseModel):
    name: str = Field(max_length=200)


@router.patch("/me")
def update_me(body: ProfileIn, request: Request, technician: Technician = Depends(require_technician)):
    """Change the logged-in technician's full name. The username never changes (it is the actor in the passport)."""
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "name: enter your full name.")
    with request.app.state.session_factory() as session:
        stored = session.get(Technician, technician.username)
        stored.name = name
        session.commit()
        return stored.to_dict()


class PasswordChangeIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(max_length=200)


@router.post("/password")
def change_password(body: PasswordChangeIn, request: Request, technician: Technician = Depends(require_technician)):
    """Change the logged-in technician's password. Wrong guesses count towards the same lock as logins.

    Answers 400 (not 401) for a wrong current password, so the frontend keeps the login.
    Tokens already issued stay valid until they expire (they carry no password version).
    """
    lock = request.app.state.login_lock
    if lock.is_locked(technician.username):
        raise HTTPException(429, "Too many wrong passwords for this username; try again in 15 minutes.")
    if not check_password(body.current_password, technician.password_hash):
        lock.failed(technician.username)
        raise HTTPException(400, "Current password is wrong.")
    if len(body.new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(400, f"new_password: use at least {MIN_PASSWORD_LENGTH} characters.")
    if body.new_password == body.current_password:
        raise HTTPException(400, "new_password: choose a password different from the current one.")
    lock.succeeded(technician.username)
    with request.app.state.session_factory() as session:
        stored = session.get(Technician, technician.username)
        stored.password_hash = hash_password(body.new_password)
        session.commit()
        return stored.to_dict()
