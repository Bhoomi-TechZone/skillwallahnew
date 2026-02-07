from fastapi import HTTPException
from app.utils.security import hash_password, verify_password
from app.utils.jwt_handler import create_access_token, create_refresh_token
from app.models.user import get_user_collection
from bson import ObjectId
from datetime import datetime
import secrets
import uuid

def register_user(db, user_data):
    user_collection = get_user_collection(db)
    if user_collection.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate user_id based on role
    role = getattr(user_data, 'role', 'student')
    role_prefixes = {
        "admin": "adm",
        "instructor": "ins", 
        "student": "std"
    }
    role_prefix = role_prefixes.get(role, "std")
    user_count = user_collection.count_documents({"role": role}) + 1
    user_id = f"{role_prefix}{user_count:03d}"
    
    # Base user document matching your required structure
    user_doc = {
        "user_id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "role": getattr(user_data, 'role', 'student'),
        "status": "active",  # Default status for new users
        "is_active": True,   # Default to active for new users
        "created_at": datetime.utcnow(),
        "joinDate": datetime.utcnow().strftime("%Y-%m-%d"),
        "profile_complete": False,
        "profile_avatar": None
    }
    
    # Add phone if provided
    if hasattr(user_data, 'phone') and user_data.phone:
        user_doc["phone"] = user_data.phone
    
    # Add instructor-specific fields if role is instructor
    if user_doc["role"] == "instructor":
        # Store all instructor fields from the form
        instructor_fields = {
            "specialization": getattr(user_data, 'specialization', None),
            "experience": getattr(user_data, 'experience', None),
            "education": getattr(user_data, 'education', None),
            "bio": getattr(user_data, 'bio', None),
            "skills": getattr(user_data, 'skills', None),
            "certifications": getattr(user_data, 'certifications', None),
            "languages": getattr(user_data, 'languages', None),
            "instructor_roles": getattr(user_data, 'instructor_roles', []),
            
            # Additional instructor metadata
            "courses": [],
            "students_count": 0,
            "rating": 0.0,
            "reviews_count": 0,
            "status": "active",
            "total_earnings": 0,
            "monthly_earnings": 0,
            "completion_rate": 0,
            "response_time": "N/A",
            "last_login": None,
            "profile_avatar": None  # Will store avatar filename like ins020.jpg
        }
        
        # Only add fields that have values (not None or empty)
        for field, value in instructor_fields.items():
            if value is not None and value != "":
                user_doc[field] = value
        
        # Mark profile as complete if basic instructor fields are provided
        if user_doc.get("specialization") and user_doc.get("experience"):
            user_doc["profile_complete"] = True
        else:
            user_doc["profile_complete"] = False
    else:
        # For admin and student, profile is complete if name and email are provided
        user_doc["profile_complete"] = bool(user_data.name and user_data.email)
        
    result = user_collection.insert_one(user_doc)
    
    # Create both access and refresh tokens for immediate login after registration
    access_token = create_access_token({
        "user_id": str(result.inserted_id), 
        "email": user_data.email, 
        "role": user_doc["role"],
        "name": user_data.name
    })
    
    refresh_token = create_refresh_token({
        "user_id": str(result.inserted_id)
    })
    
    return {
        "success": True, 
        "message": "User registered successfully",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(result.inserted_id),
            "user_id": user_doc["user_id"],
            "name": user_data.name,
            "email": user_data.email,
            "role": user_doc["role"],
            "status": user_doc["status"],
            "is_active": user_doc["is_active"],
            "joinDate": user_doc["joinDate"]
        }
    }

def login_user(db, login_data):
    print(f"[DEBUG] Auth service - login attempt for email: {login_data.email}")
    user_collection = get_user_collection(db)
    user = user_collection.find_one({"email": login_data.email})
    
    print(f"[DEBUG] Auth service - User found: {bool(user)}")
    if user:
        print(f"[DEBUG] Auth service - User role: {user.get('role')}")
        print(f"[DEBUG] Auth service - User status: {user.get('status')}")
        print(f"[DEBUG] Auth service - User is_active: {user.get('is_active')}")
    
    # Debug password verification
    if user:
        print(f"[DEBUG] Auth service - Plain password length: {len(login_data.password)}")
        print(f"[DEBUG] Auth service - Hashed password length: {len(user['password'])}")
        print(f"[DEBUG] Auth service - Hashed password format: {user['password'][:50]}...")
        password_valid = verify_password(login_data.password, user["password"])
        print(f"[DEBUG] Auth service - Password verification result: {password_valid}")
    
    if not user or not verify_password(login_data.password, user["password"]):
        print(f"[DEBUG] Auth service - Login failed: User exists={bool(user)}, Password valid={bool(user and verify_password(login_data.password, user['password']))}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Check if user account is active (COMMENTED OUT - Allow all users to login)
    # user_status = user.get("status", "active")  # Default to active if not set
    # is_active = user.get("is_active", True)     # Default to active if not set
    # 
    # if user_status == "inactive" or is_active is False:
    #     raise HTTPException(status_code=403, detail="Account is deactivated. Please contact administrator.")

    # Update last_login timestamp
    current_time = datetime.utcnow()
    user_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": current_time}}
    )
    print(f"[DEBUG] Auth service - Updated last_login for user: {user['email']}")

    access_token = create_access_token({
        "user_id": str(user["_id"]), 
        "email": user["email"], 
        "role": user["role"],
        "name": user["name"]  # Include name in the JWT token
    })
    refresh_token = create_refresh_token({"user_id": str(user["_id"])})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "status": user.get("status", "active"),
            "is_active": user.get("is_active", True)
        }
    }

def send_password_reset(db, email):
    """
    Send password reset OTP to user's email
    """
    print(f"[DEBUG] Password reset OTP requested for email: {email}")
    user_collection = get_user_collection(db)
    user = user_collection.find_one({"email": email})
    
    if not user:
        print(f"[DEBUG] No user found with email: {email}")
        # For security, don't reveal if email exists or not
        return {"success": True, "message": "If the email exists, an OTP has been sent"}
    
    print(f"[DEBUG] User found: {user['name']} ({email})")
    
    try:
        # Generate a 6-digit OTP
        import random
        otp = str(random.randint(100000, 999999))
        print(f"[DEBUG] Generated OTP: {otp}")
        
        # Store OTP in database with expiration (15 minutes)
        from datetime import datetime, timedelta
        expiry_time = datetime.utcnow() + timedelta(minutes=15)
        
        user_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "reset_otp": otp,
                    "reset_otp_expiry": expiry_time
                }
            }
        )
        print(f"[DEBUG] OTP stored in database")
        
        # Send OTP email
        from app.services.email_service import EmailService
        email_service = EmailService()
        
        subject = "Password Reset OTP - Skill Wallah LMS"
        body = f"""
        Hello {user['name']},
        
        You have requested to reset your password for Skill Wallah LMS.
        
        Your One-Time Password (OTP) is: {otp}
        
        This OTP will expire in 15 minutes.
        
        Please enter this OTP in the password reset form to continue.
        
        If you did not request this reset, please ignore this email.
        
        Best regards,
        Skill Wallah LMS Team
        """
        
        print(f"[DEBUG] Attempting to send OTP email to {email}")
        email_service.send_email(
            to_emails=[email],
            subject=subject,
            body=body
        )
        
        print(f"[DEBUG] Password reset OTP sent successfully to {email}")
        return {"success": True, "message": "Password reset OTP has been sent to your email"}
        
    except Exception as e:
        print(f"[DEBUG] Failed to send reset OTP: {str(e)}")
        import traceback
        print(f"[DEBUG] Full error traceback: {traceback.format_exc()}")
        # Still return success for security (don't reveal if email exists)
        return {"success": True, "message": "If the email exists, an OTP has been sent"}

def verify_reset_otp(db, otp, request=None):
    """
    Verify the reset OTP for password reset
    """
    print(f"[DEBUG] OTP verification requested for OTP: {otp}")
    
    # Find user by OTP
    user_collection = get_user_collection(db)
    user = user_collection.find_one({"reset_otp": otp})
    
    if not user:
        print(f"[DEBUG] No user found with OTP: {otp}")
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Check if OTP is expired
    from datetime import datetime
    reset_otp_expiry = user.get("reset_otp_expiry")
    
    if not reset_otp_expiry or datetime.utcnow() > reset_otp_expiry:
        print(f"[DEBUG] OTP expired for user: {user['email']}")
        # Clear expired OTP
        user_collection.update_one(
            {"_id": user["_id"]},
            {"$unset": {"reset_otp": "", "reset_otp_expiry": ""}}
        )
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new OTP")
    
    print(f"[DEBUG] OTP verified successfully for user: {user['email']}")
    
    # Mark OTP as verified by adding a verified flag with timestamp
    from datetime import timedelta
    verified_until = datetime.utcnow() + timedelta(minutes=10)  # 10 minutes to reset password
    
    user_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"otp_verified": True, "otp_verified_until": verified_until}}
    )
    
    return {
        "success": True, 
        "message": "OTP verified successfully",
        "email": user['email']  # Return email for frontend to know which user
    }

def reset_password_with_otp(db, new_password, request=None):
    """
    Reset password after OTP verification
    """
    print(f"[DEBUG] Password reset requested")
    
    # Find user with verified OTP that is still valid
    user_collection = get_user_collection(db)
    from datetime import datetime
    
    user = user_collection.find_one({
        "otp_verified": True,
        "otp_verified_until": {"$gt": datetime.utcnow()},
        "reset_otp": {"$exists": True}
    })
    
    if not user:
        print(f"[DEBUG] No user found with valid OTP verification")
        raise HTTPException(status_code=400, detail="Please verify OTP first or OTP verification has expired")
    
    print(f"[DEBUG] Found verified user: {user['email']}")
    
    try:
        # Hash new password
        hashed_password = hash_password(new_password)
        
        # Update password and clear all OTP related fields
        user_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {"password": hashed_password},
                "$unset": {
                    "reset_otp": "", 
                    "reset_otp_expiry": "",
                    "otp_verified": "",
                    "otp_verified_until": ""
                }
            }
        )
        
        print(f"[DEBUG] Password reset successfully for user: {user['email']}")
        return {"success": True, "message": "Password reset successfully"}
        
    except Exception as e:
        print(f"[DEBUG] Failed to reset password: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reset password")

def update_user_profile(db, user_id, profile_data):
   
    user_collection = get_user_collection(db)
    
    # Check if user exists
    user = user_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prepare update data
    update_data = {}
    if profile_data.name:
        update_data["name"] = profile_data.name
    if profile_data.email:
        # Check if email is already taken by another user
        existing_user = user_collection.find_one({
            "email": profile_data.email, 
            "_id": {"$ne": ObjectId(user_id)}
        })
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_data["email"] = profile_data.email
    if profile_data.phone:
        update_data["phone"] = profile_data.phone
    if hasattr(profile_data, 'avatar') and profile_data.avatar:
        update_data["avatar"] = profile_data.avatar
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided for update")
    
    # Update user
    result = user_collection.update_one(
        {"_id": ObjectId(user_id)}, 
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get updated user data
    updated_user = user_collection.find_one({"_id": ObjectId(user_id)})
    
    return {
        "success": True, 
        "message": "Profile updated successfully",
        "user": {
            "id": str(updated_user["_id"]),
            "name": updated_user["name"],
            "email": updated_user["email"],
            "phone": updated_user.get("phone", ""),
            "avatar": updated_user.get("avatar", ""),
            "role": updated_user["role"]
        }
    }

def change_user_password(db, user_id, password_data):
    
    user_collection = get_user_collection(db)
    
    # Check if user exists
    user = user_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(password_data.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Check if new password is different from current
    if verify_password(password_data.new_password, user["password"]):
        raise HTTPException(status_code=400, detail="New password must be different from current password")
    
    # Hash new password
    hashed_new_password = hash_password(password_data.new_password)
    
    # Update password
    result = user_collection.update_one(
        {"_id": ObjectId(user_id)}, 
        {"$set": {"password": hashed_new_password}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": "Password changed successfully"}

def simple_register_user(db, user_data):
    """
    Register user without returning tokens - user needs to login separately
    """
    user_collection = get_user_collection(db)
    if user_collection.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate user_id based on role
    role = getattr(user_data, 'role', 'student')
    role_prefixes = {
        "admin": "adm",
        "instructor": "ins", 
        "student": "std"
    }
    role_prefix = role_prefixes.get(role, "std")
    user_count = user_collection.count_documents({"role": role}) + 1
    user_id = f"{role_prefix}{user_count:03d}"
    
    # Hash the password with error handling
    try:
        hashed_password = hash_password(user_data.password)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Password processing failed: {str(e)}")
    
    # Base user document matching your required structure
    user_doc = {
        "user_id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "password": hashed_password,
        "role": getattr(user_data, 'role', 'student'),
        "status": "active",  # Default status for new users
        "is_active": True,   # Default to active for new users
        "created_at": datetime.utcnow(),
        "joinDate": datetime.utcnow().strftime("%Y-%m-%d"),
        "profile_complete": False,
        "profile_avatar": None
    }
    
    # Add phone if provided
    if hasattr(user_data, 'phone') and user_data.phone:
        user_doc["phone"] = user_data.phone
    
    # For students, profile is complete if name and email are provided
    user_doc["profile_complete"] = bool(user_data.name and user_data.email)
        
    result = user_collection.insert_one(user_doc)
    
    return {
        "success": True, 
        "message": "Student registered successfully! Please login to continue."
    }
