from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from app.schemas.recording import RecordingOut
from app.services.recording_service import (
    get_recordings_for_student,
    get_all_recordings,
    update_recording_view_count
)

recording_router = APIRouter(prefix="/recordings", tags=["Recordings"])

@recording_router.get("/my-recordings", response_model=List[RecordingOut])
async def get_my_recordings(
    limit: int = Query(50, description="Number of recordings to return"),
    request=None
):
    """Get recordings for the authenticated student's enrolled courses"""
    try:
        # Get user info from middleware
        user = getattr(request, 'user', None)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        if user.get('role') != 'student':
            raise HTTPException(status_code=403, detail="Only students can access recordings")
        
        # Get database from app
        db = request.app.mongodb
        
        recordings = await get_recordings_for_student(
            db, 
            user['user_id'], 
            limit=limit
        )
        
        return recordings
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching recordings: {str(e)}")

@recording_router.get("/all", response_model=List[RecordingOut])
async def get_all_recordings_admin(
    skip: int = Query(0, description="Number of recordings to skip"),
    limit: int = Query(50, description="Number of recordings to return"),
    request=None
):
    """Get all recordings (admin/instructor access)"""
    try:
        # Get user info from middleware
        user = getattr(request, 'user', None)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        if user.get('role') not in ['admin', 'instructor']:
            raise HTTPException(status_code=403, detail="Admin or instructor access required")
        
        # Get database from app
        db = request.app.mongodb
        
        recordings = await get_all_recordings(db, skip=skip, limit=limit)
        
        return recordings
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching recordings: {str(e)}")

@recording_router.post("/view/{recording_id}")
async def increment_view_count(
    recording_id: str,
    request=None
):
    """Increment view count for a recording"""
    try:
        # Get user info from middleware
        user = getattr(request, 'user', None)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Get database from app
        db = request.app.mongodb
        
        success = await update_recording_view_count(db, recording_id)
        
        if success:
            return {"success": True, "message": "View count updated"}
        else:
            raise HTTPException(status_code=404, detail="Recording not found")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating view count: {str(e)}")

# Add dependency injection for request object
def get_request_dependency():
    """Dependency to inject request object"""
    pass


