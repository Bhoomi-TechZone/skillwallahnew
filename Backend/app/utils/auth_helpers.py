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
    Optimized with caching to reduce database queries
    """
    from app.models.user import get_user_collection
    from app.utils.cache import app_cache
    from bson import ObjectId
    
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Handle both "Bearer" and "bearer" (case insensitive)
    if not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = auth_header.split(" ")[1]
    
    # Try cache first (cache for 5 minutes to reduce DB lookups)
    # CRITICAL FIX: Use hash of FULL token. Using prefix (token[:50]) caused collisions 
    # because JWT headers and initial payload fields are often identical.
    import hashlib
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    cache_key = f"auth_token:{token_hash}"
    
    cached_user = app_cache.get(cache_key)
    if cached_user:
        return cached_user

    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("user_id")
        role = payload.get("role")
        is_branch_admin = payload.get("is_branch_admin", False)
        is_branch_student = payload.get("is_branch_student", False)
        franchise_code = payload.get("franchise_code")
        branch_code = payload.get("branch_code")
        token_email = payload.get("email")
        
        


        # If franchise_code exists AND NOT a student AND NOT SUPER_ADMIN, treat as franchise admin
        # Fix: exclude "SUPER_ADMIN" placeholder
        if franchise_code and franchise_code != "SUPER_ADMIN" and not is_branch_student and role != "student":
            is_branch_admin = True

        db = request.app.mongodb
        
        user_data = None
        
        if is_branch_admin and franchise_code:
            # Handle franchise owner (branch admin) authentication
            
            # Find franchise by franchise_code instead of user_id
            franchise = db["franchises"].find_one({"franchise_code": franchise_code})
            
            if not franchise:
                raise HTTPException(status_code=401, detail="Franchise not found")
            
            # Fetch actual branch_code from branches collection
            branch = db["branches"].find_one({
                "$or": [
                    {"franchise_code": franchise_code},
                    {"admin_id": user_id},
                    {"created_by": user_id}
                ]
            })
            
            if branch:
                # Check ALL possible field names for branch code including variations
                branch_code = (
                    branch.get("branchCode") or 
                    branch.get("branch_code") or 
                    branch.get("centreCode") or
                    branch.get("centre_code") or
                    branch.get("centerCode") or
                    branch.get("center_code") or
                    branch.get("code") or
                    branch.get("branch_id") or
                    branch.get("branchId") or
                    branch.get("centre_id") or
                    branch.get("centreId") or
                    branch.get("center_id") or
                    branch.get("centerId") or
                    franchise_code
                )
            else:
                # If no branch found, use franchise_code as fallback
                branch_code = franchise_code
                logger.warning(f"[Auth] No branch found in branches collection, using franchise_code as branch_code: {branch_code}")
            
            # Get the actual email from the token payload
            token_email = payload.get("email")
            token_name = payload.get("name")
            
            

            
            # Return franchise owner data with branch context
            # USE TOKEN EMAIL, NOT FRANCHISE OWNER EMAIL
            return {
                "user_id": user_id,  # Keep original user_id from token
                "franchise_id": str(franchise["_id"]),
                "name": token_name or franchise.get("owner", {}).get("name", "Franchise Admin"),
                "email": token_email or franchise.get("owner", {}).get("email", "admin@franchise.com"),
                "role": role,
                "franchise_code": franchise["franchise_code"],
                "branch_code": branch_code,  # Add actual branch_code
                "franchise_name": franchise.get("franchise_name", "Unknown Franchise"),
                "is_branch_admin": True,
                "access_scope": "branch",
                "branch_permissions": {
                    "can_view_all_data": False,
                    "restricted_to_franchise": True,
                    "franchise_code": franchise["franchise_code"],
                    "branch_code": branch_code
                }
            }
            
            # Cache the user data for 5 minutes
            app_cache.set(cache_key, user_data, ttl_seconds=300)
            return user_data
            
        elif role == "super_admin" or role == "superadmin":
            # Handle super admin authentication
            # Try to find in super_admins collection
            from app.models.super_admin import find_super_admin_by_email
            
            # Super admin token might have user_id which is _id in super_admins collection
            # But find_super_admin_by_email takes email.
            # Let's try to find by ID if we have a function, or checking logic.
            # Simpler: If role is super_admin in token, just trust token content or verify existence briefly.
            
            # Since we don't have find_by_id readily available in imports seen so far (only by email),
            # and to keep it robust:
            
            db = request.app.mongodb
            super_admin_collection = db["super_admins"]
            super_admin = super_admin_collection.find_one({"_id": ObjectId(user_id)})
            
            if not super_admin:
                # Fallback: Check if they are in users collection with super_admin role (legacy/mixed)
                user_collection = get_user_collection(db)
                # Try finding user by ID first
                super_admin = user_collection.find_one({"_id": ObjectId(user_id)})
                
                # Verify role locally if found
                if super_admin:
                    user_role = super_admin.get("role")
                    # Allow "super_admin" OR "admin" (if not a franchise admin structure)
                    if user_role not in ["super_admin", "admin", "superadmin"]:
                         super_admin = None
                    elif user_role == "admin" and super_admin.get("franchise_code"):
                         # This looks like a franchise admin, so not a super admin here
                         super_admin = None
            
            if super_admin:
                user_data = {
                    "user_id": str(super_admin["_id"]),
                    "name": super_admin.get("name", "Super Admin"),
                    "email": super_admin.get("email", ""),
                    "role": "super_admin",
                    "is_branch_admin": False,
                    "access_scope": "global",
                    "permissions": super_admin.get("permissions", ["all"])
                }
                
                # Cache for 5 minutes
                app_cache.set(cache_key, user_data, ttl_seconds=300)
                return user_data
            else:
                # For super_admin, allow token-based authentication without database lookup
                logger.warning(f"[Auth] Super admin not found in database, using token-based auth | user_id={user_id}")
                user_data = {
                    "user_id": user_id,
                    "name": payload.get("name", "Super Admin"),
                    "email": payload.get("email", "superadmin@system.local"),
                    "role": role,
                    "is_branch_admin": False,
                    "access_scope": "global",
                    "permissions": ["all"]
                }
                
                # Cache for 5 minutes
                app_cache.set(cache_key, user_data, ttl_seconds=300)
                return user_data

        elif is_branch_student or role == "student":
            # Handle branch student authentication
            
            # Student data comes directly from token - no need to look up from database
            user_data = {
                "user_id": user_id,
                "name": payload.get("name", "Student"),
                "email": payload.get("email"),
                "role": "student",
                "branch_code": branch_code,
                "franchise_code": franchise_code,
                "is_branch_student": True,
                "is_branch_admin": False,
                "access_scope": "student"
            }
            
            # Cache for 5 minutes
            app_cache.set(cache_key, user_data, ttl_seconds=300)
            return user_data
            
        else:
            # Handle regular user authentication
            
            user_collection = get_user_collection(db)
            user = user_collection.find_one({"_id": ObjectId(user_id)})
            
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            
            user_data = {
                "user_id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "is_branch_admin": False,
                "access_scope": "global"
            }
            
            # Cache for 5 minutes
            app_cache.set(cache_key, user_data, ttl_seconds=300)
            return user_data
            
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
    except Exception as e:
        import traceback
        logger.error(f"[Auth] Unexpected error in get_current_user: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

# ------------------- Token Generation -------------------

def create_access_token(data: dict, expires_delta: timedelta = timedelta(days=7)):
    """Create access token with extended expiry for admin users - 7 days"""
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    

    return token

def create_refresh_token(data: dict, expires_delta: timedelta = timedelta(days=7)):
    """Create refresh token with 7-day expiry"""
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    

    return token

def verify_super_admin(user):
    """Verify if user is a super admin (not branch admin)"""
    return user.get("role") == "admin" and not user.get("is_branch_admin", False)

def verify_branch_admin(user):
    """Verify if user is a branch admin"""
    return user.get("is_branch_admin", False) and user.get("franchise_code")

def get_user_access_scope(user):
    """Get the access scope for a user"""
    return user.get("access_scope", "global")

def can_access_global_data(user):
    """Check if user can access global data"""
    return not user.get("is_branch_admin", False) or user.get("role") == "super_admin"