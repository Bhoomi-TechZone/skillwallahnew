from fastapi import HTTPException, Query
from bson import ObjectId
from datetime import datetime
from typing import Optional, List
import os
from pathlib import Path
from app.models.course import get_course_collection
from app.utils.serializers import serialize_document

def serialize_and_fix_course(course_doc):
    """Serialize course document and fix Windows file paths in image fields"""
    serialized = serialize_document(course_doc)
    
    print(f"[DEBUG] Processing course: {serialized.get('title', 'No title')}")
    
    # Define video file extensions
    video_extensions = ('.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm', '.ogg', '.m4v', '.3gp', '.flv', '.asf')
    
    # Fix image paths that might contain Windows absolute paths
    image_fields = ['thumbnail', 'course_image', 'image', 'cover_image', 'featured_image', 'course_thumbnail']
    
    # Check if thumbnail is a video file and store it separately
    original_thumbnail = None
    
    for field in image_fields:
        if field in serialized and serialized[field]:
            image_path = serialized[field]
            original_path = image_path
            
            print(f"[DEBUG] Checking {field}: {image_path}")
            
            # Skip if it's already a proper URL
            if isinstance(image_path, str):
                if image_path.startswith('http') or image_path.startswith('data:'):
                    print(f"[DEBUG] {field} is already a proper URL, skipping")
                    continue
                
                # Check if it's a Windows absolute path
                if ':\\' in image_path or ('://' in image_path and not image_path.startswith('http')):
                    # Extract just the filename
                    filename = image_path.split('\\')[-1].split('/')[-1]
                    if filename:
                        # Check if it's a video file
                        if filename.lower().endswith(video_extensions):
                            print(f"[DEBUG] {field} is a video file ({filename}), storing video info")
                            
                            # Store original video path for later use
                            if field == 'thumbnail':
                                original_thumbnail = image_path
                            
                            # Create proper video URL with streaming support
                            video_url = f"http://localhost:4000/video-serve/{filename}"
                            serialized[f"{field}_video_url"] = video_url
                            serialized[f"{field}_is_video"] = True
                            
                            # Set image field to None for frontend to handle
                            serialized[field] = None
                        else:
                            # Regular image file - use placeholder if file doesn't exist in uploads
                            uploads_path = Path("uploads/courses") / filename
                            if uploads_path.exists():
                                serialized[field] = f"uploads/courses/{filename}"
                                print(f"[DEBUG] Fixed image path for {field}: {original_path} -> {serialized[field]}")
                            else:
                                # Use placeholder image from unsplash
                                serialized[field] = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800"
                                print(f"[DEBUG] File not found in uploads, using placeholder for {field}")
                            serialized[f"{field}_is_video"] = False
                    else:
                        print(f"[DEBUG] Could not extract filename from {original_path}, setting to None")
                        serialized[field] = None
                        serialized[f"{field}_is_video"] = False
                else:
                    # Check if it's a video file extension even without Windows path
                    if image_path.lower().endswith(video_extensions):
                        print(f"[DEBUG] {field} appears to be a video file, storing video info")
                        if field == 'thumbnail':
                            original_thumbnail = image_path
                        serialized[f"{field}_video_url"] = image_path
                        serialized[f"{field}_is_video"] = True
                        serialized[field] = None
                    else:
                        serialized[f"{field}_is_video"] = False
    
    # Add video metadata if thumbnail was a video
    if original_thumbnail:
        serialized['has_video_thumbnail'] = True
        serialized['original_thumbnail_path'] = original_thumbnail
    else:
        serialized['has_video_thumbnail'] = False
    
    return serialized
from app.schemas.course import CourseFilter
from app.utils.notification_utils import create_course_status_notification
import logging

logger = logging.getLogger(__name__)

def calculate_earnings(price: float, commission_type: str, commission_value: float) -> tuple:
    """
    Calculate instructor and platform earnings based on commission structure.
    
    Args:
        price: Course price
        commission_type: 'percentage' or 'fixed'
        commission_value: Commission value (percentage 0-100 or fixed amount)
    
    Returns:
        tuple: (instructor_earn, platform_earn)
    """
    if commission_type == "percentage":
        platform_earn = round(price * commission_value / 100, 2)
    else:  # fixed
        platform_earn = round(min(commission_value, price), 2)  # Cannot exceed course price
    
    instructor_earn = round(price - platform_earn, 2)
    
    return instructor_earn, platform_earn

def create_course(db, course_data):
    """Create a new course with proper timestamps and validation"""
    try:
        collection = get_course_collection(db)
        
        # Convert Pydantic model to dict using model_dump (Pydantic v2)
        if hasattr(course_data, 'model_dump'):
            course_dict = course_data.model_dump()
        else:
            # Fallback for older Pydantic versions
            course_dict = course_data.dict()
        
        course_dict["created_date"] = datetime.utcnow()
        course_dict["last_updated"] = datetime.utcnow()
        course_dict["enrolled_students"] = 0
        course_dict["rating"] = 0.0
        course_dict["total_ratings"] = 0
        course_dict["revenue"] = 0.0
        
        # Set default commission values if not provided
        if "commission_type" not in course_dict:
            course_dict["commission_type"] = "percentage"
        if "commission_value" not in course_dict:
            course_dict["commission_value"] = 0.0
        
        # Set default status if not provided
        if "status" not in course_dict or not course_dict["status"]:
            course_dict["status"] = "Active"
        
        # Calculate instructor and platform earnings
        price = course_dict.get("price", 0.0)
        commission_type = course_dict.get("commission_type", "percentage")
        commission_value = course_dict.get("commission_value", 0.0)
        
        instructor_earn, platform_earn = calculate_earnings(price, commission_type, commission_value)
        course_dict["instructor_earn"] = instructor_earn
        course_dict["platform_earn"] = platform_earn
        
        # Generate course_id based on title
        title = course_dict.get("title", "")
        # Take first 4 characters of title, convert to uppercase, remove special characters
        title_prefix = ''.join(char.upper() for char in title[:4] if char.isalnum())
        
        # Pad with 'X' if less than 4 characters
        while len(title_prefix) < 4:
            title_prefix += 'X'
        
        # Find the next available number for this prefix
        course_count = collection.count_documents({"course_id": {"$regex": f"^{title_prefix}"}})
        course_number = f"{course_count + 1:03d}"  # 3-digit format (001, 002, etc.)
        
        # Generate final course_id
        course_id = f"{title_prefix}{course_number}"
        course_dict["course_id"] = course_id
        
        # Create folder for course content (videos, PDFs, etc.)
        try:
            # Sanitize course name for folder creation
            safe_course_name = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in title)
            safe_course_name = safe_course_name.strip().replace(' ', '_')
            
            # Create course folder path: uploads/courses/{course_id}_{course_name}
            course_folder_name = f"{course_id}_{safe_course_name}"
            course_folder_path = Path("uploads") / "courses" / course_folder_name
            
            # Create main course folder
            course_folder_path.mkdir(parents=True, exist_ok=True)
            
            # Create subfolders for different content types
            (course_folder_path / "lectures").mkdir(exist_ok=True)
            (course_folder_path / "pdfs").mkdir(exist_ok=True)
            (course_folder_path / "assignments").mkdir(exist_ok=True)
            (course_folder_path / "resources").mkdir(exist_ok=True)
            
            # Store folder path in course data
            course_dict["content_folder"] = str(course_folder_path)
            
            print(f"✅ Created course content folder: {course_folder_path}")
            
        except Exception as folder_error:
            print(f"⚠️ Warning: Could not create course folder: {folder_error}")
            # Don't fail course creation if folder creation fails
            course_dict["content_folder"] = None
        
        # Set original_price to price if not provided
        if not course_dict.get("original_price"):
            course_dict["original_price"] = course_dict.get("price", 0.0)
        
        result = collection.insert_one(course_dict)
        
        # Add the ObjectId to course_dict for notification
        course_dict["_id"] = result.inserted_id
        
        # Create notification if course status is "Pending"
        notification_result = create_course_status_notification(db, course_dict)
        if notification_result.get("success"):
            logger.info(f"✅ Course status notification created: {notification_result.get('message')}")
        else:
            logger.warning(f"⚠️ Course status notification failed: {notification_result.get('message')}")
        
        # Return the created course
        created_course = collection.find_one({"_id": result.inserted_id})
        return {
            "success": True, 
            "course_id": str(result.inserted_id),
            "generated_course_id": course_id,
            "course": serialize_and_fix_course(created_course),
            "notification": notification_result
        }
    except Exception as e:
        logger.error(f"❌ Error creating course: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating course: {str(e)}")

def get_all_courses(db, filters: Optional[CourseFilter] = None, skip: int = 0, limit: int = 100, branch_filter: dict = None):
    """Get all courses with optional filtering and pagination, with multi-tenant branch filtering"""
    try:
        collection = get_course_collection(db)
        
        print(f"[DEBUG] Getting courses with filters: category={filters.category if filters else None} level={filters.level if filters else None} published={filters.published if filters else None} min_price={filters.min_price if filters else None} max_price={filters.max_price if filters else None} search={filters.search if filters else None} instructor={filters.instructor if filters else None}")
        
        # Start with branch filter for multi-tenancy (SECURITY: Apply first!)
        query = branch_filter.copy() if branch_filter else {}
        
        # Build additional filter query
        if filters:
            if filters.category:
                query["category"] = {"$regex": filters.category, "$options": "i"}
            if filters.level:
                query["level"] = filters.level
            if filters.published is not None:
                query["published"] = filters.published
            if filters.min_price is not None:
                query["price"] = {"$gte": filters.min_price}
            if filters.max_price is not None:
                if "price" in query:
                    query["price"]["$lte"] = filters.max_price
                else:
                    query["price"] = {"$lte": filters.max_price}
            if filters.search:
                query["$or"] = [
                    {"title": {"$regex": filters.search, "$options": "i"}},
                    {"description": {"$regex": filters.search, "$options": "i"}},
                    {"tags": {"$in": [filters.search]}}
                ]
            if filters.instructor:
                query["instructor"] = filters.instructor
        
        print(f"[DEBUG] MongoDB query: {query}")
        
        # Get total count for pagination
        total_count = collection.count_documents(query)
        print(f"[DEBUG] Total courses in database: {total_count}")
        
        # Get courses with pagination and sorting
        courses = list(collection.find(query)
                      .sort("created_date", -1)
                      .skip(skip)
                      .limit(limit))
        
        print(f"[DEBUG] Retrieved {len(courses)} courses from database")
        
        # Log first few course titles for debugging
        for i, course in enumerate(courses[:3]):
            print(f"[DEBUG] Course {i+1}: {course.get('title', 'No title')} - {course.get('course_id', 'No ID')}")
        
        serialized_courses = [serialize_and_fix_course(course) for course in courses]
        
        result = {
            "courses": serialized_courses,
            "total": total_count,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "per_page": limit,
            "total_pages": (total_count + limit - 1) // limit if limit > 0 else 1
        }
        
        print(f"[DEBUG] Returning {len(result['courses'])} courses to frontend")
        return result
        
    except Exception as e:
        print(f"[ERROR] Error fetching courses: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching courses: {str(e)}")

def get_course_by_id(db, course_id, branch_filter: dict = None):
    """Get a single course by ID with enhanced details, with multi-tenant branch filtering"""
    try:
        collection = get_course_collection(db)
        
        if not ObjectId.is_valid(course_id):
            raise HTTPException(status_code=400, detail="Invalid course ID format")
        
        # Start with branch filter for multi-tenancy (SECURITY: Apply first!)
        query = branch_filter.copy() if branch_filter else {}
        query["_id"] = ObjectId(course_id)
        
        course = collection.find_one(query)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Get additional statistics if needed
        # You can add more aggregation here for enrolled students, etc.
        
        return serialize_and_fix_course(course)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching course: {str(e)}")

def update_course(db, course_id, updates):
    """Update a course with proper validation and timestamps"""
    try:
        collection = get_course_collection(db)
        
        if not ObjectId.is_valid(course_id):
            raise HTTPException(status_code=400, detail="Invalid course ID format")
        
        # Check if course exists
        existing_course = collection.find_one({"_id": ObjectId(course_id)})
        if not existing_course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Prepare update data
        if hasattr(updates, 'model_dump'):
            update_data = updates.model_dump(exclude_unset=True)
        else:
            # Fallback for older Pydantic versions
            update_data = updates.dict(exclude_unset=True)
        if update_data:
            update_data["last_updated"] = datetime.utcnow()
            
            # Validate original_price vs price if both are being updated
            if "price" in update_data and "original_price" in update_data:
                if update_data["original_price"] < update_data["price"]:
                    raise HTTPException(status_code=400, detail="Original price must be >= current price")
            
            # Check if status is changing to "Pending" for notification
            old_status = existing_course.get("status", "Active")
            new_status = update_data.get("status")
            status_changed_to_pending = (new_status and new_status == "Pending" and old_status != "Pending")
            
            # Recalculate earnings if price or commission values changed
            needs_earnings_recalc = any(key in update_data for key in ["price", "commission_type", "commission_value"])
            
            if needs_earnings_recalc:
                # Get current and updated values
                current_price = existing_course.get("price", 0.0)
                current_commission_type = existing_course.get("commission_type", "percentage")
                current_commission_value = existing_course.get("commission_value", 0.0)
                
                new_price = update_data.get("price", current_price)
                new_commission_type = update_data.get("commission_type", current_commission_type)
                new_commission_value = update_data.get("commission_value", current_commission_value)
                
                # Calculate new earnings
                instructor_earn, platform_earn = calculate_earnings(new_price, new_commission_type, new_commission_value)
                update_data["instructor_earn"] = instructor_earn
                update_data["platform_earn"] = platform_earn
            
            result = collection.update_one(
                {"_id": ObjectId(course_id)},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                return {"success": True, "message": "No changes made to course"}
            
            # Create notification if status changed to "Pending"
            notification_result = None
            if status_changed_to_pending:
                updated_course = collection.find_one({"_id": ObjectId(course_id)})
                notification_result = create_course_status_notification(db, serialize_document(updated_course))
                if notification_result.get("success"):
                    logger.info(f"✅ Course status change notification created: {notification_result.get('message')}")
                else:
                    logger.warning(f"⚠️ Course status change notification failed: {notification_result.get('message')}")
            
            # Return updated course
            updated_course = collection.find_one({"_id": ObjectId(course_id)})
            response_data = {
                "success": True, 
                "message": "Course updated successfully",
                "course": serialize_document(updated_course)
            }
            
            if notification_result:
                response_data["notification"] = notification_result
            
            return response_data
        else:
            return {"success": True, "message": "No changes to update"}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating course: {str(e)}")

def delete_course(db, course_id):
    """Delete a course with proper validation"""
    try:
        collection = get_course_collection(db)
        
        if not ObjectId.is_valid(course_id):
            raise HTTPException(status_code=400, detail="Invalid course ID format")
        
        # Check if course exists
        course = collection.find_one({"_id": ObjectId(course_id)})
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Check if course has enrolled students (optional protection)
        if course.get("enrolled_students", 0) > 0:
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete course with enrolled students. Please transfer students first."
            )
        
        result = collection.delete_one({"_id": ObjectId(course_id)})
        
        if result.deleted_count == 1:
            return {
                "success": True, 
                "message": "Course deleted successfully",
                "deleted_course": serialize_document(course)
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to delete course")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting course: {str(e)}")

def get_courses_by_instructor(db, instructor_id, published_only: bool = False, branch_filter: dict = None):
    """Get all courses for a specific instructor with total count, with multi-tenant branch filtering"""
    try:
        collection = get_course_collection(db)
        
        # Start with branch filter for multi-tenancy (SECURITY: Apply first!)
        query = branch_filter.copy() if branch_filter else {}
        
        # Query for courses by instructor - check both 'instructor' and 'created_by' fields
        instructor_query = {
            "$or": [
                {"instructor": instructor_id},
                {"created_by": instructor_id}
            ]
        }
        
        # Combine branch filter with instructor filter
        if query:
            query = {"$and": [query, instructor_query]}
        else:
            query = instructor_query
        
        if published_only:
            if "$and" in query:
                query["$and"].append({"published": True})
            else:
                query["published"] = True
        
        # Get courses sorted by creation date (newest first)
        courses = list(collection.find(query).sort("created_date", -1))
        total_courses = len(courses)
        
        # Serialize the courses
        serialized_courses = [serialize_document(course) for course in courses]
        
        # Return the format expected by frontend
        return {
            "success": True,
            "data": {
                "total_courses": total_courses,
                "courses": serialized_courses
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching instructor courses: {str(e)}")

def get_course_statistics(db, course_id, branch_filter: dict = None):
    """Get detailed statistics for a course, with multi-tenant branch filtering"""
    try:
        collection = get_course_collection(db)
        
        if not ObjectId.is_valid(course_id):
            raise HTTPException(status_code=400, detail="Invalid course ID format")
        
        # Start with branch filter for multi-tenancy (SECURITY: Apply first!)
        query = branch_filter.copy() if branch_filter else {}
        query["_id"] = ObjectId(course_id)
        
        course = collection.find_one(query)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Add more statistics calculations here as needed
        # e.g., completion rates, revenue, etc.
        
        stats = {
            "course_id": course_id,
            "enrolled_students": course.get("enrolled_students", 0),
            "rating": course.get("rating", 0.0),
            "total_ratings": course.get("total_ratings", 0),
            "revenue": course.get("revenue", 0.0),
            "created_date": course.get("created_date"),
            "last_updated": course.get("last_updated")
        }
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching course statistics: {str(e)}")

def bulk_update_courses(db, course_ids: List[str], updates: dict):
    """Bulk update multiple courses"""
    try:
        collection = get_course_collection(db)
        
        # Validate all course IDs
        object_ids = []
        for course_id in course_ids:
            if not ObjectId.is_valid(course_id):
                raise HTTPException(status_code=400, detail=f"Invalid course ID format: {course_id}")
            object_ids.append(ObjectId(course_id))
        
        # Prepare update data
        update_data = updates.copy()
        update_data["last_updated"] = datetime.utcnow()
        
        result = collection.update_many(
            {"_id": {"$in": object_ids}},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "message": f"Updated {result.modified_count} courses",
            "matched_count": result.matched_count,
            "modified_count": result.modified_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error bulk updating courses: {str(e)}")
