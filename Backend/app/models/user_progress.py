from datetime import datetime
from pymongo import IndexModel, ASCENDING, DESCENDING
from bson import ObjectId
import uuid
import logging

logger = logging.getLogger(__name__)

def get_user_progress_collection(db):
    """Get the user_progress collection with proper indexing"""
    collection = db["user_progress"]
    
    # Create indexes for better performance
    indexes = [
        IndexModel([("user_id", ASCENDING)]),  # User filter
        IndexModel([("course_id", ASCENDING)]),  # Course filter
        IndexModel([("module_id", ASCENDING)]),  # Module filter
        IndexModel([("content_id", ASCENDING)]),  # Content filter
        IndexModel([("user_id", ASCENDING), ("course_id", ASCENDING)]),  # Compound index
        IndexModel([("user_id", ASCENDING), ("course_id", ASCENDING), ("content_id", ASCENDING)]),  # Unique progress tracking
        IndexModel([("completed", ASCENDING)]),  # Completion status
        IndexModel([("created_at", DESCENDING)]),  # Sort by creation date
        IndexModel([("updated_at", DESCENDING)]),  # Sort by update date
    ]
    
    try:
        collection.create_indexes(indexes)
    except Exception as e:
        # Index creation might fail if they already exist, which is fine
        pass
    
    return collection

def upsert_user_progress(db, user_id, course_id, module_id, content_id, 
                        content_type="video", watched_duration=0.0, total_duration=0.0, 
                        completed=None):
    """Insert or update user progress with optimized logic"""
    collection = get_user_progress_collection(db)
    from datetime import datetime
    
    # Calculate completion percentage
    completion_percentage = (watched_duration / total_duration) * 100 if total_duration > 0 else 0.0
    
    # Auto-complete if watched 95% or more (even if completed is None)
    if completion_percentage >= 95.0:
        if completed is None:
            completed = True
    
    now = datetime.utcnow()
    
    # Check if progress already exists
    existing_progress = collection.find_one({
        "user_id": user_id,
        "course_id": course_id,
        "content_id": content_id
    })
    
    if existing_progress:
        # Update existing progress
        # Track the maximum position reached (for seeking ahead)
        max_position = max(
            existing_progress.get("max_position_reached", 0),
            watched_duration
        )
        
        update_data = {
            "watched_duration": watched_duration,
            "total_duration": total_duration,
            "completion_percentage": completion_percentage,
            "updated_at": now,
            "last_position": watched_duration,
            "max_position_reached": max_position  # Track farthest point reached
        }
        
        # Update module_id if provided and not set
        if module_id and not existing_progress.get("module_id"):
            update_data["module_id"] = module_id
        
        # VALIDATE: Only mark as completed if percentage >= 95%
        # This prevents incorrect completion from frontend bugs
        if completed is not None and completed:
            # Frontend requested completion - validate it
            if completion_percentage >= 95.0:
                update_data["completed"] = True
                if not existing_progress.get("completed"):
                    update_data["completed_at"] = now
                logger.info(f"Content {content_id} marked as COMPLETED (validated: {completion_percentage:.1f}%)")
            else:
                # Reject invalid completion request
                logger.warning(f"Rejecting completion for {content_id} - only {completion_percentage:.1f}% (need >= 95%)")
                update_data["completed"] = False
                update_data["completed_at"] = None
        elif completed is not None and not completed:
            # Explicitly marking as not completed
            update_data["completed"] = False
            update_data["completed_at"] = None
        # Auto-complete based on percentage
        elif completion_percentage >= 95.0 and not existing_progress.get("completed"):
            update_data["completed"] = True
            update_data["completed_at"] = now
            logger.info(f"Content {content_id} AUTO-COMPLETED at {completion_percentage:.1f}%")
        
        collection.update_one(
            {"_id": existing_progress["_id"]},
            {"$set": update_data}
        )
        
        # Return updated document
        return collection.find_one({"_id": existing_progress["_id"]})
    else:
        # Create new progress
        # VALIDATE: Only mark as completed if percentage >= 95%
        is_completed = False
        completed_timestamp = None
        
        if completed and completion_percentage >= 95.0:
            is_completed = True
            completed_timestamp = now
            logger.info(f"New content {content_id} created as COMPLETED (validated: {completion_percentage:.1f}%)")
        elif completed and completion_percentage < 95.0:
            logger.warning(f"Rejecting completion for new content {content_id} - only {completion_percentage:.1f}% (need >= 95%)")
        elif completion_percentage >= 95.0:
            is_completed = True
            completed_timestamp = now
            logger.info(f"New content {content_id} AUTO-COMPLETED at {completion_percentage:.1f}%")
        
        new_progress = {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "course_id": course_id,
            "module_id": module_id,
            "content_id": content_id,
            "content_type": content_type,
            "watched_duration": watched_duration,
            "total_duration": total_duration,
            "completion_percentage": completion_percentage,
            "completed": is_completed,
            "created_at": now,
            "updated_at": now,
            "completed_at": completed_timestamp,
            "notes": None,
            "last_position": watched_duration,
            "max_position_reached": watched_duration  # Track farthest point reached
        }
        
        collection.insert_one(new_progress)
        return new_progress

def get_user_course_progress(db, user_id, course_id):
    """Get all progress for a user in a specific course"""
    collection = get_user_progress_collection(db)
    
    return list(collection.find({
        "user_id": user_id,
        "course_id": course_id
    }).sort("created_at", ASCENDING))

def get_user_content_progress(db, user_id, course_id, content_id):
    """Get progress for a specific content item"""
    collection = get_user_progress_collection(db)
    
    return collection.find_one({
        "user_id": user_id,
        "course_id": course_id,
        "content_id": content_id
    })

def get_course_completion_stats(db, user_id, course_id):
    """Get overall completion statistics for a course"""
    collection = get_user_progress_collection(db)
    
    # Get all progress for the course
    progress_items = list(collection.find({
        "user_id": user_id,
        "course_id": course_id
    }))
    
    if not progress_items:
        return {
            "total_items": 0,
            "completed_items": 0,
            "completion_percentage": 0.0,
            "total_watch_time": 0.0
        }
    
    total_items = len(progress_items)
    completed_items = sum(1 for item in progress_items if item.get("completed", False))
    total_watch_time = sum(item.get("watched_duration", 0.0) for item in progress_items)
    
    return {
        "total_items": total_items,
        "completed_items": completed_items,
        "completion_percentage": (completed_items / total_items) * 100 if total_items > 0 else 0.0,
        "total_watch_time": total_watch_time
    }

def get_module_completion_status(db, user_id, course_id, module_id, module_content_ids):
    """Check if all content in a module is completed
    
    Args:
        db: Database connection
        user_id: User ID
        course_id: Course ID
        module_id: Module ID
        module_content_ids: List of content IDs that belong to this module
    
    Returns:
        bool: True if all module content is completed, False otherwise
    """
    collection = get_user_progress_collection(db)
    
    # If module has no content, consider it completed
    if not module_content_ids or len(module_content_ids) == 0:
        return True
    
    # Get all progress items for this module's content
    completed_count = 0
    for content_id in module_content_ids:
        progress = collection.find_one({
            "user_id": user_id,
            "course_id": course_id,
            "content_id": content_id
        })
        
        if progress and progress.get("completed", False):
            completed_count += 1
    
    # Module is completed if all content items are completed
    return completed_count == len(module_content_ids)

def get_completed_modules(db, user_id, course_id, modules_data):
    """Get list of completed module IDs
    
    Args:
        db: Database connection
        user_id: User ID
        course_id: Course ID
        modules_data: List of dicts with 'module_id' and 'content_ids' keys
    
    Returns:
        list: List of completed module IDs
    """
    completed = []
    
    for module_data in modules_data:
        module_id = module_data.get('module_id')
        content_ids = module_data.get('content_ids', [])
        
        if get_module_completion_status(db, user_id, course_id, module_id, content_ids):
            completed.append(module_id)
    
    return completed
