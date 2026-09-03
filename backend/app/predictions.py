"""Transparent queue estimate; configured durations, not a trained model."""
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import json
from uuid import uuid4


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


def forecast(db, centre, horizon_min=60):
    """Explainable v1 baseline; a trained model can later replace this boundary."""
    current = queue_prediction(db, centre)
    queue = db.execute("SELECT COUNT(*) FROM queue_tokens WHERE centre_id=? AND stage!='completed'", (centre.id,)).fetchone()[0]
    now = datetime.now(timezone.utc)
    from .scheduling import IST, definitions
    from datetime import date, time
    incoming = 0
    for visit in db.execute("SELECT booking_day,slot_id FROM visits WHERE centre_id=? AND status='Booked'", (centre.id,)).fetchall():
        day = date.fromisoformat(visit['booking_day'])
        slot = next((s for s in definitions(db,centre,day) if s['id']==visit['slot_id']),None)
        if slot and now <= datetime.combine(day,time.fromisoformat(slot['starts']),IST) <= now+timedelta(minutes=horizon_min):incoming += 1
    durations=[]
    for visit in db.execute("SELECT started_at,completed_at FROM visits WHERE centre_id=? AND status='Completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 100",(centre.id,)).fetchall():
        duration=(datetime.fromisoformat(visit['completed_at'])-datetime.fromisoformat(visit['started_at'])).total_seconds()/60
        if duration>=1:durations.append(duration)
    service_min=sum(durations)/len(durations) if durations else centre.avgProcessingMin
    throughput = centre.activeCounters * 60 / max(1, service_min)
    projected_queue = max(0, round(queue + incoming - throughput * horizon_min / 60))
    projected_load = round(100 * projected_queue / max(1, centre.capacityPerDay), 1)
    settings = db.execute('SELECT * FROM operational_settings WHERE id=1').fetchone()
    risk = 'HIGH' if projected_load > settings['overloaded_percent'] else 'MEDIUM' if projected_load >= settings['busy_percent'] else 'LOW'
    inputs = dict(currentQueue=queue,incomingBookings=incoming,activeCounters=centre.activeCounters,configuredProcessingMin=centre.avgProcessingMin,serviceMin=round(service_min,2),historySamples=len(durations),capacity=centre.capacityPerDay,horizonMin=horizon_min,timeOfDay=now.astimezone(IST).isoformat())
    output = dict(predictedWaitingMin=current.predictedMin,predictedLoadPercent=projected_load,projectedQueue=projected_queue,overloadRisk=risk,recommendation=('Review alternate mandi capacity' if risk == 'HIGH' else 'Continue monitoring'))
    record = dict(id=str(uuid4()), centreId=centre.id, modelVersion='baseline-v1', horizonMin=horizon_min,inputs=inputs,**output,method='Transparent statistical baseline — not a trained ML model',note='Assumes booked farmers arrive at slot start and counters operate continuously. Uses measured service times of at least one minute; configured duration when no valid history exists. Unbooked arrivals are not forecast.',createdAt=now.isoformat())
    db.execute('INSERT INTO prediction_records VALUES (?,?,?,?,?,?,?)',(record['id'],centre.id,record['modelVersion'],horizon_min,json.dumps(inputs),json.dumps(output),record['createdAt']))
    return record
