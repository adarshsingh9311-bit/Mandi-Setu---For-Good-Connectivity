from ..auth import current_farmer_id
import json
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from ..database import connection
from ..models import FarmerProfile, CropCreate, CropRecord
from ..store import get_centre

router = APIRouter(prefix="/api/farmers", tags=["farmers and crops"])

@router.get('/me/visits')
def visits():
    with connection() as db:
        return [dict(r) for r in db.execute('SELECT * FROM visits WHERE farmer_id=? ORDER BY rowid DESC',(current_farmer_id(),)).fetchall()]


@router.get("/me", response_model=FarmerProfile)
def get_profile():
    # Identity comes from the authenticated request.
    with connection() as db:
        row = db.execute("SELECT payload FROM farmers WHERE id = ?", (current_farmer_id(),)).fetchone()
    if row is None:
        raise HTTPException(404, "Farmer not found")
    return json.loads(row["payload"])


@router.get("/me/crops", response_model=list[CropRecord])
def list_crops():
    with connection() as db:
        rows = db.execute("SELECT payload FROM crops WHERE farmer_id = ? ORDER BY rowid", (current_farmer_id(),)).fetchall()
    return [json.loads(row["payload"]) for row in rows]


@router.post("/me/crops", response_model=CropRecord, status_code=201)
def create_crop(payload: CropCreate):
    centre = get_centre(payload.preferredCentreId)
    if centre is None:
        raise HTTPException(422, "Preferred centre does not exist")
    if payload.type not in centre.crops:
        raise HTTPException(422, "Preferred centre does not accept this crop")
    crop = CropRecord(**payload.model_dump(), id=f"crop-{uuid4()}")
    with connection() as db:
        db.execute("INSERT INTO crops VALUES (?, ?, ?)", (crop.id, current_farmer_id(), crop.model_dump_json()))
    return crop
