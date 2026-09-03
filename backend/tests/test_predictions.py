import os
import tempfile
import unittest
from unittest.mock import patch
from support import AuthenticatedClient as TestClient
from app.main import app
from app.database import connection
from app.predictions import estimate


class PredictionTests(unittest.TestCase):
    def test_counter_batches_and_unavailable(self):
        self.assertEqual(estimate(0, 0, 3, 7).predictedMin, 0)
        self.assertEqual(estimate(2, 0, 3, 7).predictedMin, 0)
        self.assertEqual(estimate(3, 0, 3, 7).predictedMin, 7)
        self.assertEqual(estimate(0, 3, 3, 7).predictedMin, 7)
        self.assertEqual(estimate(6, 3, 3, 7).predictedMin, 21)
        self.assertIsNone(estimate(2, 1, 0, 7).predictedMin)
        self.assertLessEqual(estimate(9, 2, 4, 7).predictedMin, estimate(9, 2, 2, 7).predictedMin)

    def test_live_counts_isolation_and_token_estimate(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {"KISANSETU_DB_PATH": os.path.join(tmp, "test.sqlite3")}):
            with TestClient(app) as c:
                self.assertEqual(c.get("/api/predictions/centres/missing").status_code, 404)
                self.assertEqual(c.get("/api/predictions/centres/mandi-a").json()["predictedMin"], 0)
                with connection() as db:
                    for i in range(3):
                        db.execute("INSERT INTO farmers VALUES (?, '{}')", (f"other-{i}",))
                        db.execute("INSERT INTO queue_tokens (farmer_id, centre_id, updated_at) VALUES (?, 'mandi-a', '2026-09-03T00:00:00+00:00')", (f"other-{i}",))
                token = c.post("/api/queues/mandi-a/join").json()
                self.assertEqual(token["estimatedWaitMin"], 7)
                self.assertEqual(token["prediction"]["predictedMin"], 7)
                for _ in range(3):
                    c.post("/api/queues/mandi-a/call-next")
                before = c.get("/api/queues/me").json()
                self.assertEqual(before["estimatedWaitMin"], 7)
                for stage in ["grading", "weighing"]:
                    c.post("/api/queues/mandi-a/tokens/1/advance", json={"expectedStage": stage})
                after = c.get("/api/queues/me").json()
                self.assertEqual(after["estimatedWaitMin"], 0)
                self.assertEqual(after, c.get("/api/queues/me").json())
                self.assertEqual(c.get("/api/predictions/centres/mandi-b").json()["predictedMin"], 0)
                c.post("/api/queues/mandi-a/call-next")
                self.assertEqual(c.get("/api/queues/me").json()["estimatedWaitMin"], 0)
                self.assertNotIn("confidence", after["prediction"])
