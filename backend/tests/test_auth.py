import os
import tempfile
import time
import unittest
from datetime import datetime, timedelta
from uuid import uuid4
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.auth import create_account
from app.database import connection
from app.routers.bookings import IST


class AuthTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {"KISANSETU_DB_PATH": os.path.join(self.temp.name, "auth.sqlite3")})
        self.env.start()

    def tearDown(self):
        self.env.stop()
        self.temp.cleanup()

    def test_registration_isolation_logout_and_expiry(self):
        with TestClient(app) as c:
            self.assertEqual(c.get("/api/farmers/me").status_code, 401)
            self.assertEqual(c.get("/api/bookings/me").status_code, 401)
            self.assertEqual(c.post("/api/queues/mandi-a/call-next").status_code, 401)
            self.assertEqual(c.get("/api/centres").status_code, 200)
            credentials = dict(username="alice", password="correct-horse-password", name="Alice")
            self.assertEqual(c.post("/api/auth/register", json={**credentials, "role": "operator"}).status_code, 422)
            registered = c.post("/api/auth/register", json=credentials)
            self.assertEqual(registered.status_code, 201)
            login = {"username": credentials["username"], "password": credentials["password"]}
            self.assertEqual(c.post('/api/auth/login', json={**login, 'portal':'staff'}).status_code, 403)
            self.assertEqual(c.post('/api/auth/login', json={**login, 'portal':'farmer'}).status_code, 200)
            a = {"Authorization": f'Bearer {registered.json()["token"]}'}
            self.assertEqual(c.get("/api/farmers/me", headers=a).json()["name"], "Alice")
            self.assertEqual(c.get("/api/farmers/me/crops", headers=a).json(), [])
            crop = c.post("/api/farmers/me/crops", headers=a, json=dict(type="Wheat", quantity=20, unit="Quintals", expectedDate="2026-10-01", preferredCentreId="mandi-a", transportAvailable=True)).json()
            bob = c.post("/api/auth/register", json={**credentials, "username": "bob", "name": "Bob"}).json()
            b = {"Authorization": f'Bearer {bob["token"]}'}
            self.assertEqual(c.get("/api/farmers/me/crops", headers=b).json(), [])
            day = (datetime.now(IST).date() + timedelta(days=1)).isoformat()
            booking = dict(centreId="mandi-a", cropId=crop["id"], day=day, slotId="s1")
            self.assertEqual(c.post("/api/bookings/me", headers=b, json=booking).status_code, 404)
            self.assertEqual(c.post("/api/bookings/me", headers=a, json=booking).status_code, 200)
            self.assertIsNone(c.get("/api/bookings/me", headers=b).json())
            note = c.get("/api/notifications", headers=a).json()[0]
            self.assertEqual(c.post(f'/api/notifications/{note["id"]}/read', headers=b).status_code, 404)
            report = c.post("/api/recovery", headers=a, json=dict(requestId=str(uuid4()), reason="road", arrival=f"{day}T11:00:00+05:30")).json()
            self.assertEqual(c.get(f'/api/recovery/{report["id"]}/options', headers=b).status_code, 404)
            self.assertEqual(c.post(f'/api/recovery/{report["id"]}/apply', headers=b, json={"optionId":"keep"}).status_code, 404)
            self.assertNotEqual(c.get("/api/farmers/me", headers=a).json()["id"], c.get("/api/farmers/me", headers=b).json()["id"])
            self.assertEqual(c.post("/api/queues/mandi-a/call-next", headers=a).status_code, 403)
            self.assertEqual(c.post("/api/auth/logout", headers=a).status_code, 200)
            self.assertEqual(c.get("/api/auth/me", headers=a).status_code, 401)
            with connection() as db:
                db.execute("UPDATE sessions SET expires_at = ?", (time.time() - 1,))
            self.assertEqual(c.get("/api/auth/me", headers=b).status_code, 401)

    def test_operator_scope_and_login_lockout(self):
        with TestClient(app) as c:
            with connection() as db:
                create_account(db, "operator-a", "operator-password-123", "Operator", "operator", "mandi-a")
            response = c.post("/api/auth/login", json=dict(username="operator-a", password="operator-password-123"))
            self.assertEqual(response.status_code, 200)
            self.assertEqual(c.post('/api/auth/login', json=dict(username='operator-a',password='operator-password-123',portal='farmer')).status_code,403)
            self.assertEqual(c.post('/api/auth/login', json=dict(username='operator-a',password='operator-password-123',portal='staff')).status_code,200)
            headers = {"Authorization": f'Bearer {response.json()["token"]}'}
            self.assertEqual(c.get("/api/queues/mandi-a", headers=headers).status_code, 200)
            self.assertEqual(c.get("/api/queues/mandi-b", headers=headers).status_code, 403)
            self.assertEqual(c.post("/api/queues/mandi-b/call-next", headers=headers).status_code, 403)
            self.assertEqual(c.get("/api/farmers/me", headers=headers).status_code, 403)
            for _ in range(5):
                self.assertEqual(c.post("/api/auth/login", json=dict(username="operator-a", password="wrong-password-123")).status_code, 401)
            self.assertEqual(c.post("/api/auth/login", json=dict(username="operator-a", password="operator-password-123")).status_code, 429)
