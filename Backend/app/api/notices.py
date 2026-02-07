from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.exceptions import RequestValidationError
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from pydantic import ValidationError
from app.utils.branch_filter import BranchAccessManager
from app.utils.dependencies import get_authenticated_user, role_required
from app.models.notice import get_notice_collection
from app.schemas.notice import NoticeCreate, NoticeUpdate, NoticeResponse
from app.utils.serializers import serialize_document

notice_router = APIRouter(prefix="/notices", tags=["Notices"])

def require_admin_or_instructor(user=Depends(role_required(["admin", "instructor"]))):
    """Dependency to require admin or instructor role"""
    return user

def prepare_notice_response(notice_doc):
    """Helper function to prepare notice document for response"""
    serialized_notice = serialize_document(notice_doc)
    # Add type field for consistency with frontend
    if serialized_notice.get("category"):
        serialized_notice["type"] = serialized_notice["category"]
    return NoticeResponse(**serialized_notice)

@notice_router.get("/", response_model=List[NoticeResponse])
async def get_notices(
    request: Request,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_authenticated_user)
):
    """Get all notices"""
    try:
        db = request.app.mongodb
        notice_collection = get_notice_collection(db)
        
        # Get branch filter for multi-tenancy
        current_user = getattr(request.state, 'user', None)
        # Fixed BranchAccessManager usage
        branch_filter = access_manager.get_filter_query()
        
        # Build query with branch filtering
        query = branch_filter if branch_filter else {}
        
        # Get notices sorted by creation date (newest first)
        cursor = notice_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        notices = []
        
        for notice_doc in cursor:
            serialized_notice = serialize_document(notice_doc)
            notices.append(NoticeResponse(**serialized_notice))
        
        return notices
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching notices: {str(e)}")


@notice_router.get("/active", response_model=List[NoticeResponse])
async def get_active_notices(
    request: Request,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_authenticated_user)
):
    """Get active (non-expired) notices"""
    try:
        db = request.app.mongodb
        notice_collection = get_notice_collection(db)
        
        current_time = datetime.utcnow()
        
        # Find notices that are either without expiry or not yet expired
        filter_query = {
            "$or": [
                {"expires_at": {"$exists": False}},
                {"expires_at": None},
                {"expires_at": {"$gt": current_time}}
            ]
        }
        
        cursor = notice_collection.find(filter_query).sort("created_at", -1).skip(skip).limit(limit)
        notices = []
        
        for notice_doc in cursor:
            serialized_notice = serialize_document(notice_doc)
            notices.append(NoticeResponse(**serialized_notice))
        
        return notices
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching active notices: {str(e)}")

@notice_router.get("/pinned", response_model=List[NoticeResponse])
async def get_pinned_notices(
    request: Request,
    user: dict = Depends(get_authenticated_user)
):
    """Get pinned notices"""
    try:
        db = request.app.mongodb
        notice_collection = get_notice_collection(db)
        
        cursor = notice_collection.find({"is_pinned": True}).sort("created_at", -1)
        notices = []
        
        for notice_doc in cursor:
            serialized_notice = serialize_document(notice_doc)
            notices.append(NoticeResponse(**serialized_notice))
        
        return notices
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching pinned notices: {str(e)}")

@notice_router.get("/search")
async def search_notices(
    request: Request,
    q: str,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_authenticated_user)
):
    """Search notices by title or content"""
    try:
        db = request.app.mongodb
        notice_collection = get_notice_collection(db)
        
        # Create text search query
        search_query = {
            "$or": [
                {"title": {"$regex": q, "$options": "i"}},
                {"content": {"$regex": q, "$options": "i"}}
            ]
        }
        
        cursor = notice_collection.find(search_query).sort("created_at", -1).skip(skip).limit(limit)
        notices = []
        
        for notice_doc in cursor:
            serialized_notice = serialize_document(notice_doc)
            notices.append(NoticeResponse(**serialized_notice))
        
        return {"notices": notices, "query": q}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching notices: {str(e)}")

@notice_router.get("/stats")
async def get_notice_stats(
    request: Request,
    user: dict = Depends(require_admin_or_instructor)
):
    """Get notice statistics"""
    try:
        db = request.app.mongodb
        notice_collection = get_notice_collection(db)
        
        total_notices = notice_collection.count_documents({})
        pinned_notices = notice_collection.count_documents({"is_pinned": True})
        
        # Count by category
        pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        category_stats = list(notice_collection.aggregate(pipeline))
        
        # Count active notices
        current_time = datetime.utcnow()
        active_notices = notice_collection.count_documents({
            "$or": [
                {"expires_at": {"$exists": False}},
                {"expires_at": None},
                {"expires_at": {"$gt": current_time}}
            ]
        })
        
        return {
            "total_notices": total_notices,
            "pinned_notices": pinned_notices,
            "active_notices": active_notices,
            "category_breakdown": category_stats
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching notice stats: {str(e)}")

@notice_router.get("/category/{category}", response_model=List[NoticeResponse])
async def get_notices_by_category(
    request: Request,
    category: str,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_authenticated_user)
):
    """Get notices by category"""
    try:
        db = request.app.mongodb
        notice_collection = get_notice_collection(db)
        
        cursor = notice_collection.find({"category": category}).sort("created_at", -1).skip(skip).limit(limit)
        notices = []
        
        for notice_doc in cursor:
            serialized_notice = serialize_document(notice_doc)
            notices.append(NoticeResponse(**serialized_notice))
        
        return notices
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching notices by category: {str(e)}")

# PARAMETERIZED ROUTES COME AFTER SPECIFIC ROUTES
@notice_router.get("/{notice_id}", response_model=NoticeResponse)
async def get_notice(
    request: Request,
    notice_id: str,
    user: dict = Depends(get_authenticated_user)
):
    """Get a specific notice by ID"""
    try:
        db = request.app.mongodb
        notice_collection = get_notice_collection(db)
        
        notice = notice_collection.find_one({"_id": ObjectId(notice_id)})
        if not notice:
            raise HTTPException(status_code=404, detail="Notice not found")
        
        serialized_notice = serialize_document(notice)
        return NoticeResponse(**serialized_notice)
        
    except Exception as e:
        if "not found" in str(e):
            raise e
        raise HTTPException(status_code=500, detail=f"Error fetching notice: {str(e)}")

@notice_router.post("/", response_model=NoticeResponse)
async def create_notice(
    request: Request,
    notice_data: NoticeCreate,
    user: dict = Depends(require_admin_or_instructor)
):
    """Create a new notice"""
    try:
        db = request.app.mongodb
        notice_collection = get_notice_collection(db)
        
        # Create notice document
        notice_dict = notice_data.dict(exclude={'expiryDate', 'status', 'targetAudience', 'author', 'isSticky'})
        notice_dict["created_by"] = user["user_id"]
        notice_dict["created_at"] = datetime.utcnow()
        notice_dict["updated_at"] = datetime.utcnow()
        notice_dict["is_pinned"] = notice_data.isSticky or False  # Map isSticky to is_pinned
        notice_dict["views"] = 0
        
        # Ensure category is set properly (from type if needed)
        if not notice_dict.get("category") and notice_data.type:
            notice_dict["category"] = notice_data.type
        
        # Clean up the dict - remove None values
        notice_dict = {k: v for k, v in notice_dict.items() if v is not None}
        
        # Insert into database
        result = notice_collection.insert_one(notice_dict)
        
        # Retrieve the created notice
        created_notice = notice_collection.find_one({"_id": result.inserted_id})
        
        serialized_notice = serialize_document(created_notice)
        # Add type field for consistency with frontend
        if serialized_notice.get("category"):
            serialized_notice["type"] = serialized_notice["category"]
        
        return NoticeResponse(**serialized_notice)
        
    except ValidationError as ve:
        # Handle Pydantic validation errors
        error_details = []
        for error in ve.errors():
            field_name = error.get('loc', [])[-1] if error.get('loc') else 'unknown'
            error_message = error.get('msg', 'Validation error')
            error_details.append({
                "field": field_name,
                "message": error_message,
                "input": error.get('input')
            })
        
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Required Field Missing", 
                "message": "Please fill all required fields",
                "validation_errors": error_details,
                "type": "validation_error"
            }
        )
    except ValueError as ve:
        # Handle validation errors with detailed messages
        raise HTTPException(
            status_code=422, 
            detail={
                "error": "Validation Error",
                "message": str(ve),
                "type": "validation_error"
            }
        )
    except Exception as e:
        print(f"Error creating notice: {str(e)}")
        print(f"Notice data: {notice_data.dict()}")
        raise HTTPException(
            status_code=500, 
            detail={
                "error": "Internal Server Error",
                "message": f"Error creating notice: {str(e)}",
                "type": "server_error"
            }
        )

@notice_router.put("/{notice_id}", response_model=NoticeResponse)
async def update_notice(
    request: Request,
    notice_id: str,
    notice_update: NoticeUpdate,
    user: dict = Depends(require_admin_or_instructor)
):
    """Update a notice"""
    try:
        db = request.app.mongodb
        notice_collection = get_notice_collection(db)
        
        # Check if notice exists
        notice = notice_collection.find_one({"_id": ObjectId(notice_id)})
        if not notice:
            raise HTTPException(status_code=404, detail="Notice not found")
        
        # Debug: Log user info for troubleshooting
        print(f"UPDATE NOTICE DEBUG - User Role: {user.get('role')}, User ID: {user.get('user_id')}")
        print(f"UPDATE NOTICE DEBUG - Notice Creator: {notice.get('created_by')}")
        print(f"UPDATE NOTICE DEBUG - User Dict: {user}")
        
        # Check if user can edit (creator, admin, or instructor)
        user_role = user.get("role", "").lower()
        is_creator = notice.get("created_by") == user.get("user_id")
        is_admin_or_instructor = user_role in ["admin", "instructor"]
        
        print(f"UPDATE NOTICE DEBUG - Is Creator: {is_creator}, Is Admin/Instructor: {is_admin_or_instructor}")
        
        if not (is_creator or is_admin_or_instructor):
            raise HTTPException(status_code=403, detail=f"Permission denied. User role: {user_role}, Creator: {is_creator}")
        
        # Prepare update data
        update_data = {k: v for k, v in notice_update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        # Update the notice
        notice_collection.update_one(
            {"_id": ObjectId(notice_id)},
            {"$set": update_data}
        )
        
        # Retrieve updated notice
        updated_notice = notice_collection.find_one({"_id": ObjectId(notice_id)})
        
        serialized_notice = serialize_document(updated_notice)
        return NoticeResponse(**serialized_notice)
        
    except Exception as e:
        if "not found" in str(e) or "Not authorized" in str(e):
            raise e
        raise HTTPException(status_code=500, detail=f"Error updating notice: {str(e)}")

@notice_router.delete("/{notice_id}")
async def delete_notice(
    request: Request,
    notice_id: str,
    user: dict = Depends(require_admin_or_instructor)
):
    """Delete a notice"""
    try:
        db = request.app.mongodb
        notice_collection = get_notice_collection(db)
        
        # Check if notice exists
        notice = notice_collection.find_one({"_id": ObjectId(notice_id)})
        if not notice:
            raise HTTPException(status_code=404, detail="Notice not found")
        
        # Debug: Log user info for troubleshooting
        print(f"DELETE NOTICE DEBUG - User Role: {user.get('role')}, User ID: {user.get('user_id')}")
        print(f"DELETE NOTICE DEBUG - Notice Creator: {notice.get('created_by')}")
        
        # Check if user can delete (creator, admin, or instructor)
        user_role = user.get("role", "").lower()
        is_creator = notice.get("created_by") == user.get("user_id")
        is_admin_or_instructor = user_role in ["admin", "instructor"]
        
        if not (is_creator or is_admin_or_instructor):
            raise HTTPException(status_code=403, detail=f"Permission denied. User role: {user_role}, Creator: {is_creator}")
        
        # Delete the notice
        notice_collection.delete_one({"_id": ObjectId(notice_id)})
        
        return {"message": "Notice deleted successfully"}
        
    except Exception as e:
        if "not found" in str(e) or "Not authorized" in str(e):
            raise e
        raise HTTPException(status_code=500, detail=f"Error deleting notice: {str(e)}")

@notice_router.put("/{notice_id}/pin")
async def toggle_notice_pin(
    request: Request,
    notice_id: str,
    user: dict = Depends(require_admin_or_instructor)
):
    """Pin or unpin a notice"""
    try:
        db = request.app.mongodb
        notice_collection = get_notice_collection(db)
        
        # Check if notice exists
        notice = notice_collection.find_one({"_id": ObjectId(notice_id)})
        if not notice:
            raise HTTPException(status_code=404, detail="Notice not found")
        
        # Toggle pin status
        new_pin_status = not notice.get("is_pinned", False)
        
        notice_collection.update_one(
            {"_id": ObjectId(notice_id)},
            {"$set": {"is_pinned": new_pin_status, "updated_at": datetime.utcnow()}}
        )
        
        return {"message": f"Notice {'pinned' if new_pin_status else 'unpinned'} successfully"}
        
    except Exception as e:
        if "not found" in str(e):
            raise e
        raise HTTPException(status_code=500, detail=f"Error toggling notice pin: {str(e)}")


