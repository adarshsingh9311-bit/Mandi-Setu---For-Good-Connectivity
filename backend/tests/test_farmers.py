import os
import tempfile
import unittest
from unittest.mock import patch

from support import AuthenticatedClient as TestClient
from app.main import app


class FarmerApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {"KISANSETU_DB_PATH": os.path.join(self.temp.name, "test.sqlite3")})
        self.env.start()
        self.payload = dict(type="Wheat", quantity=20, unit="Quintals", expectedDate="2026-10-10",
                            preferredCentreId="mandi-a", transportAvailable=True, language="hi")

    def tearDown(self):
        self.env.stop()
        self.temp.cleanup()

    def test_registration_survives_restart_without_duplicate_seeds(self):
        with TestClient(app) as client:
            self.assertEqual(client.get("/health").json()["step"], 7)
            self.assertEqual(client.get("/api/farmers/me").json()["id"], "KS-UP-23180")
            before = client.get("/api/farmers/me/crops").json()
            response = client.post("/api/farmers/me/crops", json=self.payload)
            self.assertEqual(response.status_code, 201)
            saved = response.json()
            self.assertEqual(saved["status"], "Not Scheduled")
            self.assertEqual(saved["language"], "hi")
        with TestClient(app) as restarted:
            crops = restarted.get("/api/farmers/me/crops").json()
            self.assertEqual(len(crops), len(before) + 1)
            self.assertIn(saved, crops)
            self.assertEqual(restarted.get("/api/centres").status_code, 200)

    def test_invalid_registration_does_not_write(self):
        with TestClient(app) as client:
            before = client.get("/api/farmers/me/crops").json()
            for invalid in [dict(quantity=0), dict(quantity=-1), dict(expectedDate="not-a-date"),
                            dict(unit="Bags"), dict(preferredCentreId="missing"),
                            dict(type="Paddy", preferredCentreId="mandi-a"), dict(language="xx"),
                            dict(status="Slot Confirmed")]:
                with self.subTest(invalid=invalid):
                    response = client.post("/api/farmers/me/crops", json={**self.payload, **invalid})
                    self.assertEqual(response.status_code, 422)
            self.assertEqual(client.get("/api/farmers/me/crops").json(), before)


if __name__ == "__main__":
    unittest.main()
