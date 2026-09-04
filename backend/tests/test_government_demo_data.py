import os
import tempfile
import unittest
from datetime import datetime
from unittest.mock import patch

from app.auth import identity
from app.database import connection, initialize
from app.government_demo_data import GOVERNMENT_DASHBOARD_DEMO, seed_government_dashboard_demo
from app.operations import mandi_rows, metrics
from app.scheduling import IST


class GovernmentDemoDataTests(unittest.TestCase):
    def test_showcase_values_are_database_backed_and_idempotent(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ, {"KISANSETU_DB_PATH": os.path.join(directory, "demo.sqlite3")}):
                initialize()
                with connection() as db:
                    seed_government_dashboard_demo(db)
                    seed_government_dashboard_demo(db)
                token = identity.set({"id": "test-government", "role": "government", "centreId": None})
                try:
                    today = datetime.now(IST).date()
                    with connection() as db:
                        dashboard_metrics = metrics(db, today)
                        lucknow = next(row for row in mandi_rows(db, today) if row["id"] == "lucknow-mandi")
                finally:
                    identity.reset(token)

                self.assertEqual(dashboard_metrics["scheduledToday"], GOVERNMENT_DASHBOARD_DEMO["today_farmers"])
                self.assertEqual(dashboard_metrics["waiting"], GOVERNMENT_DASHBOARD_DEMO["waiting_farmers"])
                self.assertEqual(dashboard_metrics["averageWaitingMin"], GOVERNMENT_DASHBOARD_DEMO["average_waiting_minutes"])
                self.assertEqual(lucknow["name"], "Lucknow Mandi")
                self.assertEqual(lucknow["availableSlots"], GOVERNMENT_DASHBOARD_DEMO["available_slots"])


if __name__ == "__main__":
    unittest.main()
