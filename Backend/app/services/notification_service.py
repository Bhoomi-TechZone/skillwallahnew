from app.models.notification import get_notification_collection
from app.schemas.notification import (
    NotificationCreate, 
    AdminNotificationCreate,
    NotificationUpdate,
    NotificationResponse,
    UserNotificationResponse,
    NotificationStats,
    NotificationStatus,
    RecipientType
)
from app.utils.notification_utils import generate_notification_id
from bson import ObjectId
from datetime import datetime
from typing import List, Optional, Dict
import logging

logger = logging.getLogger(__name__)

def create_admin_notification(db, notification_data: AdminNotificationCreate, author: str = "Admin") -> Dict:
    try:
        notification_collection = get_notification_collection(db)
        
        # Generate unique notification ID
        notification_id = generate_notification_id(db)
        
        # Calculate recipient count (simplified)
        recipient_count = get_recipient_count(notification_data.recipient_type)
        
        notification_doc = {
            **notification_data.dict(),
            "notification_id": notification_id,
            "status": NotificationStatus.sent if notification_data.send_immediately else NotificationStatus.draft,
            "author": author,
            "recipient_count": recipient_count,
            "delivered_count": 0,
            "read_count": 0,
            "open_rate": 0.0,
            "click_rate": 0.0,
            "sent_date": datetime.utcnow() if notification_data.send_immediately else None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = notification_collection.insert_one(notification_doc)
        
        logger.info(f"✅ Created admin notification: {result.inserted_id}")
        
        return {
            "success": True,
            "notification_id": str(result.inserted_id),
            "custom_notification_id": notification_id,
            "message": "Notification created successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Error creating admin notification: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to create notification"
        }

def get_admin_notifications(db, skip: int = 0, limit: int = 100) -> List[Dict]:
    """Get all notifications for admin"""
    try:
        notification_collection = get_notification_collection(db)
        
        cursor = notification_collection.find().sort("created_at", -1).skip(skip).limit(limit)
        notifications = list(cursor)
        
        # Convert ObjectId to string
        for notification in notifications:
            notification["id"] = str(notification["_id"])
            notification["_id"] = str(notification["_id"])
        
        return notifications
        
    except Exception as e:
        logger.error(f"❌ Error fetching notifications: {e}")
        return []

def get_notification_by_id(db, notification_id: str) -> Optional[Dict]:
    """Get a specific notification by ObjectId"""
    try:
        notification_collection = get_notification_collection(db)
        notification = notification_collection.find_one({"_id": ObjectId(notification_id)})
        
        if notification:
            notification["id"] = str(notification["_id"])
            notification["_id"] = str(notification["_id"])
            return notification
        return None
        
    except Exception as e:
        logger.error(f"❌ Error fetching notification {notification_id}: {e}")
        return None

def get_notification_by_custom_id(db, notification_id: str) -> Optional[Dict]:
    """Get a specific notification by custom notification_id (e.g., not001)"""
    try:
        notification_collection = get_notification_collection(db)
        notification = notification_collection.find_one({"notification_id": notification_id})
        
        if notification:
            notification["id"] = str(notification["_id"])
            notification["_id"] = str(notification["_id"])
            return notification
        return None
        
    except Exception as e:
        logger.error(f"❌ Error fetching notification by custom ID {notification_id}: {e}")
        return None

def update_notification(db, notification_id: str, update_data: Dict) -> bool:
    """Update a notification"""
    try:
        notification_collection = get_notification_collection(db)
        
        update_doc = {k: v for k, v in update_data.items() if v is not None}
        update_doc["updated_at"] = datetime.utcnow()
        
        result = notification_collection.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": update_doc}
        )
        
        return result.modified_count > 0
        
    except Exception as e:
        logger.error(f"❌ Error updating notification {notification_id}: {e}")
        return False

def delete_notification(db, notification_id: str) -> bool:
    """Delete a notification"""
    try:
        notification_collection = get_notification_collection(db)
        
        result = notification_collection.delete_one({"_id": ObjectId(notification_id)})
        
        return result.deleted_count > 0
        
    except Exception as e:
        logger.error(f"❌ Error deleting notification {notification_id}: {e}")
        return False

def get_user_notifications(db, user_id: str, skip: int = 0, limit: int = 50) -> List[Dict]:
    """Get notifications for a specific user"""
    try:
        notification_collection = get_notification_collection(db)
        user_notifications_collection = db["user_notifications"]
        
        # First try to get all sent notifications (admin notifications that should be shown to users)
        sent_notifications = list(
            notification_collection.find(
                {"status": "sent"}
            ).sort("created_at", -1).skip(skip).limit(limit)
        )
        
        # If no sent notifications found, fall back to getting user's personal notifications
        if not sent_notifications:
            logger.info(f"No sent notifications found, falling back to user notifications for {user_id}")
            user_notifications = list(
                user_notifications_collection.find(
                    {"user_id": user_id}
                ).sort("created_at", -1).skip(skip).limit(limit)
            )
            
            # Convert to expected format
            result = []
            for notification in user_notifications:
                notification_data = {
                    "id": str(notification["_id"]),
                    "_id": str(notification["_id"]),
                    "notification_id": notification.get("notification_id", str(notification["_id"])),
                    "title": notification.get("title", "Notification"),
                    "message": notification.get("message", "You have a new notification"),
                    "type": notification.get("type", "info"),
                    "priority": notification.get("priority", "medium"),
                    "is_read": notification.get("is_read", False),
                    "created_at": notification.get("created_at"),
                    "sent_date": notification.get("read_at") or notification.get("created_at"),
                    "author": notification.get("author", "System"),
                    "recipient_type": "user"
                }
                result.append(notification_data)
            
            return result
        
        # Get user's read status for these notifications
        notification_ids = [str(notif["_id"]) for notif in sent_notifications]
        read_statuses = list(
            user_notifications_collection.find(
                {"user_id": user_id, "notification_id": {"$in": notification_ids}}
            )
        )
        
        # Create a map of read statuses
        read_status_map = {notif["notification_id"]: notif.get("is_read", False) for notif in read_statuses}
        
        # Combine notification data with read status
        result = []
        for notification in sent_notifications:
            notif_id = str(notification["_id"])
            notification_data = {
                "id": notif_id,
                "_id": notif_id,
                "notification_id": notification.get("notification_id", notif_id),
                "title": notification.get("title", ""),
                "message": notification.get("message", ""),
                "type": notification.get("type", "info"),
                "priority": notification.get("priority", "medium"),
                "is_read": read_status_map.get(notif_id, False),
                "created_at": notification.get("created_at"),
                "sent_date": notification.get("sent_date"),
                "author": notification.get("author", "Admin"),
                "recipient_type": notification.get("recipient_type", "all")
            }
            result.append(notification_data)
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error fetching user notifications for {user_id}: {e}")
        return []

def mark_notification_as_read(db, user_id: str, notification_id: str) -> bool:
    """Mark a user notification as read"""
    try:
        user_notifications_collection = db["user_notifications"]
        
        result = user_notifications_collection.update_one(
            {"_id": ObjectId(notification_id), "user_id": user_id},
            {
                "$set": {
                    "is_read": True,
                    "read_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0
        
    except Exception as e:
        logger.error(f"❌ Error marking notification as read: {e}")
        return False

def get_notification_stats(db) -> Dict:
    """Get notification statistics"""
    try:
        notification_collection = get_notification_collection(db)
        
        # Simple aggregation
        total_count = notification_collection.count_documents({})
        sent_count = notification_collection.count_documents({"status": "sent"})
        draft_count = notification_collection.count_documents({"status": "draft"})
        scheduled_count = notification_collection.count_documents({"status": "scheduled"})
        failed_count = notification_collection.count_documents({"status": "failed"})
        
        return {
            "total_notifications": total_count,
            "sent_notifications": sent_count,
            "draft_notifications": draft_count,
            "scheduled_notifications": scheduled_count,
            "failed_notifications": failed_count,
            "total_recipients": 0,  # Can be calculated later
            "average_open_rate": 0.0,
            "average_click_rate": 0.0
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting notification stats: {e}")
        return {
            "total_notifications": 0,
            "sent_notifications": 0,
            "draft_notifications": 0,
            "scheduled_notifications": 0,
            "failed_notifications": 0,
            "total_recipients": 0,
            "average_open_rate": 0.0,
            "average_click_rate": 0.0
        }

def get_recipient_count(recipient_type: str) -> int:
    """Get the count of recipients based on recipient type (simplified)"""
    # Simplified recipient count - in production, this would query the user collection
    counts = {
        "all": 1000,
        "students": 800,
        "instructors": 50,
        "admins": 5
    }
    return counts.get(recipient_type, 0)

def send_admin_notification(db, notification_data: AdminNotificationCreate, author: str = "Admin") -> Dict:
    """Send an admin notification - main function used by API"""
    return create_admin_notification(db, notification_data, author)


def create_course_approval_notification(db, course_id: str, instructor_id: str, course_title: str, approved: bool = True, reason: str = "") -> Dict:
    """Create a course approval/rejection notification for instructor"""
    try:
        notification_collection = get_notification_collection(db)
        
        # Generate unique notification ID
        notification_id = generate_notification_id(db)
        
        if approved:
            title = f"Course Approved: {course_title}"
            message = f"Congratulations! Your course '{course_title}' has been approved and is now live for students to enroll."
            notification_type = "course_approval"
        else:
            title = f"Course Needs Review: {course_title}"
            message = f"Your course '{course_title}' requires some modifications before approval. {reason}"
            notification_type = "course_rejection"
        
        notification_doc = {
            "notification_id": notification_id,
            "title": title,
            "message": message,
            "type": notification_type,
            "status": NotificationStatus.sent,
            "author": "Admin",
            "priority": "high",
            "recipient_type": "instructor",
            "recipient_id": instructor_id,
            "course_id": course_id,
            "course_title": course_title,
            "approved": approved,
            "reason": reason if reason else None,
            "recipient_count": 1,
            "delivered_count": 1,
            "read_count": 0,
            "open_rate": 0.0,
            "click_rate": 0.0,
            "sent_date": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = notification_collection.insert_one(notification_doc)
        
        logger.info(f"✅ Created course {'approval' if approved else 'rejection'} notification for instructor {instructor_id}: {result.inserted_id}")
        
        # Also create a user-specific notification record
        user_notifications_collection = db["user_notifications"]
        user_notification_doc = {
            "user_id": instructor_id,
            "notification_id": str(result.inserted_id),
            "title": title,
            "message": message,
            "type": notification_type,
            "priority": "high",
            "course_id": course_id,
            "is_read": False,
            "created_at": datetime.utcnow(),
            "author": "Admin"
        }
        
        user_result = user_notifications_collection.insert_one(user_notification_doc)
        logger.info(f"✅ Created user notification record: {user_result.inserted_id}")
        
        return {
            "success": True,
            "notification_id": str(result.inserted_id),
            "custom_notification_id": notification_id,
            "message": f"Course {'approval' if approved else 'rejection'} notification sent successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Error creating course approval notification: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to create course approval notification"
        }
