from fastapi import APIRouter, HTTPException, Request, Depends, File, UploadFile, Form
from fastapi.responses import JSONResponse
from app.schemas.branch_student import (
    BranchStudentRegistration, 
    BranchStudentResponse, 
    BranchStudentUpdate,
    StudentListFilters
)
from app.utils.auth_helpers_enhanced import get_current_user
from app.utils.dependencies import role_required, get_authenticated_user
from app.utils.multi_tenant import get_multi_tenant_manager
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from bson import ObjectId
import os
import uuid
from pathlib import Path
import shutil
import re
import bcrypt
import secrets
import string
import traceback
import logging

# Get logger
logger = logging.getLogger("uvicorn")

router = APIRouter(prefix="/api/branch-students", tags=["Branch Student Management"])

def require_branch_access(user=Depends(get_current_user)):
    """Dependency to require branch admin, admin, or franchise role for student operations"""
    user_role = user.get("role", "")
    is_branch_admin = user.get("is_branch_admin", False)
    
    # Allow admin, franchise, branch_admin roles, or users with is_branch_admin flag
    allowed_roles = ["admin", "franchise", "branch_admin"]
    
    if user_role not in allowed_roles and not is_branch_admin:
        print(f"[DEBUG] Access denied - Role: {user_role}, is_branch_admin: {is_branch_admin}")
        print(f"[DEBUG] User data: {user}")
        raise HTTPException(status_code=403, detail="User does not have branch access")
    
    print(f"[DEBUG] Access granted - Role: {user_role}, is_branch_admin: {is_branch_admin}")
    return user


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    password_bytes = password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)

def generate_random_password(length: int = 8) -> str:
    """Generate a random password if none provided"""
    alphabet = string.ascii_letters + string.digits
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    # Ensure at least one letter and one digit
    if not any(c.isalpha() for c in password):
        password = password[:-1] + secrets.choice(string.ascii_letters)
    if not any(c.isdigit() for c in password):
        password = password[:-1] + secrets.choice(string.digits)
    return password

def generate_registration_number(branch_code: str, admission_year: str, db) -> tuple:
    """Generate unique registration number for student"""
    # Format: BRANCH_YEAR_SEQUENCE (e.g., BR001_24_001)
    year_suffix = admission_year[-2:]  # Last 2 digits of year
    
    # Try 1: Find by registration_sequence
    last_student_seq = db.branch_students.find_one(
        {
            "branch_code": branch_code,
            "admission_year": admission_year,
            "registration_sequence": {"$exists": True, "$ne": None}
        },
        sort=[("registration_sequence", -1)]
    )
    
    seq_1 = 0
    if last_student_seq:
        seq_1 = last_student_seq.get("registration_sequence", 0)
        
    # Try 2: Find by registration_number (parse string) in case sequence field is missing
    # Filter for reg numbers matching pattern to avoid parsing errors
    # Pattern: BRANCH_YEAR_DIGITS
    pattern = f"^{re.escape(branch_code)}_{year_suffix}_\\d+$"
    last_student_reg = db.branch_students.find_one(
        {
            "branch_code": branch_code,
            "admission_year": admission_year,
            "registration_number": {"$regex": pattern}
        },
        sort=[("registration_number", -1)]  # String sort works for fixed length suffix
    )
    
    seq_2 = 0
    if last_student_reg:
        reg_num = last_student_reg.get("registration_number", "")
        parts = reg_num.split('_')
        if len(parts) >= 3 and parts[-1].isdigit():
            try:
                seq_2 = int(parts[-1])
            except ValueError:
                pass
                
    # Use max sequence
    sequence = max(seq_1, seq_2) + 1
    
    # Format sequence with leading zeros (3 digits)
    sequence_str = f"{sequence:03d}"
    registration_number = f"{branch_code}_{year_suffix}_{sequence_str}"
    
    return registration_number, sequence

def get_branch_info_from_db(db, current_user):
    """Get branch and franchise information from database based on user info"""
    try:
        user_id = current_user.get("user_id") or str(current_user.get("_id", ""))
        franchise_code = current_user.get("franchise_code")
        branch_code = current_user.get("branch_code")
        
        # If we have direct codes from user, return them
        if franchise_code and branch_code:
            return franchise_code, branch_code
        
        # If only franchise_code, use it as both
        if franchise_code:
            return franchise_code, franchise_code
        
        # Try to get from branch_users collection
        if user_id:
            branch_user = db.branch_users.find_one({"user_id": user_id})
            if branch_user:
                fc = branch_user.get("franchise_code")
                bc = branch_user.get("branch_code", fc)
                return fc, bc
        
        # Try to get from email if available
        email = current_user.get("email")
        if email:
            branch_user = db.branch_users.find_one({"email": email})
            if branch_user:
                fc = branch_user.get("franchise_code")
                bc = branch_user.get("branch_code", fc)
                return fc, bc
        
        # Fallback to None values
        return None, None
        
    except Exception as e:
        logger.error(f"Error getting branch info from DB: {str(e)}")
        return None, None

@router.post("/students/register")
async def register_branch_student(
    request: Request,
    student_data: dict,  # Accept raw dict to handle validation manually
    current_user: dict = Depends(require_branch_access)  # Allow branch admins and admins
):
    
    db = request.app.mongodb
    multi_tenant = get_multi_tenant_manager(db)
    
    try:
        # Log the incoming data for debugging
        print(f"[DEBUG] Raw student data received: {student_data}")
        
        # Preprocess date fields (convert string dates to date objects)  
        if 'date_of_birth' in student_data and isinstance(student_data['date_of_birth'], str):
            # Only process if date_of_birth is not empty
            if student_data['date_of_birth'].strip():
                try:
                    from datetime import datetime
                    student_data['date_of_birth'] = datetime.strptime(student_data['date_of_birth'], '%Y-%m-%d').date()
                except ValueError as e:
                    raise HTTPException(status_code=422, detail=f"Invalid date_of_birth format: {e}")
            else:
                # Remove empty date_of_birth field
                student_data.pop('date_of_birth', None)
        
        if 'date_of_admission' in student_data and isinstance(student_data['date_of_admission'], str):
            # Only process if date_of_admission is not empty
            if student_data['date_of_admission'].strip():
                try:
                    from datetime import datetime  
                    student_data['date_of_admission'] = datetime.strptime(student_data['date_of_admission'], '%Y-%m-%d').date()
                except ValueError as e:
                    raise HTTPException(status_code=422, detail=f"Invalid date_of_admission format: {e}")
            else:
                # Remove empty date_of_admission field
                student_data.pop('date_of_admission', None)
        
        # Validate using Pydantic model
        try:
            validated_data = BranchStudentRegistration(**student_data)
            
            # Sync email_id and email fields to handle frontend/schema inconsistencies
            # This prevents email_id from being None when only email is provided
            if not validated_data.email_id and validated_data.email:
                validated_data.email_id = validated_data.email
            if not validated_data.email and validated_data.email_id:
                validated_data.email = validated_data.email_id
        except Exception as validation_error:
            print(f"[DEBUG] Validation error: {validation_error}")
            # Extract detailed validation errors
            if hasattr(validation_error, 'errors'):
                error_details = []
                for error in validation_error.errors():
                    field = error.get('loc', ['unknown'])[-1]
                    message = error.get('msg', 'Invalid value')
                    error_details.append(f"{field}: {message}")
                detail_msg = "Validation errors: " + "; ".join(error_details)
            else:
                detail_msg = f"Validation error: {str(validation_error)}"
            raise HTTPException(status_code=422, detail=detail_msg)
        
        # Get branch context with tenant isolation
        try:
            context = multi_tenant.get_branch_context(current_user)
            print(f"[DEBUG] Branch context: {context}")
        except Exception as context_error:
            print(f"[DEBUG] Branch context error: {context_error}")
            # If multi-tenant context fails, get branch info from database
            franchise_code, branch_code = get_branch_info_from_db(db, current_user)
            
            if not franchise_code or not branch_code:
                raise HTTPException(
                    status_code=400, 
                    detail="Unable to determine branch/franchise information. Please contact administrator."
                )
            
            context = {
                "franchise_code": franchise_code,
                "branch_code": branch_code,
                "user_id": current_user.get("user_id", str(current_user.get("_id", "unknown"))),
                "email": current_user.get("email", "unknown"),
                "role": current_user.get("role", "admin")
            }
            print(f"[DEBUG] Fallback context created: {context}")
        
        # Use the provided branch code and registration number (no auto-generation)
        print(f"[DEBUG] Using provided branch_code: {validated_data.branch_code}")
        print(f"[DEBUG] Using provided registration_number: {validated_data.registration_number}")
        
        # Skip branch access validation for now to avoid franchise lookup issues
        print(f"[DEBUG] Skipping branch access validation due to franchise lookup issues")
        # Check if student with this registration number already exists (only if registration number is provided)
        existing_reg_student = None
        if validated_data.registration_number and validated_data.registration_number.strip():
            existing_reg_filter = {"registration_number": validated_data.registration_number}
            existing_reg_student = db.branch_students.find_one(existing_reg_filter)
        
        if existing_reg_student:
            # Update existing student instead of creating new one
            print(f"[DEBUG] Student with registration number {validated_data.registration_number} exists, updating...")
            
            # IMPORTANT: Only update password if explicitly provided, otherwise keep existing password hash
            generated_password = None
            hashed_password = None
            if validated_data.password and validated_data.password.strip():
                generated_password = validated_data.password
                hashed_password = hash_password(generated_password)
                print(f"[DEBUG] Using provided password for update - password will be changed")
            else:
                # Keep existing password hash - DO NOT generate new password on update
                hashed_password = existing_reg_student.get("password_hash")
                generated_password = "(unchanged - using existing password)"
                print(f"[DEBUG] Keeping existing password hash - no password change")
            
            # Get branch info for center name
            branch_info = db.branches.find_one({"branch_code": context["branch_code"]})
            center_name = branch_info.get("branch_name", "") if branch_info else ""
            
            # Update the existing student document
            update_data = {
                "branch_code": context["branch_code"],
                "admission_year": validated_data.admission_year,
                "student_name": validated_data.student_name,
                "father_name": validated_data.father_name,
                "mother_name": validated_data.mother_name or "",
                "date_of_birth": validated_data.date_of_birth.isoformat() if hasattr(validated_data.date_of_birth, 'isoformat') else validated_data.date_of_birth,
                "contact_no": validated_data.contact_no,
                "parent_contact": validated_data.parent_contact or "",
                "gender": validated_data.gender,
                "category": validated_data.category or "",
                "religion": validated_data.religion or "",
                "marital_status": validated_data.marital_status or "",
                "identity_type": validated_data.identity_type or "",
                "id_number": validated_data.id_number,
                "last_general_qualification": validated_data.last_general_qualification or "",
                "state": validated_data.state,
                "district": validated_data.district or "",
                "address": validated_data.address or "",
                "city": validated_data.district or "",
                "pincode": validated_data.pincode,
                "email_id": validated_data.email_id or None,
                "email": validated_data.email_id or None,  # Add email field for login compatibility
                "course_category": validated_data.course_category,
                "course": validated_data.course,
                "course_duration": getattr(validated_data, 'course_duration', None) or getattr(validated_data, 'duration', None) or "",
                "duration": getattr(validated_data, 'course_duration', None) or getattr(validated_data, 'duration', None) or "",
                "center": center_name,
                "branch_name": center_name,
                "batch": validated_data.batch,
                "net_fee": float(validated_data.net_fee or 0),
                "discount": float(validated_data.discount or 0),
                "other_charge": float(getattr(validated_data, 'other_charges', None) or getattr(validated_data, 'other_charge', None) or 0),
                "total_fee": float(getattr(validated_data, 'net_fee', None) or 0) + float(getattr(validated_data, 'other_charges', None) or getattr(validated_data, 'other_charge', None) or 0) - float(getattr(validated_data, 'discount', None) or 0),
                "date_of_admission": validated_data.date_of_admission.isoformat() if validated_data.date_of_admission and hasattr(validated_data.date_of_admission, 'isoformat') else (str(validated_data.date_of_admission) if validated_data.date_of_admission else None),
                "enquiry_source": validated_data.enquiry_source or "",
                "updated_at": datetime.utcnow().isoformat(),
                "updated_by": context["user_id"]
            }
            
            # Only update password_hash if a new password was explicitly provided
            if validated_data.password and validated_data.password.strip() and hashed_password:
                update_data["password_hash"] = hashed_password
                print(f"[DEBUG] Password hash will be updated in database")
            else:
                print(f"[DEBUG] Password hash NOT updated - keeping existing password")
            
            result = db.branch_students.update_one(
                {"_id": existing_reg_student["_id"]},
                {"$set": update_data}
            )
            
            # Handle datetime conversion for created_at
            created_at = existing_reg_student.get("created_at")
            if isinstance(created_at, datetime):
                created_at_str = created_at.isoformat()
            elif created_at:
                created_at_str = str(created_at)
            else:
                created_at_str = datetime.utcnow().isoformat()
            
            # Return updated student response
            response_data = BranchStudentResponse(
                id=str(existing_reg_student["_id"]),
                registration_number=validated_data.registration_number,
                student_name=validated_data.student_name,
                email_id=validated_data.email_id,
                contact_no=validated_data.contact_no,
                course=validated_data.course,
                batch=validated_data.batch,
                branch_code=context["branch_code"],
                franchise_code=context["franchise_code"],
                admission_status="ACTIVE",
                created_at=created_at_str
            )
            
            response_dict = response_data.dict()
            response_dict["login_credentials"] = {
                "email": validated_data.email_id,
                "temporary_password": generated_password,
                "login_enabled": True,
                "message": "Student record updated successfully. Student can login with these credentials"
            }
            
            return JSONResponse(
                status_code=200,
                content=response_dict
            )
        
        # Check if student email already exists (only if email is provided)
        if validated_data.email_id:
            existing_filter = {"email_id": validated_data.email_id}
            existing_student = db.branch_students.find_one(existing_filter)
            
            if existing_student:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Student with this email already exists"
                )
        
        # Generate password if not provided
        if not validated_data.password:
            generated_password = generate_random_password(8)
            print(f"[DEBUG] Generated password for student: {generated_password}")
        else:
            generated_password = validated_data.password
            print(f"[DEBUG] Using provided password")
        
        # Hash the password for secure storage
        hashed_password = hash_password(generated_password)
        
        # Store the original password temporarily for response (in production, you might want to remove this)
        original_password = generated_password
        
        # Generate registration number if not provided
        if validated_data.registration_number and validated_data.registration_number.strip():
            registration_number = validated_data.registration_number
            registration_sequence = None  # Don't need sequence for provided numbers
            print(f"[DEBUG] Using provided registration number: {registration_number}")
        else:
            registration_number, registration_sequence = generate_registration_number(
                context["branch_code"],  # Use branch_code from context 
                validated_data.admission_year, 
                db
            )
            print(f"[DEBUG] Generated registration number: {registration_number}")
        
        # Get branch info for center name
        branch_info = db.branches.find_one({"branch_code": context["branch_code"]})
        center_name = branch_info.get("branch_name", "") if branch_info else ""
        
        # Create student document with tenant isolation
        print(f"[DEBUG] Creating student document...")
        student_doc = {
            "_id": ObjectId(),
            "registration_number": registration_number,  # Generated or provided registration number
            "franchise_code": context["franchise_code"],
            "branch_code": context["branch_code"],  # Use branch_code from context (fetched from branches collection)
            
            # Personal Details
            "admission_year": validated_data.admission_year,
            "registration_sequence": registration_sequence if registration_sequence is not None else None,
            "student_name": validated_data.student_name,
            "father_name": validated_data.father_name,
            "mother_name": validated_data.mother_name,
            "date_of_birth": validated_data.date_of_birth.isoformat() if hasattr(validated_data.date_of_birth, 'isoformat') else validated_data.date_of_birth,
            "contact_no": validated_data.contact_no,
            "parent_contact": validated_data.parent_contact or "",
            "gender": validated_data.gender,
            "category": validated_data.category,
            "religion": validated_data.religion,
            "marital_status": validated_data.marital_status,
            "identity_type": validated_data.identity_type,
            "id_number": validated_data.id_number,
            "last_general_qualification": validated_data.last_general_qualification,
            "state": validated_data.state,
            "district": validated_data.district,
            "address": validated_data.address,
            "city": validated_data.district or "",
            "pincode": validated_data.pincode,
            "email_id": validated_data.email_id,
            "email": validated_data.email_id,  # Add email field for login compatibility
            
            # Login Credentials
            "password_hash": hashed_password,
            "login_enabled": True,
            "password_created_by": context["user_id"],
            "password_created_at": datetime.utcnow().isoformat(),
            
            # Course Details
            "course_category": validated_data.course_category,
            "course": validated_data.course,
            "course_duration": getattr(validated_data, 'course_duration', None) or getattr(validated_data, 'duration', None) or "",
            "duration": getattr(validated_data, 'course_duration', None) or getattr(validated_data, 'duration', None) or "",
            "center": center_name,
            "branch_name": center_name,
            "batch": validated_data.batch,
            "net_fee": float(validated_data.net_fee or 0),
            "discount": float(validated_data.discount or 0),
            "other_charge": float(getattr(validated_data, 'other_charges', None) or getattr(validated_data, 'other_charge', None) or 0),
            "total_fee": float(getattr(validated_data, 'net_fee', None) or 0) + float(getattr(validated_data, 'other_charges', None) or getattr(validated_data, 'other_charge', None) or 0) - float(getattr(validated_data, 'discount', None) or 0),
            "date_of_admission": validated_data.date_of_admission.isoformat() if validated_data.date_of_admission and hasattr(validated_data.date_of_admission, 'isoformat') else (str(validated_data.date_of_admission) if validated_data.date_of_admission else None),
            "enquiry_source": validated_data.enquiry_source or "",
            
            # Status and metadata with tenant tracking
            "admission_status": "ACTIVE",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "created_by": context["user_id"],
            "created_by_email": context["email"],
            "photo_url": None,
            
            # Multi-tenancy metadata
            "tenant_metadata": {
                "registered_by_franchise": context["franchise_code"],
                "registered_by_branch": validated_data.branch_code,  # Use provided branch code
                "registration_source": "branch_admin_portal"
            }
        }
        
        print(f"[DEBUG] Student document created successfully")
        
        # Insert student with tenant context
        print(f"[DEBUG] Inserting student into database...")
        result = db.branch_students.insert_one(student_doc)
        print(f"[DEBUG] Insert result: {result.inserted_id}")
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to register student")
        
        # Log tenant activity (simplified without multi-tenant manager)
        print(f"[DEBUG] Student registered successfully: {registration_number}")
        
        # Return student response with login info
        response_data = BranchStudentResponse(
            id=str(result.inserted_id),
            registration_number=registration_number,
            student_name=validated_data.student_name,
            email_id=validated_data.email_id,
            contact_no=validated_data.contact_no,
            course=validated_data.course,
            batch=validated_data.batch,
            branch_code=context["branch_code"],  # Use branch_code from context
            franchise_code=context["franchise_code"],
            admission_status="ACTIVE",
            created_at=datetime.utcnow().isoformat()
        )
        
        # Add login credentials to response (remove in production for security)
        response_dict = response_data.dict()
        response_dict["login_credentials"] = {
            "email": validated_data.email_id,
            "temporary_password": original_password,
            "login_enabled": True,
            "message": "Student can now login with these credentials"
        }
        
        return JSONResponse(
            status_code=201,
            content=response_dict
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DEBUG] Unexpected error during registration: {str(e)}")
        print(f"[DEBUG] Error type: {type(e)}")
        import traceback
        print(f"[DEBUG] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/students/{student_id}/upload-photo")
async def upload_student_photo(
    request: Request,
    student_id: str,
    photo: UploadFile = File(...),
    current_user: dict = Depends(require_branch_access)
):
    """Upload photo for a student with multi-tenant validation"""
    
    db = request.app.mongodb
    multi_tenant = get_multi_tenant_manager(db)
    
    try:
        # Get branch context with tenant isolation
        try:
            context = multi_tenant.get_branch_context(current_user)
            # Create tenant filter for this student
            student_filter = multi_tenant.create_tenant_filter(context, {"_id": ObjectId(student_id)})
        except Exception as context_error:
            print(f"[DEBUG UPLOAD_PHOTO] Branch context error: {context_error}")
            # If multi-tenant context fails, get branch info from database
            franchise_code, branch_code = get_branch_info_from_db(db, current_user)
            
            if not franchise_code or not branch_code:
                raise HTTPException(
                    status_code=400, 
                    detail="Unable to determine branch/franchise information. Please contact administrator."
                )
            
            context = {
                "franchise_code": franchise_code,
                "branch_code": branch_code,
                "user_id": current_user.get("user_id", str(current_user.get("_id", "unknown"))),
                "email": current_user.get("email", "unknown"),
                "role": current_user.get("role", "admin")
            }
            
            # Create tenant filter for this student
            student_filter = {
                "_id": ObjectId(student_id),
                "franchise_code": franchise_code,
                "branch_code": branch_code
            }
        
        # Verify student exists and belongs to this tenant
        student = db.branch_students.find_one(student_filter)
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found or access denied")
        
        # Validate file type
        if not photo.content_type or not photo.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file content to check size
        file_content = await photo.read()
        file_size = len(file_content)
        
        # Validate file size (max 5MB)
        if file_size > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size must be less than 5MB")
        
        # Create upload directory with tenant separation
        upload_dir = Path(f"app/static/uploads/student_photos/{context['franchise_code']}/{context['branch_code']}")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename with tenant context
        file_extension = Path(photo.filename).suffix if photo.filename else ".jpg"
        unique_filename = f"{student.get('registration_number', student_id)}_{uuid.uuid4().hex[:8]}{file_extension}"
        file_path = upload_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        # Update student document with tenant-safe photo URL
        # Use /uploads/ path (not /static/uploads/) to match frontend expectations
        photo_url = f"/uploads/student_photos/{context['franchise_code']}/{context['branch_code']}/{unique_filename}"
        
        # Ensure tenant isolation in update
        update_data = {
            "photo_url": photo_url,
            "updated_at": datetime.utcnow(),
            "updated_by": context["user_id"]
        }
        update_data_with_tenant = multi_tenant.ensure_tenant_isolation_in_update(context, update_data)
        
        db.branch_students.update_one(
            student_filter,
            {"$set": update_data_with_tenant}
        )
        
        # Log tenant activity
        multi_tenant.log_tenant_activity(
            context,
            "STUDENT_PHOTO_UPLOADED",
            {
                "student_id": student_id,
                "student_name": student.get("student_name"),
                "registration_number": student.get("registration_number"),
                "photo_url": photo_url
            }
        )
        
        return {"message": "Photo uploaded successfully", "photo_url": photo_url}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Photo upload failed: {str(e)}")

@router.get("/students")
async def get_branch_students(
    request: Request,
    branch_code: Optional[str] = None,
    course: Optional[str] = None,
    batch: Optional[str] = None,
    admission_year: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(require_branch_access)
):
    """Get list of students for the branch with multi-tenant filtering options and ID card status"""
    
    db = request.app.mongodb
    multi_tenant = get_multi_tenant_manager(db)
    
    try:
        # Get branch context with tenant isolation
        print(f"[DEBUG GET_STUDENTS] Starting endpoint - current_user: {current_user}")
        try:
            context = multi_tenant.get_branch_context(current_user)
            print(f"[DEBUG GET_STUDENTS] Branch context: {context}")
        except Exception as context_error:
            print(f"[DEBUG GET_STUDENTS] Branch context error: {context_error}")
            # If multi-tenant context fails, get branch info from database
            franchise_code, branch_code_from_db = get_branch_info_from_db(db, current_user)
            
            if not franchise_code or not branch_code_from_db:
                raise HTTPException(
                    status_code=400, 
                    detail="Unable to determine branch/franchise information. Please contact administrator."
                )
            
            context = {
                "franchise_code": franchise_code,
                "branch_code": branch_code_from_db,
                "user_id": current_user.get("user_id", str(current_user.get("_id", "unknown"))),
                "email": current_user.get("email", "unknown"),
                "role": current_user.get("role", "admin")
            }
            print(f"[DEBUG GET_STUDENTS] Fallback context created: {context}")
        
        # Start with tenant filter
        try:
            query = multi_tenant.create_tenant_filter(context)
        except Exception as filter_error:
            print(f"[DEBUG GET_STUDENTS] Tenant filter error: {filter_error}")
            # Fallback: create basic tenant filter
            query = {
                "franchise_code": context["franchise_code"],
                "branch_code": context["branch_code"]
            }
        
        print(f"[DEBUG GET_STUDENTS] Tenant filter query: {query}")
        
        # Add additional filters while maintaining tenant isolation
        if branch_code and branch_code == context["branch_code"]:
            # Only allow filtering by the user's own branch
            query["branch_code"] = branch_code
        
        if course:
            query["course"] = {"$regex": course, "$options": "i"}
        if batch:
            query["batch"] = batch
        if admission_year:
            query["admission_year"] = admission_year
        
        if search:
            # Multi-field search within tenant scope
            search_regex = {"$regex": search, "$options": "i"}
            query["$or"] = [
                {"student_name": search_regex},
                {"email_id": search_regex},
                {"registration_number": search_regex},
                {"father_name": search_regex},
                {"contact_no": search_regex}
            ]
        
        print(f"[DEBUG GET_STUDENTS] Final query: {query}")
        
        # Calculate pagination
        skip = (page - 1) * limit
        
        # Get students with pagination and tenant isolation
        print(f"[DEBUG GET_STUDENTS] Executing query with skip={skip}, limit={limit}")
        students_cursor = db.branch_students.find(query).skip(skip).limit(limit).sort("created_at", -1)
        
        students = []
        for student in students_cursor:
            print(f"[DEBUG GET_STUDENTS] Found student: {student.get('student_name')} - {student.get('registration_number')}")
            
            # Check if student has an ID card
            student_id = str(student["_id"])
            student_reg = student.get("registration_number")
            
            print(f"[DEBUG GET_STUDENTS] Checking ID card for student_id: {student_id}, registration: {student_reg}")
            
            # First check total ID cards in collection
            total_id_cards = db.branch_id_cards.count_documents({})
            print(f"[DEBUG GET_STUDENTS] Total ID cards in collection: {total_id_cards}")
            
            # Show all ID cards in collection (for debugging)
            all_id_cards = list(db.branch_id_cards.find({}).limit(5))
            print(f"[DEBUG GET_STUDENTS] Sample ID cards in collection:")
            for idx, sample_card in enumerate(all_id_cards):
                print(f"  Sample {idx + 1}: student_id={sample_card.get('student_id')}, student_registration={sample_card.get('student_registration')}, branch_code={sample_card.get('branch_code')}")
            
            # Build query to find ID card
            id_card_query = {
                "$or": [
                    {"student_id": student_id},
                    {"registration_number": student_reg},
                    {"student_registration": student_reg}  # Also check this field name
                ]
            }
            
            print(f"[DEBUG GET_STUDENTS] ID card query: {id_card_query}")
            
            id_card = db.branch_id_cards.find_one(id_card_query)
            
            print(f"[DEBUG GET_STUDENTS] ID Card found: {bool(id_card)}")
            if id_card:
                print(f"[DEBUG GET_STUDENTS] ID Card data: {id_card}")
            
            # Handle datetime conversion for created_at
            created_at = student.get("created_at")
            if isinstance(created_at, datetime):
                created_at_str = created_at.isoformat()
            elif created_at:
                created_at_str = str(created_at)
            else:
                created_at_str = datetime.utcnow().isoformat()
            
            try:
                student_data = {
                    "id": str(student["_id"]),
                    "registration_number": student.get("registration_number"),
                    "student_name": student.get("name") or student.get("student_name"),
                    "email_id": student.get("email") or student.get("email_id"),
                    "contact_no": student.get("contact_number") or student.get("contact_no"),
                    "course": student.get("course_name") or student.get("course"),
                    "batch": student.get("batch_name") or student.get("batch"),
                    "branch_code": student.get("branch_code"),
                    "franchise_code": student.get("franchise_code"),
                    "admission_status": student.get("admission_status", "ACTIVE"),
                    "created_at": created_at_str,
                    "date_of_birth": student.get("date_of_birth"),
                    "father_name": student.get("father_name"),
                    "mother_name": student.get("mother_name"),
                    "address": student.get("address"),
                    "city": student.get("city"),
                    "state": student.get("state"),
                    "pincode": student.get("pincode"),
                    "photo": student.get("photo") or student.get("photo_url"),
                    "photo_url": student.get("photo_url") or student.get("photo"),
                    "student_photo": student.get("student_photo") or student.get("photo_url") or student.get("photo"),
                    "profile_image": student.get("profile_image") or student.get("photo_url") or student.get("photo"),
                    "center": student.get("center"),
                    "course_duration": student.get("course_duration"),
                    # ID Card information
                    "has_id_card": bool(id_card),
                    "id_card": None
                }
                
                if id_card:
                    student_data["id_card"] = {
                        "id": str(id_card["_id"]),
                        "card_number": id_card.get("card_number"),
                        "status": id_card.get("status"),
                        "issue_date": id_card.get("issue_date"),
                        "expiry_date": id_card.get("expiry_date"),
                        "file_path": id_card.get("file_path"),
                        "student_photo_url": id_card.get("student_photo_url") or id_card.get("photo_url"),
                        "created_at": id_card.get("created_at").isoformat() if id_card.get("created_at") else None
                    }
                
                students.append(student_data)
            except Exception as e:
                print(f"[DEBUG GET_STUDENTS] Error processing student {student.get('_id')}: {e}")
                print(f"[DEBUG GET_STUDENTS] Student data: {student}")
                # Continue with next student instead of failing completely
                continue
        
        print(f"[DEBUG GET_STUDENTS] Successfully processed {len(students)} students")
        
        # Log tenant activity
        multi_tenant.log_tenant_activity(
            context,
            "STUDENTS_RETRIEVED",
            {
                "count": len(students),
                "filters": {
                    "course": course,
                    "batch": batch,
                    "admission_year": admission_year,
                    "search": search
                },
                "pagination": {"page": page, "limit": limit}
            }
        )
        
        print(f"[DEBUG GET_STUDENTS] Returning {len(students)} students")
        return {"success": True, "students": students, "total": len(students)}
        
    except Exception as e:
        print(f"[DEBUG GET_STUDENTS] Exception occurred: {e}")
        print(f"[DEBUG GET_STUDENTS] Exception type: {type(e)}")
        import traceback
        print(f"[DEBUG GET_STUDENTS] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch students: {str(e)}")

@router.get("/students/{student_id}")
async def get_student_details(
    request: Request,
    student_id: str,
    current_user: dict = Depends(require_branch_access)
):
    """Get detailed information for a specific student with multi-tenant validation"""
    
    db = request.app.mongodb
    multi_tenant = get_multi_tenant_manager(db)
    
    def fix_object_ids(doc):
        """Recursively convert ObjectIds to strings"""
        if isinstance(doc, ObjectId):
            return str(doc)
        if isinstance(doc, list):
            return [fix_object_ids(item) for item in doc]
        if isinstance(doc, dict):
            return {k: fix_object_ids(v) for k, v in doc.items()}
        return doc
    
    try:
        # Get branch context with tenant isolation
        try:
            context = multi_tenant.get_branch_context(current_user)
        except Exception as context_error:
            print(f"[DEBUG GET_STUDENT_DETAILS] Branch context error: {context_error}")
            # If multi-tenant context fails, get branch info from database
            franchise_code, branch_code = get_branch_info_from_db(db, current_user)
            
            if not franchise_code or not branch_code:
                raise HTTPException(
                    status_code=400, 
                    detail="Unable to determine branch/franchise information. Please contact administrator."
                )
            
            context = {
                "franchise_code": franchise_code,
                "branch_code": branch_code,
                "user_id": current_user.get("user_id", str(current_user.get("_id", "unknown"))),
                "email": current_user.get("email", "unknown"),
                "role": current_user.get("role", "admin")
            }
        
        # Create tenant filter for this student
        try:
            student_filter = multi_tenant.create_tenant_filter(context, {"_id": ObjectId(student_id)})
        except Exception as filter_error:
            print(f"[DEBUG GET_STUDENT_DETAILS] Tenant filter error: {filter_error}")
            # Fallback: create basic filter
            student_filter = {
                "_id": ObjectId(student_id),
                "franchise_code": context["franchise_code"],
                "branch_code": context["branch_code"]
            }
        
        student = db.branch_students.find_one(student_filter)
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found or access denied")
        
        # Convert all ObjectIds to strings
        student = fix_object_ids(student)
        
        # Ensure id field exists (as alias for _id)
        if "_id" in student:
            student["id"] = student["_id"]
        
        # Log tenant activity
        multi_tenant.log_tenant_activity(
            context,
            "STUDENT_VIEWED",
            {
                "student_id": student_id,
                "student_name": student.get("student_name"),
                "registration_number": student.get("registration_number")
            }
        )
        
        return student
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DEBUG] Error fetching student details: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch student: {str(e)}")

@router.put("/students/{student_id}")
async def update_student(
    request: Request,
    student_id: str,
    update_data: BranchStudentUpdate,
    current_user: dict = Depends(require_branch_access)
):
    """Update student information with multi-tenant validation"""
    
    db = request.app.mongodb
    multi_tenant = get_multi_tenant_manager(db)
    
    try:
        # Get branch context with tenant isolation
        try:
            context = multi_tenant.get_branch_context(current_user)
            # Create tenant filter for this student
            student_filter = multi_tenant.create_tenant_filter(context, {"_id": ObjectId(student_id)})
        except Exception as context_error:
            print(f"[DEBUG UPDATE_STUDENT] Branch context error: {context_error}")
            # If multi-tenant context fails, get branch info from database
            franchise_code, branch_code = get_branch_info_from_db(db, current_user)
            
            if not franchise_code or not branch_code:
                raise HTTPException(
                    status_code=400, 
                    detail="Unable to determine branch/franchise information. Please contact administrator."
                )
            
            context = {
                "franchise_code": franchise_code,
                "branch_code": branch_code,
                "user_id": current_user.get("user_id", str(current_user.get("_id", "unknown"))),
                "email": current_user.get("email", "unknown"),
                "role": current_user.get("role", "admin")
            }
            
            # Create tenant filter for this student
            student_filter = {
                "_id": ObjectId(student_id),
                "franchise_code": franchise_code,
                "branch_code": branch_code
            }
        
        # Verify student exists and belongs to this tenant
        student = db.branch_students.find_one(student_filter)
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found or access denied")
        
        # Build update document (only include non-None values)
        update_doc = {}
        for field, value in update_data.dict(exclude_unset=True).items():
            if value is not None:
                update_doc[field] = value
        
        if update_doc:
            update_doc["updated_at"] = datetime.utcnow()
            update_doc["updated_by"] = context["user_id"]
            
            # Recalculate total fee if financial fields are updated
            if any(field in update_doc for field in ["net_fee", "discount", "other_charge"]):
                current_net_fee = update_doc.get("net_fee", student["net_fee"])
                current_discount = update_doc.get("discount", student["discount"])
                current_other_charge = update_doc.get("other_charge", student.get("other_charge", 0))
                update_doc["total_fee"] = current_net_fee + current_other_charge - current_discount
            
            # Ensure tenant isolation in update
            update_doc_with_tenant = multi_tenant.ensure_tenant_isolation_in_update(context, ObjectId(student_id), update_doc)
            
            result = db.branch_students.update_one(
                student_filter,
                {"$set": update_doc_with_tenant}
            )
            
            if result.modified_count == 0:
                raise HTTPException(status_code=400, detail="No changes were made")
                
            # Log tenant activity
            multi_tenant.log_tenant_activity(
                context,
                "STUDENT_UPDATED",
                {
                    "student_id": student_id,
                    "student_name": student.get("student_name"),
                    "registration_number": student.get("registration_number"),
                    "updated_fields": list(update_doc.keys())
                }
            )
        
        return {"message": "Student updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

@router.delete("/students/{student_id}")
async def delete_student(
    request: Request,
    student_id: str,
    current_user: dict = Depends(require_branch_access)
):
    """Permanently delete a student from the database"""
    
    db = request.app.mongodb
    
    # Get branch info from database
    franchise_code, branch_code = get_branch_info_from_db(db, current_user)
    
    if not franchise_code:
        franchise_code = current_user.get("franchise_code")
    
    if not franchise_code:
        raise HTTPException(
            status_code=400, 
            detail="Unable to determine franchise information. Please contact administrator."
        )
    
    try:
        # First, check if student exists and belongs to the franchise
        student = db.branch_students.find_one({
            "_id": ObjectId(student_id),
            "franchise_code": franchise_code
        })
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Log the deletion
        print(f"🗑️ [DELETE STUDENT] Permanently deleting student: {student_id}")
        print(f"🗑️ [DELETE STUDENT] Student name: {student.get('student_name', 'N/A')}")
        print(f"🗑️ [DELETE STUDENT] Registration: {student.get('registration_number', 'N/A')}")
        
        # Also delete related data (ID cards, certificates, etc.)
        # Delete ID cards
        id_card_result = db.branch_id_cards.delete_many({
            "student_id": student_id
        })
        print(f"🗑️ [DELETE STUDENT] Deleted {id_card_result.deleted_count} ID cards")
        
        # Delete certificates
        cert_result = db.branch_certificates.delete_many({
            "student_id": student_id
        })
        print(f"🗑️ [DELETE STUDENT] Deleted {cert_result.deleted_count} certificates")
        
        # Delete any other related records (payments, results, etc.)
        payment_result = db.branch_payments.delete_many({
            "student_id": student_id
        })
        print(f"🗑️ [DELETE STUDENT] Deleted {payment_result.deleted_count} payment records")
        
        result_delete = db.branch_results.delete_many({
            "student_id": student_id
        })
        print(f"🗑️ [DELETE STUDENT] Deleted {result_delete.deleted_count} result records")
        
        # Finally, delete the student record itself
        student_result = db.branch_students.delete_one({
            "_id": ObjectId(student_id),
            "franchise_code": franchise_code
        })
        
        if student_result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Student not found or could not be deleted")
        
        print(f"✅ [DELETE STUDENT] Successfully deleted student and all related data")
        
        return {
            "success": True,
            "message": "Student deleted permanently",
            "deleted_records": {
                "student": student_result.deleted_count,
                "id_cards": id_card_result.deleted_count,
                "certificates": cert_result.deleted_count,
                "payments": payment_result.deleted_count,
                "results": result_delete.deleted_count
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [DELETE STUDENT] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

@router.patch("/students/{student_id}/status")
async def toggle_student_status(
    request: Request,
    student_id: str,
    current_user: dict = Depends(require_branch_access)
):
    """Toggle student admission status (Active/Inactive)"""
    import json
    
    logger.info(f"🚀 [TOGGLE STUDENT STATUS] PATCH /students/{student_id}/status endpoint called")
    
    db = request.app.mongodb
    
    try:
        # Parse request body
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        new_status = data.get("status") or data.get("admission_status")
        
        logger.info(f"[TOGGLE STUDENT STATUS] Toggling status for {student_id} to {new_status}")
        
        # Get branch info from database
        franchise_code, branch_code = get_branch_info_from_db(db, current_user)
        
        if not franchise_code:
            franchise_code = current_user.get("franchise_code")
        
        if not franchise_code:
            raise HTTPException(
                status_code=400, 
                detail="Unable to determine franchise information. Please contact administrator."
            )
        
        # Update student status with tenant isolation
        result = db.branch_students.update_one(
            {
                "_id": ObjectId(student_id),
                "franchise_code": franchise_code
            },
            {
                "$set": {
                    "admission_status": new_status,
                    "status": new_status,  # Update both fields for compatibility
                    "updated_at": datetime.utcnow(),
                    "updated_by": current_user.get("user_id", current_user.get("_id"))
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Student not found or access denied")
        
        if result.modified_count > 0:
            logger.info(f"✅ [TOGGLE STUDENT STATUS] Status updated successfully: {student_id}")
            return {
                "success": True,
                "message": f"Student status changed to {new_status}",
                "status": new_status
            }
        else:
            return {
                "success": True,
                "message": "No changes made",
                "status": new_status
            }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"❌ [TOGGLE STUDENT STATUS] Error updating status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update student status: {str(e)}")

@router.get("/dashboard/stats")
async def get_branch_dashboard_stats(
    request: Request,
    current_user: dict = Depends(require_branch_access)
):
    """Get dashboard statistics for the branch with multi-tenant isolation"""
    
    db = request.app.mongodb
    multi_tenant = get_multi_tenant_manager(db)
    
    try:
        # Get branch context with tenant isolation
        try:
            context = multi_tenant.get_branch_context(current_user)
            # Use multi-tenant manager to get statistics
            tenant_stats = multi_tenant.get_tenant_stats(context)
            # Get additional branch-specific statistics
            base_filter = multi_tenant.create_tenant_filter(context)
        except Exception as context_error:
            print(f"[DEBUG DASHBOARD] Branch context error: {context_error}")
            # If multi-tenant context fails, get branch info from database
            franchise_code, branch_code = get_branch_info_from_db(db, current_user)
            
            if not franchise_code or not branch_code:
                raise HTTPException(
                    status_code=400, 
                    detail="Unable to determine branch/franchise information. Please contact administrator."
                )
            
            context = {
                "franchise_code": franchise_code,
                "branch_code": branch_code,
                "user_id": current_user.get("user_id", str(current_user.get("_id", "unknown"))),
                "email": current_user.get("email", "unknown"),
                "role": current_user.get("role", "admin")
            }
            
            # Create basic tenant stats
            tenant_stats = {}
            base_filter = {
                "franchise_code": franchise_code,
                "branch_code": branch_code
            }
        
        # Course-wise student count
        course_pipeline = [
            {"$match": base_filter},
            {"$group": {
                "_id": "$course",
                "count": {"$sum": 1},
                "total_fee": {"$sum": "$total_fee"}
            }},
            {"$sort": {"count": -1}}
        ]
        course_stats = list(db.branch_students.aggregate(course_pipeline))
        
        # Batch-wise student count
        batch_pipeline = [
            {"$match": base_filter},
            {"$group": {
                "_id": "$batch",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}}
        ]
        batch_stats = list(db.branch_students.aggregate(batch_pipeline))
        
        # Monthly admission trends
        monthly_pipeline = [
            {"$match": base_filter},
            {"$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"}
                },
                "admissions": {"$sum": 1},
                "revenue": {"$sum": "$total_fee"}
            }},
            {"$sort": {"_id.year": -1, "_id.month": -1}},
            {"$limit": 12}
        ]
        monthly_trends = list(db.branch_students.aggregate(monthly_pipeline))
        
        # Admission status breakdown
        status_pipeline = [
            {"$match": base_filter},
            {"$group": {
                "_id": "$admission_status",
                "count": {"$sum": 1}
            }}
        ]
        status_breakdown = list(db.branch_students.aggregate(status_pipeline))
        
        # Recent admissions
        recent_admissions = list(db.branch_students.find(
            base_filter,
            {
                "student_name": 1,
                "course": 1,
                "total_fee": 1,
                "created_at": 1,
                "admission_status": 1
            }
        ).sort("created_at", -1).limit(5))
        
        # Format recent admissions
        recent_admissions_formatted = []
        for admission in recent_admissions:
            recent_admissions_formatted.append({
                "id": str(admission["_id"]),
                "student_name": admission.get("student_name"),
                "course": admission.get("course"),
                "total_fee": admission.get("total_fee", 0),
                "admission_status": admission.get("admission_status"),
                "created_at": admission.get("created_at")
            })
        
        # Log tenant activity
        multi_tenant.log_tenant_activity(
            context,
            "DASHBOARD_ACCESSED",
            {"stats_type": "comprehensive_dashboard"}
        )
        
        return {
            "tenant_info": {
                "franchise_code": context["franchise_code"],
                "branch_code": context["branch_code"]
            },
            "basic_stats": tenant_stats,
            "course_breakdown": course_stats,
            "batch_breakdown": batch_stats,
            "monthly_trends": monthly_trends,
            "status_breakdown": status_breakdown,
            "recent_admissions": recent_admissions_formatted,
            "generated_at": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate dashboard stats: {str(e)}")

@router.get("/analytics/revenue")
async def get_revenue_analytics(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    group_by: str = "month",  # month, week, day
    current_user: dict = Depends(require_branch_access)
):
    """Get revenue analytics with multi-tenant isolation"""
    
    db = request.app.mongodb
    multi_tenant = get_multi_tenant_manager(db)
    
    try:
        # Get branch context with tenant isolation
        try:
            context = multi_tenant.get_branch_context(current_user)
            # Create base filter with tenant isolation
            base_filter = multi_tenant.create_tenant_filter(context)
        except Exception as context_error:
            print(f"[DEBUG REVENUE] Branch context error: {context_error}")
            # If multi-tenant context fails, get branch info from database
            franchise_code, branch_code = get_branch_info_from_db(db, current_user)
            
            if not franchise_code or not branch_code:
                raise HTTPException(
                    status_code=400, 
                    detail="Unable to determine branch/franchise information. Please contact administrator."
                )
            
            context = {
                "franchise_code": franchise_code,
                "branch_code": branch_code,
                "user_id": current_user.get("user_id", str(current_user.get("_id", "unknown"))),
                "email": current_user.get("email", "unknown"),
                "role": current_user.get("role", "admin")
            }
            
            # Create base filter
            base_filter = {
                "franchise_code": franchise_code,
                "branch_code": branch_code
            }
        
        # Add date range filter if provided
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = datetime.fromisoformat(start_date)
            if end_date:
                date_filter["$lte"] = datetime.fromisoformat(end_date)
            base_filter["created_at"] = date_filter
        
        # Set grouping format based on group_by parameter
        if group_by == "day":
            date_group = {
                "year": {"$year": "$created_at"},
                "month": {"$month": "$created_at"},
                "day": {"$dayOfMonth": "$created_at"}
            }
        elif group_by == "week":
            date_group = {
                "year": {"$year": "$created_at"},
                "week": {"$week": "$created_at"}
            }
        else:  # month
            date_group = {
                "year": {"$year": "$created_at"},
                "month": {"$month": "$created_at"}
            }
        
        # Revenue aggregation pipeline
        revenue_pipeline = [
            {"$match": base_filter},
            {"$group": {
                "_id": date_group,
                "total_revenue": {"$sum": "$total_fee"},
                "net_fees": {"$sum": "$net_fee"},
                "total_discounts": {"$sum": "$discount"},
                "other_charges": {"$sum": "$other_charge"},
                "student_count": {"$sum": 1}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}}
        ]
        
        revenue_data = list(db.branch_students.aggregate(revenue_pipeline))
        
        # Calculate totals
        total_revenue = sum(item["total_revenue"] for item in revenue_data)
        total_students = sum(item["student_count"] for item in revenue_data)
        avg_fee_per_student = total_revenue / total_students if total_students > 0 else 0
        
        # Log tenant activity
        multi_tenant.log_tenant_activity(
            context,
            "REVENUE_ANALYTICS_ACCESSED",
            {
                "date_range": {"start": start_date, "end": end_date},
                "group_by": group_by,
                "total_revenue": total_revenue
            }
        )
        
        return {
            "tenant_info": {
                "franchise_code": context["franchise_code"],
                "branch_code": context["branch_code"]
            },
            "analytics": {
                "revenue_breakdown": revenue_data,
                "summary": {
                    "total_revenue": total_revenue,
                    "total_students": total_students,
                    "average_fee_per_student": avg_fee_per_student
                },
                "parameters": {
                    "group_by": group_by,
                    "start_date": start_date,
                    "end_date": end_date
                }
            },
            "generated_at": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate revenue analytics: {str(e)}")

@router.get("/students/stats/summary")
async def get_branch_student_stats(
    request: Request,
    current_user: dict = Depends(require_branch_access)
):
    """Get statistical summary of branch students"""
    
    db = request.app.mongodb
    
    # Get branch info from database
    franchise_code, branch_code = get_branch_info_from_db(db, current_user)
    
    if not franchise_code:
        franchise_code = current_user.get("franchise_code")
    
    if not franchise_code:
        raise HTTPException(
            status_code=400, 
            detail="Unable to determine franchise information. Please contact administrator."
        )
    
    try:
        # Use both franchise_code and branch_code for better isolation
        match_filter = {"franchise_code": franchise_code}
        if branch_code:
            match_filter["branch_code"] = branch_code
            
        pipeline = [
            {"$match": match_filter},
            {
                "$group": {
                    "_id": None,
                    "total_students": {"$sum": 1},
                    "active_students": {
                        "$sum": {"$cond": [{"$eq": ["$admission_status", "ACTIVE"]}, 1, 0]}
                    },
                    "total_fees_collected": {"$sum": "$total_fee"},
                    "courses": {"$addToSet": "$course"},
                    "batches": {"$addToSet": "$batch"}
                }
            }
        ]
        
        result = list(db.branch_students.aggregate(pipeline))
        
        if result:
            stats = result[0]
            stats["total_courses"] = len(stats.get("courses", []))
            stats["total_batches"] = len(stats.get("batches", []))
            del stats["_id"]
            del stats["courses"]
            del stats["batches"]
        else:
            stats = {
                "total_students": 0,
                "active_students": 0,
                "total_fees_collected": 0,
                "total_courses": 0,
                "total_batches": 0
            }
        
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")

@router.post("/students/{student_id}/reset-password")
async def reset_student_password(
    request: Request,
    student_id: str,
    new_password: Optional[str] = None,
    current_user: dict = Depends(require_branch_access)
):
    """Reset password for a student - branch admin can set manual password"""
    
    db = request.app.mongodb
    multi_tenant = get_multi_tenant_manager(db)
    
    try:
        # Get branch context with tenant isolation
        try:
            context = multi_tenant.get_branch_context(current_user)
            # Create tenant filter for this student
            student_filter = multi_tenant.create_tenant_filter(context, {"_id": ObjectId(student_id)})
        except Exception as context_error:
            print(f"[DEBUG PASSWORD_RESET] Branch context error: {context_error}")
            # If multi-tenant context fails, get branch info from database
            franchise_code, branch_code = get_branch_info_from_db(db, current_user)
            
            if not franchise_code or not branch_code:
                raise HTTPException(
                    status_code=400, 
                    detail="Unable to determine branch/franchise information. Please contact administrator."
                )
            
            context = {
                "franchise_code": franchise_code,
                "branch_code": branch_code,
                "user_id": current_user.get("user_id", str(current_user.get("_id", "unknown"))),
                "email": current_user.get("email", "unknown"),
                "role": current_user.get("role", "admin")
            }
            
            # Create tenant filter for this student
            student_filter = {
                "_id": ObjectId(student_id),
                "franchise_code": franchise_code,
                "branch_code": branch_code
            }
        
        # Verify student exists and belongs to this tenant
        student = db.branch_students.find_one(student_filter)
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found or access denied")
        
        # Generate password if not provided
        if not new_password:
            new_password = generate_random_password(8)
        
        # Validate password strength - only minimum length required
        if len(new_password) < 4:
            raise HTTPException(status_code=400, detail="Password must be at least 4 characters long")
        
        # Hash the new password
        hashed_password = hash_password(new_password)
        
        # Update student document with new password
        update_data = {
            "password_hash": hashed_password,
            "password_reset_at": datetime.utcnow(),
            "password_reset_by": context["user_id"],
            "login_enabled": True,
            "updated_at": datetime.utcnow(),
            "updated_by": context["user_id"]
        }
        
        # Ensure tenant isolation in update
        update_data_with_tenant = multi_tenant.ensure_tenant_isolation_in_update(context, update_data)
        
        result = db.branch_students.update_one(
            student_filter,
            {"$set": update_data_with_tenant}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to reset password")
        
        # Log tenant activity
        multi_tenant.log_tenant_activity(
            context,
            "STUDENT_PASSWORD_RESET",
            {
                "student_id": student_id,
                "student_name": student.get("student_name"),
                "registration_number": student.get("registration_number"),
                "reset_by": context["email"]
            }
        )
        
        return {
            "message": "Password reset successfully",
            "student_email": student["email_id"],
            "new_password": new_password,
            "login_enabled": True,
            "reset_at": datetime.utcnow(),
            "note": "Please provide these credentials to the student securely"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Password reset failed: {str(e)}")

@router.post("/students/{student_id}/toggle-login")
async def toggle_student_login(
    request: Request,
    student_id: str,
    enable_login: bool = True,
    current_user: dict = Depends(require_branch_access)
):
    """Enable or disable login access for a student"""
    
    db = request.app.mongodb
    multi_tenant = get_multi_tenant_manager(db)
    
    try:
        # Get branch context with tenant isolation
        try:
            context = multi_tenant.get_branch_context(current_user)
            # Create tenant filter for this student
            student_filter = multi_tenant.create_tenant_filter(context, {"_id": ObjectId(student_id)})
        except Exception as context_error:
            print(f"[DEBUG TOGGLE_LOGIN] Branch context error: {context_error}")
            # If multi-tenant context fails, get branch info from database
            franchise_code, branch_code = get_branch_info_from_db(db, current_user)
            
            if not franchise_code or not branch_code:
                raise HTTPException(
                    status_code=400, 
                    detail="Unable to determine branch/franchise information. Please contact administrator."
                )
            
            context = {
                "franchise_code": franchise_code,
                "branch_code": branch_code,
                "user_id": current_user.get("user_id", str(current_user.get("_id", "unknown"))),
                "email": current_user.get("email", "unknown"),
                "role": current_user.get("role", "admin")
            }
            
            # Create tenant filter for this student
            student_filter = {
                "_id": ObjectId(student_id),
                "franchise_code": franchise_code,
                "branch_code": branch_code
            }
        
        # Verify student exists and belongs to this tenant
        student = db.branch_students.find_one(student_filter)
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found or access denied")
        
        # Update login status
        update_data = {
            "login_enabled": enable_login,
            "login_status_changed_at": datetime.utcnow(),
            "login_status_changed_by": context["user_id"],
            "updated_at": datetime.utcnow(),
            "updated_by": context["user_id"]
        }
        
        # Ensure tenant isolation in update
        update_data_with_tenant = multi_tenant.ensure_tenant_isolation_in_update(context, update_data)
        
        result = db.branch_students.update_one(
            student_filter,
            {"$set": update_data_with_tenant}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to update login status")
        
        # Log tenant activity
        action = "STUDENT_LOGIN_ENABLED" if enable_login else "STUDENT_LOGIN_DISABLED"
        multi_tenant.log_tenant_activity(
            context,
            action,
            {
                "student_id": student_id,
                "student_name": student.get("student_name"),
                "registration_number": student.get("registration_number"),
                "login_enabled": enable_login,
                "changed_by": context["email"]
            }
        )
        
        status = "enabled" if enable_login else "disabled"
        return {
            "message": f"Student login access {status} successfully",
            "student_email": student["email_id"],
            "login_enabled": enable_login,
            "changed_at": datetime.utcnow()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login toggle failed: {str(e)}")

@router.get("/students/{student_id}/login-info")
async def get_student_login_info(
    request: Request,
    student_id: str,
    current_user: dict = Depends(require_branch_access)
):
    """Get login information for a student (without password hash)"""
    
    db = request.app.mongodb
    multi_tenant = get_multi_tenant_manager(db)
    
    try:
        # Get branch context with tenant isolation
        try:
            context = multi_tenant.get_branch_context(current_user)
            # Create tenant filter for this student
            student_filter = multi_tenant.create_tenant_filter(context, {"_id": ObjectId(student_id)})
        except Exception as context_error:
            print(f"[DEBUG LOGIN_INFO] Branch context error: {context_error}")
            # If multi-tenant context fails, get branch info from database
            franchise_code, branch_code = get_branch_info_from_db(db, current_user)
            
            if not franchise_code or not branch_code:
                raise HTTPException(
                    status_code=400, 
                    detail="Unable to determine branch/franchise information. Please contact administrator."
                )
            
            context = {
                "franchise_code": franchise_code,
                "branch_code": branch_code,
                "user_id": current_user.get("user_id", str(current_user.get("_id", "unknown"))),
                "email": current_user.get("email", "unknown"),
                "role": current_user.get("role", "admin")
            }
            
            # Create tenant filter for this student
            student_filter = {
                "_id": ObjectId(student_id),
                "franchise_code": franchise_code,
                "branch_code": branch_code
            }
        
        # Get student login info (exclude sensitive fields)
        student = db.branch_students.find_one(
            student_filter,
            {
                "student_name": 1,
                "email_id": 1,
                "registration_number": 1,
                "login_enabled": 1,
                "password_created_at": 1,
                "password_created_by": 1,
                "password_reset_at": 1,
                "password_reset_by": 1,
                "login_status_changed_at": 1,
                "login_status_changed_by": 1
            }
        )
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found or access denied")
        
        # Check if password exists
        has_password = db.branch_students.find_one(
            student_filter,
            {"password_hash": 1}
        ).get("password_hash") is not None
        
        # Log tenant activity
        multi_tenant.log_tenant_activity(
            context,
            "STUDENT_LOGIN_INFO_VIEWED",
            {
                "student_id": student_id,
                "student_name": student.get("student_name"),
                "registration_number": student.get("registration_number")
            }
        )
        
        return {
            "student_id": str(student["_id"]),
            "student_name": student.get("student_name"),
            "email_id": student.get("email_id"),
            "registration_number": student.get("registration_number"),
            "login_enabled": student.get("login_enabled", False),
            "has_password": has_password,
            "password_created_at": student.get("password_created_at"),
            "password_last_reset_at": student.get("password_reset_at"),
            "login_status_last_changed_at": student.get("login_status_changed_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get login info: {str(e)}")


@router.get("/next-registration-number")
async def get_next_registration_number(
    request: Request,
    admission_year: Optional[str] = None,
    current_user: dict = Depends(require_branch_access)
):
    """Get the next registration number for the current branch and year"""
    
    db = request.app.mongodb
    multi_tenant = get_multi_tenant_manager(db)
    
    try:
        # Get branch context with tenant isolation
        print(f"[DEBUG NEXT_REG_NUMBER] Starting endpoint - current_user: {current_user}")
        context = multi_tenant.get_branch_context(current_user)
        print(f"[DEBUG NEXT_REG_NUMBER] Branch context: {context}")
        
        # Use current year if not provided
        if not admission_year:
            admission_year = str(datetime.now().year)
            
        print(f"[DEBUG NEXT_REG_NUMBER] Getting next registration number for branch: {context['branch_code']}, year: {admission_year}")
        
        # Generate the next registration number
        next_reg_number, sequence = generate_registration_number(
            branch_code=context["branch_code"],
            admission_year=admission_year,
            db=db
        )
        
        print(f"[DEBUG NEXT_REG_NUMBER] Generated: {next_reg_number}, sequence: {sequence}")
        
        return {
            "next_registration_number": next_reg_number,
            "branch_code": context["branch_code"],
            "admission_year": admission_year,
            "sequence_number": sequence
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DEBUG NEXT_REG_NUMBER] Error: {e}")
        print(f"[DEBUG NEXT_REG_NUMBER] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to get next registration number: {str(e)}")


@router.post("/reset-password")
async def reset_student_password(
    request: Request,
    email: str = Form(...),
    new_password: str = Form(...),
    user=Depends(require_branch_access)
):
    """
    Reset a branch student's password (admin/franchise/branch_admin only)
    """
    try:
        db = request.app.mongodb
        
        print(f"[DEBUG] Password reset request for email: {email}")
        
        # Find the student
        student = db.branch_students.find_one({"email_id": email})
        
        if not student:
            print(f"[DEBUG] Student not found with email_id: {email}")
            raise HTTPException(status_code=404, detail=f"Student not found with email: {email}")
        
        print(f"[DEBUG] Found student: {student.get('student_name')}")
        
        # Hash the new password
        hashed_password = hash_password(new_password)
        print(f"[DEBUG] Password hashed successfully")
        
        # Update the password and ensure login is enabled
        result = db.branch_students.update_one(
            {"_id": student["_id"]},
            {
                "$set": {
                    "password_hash": hashed_password,
                    "login_enabled": True,
                    "updated_at": datetime.utcnow().isoformat(),
                    "updated_by": user.get("user_id")
                }
            }
        )
        
        if result.modified_count > 0:
            # Verify the password works
            test_bytes = new_password.encode('utf-8')
            hash_bytes = hashed_password.encode('utf-8')
            verification_result = bcrypt.checkpw(test_bytes, hash_bytes)
            print(f"[DEBUG] Password verification: {verification_result}")
            
            return {
                "success": True,
                "message": f"Password reset successfully for {student.get('student_name')}",
                "student": {
                    "name": student.get('student_name'),
                    "email": email,
                    "registration_number": student.get('registration_number'),
                    "login_enabled": True
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update password")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DEBUG] Password reset error: {e}")
        raise HTTPException(status_code=500, detail=f"Password reset failed: {str(e)}")


# ============== FIX EXISTING STUDENTS - ADD EMAIL FIELD ==============

@router.post("/fix-student-emails")
async def fix_student_email_fields(request: Request, current_user: dict = Depends(require_branch_access)):
    """
    Fix existing students by adding 'email' field from 'email_id' for login compatibility.
    This is a one-time migration endpoint.
    """
    try:
        db = request.app.mongodb
        
        print("[FIX] Starting student email field migration...")
        
        # Find all students that have email_id but no email field
        students_to_fix = list(db.branch_students.find({
            "email_id": {"$exists": True},
            "email": {"$exists": False}
        }))
        
        print(f"[FIX] Found {len(students_to_fix)} students to fix")
        
        fixed_count = 0
        for student in students_to_fix:
            try:
                result = db.branch_students.update_one(
                    {"_id": student["_id"]},
                    {"$set": {"email": student["email_id"]}}
                )
                if result.modified_count > 0:
                    fixed_count += 1
                    print(f"[FIX] Fixed student: {student.get('student_name')} - {student.get('email_id')}")
            except Exception as e:
                print(f"[FIX] Error fixing student {student.get('_id')}: {e}")
        
        print(f"[FIX] Migration complete. Fixed {fixed_count} students")
        
        return {
            "success": True,
            "message": f"Successfully updated {fixed_count} students",
            "total_found": len(students_to_fix),
            "total_fixed": fixed_count
        }
        
    except Exception as e:
        print(f"[FIX] Migration error: {e}")
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")


@router.delete("/students/{student_id}")
async def delete_student(
    request: Request,
    student_id: str,
    current_user: dict = Depends(require_branch_access)
):
    """Soft delete a student"""
    db = request.app.mongodb
    multi_tenant = get_multi_tenant_manager(db)
    
    try:
        # Get branch context with tenant isolation
        try:
            context = multi_tenant.get_branch_context(current_user)
        except Exception:
            # Fallback if context retrieval fails
            franchise_code, branch_code = get_branch_info_from_db(db, current_user)
            if not franchise_code:
                raise HTTPException(status_code=400, detail="Unable to determine branch context")
            
            context = {
                "franchise_code": franchise_code,
                "branch_code": branch_code,
                "user_id": current_user.get("user_id", str(current_user.get("_id"))),
                "role": current_user.get("role")
            }

        # Verify student exists and belongs to branch
        # Use find_one with strict branch filtering
        student = db.branch_students.find_one({
            "_id": ObjectId(student_id),
            "branch_code": context["branch_code"]
        })
        
        if not student:
            # Try finding by Franchise if branch strict check fails for some reason
            student = db.branch_students.find_one({
                "_id": ObjectId(student_id),
                "franchise_code": context["franchise_code"]
            })
            
            if not student:
                raise HTTPException(status_code=404, detail="Student not found or access denied")

        # Soft delete
        result = db.branch_students.update_one(
            {"_id": ObjectId(student_id)},
            {
                "$set": {
                    "admission_status": "DELETED",
                    "deleted_at": datetime.utcnow().isoformat(),
                    "deleted_by": context.get("user_id", "unknown")
                }
            }
        )
        
        # Log activity
        try:
            multi_tenant.log_tenant_activity(
                context,
                "STUDENT_DELETED", 
                {
                    "student_id": student_id, 
                    "name": student.get("student_name")
                }
            )
        except Exception as log_error:
            print(f"[DELETE STUDENT] Logging error: {log_error}")
        
        return {"success": True, "message": "Student deleted successfully", "id": student_id}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[DELETE STUDENT] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
