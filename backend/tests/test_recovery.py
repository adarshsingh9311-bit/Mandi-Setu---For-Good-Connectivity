import json
import os
import tempfile
import unittest
from datetime import datetime, timedelta
from uuid import uuid4
from unittest.mock import patch
from support import AuthenticatedClient as TestClient
from app.main import app
from app.database import connection
from app.routers.bookings import IST


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {"KISANSETU_DB_PATH": os.path.join(self.temp.name, "test.sqlite3")})
        self.env.start()
        self.day = (datetime.now(IST).date() + timedelta(days=1)).isoformat()
        self.booking = dict(centreId="mandi-a", cropId="crop-1", day=self.day, slotId="s1")
        self.delay = dict(requestId=str(uuid4()), reason="vehicle", arrival=f"{self.day}T11:30:00+05:30")

    def tearDown(self):
        self.env.stop()
        self.temp.cleanup()

    def test_recovery_retry_persistence_and_read_state(self):
        with TestClient(app) as c:
            c.post("/api/bookings/me", json=self.booking)
            c.post("/api/bookings/me", json=self.booking)
            self.assertEqual(len(c.get("/api/notifications").json()), 1)
            report = c.post("/api/recovery", json=self.delay).json()
            self.assertEqual(c.post("/api/recovery", json=self.delay).json(), report)
            options = c.get(f'/api/recovery/{report["id"]}/options').json()
            option = next(o for o in options if o["id"] != "keep")
            self.assertEqual(option["booking"]["slotId"], "s3")
            url = f'/api/recovery/{report["id"]}/apply'
            response = c.post(url, json={"optionId": option["id"]})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(c.post(url, json={"optionId": option["id"]}).json(), response.json())
            self.assertEqual(c.post(url, json={"optionId": "keep"}).status_code, 409)
            notes = c.get("/api/notifications").json()
            self.assertEqual(len(notes), 4)
            self.assertEqual(c.post(f'/api/notifications/{notes[0]["id"]}/read').status_code, 200)
        with TestClient(app) as c:
            self.assertTrue(c.get("/api/notifications").json()[0]["read"])
            self.assertIsNotNone(c.get("/api/recovery").json()[0]["resolution"])
            self.assertEqual(c.get("/api/bookings/me").json()["slotId"], "s3")
            c.post("/api/notifications/read-all")
            self.assertTrue(all(n["read"] for n in c.get("/api/notifications").json()))
            self.assertEqual(c.post("/api/notifications/99999/read").status_code, 404)

    def test_full_option_and_changed_booking_preserve_reservation(self):
        with TestClient(app) as c:
            old = c.post("/api/bookings/me", json=self.booking).json()
            report = c.post("/api/recovery", json=self.delay).json()
            url = f'/api/recovery/{report["id"]}'
            option = next(o for o in c.get(url + "/options").json() if o["id"] != "keep")
            with connection() as db:
                for i in range(3):
                    db.execute("INSERT INTO farmers VALUES (?, '{}')", (f"other-{i}",))
                    db.execute("INSERT INTO crops VALUES (?, ?, '{}')", (f"c-{i}", f"other-{i}"))
                    db.execute("INSERT INTO bookings VALUES (?, ?, 'mandi-a', ?, 's3')", (f"other-{i}", f"c-{i}", self.day))
            self.assertEqual(c.post(url + "/apply", json={"optionId": option["id"]}).status_code, 409)
            self.assertEqual(c.get("/api/bookings/me").json(), old)
            self.assertIsNone(c.get("/api/recovery").json()[0]["resolution"])
            c.post("/api/bookings/me", json={**self.booking, "slotId": "s2"})
            self.assertEqual(c.post(url + "/apply", json={"optionId": "keep"}).status_code, 409)
            self.assertEqual(c.get("/api/bookings/me").json()["slotId"], "s2")

    def test_validation_and_keep(self):
        with TestClient(app) as c:
            self.assertEqual(c.post("/api/recovery", json=self.delay).status_code, 409)
            c.post("/api/bookings/me", json=self.booking)
            self.assertEqual(c.post("/api/recovery", json={**self.delay, "arrival": "2020-01-01T11:00:00+05:30"}).status_code, 422)
            self.assertEqual(c.post("/api/recovery", json={**self.delay, "arrival": f"{self.day}T11:00:00"}).status_code, 422)
            self.assertEqual(c.post("/api/recovery", json={**self.delay, "reason": "invalid"}).status_code, 422)
            r = c.post("/api/recovery", json=self.delay).json()
            self.assertEqual(c.post("/api/recovery", json={**self.delay, "reason": "road"}).status_code, 409)
            self.assertEqual(c.post(f'/api/recovery/{r["id"]}/apply', json={"optionId": "keep"}).status_code, 200)
            self.assertEqual(c.get("/api/bookings/me").json()["slotId"], "s1")
