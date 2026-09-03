import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

from support import AuthenticatedClient as TestClient
from app.main import app
from app.database import connection


class QueueTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {"KISANSETU_DB_PATH": os.path.join(self.temp.name, "queue.sqlite3")})
        self.env.start()

    def tearDown(self):
        self.env.stop()
        self.temp.cleanup()

    def test_join_refresh_restart_and_stages(self):
        with TestClient(app) as c:
            self.assertIsNone(c.get("/api/queues/me").json())
            self.assertEqual(c.post("/api/queues/missing/join").status_code, 404)
            token = c.post("/api/queues/mandi-a/join").json()
            self.assertEqual(c.post("/api/queues/mandi-a/join").json(), token)
            self.assertEqual(c.post("/api/queues/mandi-b/join").status_code, 409)
            for _ in range(3):
                self.assertEqual(c.get("/api/queues/me").json(), token)
        with TestClient(app) as c:
            self.assertEqual(c.get("/api/queues/me").json(), token)
            called = c.post("/api/queues/mandi-a/call-next").json()
            self.assertEqual(called["stage"], "grading")
            url = f'/api/queues/mandi-a/tokens/{token["id"]}/advance'
            self.assertEqual(c.post(url, json={"expectedStage": "grading"}).json()["stage"], "weighing")
            self.assertEqual(c.post(url, json={"expectedStage": "grading"}).status_code, 409)
            self.assertEqual(c.post(url, json={"expectedStage": "weighing"}).json()["stage"], "completed")
            self.assertEqual(c.post(url, json={"expectedStage": "weighing"}).status_code, 409)
            self.assertEqual(c.post("/api/queues/mandi-a/call-next").status_code, 409)
            self.assertGreater(c.post("/api/queues/mandi-b/join").json()["id"], token["id"])

    def test_fifo_capacity_and_centre_isolation(self):
        with TestClient(app) as c:
            with connection() as db:
                for i in range(4):
                    db.execute("INSERT INTO farmers VALUES (?, '{}')", (f"test-{i}",))
                    db.execute("INSERT INTO queue_tokens (farmer_id, centre_id, updated_at) VALUES (?, 'mandi-a', '2026-09-03T00:00:00+00:00')", (f"test-{i}",))
            token = c.post("/api/queues/mandi-a/join").json()
            self.assertEqual(token["farmersAhead"], 4)
            for i in range(3):
                self.assertEqual(c.post("/api/queues/mandi-a/call-next").json()["id"], i + 1)
            self.assertEqual(c.post("/api/queues/mandi-a/call-next").status_code, 409)
            self.assertEqual(c.get("/api/queues/mandi-b").json()["tokens"], [])
            self.assertEqual(c.post("/api/queues/mandi-b/tokens/1/advance", json={"expectedStage": "grading"}).status_code, 404)
            for stage in ["grading", "weighing"]:
                c.post("/api/queues/mandi-a/tokens/1/advance", json={"expectedStage": stage})
            self.assertEqual(c.get("/api/queues/me").json()["farmersAhead"], 3)
            self.assertEqual(c.post("/api/queues/mandi-a/call-next").json()["id"], 4)

    def test_concurrent_join_issues_one_token(self):
        with TestClient(app) as c:
            with ThreadPoolExecutor(max_workers=4) as pool:
                responses = list(pool.map(lambda _: c.post("/api/queues/mandi-a/join"), range(8)))
            self.assertTrue(all(r.status_code == 200 for r in responses))
            self.assertEqual(len({r.json()["id"] for r in responses}), 1)
            self.assertEqual(c.get("/api/queues/mandi-a").json()["waiting"], 1)
