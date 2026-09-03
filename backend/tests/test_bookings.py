import json
import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from unittest.mock import patch
from support import AuthenticatedClient as TestClient
from app.main import app
from app.database import connection
from app.routers.bookings import IST


class BookingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {"KISANSETU_DB_PATH": os.path.join(self.temp.name, "book.sqlite3")})
        self.env.start()
        self.day = (datetime.now(IST).date() + timedelta(days=1)).isoformat()
        self.payload = dict(centreId="mandi-a", cropId="crop-1", day=self.day, slotId="s1")

    def tearDown(self):
        self.env.stop()
        self.temp.cleanup()

    def test_persistence_rebooking_and_cancel(self):
        with TestClient(app) as c:
            self.assertIsNone(c.get("/api/bookings/me").json())
            r = c.post("/api/bookings/me", json=self.payload)
            self.assertEqual(r.status_code, 200)
            saved = r.json()
            self.assertEqual(c.post("/api/bookings/me", json=self.payload).json(), saved)
        with TestClient(app) as c:
            self.assertEqual(c.get("/api/bookings/me").json(), saved)
            self.assertEqual(c.post("/api/bookings/me", json={**self.payload, "cropId": "crop-2", "slotId": "s2"}).status_code, 200)
            crops = {x["id"]: x for x in c.get("/api/farmers/me/crops").json()}
            self.assertEqual(crops["crop-1"]["status"], "Not Scheduled")
            self.assertEqual(crops["crop-2"]["status"], "Slot Confirmed")
            self.assertEqual(c.delete("/api/bookings/me").status_code, 200)
            self.assertEqual(c.delete("/api/bookings/me").status_code, 200)
            self.assertIsNone(c.get("/api/bookings/me").json())

    def test_full_slot_preserves_old_booking(self):
        with TestClient(app) as c:
            saved = c.post("/api/bookings/me", json=self.payload).json()
            with connection() as db:
                for i in range(3):
                    db.execute("INSERT INTO farmers VALUES (?, '{}')", (f"other-{i}",))
                    db.execute("INSERT INTO crops VALUES (?, ?, ?)", (f"other-crop-{i}", f"other-{i}", json.dumps({"status": "Slot Confirmed"})))
                    db.execute("INSERT INTO bookings VALUES (?, ?, 'mandi-a', ?, 's2')", (f"other-{i}", f"other-crop-{i}", self.day))
            self.assertEqual(c.post("/api/bookings/me", json={**self.payload, "slotId": "s2"}).status_code, 409)
            self.assertEqual(c.get("/api/bookings/me").json(), saved)
            slots = c.get(f"/api/bookings/slots/mandi-a?day={self.day}").json()
            self.assertFalse(slots[1]["available"])

    def test_validation_and_concurrent_duplicates(self):
        with TestClient(app) as c:
            for change, status in [(dict(cropId="missing"), 404), (dict(centreId="missing"), 404),
                                   (dict(cropId="crop-2", centreId="mandi-b"), 422),
                                   (dict(slotId="invalid"), 422), (dict(day="2020-01-01"), 422),
                                   (dict(day=(datetime.now(IST).date() + timedelta(days=31)).isoformat()), 422)]:
                self.assertEqual(c.post("/api/bookings/me", json={**self.payload, **change}).status_code, status)
            with ThreadPoolExecutor(max_workers=4) as pool:
                responses = list(pool.map(lambda _: c.post("/api/bookings/me", json=self.payload), range(8)))
            self.assertTrue(all(r.status_code == 200 for r in responses))
            with connection() as db:
                self.assertEqual(db.execute("SELECT COUNT(*) FROM bookings").fetchone()[0], 1)
