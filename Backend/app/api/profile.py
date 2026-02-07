from fastapi import APIRouter, Request, Depends, HTTPException, File, UploadFile, Form
from fastapi.responses import JSONResponse
from app.utils.dependencies import get_authenticated_user
from app.models.user import get_user_collection
from bson import ObjectId
from datetime import datetime
import os
import shutil
from typing import Optional

profile_router = APIRouter(prefix="/profile", tags=["Profile"])

# Helper function to convert relative avatar URLs to full URLs
def get_full_avatar_url(avatar_path: str) -> str:
    """Convert relative avatar path to full URL"""
    if not avatar_path:
        return ""
    # If already a full URL, return as is
    if avatar_path.startswith("http://") or avatar_path.startswith("https://"):
        return avatar_path
    # Convert relative path to full URL
    if avatar_path.startswith("/"):
        return f"http://localhost:4000{avatar_path}"
    else:
        return f"http://localhost:4000/{avatar_path}"

# GET /api/profile/{student_id}
@profile_router.get("/{student_id}")
async def get_student_profile(request: Request, student_id: str):
    db = request.app.mongodb
    
    # First, try to find student in branch_students collection
    try:
        branch_student = db.branch_students.find_one({"_id": ObjectId(student_id)})
        
        if branch_student:
            # Format join date properly for branch student
            join_date = ""
            if branch_student.get("created_at"):
                created_at = branch_student["created_at"]
                if isinstance(created_at, datetime):
                    join_date = created_at.strftime("%Y-%m-%d")
                else:
                    join_date = str(created_at)[:10]
            elif branch_student.get("date_of_admission"):
                join_date = str(branch_student["date_of_admission"])[:10]
            
            # Get photo URL or use default avatar
            avatar_url = branch_student.get("photo_url", "")
            if avatar_url and not avatar_url.startswith("http"):
                avatar_url = get_full_avatar_url(avatar_url)
            
            profile = {
                "id": str(branch_student["_id"]),
                "_id": str(branch_student["_id"]),
                "user_id": branch_student.get("registration_number", ""),
                "registration_number": branch_student.get("registration_number", ""),
                "name": branch_student.get("student_name", ""),
                "email": branch_student.get("email_id", ""),
                "role": "student",
                "avatar": avatar_url,
                "phone": branch_student.get("contact_no", ""),
                "department": branch_student.get("course", ""),
                "level": branch_student.get("batch", ""),
                "semester": "",
                "joinDate": join_date,
                "points": 0,
                "branch_code": branch_student.get("branch_code", ""),
                "franchise_code": branch_student.get("franchise_code", ""),
                "course": branch_student.get("course", ""),
                "batch": branch_student.get("batch", ""),
                "is_branch_student": True
            }
            return profile
    except Exception as e:
        print(f"[DEBUG] Error checking branch_students: {str(e)}")
    
    # If not found in branch_students, check regular users collection
    user_collection = get_user_collection(db)
    user = user_collection.find_one({"_id": ObjectId(student_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Format join date properly
    join_date = ""
    if user.get("joinDate"):
        join_date = user["joinDate"]
    elif user.get("created_at"):
        # If joinDate doesn't exist but created_at does, use created_at
        if isinstance(user["created_at"], datetime):
            join_date = user["created_at"].strftime("%Y-%m-%d")
        else:
            join_date = str(user["created_at"])[:10]  # Take first 10 chars for date part
    
    profile = {
        "id": str(user["_id"]),
        "_id": str(user["_id"]),
        "user_id": user.get("user_id", ""),  # Include custom user_id
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "student"),
        "avatar": get_full_avatar_url(user.get("avatar", "")),  # Convert to full URL
        "phone": user.get("phone", ""),
        "department": user.get("department", ""),  # Add department field
        "level": user.get("level", ""),  # Add level field
        "semester": user.get("semester", ""),  # Add semester field
        "joinDate": join_date,  # Add formatted join date
        "points": user.get("points", 0),  # Add points field
        "is_branch_student": False
    }
    return profile

# PUT /api/profile/{student_id}
@profile_router.put("/{student_id}")
async def update_student_profile(
    request: Request, 
    student_id: str,
    avatar: Optional[UploadFile] = File(None),
    name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    level: Optional[str] = Form(None),
    semester: Optional[str] = Form(None)
):
    try:
        db = request.app.mongodb
        
        # Check if this is a branch student first
        branch_student = db.branch_students.find_one({"_id": ObjectId(student_id)})
        
        if branch_student:
            # Build update data for branch student
            updated_data = {}
            if name is not None:
                updated_data["student_name"] = name
            if email is not None:
                updated_data["email_id"] = email
            if phone is not None:
                updated_data["contact_no"] = phone
            # Note: department and level map to course and batch for branch students
            # We won't update these as they're managed by branch admin
            
            # Handle avatar file upload for branch student
            if avatar:
                # Create uploads directory if it doesn't exist
                upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "profile")
                os.makedirs(upload_dir, exist_ok=True)
                
                # Generate unique filename
                file_extension = os.path.splitext(avatar.filename)[1]
                filename = f"{student_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}{file_extension}"
                file_path = os.path.join(upload_dir, filename)
                
                # Save the file
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(avatar.file, buffer)
                
                # Store relative path in database
                photo_url = f"/uploads/profile/{filename}"
                updated_data["photo_url"] = photo_url
            
            updated_data["updated_at"] = datetime.utcnow().isoformat()
            
            # Update branch student if there's data to update
            if updated_data:
                db.branch_students.update_one(
                    {"_id": ObjectId(student_id)},
                    {"$set": updated_data}
                )
            
            # Fetch updated branch student data
            branch_student = db.branch_students.find_one({"_id": ObjectId(student_id)})
            
            # Format join date properly for branch student
            join_date = ""
            if branch_student.get("created_at"):
                created_at = branch_student["created_at"]
                if isinstance(created_at, datetime):
                    join_date = created_at.strftime("%Y-%m-%d")
                else:
                    join_date = str(created_at)[:10]
            elif branch_student.get("date_of_admission"):
                join_date = str(branch_student["date_of_admission"])[:10]
            
            # Get photo URL or use default avatar
            avatar_url = branch_student.get("photo_url", "")
            if avatar_url and not avatar_url.startswith("http"):
                avatar_url = get_full_avatar_url(avatar_url)
            
            profile = {
                "id": str(branch_student["_id"]),
                "_id": str(branch_student["_id"]),
                "user_id": branch_student.get("registration_number", ""),
                "registration_number": branch_student.get("registration_number", ""),
                "name": branch_student.get("student_name", ""),
                "email": branch_student.get("email_id", ""),
                "role": "student",
                "avatar": avatar_url,
                "phone": branch_student.get("contact_no", ""),
                "department": branch_student.get("course", ""),
                "level": branch_student.get("batch", ""),
                "semester": "",
                "joinDate": join_date,
                "points": 0,
                "branch_code": branch_student.get("branch_code", ""),
                "franchise_code": branch_student.get("franchise_code", ""),
                "course": branch_student.get("course", ""),
                "batch": branch_student.get("batch", ""),
                "is_branch_student": True
            }
            return profile
        
        # If not a branch student, update regular user
        user_collection = get_user_collection(db)
        user = user_collection.find_one({"_id": ObjectId(student_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Build update data
        updated_data = {}
        if name is not None:
            updated_data["name"] = name
        if email is not None:
            updated_data["email"] = email
        if phone is not None:
            updated_data["phone"] = phone
        if department is not None:
            updated_data["department"] = department
        if level is not None:
            updated_data["level"] = level
        if semester is not None:
            updated_data["semester"] = semester
        
        # Handle avatar file upload
        if avatar:
            # Create uploads directory if it doesn't exist
            upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "avatars")
            os.makedirs(upload_dir, exist_ok=True)
            
            # Generate unique filename
            file_extension = os.path.splitext(avatar.filename)[1]
            filename = f"{student_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}{file_extension}"
            file_path = os.path.join(upload_dir, filename)
            
            # Save the file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(avatar.file, buffer)
            
            # Store full URL in database for proper display
            avatar_url = f"http://localhost:4000/uploads/avatars/{filename}"
            updated_data["avatar"] = avatar_url
        
        # Update user if there's data to update
        if updated_data:
            result = user_collection.update_one(
                {"_id": ObjectId(student_id)},
                {"$set": updated_data}
            )
        
        # Fetch updated user data
        user = user_collection.find_one({"_id": ObjectId(student_id)})
        
        # Format join date properly
        join_date = ""
        if user.get("joinDate"):
            join_date = user["joinDate"]
        elif user.get("created_at"):
            # If joinDate doesn't exist but created_at does, use created_at
            if isinstance(user["created_at"], datetime):
                join_date = user["created_at"].strftime("%Y-%m-%d")
            else:
                join_date = str(user["created_at"])[:10]  # Take first 10 chars for date part
        
        profile = {
            "id": str(user["_id"]),
            "_id": str(user["_id"]),
            "user_id": user.get("user_id", ""),  # Include custom user_id
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "role": user.get("role", "student"),
            "avatar": get_full_avatar_url(user.get("avatar", "")),  # Convert to full URL
            "phone": user.get("phone", ""),
            "department": user.get("department", ""),  # Add department field
            "level": user.get("level", ""),  # Add level field
            "semester": user.get("semester", ""),  # Add semester field
            "joinDate": join_date,  # Add formatted join date
            "points": user.get("points", 0),  # Add points field
            "is_branch_student": False
        }
        return profile
    except Exception as e:
        print(f"Error updating profile: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Profile update failed: {str(e)}")

# GET /api/settings/{student_id}
@profile_router.get("/settings/{student_id}")
async def get_user_settings(request: Request, student_id: str):
    db = request.app.mongodb
    settings = db.settings.find_one({"student_id": student_id})
    if settings:
        if "_id" in settings:
            settings["id"] = str(settings["_id"])
            del settings["_id"]
    else:
        # Default settings if not found
        settings = {
            "student_id": student_id,
            "theme": "light",
            "notifications": True,
            "language": "english"
        }
    return settings

# PUT /api/settings/{student_id}
@profile_router.put("/settings/{student_id}")
async def update_user_settings(request: Request, student_id: str, updated_settings: dict):
    db = request.app.mongodb
    result = db.settings.update_one(
        {"student_id": student_id},
        {"$set": updated_settings},
        upsert=True
    )
    settings = db.settings.find_one({"student_id": student_id})
    if settings and "_id" in settings:
        settings["id"] = str(settings["_id"])
        del settings["_id"]
    return settings


