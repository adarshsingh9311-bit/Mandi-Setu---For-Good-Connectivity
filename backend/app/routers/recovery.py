from ..auth import current_farmer_id
import json
from datetime import datetime, date, time, timedelta
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, AwareDatetime, ConfigDict

from ..database import connection
from ..notifications import notify
from ..store import list_centres
from .bookings import IST, BookingRequest, result, save_booking
from ..scheduling import definitions
from .queues import centre_or_404

router = APIRouter(prefix="/api/recovery", tags=["delay recovery"])


class DelayRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    requestId: UUID
    reason: Literal["weather", "vehicle", "road", "centre", "other"]
    arrival: AwareDatetime


class ApplyRequest(BaseModel):
    optionId: str


def report_result(row):
    return dict(id=row["id"], reason=row["reason"], arrival=row["arrival"],
                booking=json.loads(row["booking"]), resolution=json.loads(row["resolution"]) if row["resolution"] else None)


def get_report(db, report_id):
    row = db.execute("SELECT * FROM delay_reports WHERE id = ? AND farmer_id = ?", (report_id, current_farmer_id())).fetchone()
    if row is None:
        raise HTTPException(404, "Delay report not found")
    return row


def unchanged_booking(db, report):
    current = db.execute("SELECT * FROM bookings WHERE farmer_id = ?", (current_farmer_id(),)).fetchone()
    if not current or result(current) != json.loads(report["booking"]):
        raise HTTPException(409, "Your booking changed. Submit a new delay report for the current booking.")
    return current


def options_for(db, report):
    original = unchanged_booking(db, report)
    crop = json.loads(db.execute("SELECT payload FROM crops WHERE id = ?", (original["crop_id"],)).fetchone()[0])
    now = datetime.now(IST)
    earliest = max(datetime.fromisoformat(report["arrival"]), now)
    options = [dict(id="keep", title="Keep current booking", booking=result(original))]
    for centre in sorted(list_centres(), key=lambda c: (c.id != original["centre_id"], c.distanceKm)):
        if crop["type"] not in centre.crops:
            continue
        found = False
        for offset in range(31):
            day = now.date() + timedelta(days=offset)
            for slot in definitions(db, centre, day):
                slot_id, window = slot['id'], slot['window']
                if not slot['enabled']: continue
                if datetime.combine(day, time.fromisoformat(slot['starts']), IST) < earliest:
                    continue
                if (centre.id, day.isoformat(), slot_id) == (original["centre_id"], original["day"], original["slot_id"]):
                    continue
                count = db.execute("SELECT COUNT(*) FROM bookings WHERE centre_id = ? AND day = ? AND slot_id = ? AND farmer_id != ?", (centre.id, day.isoformat(), slot_id, current_farmer_id())).fetchone()[0]
                if count >= slot['capacity']:
                    continue
                booking = dict(centreId=centre.id, cropId=original["crop_id"], day=day.isoformat(), slotId=slot_id)
                options.append(dict(id=f"{centre.id}:{day}:{slot_id}", title=f"{centre.name} · {day} · {window}", booking=booking))
                found = True
                break
            if found:
                break
    return options


@router.get("")
def reports():
    with connection() as db:
        return [report_result(r) for r in db.execute("SELECT * FROM delay_reports WHERE farmer_id = ? ORDER BY rowid DESC", (current_farmer_id(),)).fetchall()]


@router.post("")
def create_report(payload: DelayRequest):
    with connection() as db:
        db.execute("BEGIN IMMEDIATE")
        existing = db.execute("SELECT * FROM delay_reports WHERE id = ?", (str(payload.requestId),)).fetchone()
        if existing:
            if existing["farmer_id"] != current_farmer_id() or existing["reason"] != payload.reason or datetime.fromisoformat(existing["arrival"]) != payload.arrival:
                raise HTTPException(409, "Request ID already used for a different report")
            return report_result(existing)
        now = datetime.now(IST)
        if not now < payload.arrival <= now + timedelta(days=30):
            raise HTTPException(422, "Arrival must be in the future and within 30 days")
        booking = db.execute("SELECT * FROM bookings WHERE farmer_id = ?", (current_farmer_id(),)).fetchone()
        if booking is None:
            raise HTTPException(409, "Book a slot before reporting a delay")
        db.execute("INSERT INTO delay_reports VALUES (?, ?, ?, ?, ?, NULL, ?)", (str(payload.requestId), current_farmer_id(), payload.reason, payload.arrival.isoformat(), json.dumps(result(booking)), now.isoformat()))
        notify(db, current_farmer_id(), "recovery", "Delay reported", f"Your {payload.reason} delay was saved. Choose a recovery option to update your booking.")
        return report_result(get_report(db, str(payload.requestId)))


@router.get("/{report_id}/options")
def options(report_id: str):
    with connection() as db:
        db.execute("BEGIN")
        report = get_report(db, report_id)
        return [] if report["resolution"] else options_for(db, report)


@router.post("/{report_id}/apply")
def apply(report_id: str, payload: ApplyRequest):
    with connection() as db:
        db.execute("BEGIN IMMEDIATE")
        report = get_report(db, report_id)
        if report["resolution"]:
            resolution = json.loads(report["resolution"])
            if resolution["optionId"] != payload.optionId:
                raise HTTPException(409, "This report has already been resolved")
            return resolution
        option = next((o for o in options_for(db, report) if o["id"] == payload.optionId), None)
        if option is None:
            raise HTTPException(409, "This recovery option is no longer available. Refresh the options.")
        booking = option["booking"]
        if payload.optionId != "keep":
            request = BookingRequest.model_validate(booking)
            booking = save_booking(db, request, centre_or_404(request.centreId))
        resolution = dict(optionId=payload.optionId, booking=booking)
        db.execute("UPDATE delay_reports SET resolution = ? WHERE id = ?", (json.dumps(resolution), report_id))
        notify(db, current_farmer_id(), "recovery", "Recovery confirmed", f"Your saved booking: {booking['slot']}.")
        return resolution
