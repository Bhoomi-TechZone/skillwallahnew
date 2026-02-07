from fastapi import APIRouter, HTTPException
from typing import List, Dict

router = APIRouter(
    prefix="/api/utility",
    tags=["Utility"]
)

# Indian States and Union Territories data
INDIAN_STATES = [
    {"code": "AP", "name": "Andhra Pradesh"},
    {"code": "AR", "name": "Arunachal Pradesh"},
    {"code": "AS", "name": "Assam"},
    {"code": "BR", "name": "Bihar"},
    {"code": "CT", "name": "Chhattisgarh"},
    {"code": "GA", "name": "Goa"},
    {"code": "GJ", "name": "Gujarat"},
    {"code": "HR", "name": "Haryana"},
    {"code": "HP", "name": "Himachal Pradesh"},
    {"code": "JH", "name": "Jharkhand"},
    {"code": "KA", "name": "Karnataka"},
    {"code": "KL", "name": "Kerala"},
    {"code": "MP", "name": "Madhya Pradesh"},
    {"code": "MH", "name": "Maharashtra"},
    {"code": "MN", "name": "Manipur"},
    {"code": "ML", "name": "Meghalaya"},
    {"code": "MZ", "name": "Mizoram"},
    {"code": "NL", "name": "Nagaland"},
    {"code": "OR", "name": "Odisha"},
    {"code": "PB", "name": "Punjab"},
    {"code": "RJ", "name": "Rajasthan"},
    {"code": "SK", "name": "Sikkim"},
    {"code": "TN", "name": "Tamil Nadu"},
    {"code": "TG", "name": "Telangana"},
    {"code": "TR", "name": "Tripura"},
    {"code": "UP", "name": "Uttar Pradesh"},
    {"code": "UT", "name": "Uttarakhand"},
    {"code": "WB", "name": "West Bengal"},
    {"code": "AN", "name": "Andaman and Nicobar Islands"},
    {"code": "CH", "name": "Chandigarh"},
    {"code": "DN", "name": "Dadra and Nagar Haveli and Daman and Diu"},
    {"code": "DL", "name": "Delhi"},
    {"code": "JK", "name": "Jammu and Kashmir"},
    {"code": "LA", "name": "Ladakh"},
    {"code": "LD", "name": "Lakshadweep"},
    {"code": "PY", "name": "Puducherry"}
]

@router.get("/states", response_model=List[Dict[str, str]])
async def get_indian_states():
    """
    Get list of all Indian states and union territories
    Returns list with code and name for each state
    """
    try:
        return INDIAN_STATES
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching states: {str(e)}")

@router.get("/states/names", response_model=List[str])
async def get_indian_state_names():
    """
    Get list of Indian state names only (simplified format)
    """
    try:
        return [state["name"] for state in INDIAN_STATES]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching state names: {str(e)}")