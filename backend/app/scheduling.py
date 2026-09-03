from datetime import datetime, time, timedelta, timezone
from fastapi import HTTPException
IST=timezone(timedelta(hours=5,minutes=30))
DEFAULTS={'s1':('10:00','11:00'),'s2':('11:00','12:00'),'s3':('12:00','13:00')}
def window(starts,ends):
    def label(v):return datetime.strptime(v,'%H:%M').strftime('%I:%M %p').lstrip('0')
    return f'{label(starts)} – {label(ends)}'
def definitions(db,centre,day):
    config=db.execute('SELECT * FROM mandi_config WHERE centre_id=?',(centre.id,)).fetchone()
    capacity=config['counters'] if config else centre.activeCounters
    slots={k:dict(id=k,starts=t[0],ends=t[1],capacity=capacity,enabled=True) for k,t in DEFAULTS.items()}
    for r in db.execute('SELECT * FROM managed_slots WHERE centre_id=? AND day=?',(centre.id,str(day))).fetchall():
        slots[r['slot_id']]=dict(id=r['slot_id'],starts=r['starts'],ends=r['ends'],capacity=r['capacity'],enabled=bool(r['enabled']))
    for s in slots.values():
        s['window']=window(s['starts'],s['ends'])
        if config and (config['closed'] or config['counters']==0):s['enabled']=False
    return sorted(slots.values(),key=lambda s:(s['starts'],s['id']))
def find_slot(db,centre,day,slot_id):
    slot=next((s for s in definitions(db,centre,day) if s['id']==slot_id),None)
    if slot is None:raise HTTPException(404,'Slot not found')
    return slot
def future(day,slot):return datetime.combine(day,time.fromisoformat(slot['starts']),IST)>datetime.now(IST)
