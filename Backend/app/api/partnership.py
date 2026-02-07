
from fastapi import APIRouter, status, HTTPException, Request
from app.schemas.partnership import PartnershipRequest
from app.services.partnership_service import save_partnership_request, get_all_partnership_requests, update_partnership_status
from typing import List, Dict, Any
from pydantic import BaseModel

router = APIRouter()


class StatusUpdate(BaseModel):
    status: str


@router.post("/partnership_request", status_code=status.HTTP_201_CREATED)
async def submit_partnership_request(request: PartnershipRequest, app_request: Request):
    try:
        inserted_id = save_partnership_request(request, app_request)
        return {"message": "Partnership request submitted successfully.", "id": inserted_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit partnership request: {str(e)}")


@router.get("/partnership_requests", status_code=status.HTTP_200_OK)
async def get_all_partnerships(app_request: Request) -> Dict[str, Any]:
    try:
        partnerships = get_all_partnership_requests(app_request)
        return {
            "message": "Partnership requests retrieved successfully",
            "count": len(partnerships),
            "data": partnerships
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve partnership requests: {str(e)}")


@router.post("/partnership_requests", status_code=status.HTTP_201_CREATED)
async def submit_partnership_request_plural(request: PartnershipRequest, app_request: Request):
    try:
        inserted_id = save_partnership_request(request, app_request)
        return {"message": "Partnership request submitted successfully.", "id": inserted_id, "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit partnership request: {str(e)}")


@router.put("/partnership_requests/{partnership_id}/status", status_code=status.HTTP_200_OK)
async def update_partnership_request_status(partnership_id: str, status_update: StatusUpdate, app_request: Request):
    """
    Update the status of a partnership request
    """
    try:
        success = update_partnership_status(partnership_id, status_update.status, app_request)
        if success:
            return {
                "message": f"Partnership status updated to {status_update.status} successfully",
                "partnership_id": partnership_id,
                "status": status_update.status
            }
        else:
            raise HTTPException(status_code=404, detail="Partnership request not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update partnership status: {str(e)}")


