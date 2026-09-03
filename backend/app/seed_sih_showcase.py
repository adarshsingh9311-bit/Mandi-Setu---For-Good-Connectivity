"""Add a repeatable, clearly labelled SIH showcase dataset to the local database."""

import json
import secrets
from datetime import datetime, timedelta

from .auth import create_account
from .database import connection, initialize
from .scheduling import IST


FARMERS = [
    ("sih-farmer-01", "Sunita Devi", "Sisauli", "Meerut", "Wheat", 42, "mandi-a", "Waiting"),
    ("sih-farmer-02", "Ramesh Pal", "Daurala", "Meerut", "Paddy", 36, "mandi-a", "Waiting"),
    ("sih-farmer-03", "Asha Rani", "Mawana", "Meerut", "Mustard", 18, "mandi-a", "Quality Check"),
    ("sih-farmer-04", "Mohit Kumar", "Sardhana", "Meerut", "Gram", 24, "mandi-b", "Procurement"),
    ("sih-farmer-05", "Geeta Singh", "Baraut", "Baghpat", "Wheat", 51, "mandi-d", "Completed"),
    ("sih-farmer-06", "Imran Khan", "Pilkhuwa", "Hapur", "Paddy", 47, "mandi-e", "Completed"),
    ("sih-farmer-07", "Kavita Sharma", "Kharkhoda", "Meerut", "Sugarcane", 70, "mandi-c", "Missed"),
    ("sih-farmer-08", "Vijay Yadav", "Modinagar", "Meerut", "Wheat", 33, "mandi-b", "Booked"),
    ("sih-farmer-09", "Neelam Chauhan", "Kithore", "Meerut", "Paddy", 29, "mandi-c", "Booked"),
    ("sih-farmer-10", "Harish Tyagi", "Hapur", "Hapur", "Mustard", 22, "mandi-e", "Booked"),
]


def seed() -> None:
    initialize()
    now = datetime.now(IST).replace(microsecond=0)
    today = now.date().isoformat()
    future_day = (now.date() + timedelta(days=1)).isoformat()
    with connection() as db:
        demo_officer = db.execute("SELECT id FROM accounts WHERE username='sih-officer'").fetchone()
        if not demo_officer:
            create_account(db, "sih-officer", secrets.token_urlsafe(48), "SIH Demo Officer", "government")
        for index, (username, name, village, district, crop, quantity, centre, status) in enumerate(FARMERS, 1):
            account = db.execute("SELECT id FROM accounts WHERE username=?", (username,)).fetchone()
            if account:
                farmer_id = account["id"]
            else:
                created = create_account(db, username, secrets.token_urlsafe(32), name)
                farmer_id = created["id"]
            profile = {
                "id": farmer_id,
                "name": name,
                "village": village,
                "district": district,
                "state": "Uttar Pradesh",
                "mobile": f"+91 90000 {10000 + index}",
                "language": "hi",
                "transport": "Tractor Trolley",
                "history": [],
            }
            db.execute("UPDATE farmers SET payload=? WHERE id=?", (json.dumps(profile), farmer_id))
            crop_id = f"sih-crop-{index:02d}"
            crop_payload = {
                "id": crop_id,
                "type": crop,
                "quantity": quantity,
                "unit": "Quintals",
                "expectedDate": future_day,
                "preferredCentreId": centre,
                "transportAvailable": True,
                "language": "hi",
                "status": "Slot Confirmed" if status == "Booked" else "Not Scheduled",
            }
            db.execute(
                "INSERT OR REPLACE INTO crops (id,farmer_id,payload) VALUES (?,?,?)",
                (crop_id, farmer_id, json.dumps(crop_payload)),
            )
            visit_id = f"sih-visit-{index:02d}"
            token_id = None
            arrived = started = completed = None
            if status in ("Waiting", "Quality Check", "Procurement"):
                token = db.execute("SELECT id FROM queue_tokens WHERE farmer_id=? AND stage!='completed'", (farmer_id,)).fetchone()
                stage = {"Waiting": "queue", "Quality Check": "grading", "Procurement": "weighing"}[status]
                if token:
                    token_id = token["id"]
                    db.execute("UPDATE queue_tokens SET centre_id=?,stage=?,updated_at=? WHERE id=?", (centre, stage, now.isoformat(), token_id))
                else:
                    token_id = db.execute(
                        "INSERT INTO queue_tokens (farmer_id,centre_id,stage,updated_at) VALUES (?,?,?,?)",
                        (farmer_id, centre, stage, now.isoformat()),
                    ).lastrowid
                arrived = (now - timedelta(minutes=55 - index * 3)).isoformat()
                if status in ("Quality Check", "Procurement"):
                    started = (now - timedelta(minutes=22 - index)).isoformat()
            elif status == "Completed":
                arrived = (now - timedelta(minutes=40 - index)).isoformat()
                started = (now - timedelta(minutes=28 - index)).isoformat()
                completed = (now - timedelta(minutes=12 - index)).isoformat()
            booking_day = future_day if status == "Booked" else today
            db.execute(
                """INSERT OR REPLACE INTO visits
                (id,farmer_id,centre_id,crop_id,crop_type,quantity_quintals,booking_day,slot_id,slot_label,status,
                 booked_at,arrived_at,started_at,completed_at,token_id,actual_quantity_quintals)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (visit_id, farmer_id, centre, crop_id, crop, quantity, booking_day, "s1", "10:00 AM – 11:00 AM",
                 status, (now - timedelta(days=1)).isoformat(), arrived, started, completed, token_id,
                 quantity - 1 if status == "Completed" else None),
            )
            if status == "Booked":
                db.execute("INSERT OR REPLACE INTO bookings VALUES (?,?,?,?,?)", (farmer_id, crop_id, centre, future_day, "s1"))
            else:
                db.execute("DELETE FROM bookings WHERE farmer_id=?", (farmer_id,))
            if not db.execute(
                "SELECT 1 FROM notifications WHERE farmer_id=? AND title='SIH showcase status'", (farmer_id,)
            ).fetchone():
                db.execute(
                    "INSERT INTO notifications (farmer_id,kind,title,body,created_at) VALUES (?,?,?,?,?)",
                    (farmer_id, "centre", "SIH showcase status", f"Your procurement visit is currently {status}.", now.isoformat()),
                )

        db.execute("INSERT OR REPLACE INTO mandi_overrides VALUES ('mandi-a',1)")
        if not db.execute("SELECT 1 FROM operational_events WHERE message LIKE 'SIH showcase:%'").fetchone():
            db.execute(
                """INSERT INTO operational_events
                (centre_id,visit_id,actor_id,kind,message,created_at)
                VALUES ('mandi-a',NULL,NULL,'mandi','SIH showcase: overload detected; alternate centres recommended',?)""",
                (now.isoformat(),),
            )
        db.execute(
            """INSERT OR IGNORE INTO communication_events
            (id,farmer_id,channel,event_type,recipient,message,provider,status,created_at)
            VALUES ('sih-sms-showcase',NULL,'sms','overload_alert','SIH demo recipients',
            'MandiSetu demo: Mandi A is overloaded. Mandi B is available as an alternative.',
            'demo','simulated_not_delivered',?)""",
            (now.isoformat(),),
        )
    print("SIH showcase data is ready: 10 farmers, live queue, completed procurement, missed slot, bookings and overload alert.")


if __name__ == "__main__":
    seed()
