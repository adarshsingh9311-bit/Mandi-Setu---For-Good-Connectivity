"""Operational projections over the shared farmer database."""
import json
from datetime import datetime, timedelta
from math import radians, sin, cos, asin, sqrt
from fastapi import HTTPException
from .auth import identity
from .store import list_centres, get_centre
from .scheduling import IST, definitions, future
from .predictions import queue_prediction

ACTIVE=('Checked In','Waiting','Quality Check','Procurement')
TERMINAL=('Completed','Missed','Cancelled')

def scope(centre_id=None):
    user=identity.get()
    if not user or user['role'] not in ('operator','government','super_admin'): raise HTTPException(403,'Staff account required')
    if user['role']=='operator':
        if not user['centreId']: raise HTTPException(403,'No mandi is assigned to your account')
        if centre_id and centre_id!=user['centreId']: raise HTTPException(403,'This mandi is not assigned to your account')
        return user['centreId']
    return centre_id

def configured(db,centre):
    row=db.execute('SELECT * FROM mandi_config WHERE centre_id=?',(centre.id,)).fetchone()
    if row:
        centre.capacityPerDay=row['capacity']; centre.avgProcessingMin=row['processing_min']; centre.activeCounters=0 if row['closed'] else row['counters']
    return centre

def as_date(value):
    return datetime.fromisoformat(value).astimezone(IST).date().isoformat() if value else None

def minutes(start,end):
    if not start or not end:return None
    return round(max(0,(datetime.fromisoformat(end)-datetime.fromisoformat(start)).total_seconds()/60),2)

def average(values):
    values=[v for v in values if v is not None]
    return round(sum(values)/len(values),2) if values else None

def visit_rows(db,centre_id=None):
    centre_id=scope(centre_id)
    rows=db.execute('SELECT v.*, f.payload AS profile FROM visits v JOIN farmers f ON f.id=v.farmer_id '+('WHERE v.centre_id=? ' if centre_id else '')+'ORDER BY v.rowid DESC', (centre_id,) if centre_id else ()).fetchall()
    result=[]
    now=datetime.now(IST).isoformat()
    for row in rows:
        item=dict(row); profile=json.loads(item.pop('profile'))
        item['farmerName']=profile.get('name','Unknown farmer')
        item['village']=profile.get('village','')
        item['waitingMin']=minutes(item['arrived_at'],item['started_at'] or (now if item['status'] in ACTIVE else None))
        item['processingMin']=minutes(item['started_at'],item['completed_at'])
        item['bookingId']=item['id'] if item['booking_day'] else None
        result.append(item)
    waiting=sorted([v for v in result if v['status'] in ('Checked In','Waiting')],key=lambda v:(v['arrived_at'] or '',v['token_id'] or 0))
    positions={}
    for v in waiting:
        positions[v['centre_id']]=positions.get(v['centre_id'],0)+1
        v['position']=positions[v['centre_id']]
    return result

def mandi_rows(db,day,centre_id=None):
    centre_id=scope(centre_id)
    thresholds=dict(db.execute('SELECT * FROM operational_settings WHERE id=1').fetchone())
    result=[]
    for original in list_centres():
        if centre_id and original.id!=centre_id:continue
        centre=configured(db,original)
        count=db.execute("SELECT COUNT(*) FROM queue_tokens WHERE centre_id=? AND stage!='completed'",(centre.id,)).fetchone()[0]
        workload=round(count/max(1,centre.capacityPerDay)*100,1)
        from .mandi_state import status_for
        status=status_for(db,workload,centre.activeCounters,centre.id)
        slots=slot_rows(db,centre.id,day)
        predicted=queue_prediction(db,centre).predictedMin
        result.append(dict(id=centre.id,name=centre.name,district=centre.district,state=centre.state,lat=centre.lat,lng=centre.lng,crops=centre.crops,
                           capacity=centre.capacityPerDay,queue=count,waitingMin=predicted,processingMin=centre.avgProcessingMin,
                           processingRate=round(centre.activeCounters*60/centre.avgProcessingMin,1),activeCounters=centre.activeCounters,
                           workload=workload,availableSlots=sum(s['remaining'] for s in slots if s['available']),status=status,
                           overloadOverride=bool(db.execute('SELECT overloaded FROM mandi_overrides WHERE centre_id=?',(centre.id,)).fetchone()[0]) if db.execute('SELECT overloaded FROM mandi_overrides WHERE centre_id=?',(centre.id,)).fetchone() else False))
    return result

def slot_rows(db,centre_id,day):
    scope(centre_id)
    centre=get_centre(centre_id)
    if not centre:raise HTTPException(404,'Mandi not found')
    result=[]
    for s in definitions(db,centre,day):
        bookings=db.execute('SELECT b.farmer_id,f.payload FROM bookings b JOIN farmers f ON f.id=b.farmer_id WHERE b.centre_id=? AND b.day=? AND b.slot_id=?',(centre_id,str(day),s['id'])).fetchall()
        result.append({**s,'centreId':centre_id,'day':str(day),'booked':len(bookings),'remaining':max(0,s['capacity']-len(bookings)),
                       'available':s['enabled'] and future(day,s) and len(bookings)<s['capacity'],
                       'bookings':[dict(farmerId=b['farmer_id'],name=json.loads(b['payload']).get('name','Unknown')) for b in bookings]})
    return result

def metrics(db,day):
    visits=visit_rows(db)
    today=str(day)
    done=[v for v in visits if v['status']=='Completed' and as_date(v['completed_at'])==today]
    scope_id=scope()
    if scope_id:
        total=len({v['farmer_id'] for v in visits})
    else:
        total=db.execute("SELECT COUNT(*) FROM accounts WHERE role='farmer'").fetchone()[0]
    mandis=mandi_rows(db,day)
    return dict(totalFarmers=total,scheduledToday=len({v['farmer_id'] for v in visits if v['booking_day']==today and v['status'] not in ('Cancelled','Missed')}),
                waiting=sum(v['status'] in ('Checked In','Waiting') for v in visits),processedToday=len(done),
                procurementQuintals=round(sum(v['actual_quantity_quintals'] for v in done if v['actual_quantity_quintals'] is not None),2),
                quantityNotRecorded=sum(v['actual_quantity_quintals'] is None for v in done),
                averageWaitingMin=average([minutes(v['arrived_at'],v['started_at']) for v in visits if as_date(v['started_at'])==today]),
                activeMandis=sum(m['status']!='Closed' for m in mandis),overloadedMandis=sum(m['status']=='Overloaded' for m in mandis))

def analytics(db,start,end):
    visits=visit_rows(db)
    measured=[v for v in visits if v['arrived_at'] and v['started_at'] and str(start)<=as_date(v['started_at'])<=str(end)]
    done=[v for v in visits if v['status']=='Completed' and v['completed_at'] and str(start)<=as_date(v['completed_at'])<=str(end)]
    def grouping(key):
        data={}
        for v in done:
            if v['actual_quantity_quintals'] is not None:
                label=v[key] or 'Not recorded'
                data[label]=data.get(label,0)+v['actual_quantity_quintals']
        return [dict(label=k,quintals=round(v,2)) for k,v in data.items()]
    trend=[]
    for i in range((end-start).days+1):
        day=(start+timedelta(days=i)).isoformat()
        arrivals=[v for v in visits if as_date(v['arrived_at'])==day]
        completed=[v for v in done if as_date(v['completed_at'])==day]
        daily_measured=[v for v in measured if as_date(v['started_at'])==day]
        trend.append(dict(day=day,arrivals=len(arrivals),completed=len(completed),netGrowth=len(arrivals)-len(completed),averageWaitingMin=average([minutes(v['arrived_at'],v['started_at']) for v in daily_measured]),samples=len(daily_measured)))
    hours=[]
    for hour in range(24):
        rows=[v for v in visits if v['arrived_at'] and str(start)<=as_date(v['arrived_at'])<=str(end) and datetime.fromisoformat(v['arrived_at']).astimezone(IST).hour==hour]
        if rows:hours.append(dict(hour=f'{hour:02d}:00',arrivals=len(rows),averageWaitingMin=average([minutes(v['arrived_at'],v['started_at']) for v in rows])))
    waiting=[v for v in visits if v['status'] in ('Checked In','Waiting') and v['waitingMin'] is not None]
    wait_mandis=[]
    for m in list_centres():
        group=[v for v in measured if v['centre_id']==m.id]
        if group: wait_mandis.append(dict(mandi=m.name,averageWaitingMin=average([minutes(v['arrived_at'],v['started_at']) for v in group]),samples=len(group)))
    return dict(totalQuintals=round(sum(v['actual_quantity_quintals'] or 0 for v in done),2),farmersCompleted=len(done),farmersWaiting=len(waiting),
                averageProcessingMin=average([v['processingMin'] for v in done]),averageWaitingMin=average([minutes(v['arrived_at'],v['started_at']) for v in measured]),
                quantityNotRecorded=sum(v['actual_quantity_quintals'] is None for v in done),byCrop=grouping('crop_type'),byMandi=grouping('centre_id'),
                waitingByMandi=wait_mandis,longestWaiting=sorted(waiting,key=lambda v:v['waitingMin'],reverse=True)[:10],trend=trend,peakPeriods=hours,
                processingRatePerHour=round(len(done)/max(24,(end-start).days*24+24),3),
                note='Measured times require recorded check-in and service timestamps. Historic missing timestamps and quantities are not inferred. Processing rate is completions per calendar hour in the selected interval.')

def alternatives(db,centre_id,day,crop=None):
    scope(centre_id)
    if not get_centre(centre_id):raise HTTPException(404,'Mandi not found')
    from .mandi_state import ranked_alternatives
    return [dict(id=c.id,name=c.name,distanceKm=c.distanceKm,waitingMin=c.estimatedWaitMin,
                 availableCapacity=c.availableCapacity,availableSlots=c.availableSlots,crops=c.crops,
                 workload=c.loadPercent) for c in ranked_alternatives(db,centre_id,crop,day)]
