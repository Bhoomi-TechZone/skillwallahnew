from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from app.models.lecture import get_lecture_collection
from app.schemas.lecture import LectureCreate, LectureUpdate
import logging

logger = logging.getLogger(__name__)

def create_lecture(db, payload: LectureCreate, instructor_id: str) -> Dict[str, Any]:
    """Create a new lecture for a specific course and module"""
    try:
        lecture_collection = get_lecture_collection(db)
        
        # Verify course belongs to instructor
        course_collection = db["courses"]
        course = course_collection.find_one({
            "_id": ObjectId(payload.course_id),
            "instructor_id": instructor_id
        })
        
        if not course:
            raise HTTPException(
                status_code=404, 
                detail="Course not found or you don't have permission to add lectures to it"
            )
        
        # Verify module belongs to the course (if module_id is provided)
        if payload.module_id:
            module_collection = db["modules"]
            module = module_collection.find_one({
                "_id": ObjectId(payload.module_id),
                "course_id": payload.course_id
            })
            
            if not module:
                raise HTTPException(
                    status_code=404,
                    detail="Module not found or doesn't belong to the specified course"
                )
        
        # Create lecture document
        lecture_doc = {
            "title": payload.title,
            "description": payload.description,
            "course_id": payload.course_id,
            "module_id": payload.module_id,
            "instructor_id": instructor_id,
            "video_file": None,
            "duration": payload.duration,
            "order": payload.order or 0,
            "tags": payload.tags or [],
            "is_published": payload.is_published if payload.is_published is not None else False,
            "uploaded_at": datetime.now(timezone.utc),
            "updated_at": None
        }
        
        result = lecture_collection.insert_one(lecture_doc)
        
        # Return the created lecture
        created_lecture = lecture_collection.find_one({"_id": result.inserted_id})
        created_lecture["id"] = str(created_lecture["_id"])
        del created_lecture["_id"]
        
        return {
            "success": True,
            "message": "Lecture created successfully",
            "lecture": created_lecture
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating lecture: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create lecture")

def get_lectures_by_course(db, course_id: str, instructor_id: str, module_id: Optional[str] = None, branch_filter: dict = None) -> Dict[str, Any]:
    """Get all lectures for a specific course (with proper course isolation)"""
    try:
        lecture_collection = get_lecture_collection(db)
        
        # Build query with proper course isolation and branch filtering
        query = {
            "course_id": course_id,
            "instructor_id": instructor_id  # Ensure only instructor's content is returned
        }
        
        # Apply branch filtering for multi-tenancy
        if branch_filter:
            query.update(branch_filter)
        
        # Add module filter if provided
        if module_id:
            query["module_id"] = module_id
        
        # Get lectures sorted by order and then by upload date
        lectures = list(lecture_collection.find(query).sort([
            ("order", 1),
            ("uploaded_at", -1)
        ]))
        
        # Convert ObjectId to string for JSON serialization
        for lecture in lectures:
            lecture["id"] = str(lecture["_id"])
            del lecture["_id"]
        
        return {
            "success": True,
            "lectures": lectures,
            "total": len(lectures),
            "course_id": course_id,
            "module_id": module_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lectures by course: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve lectures")

def get_lectures_by_module(db, module_id: str, instructor_id: str) -> Dict[str, Any]:
    """Get all lectures for a specific module (with proper course isolation)"""
    try:
        lecture_collection = get_lecture_collection(db)
        
        # Get module info to verify course ownership
        module_collection = db["modules"]
        module = module_collection.find_one({"_id": ObjectId(module_id)})
        
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        
        # Verify course belongs to instructor
        course_collection = db["courses"]
        course = course_collection.find_one({
            "_id": ObjectId(module["course_id"]),
            "instructor_id": instructor_id
        })
        
        if not course:
            raise HTTPException(
                status_code=404,
                detail="You don't have permission to view lectures from this module"
            )
        
        # Get lectures with proper isolation
        query = {
            "module_id": module_id,
            "course_id": module["course_id"],
            "instructor_id": instructor_id
        }
        
        lectures = list(lecture_collection.find(query).sort([
            ("order", 1),
            ("uploaded_at", -1)
        ]))
        
        # Convert ObjectId to string
        for lecture in lectures:
            lecture["id"] = str(lecture["_id"])
            del lecture["_id"]
        
        return {
            "success": True,
            "lectures": lectures,
            "total": len(lectures),
            "module_id": module_id,
            "course_id": module["course_id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lectures by module: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve lectures")

def get_lecture_by_id(db, lecture_id: str, instructor_id: str) -> Dict[str, Any]:
    """Get a specific lecture by ID (with ownership verification)"""
    try:
        lecture_collection = get_lecture_collection(db)
        
        lecture = lecture_collection.find_one({
            "_id": ObjectId(lecture_id),
            "instructor_id": instructor_id  # Ensure ownership
        })
        
        if not lecture:
            raise HTTPException(
                status_code=404,
                detail="Lecture not found or you don't have permission to view it"
            )
        
        lecture["id"] = str(lecture["_id"])
        del lecture["_id"]
        
        return {
            "success": True,
            "lecture": lecture
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lecture by ID: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve lecture")

def update_lecture(db, lecture_id: str, payload: LectureUpdate, instructor_id: str) -> Dict[str, Any]:
    """Update a lecture (with ownership verification)"""
    try:
        lecture_collection = get_lecture_collection(db)
        
        # Verify lecture ownership
        existing_lecture = lecture_collection.find_one({
            "_id": ObjectId(lecture_id),
            "instructor_id": instructor_id
        })
        
        if not existing_lecture:
            raise HTTPException(
                status_code=404,
                detail="Lecture not found or you don't have permission to update it"
            )
        
        # Build update document
        update_doc = {"updated_at": datetime.now(timezone.utc)}
        
        if payload.title is not None:
            update_doc["title"] = payload.title
        if payload.description is not None:
            update_doc["description"] = payload.description
        if payload.module_id is not None:
            # Verify module belongs to the same course
            if payload.module_id:
                module_collection = db["modules"]
                module = module_collection.find_one({
                    "_id": ObjectId(payload.module_id),
                    "course_id": existing_lecture["course_id"]
                })
                if not module:
                    raise HTTPException(
                        status_code=400,
                        detail="Module doesn't belong to the same course"
                    )
            update_doc["module_id"] = payload.module_id
        if payload.duration is not None:
            update_doc["duration"] = payload.duration
        if payload.order is not None:
            update_doc["order"] = payload.order
        if payload.tags is not None:
            update_doc["tags"] = payload.tags
        if payload.is_published is not None:
            update_doc["is_published"] = payload.is_published
        
        # Update the lecture
        result = lecture_collection.update_one(
            {"_id": ObjectId(lecture_id)},
            {"$set": update_doc}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="No changes were made")
        
        # Return updated lecture
        updated_lecture = lecture_collection.find_one({"_id": ObjectId(lecture_id)})
        updated_lecture["id"] = str(updated_lecture["_id"])
        del updated_lecture["_id"]
        
        return {
            "success": True,
            "message": "Lecture updated successfully",
            "lecture": updated_lecture
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lecture: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update lecture")

def delete_lecture(db, lecture_id: str, instructor_id: str) -> Dict[str, Any]:
    """Delete a lecture (with ownership verification)"""
    try:
        lecture_collection = get_lecture_collection(db)
        
        # Verify lecture ownership before deletion
        existing_lecture = lecture_collection.find_one({
            "_id": ObjectId(lecture_id),
            "instructor_id": instructor_id
        })
        
        if not existing_lecture:
            raise HTTPException(
                status_code=404,
                detail="Lecture not found or you don't have permission to delete it"
            )
        
        # Delete the lecture
        result = lecture_collection.delete_one({
            "_id": ObjectId(lecture_id),
            "instructor_id": instructor_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=400, detail="Failed to delete lecture")
        
        # TODO: Also delete the video file from storage if it exists
        if existing_lecture.get("video_file"):
            import os
            video_path = f"/www/wwwroot/Skill_wallah_edtech{existing_lecture['video_file']}"
            if os.path.exists(video_path):
                try:
                    os.remove(video_path)
                except Exception as e:
                    logger.warning(f"Failed to delete video file: {str(e)}")
        
        return {
            "success": True,
            "message": "Lecture deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting lecture: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete lecture")

def update_lecture_video(db, lecture_id: str, video_url: str, instructor_id: str) -> Dict[str, Any]:
    """Update lecture with video URL (with ownership verification)"""
    try:
        lecture_collection = get_lecture_collection(db)
        
        # Verify lecture ownership
        existing_lecture = lecture_collection.find_one({
            "_id": ObjectId(lecture_id),
            "instructor_id": instructor_id
        })
        
        if not existing_lecture:
            raise HTTPException(
                status_code=404,
                detail="Lecture not found or you don't have permission to update it"
            )
        
        # Update with video URL
        result = lecture_collection.update_one(
            {"_id": ObjectId(lecture_id)},
            {
                "$set": {
                    "video_file": video_url,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to update lecture with video")
        
        return {
            "success": True,
            "message": "Lecture video updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lecture video: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update lecture video")
