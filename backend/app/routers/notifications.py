from ..auth import current_farmer_id
from fastapi import APIRouter, HTTPException
from ..database import connection

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def list_notifications():
    with connection() as db:
        rows = db.execute("SELECT * FROM notifications WHERE farmer_id = ? ORDER BY id DESC", (current_farmer_id(),)).fetchall()
        return [dict(id=str(r["id"]), kind=r["kind"], title=r["title"], body=r["body"], time=r["created_at"], read=bool(r["is_read"])) for r in rows]


@router.post("/read-all")
def read_all():
    with connection() as db:
        db.execute("UPDATE notifications SET is_read = 1 WHERE farmer_id = ?", (current_farmer_id(),))
    return {"ok": True}


@router.post("/{notification_id}/read")
def mark_read(notification_id: int):
    with connection() as db:
        count = db.execute("UPDATE notifications SET is_read = 1 WHERE id = ? AND farmer_id = ?", (notification_id, current_farmer_id())).rowcount
        if not count:
            raise HTTPException(404, "Notification not found")
    return {"ok": True}
