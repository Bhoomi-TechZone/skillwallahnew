from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
from datetime import datetime, date
from bson import ObjectId
from app.config import settings
from app.utils.auth_helpers_enhanced import get_current_user
from app.utils.multi_tenant import MultiTenantManager
from pydantic import BaseModel, Field, validator
import logging

# Get logger
logger = logging.getLogger("uvicorn")

router = APIRouter(prefix="/api/branch-batches", tags=["Branch Batch Management"])

async def require_branch_access(request: Request):
    """Dependency to require branch admin, admin, or franchise role for batch operations"""
    try:
        user = await get_current_user(request)
        user_role = user.get("role", "")
        is_branch_admin = user.get("is_branch_admin", False)
        
        # Allow admin, franchise, branch_admin roles, or users with is_branch_admin flag
        allowed_roles = ["admin", "franchise", "branch_admin"]
        
        if user_role not in allowed_roles and not is_branch_admin:
            print(f"[DEBUG] Batch access denied - Role: {user_role}, is_branch_admin: {is_branch_admin}")
            print(f"[DEBUG] User data: {user}")
            raise HTTPException(status_code=403, detail="User does not have batch management access")
        
        print(f"[DEBUG] Batch access granted - Role: {user_role}, is_branch_admin: {is_branch_admin}")
        return user
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions
        raise http_exc
    except Exception as e:
        print(f"[DEBUG] Authentication error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")



# Batch Models
class BatchCreate(BaseModel):
    batch_name: str
    batch_code: str
    program_id: Optional[str] = None
    course_id: Optional[str] = None
    subject_id: Optional[str] = None
    instructor_name: Optional[str] = ""
    instructor_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    timing: Optional[str] = ""  # e.g., "9:00 AM - 11:00 AM"
    days_of_week: Optional[str] = ""  # e.g., "Mon, Wed, Fri"
    max_capacity: int = 30
    current_enrollment: int = 0
    fee: Optional[float] = 0.0
    status: str = "active"  # active, inactive, completed, cancelled
    
    @validator('batch_code')
    def batch_code_must_be_uppercase(cls, v):
        return v.upper() if v else v

class BatchUpdate(BaseModel):
    batch_name: Optional[str] = None
    instructor_name: Optional[str] = None
    instructor_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    timing: Optional[str] = None
    days_of_week: Optional[str] = None
    max_capacity: Optional[int] = None
    fee: Optional[float] = None
    status: Optional[str] = None

class BatchResponse(BaseModel):
    id: str
    batch_name: str
    batch_code: str
    program_id: Optional[str] = None
    program_name: Optional[str] = None
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    subject_id: Optional[str] = None
    subject_name: Optional[str] = None
    instructor_name: Optional[str] = ""
    instructor_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    timing: Optional[str] = ""
    days_of_week: Optional[str] = ""
    max_capacity: int = 30
    current_enrollment: int = 0
    available_seats: int = 0
    fee: float = 0.0
    total_students: int = 0
    status: str = "active"
    branch_code: Optional[str] = None
    franchise_code: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

@router.post("/batches", response_model=BatchResponse)
async def create_batch(
    batch_data: BatchCreate,
    request: Request
):
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get current user
        current_user = await require_branch_access(request)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Check if batch code already exists in this branch
        existing_batch = db.branch_batches.find_one({
            "batch_code": batch_data.batch_code,
            "franchise_code": context["franchise_code"]
        })
        
        if existing_batch:
            raise HTTPException(
                status_code=400,
                detail=f"Batch with code {batch_data.batch_code} already exists in this branch"
            )
        
        # Get related entity details
        program_name = None
        course_name = None
        subject_name = None
        
        if batch_data.program_id:
            program = db.branch_programs.find_one({
                "_id": ObjectId(batch_data.program_id),
                "franchise_code": context["franchise_code"]
            })
            if program:
                program_name = program.get("program_name")
        
        if batch_data.course_id:
            course = db.branch_courses.find_one({
                "_id": ObjectId(batch_data.course_id),
                "franchise_code": context["franchise_code"]
            })
            if course:
                course_name = course.get("course_name")
        
        if batch_data.subject_id:
            subject = db.branch_subjects.find_one({
                "_id": ObjectId(batch_data.subject_id),
                "franchise_code": context["franchise_code"]
            })
            if subject:
                subject_name = subject.get("subject_name")
        
        # Create batch document
        batch_doc = {
            "_id": ObjectId(),
            "batch_name": batch_data.batch_name,
            "batch_code": batch_data.batch_code,
            "program_id": batch_data.program_id,
            "program_name": program_name,
            "course_id": batch_data.course_id,
            "course_name": course_name,
            "subject_id": batch_data.subject_id,
            "subject_name": subject_name,
            "instructor_name": batch_data.instructor_name or "",
            "instructor_id": batch_data.instructor_id,
            "start_date": batch_data.start_date,
            "end_date": batch_data.end_date,
            "timing": batch_data.timing or "",
            "days_of_week": batch_data.days_of_week or "",
            "max_capacity": batch_data.max_capacity,
            "current_enrollment": batch_data.current_enrollment,
            "fee": batch_data.fee or 0.0,
            "status": batch_data.status,
            "franchise_code": context["franchise_code"],
            "branch_code": context["branch_code"],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "created_by": context["user_id"]
        }
        
        # Insert batch
        result = db.branch_batches.insert_one(batch_doc)
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to create batch")
        
        # Calculate available seats
        available_seats = batch_data.max_capacity - batch_data.current_enrollment
        
        # Return response
        return BatchResponse(
            id=str(result.inserted_id),
            batch_name=batch_data.batch_name,
            batch_code=batch_data.batch_code,
            program_id=batch_data.program_id,
            program_name=program_name,
            course_id=batch_data.course_id,
            course_name=course_name,
            subject_id=batch_data.subject_id,
            subject_name=subject_name,
            instructor_name=batch_data.instructor_name or "",
            instructor_id=batch_data.instructor_id,
            start_date=batch_data.start_date,
            end_date=batch_data.end_date,
            timing=batch_data.timing or "",
            days_of_week=batch_data.days_of_week or "",
            max_capacity=batch_data.max_capacity,
            current_enrollment=batch_data.current_enrollment,
            available_seats=available_seats,
            fee=batch_data.fee or 0.0,
            total_students=0,
            status=batch_data.status,
            branch_code=context["branch_code"],
            franchise_code=context["franchise_code"],
            created_at=batch_doc["created_at"],
            updated_at=batch_doc["updated_at"]
        )
        
    except Exception as e:
        print(f"Error creating batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/batches", response_model=List[BatchResponse])
async def get_batches(
    request: Request,
    program_id: Optional[str] = None,
    course_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    instructor_id: Optional[str] = None,
    status: Optional[str] = None,
    branch_code: Optional[str] = None,
    franchise_code: Optional[str] = None
):
    """Get all batches for the branch with optional filtering - No authentication required for dashboard access"""
    try:
        db = request.app.mongodb
        
        logger.info(f"[BATCHES] GET /batches called with branch_code={branch_code}, franchise_code={franchise_code}")
        
        # Build filter query - use query params for filtering
        filter_query = {}
        
        # Filter by branch_code or franchise_code from query params
        if branch_code:
            filter_query["$or"] = [
                {"branch_code": branch_code},
                {"franchise_code": branch_code}
            ]
            logger.info(f"[BATCHES] Filtering by branch_code: {branch_code}")
        elif franchise_code:
            filter_query["franchise_code"] = franchise_code
            logger.info(f"[BATCHES] Filtering by franchise_code: {franchise_code}")
        
        if program_id:
            filter_query["program_id"] = program_id
        if course_id:
            filter_query["course_id"] = course_id
        if subject_id:
            filter_query["subject_id"] = subject_id
        if instructor_id:
            filter_query["instructor_id"] = instructor_id
        if status:
            filter_query["status"] = status
        else:
            filter_query["status"] = {"$ne": "deleted"}
        
        logger.info(f"[BATCHES] Final filter query: {filter_query}")
        
        # Get batches
        batches_cursor = db.branch_batches.find(filter_query)
        batches = []
        
        for batch in batches_cursor:
            # Get student count for this batch
            student_filter = {"batch": batch["batch_name"]}
            if branch_code:
                student_filter["branch_code"] = branch_code
            elif batch.get("franchise_code"):
                student_filter["franchise_code"] = batch.get("franchise_code")
            
            student_count = db.branch_students.count_documents(student_filter)
            
            # Calculate available seats
            available_seats = batch.get("max_capacity", 30) - batch.get("current_enrollment", 0)
            
            batches.append(BatchResponse(
                id=str(batch["_id"]),
                batch_name=batch["batch_name"],
                batch_code=batch["batch_code"],
                program_id=batch.get("program_id"),
                program_name=batch.get("program_name"),
                course_id=batch.get("course_id"),
                course_name=batch.get("course_name"),
                subject_id=batch.get("subject_id"),
                subject_name=batch.get("subject_name"),
                instructor_name=batch.get("instructor_name", ""),
                instructor_id=batch.get("instructor_id"),
                start_date=batch.get("start_date"),
                end_date=batch.get("end_date"),
                timing=batch.get("timing", ""),
                days_of_week=batch.get("days_of_week", ""),
                max_capacity=batch.get("max_capacity", 30),
                current_enrollment=batch.get("current_enrollment", 0),
                available_seats=max(0, available_seats),
                fee=batch.get("fee", 0.0),
                total_students=student_count,
                status=batch.get("status", "active"),
                branch_code=batch.get("branch_code"),
                franchise_code=batch.get("franchise_code"),
                created_at=batch.get("created_at"),
                updated_at=batch.get("updated_at")
            ))
        
        logger.info(f"[BATCHES] Returning {len(batches)} batches")
        return batches
        
    except Exception as e:
        logger.error(f"[BATCHES] Error fetching batches: {e}")
        # Return empty list instead of error for dashboard
        return []

@router.get("/batches/dropdown")
async def get_batches_dropdown(
    request: Request,
    branch_code: Optional[str] = None,
    course_id: Optional[str] = None,
    status: str = "active"
):
    """Get simplified batch data for dropdown selections - Accessible by admin, franchise admin, and branch admin"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[BATCHES DROPDOWN] Getting batches for branch_code: {branch_code}, course_id: {course_id}")
        
        # Check authentication and permissions
        # This endpoint allows both authenticated and unauthenticated access
        # When authenticated, user must have appropriate permissions
        
        user = getattr(request.state, 'user', None)
        auth_header = request.headers.get("Authorization")
        
        logger.info(f"[BATCHES DROPDOWN] Auth header present: {bool(auth_header)}")
        logger.info(f"[BATCHES DROPDOWN] User in request state: {bool(user)}")
        
        if auth_header and not user:
            # Auth header was provided but user authentication failed
            # This might be due to expired or invalid token
            logger.warning("[BATCHES DROPDOWN] Authentication header provided but user authentication failed")
            logger.warning("[BATCHES DROPDOWN] This might be due to expired or invalid token")
            # For dropdown endpoints, we'll allow access even with invalid tokens
            # to maintain compatibility
            logger.info("[BATCHES DROPDOWN] Allowing access despite authentication failure")
        
        if user:
            user_role = user.get("role", "")
            is_branch_admin = user.get("is_branch_admin", False)
            allowed_roles = ["admin", "franchise", "branch_admin"]
            
            logger.info(f"[BATCHES DROPDOWN] Authenticated user - Role: {user_role}, is_branch_admin: {is_branch_admin}")
            
            # Allow access for admin, franchise admin, and branch admin
            if user_role in allowed_roles or is_branch_admin:
                logger.info(f"[BATCHES DROPDOWN] Access granted for authenticated user with role: {user_role}")
            else:
                logger.warning(f"[BATCHES DROPDOWN] Access denied - insufficient permissions")
                raise HTTPException(
                    status_code=403, 
                    detail=f"Access denied. Required roles: {allowed_roles} or branch_admin flag. Current role: {user_role}"
                )
        else:
            # No user authentication - allow access for dropdown functionality
            logger.info("[BATCHES DROPDOWN] Proceeding without authentication - public access allowed")
        
        db = request.app.mongodb
        
        # Build filter query
        filter_query = {"status": status}
        
        # Enhanced filtering logic for franchise vs branch access
        if branch_code:
            # If user is authenticated, check if they're a franchise admin
            if user and user.get("is_branch_admin") and user.get("franchise_code"):
                # For franchise admins, the branch_code parameter might actually be their franchise_code
                # Check if the provided branch_code matches their franchise_code
                if branch_code == user.get("franchise_code"):
                    logger.info(f"[BATCHES DROPDOWN] Franchise admin detected - filtering by franchise_code: {branch_code}")
                    filter_query["franchise_code"] = branch_code
                else:
                    # It's a specific branch code
                    logger.info(f"[BATCHES DROPDOWN] Filtering by specific branch_code: {branch_code}")
                    filter_query["branch_code"] = branch_code
            else:
                # Regular branch filtering
                logger.info(f"[BATCHES DROPDOWN] Regular branch filtering: {branch_code}")
                filter_query["branch_code"] = branch_code
            
        # First, let's log all batches for debugging
        all_batches_count = db.branch_batches.count_documents({"status": status})
        logger.info(f"[BATCHES DROPDOWN] Total active batches in database: {all_batches_count}")
        
        # Count batches with current filter (before course filtering)
        current_filter_count = db.branch_batches.count_documents(filter_query)
        logger.info(f"[BATCHES DROPDOWN] Batches matching current filter: {current_filter_count}")
        logger.info(f"[BATCHES DROPDOWN] Current filter: {filter_query}")
        
        if course_id:
            logger.info(f"[BATCHES DROPDOWN] Searching for course: {course_id}")
            # Try multiple ways to match the course
            course_filter_options = [
                {"course_id": course_id},
                {"course_name": course_id},
                {"course_code": course_id}
            ]
            
            # Test each filter individually for debugging
            for i, course_filter in enumerate(course_filter_options):
                combined_filter = {**filter_query, **course_filter}
                test_count = db.branch_batches.count_documents(combined_filter)
                logger.info(f"[BATCHES DROPDOWN] Test filter {i+1} {course_filter}: {test_count} matches")
            
            # Use OR filter for actual query
            filter_query["$or"] = course_filter_options
        
        logger.info(f"[BATCHES DROPDOWN] Final filter query: {filter_query}")
        
        # Count batches
        total_count = db.branch_batches.count_documents(filter_query)
        logger.info(f"[BATCHES DROPDOWN] Found {total_count} batches with current filter")
        
        if total_count == 0:
            return {
                "success": True,
                "message": "No batches found",
                "count": 0,
                "batches": [],
                "options": []
            }
        
        # Get batches
        batches_cursor = db.branch_batches.find(
            filter_query,
            {
                "_id": 1,
                "batch_name": 1,
                "batch_code": 1,
                "course_name": 1,
                "instructor_name": 1,
                "timing": 1,
                "days_of_week": 1,
                "max_capacity": 1,
                "current_enrollment": 1,
                "branch_code": 1
            }
        )
        
        dropdown_data = []
        for batch in batches_cursor:
            # Calculate available seats
            student_count = db.branch_students.count_documents({
                "batch": batch["batch_name"],
                "branch_code": branch_code
            }) if branch_code else batch.get("current_enrollment", 0)
            
            available_seats = batch.get("max_capacity", 30) - student_count
            
            dropdown_data.append({
                "id": str(batch["_id"]),
                "value": batch["batch_name"],
                "label": f"{batch['batch_code']} - {batch['batch_name']} ({available_seats} seats)",
                "batch_code": batch["batch_code"],
                "batch_name": batch["batch_name"],
                "course_name": batch.get("course_name", ""),
                "instructor_name": batch.get("instructor_name", ""),
                "timing": batch.get("timing", ""),
                "days_of_week": batch.get("days_of_week", ""),
                "max_capacity": batch.get("max_capacity", 30),
                "current_enrollment": student_count,
                "available_seats": available_seats,
                "branch_code": batch.get("branch_code", "")
            })
        
        logger.info(f"[BATCHES DROPDOWN] Returning {len(dropdown_data)} batch options")
        
        return {
            "success": True,
            "count": len(dropdown_data),
            "batches": dropdown_data,
            "options": dropdown_data
        }
        
    except Exception as e:
        logger.error(f"[BATCHES DROPDOWN] Error: {str(e)}")
        return {
            "success": True,
            "message": "Error retrieving batches, but continuing",
            "count": 0,
            "batches": [],
            "options": []
        }

@router.get("/batches/{batch_id}", response_model=BatchResponse)
async def get_batch(
    batch_id: str,
    request: Request
):
    """Get a specific batch by ID"""
    try:
        # Get authenticated user
        current_user = await require_branch_access(request)
        
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Find batch
        batch = db.branch_batches.find_one({
            "_id": ObjectId(batch_id),
            "franchise_code": context["franchise_code"]
        })
        
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        # Get student count
        student_count = db.branch_students.count_documents({
            "batch": batch["batch_name"],
            "franchise_code": context["franchise_code"]
        })
        
        # Calculate available seats
        available_seats = batch["max_capacity"] - batch.get("current_enrollment", 0)
        
        return BatchResponse(
            id=str(batch["_id"]),
            batch_name=batch["batch_name"],
            batch_code=batch["batch_code"],
            program_id=batch.get("program_id"),
            program_name=batch.get("program_name"),
            course_id=batch.get("course_id"),
            course_name=batch.get("course_name"),
            subject_id=batch.get("subject_id"),
            subject_name=batch.get("subject_name"),
            instructor_name=batch.get("instructor_name", ""),
            instructor_id=batch.get("instructor_id"),
            start_date=batch.get("start_date"),
            end_date=batch.get("end_date"),
            timing=batch.get("timing", ""),
            days_of_week=batch.get("days_of_week", ""),
            max_capacity=batch["max_capacity"],
            current_enrollment=batch.get("current_enrollment", 0),
            available_seats=max(0, available_seats),
            fee=batch.get("fee", 0.0),
            total_students=student_count,
            status=batch["status"],
            branch_code=batch["branch_code"],
            franchise_code=batch["franchise_code"],
            created_at=batch["created_at"],
            updated_at=batch["updated_at"]
        )
        
    except Exception as e:
        print(f"Error fetching batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/batches/{batch_id}", response_model=BatchResponse)
async def update_batch(
    batch_id: str,
    batch_data: BatchUpdate,
    request: Request
):
    """Update a batch"""
    try:
        # Get authenticated user
        current_user = await require_branch_access(request)
        
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Find existing batch
        existing_batch = db.branch_batches.find_one({
            "_id": ObjectId(batch_id),
            "franchise_code": context["franchise_code"]
        })
        
        if not existing_batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        # Prepare update data
        update_data = {}
        for field, value in batch_data.dict(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        update_data["updated_at"] = datetime.utcnow().isoformat()
        update_data["updated_by"] = context["user_id"]
        
        # Update batch
        result = db.branch_batches.update_one(
            {"_id": ObjectId(batch_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update batch")
        
        # Get updated batch
        updated_batch = db.branch_batches.find_one({"_id": ObjectId(batch_id)})
        
        # Get student count
        student_count = db.branch_students.count_documents({
            "batch": updated_batch["batch_name"],
            "franchise_code": context["franchise_code"]
        })
        
        # Calculate available seats
        available_seats = updated_batch["max_capacity"] - updated_batch.get("current_enrollment", 0)
        
        return BatchResponse(
            id=str(updated_batch["_id"]),
            batch_name=updated_batch["batch_name"],
            batch_code=updated_batch["batch_code"],
            program_id=updated_batch.get("program_id"),
            program_name=updated_batch.get("program_name"),
            course_id=updated_batch.get("course_id"),
            course_name=updated_batch.get("course_name"),
            subject_id=updated_batch.get("subject_id"),
            subject_name=updated_batch.get("subject_name"),
            instructor_name=updated_batch.get("instructor_name", ""),
            instructor_id=updated_batch.get("instructor_id"),
            start_date=updated_batch.get("start_date"),
            end_date=updated_batch.get("end_date"),
            timing=updated_batch.get("timing", ""),
            days_of_week=updated_batch.get("days_of_week", ""),
            max_capacity=updated_batch["max_capacity"],
            current_enrollment=updated_batch.get("current_enrollment", 0),
            available_seats=max(0, available_seats),
            fee=updated_batch.get("fee", 0.0),
            total_students=student_count,
            status=updated_batch["status"],
            branch_code=updated_batch["branch_code"],
            franchise_code=updated_batch["franchise_code"],
            created_at=updated_batch["created_at"],
            updated_at=updated_batch["updated_at"]
        )
        
    except Exception as e:
        print(f"Error updating batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/batches/{batch_id}")
async def delete_batch(
    batch_id: str,
    request: Request
):
    """Delete a batch (soft delete by changing status to inactive)"""
    try:
        # Get authenticated user
        current_user = await require_branch_access(request)
        
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Check if batch exists
        batch = db.branch_batches.find_one({
            "_id": ObjectId(batch_id),
            "franchise_code": context["franchise_code"]
        })
        
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        # Check if batch has students
        student_count = db.branch_students.count_documents({
            "batch": batch["batch_name"],
            "franchise_code": context["franchise_code"]
        })
        
        if student_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete batch with {student_count} enrolled students. Please transfer students first."
            )
        
        # Soft delete by updating status
        result = db.branch_batches.update_one(
            {"_id": ObjectId(batch_id)},
            {
                "$set": {
                    "status": "deleted",
                    "updated_at": datetime.utcnow().isoformat(),
                    "deleted_by": context["user_id"]
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to delete batch")
        
        return {"message": "Batch deleted successfully"}
        
    except Exception as e:
        print(f"Error deleting batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

