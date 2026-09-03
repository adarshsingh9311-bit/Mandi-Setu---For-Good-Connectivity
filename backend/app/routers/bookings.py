from ..auth import current_farmer_id
import json
from datetime import date, datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from ..database import connection
from ..notifications import notify
from ..scheduling import IST, definitions, find_slot, future, DEFAULTS, window
from .. import visit_events
from .queues import centre_or_404

router = APIRouter(prefix="/api/bookings", tags=["bookings"])
# Retained for integrations which imported the original defaults.
WINDOWS = {key:(int(times[0][:2]),window(*times)) for key,times in DEFAULTS.items()}

class BookingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    centreId: str
    cropId: str
    day: date
    slotId: str = Field(min_length=1,max_length=80,pattern=r'^[a-zA-Z0-9_-]+$')

def valid_day(day):
    from datetime import timedelta
    today = datetime.now(IST).date()
    if not today <= day <= today + timedelta(days=30):
        raise HTTPException(422,"Choose a date within the next 30 days")

def result(row):
    centre = centre_or_404(row['centre_id'])
    with connection() as db:
        slot = find_slot(db,centre,row['day'],row['slot_id'])
    return dict(centreId=row['centre_id'],cropId=row['crop_id'],day=row['day'],slotId=row['slot_id'],slot=f"{row['day']} · {slot['window']}",status='Confirmed')

def crop_status(db,crop_id,status):
    row=db.execute('SELECT payload FROM crops WHERE id=?',(crop_id,)).fetchone()
    payload=json.loads(row['payload']); payload['status']=status
    db.execute('UPDATE crops SET payload=? WHERE id=?',(json.dumps(payload),crop_id))

@router.get('/me')
def current_booking():
    with connection() as db:
        row=db.execute('SELECT * FROM bookings WHERE farmer_id=?',(current_farmer_id(),)).fetchone()
        return result(row) if row else None

@router.get('/slots/{centre_id}')
def slots(centre_id:str,day:date):
    centre=centre_or_404(centre_id); valid_day(day)
    with connection() as db:
        options=[]
        for slot in definitions(db,centre,day):
            count=db.execute('SELECT COUNT(*) FROM bookings WHERE centre_id=? AND day=? AND slot_id=? AND farmer_id!=?',(centre_id,str(day),slot['id'],current_farmer_id())).fetchone()[0]
            options.append(dict(id=slot['id'],window=slot['window'],remaining=max(0,slot['capacity']-count),available=slot['enabled'] and future(day,slot) and count<slot['capacity']))
        return options

@router.post('/me')
def confirm(payload:BookingRequest):
    centre=centre_or_404(payload.centreId); valid_day(payload.day)
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        return save_booking(db,payload,centre)

def save_booking(db,payload,centre):
    farmer=current_farmer_id()
    crop=db.execute('SELECT payload FROM crops WHERE id=? AND farmer_id=?',(payload.cropId,farmer)).fetchone()
    if crop is None: raise HTTPException(404,'Crop not found')
    if json.loads(crop['payload'])['type'] not in centre.crops: raise HTTPException(422,'This centre does not accept the selected crop')
    old=db.execute('SELECT * FROM bookings WHERE farmer_id=?',(farmer,)).fetchone()
    if old and (old['crop_id'],old['centre_id'],old['day'],old['slot_id'])==(payload.cropId,payload.centreId,str(payload.day),payload.slotId): return result(old)
    try:
        slot=find_slot(db,centre,payload.day,payload.slotId)
    except HTTPException as exc:
        if exc.status_code == 404:
            raise HTTPException(422,'Choose an existing slot') from exc
        raise
    if not slot['enabled']: raise HTTPException(409,'This slot is disabled or the mandi is closed')
    if not future(payload.day,slot): raise HTTPException(409,'This slot has already started')
    count=db.execute('SELECT COUNT(*) FROM bookings WHERE centre_id=? AND day=? AND slot_id=? AND farmer_id!=?',(payload.centreId,str(payload.day),payload.slotId,farmer)).fetchone()[0]
    if count>=slot['capacity']: raise HTTPException(409,'This slot is full. Choose another slot.')
    if db.execute("SELECT 1 FROM visits WHERE farmer_id=? AND status IN ('Checked In','Waiting','Quality Check','Procurement')",(farmer,)).fetchone():
        raise HTTPException(409,'Complete the active queue visit before changing your booking')
    if old: crop_status(db,old['crop_id'],'Not Scheduled')
    db.execute('INSERT OR REPLACE INTO bookings VALUES (?,?,?,?,?)',(farmer,payload.cropId,payload.centreId,str(payload.day),payload.slotId))
    crop_status(db,payload.cropId,'Slot Confirmed')
    visit_events.booked(db,farmer,payload,slot['window'])
    if old and old['centre_id'] != payload.centreId:
        from uuid import uuid4
        db.execute('INSERT INTO redirect_requests VALUES (?,?,?,?,?,?,?)',
                   (str(uuid4()),farmer,old['centre_id'],payload.centreId,'Accepted','Farmer confirmed a booking at an alternate mandi',datetime.now(IST).isoformat()))
        notify(db,farmer,'centre','Alternate mandi confirmed',f'Your new booking is at {centre.name}.')
    notify(db,farmer,'slot','Slot confirmed',f"Your slot is confirmed for {payload.day} at {centre.name}: {slot['window']}.")
    return result(db.execute('SELECT * FROM bookings WHERE farmer_id=?',(farmer,)).fetchone())

@router.delete('/me')
def cancel():
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        old=db.execute('SELECT * FROM bookings WHERE farmer_id=?',(current_farmer_id(),)).fetchone()
        if old:
            crop_status(db,old['crop_id'],'Not Scheduled')
            db.execute('DELETE FROM bookings WHERE farmer_id=?',(current_farmer_id(),))
            visit_events.cancelled(db,current_farmer_id())
            notify(db,current_farmer_id(),'slot','Booking cancelled','Your procurement booking was cancelled.')
    return {'ok':True}
