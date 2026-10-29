"""Customer accounts (contract v2.4): public sign-up and login, saved devices and enquiries.

Customers read passports, save listed devices and ask questions; every passport write still needs a technician
(the admins). Favourites and enquiries live in their own tables and never enter the hash-chained passport events.
There is still no buy button, cart, payment or order.
"""
import re

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select

from api.auth import (DUMMY_HASH, MIN_PASSWORD_LENGTH, bearer, check_password, hash_password, issue_token,
                      require_technician, token_subject, unauthorized)
from api.common import find_device, get_session, listed_events
from db.models import Customer, Enquiry, Favourite, iso

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
MAX_SIGNUPS = 5  # per client address within auth.LOCK_WINDOW
MAX_ENQUIRIES = 10  # per customer within auth.LOCK_WINDOW
WRONG_LOGIN = "Wrong e-mail or password."

router = APIRouter()


def normalise_email(email):
    return email.strip().lower()


def client_address(request):
    """The visitor's address; behind Vercel and Render it is the first X-Forwarded-For entry."""
    forwarded = request.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")


def require_customer(request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    """The logged-in customer, or 401 (no valid token) / 403 (a technician token)."""
    email = token_subject(request, credentials, "customer", "POST /customers/login")
    with request.app.state.session_factory() as session:
        customer = session.get(Customer, email)
    if customer is None:
        raise unauthorized("This login no longer exists; log in again with POST /customers/login.")
    return customer


def logged_in(request, customer):
    return {**issue_token(request.app.state.secret_key, customer.email, role="customer"),
            "token_type": "bearer", "customer": customer.to_dict()}


def enquiry_dict(enquiry, customer):
    return {"id": enquiry.id, "device_id": enquiry.device_id, "message": enquiry.message,
            "created_at": iso(enquiry.created_at), "customer": customer.to_dict()}


# ---- sign-up and login --------------------------------------------------------

class SignupIn(BaseModel):
    email: str = Field(max_length=254)
    name: str = Field(max_length=200)
    password: str = Field(max_length=200)


class CustomerLoginIn(BaseModel):
    email: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=200)


@router.post("/customers/signup", status_code=201)
def signup(body: SignupIn, request: Request, session=Depends(get_session)):
    """Public sign-up for buyers; the new customer is logged in at once."""
    limit, client = request.app.state.signup_limit, client_address(request)
    if limit.is_locked(client):
        raise HTTPException(429, "Too many sign-ups from this network; try again in 15 minutes.")
    email, name = normalise_email(body.email), body.name.strip()
    if not re.fullmatch(EMAIL_PATTERN, email):
        raise HTTPException(400, "email: enter an e-mail address like name@example.com.")
    if not name:
        raise HTTPException(400, "name: enter your name.")
    if len(body.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(400, f"password: use at least {MIN_PASSWORD_LENGTH} characters.")
    if session.get(Customer, email) is not None:
        raise HTTPException(400, f"{email} already has an account; log in instead.")
    customer = Customer(email=email, name=name, password_hash=hash_password(body.password))
    session.add(customer)
    session.commit()
    limit.record(client)
    return logged_in(request, customer)


@router.post("/customers/login")
def customer_login(body: CustomerLoginIn, request: Request, session=Depends(get_session)):
    email = normalise_email(body.email)
    lock, key = request.app.state.login_lock, f"customer:{email}"  # ':' never occurs in a technician username
    if lock.is_locked(key):
        raise HTTPException(429, "Too many failed logins for this e-mail; try again in 15 minutes.")
    customer = session.get(Customer, email)
    stored = customer.password_hash if customer else DUMMY_HASH
    if not check_password(body.password, stored) or customer is None:
        lock.failed(key)
        raise unauthorized(WRONG_LOGIN)
    lock.succeeded(key)
    return logged_in(request, customer)


@router.get("/customers/me")
def me(customer: Customer = Depends(require_customer)):
    return customer.to_dict()


# ---- saved devices ----------------------------------------------------------------

def saved(session, email, device_id):
    return session.scalar(select(Favourite).where(Favourite.customer_email == email, Favourite.device_id == device_id))


@router.get("/customers/me/favourites")
def favourites(customer: Customer = Depends(require_customer), session=Depends(get_session)):
    rows = session.scalars(select(Favourite).where(Favourite.customer_email == customer.email).order_by(Favourite.id.desc()))
    return [row.to_dict() for row in rows]


@router.put("/customers/me/favourites/{device_id}")
def save_device(device_id: str, customer: Customer = Depends(require_customer), session=Depends(get_session)):
    """Save a listed device; saving it again keeps the one entry."""
    find_device(session, device_id)
    existing = saved(session, customer.email, device_id)
    if existing is not None:
        return existing.to_dict()
    if device_id not in listed_events(session):
        raise HTTPException(400, "Only devices listed for sale can be saved.")
    favourite = Favourite(customer_email=customer.email, device_id=device_id)
    session.add(favourite)
    session.commit()
    return favourite.to_dict()


@router.delete("/customers/me/favourites/{device_id}")
def remove_device(device_id: str, customer: Customer = Depends(require_customer), session=Depends(get_session)):
    session.execute(delete(Favourite).where(Favourite.customer_email == customer.email, Favourite.device_id == device_id))
    session.commit()
    return {"device_id": device_id, "removed": True}


# ---- enquiries --------------------------------------------------------------------

class EnquiryIn(BaseModel):
    device_id: str = Field(min_length=1, max_length=64)
    message: str = Field(max_length=2000)


@router.post("/customers/me/enquiries", status_code=201)
def send_enquiry(body: EnquiryIn, request: Request, customer: Customer = Depends(require_customer),
                 session=Depends(get_session)):
    limit = request.app.state.enquiry_limit
    if limit.is_locked(customer.email):
        raise HTTPException(429, "Too many enquiries; try again in 15 minutes.")
    message = body.message.strip()
    if not message:
        raise HTTPException(400, "message: write your question.")
    find_device(session, body.device_id)
    enquiry = Enquiry(customer_email=customer.email, device_id=body.device_id, message=message)
    session.add(enquiry)
    session.commit()
    limit.record(customer.email)
    return enquiry_dict(enquiry, customer)


@router.get("/customers/me/enquiries")
def my_enquiries(customer: Customer = Depends(require_customer), session=Depends(get_session)):
    rows = session.scalars(select(Enquiry).where(Enquiry.customer_email == customer.email).order_by(Enquiry.id.desc()))
    return [enquiry_dict(row, customer) for row in rows]


# ---- what technicians (the admins) see -----------------------------------------------

@router.get("/enquiries", dependencies=[Depends(require_technician)])
def all_enquiries(session=Depends(get_session)):
    rows = session.execute(select(Enquiry, Customer).join(Customer, Customer.email == Enquiry.customer_email)
                           .order_by(Enquiry.id.desc()))
    return [enquiry_dict(enquiry, customer) for enquiry, customer in rows]


@router.get("/customers", dependencies=[Depends(require_technician)])
def all_customers(session=Depends(get_session)):
    """Every customer account with how many devices they saved and questions they sent (never the password hash)."""
    def counts(model):
        return dict(session.execute(select(model.customer_email, func.count()).group_by(model.customer_email)).all())

    saved_counts, enquiry_counts = counts(Favourite), counts(Enquiry)
    return [{**customer.to_dict(), "created_at": iso(customer.created_at),
             "favourites": saved_counts.get(customer.email, 0), "enquiries": enquiry_counts.get(customer.email, 0)}
            for customer in session.scalars(select(Customer).order_by(Customer.created_at.desc()))]
