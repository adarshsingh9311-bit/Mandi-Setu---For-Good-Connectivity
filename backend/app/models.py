from typing import Literal
from datetime import date

from pydantic import BaseModel, Field, ConfigDict

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
    step: int = Field(description="Implemented backend step (7 = authentication and role permissions)")


class ProcurementHistory(BaseModel):
    season: str
    crop: str
    qty: str
    centre: str
    status: str


class FarmerProfile(BaseModel):
    id: str
    name: str
    village: str
    district: str
    state: str
    mobile: str
    language: str
    transport: str
    history: list[ProcurementHistory]


class CropCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    type: Literal["Wheat", "Paddy", "Gram", "Mustard", "Sugarcane"]
    quantity: float = Field(gt=0, allow_inf_nan=False)
    unit: Literal["Quintals", "Tonnes"]
    expectedDate: date
    preferredCentreId: str = Field(min_length=1)
    transportAvailable: bool
    language: Literal["en", "hi", "bn", "mr", "pa"] = "en"


class CropRecord(CropCreate):
    id: str
    status: str = "Not Scheduled"
