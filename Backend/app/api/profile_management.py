from fastapi import APIRouter, Request, HTTPException, Depends
from app.utils.auth_helpers import get_current_user
from app.models.user import get_user_collection
from bson import ObjectId
from pathlib import Path
import os

profile_management_router = APIRouter(prefix="/profile", tags=["Profile Management"])

@profile_management_router.put("/update-avatar-url")
async def update_profile_avatar_url(
    request: Request,
    avatar_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user's avatar URL in database (for external URLs)"""
    db = request.app.mongodb
    user_collection = get_user_collection(db)
    
    avatar_url = avatar_data.get('avatar_url', '')
    if not avatar_url:
        raise HTTPException(status_code=400, detail="Avatar URL is required")
    
    try:
        user_object_id = ObjectId(current_user["id"]) if "id" in current_user else None
        user_id = current_user.get("user_id", "")
        
        # Try to find user by ObjectId first, then by user_id
        user = None
        if user_object_id:
            user = user_collection.find_one({"_id": user_object_id})
        
        if not user:
            user = user_collection.find_one({"user_id": user_id})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update avatar URL in user document
        update_result = user_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"avatar": avatar_url}}
        )
        
        if update_result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update user avatar")
        
        return {
            "success": True,
            "message": "Profile avatar URL updated successfully",
            "avatar_url": avatar_url
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user profile: {str(e)}")

@profile_management_router.delete("/delete-avatar")
async def delete_profile_avatar(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete user's profile avatar file and reset to default"""
    db = request.app.mongodb
    user_collection = get_user_collection(db)
    
    try:
        user_object_id = ObjectId(current_user["id"]) if "id" in current_user else None
        user_id = current_user.get("user_id", "")
        
        # Try to find user by ObjectId first, then by user_id
        user = None
        if user_object_id:
            user = user_collection.find_one({"_id": user_object_id})
        
        if not user:
            user = user_collection.find_one({"user_id": user_id})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Remove existing profile image files if any
        upload_dir = Path("uploads/profile")
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        
        for ext in allowed_extensions:
            existing_file = upload_dir / f"{user_id}{ext}"
            if existing_file.exists():
                try:
                    existing_file.unlink()
                except Exception:
                    pass  # Continue if can't delete file
        
        # Reset avatar to default (empty string or None)
        update_result = user_collection.update_one(
            {"_id": user["_id"]},
            {"$unset": {"avatar": ""}}
        )
        
        if update_result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to reset user avatar")
        
        return {
            "success": True,
            "message": "Profile avatar deleted successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting user avatar: {str(e)}")

@profile_management_router.get("/check-avatar/{user_id}")
async def check_user_avatar_file(request: Request, user_id: str):
    """Check if user has a local avatar file"""
    upload_dir = Path("uploads/profile")
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    
    for ext in allowed_extensions:
        avatar_file = upload_dir / f"{user_id}{ext}"
        if avatar_file.exists():
            return {
                "has_avatar": True,
                "avatar_url": f"/uploads/profile/{user_id}{ext}",
                "filename": f"{user_id}{ext}"
            }
    
    return {
        "has_avatar": False,
        "avatar_url": None,
        "filename": None
    }


