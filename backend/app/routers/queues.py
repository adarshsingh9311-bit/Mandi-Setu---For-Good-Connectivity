from .. import visit_events
from ..auth import current_farmer_id
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..database import connection
from ..store import get_centre
from ..predictions import queue_prediction
from ..notifications import notify
from ..scheduling import IST

router = APIRouter(prefix="/api/queues", tags=["queues"])


class AdvanceRequest(BaseModel):
    expectedStage: Literal["grading", "weighing"]


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def centre_or_404(centre_id):
    centre = get_centre(centre_id)
    if centre is None:
        raise HTTPException(404, "Centre not found")
    from ..operations import configured
    with connection() as db:
        return configured(db, centre)


def snapshot(db, row, centre):
    prediction = queue_prediction(db, centre, row)
    ahead = db.execute("SELECT COUNT(*) FROM queue_tokens WHERE centre_id = ? AND id < ? AND stage != 'completed'",
                       (centre.id, row["id"])).fetchone()[0] if row["stage"] == "queue" else 0
    return dict(id=row["id"], token=f'#{row["id"]:04d}', centreId=centre.id,
                stage=row["stage"], farmersAhead=ahead, activeCounters=centre.activeCounters,
                estimatedWaitMin=prediction.predictedMin, prediction=prediction.model_dump(),
                lastUpdated=row["updated_at"])


@router.get("/me")
def my_token():
    with connection() as db:
        db.execute("BEGIN")
        row = db.execute("SELECT * FROM queue_tokens WHERE farmer_id = ? ORDER BY id DESC LIMIT 1", (current_farmer_id(),)).fetchone()
        return snapshot(db, row, centre_or_404(row["centre_id"])) if row else None


@router.post("/{centre_id}/join")
def join_queue(centre_id: str):
    centre = centre_or_404(centre_id)
    if centre.activeCounters==0:
        raise HTTPException(409,'This mandi is closed or has no active counters')
    with connection() as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT * FROM queue_tokens WHERE farmer_id = ? AND stage != 'completed'", (current_farmer_id(),)).fetchone()
        if row and row["centre_id"] != centre_id:
            raise HTTPException(409, "You already have an active token at another centre")
        if row is None:
            cursor = db.execute("INSERT INTO queue_tokens (farmer_id, centre_id, updated_at) VALUES (?, ?, ?)", (current_farmer_id(), centre_id, timestamp()))
            row = db.execute("SELECT * FROM queue_tokens WHERE id = ?", (cursor.lastrowid,)).fetchone()
            visit_events.checked_in(db, row)
            count=db.execute("SELECT COUNT(*) FROM queue_tokens WHERE centre_id=? AND stage!='completed'",(centre_id,)).fetchone()[0]
            from ..operations import configured
            configured_centre=configured(db,centre)
            threshold=db.execute('SELECT overloaded_percent FROM operational_settings WHERE id=1').fetchone()[0]
            previous=max(0,count-1)/max(1,configured_centre.capacityPerDay)*100
            current=count/max(1,configured_centre.capacityPerDay)*100
            if previous<=threshold<current:
                key=f"overload:{centre_id}:{datetime.now(IST).date()}"
                if db.execute('INSERT OR IGNORE INTO delivery_keys VALUES (?)',(key,)).rowcount:
                    for booking in db.execute('SELECT farmer_id FROM bookings WHERE centre_id=?',(centre_id,)).fetchall():
                        notify(db,booking['farmer_id'],'centre','Mandi overload detected','Live queue load crossed the configured threshold. Check alternate mandis before travelling.')
        return snapshot(db, row, centre)


@router.get("/{centre_id}")
def centre_queue(centre_id: str):
    centre = centre_or_404(centre_id)
    with connection() as db:
        db.execute("BEGIN")
        rows = db.execute("SELECT * FROM queue_tokens WHERE centre_id = ? AND stage != 'completed' ORDER BY id", (centre_id,)).fetchall()
        return dict(centreId=centre_id, activeCounters=centre.activeCounters,
                    waiting=sum(r["stage"] == "queue" for r in rows),
                    tokens=[snapshot(db, row, centre) for row in rows])


@router.post("/{centre_id}/call-next")
def call_next(centre_id: str):
    centre = centre_or_404(centre_id)
    with connection() as db:
        db.execute("BEGIN IMMEDIATE")
        busy = db.execute("SELECT COUNT(*) FROM queue_tokens WHERE centre_id = ? AND stage IN ('grading', 'weighing')", (centre_id,)).fetchone()[0]
        if busy >= centre.activeCounters:
            raise HTTPException(409, "All counters are busy")
        row = db.execute("SELECT * FROM queue_tokens WHERE centre_id = ? AND stage = 'queue' ORDER BY id LIMIT 1", (centre_id,)).fetchone()
        if row is None:
            raise HTTPException(409, "No farmers are waiting")
        db.execute("UPDATE queue_tokens SET stage = 'grading', updated_at = ? WHERE id = ?", (timestamp(), row["id"]))
        visit_events.stage_changed(db, row["id"], "Quality Check")
        notify(db, row["farmer_id"], "centre", "Your token was called", f"Please proceed to quality check at {centre.name}.")
        return snapshot(db, db.execute("SELECT * FROM queue_tokens WHERE id = ?", (row["id"],)).fetchone(), centre)


@router.post("/{centre_id}/tokens/{token_id}/advance")
def advance(centre_id: str, token_id: int, request: AdvanceRequest):
    centre = centre_or_404(centre_id)
    with connection() as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT * FROM queue_tokens WHERE id = ? AND centre_id = ?", (token_id, centre_id)).fetchone()
        if row is None:
            raise HTTPException(404, "Token not found")
        if row["stage"] != request.expectedStage:
            raise HTTPException(409, "Token stage changed. Refresh the queue before continuing.")
        stage = "weighing" if row["stage"] == "grading" else "completed"
        db.execute("UPDATE queue_tokens SET stage = ?, updated_at = ? WHERE id = ?", (stage, timestamp(), token_id))
        visit_events.stage_changed(db, token_id, "Completed" if stage == "completed" else "Procurement")
        notify(db, row["farmer_id"], "centre", "Queue update", f"Your token is now {stage} at {centre.name}.")
        return snapshot(db, db.execute("SELECT * FROM queue_tokens WHERE id = ?", (token_id,)).fetchone(), centre)
