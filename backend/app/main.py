"""
KisanSetu backend — built one domain at a time.

Step 7: authenticated farmers and centre-scoped operators.
Opaque sessions expire after eight hours and are revoked on logout.
"""

from fastapi import FastAPI
import os
import asyncio
from contextlib import suppress
from fastapi import Request
from starlette.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from .auth import authenticate, identity
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

from .models import HealthResponse
from .routers.centres import router as centres_router
from .routers.farmers import router as farmers_router
from .routers.queues import router as queues_router
from .routers.bookings import router as bookings_router
from .routers.predictions import router as predictions_router
from .routers.notifications import router as notifications_router
from .routers.recovery import router as recovery_router
from .routers.auth import router as auth_router
from .routers.admin import router as admin_router
from .routers.communications import router as communications_router
from .routers.missed_slots import router as missed_slots_router
from .database import initialize

@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize()
    async def operational_jobs():
        from .missed_slots import sweep
        while True:
            try:
                await run_in_threadpool(sweep)
            except Exception:
                import logging
                logging.getLogger(__name__).exception('Operational reminder/recovery job failed')
            await asyncio.sleep(60)
    worker = asyncio.create_task(operational_jobs()) if os.environ.get('MANDISETU_JOBS_ENABLED')=='1' else None
    try:
        yield
    finally:
        if worker:
            worker.cancel()
            with suppress(asyncio.CancelledError):await worker


app = FastAPI(title="KisanSetu API", version="0.7.0", lifespan=lifespan)


@app.middleware("http")
async def protect_api(request: Request, call_next):
    path = request.url.path.rstrip("/")
    public = (request.method == "OPTIONS" or not path.startswith("/api/") or
              path in ("/api/auth/login", "/api/auth/register", "/api/auth/demo-government") or
              (request.method == "GET" and (path == "/api/centres" or path.startswith("/api/centres/") or path.startswith("/api/predictions/centres/"))))
    if public:
        return await call_next(request)
    header = request.headers.get("authorization", "")
    user = await run_in_threadpool(authenticate, header[7:] if header.startswith("Bearer ") else None)
    if user is None:
        return JSONResponse({"detail": "Sign in to continue"}, status_code=401)
    if path.startswith('/api/admin/'):
        if user['role'] not in ('operator','government','super_admin'):
            return JSONResponse({'detail':'Staff account required'},status_code=403)
        if user['role']=='operator' and path.split('/')[3] not in ('mandis','queue','slots'):
            return JSONResponse({'detail':'Government officer access required'},status_code=403)
    elif path.startswith("/api/queues/") and path != "/api/queues/me" and not path.endswith("/join"):
        centre = path.split("/")[3]
        if user['role'] not in ('government','super_admin') and (user["role"] != "operator" or user["centreId"] != centre):
            return JSONResponse({"detail": "Operator access for this centre is required"}, status_code=403)
    elif not path.startswith("/api/auth/") and user["role"] != "farmer":
        return JSONResponse({"detail": "Farmer account required"}, status_code=403)
    request.state.user = user
    context_token = identity.set(user)
    try:
        return await call_next(request)
    finally:
        identity.reset(context_token)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.environ.get('MANDISETU_CORS_ORIGINS','').split(',') if origin.strip()] + [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(centres_router)
app.include_router(farmers_router)
app.include_router(queues_router)
app.include_router(bookings_router)
app.include_router(predictions_router)
app.include_router(notifications_router)
app.include_router(recovery_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(communications_router)
app.include_router(missed_slots_router)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(step=7)
