# MongoDB collection access for super admin data
from typing import Dict, Any, Optional
from pymongo import MongoClient
from bson import ObjectId
import bcrypt
from datetime import datetime, timedelta

def get_super_admin_collection(db):
    """Get the super_admins collection"""
    return db["super_admins"]

def create_super_admin(db, email: str, password: str, name: str) -> Dict[str, Any]:
    """Create a new super admin"""
    from app.utils.security import get_password_hash
    
    collection = get_super_admin_collection(db)
    
    # Check if super admin already exists
    existing = collection.find_one({"email": email})
    if existing:
        raise ValueError("Super admin with this email already exists")
    
    # Hash the password
    hashed_password = get_password_hash(password)
    
    super_admin_data = {
        "email": email,
        "password": hashed_password,
        "name": name,
        "role": "super_admin",
        "is_active": True,
        "is_superuser": True,
        "permissions": ["all"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "last_login": None,
        "login_attempts": 0,
        "locked_until": None
    }
    
    result = collection.insert_one(super_admin_data)
    super_admin_data["_id"] = result.inserted_id
    
    return super_admin_data

def find_super_admin_by_email(db, email: str) -> Optional[Dict[str, Any]]:
    """Find super admin by email"""
    collection = get_super_admin_collection(db)
    return collection.find_one({"email": email})

def update_super_admin_login(db, super_admin_id: ObjectId) -> None:
    """Update super admin last login time and reset login attempts"""
    collection = get_super_admin_collection(db)
    collection.update_one(
        {"_id": super_admin_id},
        {
            "$set": {
                "last_login": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "login_attempts": 0,
                "locked_until": None
            }
        }
    )

def increment_login_attempts(db, super_admin_id: ObjectId) -> None:
    """Increment failed login attempts"""
    collection = get_super_admin_collection(db)
    collection.update_one(
        {"_id": super_admin_id},
        {
            "$inc": {"login_attempts": 1},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )

def lock_super_admin_account(db, super_admin_id: ObjectId, lock_duration_minutes: int = 30) -> None:
    """Lock super admin account for specified duration"""
    collection = get_super_admin_collection(db)
    lock_until = datetime.utcnow() + timedelta(minutes=lock_duration_minutes)
    
    collection.update_one(
        {"_id": super_admin_id},
        {
            "$set": {
                "locked_until": lock_until,
                "updated_at": datetime.utcnow()
            }
        }
    )

def is_super_admin_locked(super_admin: Dict[str, Any]) -> bool:
    """Check if super admin account is locked"""
    if not super_admin.get("locked_until"):
        return False
    
    return datetime.utcnow() < super_admin["locked_until"]