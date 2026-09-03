from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from uuid import uuid4
import json

from ..auth import current_farmer_id, identity
from ..database import connection
from ..communications import communication_rows
from ..store import get_centre

router = APIRouter(tags=['communication simulation'])

class IvrRequest(BaseModel):
    language: str = 'en'
    action: str

from ..ivr import ivr_answer

@router.post('/api/communications/ivr/simulate')
def simulate_ivr(payload:IvrRequest):
    farmer=current_farmer_id()
    if payload.language not in ('en','hi'): raise HTTPException(422,'Choose en or hi')
    with connection() as db:
        answer=ivr_answer(db,farmer,payload.action,payload.language)
        session=dict(id=str(uuid4()),farmer_id=farmer,language=payload.language,action=payload.action,
                     response=answer,provider='demo',created_at=datetime.now(timezone.utc).isoformat())
        db.execute('INSERT INTO ivr_sessions VALUES (?,?,?,?,?,?,?)',tuple(session.values()))
        return {**session,'status':'simulated_not_called'}

@router.get('/api/admin/communications')
def activity():
    user=identity.get()
    if not user or user['role'] not in ('government','super_admin'): raise HTTPException(403,'Government officer access required')
    with connection() as db:
        return {'sms':communication_rows(db),'ivr':[dict(r) for r in db.execute('SELECT * FROM ivr_sessions ORDER BY created_at DESC LIMIT 100').fetchall()]}
