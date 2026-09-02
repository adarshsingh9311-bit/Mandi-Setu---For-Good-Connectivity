from typing import Literal

from pydantic import BaseModel, Field

CentreStatus = Literal["normal", "high", "over"]


class ProcurementCentre(BaseModel):
    id: str
    name: str
    district: str
    state: str
    distanceKm: float
    crops: list[str]
    capacityPerDay: int
    farmersWaiting: int
    activeCounters: int
    processingRatePerHour: int
    avgProcessingMin: int
    loadPercent: int
    estimatedWaitMin: int
    status: CentreStatus
    lat: float
    lng: float


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "kisansetu-api"
    step: int = Field(description="Implemented backend step (1 = centres)")
