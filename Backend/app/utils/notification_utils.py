"""
Utility functions for notification system
"""

from pymongo.database import Database
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.notification import get_notification_collection, get_user_notifications_collection
from app.models.user import get_user_collection
import re
import logging

logger = logging.getLogger(__name__)

def generate_notification_id(db: Database) -> str:
    """
    Generate a unique notification ID in the format 'not001', 'not002', etc.
    
    Args:
        db: MongoDB database instance
        
    Returns:
        str: Unique notification ID like 'not001'
    """
    try:
        # Get the notifications collection
        notifications_collection = db["notifications"]
        
        # Find the highest existing notification_id
        pipeline = [
            {
                "$match": {
                    "notification_id": {"$regex": "^not\\d+$"}  # Match pattern like not001, not002
                }
            },
            {
                "$addFields": {
                    "numeric_part": {
                        "$toInt": {"$substr": ["$notification_id", 3, -1]}  # Extract number after 'not'
                    }
                }
            },
            {
                "$sort": {"numeric_part": -1}  # Sort by numeric part descending
            },
            {
                "$limit": 1  # Get the highest one
            }
        ]
        
        result = list(notifications_collection.aggregate(pipeline))
        
        if result:
            # Extract the numeric part and increment
            last_id = result[0]["notification_id"]
            numeric_part = int(last_id[3:])  # Remove 'not' prefix
            next_number = numeric_part + 1
        else:
            # First notification
            next_number = 1
        
        # Format with leading zeros (3 digits)
        return f"not{next_number:03d}"
        
    except Exception as e:
        # Fallback: generate based on current count
        try:
            count = notifications_collection.count_documents({})
            return f"not{count + 1:03d}"
        except:
            # Final fallback
            import time
            return f"not{int(time.time()) % 1000:03d}"

def validate_notification_id(notification_id: str) -> bool:
    """
    Validate notification ID format
    
    Args:
        notification_id: The notification ID to validate
        
    Returns:
        bool: True if valid format (not001, not002, etc.)
    """
    pattern = r'^not\d{3}$'
    return bool(re.match(pattern, notification_id))

def is_notification_id_unique(db: Database, notification_id: str, exclude_object_id: Optional[str] = None) -> bool:
    """
    Check if notification ID is unique
    
    Args:
        db: MongoDB database instance
        notification_id: The notification ID to check
        exclude_object_id: ObjectId to exclude from check (for updates)
        
    Returns:
        bool: True if unique, False if already exists
    """
    try:
        notifications_collection = db["notifications"]
        
        query = {"notification_id": notification_id}
        
        # Exclude specific document if updating
        if exclude_object_id:
            from bson import ObjectId
            query["_id"] = {"$ne": ObjectId(exclude_object_id)}
        
        existing = notifications_collection.find_one(query)
        return existing is None
        
    except Exception:
        return False


def create_course_status_notification(db: Database, course_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create notification for admin users when a new course with 'Pending' status is created
    
    Args:
        db: MongoDB database instance
        course_data: Course data dictionary containing course details
        
    Returns:
        Dict: Result with success status and message
    """
    try:
        course_status = course_data.get("status", "Active")
        course_title = course_data.get("title", "Unknown Course")
        
        # Only create notification for pending courses
        if course_status != "Pending":
            return {"success": True, "message": "No notification needed - course status is not pending"}
        
        # Get admin users
        user_collection = get_user_collection(db)
        admin_users = list(user_collection.find({"role": "admin"}))
        
        if not admin_users:
            logger.warning("No admin users found to notify")
            return {"success": False, "message": "No admin users found"}
        
        notification_collection = get_notification_collection(db)
        user_notifications_collection = get_user_notifications_collection(db)
        
        # Generate notification ID
        notification_id = generate_notification_id(db)
        
        # Create main notification document
        notification_doc = {
            "notification_id": notification_id,
            "title": "New Course Pending Approval",
            "message": f"New course '{course_title}' is awaiting approval.",
            "type": "course_update",
            "recipient_type": "admins",
            "priority": "medium",
            "status": "sent",
            "author": "System",
            "recipient_count": len(admin_users),
            "delivered_count": len(admin_users),
            "read_count": 0,
            "open_rate": 0.0,
            "click_rate": 0.0,
            "sent_date": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "category": "course_management",
            "course_id": course_data.get("_id") or course_data.get("id"),
            "course_title": course_title
        }
        
        # Insert main notification
        result = notification_collection.insert_one(notification_doc)
        notification_object_id = result.inserted_id
        
        # Create individual user notifications
        user_notification_docs = []
        for admin in admin_users:
            admin_id = str(admin["_id"])
            
            user_notification_doc = {
                "notification_id": notification_object_id,
                "user_id": admin_id,
                "title": notification_doc["title"],
                "message": notification_doc["message"],
                "type": notification_doc["type"],
                "priority": notification_doc["priority"],
                "status": "sent",
                "is_read": False,
                "read_at": None,
                "created_at": datetime.utcnow(),
                "category": notification_doc["category"],
                "course_id": notification_doc["course_id"],
                "course_title": course_title
            }
            
            user_notification_docs.append(user_notification_doc)
        
        # Bulk insert user notifications
        if user_notification_docs:
            user_notifications_collection.insert_many(user_notification_docs)
        
        logger.info(f"✅ Created course status notification for {len(admin_users)} admin users. Course: {course_title}")
        
        return {
            "success": True,
            "notification_id": str(notification_object_id),
            "custom_notification_id": notification_id,
            "message": f"Notification sent to {len(admin_users)} admin users",
            "admin_count": len(admin_users)
        }
        
    except Exception as e:
        logger.error(f"❌ Error creating course status notification: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to create course status notification"
        }
