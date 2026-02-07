from fastapi import APIRouter, Request, File, UploadFile, Form, HTTPException, Depends
from app.utils.auth_helpers import get_current_user
from app.models.user import get_user_collection
from bson import ObjectId
import os
import uuid
from pathlib import Path
import shutil

profile_upload_router = APIRouter(prefix="/profile", tags=["Profile Upload"])

@profile_upload_router.post("/upload-avatar")
async def upload_profile_avatar(
    request: Request,
    avatar: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload profile avatar image for current user"""
    db = request.app.mongodb
    user_collection = get_user_collection(db)
    
    # Validate file
    if not avatar.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Check file size (5MB limit)
    file_content = await avatar.read()
    if len(file_content) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
    
    # Reset file pointer
    await avatar.seek(0)
    
    # Validate file type
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    file_extension = os.path.splitext(avatar.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Accepted formats: {', '.join(allowed_extensions)}"
        )
    
    # Create profile uploads directory
    upload_dir = Path("uploads/profile")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Get user ID for filename
    user_id = current_user.get("user_id") or str(current_user.get("id", ""))
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not found")
    
    # Create filename with user ID and extension
    filename = f"{user_id}{file_extension}"
    file_path = upload_dir / filename
    
    # Remove existing profile image if any
    for ext in allowed_extensions:
        existing_file = upload_dir / f"{user_id}{ext}"
        if existing_file.exists():
            try:
                existing_file.unlink()
            except Exception:
                pass  # Continue if can't delete old file
    
    # Save the new file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(avatar.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Update user's avatar field in database
    avatar_url = f"/uploads/profile/{filename}"
    try:
        user_object_id = ObjectId(current_user["id"]) if "id" in current_user else None
        
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
            "message": "Profile avatar uploaded successfully",
            "avatar_url": avatar_url,
            "filename": filename
        }
        
    except Exception as e:
        # Clean up uploaded file if database update fails
        try:
            if file_path.exists():
                file_path.unlink()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Error updating user profile: {str(e)}")

@profile_upload_router.get("/avatar/{user_id}")
async def get_user_avatar(request: Request, user_id: str):
    """Get user avatar URL"""
    db = request.app.mongodb
    user_collection = get_user_collection(db)
    
    # Find user by user_id or ObjectId
    user = user_collection.find_one({"user_id": user_id})
    if not user:
        try:
            user = user_collection.find_one({"_id": ObjectId(user_id)})
        except:
            pass
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    avatar_url = user.get("avatar", "")
    return {
        "user_id": user_id,
        "avatar_url": avatar_url
    }


