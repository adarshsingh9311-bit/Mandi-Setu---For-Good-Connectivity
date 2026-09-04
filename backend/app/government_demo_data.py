"""Editable SIH Government Dashboard showcase data stored in the shared database."""

import json
import secrets
from datetime import datetime, timedelta

from .auth import hash_password
from .scheduling import IST


GOVERNMENT_DASHBOARD_DEMO = {
    "mandi": {
        "id": "lucknow-mandi",
        "name": "Lucknow Mandi",
        "district": "Lucknow",
        "state": "Uttar Pradesh",
        "latitude": 26.8467,
        "longitude": 80.9462,
        "capacity": 128,
        "active_counters": 4,
        "processing_minutes": 8,
        "crops": ["Wheat", "Paddy", "Gram", "Mustard"],
    },
    "today_farmers": 128,
    "waiting_farmers": 34,
    "average_waiting_minutes": 135,
    "available_slots": 18,
}


def seed_government_dashboard_demo(db) -> None:
    """Upsert the configured showcase without replacing non-demo farmer records."""
    demo = GOVERNMENT_DASHBOARD_DEMO
    mandi = demo["mandi"]
    now = datetime.now(IST).replace(microsecond=0)
    today = now.date().isoformat()
    centre_payload = {
        "id": mandi["id"],
        "name": mandi["name"],
        "district": mandi["district"],
        "state": mandi["state"],
        "distanceKm": 0,
        "crops": mandi["crops"],
        "capacityPerDay": mandi["capacity"],
        "farmersWaiting": demo["waiting_farmers"],
        "activeCounters": mandi["active_counters"],
        "processingRatePerHour": round(mandi["active_counters"] * 60 / mandi["processing_minutes"]),
        "avgProcessingMin": mandi["processing_minutes"],
        "loadPercent": round(100 * demo["waiting_farmers"] / mandi["capacity"], 1),
        "estimatedWaitMin": demo["average_waiting_minutes"],
        "status": "normal",
        "lat": mandi["latitude"],
        "lng": mandi["longitude"],
    }
    db.execute(
        "INSERT INTO mandis (id,payload) VALUES (?,?) ON CONFLICT (id) DO UPDATE SET payload=excluded.payload",
        (mandi["id"], json.dumps(centre_payload)),
    )
    db.execute(
        """INSERT INTO mandi_config VALUES (?,?,?,?,0) ON CONFLICT (centre_id) DO UPDATE SET
        capacity=excluded.capacity,processing_min=excluded.processing_min,counters=excluded.counters,closed=0""",
        (mandi["id"], mandi["capacity"], mandi["processing_minutes"], mandi["active_counters"]),
    )

    # One late-day showcase slot keeps the displayed remaining capacity stable all day.
    for slot_id, starts, ends, capacity, enabled in (
        ("s1", "10:00", "11:00", 0, 0),
        ("s2", "11:00", "12:00", 0, 0),
        ("s3", "12:00", "13:00", 0, 0),
        ("demo-available", "23:00", "23:59", demo["available_slots"], 1),
    ):
        db.execute(
            """INSERT INTO managed_slots VALUES (?,?,?,?,?,?,?) ON CONFLICT (centre_id,day,slot_id)
            DO UPDATE SET starts=excluded.starts,ends=excluded.ends,capacity=excluded.capacity,enabled=excluded.enabled""",
            (mandi["id"], today, slot_id, starts, ends, capacity, enabled),
        )

    password_hash = hash_password(secrets.token_urlsafe(48))
    for index in range(1, demo["today_farmers"] + 1):
        farmer_id = f"KS-SIH-LKO-{index:03d}"
        username = f"sih-lucknow-{index:03d}"
        profile = {
            "id": farmer_id,
            "name": f"Lucknow Demo Farmer {index:03d}",
            "village": "Lucknow",
            "district": "Lucknow",
            "state": "Uttar Pradesh",
            "mobile": "",
            "language": "hi",
            "transport": "Tractor Trolley",
            "history": [],
        }
        db.execute(
            "INSERT INTO farmers (id,payload) VALUES (?,?) ON CONFLICT (id) DO UPDATE SET payload=excluded.payload",
            (farmer_id, json.dumps(profile)),
        )
        db.execute(
            """INSERT INTO accounts (id,username,password_hash,role,centre_id) VALUES (?,?,?,'farmer',NULL)
            ON CONFLICT (id) DO UPDATE SET username=excluded.username,password_hash=excluded.password_hash,role='farmer',centre_id=NULL""",
            (farmer_id, username, password_hash),
        )
        crop_id = f"sih-lucknow-crop-{index:03d}"
        crop = {
            "id": crop_id,
            "type": "Wheat",
            "quantity": 20 + index % 30,
            "unit": "Quintals",
            "expectedDate": today,
            "preferredCentreId": mandi["id"],
            "transportAvailable": True,
            "language": "hi",
            "status": "Slot Confirmed",
        }
        db.execute(
            "INSERT INTO crops (id,farmer_id,payload) VALUES (?,?,?) ON CONFLICT (id) DO UPDATE SET farmer_id=excluded.farmer_id,payload=excluded.payload",
            (crop_id, farmer_id, json.dumps(crop)),
        )

        status = "Waiting" if index <= demo["waiting_farmers"] else "Booked"
        arrived = (now - timedelta(minutes=20 + index)).isoformat() if status == "Waiting" else None
        started = completed = None
        if index == demo["today_farmers"]:
            status = "Completed"
            started = (now - timedelta(minutes=10)).isoformat()
            arrived = (now - timedelta(minutes=10 + demo["average_waiting_minutes"])).isoformat()
            completed = now.isoformat()

        db.execute("UPDATE visits SET token_id=NULL WHERE id=?", (f"sih-lucknow-visit-{index:03d}",))
        db.execute("DELETE FROM queue_tokens WHERE farmer_id=?", (farmer_id,))
        token_id = None
        if status == "Waiting":
            token_id = db.execute(
                "INSERT INTO queue_tokens (farmer_id,centre_id,stage,updated_at) VALUES (?,?,'queue',?)",
                (farmer_id, mandi["id"], now.isoformat()),
            ).lastrowid
        db.execute(
            """INSERT INTO visits
            (id,farmer_id,centre_id,crop_id,crop_type,quantity_quintals,booking_day,slot_id,slot_label,status,
             booked_at,arrived_at,started_at,completed_at,token_id,actual_quantity_quintals)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT (id) DO UPDATE SET
            farmer_id=excluded.farmer_id,centre_id=excluded.centre_id,crop_id=excluded.crop_id,
            crop_type=excluded.crop_type,quantity_quintals=excluded.quantity_quintals,
            booking_day=excluded.booking_day,slot_id=excluded.slot_id,slot_label=excluded.slot_label,
            status=excluded.status,booked_at=excluded.booked_at,arrived_at=excluded.arrived_at,
            started_at=excluded.started_at,completed_at=excluded.completed_at,token_id=excluded.token_id,
            actual_quantity_quintals=excluded.actual_quantity_quintals""",
            (f"sih-lucknow-visit-{index:03d}", farmer_id, mandi["id"], crop_id, "Wheat",
             crop["quantity"], today, "demo-available", "11:00 PM – 11:59 PM", status,
             now.isoformat(), arrived, started, completed, token_id,
             crop["quantity"] if status == "Completed" else None),
        )
