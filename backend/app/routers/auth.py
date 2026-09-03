import hashlib
import sqlite3
import time
from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from ..auth import create_account, new_session, verify_password
from ..database import connection

router = APIRouter(prefix="/api/auth", tags=["authentication"])


class Credentials(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str = Field(min_length=3, max_length=80, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=12, max_length=128)
    portal: Literal["farmer", "staff"] | None = None


class Registration(Credentials):
    name: str = Field(min_length=1, max_length=100)
    mobile: str = Field(default="", pattern=r"^$|^\+?[0-9][0-9 -]{7,17}$")


@router.post("/register", status_code=201)
def register(payload: Registration):
    if not payload.name.strip():
        raise HTTPException(422, "Name is required")
    try:
        with connection() as db:
            user = create_account(db, payload.username.lower(), payload.password, payload.name.strip())
            if payload.mobile:
                import json
                row = db.execute('SELECT payload FROM farmers WHERE id=?', (user['id'],)).fetchone()
                profile = json.loads(row['payload'])
                profile['mobile'] = payload.mobile
                db.execute('UPDATE farmers SET payload=? WHERE id=?', (json.dumps(profile), user['id']))
            token = new_session(db, user["id"])
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Username is unavailable")
    return dict(user=user, token=token)


@router.post("/login")
def login(payload: Credentials):
    username = payload.username.lower()
    with connection() as db:
        db.execute("BEGIN IMMEDIATE")
        attempt = db.execute("SELECT * FROM login_attempts WHERE username = ?", (username,)).fetchone()
        if attempt and attempt["blocked_until"] > time.time():
            raise HTTPException(429, "Too many attempts. Try again in 15 minutes.")
        row = db.execute("SELECT * FROM accounts WHERE username = ?", (username,)).fetchone()
        if row is None or not verify_password(payload.password, row["password_hash"]):
            failures = (attempt["failures"] if attempt and attempt["blocked_until"] == 0 else 0) + 1
            db.execute("INSERT OR REPLACE INTO login_attempts VALUES (?, ?, ?)", (username, failures, time.time() + 900 if failures >= 5 else 0))
            error = True
        else:
            db.execute("DELETE FROM login_attempts WHERE username = ?", (username,))
            assigned = db.execute('SELECT role FROM account_roles WHERE account_id=?',(row['id'],)).fetchone()
            user = dict(id=row["id"], username=username, role=assigned['role'] if assigned else row["role"], centreId=row["centre_id"])
            if payload.portal == 'staff' and user['role'] == 'farmer':
                raise HTTPException(403, 'Use the Farmer Login for this account')
            if payload.portal == 'farmer' and user['role'] != 'farmer':
                raise HTTPException(403, 'Use the Government Login for this account')
            token = new_session(db, row["id"])
            error = False
    if error:
        raise HTTPException(401, "Invalid username or password")
    return dict(user=user, token=token)


@router.get("/me")
def me(request: Request):
    return request.state.user


@router.post("/logout")
def logout(request: Request):
    token = request.headers.get("authorization", "").removeprefix("Bearer ")
    with connection() as db:
        db.execute("DELETE FROM sessions WHERE token_hash = ?", (hashlib.sha256(token.encode()).hexdigest(),))
    return {"ok": True}
