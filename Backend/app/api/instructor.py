from fastapi import APIRouter, Request, Depends, HTTPException
from app.schemas.auth import UserCreate, UserLogin, TokenResponse
from app.services.auth_service import register_user, login_user
from app.models.user import get_user_collection
from app.utils.auth_helpers import get_current_user
from app.utils.branch_filter import BranchAccessManager
from bson import ObjectId
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import logging
import bcrypt

# Get logger
logger = logging.getLogger("uvicorn")

# Helper function for department collection
def get_department_collection(db, user_context=None):
    """Get the departments collection - always use global collection with filtering"""
    # Always use the global 'departments' collection
    # Filtering by franchise_code/branch_code is done at query level
    return db["departments"]

# Pydantic models for instructor management
class InstructorCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    password: str
    department: Optional[str] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None
    basicSalary: Optional[float] = 0.0
    status: str = "active"
    franchise_code: Optional[str] = None
    branch_code: Optional[str] = None
    employee_code: Optional[str] = None

class InstructorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None
    basicSalary: Optional[float] = None
    status: Optional[str] = None

class InstructorResponse(BaseModel):
    id: str
    employee_code: Optional[str] = None
    name: str
    email: str
    phone: Optional[str] = None
    department: Optional[str] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None
    basicSalary: Optional[float] = 0.0
    courses_count: int = 0
    courses: List[dict] = []
    status: str = "active"
    created_at: Optional[str] = None
    franchise_code: Optional[str] = None
    branch_code: Optional[str] = None
    
    class Config:
        # Allow coercion of int to float
        coerce_numbers_to_str = False

# Department schemas
class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    head: Optional[str] = None
    employees_count: int = 0
    budget: Optional[float] = 0.0

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    head: Optional[str] = None
    employees_count: Optional[int] = None
    budget: Optional[float] = None
    status: Optional[str] = None

class DepartmentResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    head: Optional[str] = None
    employees_count: int = 0
    budget: Optional[float] = 0.0
    status: str
    created_at: Optional[str] = None
    franchise_code: Optional[str] = None
    branch_code: Optional[str] = None

instructor_router = APIRouter(prefix="/instructor", tags=["Instructors"])

# Instructor registration endpoint (creates instructor user in users collection)
@instructor_router.post("/register", response_model=TokenResponse)
def register_instructor(request: Request, user: UserCreate, current_user: dict = Depends(get_current_user)):
    """Register instructor - now requires authentication for branch admin use"""
    db = request.app.mongodb
    user_collection = get_user_collection(db)
    
    try:
        # Check if email already exists
        existing_user = user_collection.find_one({"email": user.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Get franchise context from current user
        franchise_code = current_user.get("franchise_code") or user.franchise_code
        branch_code = current_user.get("branch_code")
        
        # Force role to be instructor and add franchise information
        instructor_user = UserCreate(
            name=user.name,
            email=user.email,
            password=user.password,
            role="instructor",
            franchise_code=franchise_code,
            franchise_id=current_user.get("franchise_id") or user.franchise_id
        )
        
        # Add branch context if available
        if branch_code:
            instructor_user.branch_code = branch_code
        
        # Register the instructor user
        register_result = register_user(db, instructor_user)
        
        # If registration successful, return success response
        if register_result.get("success"):
            # Get the created user
            created_user = user_collection.find_one({"email": user.email})
            return {
                "access_token": "instructor_created",  # Dummy token for success
                "token_type": "bearer",
                "user": {
                    "user_id": str(created_user["_id"]),
                    "name": created_user.get("name"),
                    "email": created_user.get("email"),
                    "role": "instructor",
                    "franchise_code": franchise_code,
                    "branch_code": branch_code
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Registration failed")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering instructor: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

# Instructor login endpoint (validates instructor role before login)
@instructor_router.post("/login", response_model=TokenResponse)
def login_instructor(request: Request, credentials: UserLogin):
    db = request.app.mongodb
    user_collection = get_user_collection(db)
    
    # Check if user exists and validate credentials
    user = user_collection.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if user has instructor role before password verification
    if user.get("role") != "instructor":
        raise HTTPException(status_code=403, detail="Instructor access required")
    
    # Use existing login service for password verification and token generation
    result = login_user(db, credentials)
    
    # Add instructor-specific information
    result["user"]["dashboard_route"] = "/instructor"
    result["user"]["permissions"] = [
        "create_courses", "manage_own_courses", "view_students",
        "create_assignments", "grade_assignments"
    ]
    
    return result

# Check if instructor exists by email
@instructor_router.get("/exists/{email}")
def instructor_exists(request: Request, email: str):
    db = request.app.mongodb
    user_collection = get_user_collection(db)
    
    # Get branch filter for multi-tenancy
    current_user = getattr(request.state, 'user', None)
    # Initialize BranchAccessManager with current_user context
    access_manager = BranchAccessManager(current_user) if current_user else BranchAccessManager({})
    branch_filter = access_manager.get_filter_query()
    
    # Build query with branch filtering
    query = {"email": email, "role": "instructor"}
    if branch_filter:
        query.update(branch_filter)
    
    instructor = user_collection.find_one(query)
    return {"instructor_exists": instructor is not None}

# List all instructors (for branch/admin access)
@instructor_router.get("/instructors", response_model=List[InstructorResponse])
def get_instructors(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all instructors for the franchise/branch"""
    try:
        db = request.app.mongodb
        user_collection = get_user_collection(db)
        course_collection = db.get_collection("courses")
        
        # Build query for instructors
        query = {"role": "instructor"}
        
        # Add franchise filtering if user has franchise context
        user_role = current_user.get("role", "")
        franchise_code = current_user.get("franchise_code")
        branch_code = current_user.get("branch_code")
        
        

        
        if franchise_code:
            query["franchise_code"] = franchise_code
        
        # TEMPORARILY DISABLED: branch_code filter causes issues with ObjectId stored in DB
        # if branch_code and user_role == "branch_admin":
        #     query["branch_code"] = branch_code
        
        

        
        # Get total count
        total_count = user_collection.count_documents(query)

        
        

        
        # Add search functionality
        if search:
            search_conditions = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"specialization": {"$regex": search, "$options": "i"}}
            ]
            query["$or"] = search_conditions
        
        # Get total count
        total_count = user_collection.count_documents(query)
        
        print(f"[DEBUG INSTRUCTORS] Found {total_count} instructors matching query")
        
        # Get instructors with pagination
        instructors = list(user_collection.find(query)
                          .skip(skip)
                          .limit(limit)
                          .sort("created_at", -1))
        
        # Enrich instructor data with course information
        enriched_instructors = []
        for instructor in instructors:
            instructor_id = str(instructor["_id"])
            instructor_user_id = instructor.get("user_id", instructor_id)
            
            # Count courses created by this instructor
            instructor_courses_count = course_collection.count_documents({
                "$or": [
                    {"instructor": instructor_id},
                    {"instructor": instructor_user_id},
                    {"instructor_id": instructor_id},
                    {"created_by": instructor_id}
                ]
            })
            
            # Get a few sample courses
            sample_courses = list(course_collection.find({
                "$or": [
                    {"instructor": instructor_id},
                    {"instructor": instructor_user_id},
                    {"instructor_id": instructor_id},
                    {"created_by": instructor_id}
                ]
            }).limit(3))
            
            courses_list = [{
                "id": str(course["_id"]),
                "title": course.get("title", course.get("course_name", ""))
            } for course in sample_courses]
            
            enriched_instructor = InstructorResponse(
                id=instructor_id,
                employee_code=instructor.get("employee_code", ""),
                name=instructor.get("name", ""),
                email=instructor.get("email", ""),
                phone=instructor.get("phone", ""),
                department=instructor.get("department", ""),
                specialization=instructor.get("specialization", ""),
                qualification=instructor.get("qualification", ""),
                experience=instructor.get("experience", ""),
                basicSalary=instructor.get("basicSalary", 0.0),
                courses_count=instructor_courses_count,
                courses=courses_list,
                status=instructor.get("status", "active"),
                created_at=instructor.get("created_at", ""),
                franchise_code=str(instructor.get("franchise_code", "")) if instructor.get("franchise_code") else "",
                branch_code=str(instructor.get("branch_code", "")) if instructor.get("branch_code") else ""
            )
            enriched_instructors.append(enriched_instructor)
        
        return enriched_instructors
        
    except Exception as e:
        logger.error(f"Error fetching instructors: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch instructors")

# Update instructor endpoint
@instructor_router.put("/instructors/{instructor_id}")
async def update_instructor(
    request: Request,
    instructor_id: str,
    instructor_data: InstructorUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an existing instructor"""
    try:
        logger.info(f"[UPDATE INSTRUCTOR] Request to update instructor: {instructor_id}")
        logger.info(f"[UPDATE INSTRUCTOR] Data received: {instructor_data}")
        logger.info(f"[UPDATE INSTRUCTOR] Current user: {current_user.get('email')}")
        
        db = request.app.mongodb
        user_collection = get_user_collection(db)
        course_collection = db.get_collection("courses")
        
        # Check if instructor exists by ID first
        instructor = user_collection.find_one({
            "_id": ObjectId(instructor_id),
            "role": "instructor"
        })
        
        if not instructor:
            logger.warning(f"[UPDATE INSTRUCTOR] Instructor not found: {instructor_id}")
            raise HTTPException(status_code=404, detail="Instructor not found")
        
        logger.info(f"[UPDATE INSTRUCTOR] Found instructor: {instructor.get('name')}")
        
        # Verify instructor belongs to this branch/franchise
        user_branch = current_user.get("branch_code") or current_user.get("franchise_code") or ""
        instructor_branch = str(instructor.get("branch_code", "")) if instructor.get("branch_code") else ""
        instructor_franchise = str(instructor.get("franchise_code", "")) if instructor.get("franchise_code") else ""
        
        logger.info(f"[UPDATE INSTRUCTOR] user_branch: {user_branch}, instructor_branch: {instructor_branch}, instructor_franchise: {instructor_franchise}")
        
        # Check ownership (skip for super admin)
        if current_user.get("role") != "admin":
            if user_branch not in [instructor_branch, instructor_franchise] and instructor_franchise != user_branch:
                logger.warning(f"[UPDATE INSTRUCTOR] Permission denied - branch mismatch")
                raise HTTPException(status_code=403, detail="You can only update instructors from your branch")
        
        # Build update document (only include non-None values)
        update_doc = {"updated_at": datetime.utcnow().isoformat()}
        
        if instructor_data.name is not None:
            update_doc["name"] = instructor_data.name
        if instructor_data.email is not None:
            # Check if email already exists (for other users)
            existing_user = user_collection.find_one({
                "email": instructor_data.email,
                "_id": {"$ne": ObjectId(instructor_id)}
            })
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already exists")
            update_doc["email"] = instructor_data.email
        if instructor_data.phone is not None:
            update_doc["phone"] = instructor_data.phone
        if instructor_data.department is not None:
            update_doc["department"] = instructor_data.department
        if instructor_data.specialization is not None:
            update_doc["specialization"] = instructor_data.specialization
        if instructor_data.qualification is not None:
            update_doc["qualification"] = instructor_data.qualification
        if instructor_data.experience is not None:
            update_doc["experience"] = instructor_data.experience
        if instructor_data.basicSalary is not None:
            update_doc["basicSalary"] = instructor_data.basicSalary
        if instructor_data.status is not None:
            update_doc["status"] = instructor_data.status
        
        # Update instructor
        result = user_collection.update_one(
            {"_id": ObjectId(instructor_id)},
            {"$set": update_doc}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Instructor not found")
        
        # Get updated instructor
        updated_instructor = user_collection.find_one({"_id": ObjectId(instructor_id)})
        
        # Get course count
        courses_count = course_collection.count_documents({
            "$or": [
                {"instructor": instructor_id},
                {"instructor_id": instructor_id},
                {"created_by": instructor_id}
            ]
        })
        
        # Get sample courses
        sample_courses = list(course_collection.find({
            "$or": [
                {"instructor": instructor_id},
                {"instructor_id": instructor_id},
                {"created_by": instructor_id}
            ]
        }).limit(3))
        
        courses_list = [{
            "id": str(course["_id"]),
            "title": course.get("title", course.get("course_name", ""))
        } for course in sample_courses]
        
        # Safely convert basicSalary to float
        basic_salary_raw = updated_instructor.get("basicSalary", 0)
        try:
            basic_salary = float(basic_salary_raw) if basic_salary_raw else 0.0
        except (TypeError, ValueError):
            basic_salary = 0.0
        
        logger.info(f"[UPDATE INSTRUCTOR] Successfully updated instructor: {instructor_id}")
        
        return {
            "id": instructor_id,
            "name": updated_instructor.get("name", ""),
            "email": updated_instructor.get("email", ""),
            "phone": updated_instructor.get("phone", "") or "",
            "department": updated_instructor.get("department", "") or "",
            "specialization": updated_instructor.get("specialization", "") or "",
            "qualification": updated_instructor.get("qualification", "") or "",
            "experience": updated_instructor.get("experience", "") or "",
            "basicSalary": basic_salary,
            "courses_count": courses_count,
            "courses": courses_list,
            "status": updated_instructor.get("status", "active") or "active",
            "created_at": str(updated_instructor.get("created_at", "")) if updated_instructor.get("created_at") else "",
            "franchise_code": str(updated_instructor.get("franchise_code", "")) if updated_instructor.get("franchise_code") else "",
            "branch_code": str(updated_instructor.get("branch_code", "")) if updated_instructor.get("branch_code") else ""
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating instructor: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update instructor: {str(e)}")

# Delete instructor endpoint
@instructor_router.delete("/instructors/{instructor_id}")
async def delete_instructor(
    request: Request,
    instructor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Permanently delete an instructor from the database"""
    try:
        logger.info(f"[DELETE INSTRUCTOR] Request to delete instructor: {instructor_id}")
        logger.info(f"[DELETE INSTRUCTOR] Current user: {current_user.get('email')}")
        
        db = request.app.mongodb
        user_collection = get_user_collection(db)
        
        # Get branch context for proper filtering
        branch_code = current_user.get("branch_code")
        franchise_code = current_user.get("franchise_code")
        
        logger.info(f"[DELETE INSTRUCTOR] branch_code: {branch_code}, franchise_code: {franchise_code}")
        
        # Build query - first just find by ID and role
        query = {
            "_id": ObjectId(instructor_id),
            "role": "instructor"
        }
        
        # First check if instructor exists without strict filtering
        existing_instructor = user_collection.find_one(query)
        
        if not existing_instructor:
            logger.warning(f"[DELETE INSTRUCTOR] Instructor not found with ID: {instructor_id}")
            raise HTTPException(status_code=404, detail="Instructor not found")
        
        logger.info(f"[DELETE INSTRUCTOR] Found instructor: {existing_instructor.get('name')}, branch_code: {existing_instructor.get('branch_code')}, franchise_code: {existing_instructor.get('franchise_code')}")
        
        # Verify the instructor belongs to the current user's franchise/branch
        instructor_franchise = existing_instructor.get("franchise_code")
        instructor_branch = existing_instructor.get("branch_code")
        
        # Allow deletion if:
        # 1. Franchise codes match, OR
        # 2. The branch_code in token matches instructor's franchise_code (for branch admins whose branch_code is actually franchise_code), OR
        # 3. The branch_code matches
        if not (
            franchise_code == instructor_franchise or 
            branch_code == instructor_franchise or
            branch_code == instructor_branch
        ):
            logger.warning(f"[DELETE INSTRUCTOR] Access denied - instructor doesn't belong to user's branch/franchise")
            raise HTTPException(status_code=403, detail="You don't have permission to delete this instructor")
        
        # Permanently delete the instructor from database
        result = user_collection.delete_one({"_id": ObjectId(instructor_id)})
        
        if result.deleted_count == 0:
            logger.warning(f"[DELETE INSTRUCTOR] Failed to delete instructor: {instructor_id}")
            raise HTTPException(status_code=500, detail="Failed to delete instructor")
        
        logger.info(f"[DELETE INSTRUCTOR] Successfully deleted instructor: {instructor_id} from database")
        return {"success": True, "message": "Instructor deleted successfully from database"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting instructor: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete instructor: {str(e)}")

# Enhanced instructor creation endpoint
@instructor_router.post("/create", response_model=InstructorResponse)
def create_instructor(
    request: Request,
    instructor_data: InstructorCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new instructor (for branch/admin use)"""
    try:
        logger.info(f"[CREATE INSTRUCTOR] Request received with data: {instructor_data.dict()}")
        logger.info(f"[CREATE INSTRUCTOR] Current user: {current_user}")
        
        db = request.app.mongodb
        user_collection = get_user_collection(db)
        
        # Check if email already exists
        existing_user = user_collection.find_one({"email": instructor_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Get franchise context from current user and fetch proper branch_code from branches collection
        franchise_code = current_user.get("franchise_code") or instructor_data.franchise_code
        current_branch_code = current_user.get("branch_code")
        provided_branch_code = instructor_data.branch_code
        
        # Fetch actual branch_code from branches collection if not available
        if not current_branch_code or current_branch_code == franchise_code:
            try:
                branches_collection = db["branches"]
                # Look for user's branch in branches collection
                user_id = current_user.get("user_id", current_user.get("_id"))
                branch_query = {
                    "$or": [
                        {"admin_id": user_id},
                        {"created_by": user_id},
                        {"franchise_code": franchise_code}
                    ]
                }
                user_branch = branches_collection.find_one(branch_query)
                if user_branch:
                    current_branch_code = user_branch.get("branch_code") or str(user_branch.get("_id"))
            except Exception as e:
                pass

        
        # Set proper branch_code based on creator's role
        user_role = current_user.get("role")
        is_branch_admin = current_user.get("is_branch_admin", False)
        
        if is_branch_admin or user_role == "branch_admin":
            # Branch admin creating instructor - use fetched branch_code
            if current_branch_code and current_branch_code != franchise_code:
                branch_code = current_branch_code
            else:
                # If still no separate branch, use franchise as branch context
                branch_code = franchise_code
        elif user_role == "franchise_admin":
            # Franchise admin can specify branch or leave as franchise level
            if provided_branch_code and provided_branch_code != franchise_code:
                branch_code = provided_branch_code
            else:
                branch_code = franchise_code
        else:
            # Admin or other roles
            branch_code = provided_branch_code or current_branch_code
        
        # Hash password
        password_bytes = instructor_data.password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
        
        # Generate employee code
        # Format: BR-{branch_code}-INS-{sequential_number}
        existing_instructors = user_collection.count_documents({
            "role": "instructor",
            "branch_code": branch_code
        })
        employee_number = str(existing_instructors + 1).zfill(4)
        branch_short = branch_code.replace("-", "")[:6].upper() if branch_code else "MAIN"
        employee_code = f"BR-{branch_short}-INS-{employee_number}"
        
        # Create instructor document
        instructor_doc = {
            "_id": ObjectId(),
            "employee_code": employee_code,
            "name": instructor_data.name,
            "email": instructor_data.email,
            "phone": instructor_data.phone or "",
            "password_hash": hashed_password,
            "role": "instructor",
            "department": instructor_data.department or "",
            "specialization": instructor_data.specialization or "",
            "qualification": instructor_data.qualification or "",
            "experience": instructor_data.experience or "",
            "basicSalary": instructor_data.basicSalary or 0.0,
            "status": instructor_data.status,
            "franchise_code": franchise_code,
            "branch_code": branch_code,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "created_by": current_user.get("user_id", str(current_user.get("_id", "")))
        }
        
        # Insert instructor
        result = user_collection.insert_one(instructor_doc)
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to create instructor")
        
        # Return response
        return InstructorResponse(
            id=str(result.inserted_id),
            employee_code=employee_code,
            name=instructor_data.name,
            email=instructor_data.email,
            phone=instructor_data.phone,
            department=instructor_data.department,
            specialization=instructor_data.specialization,
            qualification=instructor_data.qualification,
            experience=instructor_data.experience,
            basicSalary=instructor_data.basicSalary,
            courses_count=0,
            courses=[],
            status=instructor_data.status,
            created_at=instructor_doc["created_at"],
            franchise_code=franchise_code,
            branch_code=branch_code
        )
        
    except HTTPException as he:
        logger.error(f"[CREATE INSTRUCTOR] HTTPException: {he.status_code} - {he.detail}")
        raise
    except Exception as e:
        logger.error(f"[CREATE INSTRUCTOR] Error creating instructor: {str(e)}")
        logger.exception(e)  # This will log the full traceback
        raise HTTPException(status_code=500, detail=f"Failed to create instructor: {str(e)}")
def require_instructor(user=Depends(get_current_user)):
    if user["role"] != "instructor":
        raise HTTPException(status_code=403, detail="Instructor access required")
    return user

# Debug endpoint to see database state

# Get instructor dashboard stats
@instructor_router.get("/dashboard")
def get_instructor_dashboard(request: Request, user=Depends(require_instructor)):
    try:
        db = request.app.mongodb
        from app.models.course import get_course_collection
        from app.models.user import get_user_collection
        from app.models.submission import get_submission_collection
        from app.models.attempt import get_attempt_collection
        from app.models.assignment import get_assignment_collection
        from app.models.quiz import get_quiz_collection
        from app.models.certificate import get_certificate_collection
        from bson import ObjectId
        
        course_collection = get_course_collection(db)
        user_collection = get_user_collection(db)
        submission_collection = get_submission_collection(db)
        attempt_collection = get_attempt_collection(db)
        assignment_collection = get_assignment_collection(db)
        quiz_collection = get_quiz_collection(db)
        certificate_collection = get_certificate_collection(db)
        
        instructor_id = user["user_id"]
        
        # Get real stats from database
        # 1. Courses taught by this instructor - use multiple query strategies
        print(f"DEBUG: Looking for courses for instructor: {instructor_id}")
        
        # Try multiple ways to match instructor
        instructor_queries = [
            {"instructor": instructor_id},  # Exact match
            {"instructor": str(instructor_id)},  # String match
            {"created_by": instructor_id},  # Created by match
            {"instructor_name": user.get("name", "")},  # Name match
            {"instructor": f"instructor_{instructor_id}"},  # Prefixed match
        ]
        
        all_courses = []
        for query in instructor_queries:
            courses = list(course_collection.find(query))

            for course in courses:
                if course not in all_courses:
                    all_courses.append(course)
        
        # Remove duplicates
        unique_courses = []
        seen_ids = set()
        for course in all_courses:
            course_id = str(course["_id"])
            if course_id not in seen_ids:
                unique_courses.append(course)
                seen_ids.add(course_id)
        
        course_ids = [str(course["_id"]) for course in instructor_courses]


        
        assignments_created = 0
        if course_ids:
            assignments_created = assignment_collection.count_documents({"course_id": {"$in": course_ids}})
        
        # 3. Students enrolled - check enrollments collection directly
        from app.models.enrollment import get_enrollment_collection
        enrollment_collection = get_enrollment_collection(db)
        
        students_enrolled = 0
        enrolled_student_ids = set()
        
        if course_ids:
            
            # Query enrollments collection directly
            enrollments = list(enrollment_collection.find({"course_id": {"$in": course_ids}}))

            
            # Get unique student IDs from enrollments
            for enrollment in enrollments:
                enrolled_student_ids.add(enrollment["student_id"])
            
            quiz_ids = [str(quiz["_id"]) for quiz in quiz_collection.find({"course_id": {"$in": course_ids}})]


            
            # Get unique student IDs from submissions and attempts (active students)
            if assignment_ids:
                submissions = submission_collection.find({"assignment_id": {"$in": assignment_ids}})
                for submission in submissions:
                    enrolled_student_ids.add(submission["student_id"])
            
            if quiz_ids:
                attempts = attempt_collection.find({"quiz_id": {"$in": quiz_ids}})
                for attempt in attempts:
                    enrolled_student_ids.add(attempt["student_id"])
            
            students_enrolled = len(enrolled_student_ids)

        
        # 3.1 Get recent students (last 5 enrolled students)
        recent_students = []
        if enrolled_student_ids:
            recent_student_ids = list(enrolled_student_ids)[-5:]  # Last 5 students
            for student_id in recent_student_ids:
                try:
                    student = user_collection.find_one({"_id": ObjectId(student_id)})
                    if student:
                        recent_students.append({
                            "id": str(student["_id"]),
                            "name": student.get("name", "Unknown Student"),
                            "email": student.get("email", ""),
                            "enrolled_date": "2024-01-15"  # TODO: Get from enrollment date
                        })
                except Exception as e:
                    print(f"Error fetching student {student_id}: {str(e)}")
                    continue
        
        # 4. Live classes hosted (placeholder - you can implement this based on your live class system)
        live_classes_hosted = 0  # TODO: Implement when live class system is ready
        
        # 5. Certificates issued by this instructor
        certificates_issued = 0
        if course_ids:
            # Count certificates for students in instructor's courses
            # Assuming certificates have course_id field
            certificates_issued = certificate_collection.count_documents({"course_id": {"$in": course_ids}})
        
        stats = {
            "courses_taught": courses_taught,
            "assignments_created": assignments_created,
            "students_enrolled": students_enrolled,
            "live_classes_hosted": live_classes_hosted,
            "certificates_issued": certificates_issued,
            "total_earnings": 50000,  # TODO: Implement earnings system
            "pending_withdrawals": 2500  # TODO: Implement withdrawal system
        }
        
        print(f"DEBUG: Dashboard stats for instructor {instructor_id}: {stats}")
        print(f"DEBUG: Recent students: {recent_students}")
        
        return {
            "stats": stats, 
            "instructor": user,
            "recent_students": recent_students
        }
    except Exception as e:
        print(f"Error in get_instructor_dashboard: {str(e)}")
        # Fallback to mock data if there's an error
        stats = {
            "courses_taught": 0,
            "assignments_created": 0,
            "students_enrolled": 0,
            "live_classes_hosted": 0,
            "certificates_issued": 0,
            "total_earnings": 0,
            "pending_withdrawals": 0
        }
        return {"stats": stats, "instructor": user}

# Get courses created by the current instructor with improved matching
@instructor_router.get("/my-courses")
def get_my_instructor_courses(request: Request, user=Depends(require_instructor)):
    try:
        db = request.app.mongodb
        from app.models.course import get_course_collection
        from app.utils.serializers import serialize_document
        
        course_collection = get_course_collection(db)
        instructor_id = user["user_id"]
        
        print(f"DEBUG: Looking for courses for instructor: {instructor_id}")
        
        # Try multiple ways to match instructor
        instructor_queries = [
            {"instructor": instructor_id},  # Exact match
            {"instructor": str(instructor_id)},  # String match
            {"created_by": instructor_id},  # Created by match
            {"instructor_name": user.get("name", "")},  # Name match
            {"instructor": f"instructor_{instructor_id}"},  # Prefixed match
        ]
        
        all_courses = []
        
        for query in instructor_queries:
            courses = list(course_collection.find(query))
            print(f"DEBUG: Query {query} found {len(courses)} courses")
            for course in courses:
                if course not in all_courses:
                    all_courses.append(course)
        
        # Remove duplicates
        unique_courses = []
        seen_ids = set()
        for course in all_courses:
            course_id = str(course["_id"])
            if course_id not in seen_ids:
                unique_courses.append(course)
                seen_ids.add(course_id)
        
        print(f"DEBUG: Total unique courses found: {len(unique_courses)}")
        
        # Serialize the courses
        serialized_courses = [serialize_document(course) for course in unique_courses]
        
        # Return in the format expected by frontend
        return {
            "success": True,
            "data": {
                "total_courses": len(unique_courses),
                "courses": serialized_courses
            }
        }
        
    except Exception as e:
        print(f"Error in get_my_instructor_courses: {str(e)}")
        return {
            "success": False,
            "data": {
                "total_courses": 0,
                "courses": []
            }
        } 
@instructor_router.get("/courses")
def get_instructor_courses(request: Request, user=Depends(require_instructor)):
    db = request.app.mongodb
    from app.models.course import get_course_collection
    from app.utils.serializers import serialize_document
    
    course_collection = get_course_collection(db)
    instructor_id = user["user_id"]
    
    # Get branch filter for multi-tenancy
    current_user = getattr(request.state, 'user', None)
    # Fixed BranchAccessManager usage
    access_manager = BranchAccessManager(current_user) if current_user else BranchAccessManager({})
    branch_filter = access_manager.get_filter_query()
    
    print(f"DEBUG: Original courses endpoint - looking for instructor: {instructor_id}")
    
    # Build query with branch filtering and instructor filter
    instructor_query = {
        "$or": [
            {"instructor": instructor_id},
            {"instructor": str(instructor_id)},
            {"created_by": instructor_id}
        ]
    }
    
    # Combine branch filter with instructor filter
    if branch_filter:
        query = {"$and": [branch_filter, instructor_query]}
    else:
        query = instructor_query
    
    # Get courses with franchise filtering
    courses = list(course_collection.find(query))
    
    print(f"DEBUG: Found {len(courses)} courses for instructor")
    
    # Serialize the courses
    serialized_courses = [serialize_document(course) for course in courses]
    
    # Return in the format expected by frontend with total count
    return {
        "success": True,
        "data": {
            "total_courses": len(courses),
            "courses": serialized_courses
        }
    }

# Get all enrollments to debug student data
@instructor_router.get("/enrollments/all")
def get_all_enrollments(request: Request, user=Depends(require_instructor)):
    try:
        db = request.app.mongodb
        from app.models.enrollment import get_enrollment_collection
        from app.utils.serializers import serialize_document
        
        enrollment_collection = get_enrollment_collection(db)
        
        # Get all enrollments to debug
        all_enrollments = list(enrollment_collection.find({}))
        print(f"DEBUG: Total enrollments in collection: {len(all_enrollments)}")
        
        # Serialize enrollments
        serialized_enrollments = [serialize_document(enrollment) for enrollment in all_enrollments]
        
        return {
            "success": True,
            "data": {
                "total_enrollments": len(serialized_enrollments),
                "enrollments": serialized_enrollments
            }
        }
        
    except Exception as e:
        print(f"Error in get_all_enrollments: {str(e)}")
        return {
            "success": False,
            "data": {
                "total_enrollments": 0,
                "enrollments": []
            }
        }
            
    except Exception as e:
        print(f"Error creating schedule: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create schedule")

# Get schedules created by the current instructor
@instructor_router.get("/schedules")
def get_instructor_schedules(request: Request, user=Depends(require_instructor)):
    try:
        db = request.app.mongodb
        from app.models.course import get_course_collection
        from app.utils.serializers import serialize_document
        
        course_collection = get_course_collection(db)
        schedule_collection = db["schedules"]
        
        # Get all schedules for this instructor
        schedules = list(schedule_collection.find({"instructor_id": user["user_id"]}))
        
        # Enhance with course information
        enhanced_schedules = []
        for schedule in schedules:
            course = course_collection.find_one({"_id": ObjectId(schedule["course_id"])})
            schedule_dict = serialize_document(schedule)
            schedule_dict["course_name"] = course.get("title", "Unknown Course") if course else "Unknown Course"
            enhanced_schedules.append(schedule_dict)
        
        return enhanced_schedules
        
    except Exception as e:
        print(f"Error getting schedules: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch schedules")

# Delete a schedule created by the current instructor
@instructor_router.delete("/schedules/{schedule_id}")
def delete_instructor_schedule(request: Request, schedule_id: str, user=Depends(require_instructor)):
    try:
        db = request.app.mongodb
        schedule_collection = db["schedules"]
        
        # Verify the schedule exists and belongs to this instructor
        schedule = schedule_collection.find_one({
            "_id": ObjectId(schedule_id),
            "instructor_id": user["user_id"]
        })
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found or access denied")
        
        # Delete the schedule
        result = schedule_collection.delete_one({
            "_id": ObjectId(schedule_id),
            "instructor_id": user["user_id"]
        })
        
        if result.deleted_count == 1:
            return {"success": True, "message": "Schedule deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete schedule")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting schedule: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete schedule")

# Get students enrolled in instructor's courses with their progress
@instructor_router.get("/students")
def get_instructor_students(request: Request, user=Depends(require_instructor)):
    try:
        db = request.app.mongodb
        from app.models.course import get_course_collection
        from app.models.user import get_user_collection
        from app.models.submission import get_submission_collection
        from app.models.attempt import get_attempt_collection
        from app.models.assignment import get_assignment_collection
        from app.models.quiz import get_quiz_collection
        from app.models.enrollment import get_enrollment_collection
        from app.utils.serializers import serialize_document
        from bson import ObjectId
        
        course_collection = get_course_collection(db)
        user_collection = get_user_collection(db)
        submission_collection = get_submission_collection(db)
        attempt_collection = get_attempt_collection(db)
        assignment_collection = get_assignment_collection(db)
        quiz_collection = get_quiz_collection(db)
        enrollment_collection = get_enrollment_collection(db)
        
        print(f"DEBUG: Looking for courses by instructor: {user['user_id']}")
        
        # Get all courses taught by this instructor - use multiple query strategies
        instructor_id = user["user_id"]
        instructor_queries = [
            {"instructor": instructor_id},  # Exact match
            {"instructor": str(instructor_id)},  # String match
            {"created_by": instructor_id},  # Created by match
            {"instructor_name": user.get("name", "")},  # Name match
            {"instructor": f"instructor_{instructor_id}"},  # Prefixed match
        ]
        
        all_courses = []
        for query in instructor_queries:
            courses = list(course_collection.find(query))
            print(f"DEBUG: Query {query} found {len(courses)} courses")
            for course in courses:
                if course not in all_courses:
                    all_courses.append(course)
        
        # Remove duplicates
        unique_courses = []
        seen_ids = set()
        for course in all_courses:
            course_id = str(course["_id"])
            if course_id not in seen_ids:
                unique_courses.append(course)
                seen_ids.add(course_id)
        
        instructor_courses = unique_courses
        course_ids = [str(course["_id"]) for course in instructor_courses]
        
        print(f"DEBUG: Found {len(instructor_courses)} courses: {course_ids}")
        
        if not course_ids:
            print("DEBUG: No courses found for instructor")
            return []
        
        # Get enrolled students for instructor's courses from enrollment collection
        enrolled_student_emails = set()
        
        # Create both string and ObjectId versions of course IDs for query
        course_ids_obj = []
        for course_id in course_ids:
            course_ids_obj.append(ObjectId(course_id))
        
        # Query enrollments with both string and ObjectId course_ids
        enrollments = list(enrollment_collection.find({
            "$or": [
                {"course_id": {"$in": course_ids}},
                {"course_id": {"$in": course_ids_obj}}
            ]
        }))
        print(f"DEBUG: Found {len(enrollments)} enrollments for instructor's courses")
        
        # Debug: Print sample enrollment to see structure
        if enrollments:
            print(f"DEBUG: Sample enrollment structure: {enrollments[0]}")
        
        for enrollment in enrollments:
            # Handle different field names for student identification
            student_email = enrollment.get("student_email")
            if student_email:
                enrolled_student_emails.add(student_email)
        
        print(f"DEBUG: Found {len(enrolled_student_emails)} unique enrolled student emails: {enrolled_student_emails}")
        
        if not enrolled_student_emails:
            print("DEBUG: No enrolled students found for instructor's courses")
            return []
        
        # Get all assignments and quizzes for instructor's courses
        assignments = list(assignment_collection.find({"course_id": {"$in": course_ids}}))
        quizzes = list(quiz_collection.find({"course_id": {"$in": course_ids}}))
        
        print(f"DEBUG: Found {len(assignments)} assignments and {len(quizzes)} quizzes")
        
        # Get all submissions and attempts for these assignments/quizzes
        assignment_ids = [str(assignment["_id"]) for assignment in assignments]
        quiz_ids = [str(quiz["_id"]) for quiz in quizzes]
        
        submissions = []
        attempts = []
        
        if assignment_ids:
            submissions = list(submission_collection.find({"assignment_id": {"$in": assignment_ids}}))
        if quiz_ids:
            attempts = list(attempt_collection.find({"quiz_id": {"$in": quiz_ids}}))
        
        print(f"DEBUG: Found {len(submissions)} submissions and {len(attempts)} attempts")
        
        # Process only enrolled students
        students_data = []
        for student_email in enrolled_student_emails:
            try:
                print(f"DEBUG: Looking for student with email: {student_email}")
                
                # Find student by email instead of ID
                student = user_collection.find_one({"email": student_email, "role": "student"})
                print(f"DEBUG: Found student: {student is not None}")
                
                if student:
                    student_id = str(student["_id"])
                    print(f"DEBUG: Student ID: {student_id}")
                    
                    # Find which courses this student is enrolled in (from instructor's courses)
                    student_enrollments = [e for e in enrollments if e.get("student_email") == student_email]
                    print(f"DEBUG: Student enrollments count: {len(student_enrollments)}")
                    
                    # Get all student's submissions and attempts (these use student_id)
                    student_submissions = [s for s in submissions if s.get("student_id") == student_id]
                    student_attempts = [a for a in attempts if a.get("student_id") == student_id]
                    
                    # Process each enrollment separately (one record per course)
                    for enrollment in student_enrollments:
                        course_id = enrollment["course_id"]
                        # Handle ObjectId conversion if needed
                        if hasattr(course_id, '__str__'):
                            course_id = str(course_id)
                        
                        course = next((c for c in instructor_courses if str(c["_id"]) == course_id), None)
                        print(f"DEBUG: Processing course_id: {course_id}, found course: {course is not None}")
                        
                        if course:
                            # Calculate progress for this specific course
                            total_assignments_in_course = len([a for a in assignments if a["course_id"] == course_id])
                            total_quizzes_in_course = len([q for q in quizzes if q["course_id"] == course_id])
                            
                            # Count completed assignments and quizzes for this course
                            completed_assignments = len([s for s in student_submissions 
                                                       if any(a["course_id"] == course_id 
                                                             for a in assignments 
                                                             if str(a["_id"]) == s["assignment_id"])])
                            completed_quizzes = len([a for a in student_attempts 
                                                   if any(q["course_id"] == course_id 
                                                         for q in quizzes 
                                                         if str(q["_id"]) == a["quiz_id"])])
                            
                            total_items = total_assignments_in_course + total_quizzes_in_course
                            completed_items = completed_assignments + completed_quizzes
                            
                            # Determine completion status
                            if total_items == 0:
                                completion_status = "Not Started"
                            elif completed_items == total_items:
                                completion_status = "Completed"
                            elif completed_items > 0:
                                completion_status = "In Progress"
                            else:
                                completion_status = "Not Started"
                            
                            student_data = {
                                "student_id": student_id,
                                "name": student.get("name", enrollment.get("student_name", "Unknown Student")),
                                "email": student.get("email", enrollment.get("student_email", "")),
                                "avatar": student.get("avatar") or student.get("profile_picture"),
                                "course_name": course.get("title", enrollment.get("course_name", "Unknown Course")),
                                "course_id": course_id,
                                "completion_status": completion_status,
                                "total_assignments": total_assignments_in_course,
                                "completed_assignments": completed_assignments,
                                "total_quizzes": total_quizzes_in_course,
                                "completed_quizzes": completed_quizzes,
                                "enrolled_date": enrollment.get("enrollment_date", enrollment.get("enrolled_at", "")),
                                "payment_status": enrollment.get("payment_status", "pending")
                            }
                            students_data.append(student_data)
                            print(f"DEBUG: Added student to list: {student_data['name']} for course {student_data['course_name']}")
                        else:
                            print(f"DEBUG: Course not found for course_id: {course_id}")
                else:
                    print(f"DEBUG: No student found in users collection with email: {student_email}")
                    # Let's also check if student exists without role filter
                    any_user = user_collection.find_one({"email": student_email})
                    if any_user:
                        print(f"DEBUG: Found user with email but role is: {any_user.get('role', 'no role')}")
                    else:
                        print(f"DEBUG: No user at all with email: {student_email}")
            except Exception as e:
                print(f"Error processing student {student_email}: {str(e)}")
                continue  # Skip invalid students
        
        print(f"DEBUG: Final students_data count: {len(students_data)}")
        return students_data
    except Exception as e:
        print(f"Error in get_instructor_students: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch student data")

# Get assignments and quizzes that need evaluation
@instructor_router.get("/evaluations")
def get_instructor_evaluations(request: Request, user=Depends(require_instructor)):
    try:
        db = request.app.mongodb
        from app.models.course import get_course_collection
        from app.models.submission import get_submission_collection
        from app.models.attempt import get_attempt_collection
        from app.models.assignment import get_assignment_collection
        from app.models.quiz import get_quiz_collection
        from app.utils.serializers import serialize_document
        from bson import ObjectId
        
        course_collection = get_course_collection(db)
        submission_collection = get_submission_collection(db)
        attempt_collection = get_attempt_collection(db)
        assignment_collection = get_assignment_collection(db)
        quiz_collection = get_quiz_collection(db)
        
        instructor_id = user["user_id"]
        
        # Get all courses taught by this instructor
        instructor_courses = list(course_collection.find({"instructor": instructor_id}))
        course_ids = [str(course["_id"]) for course in instructor_courses]
        
        if not course_ids:
            return []
        
        evaluations = []
        
        # Get assignments that need evaluation (submissions without grades)
        assignments = list(assignment_collection.find({"course_id": {"$in": course_ids}}))
        assignment_ids = [str(assignment["_id"]) for assignment in assignments]
        
        if assignment_ids:
            # Find submissions that don't have grades yet
            pending_submissions = list(submission_collection.find({
                "assignment_id": {"$in": assignment_ids},
                "$or": [
                    {"grade": {"$exists": False}},
                    {"grade": None},
                    {"grade": ""}
                ]
            }))
            
            # Group submissions by assignment
            assignment_submission_counts = {}
            for submission in pending_submissions:
                assignment_id = submission["assignment_id"]
                if assignment_id not in assignment_submission_counts:
                    assignment_submission_counts[assignment_id] = 0
                assignment_submission_counts[assignment_id] += 1
            
            # Add assignments with pending submissions to evaluations
            for assignment_id, count in assignment_submission_counts.items():
                assignment = next((a for a in assignments if str(a["_id"]) == assignment_id), None)
                if assignment:
                    course = next((c for c in instructor_courses if str(c["_id"]) == assignment["course_id"]), None)
                    evaluations.append({
                        "id": assignment_id,
                        "title": assignment.get("title", "Untitled Assignment"),
                        "type": "assignment",
                        "course_name": course.get("title", "Unknown Course") if course else "Unknown Course",
                        "pending_count": count,
                        "status": "pending",
                        "due_date": assignment.get("due_date"),
                        "created_at": assignment.get("created_at")
                    })
        
        # Get quizzes that need evaluation (attempts that might need manual review)
        quizzes = list(quiz_collection.find({"course_id": {"$in": course_ids}}))
        quiz_ids = [str(quiz["_id"]) for quiz in quizzes]
        
        if quiz_ids:
            # Find quiz attempts (for now, let's show all recent attempts)
            recent_attempts = list(attempt_collection.find({
                "quiz_id": {"$in": quiz_ids}
            }).sort("attempted_at", -1).limit(20))  # Get 20 most recent attempts
            
            # Group attempts by quiz
            quiz_attempt_counts = {}
            for attempt in recent_attempts:
                quiz_id = attempt["quiz_id"]
                if quiz_id not in quiz_attempt_counts:
                    quiz_attempt_counts[quiz_id] = 0
                quiz_attempt_counts[quiz_id] += 1
            
            # Add quizzes with recent attempts to evaluations
            for quiz_id, count in quiz_attempt_counts.items():
                quiz = next((q for q in quizzes if str(q["_id"]) == quiz_id), None)
                if quiz:
                    course = next((c for c in instructor_courses if str(c["_id"]) == quiz["course_id"]), None)
                    evaluations.append({
                        "id": quiz_id,
                        "title": quiz.get("title", "Untitled Quiz"),
                        "type": "quiz",
                        "course_name": course.get("title", "Unknown Course") if course else "Unknown Course",
                        "pending_count": count,
                        "status": "completed",  # Quizzes are usually auto-graded
                        "created_at": quiz.get("created_at")
                    })
        
        # Sort by created_at (most recent first)
        evaluations.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        print(f"DEBUG: Found {len(evaluations)} evaluations for instructor {instructor_id}")
        
        return evaluations
    except Exception as e:
        print(f"Error in get_instructor_evaluations: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch evaluation data")

# Get detailed progress for a specific student
@instructor_router.get("/students/{student_id}/progress")
def get_student_progress_details(request: Request, student_id: str, user=Depends(require_instructor)):
    """Get detailed progress information for a specific student"""
    try:
        db = request.app.mongodb
        from app.models.course import get_course_collection
        from app.models.user import get_user_collection
        from app.models.submission import get_submission_collection
        from app.models.attempt import get_attempt_collection
        from app.models.assignment import get_assignment_collection
        from app.models.quiz import get_quiz_collection
        from app.utils.serializers import serialize_document
        from bson import ObjectId
        
        instructor_id = user["user_id"]
        
        # Get collections
        course_collection = get_course_collection(db)
        user_collection = get_user_collection(db)
        submission_collection = get_submission_collection(db)
        attempt_collection = get_attempt_collection(db)
        assignment_collection = get_assignment_collection(db)
        quiz_collection = get_quiz_collection(db)
        
        # Get student details
        student = user_collection.find_one({"_id": ObjectId(student_id)})
        if not student or student.get("role") != "student":
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Get instructor's courses
        instructor_courses = list(course_collection.find({"instructor": instructor_id}))
        course_ids = [str(course["_id"]) for course in instructor_courses]
        
        if not course_ids:
            raise HTTPException(status_code=404, detail="No courses found for this instructor")
        
        # Get all assignments and quizzes for instructor's courses
        assignments = list(assignment_collection.find({"course_id": {"$in": course_ids}}))
        quizzes = list(quiz_collection.find({"course_id": {"$in": course_ids}}))
        
        assignment_ids = [str(assignment["_id"]) for assignment in assignments]
        quiz_ids = [str(quiz["_id"]) for quiz in quizzes]
        
        # Get student's submissions and attempts
        student_submissions = list(submission_collection.find({
            "student_id": student_id,
            "assignment_id": {"$in": assignment_ids}
        })) if assignment_ids else []
        
        student_attempts = list(attempt_collection.find({
            "student_id": student_id,
            "quiz_id": {"$in": quiz_ids}
        })) if quiz_ids else []
        
        # Build enrolled courses data
        enrolled_courses = []
        overall_stats = {
            "total_assignments": 0,
            "completed_assignments": 0,
            "total_quizzes": 0,
            "completed_quizzes": 0,
            "total_items": 0,
            "completed_items": 0
        }
        
        for course in instructor_courses:
            course_id = str(course["_id"])
            
            # Get assignments and quizzes for this course
            course_assignments = [a for a in assignments if a["course_id"] == course_id]
            course_quizzes = [q for q in quizzes if q["course_id"] == course_id]
            
            # Get student's completed assignments for this course
            completed_assignments = []
            for submission in student_submissions:
                assignment = next((a for a in course_assignments if str(a["_id"]) == submission["assignment_id"]), None)
                if assignment:
                    completed_assignments.append(submission)
            
            # Get student's completed quizzes for this course
            completed_quizzes = []
            for attempt in student_attempts:
                quiz = next((q for q in course_quizzes if str(q["_id"]) == attempt["quiz_id"]), None)
                if quiz:
                    completed_quizzes.append(attempt)
            
            total_assignments_in_course = len(course_assignments)
            completed_assignments_in_course = len(completed_assignments)
            total_quizzes_in_course = len(course_quizzes)
            completed_quizzes_in_course = len(completed_quizzes)
            
            total_items = total_assignments_in_course + total_quizzes_in_course
            completed_items = completed_assignments_in_course + completed_quizzes_in_course
            
            # Calculate progress percentage
            progress_percentage = (completed_items / total_items * 100) if total_items > 0 else 0
            
            enrolled_courses.append({
                "course_id": course_id,
                "course_name": course.get("title", "Untitled Course"),
                "course_image": course.get("thumbnail", course.get("coverImage", "")),
                "total_assignments": total_assignments_in_course,
                "completed_assignments": completed_assignments_in_course,
                "total_quizzes": total_quizzes_in_course,
                "completed_quizzes": completed_quizzes_in_course,
                "total_items": total_items,
                "completed_items": completed_items,
                "progress_percentage": round(progress_percentage, 2),
                "enrollment_date": course.get("created_at", "N/A")
            })
            
            # Update overall stats
            overall_stats["total_assignments"] += total_assignments_in_course
            overall_stats["completed_assignments"] += completed_assignments_in_course
            overall_stats["total_quizzes"] += total_quizzes_in_course
            overall_stats["completed_quizzes"] += completed_quizzes_in_course
            overall_stats["total_items"] += total_items
            overall_stats["completed_items"] += completed_items
        
        # Calculate overall progress
        overall_progress = (overall_stats["completed_items"] / overall_stats["total_items"] * 100) if overall_stats["total_items"] > 0 else 0
        
        # Build student details response
        student_details = {
            "student_id": student_id,
            "name": student.get("name", "Unknown Student"),
            "email": student.get("email", ""),
            "avatar": student.get("avatar", student.get("profilePicture", "")),
            "enrolled_courses": enrolled_courses,
            "total_courses": len(enrolled_courses),
            "overall_stats": {
                "total_assignments": overall_stats["total_assignments"],
                "completed_assignments": overall_stats["completed_assignments"],
                "remaining_assignments": overall_stats["total_assignments"] - overall_stats["completed_assignments"],
                "assignments_progress": round((overall_stats["completed_assignments"] / overall_stats["total_assignments"] * 100) if overall_stats["total_assignments"] > 0 else 0, 2),
                "total_quizzes": overall_stats["total_quizzes"],
                "completed_quizzes": overall_stats["completed_quizzes"],
                "remaining_quizzes": overall_stats["total_quizzes"] - overall_stats["completed_quizzes"],
                "quizzes_progress": round((overall_stats["completed_quizzes"] / overall_stats["total_quizzes"] * 100) if overall_stats["total_quizzes"] > 0 else 0, 2),
                "total_items": overall_stats["total_items"],
                "completed_items": overall_stats["completed_items"],
                "remaining_items": overall_stats["total_items"] - overall_stats["completed_items"],
                "overall_progress": round(overall_progress, 2)
            },
            "last_active": student.get("last_active", student.get("updated_at", "N/A"))
        }
        
        return {
            "success": True,
            "student": student_details
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_student_progress_details: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch student progress: {str(e)}")

# Get detailed students data for instructor dashboard
@instructor_router.get("/students/detailed")
def get_instructor_students_detailed(request: Request, user=Depends(require_instructor)):

    try:
        db = request.app.mongodb
        instructor_id = user["user_id"]
        
        from app.services.enrollment_service import get_instructor_students_detailed, get_instructor_courses_summary
        
        # Get detailed student data
        students = get_instructor_students_detailed(db, instructor_id)
        
        # Get courses for filtering
        courses = get_instructor_courses_summary(db, instructor_id)
        
        return {
            "students": students,
            "courses": courses,
            "total": len(students)
        }
        
    except Exception as e:
        print(f"Error in get_instructor_students_detailed: {str(e)}")
        return {"students": [], "courses": [], "total": 0, "error": str(e)}

# Alias endpoint for enrolled students (used by dashboardLoaderService)
@instructor_router.get("/enrolled-students")
def get_enrolled_students_alias(request: Request, user=Depends(require_instructor)):
    """Alias endpoint for getting enrolled students - calls the main students endpoint"""
    return get_instructor_students(request, user)

# ===================== DEPARTMENT MANAGEMENT ENDPOINTS =====================

@instructor_router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get departments based on user role and permissions"""
    try:
        db = request.app.mongodb
        departments_collection = get_department_collection(db, current_user)
        
        # Get user context
        user_role = current_user.get("role")
        branch_code = current_user.get("branch_code")
        franchise_code = current_user.get("franchise_code") or branch_code
        is_branch_admin = current_user.get("is_branch_admin", False)
        
        print(f"DEBUG: Department access - role: {user_role}, is_branch_admin: {is_branch_admin}, branch_code: {branch_code}, franchise_code: {franchise_code}")
        
        # Build query based on user's branch/franchise
        query = {}
        
        if user_role == "admin":
            # Super admin can see all departments
            query = {}
        elif user_role in ["branch_admin", "franchise_admin"] or is_branch_admin:
            # Filter by franchise_code or branch_code
            query = {
                "$or": [
                    {"franchise_code": franchise_code},
                    {"branch_code": branch_code},
                    {"franchise_code": branch_code},
                    {"branch_code": franchise_code}
                ]
            }
        elif user_role == "instructor":
            # Instructors can view their branch/franchise departments
            query = {
                "$or": [
                    {"franchise_code": franchise_code},
                    {"branch_code": branch_code}
                ]
            }
        else:
            # Other roles cannot access departments
            print(f"DEBUG: Role {user_role} denied access to departments")
            return []
        
        print(f"DEBUG: Final department query: {query}")
        departments = list(departments_collection.find(query).sort("created_at", -1))
        
        print(f"DEBUG: Found {len(departments)} departments in collection")
        
        departments_response = []
        for dept in departments:
            # Convert datetime to string for Pydantic validation
            created_at_str = None
            if dept.get("created_at"):
                created_at_str = dept["created_at"].isoformat() if hasattr(dept["created_at"], 'isoformat') else str(dept["created_at"])
            
            dept_response = DepartmentResponse(
                id=str(dept["_id"]),
                name=dept.get("name", ""),
                description=dept.get("description"),
                head=dept.get("head"),
                employees_count=dept.get("employees_count", 0),
                budget=dept.get("budget", 0.0),
                status=dept.get("status", "active"),
                created_at=created_at_str,
                franchise_code=dept.get("franchise_code"),
                branch_code=dept.get("branch_code")
            )
            departments_response.append(dept_response)
        
        return departments_response
        
    except Exception as e:
        print(f"Error fetching departments: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch departments: {str(e)}")

@instructor_router.post("/departments", response_model=DepartmentResponse)
def create_department(
    request: Request,
    department_data: DepartmentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new department (branch_admin and franchise_admin only)"""
    try:
        db = request.app.mongodb
        departments_collection = get_department_collection(db, current_user)
        
        # Check user permissions
        user_role = current_user.get("role")
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        franchise_code = current_user.get("franchise_code") or branch_code
        is_branch_admin = current_user.get("is_branch_admin", False)
        
        print(f"DEBUG: Create department - role: {user_role}, is_branch_admin: {is_branch_admin}, branch_code: {branch_code}, franchise_code: {franchise_code}")
        
        # Determine effective user type
        effective_role = "branch_admin" if (is_branch_admin or user_role == "branch_admin") else user_role
        
        # Only branch_admin, franchise_admin, and admin can create departments
        if effective_role not in ["branch_admin", "franchise_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions to create departments")
        
        # Check if department already exists for this branch/franchise
        existing_query = {
            "name": department_data.name,
            "$or": [
                {"franchise_code": franchise_code},
                {"branch_code": branch_code}
            ]
        }
        print(f"DEBUG: Checking existing department with query: {existing_query}")
        existing_department = departments_collection.find_one(existing_query)
        if existing_department:
            raise HTTPException(status_code=400, detail="Department with this name already exists")
        
        # Create department document with proper codes
        department_doc = {
            "name": department_data.name,
            "description": department_data.description,
            "head": department_data.head,
            "employees_count": department_data.employees_count,
            "budget": department_data.budget,
            "status": "active",
            "franchise_code": franchise_code,
            "branch_code": branch_code,
            "created_at": datetime.now().isoformat(),
            "created_by": current_user.get("user_id", current_user.get("_id"))
        }
        
        print(f"DEBUG: Creating department document: {department_doc}")
        result = departments_collection.insert_one(department_doc)
        
        # Get the created department
        created_department = departments_collection.find_one({"_id": result.inserted_id})
        
        # Convert datetime to string for Pydantic validation
        created_at_str = None
        if created_department.get("created_at"):
            created_at_str = created_department["created_at"].isoformat() if hasattr(created_department["created_at"], 'isoformat') else str(created_department["created_at"])
        
        return DepartmentResponse(
            id=str(created_department["_id"]),
            name=created_department["name"],
            description=created_department.get("description"),
            head=created_department.get("head"),
            employees_count=created_department.get("employees_count", 0),
            budget=created_department.get("budget", 0.0),
            status=created_department["status"],
            created_at=created_at_str,
            franchise_code=created_department.get("franchise_code"),
            branch_code=created_department.get("branch_code")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating department: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create department: {str(e)}")

@instructor_router.put("/departments/{department_id}", response_model=DepartmentResponse)
def update_department(
    request: Request,
    department_id: str,
    department_data: DepartmentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a department (with role-based access control)"""
    try:
        db = request.app.mongodb
        departments_collection = get_department_collection(db, current_user)
        
        # Check user permissions
        user_role = current_user.get("role")
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        franchise_code = current_user.get("franchise_code") or branch_code
        is_branch_admin = current_user.get("is_branch_admin", False)
        
        # Determine effective user type
        effective_role = "branch_admin" if (is_branch_admin or user_role == "branch_admin") else user_role
        
        # Only branch_admin, franchise_admin, and admin can update departments
        if effective_role not in ["branch_admin", "franchise_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions to update departments")
        
        # Query by ID and ensure it belongs to this branch/franchise
        query = {
            "_id": ObjectId(department_id),
            "$or": [
                {"franchise_code": franchise_code},
                {"branch_code": branch_code}
            ]
        }
        print(f"DEBUG: Update department query: {query}")
        
        # Check if department exists
        existing_department = departments_collection.find_one(query)
        
        if not existing_department:
            raise HTTPException(status_code=404, detail="Department not found")
        
        # Build update document
        update_doc = {}
        for field, value in department_data.dict(exclude_unset=True).items():
            if value is not None:
                update_doc[field] = value
        
        if update_doc:
            update_doc["updated_at"] = datetime.now().isoformat()
            departments_collection.update_one({"_id": ObjectId(department_id)}, {"$set": update_doc})
        
        # Get updated department
        updated_department = departments_collection.find_one({"_id": ObjectId(department_id)})
        
        # Convert datetime to string for Pydantic validation
        created_at_str = None
        if updated_department.get("created_at"):
            created_at_str = updated_department["created_at"].isoformat() if hasattr(updated_department["created_at"], 'isoformat') else str(updated_department["created_at"])
        
        return DepartmentResponse(
            id=str(updated_department["_id"]),
            name=updated_department["name"],
            description=updated_department.get("description"),
            head=updated_department.get("head"),
            employees_count=updated_department.get("employees_count", 0),
            budget=updated_department.get("budget", 0.0),
            status=updated_department["status"],
            created_at=created_at_str,
            franchise_code=updated_department.get("franchise_code"),
            branch_code=updated_department.get("branch_code")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating department: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update department: {str(e)}")

@instructor_router.delete("/departments/{department_id}")
def delete_department(
    request: Request,
    department_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a department (with role-based access control)"""
    try:
        db = request.app.mongodb
        departments_collection = get_department_collection(db, current_user)
        
        # Check user permissions
        user_role = current_user.get("role")
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        franchise_code = current_user.get("franchise_code") or branch_code
        is_branch_admin = current_user.get("is_branch_admin", False)
        
        # Determine effective user type
        effective_role = "branch_admin" if (is_branch_admin or user_role == "branch_admin") else user_role
        
        # Only branch_admin, franchise_admin, and admin can delete departments
        if effective_role not in ["branch_admin", "franchise_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions to delete departments")
        
        # Query by ID and ensure it belongs to this branch/franchise
        query = {
            "_id": ObjectId(department_id),
            "$or": [
                {"franchise_code": franchise_code},
                {"branch_code": branch_code}
            ]
        }
        print(f"DEBUG: Delete department query: {query}")
        
        # Check if department exists
        existing_department = departments_collection.find_one(query)
        
        if not existing_department:
            raise HTTPException(status_code=404, detail="Department not found")
        
        # Delete department
        result = departments_collection.delete_one({"_id": ObjectId(department_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Department not found or access denied")
        
        return {"success": True, "message": "Department deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting department: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete department: {str(e)}")

@instructor_router.patch("/departments/{department_id}/status")
async def toggle_department_status(
    request: Request,
    department_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Toggle department status between active and inactive"""
    try:
        db = request.app.mongodb
        departments_collection = get_department_collection(db, current_user)
        
        # Get branch context
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        franchise_code = current_user.get("franchise_code") or branch_code
        
        # Build query for multi-tenant filtering
        query = {
            "_id": ObjectId(department_id),
            "$or": [
                {"franchise_code": franchise_code},
                {"branch_code": branch_code}
            ]
        }
        
        # Check if department exists
        existing_department = departments_collection.find_one(query)
        if not existing_department:
            raise HTTPException(status_code=404, detail="Department not found")
        
        # Toggle status
        current_status = existing_department.get("status", "active")
        new_status = "inactive" if current_status == "active" else "active"
        
        departments_collection.update_one(
            query,
            {"$set": {"status": new_status, "updated_at": datetime.now().isoformat()}}
        )
        
        return {"success": True, "message": f"Department status updated to {new_status}"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error toggling department status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to toggle department status: {str(e)}")


