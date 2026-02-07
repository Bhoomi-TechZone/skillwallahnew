from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from app.models.user_progress import (
    get_user_progress_collection, 
    upsert_user_progress,
    get_user_course_progress,
    get_user_content_progress,
    get_course_completion_stats,
    get_module_completion_status,
    get_completed_modules
)
from app.utils.auth import get_authenticated_user
import logging

logger = logging.getLogger(__name__)
progress_router = APIRouter(prefix="/api", tags=["progress"])

class ProgressUpdateRequest(BaseModel):
    course_id: str
    content_id: str
    module_id: Optional[str] = None
    content_type: str = "video"
    watched_duration: float
    total_duration: float
    completed: Optional[bool] = None

class MarkCompleteRequest(BaseModel):
    course_id: str
    content_id: str
    module_id: Optional[str] = None
    content_type: str = "video"

class ModuleCheckRequest(BaseModel):
    modules_data: List[dict]  # List of {module_id: str, content_ids: List[str]}

class BatchProgressUpdate(BaseModel):
    updates: List[ProgressUpdateRequest]


@progress_router.post("/progress/update")
async def update_progress(request: Request, data: ProgressUpdateRequest, current_user = Depends(get_authenticated_user)):
    """Update users progress for a specific content item - Optimized for speed"""
    try:
        current_user_id = current_user.get("id") or current_user.get("user_id")
        if not current_user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        db = request.app.mongodb
        
        # Validate durations - Allow seeking ahead
        if data.watched_duration < 0:
            data.watched_duration = 0
        if data.total_duration <= 0:
            raise HTTPException(status_code=400, detail="Invalid total duration")
        
        # Allow seeking ahead - don't cap watched_duration at total_duration
        # This handles cases where user seeks forward
        
        # Update progress in database
        progress = upsert_user_progress(
            db=db,
            user_id=current_user_id,
            course_id=data.course_id,
            module_id=data.module_id,
            content_id=data.content_id,
            content_type=data.content_type,
            watched_duration=data.watched_duration,
            total_duration=data.total_duration,
            completed=data.completed
        )
        
        # Log completion for debugging
        if progress.get("completed"):
            logger.info(f"Content {data.content_id} marked as COMPLETED for user {current_user_id}")
        
        # Lightweight response for speed
        return {
            "success": True,
            "progress": {
                "content_id": progress["content_id"],
                "completion_percentage": progress["completion_percentage"],
                "completed": progress["completed"],
                "last_position": progress["last_position"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating progress: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@progress_router.post("/progress/mark-complete")
async def mark_complete(request: Request, data: MarkCompleteRequest, current_user = Depends(get_authenticated_user)):
    """Mark a content item as completed"""
    try:
        current_user_id = current_user.get("id") or current_user.get("user_id")
        if not current_user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        db = request.app.mongodb
        
        # Get existing progress or create new one
        existing_progress = get_user_content_progress(db, current_user_id, data.course_id, data.content_id)
        
        if existing_progress:
            watched_duration = existing_progress["total_duration"]  # Mark as fully watched
            total_duration = existing_progress["total_duration"]
        else:
            # For manual completion without duration data
            watched_duration = 1.0
            total_duration = 1.0
        
        # Update progress as completed
        progress = upsert_user_progress(
            db=db,
            user_id=current_user_id,
            course_id=data.course_id,
            module_id=data.module_id,
            content_id=data.content_id,
            content_type=data.content_type,
            watched_duration=watched_duration,
            total_duration=total_duration,
            completed=True
        )
        
        logger.info(f"Content marked as complete for user {current_user_id}, course {data.course_id}, content {data.content_id}")
        
        return {
            "success": True,
            "message": "Content marked as completed",
            "progress": {
                "content_id": progress["content_id"],
                "completed": progress["completed"],
                "completed_at": progress["completed_at"].isoformat() if progress.get("completed_at") else None
            }
        }
        
    except Exception as e:
        logger.error(f"Error marking content as complete: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@progress_router.get("/progress/course/{course_id}")
async def get_course_progress(request: Request, course_id: str, current_user = Depends(get_authenticated_user)):
    """Get all progress items for a user in a specific course"""
    try:
        current_user_id = current_user.get("id") or current_user.get("user_id")
        if not current_user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        db = request.app.mongodb
        
        # Get all progress items for this course
        progress_items = get_user_course_progress(db, current_user_id, course_id)
        
        # Get completion stats
        stats = get_course_completion_stats(db, current_user_id, course_id)
        
        # Check if course is 100% complete and trigger certificate generation
        completion_percentage = stats.get("completion_percentage", 0)
        if completion_percentage >= 100:
            # Check if certificate already exists
            from bson import ObjectId
            from datetime import datetime
            
            try:
                course_obj_id = ObjectId(course_id) if isinstance(course_id, str) else course_id
                user_obj_id = ObjectId(current_user_id) if isinstance(current_user_id, str) else current_user_id
                
                existing_cert = db.certificates.find_one({
                    "student_id": user_obj_id,
                    "course_id": course_obj_id
                })
                
                if not existing_cert:
                    # Generate certificate
                    logger.info(f"Auto-generating certificate for user {current_user_id}, course {course_id}")
                    
                    # Get course and user details
                    course = db.courses.find_one({"_id": course_obj_id})
                    user = db.users.find_one({"_id": user_obj_id})
                    
                    # Get instructor details
                    instructor = None
                    if course and course.get("instructor"):
                        instructor_id = ObjectId(course["instructor"]) if isinstance(course["instructor"], str) else course["instructor"]
                        instructor = db.users.find_one({"_id": instructor_id})
                    
                    # Import certificate ID generation function
                    from app.services.certificate_service import generate_certificate_id
                    
                    # Generate unique certificate number
                    completion_date = datetime.utcnow().strftime("%Y-%m-%d")
                    certificate_number = generate_certificate_id(db, completion_date)
                    
                    # Create certificate document
                    cert_doc = {
                        "student_id": user_obj_id,
                        "course_id": course_obj_id,
                        "student_name": user.get("name", "Student") if user else "Student",
                        "course_name": course.get("title", "Course") if course else "Course",
                        "instructor_name": instructor.get("name", "Instructor") if instructor else "Instructor",
                        "completion_date": completion_date,
                        "issued_on": datetime.utcnow(),
                        "course_duration": course.get("duration", "N/A") if course else "N/A",
                        "status": "issued",
                        "verified": True,
                        "score": stats.get("completion_percentage", 100),
                        "certificate_number": certificate_number,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                    
                    result = db.certificates.insert_one(cert_doc)
                    logger.info(f"Certificate created with ID: {result.inserted_id}, Number: {certificate_number}")
                    stats["certificate_generated"] = True
                    stats["certificate_id"] = str(result.inserted_id)
                    stats["certificate_number"] = certificate_number
                else:
                    logger.info(f"Certificate already exists for user {current_user_id}, course {course_id}")
                    stats["certificate_exists"] = True
                    stats["certificate_id"] = str(existing_cert["_id"])
                    
            except Exception as cert_error:
                logger.error(f"Error generating certificate: {str(cert_error)}")
                # Don't fail the entire request if certificate generation fails
                stats["certificate_error"] = str(cert_error)
        
        # Format progress items for frontend
        formatted_progress = []
        completed_count = 0
        for item in progress_items:
            formatted_item = {
                "content_id": item["content_id"],
                "module_id": item.get("module_id"),
                "content_type": item.get("content_type", "video"),
                "watched_duration": item.get("watched_duration", 0),
                "total_duration": item.get("total_duration", 0),
                "completion_percentage": item.get("completion_percentage", 0),
                "completed": item.get("completed", False),
                "last_position": item.get("last_position", 0),
                "created_at": item["created_at"].isoformat() if item.get("created_at") else None,
                "updated_at": item["updated_at"].isoformat() if item.get("updated_at") else None,
                "completed_at": item["completed_at"].isoformat() if item.get("completed_at") else None
            }
            formatted_progress.append(formatted_item)
            if item.get("completed", False):
                completed_count += 1
        
        logger.info(f"Retrieved {len(formatted_progress)} progress items for course {course_id}, {completed_count} completed")
        
        return {
            "success": True,
            "progress": formatted_progress,
            "stats": stats
        }
        
    except Exception as e:
        logger.error(f"Error getting course progress: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@progress_router.get("/progress/stats/{course_id}")
async def get_progress_stats(request: Request, course_id: str, current_user = Depends(get_authenticated_user)):
    """Get overall progress statistics for a course"""
    try:
        current_user_id = current_user.get("id") or current_user.get("user_id")
        if not current_user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        db = request.app.mongodb
        
        stats = get_course_completion_stats(db, current_user_id, course_id)
        
        return {
            "success": True,
            "stats": stats
        }
        
    except Exception as e:
        logger.error(f"Error getting progress stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@progress_router.post("/progress/modules/check-completion/{course_id}")
async def check_module_completion(
    request: Request, 
    course_id: str, 
    data: ModuleCheckRequest,
    current_user = Depends(get_authenticated_user)
):
    """Check which modules are completed for module locking logic"""
    try:
        current_user_id = current_user.get("id") or current_user.get("user_id")
        if not current_user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        db = request.app.mongodb
        
        # Get completed modules
        completed_module_ids = get_completed_modules(db, current_user_id, course_id, data.modules_data)
        
        return {
            "success": True,
            "completed_modules": completed_module_ids
        }
        
    except Exception as e:
        logger.error(f"Error checking module completion: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@progress_router.post("/progress/batch-update")
async def batch_update_progress(request: Request, data: BatchProgressUpdate, current_user = Depends(get_authenticated_user)):
    """Batch update multiple progress items - Ultra-fast for multiple updates"""
    try:
        current_user_id = current_user.get("id") or current_user.get("user_id")
        if not current_user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        db = request.app.mongodb
        results = []
        
        # Process all updates
        for update_data in data.updates:
            try:
                progress = upsert_user_progress(
                    db=db,
                    user_id=current_user_id,
                    course_id=update_data.course_id,
                    module_id=update_data.module_id,
                    content_id=update_data.content_id,
                    content_type=update_data.content_type,
                    watched_duration=update_data.watched_duration,
                    total_duration=update_data.total_duration,
                    completed=update_data.completed
                )
                results.append({
                    "content_id": progress["content_id"],
                    "success": True
                })
            except Exception as e:
                results.append({
                    "content_id": update_data.content_id,
                    "success": False,
                    "error": str(e)
                })
        
        return {
            "success": True,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error in batch update: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@progress_router.post("/progress/test-data")
async def add_test_progress_data(request: Request, current_user = Depends(get_authenticated_user)):
    """Add some test progress data for testing the progress display"""
    try:
        current_user_id = current_user.get("id") or current_user.get("user_id")
        if not current_user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        db = request.app.mongodb
        
        # Get user's enrolled courses
        from bson import ObjectId
        enrollments = db.enrollments.find({"student_id": ObjectId(current_user_id)})
        
        results = []
        for enrollment in enrollments:
            course_id = str(enrollment.get("course_id"))
            course = db.courses.find_one({"_id": enrollment.get("course_id")})
            
            if course:
                # Add some dummy progress data (like the user watched 50% of a video)
                progress = upsert_user_progress(
                    db=db,
                    user_id=current_user_id,
                    course_id=course_id,
                    module_id="test-module-1",
                    content_id="test-video-1",
                    content_type="video",
                    watched_duration=300.0,  # 5 minutes watched
                    total_duration=600.0,    # 10 minutes total (50% progress)
                    completed=False
                )
                
                # Add another completed content
                progress2 = upsert_user_progress(
                    db=db,
                    user_id=current_user_id,
                    course_id=course_id,
                    module_id="test-module-1",
                    content_id="test-video-2",
                    content_type="video",
                    watched_duration=600.0,  # 10 minutes watched
                    total_duration=600.0,    # 10 minutes total (100% progress)
                    completed=True
                )
                
                results.append({
                    "course_id": course_id,
                    "course_title": course.get("title"),
                    "progress_added": [progress, progress2]
                })
        
        # Recalculate stats for all courses
        stats_results = []
        for enrollment in db.enrollments.find({"student_id": ObjectId(current_user_id)}):
            course_id = str(enrollment.get("course_id"))
            stats = get_course_completion_stats(db, current_user_id, course_id)
            stats_results.append({
                "course_id": course_id,
                "stats": stats
            })
        
        return {
            "success": True,
            "message": "Test progress data added successfully",
            "results": results,
            "recalculated_stats": stats_results
        }
        
    except Exception as e:
        logger.error(f"Error adding test progress data: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


