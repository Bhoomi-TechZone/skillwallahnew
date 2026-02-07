from fastapi import APIRouter, Request, Depends, Query, UploadFile, File, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.schemas.lecture import LectureCreate, LectureUpdate, LectureResponse, LectureListResponse
from app.services.lecture_service import (
    create_lecture, get_lectures_by_course, get_lectures_by_module,
    update_lecture, delete_lecture, get_lecture_by_id, update_lecture_video
)
from app.utils.auth import verify_token, get_current_user
from typing import Optional
import aiofiles
import os
from datetime import datetime

lecture_router = APIRouter(prefix="/lectures", tags=["Lectures"])
security = HTTPBearer()

async def get_current_instructor(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current instructor from JWT token"""
    try:
        payload = verify_token(credentials.credentials)
        return payload.get("sub")  # instructor ID
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

@lecture_router.post("/create")
async def create_lecture_endpoint(
    request: Request, 
    payload: LectureCreate,
    instructor_id: str = Depends(get_current_instructor)
):
    """Create a new lecture for a specific course and module"""
    db = request.app.mongodb
    
    # Get franchise context from current user
    current_user = getattr(request.state, 'user', None)
    if current_user and current_user.get('franchise_code'):
        payload.franchise_code = current_user.get('franchise_code')
        payload.franchise_id = current_user.get('franchise_id')
    
    return create_lecture(db, payload, instructor_id)

@lecture_router.get("/course/{course_id}")
async def get_lectures_by_course_endpoint(
    request: Request,
    course_id: str,
    module_id: Optional[str] = Query(None, description="Optional module ID to filter lectures"),
    instructor_id: str = Depends(get_current_instructor)
):
    """Get all lectures for a specific course (and optionally module)"""
    db = request.app.mongodb
    
    # Get branch filter for multi-tenancy
    current_user = getattr(request.state, 'user', None)
    # Fixed BranchAccessManager usage
    branch_filter = access_manager.get_filter_query()
    
    return get_lectures_by_course(db, course_id, instructor_id, module_id, branch_filter)

@lecture_router.get("/module/{module_id}")
async def get_lectures_by_module_endpoint(
    request: Request,
    module_id: str,
    instructor_id: str = Depends(get_current_instructor)
):
    """Get all lectures for a specific module"""
    db = request.app.mongodb
    
    # Get branch filter for multi-tenancy
    current_user = getattr(request.state, 'user', None)
    # Fixed BranchAccessManager usage
    branch_filter = access_manager.get_filter_query()
    
    return get_lectures_by_module(db, module_id, instructor_id, branch_filter)

@lecture_router.get("/{lecture_id}")
async def get_lecture_endpoint(
    request: Request,
    lecture_id: str,
    instructor_id: str = Depends(get_current_instructor)
):
    """Get a specific lecture by ID"""
    db = request.app.mongodb
    
    # Get branch filter for multi-tenancy
    current_user = getattr(request.state, 'user', None)
    # Fixed BranchAccessManager usage
    branch_filter = access_manager.get_filter_query()
    
    return get_lecture_by_id(db, lecture_id, instructor_id, branch_filter)

@lecture_router.put("/{lecture_id}")
async def update_lecture_endpoint(
    request: Request,
    lecture_id: str,
    payload: LectureUpdate,
    instructor_id: str = Depends(get_current_instructor)
):
    """Update a lecture"""
    db = request.app.mongodb
    
    # Get branch filter for multi-tenancy
    current_user = getattr(request.state, 'user', None)
    # Fixed BranchAccessManager usage
    branch_filter = access_manager.get_filter_query()
    
    return update_lecture(db, lecture_id, payload, instructor_id, branch_filter)

@lecture_router.delete("/{lecture_id}")
async def delete_lecture_endpoint(
    request: Request,
    lecture_id: str,
    instructor_id: str = Depends(get_current_instructor)
):
    """Delete a lecture"""
    db = request.app.mongodb
    
    # Get branch filter for multi-tenancy
    current_user = getattr(request.state, 'user', None)
    # Fixed BranchAccessManager usage
    branch_filter = access_manager.get_filter_query()
    
    return delete_lecture(db, lecture_id, instructor_id, branch_filter)

@lecture_router.post("/{lecture_id}/upload-video")
async def upload_lecture_video(
    request: Request,
    lecture_id: str,
    file: UploadFile = File(...),
    instructor_id: str = Depends(get_current_instructor)
):
    """Upload video file for a lecture"""
    db = request.app.mongodb
    
    # Validate file type
    allowed_types = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm']
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a video file (MP4, AVI, MOV, WMV, WebM)"
        )
    
    # Validate file size (500MB max)
    max_size = 500 * 1024 * 1024  # 500MB
    file_size = 0
    
    # Create uploads directory if it doesn't exist
    upload_dir = "/www/wwwroot/Skill_wallah_edtech/uploads/lectures"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"lecture_{lecture_id}_{timestamp}{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    try:
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            while chunk := await file.read(8192):  # Read in 8KB chunks
                file_size += len(chunk)
                if file_size > max_size:
                    # Remove partial file
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=400,
                        detail="File too large. Maximum size is 500MB"
                    )
                await f.write(chunk)
        
        # Generate URL for the uploaded file
        video_url = f"/uploads/lectures/{filename}"
        
        # Update lecture with video URL
        result = update_lecture_video(db, lecture_id, video_url, instructor_id)
        
        return {
            "success": True,
            "message": "Video uploaded successfully",
            "video_url": video_url,
            "filename": filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Clean up file if something went wrong
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# Endpoint to get instructor's lecture statistics
@lecture_router.get("/stats/summary")
async def get_lecture_stats(
    request: Request,
    instructor_id: str = Depends(get_current_instructor)
):
    """Get lecture statistics for the instructor"""
    from app.models.lecture import get_lecture_collection
    
    db = request.app.mongodb
    lecture_collection = get_lecture_collection(db)
    
    # Get branch filter for multi-tenancy
    current_user = getattr(request.state, 'user', None)
    # Fixed BranchAccessManager usage
    branch_filter = access_manager.get_filter_query()
    
    # Build base query with branch filtering
    base_query = {"instructor_id": instructor_id}
    if branch_filter:
        base_query.update(branch_filter)
    
    # Get total lectures
    total_lectures = lecture_collection.count_documents(base_query)
    
    # Get lectures with videos
    video_query = base_query.copy()
    video_query["video_file"] = {"$ne": None, "$exists": True}
    lectures_with_videos = lecture_collection.count_documents(video_query)
    
    # Get lectures by course with franchise filtering
    pipeline = [
        {"$match": base_query},
        {"$group": {
            "_id": "$course_id",
            "count": {"$sum": 1}
        }},
        {"$lookup": {
            "from": "courses",
            "localField": "_id",
            "foreignField": "_id",
            "as": "course"
        }},
        {"$unwind": "$course"},
        {"$project": {
            "course_id": "$_id",
            "course_title": "$course.title",
            "lecture_count": "$count"
        }}
    ]
    
    lectures_by_course = list(lecture_collection.aggregate(pipeline))
    
    return {
        "total_lectures": total_lectures,
        "lectures_with_videos": lectures_with_videos,
        "lectures_without_videos": total_lectures - lectures_with_videos,
        "lectures_by_course": lectures_by_course
    }

