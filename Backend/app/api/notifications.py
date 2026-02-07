from fastapi import APIRouter, Request, HTTPException, Query, Path
from typing import Optional, List
from datetime import datetime
import logging
from app.schemas.notification import AdminNotificationCreate
from app.utils.branch_filter import BranchAccessManager
from app.services.notification_service import (
    create_admin_notification,
    get_admin_notifications,
    get_notification_by_id,
    get_notification_by_custom_id,
    update_notification,
    delete_notification,
    get_user_notifications,
    mark_notification_as_read,
    get_notification_stats,
    send_admin_notification
)

logger = logging.getLogger(__name__)

notification_router = APIRouter(prefix="/notifications", tags=["Notifications"])

# Create a separate router for API endpoints that frontend expects
api_notification_router = APIRouter(prefix="/api/notifications", tags=["API Notifications"])

@notification_router.post("/", response_model=dict)
def create_notification(request: Request, payload: AdminNotificationCreate):
    try:
        db = request.app.mongodb
        # Get user info if available, otherwise use default
        user_info = getattr(request.state, 'user', None)
        author = user_info.get('name', 'Admin') if user_info else 'Admin'
        
        # Add franchise context for multi-tenancy
        if user_info:
            payload_dict = payload.dict()
            payload_dict = BranchAccessManager.add_franchise_code_to_data(payload_dict, user_info)
            payload = AdminNotificationCreate(**payload_dict)
        
        result = send_admin_notification(db, payload, author)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@notification_router.post("/admin", response_model=dict)
def create_admin_notification_endpoint(request: Request, payload: AdminNotificationCreate):
    """Admin-specific notification creation endpoint"""
    try:
        db = request.app.mongodb
        # Get user info if available, otherwise use default
        user_info = getattr(request.state, 'user', None)
        author = user_info.get('name', 'Admin') if user_info else 'Admin'
        
        result = send_admin_notification(db, payload, author)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@notification_router.get("/", response_model=List[dict])
def get_notifications(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of notifications to skip"),
    limit: int = Query(100, ge=1, le=500, description="Number of notifications to return")
):
    try:
        db = request.app.mongodb
        # Test database connection
        db.command("ping")
        notifications = get_admin_notifications(db, skip, limit)
        return notifications
    except Exception as e:
        logger.error(f"❌ Database connection failed for notifications: {str(e)}")
        # Return empty list instead of 500 error to prevent frontend crashes
        return []

@notification_router.get("/admin", response_model=List[dict])
def get_admin_notifications_endpoint(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of notifications to skip"),
    limit: int = Query(100, ge=1, le=500, description="Number of notifications to return")
):
    """Admin-specific notifications endpoint"""
    try:
        db = request.app.mongodb
        # Test database connection
        db.command("ping")
        notifications = get_admin_notifications(db, skip, limit)
        return notifications
    except Exception as e:
        logger.error(f"❌ Database connection failed for admin notifications: {str(e)}")
        return []

@notification_router.get("/stats", response_model=dict)
def get_notification(request: Request):
    try:
        db = request.app.mongodb
        # Test database connection
        db.command("ping")
        stats = get_notification_stats(db)
        return stats
    except Exception as e:
        logger.error(f"❌ Database connection failed for notification stats: {str(e)}")
        return {"total_notifications": 0, "unread_notifications": 0, "read_notifications": 0}

@notification_router.get("/my", response_model=List[dict])
def get_my_notifications_handler(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of notifications to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of notifications to return")
):
    """Get notifications for the current user"""
    try:
        db = request.app.mongodb
        # Test database connection
        db.command("ping")
        # Get user ID from request state, use default if not authenticated
        user_info = getattr(request.state, 'user', None)
        user_id = user_info.get('user_id', 'default_user') if user_info else 'default_user'
        
        notifications = get_user_notifications(db, user_id, skip, limit)
        return notifications
    except Exception as e:
        logger.error(f"❌ Database connection failed for my notifications: {str(e)}")
        return []

@notification_router.get("/user", response_model=List[dict])
def get_user_notifications_handler(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of notifications to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of notifications to return")
):
    """Get notifications for the current user - Frontend expects this endpoint"""
    try:
        db = request.app.mongodb
        # Test database connection
        db.command("ping")
        # Get user ID from request state, use default if not authenticated
        user_info = getattr(request.state, 'user', None)
        user_id = user_info.get('user_id', 'default_user') if user_info else 'default_user'
        
        notifications = get_user_notifications(db, user_id, skip, limit)
        return notifications
    except Exception as e:
        logger.error(f"❌ Database connection failed for user notifications: {str(e)}")
        return []

@notification_router.post("/course-approval", response_model=dict)
def create_course_approval_notification_handler(
    request: Request,
    payload: dict
):
    """Create a course approval/rejection notification for instructor"""
    try:
        # Import inside function to avoid circular import
        from app.services.notification_service import create_course_approval_notification
        
        db = request.app.mongodb
        
        # Extract required fields from payload
        course_id = payload.get("course_id")
        instructor_id = payload.get("instructor_id")  
        course_title = payload.get("course_title", "Unknown Course")
        approved = payload.get("approved", True)
        reason = payload.get("reason", "")
        
        if not course_id or not instructor_id:
            raise HTTPException(status_code=400, detail="course_id and instructor_id are required")
        
        result = create_course_approval_notification(
            db, course_id, instructor_id, course_title, approved, reason
        )
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=500, detail=result["message"])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@notification_router.post("/mark-read/{notification_id}", response_model=dict)
def mark_notification_read_handler(
    request: Request,
    notification_id: str = Path(..., description="The notification ID (ObjectId or custom ID like not001)")
):
    """Mark a notification as read"""
    try:
        db = request.app.mongodb
        # Get user ID from request state, use default if not authenticated
        user_info = getattr(request.state, 'user', None)
        user_id = user_info.get('user_id', 'default_user') if user_info else 'default_user'
        
        # First try to mark as read in user_notifications collection
        success = mark_notification_as_read(db, user_id, notification_id)
        
        # If not found in user_notifications, try to find the notification by custom ID or ObjectId
        if not success:
            from bson import ObjectId
            from datetime import datetime
            
            notifications_collection = db["notifications"]
            
            # Try to find by custom notification_id first, then by ObjectId
            notification = None
            try:
                # First try custom notification_id
                notification = notifications_collection.find_one({"notification_id": notification_id})
                if not notification:
                    # Then try ObjectId
                    notification = notifications_collection.find_one({"_id": ObjectId(notification_id)})
                    if notification:
                        notification_id = str(notification["_id"])  # Use ObjectId for consistency
            except:
                # If ObjectId conversion fails, try only custom ID
                notification = notifications_collection.find_one({"notification_id": notification_id})
            
            if notification:
                # Create a read record in user_notifications
                user_notifications_collection = db["user_notifications"]
                read_record = {
                    "_id": ObjectId(),  # Generate new ObjectId for user notification record
                    "user_id": user_id,
                    "notification_id": notification_id,
                    "is_read": True,
                    "read_at": datetime.utcnow(),
                    "created_at": datetime.utcnow()
                }
                
                try:
                    # Check if user has already read this notification
                    existing_read = user_notifications_collection.find_one({
                        "notification_id": notification_id, 
                        "user_id": user_id
                    })
                    
                    if not existing_read:
                        # Insert new read record
                        user_notifications_collection.insert_one(read_record)
                        
                        # Increment read_count in main notifications collection using actual ObjectId
                        object_id = notification["_id"]
                        notifications_collection.update_one(
                            {"_id": object_id},
                            {
                                "$inc": {"read_count": 1},
                                "$set": {"updated_at": datetime.utcnow()}
                            }
                        )
                        success = True
                    elif not existing_read.get('is_read', False):
                        # Update existing record to read
                        user_notifications_collection.update_one(
                            {"notification_id": notification_id, "user_id": user_id},
                            {
                                "$set": {
                                    "is_read": True,
                                    "read_at": datetime.utcnow()
                                }
                            }
                        )
                        
                        # Increment read_count in main notifications collection using actual ObjectId
                        object_id = notification["_id"]
                        notifications_collection.update_one(
                            {"_id": object_id},
                            {
                                "$inc": {"read_count": 1},
                                "$set": {"updated_at": datetime.utcnow()}
                            }
                        )
                        success = True
                    else:
                        # Already read by this user
                        success = True
                        
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"Error creating read record: {str(e)}")
        
        if success:
            return {"success": True, "message": "Notification marked as read"}
        else:
            raise HTTPException(status_code=404, detail="Notification not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@notification_router.get("/by-id/{notification_id}", response_model=dict)
def get_notification_by_custom_id_handler(
    request: Request,
    notification_id: str = Path(..., description="The custom notification ID (e.g., not001)")
):
    """Get a specific notification by custom notification ID"""
    try:
        db = request.app.mongodb
        notification = get_notification_by_custom_id(db, notification_id)
        
        if notification:
            return notification
        else:
            raise HTTPException(status_code=404, detail="Notification not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@notification_router.get("/{notification_id}", response_model=dict)
def get_notification_handler(
    request: Request,
    notification_id: str = Path(..., description="The notification ID")
):
    """Get a specific notification by ID"""
    try:
        db = request.app.mongodb
        notification = get_notification_by_id(db, notification_id)
        
        if notification:
            return notification
        else:
            raise HTTPException(status_code=404, detail="Notification not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@notification_router.put("/{notification_id}", response_model=dict)
def update_notification_handler(
    request: Request,
    payload: dict,
    notification_id: str = Path(..., description="The notification ID")
):
    """Update a notification"""
    try:
        db = request.app.mongodb
        success = update_notification(db, notification_id, payload)
        
        if success:
            return {"success": True, "message": "Notification updated successfully"}
        else:
            raise HTTPException(status_code=404, detail="Notification not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@notification_router.delete("/{notification_id}", response_model=dict)
def delete_notification_handler(
    request: Request,
    notification_id: str = Path(..., description="The notification ID")
):
    """Delete a notification"""
    try:
        db = request.app.mongodb
        success = delete_notification(db, notification_id)
        
        if success:
            return {"success": True, "message": "Notification deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Notification not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@notification_router.post("/message", response_model=dict)
def send_notification_message(request: Request, payload: dict):
    """Send a notification message"""
    try:
        db = request.app.mongodb
        
        # Extract message data
        recipient_id = payload.get('recipient_id') or payload.get('instructorId') or payload.get('instructor_id')
        message = payload.get('message') or payload.get('content')
        sender_id = payload.get('sender_id', 'admin')
        subject = payload.get('subject', 'New Message')
        
        if not recipient_id or not message:
            raise HTTPException(status_code=400, detail="recipient_id and message are required")
        
        # Create notification using existing service
        notification_data = {
            "user_id": recipient_id,
            "message": message,
            "subject": subject,
            "type": "message",
            "sender_id": sender_id,
            "metadata": payload
        }
        
        result = create_notification(db, notification_data)
        return {"status": "success", "message": "Message sent successfully", "notification": result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

# Export the router for use in main app
__all__ = ["notification_router", "api_notification_router"]

# API routes that frontend expects (with /api prefix)
@api_notification_router.post("/", response_model=dict)
def create_notification_api(request: Request, payload: AdminNotificationCreate):
    """API endpoint for creating notifications (with /api prefix)"""
    try:
        db = request.app.mongodb
        user_info = getattr(request.state, 'user', None)
        author = user_info.get('name', 'Admin') if user_info else 'Admin'
        
        result = send_admin_notification(db, payload, author)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_notification_router.post("/admin", response_model=dict)
def create_admin_notification_api(request: Request, payload: AdminNotificationCreate):
    """API admin notification endpoint (with /api prefix)"""
    try:
        db = request.app.mongodb
        user_info = getattr(request.state, 'user', None)
        author = user_info.get('name', 'Admin') if user_info else 'Admin'
        
        result = send_admin_notification(db, payload, author)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_notification_router.get("/", response_model=List[dict])
def get_notifications_api(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of notifications to skip"),
    limit: int = Query(100, ge=1, le=500, description="Number of notifications to return")
):
    """API endpoint for getting notifications (with /api prefix)"""
    try:
        db = request.app.mongodb
        # Test database connection
        db.command("ping")
        notifications = get_admin_notifications(db, skip, limit)
        return notifications
    except Exception as e:
        logger.error(f"❌ Database connection failed for API notifications: {str(e)}")
        return []

@api_notification_router.get("/admin", response_model=List[dict])
def get_admin_notifications_api(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of notifications to skip"),
    limit: int = Query(100, ge=1, le=500, description="Number of notifications to return")
):
    """API admin notifications endpoint (with /api prefix)"""
    try:
        db = request.app.mongodb
        # Test database connection
        db.command("ping")
        notifications = get_admin_notifications(db, skip, limit)
        return notifications
    except Exception as e:
        logger.error(f"❌ Database connection failed for API admin notifications: {str(e)}")
        return []

@api_notification_router.get("/user", response_model=List[dict])
def get_user_notifications_api(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of notifications to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of notifications to return")
):
    """Get notifications for the current user - API endpoint for frontend"""
    try:
        db = request.app.mongodb
        # Test database connection
        db.command("ping")
        # Get user ID from request state, use default if not authenticated
        user_info = getattr(request.state, 'user', None)
        user_id = user_info.get('user_id', 'default_user') if user_info else 'default_user'
        
        notifications = get_user_notifications(db, user_id, skip, limit)
        return notifications
    except Exception as e:
        logger.error(f"❌ Database connection failed for API user notifications: {str(e)}")
        return []

@api_notification_router.post("/message", response_model=dict)
def send_notification_message_api(request: Request, payload: dict):
    """Send a notification message - API endpoint for frontend compatibility"""
    try:
        db = request.app.mongodb
        
        # Extract message data
        recipient_id = payload.get('recipient_id') or payload.get('instructorId') or payload.get('instructor_id')
        message = payload.get('message') or payload.get('content')
        sender_id = payload.get('sender_id', 'admin')
        subject = payload.get('subject', 'New Message')
        
        if not recipient_id or not message:
            raise HTTPException(status_code=400, detail="recipient_id and message are required")
        
        # Create notification using existing service
        notification_data = {
            "user_id": recipient_id,
            "message": message,
            "subject": subject,
            "type": "message",
            "sender_id": sender_id,
            "metadata": payload
        }
        
        result = create_notification(db, notification_data)
        return {"status": "success", "message": "Message sent successfully", "notification": result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")


