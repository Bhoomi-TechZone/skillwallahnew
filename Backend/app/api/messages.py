from fastapi import APIRouter, Request, HTTPException, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
from app.utils.branch_filter import BranchAccessManager
import logging

# Set up logging
logger = logging.getLogger(__name__)

messages_router = APIRouter(prefix="/messages", tags=["Messages"])
api_messages_router = APIRouter(prefix="/api/messages", tags=["API Messages"])

@messages_router.post("/send")
async def send_message(request: Request, message_data: Dict[str, Any]):
    """Send a direct message between users"""
    try:
        db = request.app.mongodb
        messages_collection = db.messages
        
        # Validate required fields
        required_fields = ["recipient_id", "message", "subject"]
        for field in required_fields:
            if not message_data.get(field):
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Get sender info (default to admin if not authenticated)
        user_info = getattr(request.state, 'user', None)
        sender_id = user_info.get('user_id', 'admin') if user_info else 'admin'
        sender_name = user_info.get('name', 'Admin') if user_info else 'Admin'
        
        # Create message document
        message_doc = {
            "_id": ObjectId(),
            "sender_id": sender_id,
            "sender_name": sender_name,
            "recipient_id": message_data["recipient_id"],
            "recipient_type": message_data.get("recipient_type", "user"),
            "subject": message_data["subject"],
            "message": message_data["message"],
            "content": message_data["message"],  # Alias for compatibility
            "course_id": message_data.get("course_id"),
            "course_title": message_data.get("course_title"),
            "message_type": message_data.get("message_type", "general"),
            "priority": message_data.get("priority", "medium"),
            "is_read": False,
            "read_at": None,
            "sent_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "sent_by": message_data.get("sent_by", "admin"),
            "metadata": {
                "ip_address": request.client.host if hasattr(request, 'client') else None,
                "user_agent": request.headers.get("user-agent", ""),
                "platform": "admin_dashboard"
            }
        }
        
        # Insert message
        result = messages_collection.insert_one(message_doc)
        
        # Also create a notification for the recipient
        try:
            notifications_collection = db.notifications
            notification_doc = {
                "_id": ObjectId(),
                "notification_id": f"msg_{str(result.inserted_id)[-8:]}",
                "title": f"New message: {message_data['subject']}",
                "message": message_data["message"],
                "type": "message",
                "recipient_type": "individual",
                "target_user_id": message_data["recipient_id"],
                "priority": message_data.get("priority", "medium"),
                "category": "communication",
                "author": sender_name,
                "send_immediately": True,
                "status": "sent",
                "sent_date": datetime.utcnow(),
                "created_at": datetime.utcnow(),
                "read_count": 0,
                "delivered_count": 1,
                "metadata": {
                    "message_id": str(result.inserted_id),
                    "course_id": message_data.get("course_id"),
                    "course_title": message_data.get("course_title")
                }
            }
            notifications_collection.insert_one(notification_doc)
            logger.info(f"Notification created for message {result.inserted_id}")
        except Exception as notif_error:
            logger.warning(f"Failed to create notification for message: {notif_error}")
        
        return {
            "success": True,
            "message": "Message sent successfully",
            "message_id": str(result.inserted_id),
            "sent_at": message_doc["sent_at"].isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

@messages_router.get("/inbox")
async def get_inbox(request: Request, skip: int = 0, limit: int = 50):
    """Get messages for the current user's inbox"""
    try:
        db = request.app.mongodb
        messages_collection = db.messages
        
        # Get user info
        user_info = getattr(request.state, 'user', None)
        user_id = user_info.get('user_id', 'default_user') if user_info else 'default_user'
        
        # Find messages for this user
        messages = list(messages_collection.find(
            {"recipient_id": user_id}
        ).sort("sent_at", -1).skip(skip).limit(limit))
        
        # Format messages for response
        formatted_messages = []
        for msg in messages:
            formatted_msg = {
                "id": str(msg["_id"]),
                "sender_id": msg.get("sender_id", ""),
                "sender_name": msg.get("sender_name", "Unknown"),
                "subject": msg.get("subject", ""),
                "message": msg.get("message", ""),
                "course_title": msg.get("course_title", ""),
                "is_read": msg.get("is_read", False),
                "sent_at": msg.get("sent_at", "").isoformat() if msg.get("sent_at") else "",
                "message_type": msg.get("message_type", "general"),
                "priority": msg.get("priority", "medium")
            }
            formatted_messages.append(formatted_msg)
        
        return {"messages": formatted_messages}
        
    except Exception as e:
        logger.error(f"Error getting inbox: {e}")
        raise HTTPException(status_code=500, detail="Failed to get messages")

@messages_router.put("/{message_id}/read")
async def mark_message_as_read(request: Request, message_id: str):
    """Mark a message as read"""
    try:
        db = request.app.mongodb
        messages_collection = db.messages
        
        # Get user info
        user_info = getattr(request.state, 'user', None)
        user_id = user_info.get('user_id', 'default_user') if user_info else 'default_user'
        
        # Update message
        result = messages_collection.update_one(
            {
                "_id": ObjectId(message_id),
                "recipient_id": user_id
            },
            {
                "$set": {
                    "is_read": True,
                    "read_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            return {"success": True, "message": "Message marked as read"}
        else:
            raise HTTPException(status_code=404, detail="Message not found")
            
    except Exception as e:
        logger.error(f"Error marking message as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to update message")

# API endpoints (with /api prefix)
@api_messages_router.post("/send")
async def send_message_api(request: Request, message_data: Dict[str, Any]):
    """API endpoint for sending messages (with /api prefix)"""
    return await send_message(request, message_data)

@api_messages_router.get("/inbox")
async def get_inbox_api(request: Request, skip: int = 0, limit: int = 50):
    """API endpoint for getting inbox (with /api prefix)"""
    return await get_inbox(request, skip, limit)

@api_messages_router.put("/{message_id}/read")
async def mark_message_as_read_api(request: Request, message_id: str):
    """API endpoint for marking message as read (with /api prefix)"""
    return await mark_message_as_read(request, message_id)

# Export routers
__all__ = ["messages_router", "api_messages_router"]

