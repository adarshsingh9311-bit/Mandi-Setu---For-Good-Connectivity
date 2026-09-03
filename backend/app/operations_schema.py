"""Additive operational schema. Existing farmer tables and API contracts remain valid."""
import json
from uuid import uuid4


def migrate(db):
    db.execute("CREATE TABLE IF NOT EXISTS account_roles (account_id TEXT PRIMARY KEY REFERENCES accounts(id), role TEXT NOT NULL CHECK(role IN ('government', 'super_admin')))")
    db.execute("CREATE TABLE IF NOT EXISTS mandi_config (centre_id TEXT PRIMARY KEY, capacity INTEGER NOT NULL CHECK(capacity > 0), processing_min INTEGER NOT NULL CHECK(processing_min > 0), counters INTEGER NOT NULL CHECK(counters >= 0), closed INTEGER NOT NULL DEFAULT 0)")
    db.execute("CREATE TABLE IF NOT EXISTS operational_settings (id INTEGER PRIMARY KEY CHECK(id=1), busy_percent REAL NOT NULL, overloaded_percent REAL NOT NULL)")
    db.execute("INSERT OR IGNORE INTO operational_settings VALUES (1, 60, 80)")
    db.execute("""CREATE TABLE IF NOT EXISTS managed_slots (
        centre_id TEXT NOT NULL, day TEXT NOT NULL, slot_id TEXT NOT NULL,
        starts TEXT NOT NULL, ends TEXT NOT NULL, capacity INTEGER NOT NULL CHECK(capacity >= 0),
        enabled INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(centre_id, day, slot_id)
    )""")
    db.execute("""CREATE TABLE IF NOT EXISTS visits (
        id TEXT PRIMARY KEY, farmer_id TEXT NOT NULL REFERENCES farmers(id), centre_id TEXT NOT NULL,
        crop_id TEXT, crop_type TEXT, quantity_quintals REAL, booking_day TEXT, slot_id TEXT, slot_label TEXT,
        status TEXT NOT NULL, booked_at TEXT, arrived_at TEXT, started_at TEXT, completed_at TEXT,
        token_id INTEGER UNIQUE REFERENCES queue_tokens(id), actual_quantity_quintals REAL
    )""")
    db.execute("CREATE INDEX IF NOT EXISTS visits_centre_day ON visits(centre_id, booking_day)")
    db.execute("""CREATE TABLE IF NOT EXISTS operational_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT, centre_id TEXT NOT NULL, visit_id TEXT, actor_id TEXT,
        kind TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL
    )""")
    db.execute("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY)")
    if not db.execute("SELECT 1 FROM schema_migrations WHERE version='operations-v1'").fetchone():
        for row in db.execute("SELECT * FROM bookings").fetchall():
            crop_row = db.execute("SELECT payload FROM crops WHERE id=?", (row['crop_id'],)).fetchone()
            crop = json.loads(crop_row[0]) if crop_row else {}
            qty = crop.get('quantity')
            if qty is not None and crop.get('unit') == 'Tonnes':
                qty *= 10
            db.execute("INSERT INTO visits (id,farmer_id,centre_id,crop_id,crop_type,quantity_quintals,booking_day,slot_id,status) VALUES (?,?,?,?,?,?,?,?, 'Booked')",
                       (str(uuid4()), row['farmer_id'], row['centre_id'], row['crop_id'], crop.get('type'), qty, row['day'], row['slot_id']))
        for row in db.execute("SELECT * FROM queue_tokens").fetchall():
            status = {'queue':'Waiting','grading':'Quality Check','weighing':'Procurement','completed':'Completed'}[row['stage']]
            visit = db.execute("SELECT id FROM visits WHERE farmer_id=? AND centre_id=? AND token_id IS NULL", (row['farmer_id'],row['centre_id'])).fetchone() if row['stage'] != 'completed' else None
            if visit:
                db.execute("UPDATE visits SET status=?,token_id=? WHERE id=?", (status,row['id'],visit[0]))
            else:
                db.execute("INSERT INTO visits (id,farmer_id,centre_id,status,token_id) VALUES (?,?,?,?,?)", (str(uuid4()),row['farmer_id'],row['centre_id'],status,row['id']))
        db.execute("INSERT INTO schema_migrations VALUES ('operations-v1')")
