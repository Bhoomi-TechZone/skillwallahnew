from fastapi import APIRouter, Request, Path, HTTPException
from app.services.user_service import (
    get_all_users, get_user_by_id, update_user, delete_user, create_user
)
from app.schemas.user import UserUpdate, UserResponse, UserCreate
from app.models.user import get_user_collection
from app.utils.serializers import serialize_document
from app.utils.branch_filter import BranchAccessManager
import logging

logger = logging.getLogger(__name__)
user_router = APIRouter(prefix="/users", tags=["Users"])

@user_router.get("/")
def get_users(request: Request):
    """Get all users with proper error handling"""
    try:
        db = request.app.mongodb
        
        # Get branch filter for multi-tenancy
        current_user = getattr(request.state, 'user', None)
        branch_filter = BranchAccessManager.get_branch_filter(current_user)
        
        users = get_all_users(db, branch_filter)
        return {
            "success": True,
            "message": "Users fetched successfully",
            "data": users,
            "count": len(users)
        }
    except Exception as e:
        logger.error(f"Error in get_users endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")

@user_router.get("/students")
def get_students(request: Request):
    """Get all students"""
    try:
        db = request.app.mongodb
        user_collection = get_user_collection(db)
        
        # Get branch filter for multi-tenancy
        current_user = getattr(request.state, 'user', None)
        branch_filter = BranchAccessManager.get_branch_filter(current_user)
        
        # Build query with role and branch filtering
        query = {"role": "student"}
        if branch_filter:
            query.update(branch_filter)
        
        students = list(user_collection.find(query, {"password": 0}))
        formatted_students = [serialize_document(student) for student in students]
        
        return {
            "success": True,
            "message": "Students fetched successfully",
            "users": formatted_students,  # Changed from 'data' to 'users' to match frontend
            "count": len(formatted_students)
        }
    except Exception as e:
        logger.error(f"Error in get_students endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch students")

@user_router.get("/instructors")
def get_instructors(request: Request):
    """Get all instructors"""
    try:
        db = request.app.mongodb
        user_collection = get_user_collection(db)
        
        # Get branch filter for multi-tenancy
        current_user = getattr(request.state, 'user', None)
        # Fixed BranchAccessManager usage
        branch_filter = access_manager.get_filter_query()
        
        # Build query with role and branch filtering
        query = {"role": "instructor"}
        if branch_filter:
            query.update(branch_filter)
        
        instructors = list(user_collection.find(query, {"password": 0}))
        formatted_instructors = [serialize_document(instructor) for instructor in instructors]
        
        return {
            "success": True,
            "message": "Instructors fetched successfully", 
            "data": formatted_instructors,
            "count": len(formatted_instructors)
        }
    except Exception as e:
        logger.error(f"Error in get_instructors endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch instructors")

@user_router.post("/")
def create_new_user(request: Request, payload: UserCreate):
    """Create a new user"""
    try:
        db = request.app.mongodb
        result = create_user(db, payload)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in create_user endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create user")

@user_router.get("/{user_id}")
def get_user(request: Request, user_id: str = Path(...)):
    """Get user by ID with proper error handling"""
    try:
        db = request.app.mongodb
        
        # Get branch filter for multi-tenancy
        current_user = getattr(request.state, 'user', None)
        # Fixed BranchAccessManager usage
        branch_filter = access_manager.get_filter_query()
        
        user = get_user_by_id(db, user_id, branch_filter)
        return {
            "success": True,
            "message": "User fetched successfully",
            "data": user
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_user endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch user")

@user_router.put("/{user_id}")
def update_user_info(request: Request, user_id: str, payload: UserUpdate):
    """Update user with proper error handling"""
    try:
        db = request.app.mongodb
        result = update_user(db, user_id, payload)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in update_user endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update user")

@user_router.delete("/{user_id}")
def delete_user_account(request: Request, user_id: str):
    """Delete user with proper error handling"""
    try:
        db = request.app.mongodb
        result = delete_user(db, user_id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete_user endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete user")


