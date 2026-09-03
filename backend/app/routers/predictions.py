from fastapi import APIRouter

from ..database import connection
from ..predictions import WaitPrediction, queue_prediction
from .queues import centre_or_404

router = APIRouter(prefix="/api/predictions", tags=["wait estimates"])


@router.get("/centres/{centre_id}", response_model=WaitPrediction)
def centre_wait(centre_id: str):
    centre = centre_or_404(centre_id)
    with connection() as db:
        db.execute("BEGIN")
        return queue_prediction(db, centre)
