"""Communication provider boundary. The built-in provider records simulations only."""
import os
from datetime import datetime, timezone
from uuid import uuid4


def record_sms(db, farmer_id, event_type, message):
    profile = db.execute('SELECT payload FROM farmers WHERE id=?', (farmer_id,)).fetchone()
    if not profile:
        return
    import json
    mobile = json.loads(profile['payload']).get('mobile', '').strip()
    mode = os.environ.get('MANDISETU_SMS_MODE', 'demo').lower()
    if mode != 'demo':
        # A real adapter must acknowledge delivery before this branch can report "sent".
        status, provider = 'not_configured', mode
    else:
        status, provider = 'simulated_not_delivered', 'demo'
    db.execute('INSERT INTO communication_events VALUES (?,?,?,?,?,?,?,?,?)',
               (str(uuid4()), farmer_id, 'sms', event_type, mobile or None, message,
                provider, status, datetime.now(timezone.utc).isoformat()))


def communication_rows(db, limit=100):
    return [dict(r) for r in db.execute('SELECT * FROM communication_events ORDER BY created_at DESC LIMIT ?', (limit,)).fetchall()]
