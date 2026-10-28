"""Tiny HTTP helper shared by seed.py and simulate_telemetry.py (standard library only)."""
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


def call(api_url, method, path, body=None):
    """Send one JSON request to the ReCompute API and return the decoded response."""
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        api_url.rstrip("/") + path, data=data, method=method,
        headers={"Content-Type": "application/json", "Accept": "application/json"})
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
