"""Tiny HTTP helper shared by seed.py and simulate_telemetry.py (standard library only).

Writes need a technician login: both scripts call login_from_env() first.
"""
import json
import os
import urllib.error
import urllib.request

DEFAULT_API_URL = "http://localhost:8000"


class ApiError(Exception):
    def __init__(self, message, status=None):
        super().__init__(message)
        self.status = status


def default_api_url():
    return os.environ.get("RECOMPUTE_API_URL", DEFAULT_API_URL)


def login_from_env(api_url):
    """Log in as the technician named in RECOMPUTE_USERNAME / RECOMPUTE_PASSWORD; return the bearer token.

    Every write needs a login (contract v2.0). Make the account on the backend machine with
    `py -m tools.create_technician tech-1 "Technician One"` (run in backend/).
    """
    username = os.environ.get("RECOMPUTE_USERNAME")
    password = os.environ.get("RECOMPUTE_PASSWORD")
    if not username or not password:
        raise ApiError("Set RECOMPUTE_USERNAME and RECOMPUTE_PASSWORD to a technician login first "
                       "(see README.md: 'Technician accounts').")
    return call(api_url, "POST", "/auth/login", {"username": username, "password": password})["token"]


def call(api_url, method, path, body=None, token=None):
    """Send one JSON request to the ReCompute API and return the decoded response."""
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(api_url.rstrip("/") + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise ApiError(f"{method} {path} -> HTTP {error.code}: {_error_message(error)}", error.code) from None
    except urllib.error.URLError as error:
        raise ApiError(f"Cannot reach the API at {api_url} ({error.reason}). "
                       "Start the backend first (see README.md).") from None


def _error_message(error):
    try:
        return json.load(error)["error"]
    except (ValueError, KeyError, TypeError):
        return error.reason
