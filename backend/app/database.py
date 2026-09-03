"""Persistent prototype data. Authentication is a separate implementation step."""
import json
import os
import sqlite3
from contextlib import contextmanager
from collections.abc import Mapping
from pathlib import Path

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:  # SQLite remains available for isolated local tests.
    psycopg = None
    dict_row = None

INTEGRITY_ERRORS = (sqlite3.IntegrityError,) + ((psycopg.IntegrityError,) if psycopg else ())

DEMO_FARMER_ID = "KS-UP-23180"


@contextmanager
def connection():
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        if psycopg is None:
            raise RuntimeError("PostgreSQL requires psycopg; install backend requirements")
        raw = psycopg.connect(database_url, row_factory=dict_row)
        db = PostgresConnection(raw)
        try:
            yield db
            raw.commit()
        except Exception:
            raw.rollback()
            raise
        finally:
            raw.close()
        return
    path = Path(os.environ.get("KISANSETU_DB_PATH", Path(__file__).resolve().parents[1] / "data" / "kisansetu.sqlite3"))
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    try:
        with db:
            yield db
    finally:
        db.close()


class HybridRow(Mapping):
    def __init__(self, values):
        self.values = values

    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values.values())[key]
        return self.values[key]

    def __iter__(self):
        return iter(self.values)

    def __len__(self):
        return len(self.values)


class PostgresResult:
    def __init__(self, cursor, buffered=None):
        self.cursor = cursor
        self.buffered = buffered
        self.rowcount = cursor.rowcount
        self.lastrowid = buffered["id"] if buffered else None

    def fetchone(self):
        row, self.buffered = (self.buffered, None) if self.buffered is not None else (self.cursor.fetchone(), None)
        return HybridRow(row) if row is not None else None

    def fetchall(self):
        rows = ([] if self.buffered is None else [self.buffered]) + self.cursor.fetchall()
        self.buffered = None
        return [HybridRow(row) for row in rows]


class PostgresConnection:
    def __init__(self, raw):
        self.raw = raw

    def execute(self, sql, params=()):
        statement = sql.replace("BEGIN IMMEDIATE", "BEGIN")
        statement = statement.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "BIGSERIAL PRIMARY KEY")
        statement = statement.replace("?", "%s")
        returns_id = statement.lstrip().upper().startswith("INSERT INTO QUEUE_TOKENS") and "RETURNING" not in statement.upper()
        if returns_id:
            statement += " RETURNING id"
        cursor = self.raw.execute(statement, params)
        return PostgresResult(cursor, cursor.fetchone() if returns_id else None)


def initialize():
    profile = dict(id=DEMO_FARMER_ID, name="Rajesh Kumar", village="Sisauli", district="Meerut",
                   state="Uttar Pradesh", mobile="+91 98371 44210", language="en",
                   transport="Own Tractor Trolley", history=[
                       dict(season="Rabi 2025", crop="Wheat", qty="48 Quintals", centre="Mandi A", status="Completed"),
                       dict(season="Kharif 2025", crop="Paddy", qty="36 Quintals", centre="Mandi B", status="Completed"),
                   ])
    with connection() as db:
        db.execute("CREATE TABLE IF NOT EXISTS farmers (id TEXT PRIMARY KEY, payload TEXT NOT NULL)")
        db.execute("""CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY REFERENCES farmers(id), username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('farmer', 'operator')),
            centre_id TEXT
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id),
            expires_at REAL NOT NULL
        )""")
        db.execute("CREATE TABLE IF NOT EXISTS login_attempts (username TEXT PRIMARY KEY, failures INTEGER NOT NULL, blocked_until REAL NOT NULL)")
        db.execute("CREATE TABLE IF NOT EXISTS crops (id TEXT PRIMARY KEY, farmer_id TEXT NOT NULL REFERENCES farmers(id), payload TEXT NOT NULL)")
        db.execute("""CREATE TABLE IF NOT EXISTS queue_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farmer_id TEXT NOT NULL REFERENCES farmers(id),
            centre_id TEXT NOT NULL,
            stage TEXT NOT NULL DEFAULT 'queue' CHECK(stage IN ('queue', 'grading', 'weighing', 'completed')),
            updated_at TEXT NOT NULL
        )""")
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS one_active_token ON queue_tokens(farmer_id) WHERE stage != 'completed'")
        db.execute("""CREATE TABLE IF NOT EXISTS bookings (
            farmer_id TEXT PRIMARY KEY REFERENCES farmers(id),
            crop_id TEXT NOT NULL REFERENCES crops(id), centre_id TEXT NOT NULL,
            day TEXT NOT NULL, slot_id TEXT NOT NULL
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT, farmer_id TEXT NOT NULL REFERENCES farmers(id),
            kind TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
            created_at TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS delay_reports (
            id TEXT PRIMARY KEY, farmer_id TEXT NOT NULL REFERENCES farmers(id),
            reason TEXT NOT NULL, arrival TEXT NOT NULL, booking TEXT NOT NULL,
            resolution TEXT, created_at TEXT NOT NULL
        )""")
        inserted = db.execute("INSERT INTO farmers VALUES (?, ?) ON CONFLICT (id) DO NOTHING", (DEMO_FARMER_ID, json.dumps(profile))).rowcount
        if inserted:
            for crop in [
                dict(id="crop-1", type="Wheat", quantity=50, unit="Quintals", expectedDate="2026-09-05", preferredCentreId="mandi-a", transportAvailable=True, language="en", status="Not Scheduled"),
                dict(id="crop-2", type="Mustard", quantity=18, unit="Quintals", expectedDate="2026-09-22", preferredCentreId="mandi-a", transportAvailable=False, language="en", status="Not Scheduled"),
            ]:
                db.execute("INSERT INTO crops VALUES (?, ?, ?)", (crop["id"], DEMO_FARMER_ID, json.dumps(crop)))
        # Remove the old prototype's unbacked confirmation on existing databases.
        for row in db.execute("SELECT id, payload FROM crops WHERE id NOT IN (SELECT crop_id FROM bookings)").fetchall():
            crop = json.loads(row["payload"])
            if crop.get("status") == "Slot Confirmed":
                crop["status"] = "Not Scheduled"
                db.execute("UPDATE crops SET payload = ? WHERE id = ?", (json.dumps(crop), row["id"]))
        from .operations_schema import migrate
        migrate(db)
