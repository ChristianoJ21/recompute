"""Helpers shared by the passport routes (api/main.py) and the customer routes (api/customers.py)."""
from fastapi import HTTPException, Request
from sqlalchemy import select

from db.models import Device, Event

LISTING_KINDS = ("list", "unlist")  # written only by /list and /unlist, so the wipe rule cannot be skipped


def get_session(request: Request):
    with request.app.state.session_factory() as session:
        yield session


def find_device(session, device_id):
    device = session.get(Device, device_id)
    if device is None:
        raise HTTPException(404, f"Device '{device_id}' not found. Create it with POST /devices first.")
    return device


def listed_events(session):
    """{device_id: its 'list' event} for devices whose newest listing event is 'list'."""
    newest = {}
    for event in session.scalars(select(Event).where(Event.kind.in_(LISTING_KINDS)).order_by(Event.id)):
        newest[event.device_id] = event
    return {device_id: event for device_id, event in newest.items() if event.kind == "list"}
