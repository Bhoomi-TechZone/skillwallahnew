from pydantic import BaseModel
from typing import Optional
from datetime import date

class AgreementCreate(BaseModel):
    franchiseName: str
    ownerName: str
    territory: str
    franchiseFee: float
    revenueShare: float
    startDate: date
    endDate: date
    terms: str
    franchiseId: Optional[str] = None   # selectedFranchise se aa sakta hai
