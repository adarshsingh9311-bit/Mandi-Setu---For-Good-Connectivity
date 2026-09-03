"""Authenticated fixtures for the pre-authentication domain regression tests."""
from fastapi.testclient import TestClient
from app.auth import new_session
from app.database import connection, DEMO_FARMER_ID
from app.store import list_centres


class AuthenticatedClient(TestClient):
    def __enter__(self):
        super().__enter__()
        self.operator_tokens = {}
        with connection() as db:
            db.execute("INSERT OR IGNORE INTO accounts VALUES (?, 'fixture-farmer', 'unused', 'farmer', NULL)", (DEMO_FARMER_ID,))
            self.farmer_token = new_session(db, DEMO_FARMER_ID)
            for centre in list_centres():
                account_id = f"operator-{centre.id}"
                db.execute("INSERT OR IGNORE INTO farmers VALUES (?, '{}')", (account_id,))
                db.execute("INSERT OR IGNORE INTO accounts VALUES (?, ?, 'unused', 'operator', ?)", (account_id, account_id, centre.id))
                self.operator_tokens[centre.id] = new_session(db, account_id)
        return self

    def request(self, method, url, **kwargs):
        path = str(url).split("?")[0].rstrip("/")
        token = self.farmer_token
        if path.startswith("/api/queues/") and path != "/api/queues/me" and not path.endswith("/join"):
            token = self.operator_tokens.get(path.split("/")[3], self.operator_tokens["mandi-a"])
        kwargs["headers"] = {**(kwargs.get("headers") or {}), "Authorization": f"Bearer {token}"}
        return super().request(method, url, **kwargs)
