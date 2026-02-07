# from fastapi import HTTPException
# from bson import ObjectId
# from app.models.user import get_user_collection

# def get_all_users(db):
#     user_collection = get_user_collection(db)
#     users = list(user_collection.find({}, {"password": 0}))
#     return users

# def get_user_by_id(db, user_id):
#     user_collection = get_user_collection(db)
#     user = user_collection.find_one({"_id": ObjectId(user_id)}, {"password": 0})
#     if not user:
#         raise HTTPException(status_code=404, detail="User not found")
#     return user

# def update_user(db, user_id, updates):
#     user_collection = get_user_collection(db)
#     result = user_collection.update_one(
#         {"_id": ObjectId(user_id)},
#         {"$set": updates.dict(exclude_unset=True)}
#     )
#     if result.matched_count == 0:
#         raise HTTPException(status_code=404, detail="User not found")
#     return {"success": True, "message": "User updated successfully"}

# def delete_user(db, user_id):
#     user_collection = get_user_collection(db)
#     result = user_collection.delete_one({"_id": ObjectId(user_id)})
#     if result.deleted_count == 0:
#         raise HTTPException(status_code=404, detail="User not found")
#     return {"success": True, "message": "User deleted"}

from fastapi import HTTPException
from bson import ObjectId
from app.models.user import get_user_collection
from app.utils.serializers import serialize_document  # Import your helper
from datetime import datetime
from passlib.context import CryptContext
import logging

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_all_users(db, branch_filter: dict = None):
    try:
        user_collection = get_user_collection(db)
        
        # Apply branch filter for multi-tenancy (SECURITY: Apply first!)
        query = branch_filter.copy() if branch_filter else {}
        
        users = list(user_collection.find(query, {"password": 0}))
        return [serialize_document(u) for u in users]
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching users")

def get_user_by_id(db, user_id, branch_filter: dict = None):
    try:
        user_collection = get_user_collection(db)
        
        # Validate ObjectId format
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        # Apply branch filter for multi-tenancy (SECURITY: Apply first!)
        query = branch_filter.copy() if branch_filter else {}
        query["_id"] = ObjectId(user_id)
        
        user = user_collection.find_one(query, {"password": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return serialize_document(user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching user")

def update_user(db, user_id, updates):
    try:
        user_collection = get_user_collection(db)
        
        # Validate ObjectId format
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        # Check if user exists
        existing_user = user_collection.find_one({"_id": ObjectId(user_id)})
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Validate role if provided
        valid_roles = ['student', 'instructor', 'admin']
        if hasattr(updates, 'role') and updates.role and updates.role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
        
        # Update user
        update_data = updates.dict(exclude_unset=True)
        result = user_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        updated_user = user_collection.find_one({"_id": ObjectId(user_id)}, {"password": 0})
        return {
            "success": True,
            "message": "User updated successfully",
            "data": serialize_document(updated_user)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while updating user")

def delete_user(db, user_id):
    try:
        user_collection = get_user_collection(db)
        
        # Validate ObjectId format
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        # Check if user exists
        existing_user = user_collection.find_one({"_id": ObjectId(user_id)})
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Delete user
        result = user_collection.delete_one({"_id": ObjectId(user_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {
            "success": True, 
            "message": f"User {existing_user.get('name', 'Unknown')} deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while deleting user")

def create_user(db, user_data):
    try:
        user_collection = get_user_collection(db)
        
        # Check if email already exists
        existing_user = user_collection.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Hash password
        hashed_password = pwd_context.hash(user_data.password)
        
        # Create user document
        new_user = {
            "name": user_data.name,
            "email": user_data.email,
            "password": hashed_password,
            "role": user_data.role,
            "created_at": datetime.now().isoformat(),
            "last_login": None,
            "is_active": True
        }
        
        # Insert user
        result = user_collection.insert_one(new_user)
        
        # Get created user (without password)
        created_user = user_collection.find_one({"_id": result.inserted_id}, {"password": 0})
        
        return {
            "success": True,
            "message": f"User {user_data.name} created successfully",
            "data": serialize_document(created_user)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while creating user")
