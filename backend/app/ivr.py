import json
from datetime import datetime
from fastapi import HTTPException
from .store import get_centre

def ivr_answer(db, farmer_id, action, language):
    hi = language == 'hi'
    booking = db.execute('SELECT * FROM bookings WHERE farmer_id=?', (farmer_id,)).fetchone()
    token = db.execute("SELECT * FROM queue_tokens WHERE farmer_id=? AND stage!='completed'", (farmer_id,)).fetchone()
    if action == 'slot':
        if not booking:return 'कोई सक्रिय बुकिंग नहीं है।' if hi else 'You have no active booking.'
        centre = get_centre(booking['centre_id'])
        from .scheduling import find_slot
        from datetime import date
        slot = find_slot(db, centre, date.fromisoformat(booking['day']), booking['slot_id'])
        return f"आपका स्लॉट {booking['day']}, {slot['window']}, {centre.name} है।" if hi else f"Your slot is {booking['day']}, {slot['window']}, at {centre.name}."
    if action == 'queue':
        if not token:return 'आप अभी कतार में नहीं हैं।' if hi else 'You are not currently in a queue.'
        return f"आपका टोकन {token['id']}, स्थिति {token['stage']} है।" if hi else f"Your token is {token['id']}, stage {token['stage']}."
    if action == 'waiting':
        centre = get_centre(token['centre_id'] if token else booking['centre_id']) if token or booking else None
        if not centre or not centre.waitAvailable:return 'प्रतीक्षा का अनुमान उपलब्ध नहीं है।' if hi else 'A waiting estimate is unavailable.'
        return f"अनुमानित प्रतीक्षा {centre.estimatedWaitMin} मिनट है।" if hi else f"Estimated waiting time is {centre.estimatedWaitMin} minutes."
    if action == 'alternative':
        if not booking:return 'पहले फसल और मंडी चुनें।' if hi else 'Select a crop and mandi first.'
        crop = json.loads(db.execute('SELECT payload FROM crops WHERE id=?',(booking['crop_id'],)).fetchone()['payload'])
        from .mandi_state import ranked_alternatives
        from .scheduling import IST
        options = ranked_alternatives(db,booking['centre_id'],crop['type'],datetime.now(IST).date())
        if not options:return 'आज उपलब्ध वैकल्पिक मंडी नहीं है।' if hi else 'No eligible alternative has available slots today.'
        c = options[0]
        return f"वैकल्पिक मंडी {c.name}, दूरी {c.distanceKm} किलोमीटर, प्रतीक्षा {c.estimatedWaitMin} मिनट।" if hi else f"Alternative: {c.name}, {c.distanceKm} km away, estimated wait {c.estimatedWaitMin} minutes."
    if action == 'procurement':
        visit = db.execute('SELECT status,actual_quantity_quintals FROM visits WHERE farmer_id=? ORDER BY rowid DESC LIMIT 1',(farmer_id,)).fetchone()
        if not visit:return 'खरीद का रिकॉर्ड उपलब्ध नहीं है।' if hi else 'No procurement visit is recorded.'
        quantity = visit['actual_quantity_quintals']
        return f"खरीद स्थिति {visit['status']}, दर्ज मात्रा {quantity if quantity is not None else 'उपलब्ध नहीं'} क्विंटल।" if hi else f"Procurement status: {visit['status']}. Recorded quantity: {quantity if quantity is not None else 'not recorded'} quintals."
    raise HTTPException(422,'Unknown IVR action')
