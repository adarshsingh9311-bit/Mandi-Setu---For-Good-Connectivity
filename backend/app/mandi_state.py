"""Shared public operational projections. Never include farmer identity in these responses."""
from datetime import datetime
from math import radians, sin, cos, asin, sqrt

from .models import ProcurementCentre
from .predictions import queue_prediction
from .scheduling import IST, definitions, future


def status_for(db, load, counters, centre_id=None):
    settings = db.execute('SELECT * FROM operational_settings WHERE id=1').fetchone()
    override = db.execute('SELECT overloaded FROM mandi_overrides WHERE centre_id=?',(centre_id,)).fetchone()
    return ('Closed' if counters == 0 else 'Overloaded' if (override and override['overloaded']) or load > settings['overloaded_percent']
            else 'Busy' if load >= settings['busy_percent'] else 'Normal')


def project(db, centre, day=None):
    day = day or datetime.now(IST).date()
    config = db.execute('SELECT * FROM mandi_config WHERE centre_id=?', (centre.id,)).fetchone()
    if config:
        centre.capacityPerDay = config['capacity']
        centre.avgProcessingMin = config['processing_min']
        centre.activeCounters = 0 if config['closed'] else config['counters']
    centre.farmersWaiting = db.execute("SELECT COUNT(*) FROM queue_tokens WHERE centre_id=? AND stage!='completed'", (centre.id,)).fetchone()[0]
    centre.loadPercent = round(100 * centre.farmersWaiting / centre.capacityPerDay, 1)
    centre.operationalStatus = status_for(db, centre.loadPercent, centre.activeCounters, centre.id)
    centre.status = {'Normal': 'normal', 'Busy': 'high', 'Overloaded': 'over', 'Closed': 'over'}[centre.operationalStatus]
    wait = queue_prediction(db, centre).predictedMin
    centre.estimatedWaitMin = wait if wait is not None else 0
    centre.waitAvailable = wait is not None
    centre.processingRatePerHour = round(centre.activeCounters * 60 / centre.avgProcessingMin)
    centre.availableCapacity = max(0, centre.capacityPerDay - centre.farmersWaiting) if centre.activeCounters else 0
    centre.availableSlots = 0
    for slot in definitions(db, centre, day):
        if slot['enabled'] and future(day, slot):
            booked = db.execute('SELECT COUNT(*) FROM bookings WHERE centre_id=? AND day=? AND slot_id=?', (centre.id, str(day), slot['id'])).fetchone()[0]
            centre.availableSlots += max(0, slot['capacity'] - booked)
    return centre


def ranked_alternatives(db, source_id, crop, day):
    centres = [project(db, ProcurementCentre.model_validate_json(r['payload']), day)
               for r in db.execute('SELECT payload FROM mandis').fetchall()]
    source = next((c for c in centres if c.id == source_id), None)
    if not source:
        return []
    result = []
    for centre in centres:
        eligible = crop in centre.crops if crop else bool(set(source.crops) & set(centre.crops))
        if centre.id == source_id or not eligible or centre.operationalStatus in ('Closed', 'Overloaded') or not centre.availableCapacity or not centre.availableSlots:
            continue
        a = sin(radians(centre.lat-source.lat)/2)**2 + cos(radians(source.lat))*cos(radians(centre.lat))*sin(radians(centre.lng-source.lng)/2)**2
        centre.distanceKm = round(6371*2*asin(sqrt(min(1, a))), 1)
        result.append(centre)
    # Transparent score: waiting minutes + travel minutes at an assumed 30 km/h.
    return sorted(result, key=lambda c: (c.estimatedWaitMin + 2*c.distanceKm, -c.availableCapacity, c.id))
