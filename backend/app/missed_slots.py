"""Idempotent reminder and missed-slot jobs over the existing visit history."""
from datetime import datetime, date, time, timedelta
import os
from .database import connection
from .scheduling import IST, find_slot
from .store import get_centre
from .notifications import notify


def sweep(now=None):
    now = now or datetime.now(IST)
    grace = max(0, int(os.environ.get('MANDISETU_MISSED_GRACE_MINUTES','30')))
    missed = reminders = 0
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        for visit in db.execute("SELECT * FROM visits WHERE status='Booked'").fetchall():
            if not visit['booking_day'] or not visit['slot_id']:continue
            centre=get_centre(visit['centre_id'])
            slot=find_slot(db,centre,date.fromisoformat(visit['booking_day']),visit['slot_id'])
            starts=datetime.combine(date.fromisoformat(visit['booking_day']),time.fromisoformat(slot['starts']),IST)
            ends=datetime.combine(date.fromisoformat(visit['booking_day']),time.fromisoformat(slot['ends']),IST)
            if now > ends+timedelta(minutes=grace):
                db.execute("UPDATE visits SET status='Missed' WHERE id=? AND status='Booked'",(visit['id'],))
                db.execute('DELETE FROM bookings WHERE farmer_id=? AND centre_id=? AND crop_id=? AND day=? AND slot_id=?',(visit['farmer_id'],visit['centre_id'],visit['crop_id'],visit['booking_day'],visit['slot_id']))
                from .routers.bookings import crop_status
                crop_status(db,visit['crop_id'],'Not Scheduled')
                notify(db,visit['farmer_id'],'recovery','Slot missed','Your slot has expired. Open missed-slot recovery to choose a future slot.')
                missed+=1
            elif now <= starts <= now+timedelta(hours=1):
                key='reminder:'+visit['id']
                if db.execute('INSERT OR IGNORE INTO delivery_keys VALUES (?)',(key,)).rowcount:
                    notify(db,visit['farmer_id'],'slot','Slot reminder',f"Your slot at {centre.name} begins at {slot['starts']} on {visit['booking_day']}.")
                    reminders+=1
    return dict(missed=missed,reminders=reminders)
