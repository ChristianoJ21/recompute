"""ReCompute REST API (PRD Section 7, contract in contracts/api_contract.md).

Run from backend/:  py -m uvicorn api.main:create_app --factory --reload
"""
import io
import os
from datetime import date
from typing import Literal
from urllib.parse import quote

import qrcode
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import func, select
from starlette.exceptions import HTTPException as StarletteHTTPException

from db.models import Device, Evaluation, Event, Workload, make_session_factory, utcnow
from engine.decision import OUTCOMES, evaluate

DEFAULT_DB_URL = "sqlite:///./recompute.db"
DEFAULT_FRONTEND_URL = "http://localhost:5173/device/{device_id}"
EVENT_KINDS = ("telemetry", "scan", "repair", "upgrade", "wipe", "move", "note")
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
    kind: Literal[EVENT_KINDS]
    payload: dict = Field(default_factory=dict)
    actor: str = Field(min_length=1, max_length=100)


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


@router.post("/devices", status_code=201)
def create_device(body: DeviceIn, session=Depends(get_session)):
    if session.get(Device, body.id) is not None:
        raise HTTPException(400, f"Device '{body.id}' already exists. Passport records are never overwritten; use a new id.")
    device = Device(**body.model_dump())
    session.add(device)
    session.commit()
    return device.to_dict()


@router.post("/devices/{device_id}/events", status_code=201)
def add_event(device_id: str, body: EventIn, session=Depends(get_session)):
    find_device(session, device_id)
    event = Event(device_id=device_id, created_at=utcnow(), **body.model_dump())
    session.add(event)
    session.commit()
    return event.to_dict()


@router.post("/devices/{device_id}/evaluate")
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


@router.post("/workloads", status_code=201)
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
    return JSONResponse({"error": message}, status_code=exc.status_code)


async def validation_error(request, exc):
    problems = ["{}: {}".format(".".join(str(part) for part in err["loc"][1:]) or "body", err["msg"])
                for err in exc.errors()]
    return JSONResponse({"error": "; ".join(problems)}, status_code=400)


def create_app(database_url=None, frontend_url=None):
    app = FastAPI(title="ReCompute API (SAMPLE DATA demo)", version="1.1")
    app.state.session_factory = make_session_factory(
        database_url or os.environ.get("RECOMPUTE_DB_URL", DEFAULT_DB_URL))
    app.state.frontend_url = frontend_url or os.environ.get("RECOMPUTE_FRONTEND_URL", DEFAULT_FRONTEND_URL)
    app.add_exception_handler(StarletteHTTPException, http_error)
    app.add_exception_handler(RequestValidationError, validation_error)
    app.include_router(router)
    return app
