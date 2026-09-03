from datetime import datetime, timedelta
import json
from fastapi import APIRouter, HTTPException
from .bookings import BookingRequest, save_booking
from ..auth import current_farmer_id, identity
from ..database import connection
from ..scheduling import IST, definitions, future
from ..store import list_centres, get_centre

router=APIRouter(tags=['missed-slot recovery'])

def rows(db,farmer=None):
    return [dict(r) for r in db.execute("SELECT v.id,v.farmer_id,v.centre_id,v.crop_id,v.crop_type,v.booking_day,v.slot_label,r.booking AS recovered_booking FROM visits v LEFT JOIN missed_recoveries r ON r.visit_id=v.id WHERE v.status='Missed'"+(' AND v.farmer_id=?' if farmer else '')+' ORDER BY COALESCE(v.booked_at,v.arrived_at,v.completed_at) DESC, v.id DESC',(farmer,) if farmer else ()).fetchall()]

@router.get('/api/missed-slots')
def mine():
    with connection() as db:return rows(db,current_farmer_id())

@router.get('/api/admin/missed-slots')
def all_missed():
    with connection() as db:return rows(db)

@router.post('/api/admin/missed-slots/sweep')
def sweep_slots():
    from ..missed_slots import sweep
    return sweep()

@router.get('/api/missed-slots/{visit_id}/options')
def options(visit_id:str):
    farmer=current_farmer_id()
    with connection() as db:
        visit=next((v for v in rows(db,farmer) if v['id']==visit_id),None)
        if not visit:raise HTTPException(404,'Missed visit not found')
        if visit['recovered_booking']:return []
        result=[]
        for centre in list_centres():
            if visit['crop_type'] not in centre.crops:continue
            for offset in range(31):
                day=datetime.now(IST).date()+timedelta(days=offset)
                available=[]
                for slot in definitions(db,centre,day):
                    count=db.execute('SELECT COUNT(*) FROM bookings WHERE centre_id=? AND day=? AND slot_id=?',(centre.id,str(day),slot['id'])).fetchone()[0]
                    if slot['enabled'] and future(day,slot) and count<slot['capacity']:
                        available.append(dict(centreId=centre.id,cropId=visit['crop_id'],day=str(day),slotId=slot['id'],label=f"{centre.name} · {day} · {slot['window']}"))
                if available:
                    result.extend(available[:2]);break
        return result

@router.post('/api/missed-slots/{visit_id}/rebook')
def rebook(visit_id:str,payload:BookingRequest):
    farmer=current_farmer_id()
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        visit=next((v for v in rows(db,farmer) if v['id']==visit_id),None)
        if not visit:raise HTTPException(404,'Missed visit not found')
        if visit['recovered_booking']:return json.loads(visit['recovered_booking'])
        if payload.cropId!=visit['crop_id']:raise HTTPException(422,'Use the crop from the missed visit')
        if db.execute('SELECT 1 FROM bookings WHERE farmer_id=?',(farmer,)).fetchone():raise HTTPException(409,'You already have a booking. Review it before recovering this visit.')
        centre=get_centre(payload.centreId)
        if not centre:raise HTTPException(404,'Mandi not found')
        booking=save_booking(db,payload,centre)
        db.execute('INSERT INTO missed_recoveries VALUES (?,?,?)',(visit_id,json.dumps(booking),datetime.now(IST).isoformat()))
        return booking
