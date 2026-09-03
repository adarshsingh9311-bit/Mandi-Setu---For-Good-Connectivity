import csv
import io
import json
from datetime import date, datetime, timedelta, time
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, model_validator
from ..auth import identity
from ..database import connection
from ..store import get_centre
from ..notifications import notify
from ..scheduling import IST, definitions, find_slot
from .. import operations as ops, visit_events
from .bookings import valid_day, crop_status

router=APIRouter(prefix='/api/admin',tags=['government operations'])

def today():return datetime.now(IST).date()
def government():
    if identity.get()['role'] not in ('government','super_admin'):raise HTTPException(403,'Government officer access required')

def dates(start,end):
    start=start or today()-timedelta(days=29);end=end or today()
    if end<start or (end-start).days>365:raise HTTPException(422,'Choose a date range of at most 366 days')
    return start,end

@router.get('/dashboard')
def dashboard(day:date|None=None):
    government(); day=day or today()
    with connection() as db:
        db.execute('BEGIN')
        mandis=ops.mandi_rows(db,day)
        return dict(day=str(day),metrics=ops.metrics(db,day),mandis=mandis,alerts=[dict(centreId=m['id'],title=f"{m['name']} is overloaded",workload=m['workload']) for m in mandis if m['status']=='Overloaded'])

@router.get('/mandis')
def mandis(day:date|None=None):
    with connection() as db:
        db.execute('BEGIN')
        return ops.mandi_rows(db,day or today())

@router.get('/mandis/{centre_id}')
def mandi(centre_id:str,day:date|None=None):
    ops.scope(centre_id)
    with connection() as db:
        rows=ops.mandi_rows(db,day or today(),centre_id)
        if not rows:raise HTTPException(404,'Mandi not found')
        return rows[0]

@router.get('/mandis/{centre_id}/alternatives')
def alternative_mandis(centre_id:str,day:date|None=None):
    with connection() as db:return ops.alternatives(db,centre_id,day or today())

class MandiUpdate(BaseModel):
    model_config=ConfigDict(extra='forbid')
    capacity:int=Field(gt=0,le=100000)
    processingMin:int=Field(gt=0,le=1440)
    activeCounters:int=Field(ge=0,le=1000)
    closed:bool=False

@router.patch('/mandis/{centre_id}')
def update_mandi(centre_id:str,payload:MandiUpdate):
    government()
    if not get_centre(centre_id):raise HTTPException(404,'Mandi not found')
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        serving=db.execute("SELECT COUNT(*) FROM queue_tokens WHERE centre_id=? AND stage IN ('grading','weighing')",(centre_id,)).fetchone()[0]
        if payload.activeCounters<serving:raise HTTPException(409,'Cannot reduce counters below the number currently serving')
        db.execute('INSERT OR REPLACE INTO mandi_config VALUES (?,?,?,?,?)',(centre_id,payload.capacity,payload.processingMin,payload.activeCounters,int(payload.closed)))
        visit_events.event(db,centre_id,None,'mandi','Mandi configuration updated')
    return {'ok':True}

@router.get('/queue')
def queue(centreId:str|None=None,status:str|None=None,day:date|None=None):
    with connection() as db:
        rows=ops.visit_rows(db,centreId)
        return [v for v in rows if (not status or v['status']==status) and (not day or v['booking_day']==str(day) or ops.as_date(v['arrived_at'])==str(day))]

class StatusUpdate(BaseModel):
    model_config=ConfigDict(extra='forbid')
    expectedStatus:str
    status:str
    actualQuantityQuintals:float|None=Field(default=None,ge=0,allow_inf_nan=False)

TRANSITIONS={
 'Booked':['Checked In','Missed','Cancelled'], 'Checked In':['Waiting','Quality Check','Cancelled'],
 'Waiting':['Quality Check','Missed','Cancelled'], 'Quality Check':['Procurement','Cancelled'],
 'Procurement':['Completed','Cancelled'], 'Completed':[], 'Missed':[], 'Cancelled':[]}

@router.patch('/queue/{visit_id}')
def status_update(visit_id:str,payload:StatusUpdate):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        row=db.execute('SELECT * FROM visits WHERE id=?',(visit_id,)).fetchone()
        if not row:raise HTTPException(404,'Visit not found')
        ops.scope(row['centre_id'])
        if row['status']!=payload.expectedStatus:raise HTTPException(409,'Visit changed. Refresh before updating.')
        if payload.status not in TRANSITIONS.get(row['status'],[]):raise HTTPException(422,'Invalid status transition')
        centre=ops.configured(db,get_centre(row['centre_id']))
        if payload.status in ('Checked In','Waiting','Quality Check','Procurement') and centre.activeCounters==0:raise HTTPException(409,'Mandi is closed or has no active counters')
        if payload.status=='Completed' and payload.actualQuantityQuintals is None:raise HTTPException(422,'Enter the actual procured quantity in quintals')
        if payload.status=='Quality Check':
            busy=db.execute("SELECT COUNT(*) FROM queue_tokens WHERE centre_id=? AND stage IN ('grading','weighing')",(row['centre_id'],)).fetchone()[0]
            if busy>=centre.activeCounters:raise HTTPException(409,'All counters are busy')
        token_id=row['token_id']
        if payload.status=='Checked In' and token_id is None:
            existing=db.execute("SELECT 1 FROM queue_tokens WHERE farmer_id=? AND stage!='completed'",(row['farmer_id'],)).fetchone()
            if existing:raise HTTPException(409,'Farmer already has an active queue token')
            token_id=db.execute("INSERT INTO queue_tokens (farmer_id,centre_id,updated_at) VALUES (?,?,?)",(row['farmer_id'],row['centre_id'],visit_events.now())).lastrowid
            db.execute('UPDATE visits SET token_id=?,arrived_at=? WHERE id=?',(token_id,visit_events.now(),visit_id))
        stage={'Checked In':'queue','Waiting':'queue','Quality Check':'grading','Procurement':'weighing','Completed':'completed','Missed':'completed','Cancelled':'completed'}[payload.status]
        if token_id:
            db.execute('UPDATE queue_tokens SET stage=?,updated_at=? WHERE id=?',(stage,visit_events.now(),token_id))
            visit_events.stage_changed(db,token_id,payload.status)
        else:
            db.execute('UPDATE visits SET status=? WHERE id=?',(payload.status,visit_id))
            visit_events.event(db,row['centre_id'],visit_id,'queue',f'Status updated to {payload.status}')
        if payload.status=='Completed':db.execute('UPDATE visits SET actual_quantity_quintals=? WHERE id=?',(payload.actualQuantityQuintals,visit_id))
        if payload.status in ('Missed','Cancelled'):
            db.execute('DELETE FROM bookings WHERE farmer_id=? AND centre_id=? AND crop_id=? AND day=? AND slot_id=?',(row['farmer_id'],row['centre_id'],row['crop_id'],row['booking_day'],row['slot_id']))
            if row['crop_id']:crop_status(db,row['crop_id'],'Not Scheduled')
        notify(db,row['farmer_id'],'centre','Procurement status updated',f'Your visit is now {payload.status}.')
    return {'ok':True}

@router.get('/slots')
def slots(centreId:str,day:date):
    with connection() as db:return ops.slot_rows(db,centreId,day)

class SlotUpdate(BaseModel):
    model_config=ConfigDict(extra='forbid')
    centreId:str
    day:date
    slotId:str=Field(min_length=1,max_length=80,pattern=r'^[a-zA-Z0-9_-]+$')
    starts:str=Field(pattern=r'^([01]\d|2[0-3]):[0-5]\d$')
    ends:str=Field(pattern=r'^([01]\d|2[0-3]):[0-5]\d$')
    capacity:int=Field(ge=0,le=100000)
    enabled:bool=True

@router.post('/slots',status_code=201)
def create_slot(payload:SlotUpdate):return save_slot(payload,False)
@router.patch('/slots')
def edit_slot(payload:SlotUpdate):return save_slot(payload,True)

def save_slot(payload,editing):
    ops.scope(payload.centreId);valid_day(payload.day)
    centre=get_centre(payload.centreId)
    if not centre:raise HTTPException(404,'Mandi not found')
    if payload.starts>=payload.ends:raise HTTPException(422,'Slot end must be after start')
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        existing=definitions(db,centre,payload.day)
        old=next((s for s in existing if s['id']==payload.slotId),None)
        if old and not editing:raise HTTPException(409,'Slot ID already exists; edit it instead')
        if not old and editing:raise HTTPException(404,'Slot not found')
        count=db.execute('SELECT COUNT(*) FROM bookings WHERE centre_id=? AND day=? AND slot_id=?',(payload.centreId,str(payload.day),payload.slotId)).fetchone()[0]
        if payload.capacity<count:raise HTTPException(409,'Capacity cannot be lower than existing bookings')
        if old and count and (old['starts'],old['ends'])!=(payload.starts,payload.ends):raise HTTPException(409,'Cannot change times for a booked slot')
        if any(s['id']!=payload.slotId and payload.starts<s['ends'] and payload.ends>s['starts'] for s in existing):raise HTTPException(409,'Slot overlaps an existing window')
        if datetime.combine(payload.day,time.fromisoformat(payload.starts),IST)<=datetime.now(IST):raise HTTPException(409,'Cannot change a slot that has already started')
        db.execute('INSERT OR REPLACE INTO managed_slots VALUES (?,?,?,?,?,?,?)',(payload.centreId,str(payload.day),payload.slotId,payload.starts,payload.ends,payload.capacity,int(payload.enabled)))
        visit_events.event(db,payload.centreId,None,'slot',f'Slot {payload.slotId} on {payload.day} updated')
    return {'ok':True}

@router.get('/farmers')
def farmers(search:str='',centreId:str|None=None,crop:str|None=None,status:str|None=None,day:date|None=None):
    government()
    with connection() as db:
        visits=ops.visit_rows(db,centreId)
        rows=db.execute("SELECT f.id,f.payload FROM farmers f JOIN accounts a ON a.id=f.id WHERE a.role='farmer'").fetchall()
        result=[]
        for row in rows:
            profile=json.loads(row['payload']); related=[v for v in visits if v['farmer_id']==row['id']]
            if search.lower() not in (profile.get('name','')+' '+row['id']+' '+profile.get('village','')).lower():continue
            crop_rows=[json.loads(r[0]) for r in db.execute('SELECT payload FROM crops WHERE farmer_id=?',(row['id'],)).fetchall()]
            filtered=[v for v in related if (not status or v['status']==status) and (not day or v['booking_day']==str(day) or ops.as_date(v['arrived_at'])==str(day)) and (not crop or v['crop_type']==crop)]
            if (centreId or status or day) and not filtered:continue
            if crop and not any(c['type']==crop for c in crop_rows):continue
            result.append(dict(id=row['id'],name=profile.get('name',''),village=profile.get('village',''),district=profile.get('district',''),crops=sorted({c['type'] for c in crop_rows}),visits=len(related),latestStatus=related[0]['status'] if related else 'Not Scheduled'))
        return result

@router.get('/procurement')
@router.get('/analytics')
def analytics(start:date|None=None,end:date|None=None):
    government();start,end=dates(start,end)
    with connection() as db:
        db.execute('BEGIN')
        return ops.analytics(db,start,end)

@router.get('/notifications')
def notifications():
    government()
    with connection() as db:
        events=[dict(r) for r in db.execute('SELECT * FROM operational_events ORDER BY id DESC LIMIT 200').fetchall()]
        overloaded=[m for m in ops.mandi_rows(db,today()) if m['status']=='Overloaded']
        reports=[dict(id=r['id'],reason=r['reason'],arrival=r['arrival'],resolved=bool(r['resolution'])) for r in db.execute('SELECT id,reason,arrival,resolution FROM delay_reports ORDER BY rowid DESC LIMIT 100').fetchall()]
        return dict(events=events,overloaded=overloaded,delayReports=reports)

@router.get('/reports')
def reports(start:date|None=None,end:date|None=None):
    government();start,end=dates(start,end)
    with connection() as db:
        rows=[v for v in ops.visit_rows(db) if str(start)<=(v['booking_day'] or ops.as_date(v['arrived_at']) or '')<=str(end)]
        return dict(start=str(start),end=str(end),rows=rows,summary=ops.analytics(db,start,end))

@router.get('/reports/export')
def export_report(start:date|None=None,end:date|None=None):
    report=reports(start,end);output=io.StringIO();writer=csv.writer(output)
    fields=['bookingId','farmerName','centre_id','crop_type','quantity_quintals','actual_quantity_quintals','status','arrived_at','started_at','completed_at','waitingMin']
    writer.writerow(fields)
    for row in report['rows']:
        values=[]
        for field in fields:
            value='' if row.get(field) is None else str(row[field])
            values.append("'"+value if value.startswith(('=','+','-','@','\t','\r')) else value)
        writer.writerow(values)
    return dict(filename=f"procurement-{report['start']}-{report['end']}.csv",csv=output.getvalue())

class Settings(BaseModel):
    model_config=ConfigDict(extra='forbid')
    busyPercent:float=Field(gt=0,lt=100,allow_inf_nan=False)
    overloadedPercent:float=Field(gt=0,le=100,allow_inf_nan=False)
    @model_validator(mode='after')
    def ordered(self):
        if self.busyPercent>=self.overloadedPercent:raise ValueError('Busy threshold must be below overloaded threshold')
        return self

@router.get('/settings')
def settings():
    government()
    with connection() as db:
        row=db.execute('SELECT * FROM operational_settings WHERE id=1').fetchone()
        return dict(busyPercent=row['busy_percent'],overloadedPercent=row['overloaded_percent'])

@router.patch('/settings')
def update_settings(payload:Settings):
    government()
    with connection() as db:db.execute('UPDATE operational_settings SET busy_percent=?,overloaded_percent=? WHERE id=1',(payload.busyPercent,payload.overloadedPercent))
    return payload
