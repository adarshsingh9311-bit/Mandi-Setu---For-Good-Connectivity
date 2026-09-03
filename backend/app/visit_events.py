import json
from datetime import datetime, timezone
from uuid import uuid4
from .auth import identity

def now():return datetime.now(timezone.utc).isoformat()
def event(db,centre_id,visit_id,kind,message):
    actor=identity.get()
    db.execute('INSERT INTO operational_events (centre_id,visit_id,actor_id,kind,message,created_at) VALUES (?,?,?,?,?,?)',(centre_id,visit_id,actor['id'] if actor else None,kind,message,now()))
def booked(db,farmer_id,payload,label):
    for row in db.execute("SELECT * FROM visits WHERE farmer_id=? AND status='Booked' AND token_id IS NULL",(farmer_id,)).fetchall():
        db.execute("UPDATE visits SET status='Cancelled' WHERE id=?",(row['id'],));event(db,row['centre_id'],row['id'],'booking','Booking replaced')
    crop=json.loads(db.execute('SELECT payload FROM crops WHERE id=?',(payload.cropId,)).fetchone()[0]);qty=crop['quantity']*(10 if crop['unit']=='Tonnes' else 1)
    visit_id=str(uuid4())
    db.execute("INSERT INTO visits (id,farmer_id,centre_id,crop_id,crop_type,quantity_quintals,booking_day,slot_id,slot_label,status,booked_at) VALUES (?,?,?,?,?,?,?,?,?,'Booked',?)",(visit_id,farmer_id,payload.centreId,payload.cropId,crop['type'],qty,str(payload.day),payload.slotId,label,now()))
    event(db,payload.centreId,visit_id,'booking','Slot booked')
def cancelled(db,farmer_id):
    for row in db.execute("SELECT * FROM visits WHERE farmer_id=? AND status='Booked' AND token_id IS NULL",(farmer_id,)).fetchall():
        db.execute("UPDATE visits SET status='Cancelled' WHERE id=?",(row['id'],));event(db,row['centre_id'],row['id'],'booking','Booking cancelled')
def checked_in(db,token):
    row=db.execute("SELECT * FROM visits WHERE farmer_id=? AND centre_id=? AND status='Booked' AND token_id IS NULL ORDER BY rowid DESC LIMIT 1",(token['farmer_id'],token['centre_id'])).fetchone()
    if row:
        visit_id=row['id'];db.execute("UPDATE visits SET status='Waiting',arrived_at=?,token_id=? WHERE id=?",(now(),token['id'],visit_id))
    else:
        visit_id=str(uuid4());db.execute("INSERT INTO visits (id,farmer_id,centre_id,status,arrived_at,token_id) VALUES (?,?,?,'Waiting',?,?)",(visit_id,token['farmer_id'],token['centre_id'],now(),token['id']))
    event(db,token['centre_id'],visit_id,'queue','Farmer checked in and waiting')
def stage_changed(db,token_id,status):
    row=db.execute('SELECT * FROM visits WHERE token_id=?',(token_id,)).fetchone()
    if row is None:return
    db.execute('UPDATE visits SET status=? WHERE id=?',(status,row['id']))
    if status=='Quality Check':db.execute('UPDATE visits SET started_at=COALESCE(started_at,?) WHERE id=?',(now(),row['id']))
    if status=='Completed':db.execute('UPDATE visits SET completed_at=COALESCE(completed_at,?) WHERE id=?',(now(),row['id']))
    event(db,row['centre_id'],row['id'],'queue',f'Status updated to {status}')
