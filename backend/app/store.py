from copy import deepcopy

from .models import CentreStatus, ProcurementCentre

# Seeded from the SIH prototype mock data. Later steps add persistence.

_CENTRES: dict[str, ProcurementCentre] = {}


def estimated_wait(farmers_waiting: int, active_counters: int, avg_processing_min: int) -> int:
    return round((farmers_waiting / max(active_counters, 1)) * avg_processing_min)


def seed_centres() -> None:
    raw = [
        {
            "id": "mandi-a",
            "name": "Mandi A — Meerut Krishi Upaj",
            "district": "Meerut",
            "state": "Uttar Pradesh",
            "distanceKm": 18,
            "crops": ["Wheat", "Mustard", "Gram"],
            "capacityPerDay": 420,
            "farmersWaiting": 18,
            "activeCounters": 3,
            "processingRatePerHour": 26,
            "avgProcessingMin": 7,
            "loadPercent": 82,
            "estimatedWaitMin": 47,
            "status": "high",
            "lat": 28.98,
            "lng": 77.7,
        },
        {
            "id": "mandi-b",
            "name": "Mandi B — Sardhana Centre",
            "district": "Meerut",
            "state": "Uttar Pradesh",
            "distanceKm": 23,
            "crops": ["Wheat", "Paddy", "Gram"],
            "capacityPerDay": 380,
            "farmersWaiting": 9,
            "activeCounters": 4,
            "processingRatePerHour": 31,
            "avgProcessingMin": 6,
            "loadPercent": 58,
            "estimatedWaitMin": 42,
            "status": "normal",
            "lat": 29.14,
            "lng": 77.6,
        },
        {
            "id": "mandi-c",
            "name": "Mandi C — Mawana Centre",
            "district": "Meerut",
            "state": "Uttar Pradesh",
            "distanceKm": 12,
            "crops": ["Wheat", "Sugarcane"],
            "capacityPerDay": 300,
            "farmersWaiting": 26,
            "activeCounters": 2,
            "processingRatePerHour": 19,
            "avgProcessingMin": 9,
            "loadPercent": 108,
            "estimatedWaitMin": 95,
            "status": "high",
            "lat": 29.1,
            "lng": 77.92,
        },
        {
            "id": "mandi-d",
            "name": "Mandi D — Baghpat Centre",
            "district": "Baghpat",
            "state": "Uttar Pradesh",
            "distanceKm": 34,
            "crops": ["Wheat", "Mustard"],
            "capacityPerDay": 260,
            "farmersWaiting": 6,
            "activeCounters": 3,
            "processingRatePerHour": 24,
            "avgProcessingMin": 6,
            "loadPercent": 48,
            "estimatedWaitMin": 28,
            "status": "normal",
            "lat": 28.94,
            "lng": 77.22,
        },
        {
            "id": "mandi-e",
            "name": "Mandi E — Hapur Centre",
            "district": "Hapur",
            "state": "Uttar Pradesh",
            "distanceKm": 41,
            "crops": ["Wheat", "Paddy", "Gram", "Mustard"],
            "capacityPerDay": 450,
            "farmersWaiting": 14,
            "activeCounters": 4,
            "processingRatePerHour": 29,
            "avgProcessingMin": 7,
            "loadPercent": 66,
            "estimatedWaitMin": 38,
            "status": "normal",
            "lat": 28.73,
            "lng": 77.78,
        },
    ]
    _CENTRES.clear()
    for item in raw:
        centre = ProcurementCentre.model_validate(item)
        centre.estimatedWaitMin = estimated_wait(
            centre.farmersWaiting, centre.activeCounters, centre.avgProcessingMin
        )
        _CENTRES[centre.id] = centre


def list_centres() -> list[ProcurementCentre]:
    from .database import connection
    from .mandi_state import project
    with connection() as db:
        return [project(db, ProcurementCentre.model_validate_json(row['payload']))
                for row in db.execute('SELECT payload FROM mandis ORDER BY id').fetchall()]


def get_centre(centre_id: str) -> ProcurementCentre | None:
    return next((c for c in list_centres() if c.id == centre_id), None)


def rank_alternatives(exclude_id: str, crop: str, day=None) -> list[ProcurementCentre]:
    from .database import connection
    from .mandi_state import ranked_alternatives
    from .scheduling import IST
    from datetime import datetime
    with connection() as db:
        return ranked_alternatives(db, exclude_id, crop, day or datetime.now(IST).date())


seed_centres()
