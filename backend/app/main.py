"""
KisanSetu backend — built one domain at a time.

Step 1 (this): health + procurement centres
Later: farmers/crops → queue → slots → predictions → notifications/recovery
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import HealthResponse
from .routers.centres import router as centres_router

app = FastAPI(title="KisanSetu API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
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


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(step=1)
