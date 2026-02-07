"""
Enhanced auth helpers with support for franchise owner authentication
Handles both regular users and franchise owners (branch admins)
"""

from fastapi import Request, HTTPException
from jose import JWTError, jwt
from app.config import settings
from datetime import datetime, timedelta
import logging

# Setup logger
logger = logging.getLogger("uvicorn")

# ------------------- User Auth -------------------

async def get_current_user(request: Request):
    """
    Extract and validate JWT token from Authorization header
    Supports both regular users and franchise owners (branch admins)
    """
    from app.models.user import get_user_collection
    from bson import ObjectId
    from bson.errors import InvalidId
    
    auth_header = request.headers.get("Authorization")
    logger.info(f"[Auth] Processing request for path: {request.url.path}")
    logger.info(f"[Auth] Authorization header: {auth_header[:50] if auth_header else 'None'}...")

    if not auth_header:
        logger.warning(f"[Auth] No authorization header found for {request.url.path}")
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Handle both "Bearer" and "bearer" (case insensitive)
    auth_lower = auth_header.lower()
    if not auth_lower.startswith("bearer "):
        logger.warning(f"[Auth] Authorization header invalid format for {request.url.path}")
        logger.warning(f"[Auth] Expected 'Bearer <token>', got: {auth_header[:30]}...")
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = auth_header.split(" ")[1]
    logger.info(f"[Auth] Token extracted, length: {len(token)}")

    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("user_id")
        role = payload.get("role")
        is_branch_admin = payload.get("is_branch_admin", False)
        franchise_code = payload.get("franchise_code")

        logger.info(f"[Auth] Token decoded successfully | user_id={user_id}, role={role}, is_branch_admin={is_branch_admin}")

        db = request.app.mongodb
        
        # Check if user is admin, super_admin, or franchise_admin (these roles have priority over is_branch_admin flag)
        if role in ["admin", "franchise_admin", "super_admin", "superadmin"]:
            logger.info(f"[Auth] Processing {role} authentication - overriding branch admin flag")
            
            # For admin and franchise_admin roles, always set is_branch_admin to False
            is_branch_admin = False
            
            # First try users collection
            user_collection = get_user_collection(db)
            user = user_collection.find_one({"_id": ObjectId(user_id)})
            
            if user:
                logger.info(f"[Auth] User found in users collection: {user['name']} ({user['email']})")
                return {
                    "user_id": str(user["_id"]),
                    "name": user["name"],
                    "email": user["email"],
                    "role": user["role"],
                    "is_branch_admin": False,
                    "access_scope": "global" if role in ["admin", "super_admin", "superadmin"] else "franchise",
                    "franchise_code": franchise_code,
                    "branch_code": payload.get("branch_code")
                }
            
            # If not found in users collection, try franchises collection
            franchise = db.franchises.find_one({"_id": ObjectId(user_id)})
            if franchise:
                logger.info(f"[Auth] User found in franchises collection: {franchise['owner']['name']} ({franchise['owner']['email']})")
                return {
                    "user_id": str(franchise["_id"]),
                    "franchise_id": str(franchise["_id"]),
                    "name": franchise["owner"]["name"],
                    "email": franchise["owner"]["email"],
                    "role": role,  # Use role from token
                    "is_branch_admin": False,
                    "access_scope": "global" if role in ["admin", "super_admin", "superadmin"] else "franchise",
                    "franchise_code": franchise.get("franchise_code"),
                    "branch_code": payload.get("branch_code")
                }
            
            # For super_admin, allow token-based authentication without database lookup
            if role in ["super_admin", "superadmin"]:
                logger.warning(f"[Auth] Super admin not found in database, using token-based auth | user_id={user_id}")
                return {
                    "user_id": user_id,
                    "name": payload.get("name", "Super Admin"),
                    "email": payload.get("email", "superadmin@system.local"),
                    "role": role,
                    "is_branch_admin": False,
                    "access_scope": "global",
                    "franchise_code": franchise_code,
                    "branch_code": payload.get("branch_code")
                }
            
            logger.error(f"[Auth] User not found in any collection | user_id={user_id}")
            raise HTTPException(status_code=401, detail="User not found")
            
        elif is_branch_admin and franchise_code:
            # Handle branch admin authentication
            logger.info(f"[Auth] Processing branch admin authentication for franchise: {franchise_code}")
            
            # Find branch admin user in users collection
            user = db.users.find_one({"_id": ObjectId(user_id), "role": "branch_admin"})
            
            if not user:
                logger.error(f"[Auth] Branch admin user not found in database | user_id={user_id}")
                raise HTTPException(status_code=401, detail="Branch admin user not found")
            
            # Verify franchise code matches
            if user.get("franchise_code") != franchise_code:
                logger.error(f"[Auth] Franchise code mismatch | expected={franchise_code}, found={user.get('franchise_code')}")
                raise HTTPException(status_code=401, detail="Franchise authentication failed")
            
            # Find the associated franchise for additional context
            franchise = db.franchises.find_one({"franchise_code": franchise_code})
            
            if not franchise:
                logger.error(f"[Auth] Franchise not found for code: {franchise_code}")
                raise HTTPException(status_code=401, detail="Franchise not found")
            
            logger.info(f"[Auth] Branch admin found: {user['name']} ({user['email']})")
            
            # Return branch admin data with franchise context
            return {
                "user_id": str(user["_id"]),
                "franchise_id": str(franchise["_id"]),
                "name": user["name"],
                "email": user["email"],
                "role": role,
                "franchise_code": franchise["franchise_code"],
                "franchise_name": franchise["franchise_name"],
                "is_branch_admin": True,
                "access_scope": "branch",
                "branch_permissions": {
                    "can_view_all_data": False,
                    "restricted_to_franchise": True,
                    "franchise_code": franchise["franchise_code"]
                }
            }
        elif role == "student":
            # Handle branch student authentication
            logger.info(f"[Auth] Processing student authentication")
            
            # Check in branch_students collection
            student = db.branch_students.find_one({"_id": ObjectId(user_id)})
            
            if not student:
                logger.error(f"[Auth] Student not found in database | user_id={user_id}")
                raise HTTPException(status_code=401, detail="Student not found")

            logger.info(f"[Auth] Student found in database: {student.get('name', student.get('student_name'))} ({student.get('email', student.get('email_id'))})")
            
            return {
                "user_id": str(student["_id"]),
                "student_id": student.get("student_id"),
                "name": student.get("name", student.get("student_name")),
                "email": student.get("email", student.get("email_id")),
                "role": "student",
                "is_branch_student": True,
                "branch_code": student.get("branch_code"),
                "franchise_code": student.get("franchise_code"),
                "course": student.get("course", student.get("course_name")),
                "batch": student.get("batch", student.get("batch_name")),
                "access_scope": "student"
            }
        else:
            # Handle regular user authentication
            logger.info(f"[Auth] Processing regular user authentication")
            
            user_collection = get_user_collection(db)
            user = user_collection.find_one({"_id": ObjectId(user_id)})
            
            if not user:
                logger.error(f"[Auth] User not found in database | user_id={user_id}")
                raise HTTPException(status_code=401, detail="User not found")

            logger.info(f"[Auth] User found in database: {user['name']} ({user['email']})")
            
            return {
                "user_id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "is_branch_admin": False,
                "access_scope": "global"
            }
            
    except JWTError as e:
        error_msg = str(e)
        logger.error(f"[Auth] JWT decoding error: {error_msg}")
        
        # Provide more specific error messages
        if "Signature verification failed" in error_msg or "signature" in error_msg.lower():
            logger.error(f"[Auth] Token signature verification failed - token may be from different secret key or expired")
            raise HTTPException(status_code=401, detail="Invalid token - signature verification failed")
        elif "expired" in error_msg.lower():
            logger.error(f"[Auth] Token has expired")
            raise HTTPException(status_code=401, detail="Token has expired")
        else:
            raise HTTPException(status_code=401, detail="Invalid token")
    except InvalidId as e:
        logger.error(f"[Auth] Invalid ObjectId in user_id: {e}")
        raise HTTPException(status_code=401, detail="Invalid user ID format")
    except Exception as e:
        logger.error(f"[Auth] Unexpected error in get_current_user: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# ------------------- Token Generation -------------------

def create_access_token(data: dict, expires_delta: timedelta = timedelta(days=365)):
    """Create access token with VERY LONG expiry - 365 days for persistent session"""
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    logger.info(f"PERSISTENT Access token created | expires at {expire} (365 days)")
    return token

def create_refresh_token(data: dict, expires_delta: timedelta = timedelta(days=365)):
    """Create refresh token with 7-day expiry"""
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    logger.info(f"Refresh token created | expires at {expire}")
    return token

def verify_super_admin(user):
    """Verify if user is a super admin (not branch admin)"""
    return user.get("role") == "super_admin"

def verify_branch_admin(user):
    """Verify if user is a branch admin"""
    return user.get("is_branch_admin", False) and user.get("franchise_code")

def get_user_access_scope(user):
    """Get the access scope for a user"""
    return user.get("access_scope", "global")

def can_access_global_data(user):
    """Check if user can access global data"""
    return not user.get("is_branch_admin", False) or user.get("role") == "super_admin"