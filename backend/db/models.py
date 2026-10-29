"""Passport data model (PRD Section 6). Events are append-only: no UPDATE or DELETE anywhere.

Customer accounts (contract v2.4) live in their own tables: nothing a customer does enters a passport.
"""
from datetime import date, datetime, timezone

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, create_engine, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from sqlalchemy.pool import StaticPool

# SQLite enforces append-only events itself, so even a bug or a manual SQL edit cannot rewrite history.
SQLITE_APPEND_ONLY = (
    "CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events "
    "BEGIN SELECT RAISE(ABORT, 'events are append-only'); END",
    "CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events "
    "BEGIN SELECT RAISE(ABORT, 'events are append-only'); END",
)


def utcnow():
    return datetime.now(timezone.utc)


def iso(moment):
    """UTC ISO 8601 with Z, e.g. 2026-11-03T10:00:00Z (SQLite returns naive datetimes)."""
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class Base(DeclarativeBase):
    pass


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    model: Mapped[str] = mapped_column(String(200))
    device_type: Mapped[str] = mapped_column(String(100))
    install_date: Mapped[date] = mapped_column(Date)
    location: Mapped[str] = mapped_column(String(200))
    components: Mapped[list] = mapped_column(JSON, default=list)
    reliability_ok: Mapped[bool] = mapped_column(Boolean)
    inputs: Mapped[dict] = mapped_column(JSON)
    upgrade_options: Mapped[list] = mapped_column(JSON, default=list)
    sample_data: Mapped[bool] = mapped_column(Boolean, default=True)

    def to_dict(self):
        return {
            "id": self.id, "model": self.model, "device_type": self.device_type,
            "install_date": self.install_date.isoformat(), "location": self.location,
            "components": self.components, "reliability_ok": self.reliability_ok,
            "inputs": self.inputs, "upgrade_options": self.upgrade_options,
            "sample_data": self.sample_data,
        }


class Event(Base):
    __tablename__ = "events"
    # Two events can never claim the same predecessor, so simultaneous writes cannot fork the chain.
    __table_args__ = (UniqueConstraint("device_id", "prev_hash", name="uq_events_chain_link"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(ForeignKey("devices.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    kind: Mapped[str] = mapped_column(String(20))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    actor: Mapped[str] = mapped_column(String(100))
    prev_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)  # stretch S1, see db/chain.py
    hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    def to_dict(self):
        return {
            "id": self.id, "device_id": self.device_id, "created_at": iso(self.created_at),
            "kind": self.kind, "payload": self.payload, "actor": self.actor,
            "prev_hash": self.prev_hash, "hash": self.hash,
        }


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(ForeignKey("devices.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    result: Mapped[dict] = mapped_column(JSON)


class Workload(Base):
    __tablename__ = "workloads"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    W: Mapped[dict] = mapped_column(JSON)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "W": self.W}


class Technician(Base):
    """A login for write actions (PRD 15.5). Created only by tools/create_technician.py; no sign-up."""
    __tablename__ = "technicians"

    username: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    password_hash: Mapped[str] = mapped_column(String(300))  # salted scrypt, see api/auth.py
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    def to_dict(self):
        return {"username": self.username, "name": self.name}


class Customer(Base):
    """A buyer's account (contract v2.4): public sign-up; customers read passports, save devices and ask questions."""
    __tablename__ = "customers"

    email: Mapped[str] = mapped_column(String(254), primary_key=True)  # stored lower-case
    name: Mapped[str] = mapped_column(String(200))
    password_hash: Mapped[str] = mapped_column(String(300))  # salted scrypt, see api/auth.py
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    def to_dict(self):
        return {"email": self.email, "name": self.name}


class Favourite(Base):
    """A listed device a customer saved. The customer's own list, so it can be removed (unlike passport events)."""
    __tablename__ = "favourites"
    __table_args__ = (UniqueConstraint("customer_email", "device_id", name="uq_favourite"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_email: Mapped[str] = mapped_column(ForeignKey("customers.email"), index=True)
    device_id: Mapped[str] = mapped_column(ForeignKey("devices.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    def to_dict(self):
        return {"device_id": self.device_id, "saved_at": iso(self.created_at)}


class Enquiry(Base):
    """A customer's question about a device, read by the technicians on the fleet dashboard."""
    __tablename__ = "enquiries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_email: Mapped[str] = mapped_column(ForeignKey("customers.email"), index=True)
    device_id: Mapped[str] = mapped_column(ForeignKey("devices.id"), index=True)
    message: Mapped[str] = mapped_column(String(2000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


def make_session_factory(url):
    """Create tables (and SQLite append-only triggers) and return a session factory."""
    is_sqlite = url.startswith("sqlite")
    options = {"connect_args": {"check_same_thread": False}} if is_sqlite else {}
    if url in ("sqlite://", "sqlite:///:memory:"):
        options["poolclass"] = StaticPool  # one shared in-memory database for tests
    engine = create_engine(url, **options)
    Base.metadata.create_all(engine)
    if is_sqlite:
        with engine.begin() as conn:
            for statement in SQLITE_APPEND_ONLY:
                conn.execute(text(statement))
    return sessionmaker(engine, expire_on_commit=False)
