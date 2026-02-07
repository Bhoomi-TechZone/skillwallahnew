from fastapi import APIRouter, Request, Depends, HTTPException, File, UploadFile, Form
from app.schemas.auth import UserCreate, UserLogin, TokenVerify, TokenResponse, ForgotPassword, UpdateProfile, ChangePassword, StudentCreate, SimpleResponse, VerifyOTP, ResetPasswordWithOTP
from app.services.auth_service import register_user, login_user, send_password_reset, update_user_profile, change_user_password, simple_register_user, verify_reset_otp, reset_password_with_otp
from app.utils.jwt_handler import decode_token, create_access_token, create_refresh_token
from app.utils.auth_helpers import get_current_user
from app.models.user import get_user_collection
from bson import ObjectId
from typing import Optional, List
from datetime import datetime
import os
import uuid
from pathlib import Path
import shutil
import bcrypt

auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Helper functions for role-based routing and permissions
def get_dashboard_route_for_role(role):
    """Get the appropriate dashboard route based on user role"""
    role_routes = {
        "admin": "/admin",
        "instructor": "/instructor", 
        "student": "/students"
    }
    return role_routes.get(role, "/students")

def get_role_permissions(role):
    """Get permissions based on user role"""
    permissions = {
        "admin": [
            "manage_users", "manage_courses", "manage_instructors", 
            "manage_students", "view_analytics", "manage_system"
        ],
        "instructor": [
            "create_courses", "manage_own_courses", "view_students",
            "create_assignments", "grade_assignments"
        ],
        "student": [
            "view_courses", "enroll_courses", "submit_assignments",
            "take_quizzes", "view_certificates"
        ]
    }
    return permissions.get(role, permissions["student"])

@auth_router.post("/register")
async def register(
    request: Request,
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form("instructor"),
    phone: Optional[str] = Form(None),
    specialization: Optional[str] = Form(None),
    experience: Optional[str] = Form(None),
    education: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    skills: Optional[str] = Form(None),
    certifications: Optional[str] = Form(None),
    languages: Optional[str] = Form(None),
    instructor_roles: Optional[str] = Form(None),  # Will be parsed as JSON string
    avatar: Optional[UploadFile] = File(None)
):
    db = request.app.mongodb
    
    # Parse instructor_roles if provided
    parsed_instructor_roles = []
    if instructor_roles:
        try:
            import json
            parsed_instructor_roles = json.loads(instructor_roles)
        except:
            parsed_instructor_roles = [instructor_roles]  # Single role as string
    
    # Create UserCreate object
    user_data = UserCreate(
        name=name,
        email=email,
        password=password,
        role=role,
        phone=phone,
        specialization=specialization,
        experience=experience,
        education=education,
        bio=bio,
        skills=skills,
        certifications=certifications,
        languages=languages,
        instructor_roles=parsed_instructor_roles
    )
    
    # Register the user first
    try:
        registration_result = register_user(db, user_data)
        if not registration_result.get("success"):
            raise HTTPException(status_code=400, detail="Registration failed")
            
        user_id = registration_result.get("user", {}).get("user_id")
        access_token = registration_result.get("access_token")
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")
    
    # Handle avatar upload if provided
    avatar_url = None
    if avatar and avatar.filename:
        try:
            # Validate file type
            allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
            file_extension = os.path.splitext(avatar.filename)[1].lower()
            if file_extension not in allowed_extensions:
                # Continue without avatar if invalid file type
                print(f"Invalid file type {file_extension}, skipping avatar upload")
            else:
                # Check file size (5MB limit)
                file_content = await avatar.read()
                if len(file_content) <= 5 * 1024 * 1024:  # 5MB
                    # Create profile uploads directory
                    upload_dir = Path("uploads/profile")
                    upload_dir.mkdir(parents=True, exist_ok=True)
                    
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
                                pass
                    
                    # Save the new file
                    with open(file_path, "wb") as buffer:
                        buffer.write(file_content)
                    
                    # Update user's avatar field in database
                    avatar_url = f"/uploads/profile/{filename}"
                    user_collection = get_user_collection(db)
                    
                    # Find user and update avatar and profile_avatar
                    user = user_collection.find_one({"user_id": user_id})
                    if user:
                        user_collection.update_one(
                            {"_id": user["_id"]},
                            {"$set": {
                                "avatar": avatar_url,
                                "profile_avatar": filename  # Store just the filename like ins020.jpg
                            }}
                        )
                        # Update the response data
                        registration_result["user"]["avatar"] = avatar_url
                        registration_result["user"]["profile_avatar"] = filename
                        
                else:
                    print("File size exceeds 5MB limit, skipping avatar upload")
                    
        except Exception as e:
            print(f"Error uploading avatar: {e}")
            # Continue without avatar if upload fails
    
    return registration_result

@auth_router.post("/student/register", response_model=SimpleResponse)
async def register_student(request: Request, student_data: StudentCreate):
    
    db = request.app.mongodb
    
    try:
        # Create UserCreate object from StudentCreate data
        user_create_data = UserCreate(
            name=student_data.full_name,
            email=student_data.email,
            password=student_data.password,
            phone=student_data.phone_number,
            role="student"
        )
        
        # Register the student using simple registration (no tokens)
        registration_result = simple_register_user(db, user_create_data)
        
        return registration_result
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")

@auth_router.post("/login", response_model=TokenResponse)
async def login(request: Request, credentials: UserLogin):
    """General login endpoint that works for all user roles"""
    print(f"[DEBUG] Login attempt - Email: {credentials.email}")
    
    db = request.app.mongodb
    user_collection = get_user_collection(db)
    
    try:
        # Check if user exists
        user = user_collection.find_one({"email": credentials.email})
        print(f"[DEBUG] User found: {bool(user)}")
        
        if not user:
            print(f"[DEBUG] No user found with email: {credentials.email}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user_role = user.get('role', 'student')
        print(f"[DEBUG] User role: {user_role}")
        
        # Use existing login service for password verification and token generation
        result = login_user(db, credentials)
        
        # Add role-specific information
        result["user"]["dashboard_route"] = get_dashboard_route_for_role(user_role)
        result["user"]["permissions"] = get_role_permissions(user_role)
        result["message"] = "Login successful"
        
        print(f"✅ Login successful for {credentials.email} as {user_role}")
        
        return result
        
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")

@auth_router.post("/login/student", response_model=TokenResponse)
async def login_student(request: Request, credentials: UserLogin):
    
    print(f"\n{'='*80}")
    print(f"🎓 [STUDENT LOGIN] Attempt starting...")
    print(f"📧 Email: {credentials.email}")
    print(f"🔐 Password length: {len(credentials.password)} characters")
    print(f"{'='*80}\n")
    
    db = request.app.mongodb
    
    try:
        # First, try to find student in branch_students collection
        print(f"🔍 [STEP 1] Searching branch_students collection...")
        
        # Try email field first (new schema), then email_id (old schema)
        branch_student = db.branch_students.find_one({"email": credentials.email})
        
        if not branch_student:
            print(f"⚠️  Not found with 'email' field, trying 'email_id'...")
            branch_student = db.branch_students.find_one({"email_id": credentials.email})
        
        if branch_student:
            print(f"✅ [FOUND] Branch student located!")
            print(f"   👤 Name: {branch_student.get('name', branch_student.get('student_name'))}")
            print(f"   🆔 ID: {branch_student.get('_id')}")
            print(f"   📋 Registration: {branch_student.get('registration_number')}")
            print(f"   🏢 Branch: {branch_student.get('branch_code')}")
            print(f"   🏛️  Franchise: {branch_student.get('franchise_code')}")
            
            # Check password_hash or password field
            password_hash = branch_student.get('password_hash') or branch_student.get('password')
            if not password_hash:
                print(f"❌ [ERROR] No password found for this student!")
                print(f"   The student account exists but has no password set.")
                print(f"   Please use the branch admin panel to set a password for this student.")
                raise HTTPException(
                    status_code=401, 
                    detail="No password configured for this account. Please contact your branch administrator."
                )
            
            print(f"   🔑 Password hash exists: YES")
            print(f"   🔑 Hash length: {len(password_hash)} characters")
            print(f"   🔑 Hash preview: {password_hash[:30]}...")
            
            # Check login_enabled
            login_enabled = branch_student.get('login_enabled', False)
            print(f"   🚪 Login enabled: {login_enabled}")
            
            if not login_enabled:
                print(f"❌ [ACCESS DENIED] Login is DISABLED for this student")
                raise HTTPException(
                    status_code=403, 
                    detail="Login access is disabled. Please contact your branch administrator."
                )
            
            # Verify password - handle both hashed and plain text passwords
            print(f"\n🔐 [STEP 2] Verifying password...")
            try:
                # Check if password is hashed or plain text (like branch_admin login)
                if password_hash.startswith("$2b$") or password_hash.startswith("$2a$"):
                    # Hashed password - verify with bcrypt
                    password_bytes = credentials.password.encode('utf-8')
                    hashed_bytes = password_hash.encode('utf-8')
                    password_valid = bcrypt.checkpw(password_bytes, hashed_bytes)
                    print(f"   Bcrypt verification result: {password_valid}")
                else:
                    # Plain text password - direct comparison (temporary fallback)
                    password_valid = (credentials.password == password_hash)
                    print(f"   Plain text comparison result: {password_valid}")
                    
                    # If plain text matches, hash and update for security
                    if password_valid:
                        print(f"   Upgrading plain text password to hashed...")
                        new_hash = bcrypt.hashpw(credentials.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                        db.branch_students.update_one(
                            {"_id": branch_student["_id"]},
                            {"$set": {"password_hash": new_hash}}
                        )
                        print(f"   Password upgraded to bcrypt hash")
                
            except Exception as e:
                print(f"❌ [ERROR] Password verification exception!")
                print(f"   Error: {str(e)}")
                import traceback
                print(f"   Traceback:\\n{traceback.format_exc()}")
                raise HTTPException(
                    status_code=401, 
                    detail="Invalid credentials"
                )
            
            if not password_valid:
                print(f"❌ [FAILED] Password does NOT match!")
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            print(f"✅ [SUCCESS] Password verified!")
            
            # Update last_login timestamp
            print(f"\n📝 [STEP 3] Updating last_login timestamp...")
            db.branch_students.update_one(
                {"_id": branch_student["_id"]},
                {"$set": {"last_login": datetime.utcnow().isoformat()}}
            )
            print(f"   ✅ Last login updated")
            
            # Create tokens for branch student
            print(f"\n🎟️  [STEP 4] Creating authentication tokens...")
            access_token = create_access_token({
                "user_id": str(branch_student["_id"]),
                "email": branch_student.get("email", branch_student.get("email_id")),
                "role": "student",
                "name": branch_student.get("name", branch_student.get("student_name")),
                "branch_code": branch_student.get("branch_code"),
                "franchise_code": branch_student.get("franchise_code"),
                "is_branch_student": True
            })
            
            refresh_token = create_refresh_token({
                "user_id": str(branch_student["_id"])
            })
            
            print(f"   ✅ Tokens created successfully")
            
            # Prepare response
            response_data = {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "user": {
                    "id": str(branch_student["_id"]),
                    "_id": str(branch_student["_id"]),
                    "user_id": str(branch_student["_id"]),
                    "name": branch_student.get("name", branch_student.get("student_name")),
                    "email": branch_student.get("email", branch_student.get("email_id")),
                    "role": "student",
                    "branch_code": branch_student.get("branch_code"),
                    "franchise_code": branch_student.get("franchise_code"),
                    "registration_number": branch_student.get("registration_number"),
                    "student_id": branch_student.get("student_id"),
                    "course": branch_student.get("course_name", branch_student.get("course")),
                    "batch": branch_student.get("batch", branch_student.get("batch_name")),
                    "contact_number": branch_student.get("contact_number"),
                    "is_branch_student": True,
                    "dashboard_route": "/students",
                    "permissions": [
                        "view_courses", "enroll_courses", "submit_assignments",
                        "take_quizzes", "view_certificates"
                    ]
                },
                "message": "Login successful"
            }
            
            print(f"\n{'='*80}")
            print(f"🎉 [SUCCESS] Branch student login completed!")
            print(f"{'='*80}\n")
            
            return response_data
        
        # If not found in branch_students, check regular users collection
        print(f"\n🔍 [STEP 1B] Student not in branch_students, checking regular users...")
        user_collection = get_user_collection(db)
        user = user_collection.find_one({"email": credentials.email})
        
        if not user:
            print(f"❌ [NOT FOUND] No user found with email: {credentials.email}")
            print(f"   This email doesn't exist in the system.")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        print(f"✅ [FOUND] Regular user located!")
        print(f"   👤 Name: {user.get('name')}")
        print(f"   🎭 Role: {user.get('role')}")
        
        # Check if user has student role before password verification
        if user.get("role") != "student":
            print(f"❌ [ERROR] Role mismatch - Expected: student, Got: {user.get('role')}")
            raise HTTPException(status_code=403, detail="Student access required")
        
        print(f"\n🔐 [STEP 2] Verifying password for regular student...")
        
        # Use existing login service for password verification and token generation
        result = login_user(db, credentials)
        
        print(f"\n✅ [SUCCESS] Regular student login completed!")
        
        # Add student-specific information
        result["user"]["dashboard_route"] = "/students"
        result["user"]["permissions"] = [
            "view_courses", "enroll_courses", "submit_assignments",
            "take_quizzes", "view_certificates"
        ]
        result["user"]["is_branch_student"] = False
        result["message"] = "Login successful"
        
        return result
        
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"[DEBUG] Login error: {str(e)}")
        import traceback
        print(f"[DEBUG] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")

@auth_router.post("/login/role-based", response_model=TokenResponse)
def role_based_login(request: Request, credentials: UserLogin):
    db = request.app.mongodb
    result = login_user(db, credentials)
    
    # Add role-specific information to the response
    user_role = result["user"]["role"]
    result["user"]["dashboard_route"] = get_dashboard_route_for_role(user_role)
    result["user"]["permissions"] = get_role_permissions(user_role)
    
    return result

@auth_router.post("/validate-token")
async def validate_token(request: Request):
    """
    Validate if the provided JWT token is valid and not expired.
    Returns user information if valid, otherwise returns error.
    """
    try:
        user = await get_current_user(request)
        return {
            "valid": True,
            "user": user
        }
    except HTTPException as e:
        return {
            "valid": False,
            "error": e.detail,
            "status_code": e.status_code
        }
    except Exception as e:
        return {
            "valid": False,
            "error": str(e),
            "status_code": 401
        }

@auth_router.post("/forgot-password")
def forgot_password(request: Request, forgot_data: ForgotPassword):
    db = request.app.mongodb
    return send_password_reset(db, forgot_data.email)

@auth_router.post("/verify-otp")
def verify_otp(request: Request, otp_data: VerifyOTP):
    """Verify the OTP for password reset"""
    db = request.app.mongodb
    return verify_reset_otp(db, otp_data.otp, request)

@auth_router.post("/reset-password")
def reset_password(request: Request, reset_data: ResetPasswordWithOTP):
    """Reset password using verified OTP"""
    db = request.app.mongodb
    return reset_password_with_otp(db, reset_data.new_password, request)

@auth_router.put("/update-profile")
def update_profile(request: Request, profile_data: UpdateProfile, current_user: dict = Depends(get_current_user)):
    db = request.app.mongodb
    return update_user_profile(db, current_user["user_id"], profile_data)

@auth_router.get("/all")
def get_all_users(request: Request):
    db = request.app.mongodb
    user_collection = get_user_collection(db)
    
    try:
        # Get all users from database
        users = list(user_collection.find({}))
        
        # Format users for response
        formatted_users = []
        for user in users:
            # Remove sensitive information
            user.pop("password", None)
            
            # Convert ObjectId to string
            user["id"] = str(user["_id"])
            user.pop("_id", None)
            
            # Convert datetime objects to strings for JSON serialization
            if "created_at" in user:
                user["created_at"] = str(user["created_at"])
            if "updated_at" in user:
                user["updated_at"] = str(user["updated_at"])
            
            formatted_users.append(user)
        
        return {
            "success": True,
            "message": "Users retrieved successfully",
            "count": len(formatted_users),
            "users": formatted_users
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving users: {str(e)}")


@auth_router.get("/users/by-role/{role}")
def get_users_by_role(request: Request, role: str, current_user: dict = Depends(get_current_user)):
    db = request.app.mongodb
    user_collection = get_user_collection(db)
    
    try:
        # Validate role
        valid_roles = ["admin", "instructor", "student"]
        if role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")
        
        # Get users by role
        users = list(user_collection.find({"role": role}))
        
        # Format users for response
        formatted_users = []
        for user in users:
            # Remove sensitive information
            user.pop("password", None)
            
            # Convert ObjectId to string
            user["id"] = str(user["_id"])
            user.pop("_id", None)
            
            # Convert datetime objects to strings for JSON serialization
            if "created_at" in user:
                user["created_at"] = str(user["created_at"])
            if "updated_at" in user:
                user["updated_at"] = str(user["updated_at"])
            
            formatted_users.append(user)
        
        return {
            "success": True,
            "message": f"Users with role '{role}' retrieved successfully",
            "role": role,
            "count": len(formatted_users),
            "users": formatted_users
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving users by role: {str(e)}")

@auth_router.put("/toggle-status/{user_id}")
async def toggle_user_status(
    user_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Toggle user status (active/inactive) - Admin only"""
    try:
        print(f"[DEBUG] Toggle status called for user_id: {user_id}")
        print(f"[DEBUG] Current user: {current_user}")
        
        # Check if current user is admin
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Validate user_id format
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        print(f"[DEBUG] User ID is valid: {user_id}")
        
        # Get user collection
        db = request.app.mongodb
        user_collection = get_user_collection(db)
        print(f"[DEBUG] Got user collection")
        
        # Find the user
        user = user_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        print(f"[DEBUG] Found user: {user.get('name')} ({user.get('email')})")
        
        # Don't allow admin to deactivate themselves
        if str(user["_id"]) == current_user.get("id"):
            raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
        
        # Toggle the status
        current_is_active = user.get("is_active", True)
        new_is_active = not current_is_active
        new_status = "active" if new_is_active else "inactive"
        
        print(f"[DEBUG] Toggling status from {current_is_active} to {new_is_active}")
        
        # Update user status
        update_result = user_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "is_active": new_is_active,
                    "status": new_status,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        print(f"[DEBUG] Update result: modified_count={update_result.modified_count}")
        
        if update_result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to update user status")
        
        # Get updated user for response
        updated_user = user_collection.find_one({"_id": ObjectId(user_id)})
        print(f"[DEBUG] Updated user status: {updated_user.get('status')}")
        
        return {
            "success": True,
            "message": f"User status updated successfully",
            "user_id": user_id,
            "new_status": new_status,
            "is_active": new_is_active,
            "user": {
                "id": str(updated_user["_id"]),
                "name": updated_user.get("name"),
                "email": updated_user.get("email"),
                "role": updated_user.get("role"),
                "status": updated_user.get("status"),
                "is_active": updated_user.get("is_active")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Error in toggle_user_status: {str(e)}")
        print(f"[ERROR] Error type: {type(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error toggling user status: {str(e)}")


