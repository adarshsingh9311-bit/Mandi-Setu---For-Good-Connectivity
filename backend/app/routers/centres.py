from fastapi import APIRouter, HTTPException, Query

from .. import store
from ..models import ProcurementCentre

router = APIRouter(prefix="/api/centres", tags=["centres"])


@router.get("", response_model=list[ProcurementCentre])
def list_centres() -> list[ProcurementCentre]:
    return store.list_centres()


@router.get("/{centre_id}", response_model=ProcurementCentre)
def get_centre(centre_id: str) -> ProcurementCentre:
    centre = store.get_centre(centre_id)
    if centre is None:
        raise HTTPException(status_code=404, detail="Centre not found")
    return centre


@router.get("/{centre_id}/alternatives", response_model=list[ProcurementCentre])
def list_alternatives(
    centre_id: str,
    crop: str = Query(..., min_length=1),
) -> list[ProcurementCentre]:
    if store.get_centre(centre_id) is None:
        raise HTTPException(status_code=404, detail="Centre not found")
    return store.rank_alternatives(centre_id, crop)
