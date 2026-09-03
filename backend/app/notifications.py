from datetime import datetime, timezone


def notify(db, farmer_id, kind, title, body):
    db.execute("INSERT INTO notifications (farmer_id, kind, title, body, created_at) VALUES (?, ?, ?, ?, ?)",
               (farmer_id, kind, title, body, datetime.now(timezone.utc).isoformat()))
    from .communications import record_sms
    record_sms(db, farmer_id, kind, f"MandiSetu: {title}. {body}")
