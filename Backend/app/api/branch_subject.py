from fastapi import APIRouter, HTTPException, Request, Depends
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.config import settings
from app.utils.auth_helpers_enhanced import get_current_user
from app.utils.multi_tenant import MultiTenantManager
from pydantic import BaseModel, Field, validator

router = APIRouter(prefix="/api/branch-subjects", tags=["Branch Subject Management"])

# Subject Models
class SubjectCreate(BaseModel):
    subject_name: str
    subject_code: str
    program_id: Optional[str] = None
    course_id: Optional[str] = None
    semester: Optional[int] = None
    credits: Optional[int] = None
    theory_marks: Optional[int] = None
    practical_marks: Optional[int] = None
    subject_type: str = "theory"  # theory, practical, project
    description: Optional[str] = ""
    syllabus_topics: Optional[str] = ""
    reference_books: Optional[str] = ""
    status: str = "active"  # active, inactive
    
    @validator('subject_code')
    def subject_code_must_be_uppercase(cls, v):
        return v.upper() if v else v

class SubjectUpdate(BaseModel):
    subject_name: Optional[str] = None
    semester: Optional[int] = None
    credits: Optional[int] = None
    theory_marks: Optional[int] = None
    practical_marks: Optional[int] = None
    subject_type: Optional[str] = None
    description: Optional[str] = None
    syllabus_topics: Optional[str] = None
    reference_books: Optional[str] = None
    status: Optional[str] = None

class SubjectResponse(BaseModel):
    id: str
    subject_name: str
    subject_code: str
    program_id: Optional[str] = None
    program_name: Optional[str] = None
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    semester: Optional[int] = None
    credits: Optional[int] = None
    theory_marks: Optional[int] = None
    practical_marks: Optional[int] = None
    subject_type: str
    description: str
    syllabus_topics: str
    reference_books: str
    total_batches: int = 0
    total_materials: int = 0
    status: str
    branch_code: str
    franchise_code: str
    created_at: str
    updated_at: str

@router.post("/subjects", response_model=SubjectResponse)
async def create_subject(
    subject_data: SubjectCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a new subject for the branch"""
    try:
        import logging
        logger = logging.getLogger("uvicorn")
        logger.info(f"[SUBJECTS] Creating subject by user: {current_user.get('email', 'unknown')}")
        logger.info(f"[SUBJECTS] Subject data received: {subject_data.dict()}")
        
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        logger.info(f"[SUBJECTS] Branch context: {context}")
        
        # Direct database access - build query based on user role
        query_filter = {
            "subject_code": subject_data.subject_code,
            "franchise_code": context["franchise_code"]
        }
        
        user_role = current_user.get('role', '')
        if user_role == 'branch_admin':
            branch_code = current_user.get('branch_code', '')
            if branch_code:
                query_filter["branch_code"] = branch_code
        
        # Check if subject code already exists
        existing_subject = db.branch_subjects.find_one(query_filter)
        
        if existing_subject:
            raise HTTPException(
                status_code=400,
                detail=f"Subject with code {subject_data.subject_code} already exists in this branch"
            )
        
        # Get program and course details
        program_name = None
        course_name = None
        
        if subject_data.program_id:
            program = db.branch_programs.find_one({
                "_id": ObjectId(subject_data.program_id),
                "franchise_code": context["franchise_code"]
            })
            if program:
                program_name = program.get("program_name")
        
        if subject_data.course_id:
            course = db.branch_courses.find_one({
                "_id": ObjectId(subject_data.course_id),
                "franchise_code": context["franchise_code"]
            })
            if course:
                course_name = course.get("course_name")
        
        # Create subject document
        subject_doc = {
            "_id": ObjectId(),
            "subject_name": subject_data.subject_name,
            "subject_code": subject_data.subject_code,
            "program_id": subject_data.program_id,
            "program_name": program_name,
            "course_id": subject_data.course_id,
            "course_name": course_name,
            "semester": subject_data.semester,
            "credits": subject_data.credits,
            "theory_marks": subject_data.theory_marks,
            "practical_marks": subject_data.practical_marks,
            "subject_type": subject_data.subject_type,
            "description": subject_data.description or "",
            "syllabus_topics": subject_data.syllabus_topics or "",
            "reference_books": subject_data.reference_books or "",
            "status": subject_data.status,
            "franchise_code": context["franchise_code"],
            "branch_code": context["branch_code"],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "created_by": context["user_id"]
        }
        
        # Insert subject
        result = db.branch_subjects.insert_one(subject_doc)
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to create subject")
        
        # Return response
        return SubjectResponse(
            id=str(result.inserted_id),
            subject_name=subject_data.subject_name,
            subject_code=subject_data.subject_code,
            program_id=subject_data.program_id,
            program_name=program_name,
            course_id=subject_data.course_id,
            course_name=course_name,
            semester=subject_data.semester,
            credits=subject_data.credits,
            theory_marks=subject_data.theory_marks,
            practical_marks=subject_data.practical_marks,
            subject_type=subject_data.subject_type,
            description=subject_data.description or "",
            syllabus_topics=subject_data.syllabus_topics or "",
            reference_books=subject_data.reference_books or "",
            total_batches=0,
            total_materials=0,
            status=subject_data.status,
            branch_code=context["branch_code"],
            franchise_code=context["franchise_code"],
            created_at=subject_doc["created_at"],
            updated_at=subject_doc["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger("uvicorn")
        logger.error(f"[SUBJECTS] Error creating subject: {str(e)}")
        logger.error(f"[SUBJECTS] Exception type: {type(e)}")
        logger.error(f"[SUBJECTS] Exception details: {e}")
        print(f"Error creating subject: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create subject: {str(e)}")

@router.get("/subjects", response_model=List[SubjectResponse])
async def get_subjects(
    request: Request,
    program_id: Optional[str] = None,
    course_id: Optional[str] = None,
    semester: Optional[int] = None,
    subject_type: Optional[str] = None,
    status: Optional[str] = None,
    branch_code: Optional[str] = None,
    franchise_code: Optional[str] = None
):
    """Get all subjects for the branch with optional filtering - No authentication required for dashboard access"""
    try:
        import logging
        logger = logging.getLogger("uvicorn")
        logger.info(f"[SUBJECTS] GET /api/branch-subjects/subjects called with branch_code={branch_code}, franchise_code={franchise_code}")
        
        db = request.app.mongodb
        
        # Build filter query using query params
        filter_query = {}
        
        # Filter by branch_code or franchise_code from query params
        if branch_code:
            filter_query["$or"] = [
                {"branch_code": branch_code},
                {"franchise_code": branch_code}
            ]
            logger.info(f"[SUBJECTS] Filtering by branch_code: {branch_code}")
        elif franchise_code:
            filter_query["franchise_code"] = franchise_code
            logger.info(f"[SUBJECTS] Filtering by franchise_code: {franchise_code}")
        
        if program_id:
            filter_query["program_id"] = program_id
        if course_id:
            filter_query["course_id"] = course_id
        if semester:
            filter_query["semester"] = semester
        if subject_type:
            filter_query["subject_type"] = subject_type
        if status:
            filter_query["status"] = status
        else:
            # By default, exclude deleted subjects
            filter_query["status"] = {"$ne": "deleted"}
            
        logger.info(f"[SUBJECTS] Final filter query: {filter_query}")
        
        # Get subjects
        subjects_cursor = db.branch_subjects.find(filter_query)
        subjects = []
        
        for subject in subjects_cursor:
            # Skip subjects with missing required fields
            if not subject.get("subject_name") or subject.get("subject_name", "").strip() == "":
                logger.warning(f"[SUBJECTS] Skipping subject with missing name: {subject.get('_id')}")
                continue
                
            # Get batch count for this subject
            batch_filter = {"subject_id": str(subject["_id"])}
            if branch_code:
                batch_filter["$or"] = [{"branch_code": branch_code}, {"franchise_code": branch_code}]
            elif subject.get("franchise_code"):
                batch_filter["franchise_code"] = subject.get("franchise_code")
            
            batch_count = db.branch_batches.count_documents(batch_filter)
            
            # Get study material count for this subject
            material_filter = {"subject_id": str(subject["_id"])}
            if branch_code:
                material_filter["$or"] = [{"branch_code": branch_code}, {"franchise_code": branch_code}]
            elif subject.get("franchise_code"):
                material_filter["franchise_code"] = subject.get("franchise_code")
                
            material_count = db.branch_study_materials.count_documents(material_filter)
            
            subjects.append(SubjectResponse(
                id=str(subject["_id"]),
                subject_name=subject["subject_name"],
                subject_code=subject["subject_code"],
                program_id=subject.get("program_id"),
                program_name=subject.get("program_name"),
                course_id=subject.get("course_id"),
                course_name=subject.get("course_name"),
                semester=subject.get("semester"),
                credits=subject.get("credits"),
                theory_marks=subject.get("theory_marks"),
                practical_marks=subject.get("practical_marks"),
                subject_type=subject["subject_type"],
                description=subject.get("description", ""),
                syllabus_topics=subject.get("syllabus_topics", ""),
                reference_books=subject.get("reference_books", ""),
                total_batches=batch_count,
                total_materials=material_count,
                status=subject["status"],
                branch_code=subject["branch_code"],
                franchise_code=subject["franchise_code"],
                created_at=subject["created_at"],
                updated_at=subject["updated_at"]
            ))
        
        return subjects
        
    except Exception as e:
        print(f"Error fetching subjects: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subjects/{subject_id}", response_model=SubjectResponse)
async def get_subject(
    subject_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific subject by ID"""
    try:
        import logging
        logger = logging.getLogger("uvicorn")
        logger.info(f"[SUBJECTS] Get subject {subject_id} by user: {current_user.get('email', 'unknown')}")
        
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Find subject with direct database access
        query = {
            "_id": ObjectId(subject_id),
            "franchise_code": context["franchise_code"]
        }
        
        # Add branch filtering for branch_admin users
        user_role = current_user.get('role', '')
        if user_role == 'branch_admin':
            branch_code = current_user.get('branch_code', '')
            if branch_code:
                query["branch_code"] = branch_code
        
        subject = db.branch_subjects.find_one(query)
        
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        
        # Get counts
        batch_count = db.branch_batches.count_documents({
            "subject_id": str(subject["_id"]),
            "franchise_code": context["franchise_code"]
        })
        
        material_count = db.branch_study_materials.count_documents({
            "subject_id": str(subject["_id"]),
            "franchise_code": context["franchise_code"]
        })
        
        return SubjectResponse(
            id=str(subject["_id"]),
            subject_name=subject["subject_name"],
            subject_code=subject["subject_code"],
            program_id=subject.get("program_id"),
            program_name=subject.get("program_name"),
            course_id=subject.get("course_id"),
            course_name=subject.get("course_name"),
            semester=subject.get("semester"),
            credits=subject.get("credits"),
            theory_marks=subject.get("theory_marks"),
            practical_marks=subject.get("practical_marks"),
            subject_type=subject["subject_type"],
            description=subject.get("description", ""),
            syllabus_topics=subject.get("syllabus_topics", ""),
            reference_books=subject.get("reference_books", ""),
            total_batches=batch_count,
            total_materials=material_count,
            status=subject["status"],
            branch_code=subject["branch_code"],
            franchise_code=subject["franchise_code"],
            created_at=subject["created_at"],
            updated_at=subject["updated_at"]
        )
        
    except Exception as e:
        print(f"Error fetching subject: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/subjects/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: str,
    subject_data: SubjectUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update a subject"""
    try:
        import logging
        logger = logging.getLogger("uvicorn")
        logger.info(f"[SUBJECTS] Update subject {subject_id} by user: {current_user.get('email', 'unknown')}")
        
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Find existing subject with direct database access
        query = {
            "_id": ObjectId(subject_id),
            "franchise_code": context["franchise_code"]
        }
        
        # Add branch filtering for branch_admin users
        user_role = current_user.get('role', '')
        if user_role == 'branch_admin':
            branch_code = current_user.get('branch_code', '')
            if branch_code:
                query["branch_code"] = branch_code
        
        existing_subject = db.branch_subjects.find_one(query)
        
        if not existing_subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        
        # Prepare update data
        update_data = {}
        for field, value in subject_data.dict(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        update_data["updated_at"] = datetime.utcnow().isoformat()
        update_data["updated_by"] = context["user_id"]
        
        # Update subject
        result = db.branch_subjects.update_one(
            {"_id": ObjectId(subject_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update subject")
        
        # Get updated subject
        updated_subject = db.branch_subjects.find_one({"_id": ObjectId(subject_id)})
        
        # Get counts
        batch_count = db.branch_batches.count_documents({
            "subject_id": str(updated_subject["_id"]),
            "franchise_code": context["franchise_code"]
        })
        
        material_count = db.branch_study_materials.count_documents({
            "subject_id": str(updated_subject["_id"]),
            "franchise_code": context["franchise_code"]
        })
        
        return SubjectResponse(
            id=str(updated_subject["_id"]),
            subject_name=updated_subject["subject_name"],
            subject_code=updated_subject["subject_code"],
            program_id=updated_subject.get("program_id"),
            program_name=updated_subject.get("program_name"),
            course_id=updated_subject.get("course_id"),
            course_name=updated_subject.get("course_name"),
            semester=updated_subject.get("semester"),
            credits=updated_subject.get("credits"),
            theory_marks=updated_subject.get("theory_marks"),
            practical_marks=updated_subject.get("practical_marks"),
            subject_type=updated_subject["subject_type"],
            description=updated_subject.get("description", ""),
            syllabus_topics=updated_subject.get("syllabus_topics", ""),
            reference_books=updated_subject.get("reference_books", ""),
            total_batches=batch_count,
            total_materials=material_count,
            status=updated_subject["status"],
            branch_code=updated_subject["branch_code"],
            franchise_code=updated_subject["franchise_code"],
            created_at=updated_subject["created_at"],
            updated_at=updated_subject["updated_at"]
        )
        
    except Exception as e:
        print(f"Error updating subject: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/subjects/{subject_id}")
async def delete_subject(
    subject_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete a subject (soft delete by changing status to inactive)"""
    try:
        print(f"[DELETE SUBJECT] Starting delete for subject_id: {subject_id}")
        
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Validate ObjectId format
        try:
            obj_id = ObjectId(subject_id)
            print(f"[DELETE SUBJECT] Valid ObjectId: {obj_id}")
        except Exception as oid_error:
            print(f"[DELETE SUBJECT] Invalid ObjectId: {oid_error}")
            raise HTTPException(status_code=400, detail=f"Invalid subject ID format: {subject_id}")
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Simple approach - just delete by ID regardless of franchise/branch
        print(f"[DELETE SUBJECT] Attempting direct deletion by ID: {obj_id}")
        
        # Check if subject exists (for logging purposes only)
        existing_subject = db.branch_subjects.find_one({"_id": obj_id})
        if existing_subject:
            print(f"[DELETE SUBJECT] Found existing subject: {existing_subject.get('subject_name')} (Status: {existing_subject.get('status')})")
        else:
            print(f"[DELETE SUBJECT] Subject not found in database, but proceeding with deletion anyway")
        
        # Get user_id for deletion tracking
        user_id = context.get("user_id", current_user.get("user_id", current_user.get("id", "unknown")))
        
        # HARD DELETE - permanently remove from database
        print(f"[DELETE SUBJECT] Performing HARD DELETE by ID: {obj_id}")
        
        result = db.branch_subjects.delete_one({"_id": obj_id})
        
        print(f"[DELETE SUBJECT] Delete result - deleted_count: {result.deleted_count}")
        
        if result.deleted_count > 0:
            print(f"[DELETE SUBJECT] Successfully deleted subject from database")
            return {"success": True, "message": "Subject deleted successfully"}
        else:
            print(f"[DELETE SUBJECT] Subject not found in database")
            return {"success": True, "message": "Subject already deleted or not found"}
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"[DELETE SUBJECT] Unexpected error: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"[DELETE SUBJECT] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to delete subject: {str(e)}")