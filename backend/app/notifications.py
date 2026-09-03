from datetime import datetime, timezone


def notify(db, farmer_id, kind, title, body):
    db.execute("INSERT INTO notifications (farmer_id, kind, title, body, created_at) VALUES (?, ?, ?, ?, ?)",
               (farmer_id, kind, title, body, datetime.now(timezone.utc).isoformat()))
