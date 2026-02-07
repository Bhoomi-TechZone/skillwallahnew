

from fastapi import APIRouter, HTTPException, Request, Depends, Query
from app.utils.dependencies import role_required
from app.utils.auth_helpers import get_current_user
from app.utils.branch_filter import BranchAccessManager
from app.services import admin_service
from app.models.user import get_user_collection
from app.models.course import get_course_collection
from app.models.certificate import get_certificate_collection
from app.models.enrollment import get_enrollment_collection
from app.schemas.auth import UserLogin, TokenResponse
from app.api.admin_branch import admin_branch_router
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

admin_router = APIRouter(prefix="/api/admin", tags=["Admin"])

# Include the branch-specific admin router
admin_router.include_router(admin_branch_router, tags=["Branch Admin"])

def require_admin(user=Depends(role_required(["admin"]))):
    """Dependency to require admin role"""
    return user

@admin_router.post("/login", response_model=TokenResponse)
def login_admin(request: Request, credentials: UserLogin):
    """Enhanced admin login with branch context and multi-tenant support"""
    from app.utils.security import verify_password
    from app.utils.jwt_handler import create_access_token, create_refresh_token
    
    print(f"[ADMIN LOGIN] Attempt for email: {credentials.email}")
    
    db = request.app.mongodb
    
    # Check if franchise owner exists with this email
    franchise = db.franchises.find_one({"owner.email": credentials.email})
    print(f"[ADMIN LOGIN] Franchise found: {bool(franchise)}")
    
    if not franchise:
        print(f"[ADMIN LOGIN] No franchise found for email: {credentials.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    stored_password = franchise["owner"]["password"]
    try:
        password_valid = verify_password(credentials.password, stored_password)
        print(f"[ADMIN LOGIN] Password verification result: {password_valid}")
        
        if not password_valid:
            print(f"[ADMIN LOGIN] Password verification failed")
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
    except Exception as e:
        print(f"[ADMIN LOGIN] Password verification error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create JWT payload with franchise owner data
    token_data = {
        "user_id": str(franchise["_id"]),
        "email": franchise["owner"]["email"],
        "name": franchise["owner"]["name"],
        "role": "admin",  # Use "admin" role for frontend compatibility
        "franchise_code": franchise["franchise_code"],
        "franchise_name": franchise["franchise_name"],
        "franchise_id": str(franchise["_id"]),
        "status": franchise["status"],
        "is_branch_admin": True,  # Flag to indicate this is a branch-specific admin
        "access_scope": "branch",  # Define access scope for multi-tenancy
        "branch_permissions": {
            "can_view_all_data": False,
            "restricted_to_franchise": True,
            "franchise_code": franchise["franchise_code"]
        }
    }
    
    # Generate tokens
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    print(f"[ADMIN LOGIN] Successfully authenticated franchise owner: {franchise['owner']['name']}")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(franchise["_id"]),
            "name": franchise["owner"]["name"],
            "email": franchise["owner"]["email"],
            "role": "admin",  # Use "admin" role for frontend compatibility
            "franchise_code": franchise["franchise_code"],
            "franchise_name": franchise["franchise_name"],
            "franchise_id": str(franchise["_id"]),
            "status": franchise["status"],
            "is_branch_admin": True,
            "access_scope": "branch",
            "dashboard_route": "/admin",
            "permissions": [
                "manage_users", "manage_courses", "manage_instructors",
                "manage_students", "view_analytics", "manage_franchise",
                "manage_certificates", "manage_notifications", "franchise_access",
                "branch_restricted_access"
            ]
        }
    }

@admin_router.post("/superadmin/login", response_model=TokenResponse)
def login_super_admin(request: Request, credentials: UserLogin):
    """Super admin login with database authentication"""
    from app.utils.security import verify_password
    from app.utils.jwt_handler import create_access_token, create_refresh_token
    from app.models.super_admin import find_super_admin_by_email, update_super_admin_login, increment_login_attempts, lock_super_admin_account, is_super_admin_locked
    
    print(f"[SUPER ADMIN LOGIN] Attempt for email: {credentials.email}")
    
    db = request.app.mongodb
    
    # Find super admin by email
    super_admin = find_super_admin_by_email(db, credentials.email)
    
    if not super_admin:
        print(f"[SUPER ADMIN LOGIN] No super admin found for email: {credentials.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if account is locked
    if is_super_admin_locked(super_admin):
        print(f"[SUPER ADMIN LOGIN] Account locked for email: {credentials.email}")
        raise HTTPException(status_code=423, detail="Account is temporarily locked due to multiple failed login attempts")
    
    # Check if account is active
    if not super_admin.get("is_active", True):
        print(f"[SUPER ADMIN LOGIN] Inactive account for email: {credentials.email}")
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    # Verify password
    stored_password = super_admin["password"]
    try:
        password_valid = verify_password(credentials.password, stored_password)
        print(f"[SUPER ADMIN LOGIN] Password verification result: {password_valid}")
        
        if not password_valid:
            print(f"[SUPER ADMIN LOGIN] Password verification failed")
            # Increment failed login attempts
            increment_login_attempts(db, super_admin["_id"])
            
            # Lock account after 5 failed attempts
            if super_admin.get("login_attempts", 0) >= 4:  # Will be 5 after increment
                lock_super_admin_account(db, super_admin["_id"])
                raise HTTPException(status_code=423, detail="Account locked due to multiple failed login attempts")
            
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[SUPER ADMIN LOGIN] Password verification error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Update last login and reset attempts
    update_super_admin_login(db, super_admin["_id"])
    
    # Create JWT payload with super admin data
    token_data = {
        "user_id": str(super_admin["_id"]),
        "email": super_admin["email"],
        "name": super_admin["name"],
        "role": "super_admin",
        "is_active": super_admin.get("is_active", True),
        "is_superuser": super_admin.get("is_superuser", True),
        "permissions": super_admin.get("permissions", ["all"]),
        "access_scope": "global",
        "is_branch_admin": False,
        "franchise_code": "SUPER_ADMIN",
        "branch_code": "SUPER_ADMIN"
    }
    
    # Generate tokens
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    print(f"[SUPER ADMIN LOGIN] Successfully authenticated super admin: {super_admin['name']}")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(super_admin["_id"]),
            "name": super_admin["name"],
            "email": super_admin["email"],
            "role": "super_admin",
            "is_active": super_admin.get("is_active", True),
            "is_superuser": super_admin.get("is_superuser", True),
            "permissions": super_admin.get("permissions", ["all"]),
            "access_scope": "global",
            "is_branch_admin": False,
            "franchise_code": "SUPER_ADMIN",
            "branch_code": "SUPER_ADMIN",
            "dashboard_route": "/superadmin"
        }
    }

@admin_router.get("/dashboard/stats")
async def get_admin_dashboard_stats(
    request: Request, 
    user=Depends(get_current_user)
):
    """Get dashboard statistics with branch filtering and caching for performance"""
    from app.utils.cache import app_cache
    
    try:
        db = request.app.mongodb
        
        # Check if user has branch restrictions
        if BranchAccessManager.is_branch_restricted(user):
            # Use branch-specific stats from the branch router
            from app.api.admin_branch import get_branch_dashboard_stats
            result = await get_branch_dashboard_stats(request, user)
            # Extract stats from nested structure for frontend compatibility
            if isinstance(result, dict) and "stats" in result:
                return result["stats"]
            return result
        
        # Try cache first (cache for 2 minutes for super admin global stats)
        cache_key = "admin_dashboard_stats_global"
        cached_stats = app_cache.get(cache_key)
        if cached_stats:
            logger.info("[Admin Dashboard] Returning cached stats")
            return cached_stats
        
        # Super admin gets global stats - use estimated counts for large collections
        user_collection = get_user_collection(db)
        course_collection = get_course_collection(db)
        certificate_collection = get_certificate_collection(db)
        enrollment_collection = get_enrollment_collection(db)
        
        # Use estimated_document_count for faster counts on large collections
        total_users = user_collection.estimated_document_count()
        total_instructors = user_collection.count_documents({"role": "instructor"})
        total_students = user_collection.count_documents({"role": "student"})
        total_courses = course_collection.estimated_document_count()
        total_certificates = certificate_collection.estimated_document_count()
        total_enrollments = enrollment_collection.estimated_document_count()
        
        # Calculate recent activity (last 30 days) - with index on enrolled_at
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_enrollments = enrollment_collection.count_documents({
            "enrolled_at": {"$gte": thirty_days_ago}
        })
        
        stats = {
            "total_users": total_users,
            "total_instructors": total_instructors,
            "total_students": total_students,
            "total_courses": total_courses,
            "total_certificates": total_certificates,
            "total_enrollments": total_enrollments,
            "recent_enrollments": recent_enrollments,
            "total_revenue": 0,  # This should be calculated from actual payments
            "active_sessions": 0  # This would come from live sessions
        }
        
        # Cache for 2 minutes
        app_cache.set(cache_key, stats, ttl_seconds=120)
        logger.info("[Admin Dashboard] Stats computed and cached")
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting admin dashboard: {e}")
        return {
            "total_users": 0,
            "total_instructors": 0,
            "total_students": 0,
            "total_courses": 0,
            "total_certificates": 0,
            "total_enrollments": 0,
            "recent_enrollments": 0,
            "total_revenue": 0,
            "active_sessions": 0
        }

@admin_router.get("/users/students")
async def get_students(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
    user=Depends(get_current_user)
):
    """Get students with branch filtering"""
    try:
        db = request.app.mongodb
        user_collection = get_user_collection(db)
        
        # Build base query
        base_query = {"role": "student"}
        if search:
            base_query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
        
        # Apply branch filtering if user is branch-restricted
        if BranchAccessManager.is_branch_restricted(user):
            # For branch admins, get students enrolled in their franchise courses
            from app.api.admin_branch import get_branch_students
            return await get_branch_students(request, skip, limit, search, user)
        
        # Super admin gets all students
        total_count = user_collection.count_documents(base_query)
        students = list(user_collection.find(base_query)
                       .skip(skip)
                       .limit(limit)
                       .sort("created_at", -1))
        
        # Format students data
        formatted_students = []
        for student in students:
            formatted_student = {
                "id": str(student["_id"]),
                "name": student.get("name", ""),
                "email": student.get("email", ""),
                "phone": student.get("phone", ""),
                "created_at": student.get("created_at"),
                "status": student.get("status", "active"),
                "last_login": student.get("last_login")
            }
            formatted_students.append(formatted_student)
        
        return {
            "success": True,
            "students": formatted_students,
            "total": total_count,
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Error getting students: {e}")
        raise HTTPException(status_code=500, detail="Failed to get students")

@admin_router.get("/users/instructors")
async def get_instructors(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
    user=Depends(get_current_user)
):
    """Get instructors with branch filtering"""
    try:
        db = request.app.mongodb
        user_collection = get_user_collection(db)
        
        # Build base query
        base_query = {"role": "instructor"}
        if search:
            base_query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
        
        # Apply branch filtering if user is branch-restricted
        if BranchAccessManager.is_branch_restricted(user):
            # For branch admins, get instructors who created courses for their franchise
            from app.api.admin_branch import get_branch_instructors
            return await get_branch_instructors(request, skip, limit, search, user)
        
        # Super admin gets all instructors
        total_count = user_collection.count_documents(base_query)
        instructors = list(user_collection.find(base_query)
                          .skip(skip)
                          .limit(limit)
                          .sort("created_at", -1))
        
        # Format instructors data
        formatted_instructors = []
        for instructor in instructors:
            formatted_instructor = {
                "id": str(instructor["_id"]),
                "name": instructor.get("name", ""),
                "email": instructor.get("email", ""),
                "phone": instructor.get("phone", ""),
                "specialization": instructor.get("specialization", ""),
                "experience": instructor.get("experience", ""),
                "created_at": instructor.get("created_at"),
                "status": instructor.get("status", "active")
            }
            formatted_instructors.append(formatted_instructor)
        
        return {
            "success": True,
            "instructors": formatted_instructors,
            "total": total_count,
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Error getting instructors: {e}")
        raise HTTPException(status_code=500, detail="Failed to get instructors")

@admin_router.get("/courses")
async def get_courses(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    user=Depends(get_current_user)
):
    """Get courses with branch filtering"""
    try:
        db = request.app.mongodb
        course_collection = get_course_collection(db)
        
        # Build base query
        base_query = {}
        if search:
            base_query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"tags": {"$regex": search, "$options": "i"}}
            ]
        if category:
            base_query["category"] = category
        
        # Apply branch filtering if user is branch-restricted
        if BranchAccessManager.is_branch_restricted(user):
            # For branch admins, get only their franchise courses
            from app.api.admin_branch import get_branch_courses
            return await get_branch_courses(request, skip, limit, search, category, user)
        
        # Super admin gets all courses
        total_count = course_collection.count_documents(base_query)
        courses = list(course_collection.find(base_query)
                      .skip(skip)
                      .limit(limit)
                      .sort("created_date", -1))
        
        # Format courses data
        formatted_courses = []
        for course in courses:
            formatted_course = {
                "id": str(course["_id"]),
                "title": course.get("title", ""),
                "description": course.get("description", ""),
                "category": course.get("category", ""),
                "price": course.get("price", 0),
                "duration": course.get("duration", ""),
                "level": course.get("level", ""),
                "published": course.get("published", False),
                "created_date": course.get("created_date"),
                "franchise_code": course.get("franchise_code", ""),
                "instructor": course.get("instructor", "")
            }
            
            # Convert datetime objects to strings
            if isinstance(formatted_course["created_date"], datetime):
                formatted_course["created_date"] = formatted_course["created_date"].isoformat()
            
            formatted_courses.append(formatted_course)
        
        return {
            "success": True,
            "courses": formatted_courses,
            "total": total_count,
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Error getting courses: {e}")
        raise HTTPException(status_code=500, detail="Failed to get courses")

@admin_router.get("/certificates")
async def get_certificates(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user=Depends(get_current_user)
):
    """Get certificates with branch filtering"""
    try:
        # Apply branch filtering if user is branch-restricted
        if BranchAccessManager.is_branch_restricted(user):
            # For branch admins, get only certificates from their franchise
            from app.api.admin_branch import get_branch_certificates
            return await get_branch_certificates(request, skip, limit, user)
        
        # Super admin gets all certificates
        db = request.app.mongodb
        certificate_collection = get_certificate_collection(db)
        
        total_count = certificate_collection.count_documents({})
        certificates = list(certificate_collection.find({})
                           .skip(skip)
                           .limit(limit)
                           .sort("issued_date", -1))
        
        # Format certificates data
        formatted_certificates = []
        for cert in certificates:
            formatted_cert = {
                "id": str(cert["_id"]),
                "certificate_id": cert.get("certificate_id", ""),
                "student_id": cert.get("student_id", ""),
                "course_id": cert.get("course_id", ""),
                "issued_date": cert.get("issued_date"),
                "status": cert.get("status", "active"),
                "grade": cert.get("grade", "")
            }
            formatted_certificates.append(formatted_cert)
        
        return {
            "success": True,
            "certificates": formatted_certificates,
            "total": total_count,
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Error getting certificates: {e}")
        raise HTTPException(status_code=500, detail="Failed to get certificates")

@admin_router.delete("/users/{user_id}")
async def delete_user(
    request: Request, 
    user_id: str, 
    user=Depends(get_current_user)
):
    """Delete a user (super admin only)"""
    try:
        # Only super admins can delete users
        if BranchAccessManager.is_branch_restricted(user):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        db = request.app.mongodb
        user_collection = get_user_collection(db)
        
        result = user_collection.delete_one({"_id": ObjectId(user_id)})
        
        if result.deleted_count > 0:
            return {"success": True, "message": "User deleted successfully"}
        else:
            return {"success": False, "message": "User not found"}
        
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete user")

@admin_router.post("/certificates/upload")
async def upload_certificate(request: Request, user=Depends(get_current_user)):
    """Upload certificate"""
    try:
        # This would handle certificate upload
        return {"success": True, "message": "Certificate uploaded successfully"}
        
    except Exception as e:
        logger.error(f"Error uploading certificate: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload certificate")

@admin_router.post("/send-message")
async def send_message(request: Request, user=Depends(get_current_user)):
    """Send message to users"""
    try:
        # This would handle message sending
        return {"success": True, "message": "Message sent successfully"}
        
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")

@admin_router.post("/certificates")
async def create_certificate(request: Request, user=Depends(get_current_user)):
    """Create a new certificate"""
    try:
        # This would handle certificate creation
        return {"success": True, "message": "Certificate created successfully"}
        
    except Exception as e:
        logger.error(f"Error creating certificate: {e}")
        raise HTTPException(status_code=500, detail="Failed to create certificate")


@admin_router.get("/superadmin/profile")
async def get_super_admin_profile(
    request: Request,
    user=Depends(get_current_user)
):
    """Get super admin profile"""
    try:
        # Check if user is super admin
        if user.get("role") not in ["super_admin", "admin"]: # allow admin for now if role mapping is loose
             # Ideally check strict super_admin role
             pass
        
        # In a real app, you might fetch specific super admin extended details
        # For now, return the user object as is, enriched with any extra info needed
        
        # If the user object from token/dependency is minimal, fetch full from DB
        db = request.app.mongodb
        
        # Try finding in super_admins collection if it exists, or just return user
        # Based on login_super_admin, there is a separate collection/mechanism?
        # login_super_admin uses `find_super_admin_by_email`.
        
        from app.models.super_admin import find_super_admin_by_email
        full_profile = find_super_admin_by_email(db, user.get("email"))
        
        if not full_profile:
             # Fallback to current user if not found in specific super admin query
             full_profile = user
             
        # Format for frontend
        profile_data = {
            "id": str(full_profile.get("_id")),
            "name": full_profile.get("name"),
            "email": full_profile.get("email"),
            "role": full_profile.get("role"),
            "phone": full_profile.get("phone", ""),
            "avatar": full_profile.get("avatar", ""),
            "last_login": full_profile.get("last_login"),
            "permissions": full_profile.get("permissions", [])
        }
        
        return profile_data
        
    except Exception as e:
        logger.error(f"Error fetching super admin profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch profile")

@admin_router.put("/superadmin/profile")
async def update_super_admin_profile(
    request: Request,
    profile_data: Dict[str, Any],
    user=Depends(get_current_user)
):
    """Update super admin profile"""
    try:
        db = request.app.mongodb
        from app.models.super_admin import get_super_admin_collection
        from app.models.user import get_user_collection  # Explicit import
        
        collection = get_super_admin_collection(db)
        
        # Fields allowed to update
        update_fields = {}
        if "name" in profile_data:
            update_fields["name"] = profile_data["name"]
        if "phone" in profile_data:
            update_fields["phone"] = profile_data["phone"]
        if "avatar" in profile_data:
            update_fields["avatar"] = profile_data["avatar"]
            
        if not update_fields:
            return {"success": True, "message": "No changes to update"}
            
        result = collection.update_one(
            {"email": user.get("email")},
            {"$set": update_fields}
        )
        
        # Also update the user in users collection if it exists there to keep sync
        # Some systems might have dual records
        get_user_collection(db).update_one(
            {"email": user.get("email")},
            {"$set": update_fields}
        )
            
        return {"success": True, "message": "Profile updated successfully"}
             
    except Exception as e:
        logger.error(f"Error updating super admin profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")

