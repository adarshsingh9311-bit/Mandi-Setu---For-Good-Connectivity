"""Transparent queue estimate; configured durations, not a trained model."""
from pydantic import BaseModel


class Factor(BaseModel):
    label: str
    value: str


class WaitPrediction(BaseModel):
    predictedMin: int | None
    method: str = "Configured service-cycle estimate"
    factors: list[Factor]
    note: str


def estimate(waiting_ahead: int, serving: int, counters: int, processing_min: int) -> WaitPrediction:
    factors = [Factor(label="Waiting ahead", value=str(waiting_ahead)),
               Factor(label="Being served", value=str(serving)),
               Factor(label="Active counters", value=str(counters)),
               Factor(label="Configured processing time", value=f"{processing_min} min")]
    if counters <= 0:
        return WaitPrediction(predictedMin=None, factors=factors, note="No active counters. A wait estimate is unavailable.")
    minutes = ((waiting_ahead + serving) // counters) * processing_min
    return WaitPrediction(predictedMin=minutes, factors=factors,
                          note="Estimate to be called, assuming each occupied counter needs one full service cycle. Actual times and operator response can vary. Not a trained ML prediction.")


def queue_prediction(db, centre, token=None):
    serving = db.execute("SELECT COUNT(*) FROM queue_tokens WHERE centre_id = ? AND stage IN ('grading', 'weighing')", (centre.id,)).fetchone()[0]
    if token is None:
        waiting = db.execute("SELECT COUNT(*) FROM queue_tokens WHERE centre_id = ? AND stage = 'queue'", (centre.id,)).fetchone()[0]
    else:
        waiting = db.execute("SELECT COUNT(*) FROM queue_tokens WHERE centre_id = ? AND stage = 'queue' AND id < ?", (centre.id, token["id"])).fetchone()[0]
    result = estimate(waiting, serving, centre.activeCounters, centre.avgProcessingMin)
    if token is not None and token["stage"] != "queue":
        result.predictedMin = 0
        result.note = "This token has already been called or completed; there is no remaining wait to be called."
    return result
