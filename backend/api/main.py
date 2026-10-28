"""ReCompute REST API (PRD Section 7, contract in contracts/api_contract.md).

Run from backend/:  py -m uvicorn api.main:create_app --factory --reload
"""
import io
import os
import secrets
from datetime import date
from typing import Literal
from urllib.parse import quote

import qrcode
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException

from api import auth
from api.auth import LoginLock, require_technician
from db.chain import GENESIS_HASH, event_hash, verify
from db.models import Device, Evaluation, Event, Workload, iso, make_session_factory, utcnow
from engine.decision import OUTCOMES, evaluate

DEFAULT_DB_URL = "sqlite:///./recompute.db"
DEFAULT_FRONTEND_URL = "http://localhost:5173/device/{device_id}"
EVENT_KINDS = ("telemetry", "scan", "repair", "upgrade", "wipe", "move", "note")
LISTING_KINDS = ("list", "unlist")  # written only by /list and /unlist, so the wipe rule cannot be skipped
CONTACT = {  # fictional on purpose: never a real person's details (PRD 15.3)
    "organisation": "Sample Data Centre (fictional)",
    "email": "hardware@example.com",
    "phone": None,
    "hours": "Mon-Fri 09:00-17:00 WIB",
    "note": "Demo only: no real sales. Prices are sample values.",
    "sample_data": True,
}
ID_PATTERN = r"^[A-Za-z0-9._-]{1,64}$"


# ---- request bodies -----------------------------------------------------------

class Range(BaseModel):
    low: float = Field(ge=0)
    high: float = Field(ge=0)

    @model_validator(mode="after")
    def low_not_above_high(self):
        if self.low > self.high:
            raise ValueError(f"low ({self.low}) must not be above high ({self.high})")
        return self


class Inputs(BaseModel):
    I_old: Range | None = None
    I_new: Range | None = None
    W: Range | None = None
    T: Range | None = None
    E_new: Range | None = None


class Component(BaseModel):
    type: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=200)


class UpgradeOption(BaseModel):
    component: str = Field(min_length=1, max_length=100)
    I_upgraded: Range | None = None
    E_component: Range | None = None


class DeviceIn(BaseModel):
    id: str = Field(pattern=ID_PATTERN)
    model: str = Field(min_length=1, max_length=200)
    device_type: str = Field(min_length=1, max_length=100)
    install_date: date
    location: str = Field(max_length=200)
    components: list[Component] = []
    reliability_ok: bool
    inputs: Inputs
    upgrade_options: list[UpgradeOption] = []
    sample_data: bool = True

    @model_validator(mode="after")
    def unique_upgrade_components(self):
        names = [option.component for option in self.upgrade_options]
        if len(names) != len(set(names)):
            raise ValueError("upgrade_options: each component name must be unique")
        return self


class EventIn(BaseModel):
    """The actor is the logged-in technician (contract v2.0); an 'actor' field in the body is ignored."""
    kind: Literal[EVENT_KINDS]
    payload: dict = Field(default_factory=dict)


class Price(BaseModel):
    amount: int = Field(gt=0)  # whole units of the currency
    currency: str = Field(pattern=r"^[A-Z]{3}$")  # ISO 4217, e.g. IDR


class ListIn(BaseModel):
    price: Price
    note: str | None = Field(default=None, max_length=500)


class UnlistIn(BaseModel):
    note: str | None = Field(default=None, max_length=500)


class WorkloadIn(BaseModel):
    id: str = Field(pattern=ID_PATTERN)
    name: str = Field(min_length=1, max_length=200)
    W: Range


# ---- helpers --------------------------------------------------------------------

def get_session(request: Request):
    with request.app.state.session_factory() as session:
        yield session


def find_device(session, device_id):
    device = session.get(Device, device_id)
    if device is None:
        raise HTTPException(404, f"Device '{device_id}' not found. Create it with POST /devices first.")
    return device


def head_hash(session, device_id):
    """Hash of the device's newest event, i.e. what the next event links to."""
    latest = session.scalar(select(Event.hash).where(Event.device_id == device_id).order_by(Event.id.desc()).limit(1))
    return latest or GENESIS_HASH


def append_event(session, device_id, kind, payload, actor):
    """Add one event to the device's hash chain (the only way events are written)."""
    fields = {"device_id": device_id, "created_at": utcnow(), "kind": kind, "payload": payload,
              "actor": actor, "prev_hash": head_hash(session, device_id)}
    event = Event(**fields, hash=event_hash(**fields))
    session.add(event)
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        raise HTTPException(409, f"Another event for '{device_id}' was written at the same moment; "
                                 "send this event again.") from error
    return event.to_dict()


def device_events(session, device_id, kinds=None):
    """The device's events, oldest first (optionally only some kinds)."""
    query = select(Event).where(Event.device_id == device_id)
    if kinds:
        query = query.where(Event.kind.in_(kinds))
    return list(session.scalars(query.order_by(Event.id)))


def listed_events(session):
    """{device_id: its 'list' event} for devices whose newest listing event is 'list'."""
    newest = {}
    for event in session.scalars(select(Event).where(Event.kind.in_(LISTING_KINDS)).order_by(Event.id)):
        newest[event.device_id] = event
    return {device_id: event for device_id, event in newest.items() if event.kind == "list"}


def listing_row(session, device, list_event, outcome):
    events = device_events(session, device.id)
    wipes = [e for e in events if e.kind == "wipe"]
    telemetry = [e for e in events if e.kind == "telemetry"]
    return {
        "device_id": device.id, "model": device.model, "device_type": device.device_type,
        "install_date": device.install_date.isoformat(), "components": device.components,
        "reliability_ok": device.reliability_ok, "latest_outcome": outcome,
        "passport_intact": verify(device.id, events)["valid"],
        "wiped_at": iso(wipes[-1].created_at) if wipes else None,
        "listed_at": iso(list_event.created_at),
        "price": list_event.payload["price"], "note": list_event.payload.get("note"),
        "latest_telemetry": telemetry[-1].to_dict() if telemetry else None,
        "sample_data": device.sample_data,
    }


def latest_results(session):
    """{device_id: latest evaluation result}, in one query."""
    latest_ids = select(func.max(Evaluation.id)).group_by(Evaluation.device_id)
    rows = session.scalars(select(Evaluation).where(Evaluation.id.in_(latest_ids)))
    return {row.device_id: row.result for row in rows}


# ---- routes ---------------------------------------------------------------------

router = APIRouter()


@router.get("/devices")
def list_devices(session=Depends(get_session)):
    latest = latest_results(session)
    return [
        {"id": d.id, "model": d.model, "location": d.location,
         "latest_outcome": latest.get(d.id, {}).get("outcome"), "sample_data": d.sample_data}
        for d in session.scalars(select(Device).order_by(Device.id))
    ]


@router.get("/devices/{device_id}")
def get_device(device_id: str, session=Depends(get_session)):
    device = find_device(session, device_id)
    events = session.scalars(select(Event).where(Event.device_id == device_id).order_by(Event.id.desc()))
    latest = session.scalars(
        select(Evaluation).where(Evaluation.device_id == device_id).order_by(Evaluation.id.desc()).limit(1)
    ).first()
    return {
        "device": device.to_dict(),
        "events": [event.to_dict() for event in events],
        "latest_evaluation": latest.result if latest else None,
    }


@router.post("/devices", status_code=201, dependencies=[Depends(require_technician)])
def create_device(body: DeviceIn, session=Depends(get_session)):
    if session.get(Device, body.id) is not None:
        raise HTTPException(400, f"Device '{body.id}' already exists. Passport records are never overwritten; use a new id.")
    device = Device(**body.model_dump())
    session.add(device)
    session.commit()
    return device.to_dict()


@router.post("/devices/{device_id}/events", status_code=201)
def add_event(device_id: str, body: EventIn, session=Depends(get_session), technician=Depends(require_technician)):
    find_device(session, device_id)
    return append_event(session, device_id, body.kind, body.payload, technician.username)


@router.post("/devices/{device_id}/list", status_code=201)
def list_for_sale(device_id: str, body: ListIn, session=Depends(get_session), technician=Depends(require_technician)):
    find_device(session, device_id)
    if not device_events(session, device_id, ["wipe"]):
        raise HTTPException(400, f"'{device_id}' has no wipe event. Record a data wipe "
                                 "(POST /devices/{id}/events, kind 'wipe') before listing it.")
    if device_id in listed_events(session):
        raise HTTPException(400, f"'{device_id}' is already listed; unlist it first to change the price.")
    return append_event(session, device_id, "list", body.model_dump(exclude_none=True), technician.username)


@router.post("/devices/{device_id}/unlist", status_code=201)
def unlist(device_id: str, body: UnlistIn, session=Depends(get_session), technician=Depends(require_technician)):
    find_device(session, device_id)
    if device_id not in listed_events(session):
        raise HTTPException(400, f"'{device_id}' is not listed.")
    return append_event(session, device_id, "unlist", body.model_dump(exclude_none=True), technician.username)


@router.get("/listings")
def listings(session=Depends(get_session)):
    listed = sorted(listed_events(session).values(), key=lambda event: event.id, reverse=True)
    latest = latest_results(session)
    return [listing_row(session, session.get(Device, e.device_id), e, latest.get(e.device_id, {}).get("outcome"))
            for e in listed]


@router.get("/contact")
def contact():
    return CONTACT


@router.get("/devices/{device_id}/events/verify")
def verify_events(device_id: str, session=Depends(get_session)):
    find_device(session, device_id)
    return verify(device_id, list(session.scalars(select(Event).where(Event.device_id == device_id).order_by(Event.id))))


@router.post("/devices/{device_id}/evaluate", dependencies=[Depends(require_technician)])
def evaluate_device(device_id: str, session=Depends(get_session)):
    device = find_device(session, device_id)
    workloads = [w.to_dict() for w in session.scalars(select(Workload).order_by(Workload.id))]
    try:
        result = evaluate(device.to_dict(), workloads, utcnow())
    except ValueError as error:
        raise HTTPException(400, f"Cannot evaluate '{device_id}': {error}") from error
    session.add(Evaluation(device_id=device_id, created_at=utcnow(), result=result))
    session.commit()
    return result


@router.get("/fleet/summary")
def fleet_summary(session=Depends(get_session)):
    latest = latest_results(session)
    counts = {outcome: 0 for outcome in OUTCOMES}
    for result in latest.values():
        counts[result["outcome"]] += 1
    devices = session.scalar(select(func.count()).select_from(Device))
    real = session.scalar(select(func.count()).select_from(Device).where(Device.sample_data.is_(False)))
    return {"counts": counts, "devices": devices, "not_evaluated": devices - len(latest), "sample_data": real == 0}


@router.get("/devices/{device_id}/qr")
def device_qr(device_id: str, request: Request, session=Depends(get_session)):
    find_device(session, device_id)
    url = request.app.state.frontend_url.format(device_id=quote(device_id, safe=""))
    buffer = io.BytesIO()
    qrcode.make(url).save(buffer)
    return Response(buffer.getvalue(), media_type="image/png")


@router.get("/workloads")
def list_workloads(session=Depends(get_session)):
    return [w.to_dict() for w in session.scalars(select(Workload).order_by(Workload.id))]


@router.post("/workloads", status_code=201, dependencies=[Depends(require_technician)])
def create_workload(body: WorkloadIn, session=Depends(get_session)):
    if session.get(Workload, body.id) is not None:
        raise HTTPException(400, f"Workload '{body.id}' already exists; use a new id.")
    workload = Workload(**body.model_dump())
    session.add(workload)
    session.commit()
    return workload.to_dict()


# ---- app ------------------------------------------------------------------------

async def http_error(request, exc):
    message = str(exc.detail)
    if exc.status_code == 405:
        message = (f"{request.method} is not allowed on {request.url.path}. "
                   "Passport events are append-only; see contracts/api_contract.md.")
    elif message == "Not Found":
        message = f"No endpoint {request.method} {request.url.path}; see contracts/api_contract.md."
    return JSONResponse({"error": message}, status_code=exc.status_code, headers=exc.headers)


async def validation_error(request, exc):
    problems = ["{}: {}".format(".".join(str(part) for part in err["loc"][1:]) or "body", err["msg"])
                for err in exc.errors()]
    return JSONResponse({"error": "; ".join(problems)}, status_code=400)


def create_app(database_url=None, frontend_url=None, secret_key=None):
    app = FastAPI(title="ReCompute API (SAMPLE DATA demo)", version="2.0")
    app.state.session_factory = make_session_factory(
        database_url or os.environ.get("RECOMPUTE_DB_URL", DEFAULT_DB_URL))
    app.state.frontend_url = frontend_url or os.environ.get("RECOMPUTE_FRONTEND_URL", DEFAULT_FRONTEND_URL)
    # Without RECOMPUTE_SECRET_KEY, tokens stop working when the server restarts (fine on the laptop only).
    app.state.secret_key = secret_key or os.environ.get("RECOMPUTE_SECRET_KEY") or secrets.token_urlsafe(32)
    app.state.login_lock = LoginLock()
    app.add_exception_handler(StarletteHTTPException, http_error)
    app.add_exception_handler(RequestValidationError, validation_error)
    app.include_router(auth.router)
    app.include_router(router)
    return app
