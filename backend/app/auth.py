import hashlib
import hmac
import json
import secrets
import time
from contextvars import ContextVar
from uuid import uuid4

from fastapi import HTTPException
from .database import connection

identity = ContextVar("identity", default=None)


def current_farmer_id():
    account = identity.get()
    if account is None or account["role"] != "farmer":
        raise HTTPException(403, "Farmer account required")
    return account["id"]


def hash_password(password):
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1).hex()
    return f"{salt}:{digest}"


def verify_password(password, stored):
    salt, expected = stored.split(":")
    actual = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1).hex()
    return hmac.compare_digest(actual, expected)


def create_account(db, username, password, name, role="farmer", centre_id=None):
    account_id = f"KS-{uuid4()}"
    profile = dict(id=account_id, name=name, village="", district="", state="", mobile="", language="en", transport="Not specified", history=[])
    db.execute("INSERT INTO farmers VALUES (?, ?)", (account_id, json.dumps(profile)))
    db.execute("INSERT INTO accounts VALUES (?, ?, ?, ?, ?)", (account_id, username, hash_password(password), 'operator' if role in ('government','super_admin') else role, centre_id))
    if role in ('government', 'super_admin'):
        db.execute('INSERT INTO account_roles VALUES (?,?)',(account_id,role))
    return dict(id=account_id, username=username, role=role, centreId=centre_id)


def new_session(db, account_id):
    token = secrets.token_urlsafe(32)
    db.execute("DELETE FROM sessions WHERE expires_at <= ?", (time.time(),))
    db.execute("INSERT INTO sessions VALUES (?, ?, ?)", (hashlib.sha256(token.encode()).hexdigest(), account_id, time.time() + 8 * 3600))
    return token


def authenticate(token):
    if not token:
        return None
    with connection() as db:
        row = db.execute("SELECT a.id, a.username, COALESCE(r.role,a.role) AS role, a.centre_id AS centreId FROM sessions s JOIN accounts a ON a.id = s.account_id LEFT JOIN account_roles r ON r.account_id=a.id WHERE s.token_hash = ? AND s.expires_at > ?", (hashlib.sha256(token.encode()).hexdigest(), time.time())).fetchone()
        return dict(row) if row else None
