from fastapi import APIRouter, HTTPException, Request, Depends
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.config import settings
from app.utils.auth_helpers_enhanced import get_current_user
from app.utils.multi_tenant import MultiTenantManager
from pydantic import BaseModel, Field, validator

router = APIRouter(prefix="/api/branch-programs", tags=["Branch Program Management"])

# Program Models
class ProgramCreate(BaseModel):
    program_name: str
    program_code: str
    description: Optional[str] = ""
    program_type: str = "academic"  # academic, professional, certificate, diploma
    duration_years: Optional[float] = None
    total_semesters: Optional[int] = None
    eligibility: Optional[str] = ""
    program_fee: Optional[float] = 0.0
    status: str = "active"  # active, inactive, draft
    
    @validator('program_code')
    def program_code_must_be_uppercase(cls, v):
        return v.upper() if v else v

class ProgramUpdate(BaseModel):
    program_name: Optional[str] = None
    description: Optional[str] = None
    program_type: Optional[str] = None
    duration_years: Optional[float] = None
    total_semesters: Optional[int] = None
    eligibility: Optional[str] = None
    program_fee: Optional[float] = None
    status: Optional[str] = None

class ProgramResponse(BaseModel):
    id: str
    program_name: str
    program_code: str
    description: str
    program_type: str
    duration_years: Optional[float] = None
    total_semesters: Optional[int] = None
    eligibility: str
    program_fee: float
    total_courses: int = 0
    total_students: int = 0
    status: str
    branch_code: str
    franchise_code: str
    created_at: str
    updated_at: str

@router.post("/programs", response_model=ProgramResponse)
async def create_program(
    program_data: ProgramCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a new program for the branch"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Check if program code already exists in this branch
        existing_program = db.branch_programs.find_one({
            "program_code": program_data.program_code,
            "franchise_code": context["franchise_code"]
        })
        
        if existing_program:
            raise HTTPException(
                status_code=400,
                detail=f"Program with code {program_data.program_code} already exists in this branch"
            )
        
        # Create program document
        program_doc = {
            "_id": ObjectId(),
            "program_name": program_data.program_name,
            "program_code": program_data.program_code,
            "description": program_data.description or "",
            "program_type": program_data.program_type,
            "duration_years": program_data.duration_years,
            "total_semesters": program_data.total_semesters,
            "eligibility": program_data.eligibility or "",
            "program_fee": program_data.program_fee or 0.0,
            "status": program_data.status,
            "franchise_code": context["franchise_code"],
            "branch_code": context["branch_code"],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "created_by": context["user_id"]
        }
        
        # Insert program
        result = db.branch_programs.insert_one(program_doc)
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to create program")
        
        # Return response
        return ProgramResponse(
            id=str(result.inserted_id),
            program_name=program_data.program_name,
            program_code=program_data.program_code,
            description=program_data.description or "",
            program_type=program_data.program_type,
            duration_years=program_data.duration_years,
            total_semesters=program_data.total_semesters,
            eligibility=program_data.eligibility or "",
            program_fee=program_data.program_fee or 0.0,
            total_courses=0,
            total_students=0,
            status=program_data.status,
            branch_code=context["branch_code"],
            franchise_code=context["franchise_code"],
            created_at=program_doc["created_at"],
            updated_at=program_doc["updated_at"]
        )
        
    except Exception as e:
        print(f"Error creating program: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/programs", response_model=List[ProgramResponse])
async def get_programs(
    request: Request,
    program_type: Optional[str] = None,
    status: Optional[str] = None,
    branch_code: Optional[str] = None,
    franchise_code: Optional[str] = None
):
    """Get all programs for the branch with optional filtering - No authentication required for dashboard access"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        db = request.app.mongodb
        
        logger.info(f"[PROGRAMS] GET /programs called with branch_code={branch_code}, franchise_code={franchise_code}")
        
        # Build filter query using query params
        # Build filter query using query params
        filter_query = {}
        
        # Filter by branch/franchise code if provided
        if branch_code:
            filter_query["branch_code"] = branch_code
        if franchise_code:
            filter_query["franchise_code"] = franchise_code

        if program_type:
            filter_query["program_type"] = program_type
        if status:
            filter_query["status"] = status
        else:
            filter_query["status"] = {"$ne": "deleted"}
        
        logger.info(f"[PROGRAMS] Final filter query: {filter_query}")
        
        # Get programs
        programs_cursor = db.branch_programs.find(filter_query)
        programs = []
        
        for program in programs_cursor:
            # Get course count - don't filter by branch/franchise
            course_filter = {"program_id": str(program["_id"])}
            course_count = db.branch_courses.count_documents(course_filter)
            
            # Get student count - don't filter by branch/franchise
            student_filter = {"program": program["program_name"]}
                
            student_count = db.branch_students.count_documents(student_filter)
            
            programs.append(ProgramResponse(
                id=str(program["_id"]),
                program_name=program["program_name"],
                program_code=program["program_code"],
                description=program.get("description", ""),
                program_type=program["program_type"],
                duration_years=program.get("duration_years"),
                total_semesters=program.get("total_semesters"),
                eligibility=program.get("eligibility", ""),
                program_fee=program.get("program_fee", 0.0),
                total_courses=course_count,
                total_students=student_count,
                status=program["status"],
                branch_code=program["branch_code"],
                franchise_code=program["franchise_code"],
                created_at=program["created_at"],
                updated_at=program["updated_at"]
            ))
        
        logger.info(f"[PROGRAMS] Returning {len(programs)} programs")
        return programs
        
    except Exception as e:
        logger.error(f"[PROGRAMS] Error fetching programs: {e}")
        # Return empty list for dashboard
        return []

@router.get("/programs/{program_id}", response_model=ProgramResponse)
async def get_program(
    program_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific program by ID"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Find program
        program = db.branch_programs.find_one({
            "_id": ObjectId(program_id),
            "franchise_code": context["franchise_code"]
        })
        
        if not program:
            raise HTTPException(status_code=404, detail="Program not found")
        
        # Get course count
        course_count = db.branch_courses.count_documents({
            "program_id": str(program["_id"]),
            "franchise_code": context["franchise_code"]
        })
        
        # Get student count
        student_count = db.branch_students.count_documents({
            "program": program["program_name"],
            "franchise_code": context["franchise_code"]
        })
        
        return ProgramResponse(
            id=str(program["_id"]),
            program_name=program["program_name"],
            program_code=program["program_code"],
            description=program.get("description", ""),
            program_type=program["program_type"],
            duration_years=program.get("duration_years"),
            total_semesters=program.get("total_semesters"),
            eligibility=program.get("eligibility", ""),
            program_fee=program.get("program_fee", 0.0),
            total_courses=course_count,
            total_students=student_count,
            status=program["status"],
            branch_code=program["branch_code"],
            franchise_code=program["franchise_code"],
            created_at=program["created_at"],
            updated_at=program["updated_at"]
        )
        
    except Exception as e:
        print(f"Error fetching program: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/programs/{program_id}", response_model=ProgramResponse)
async def update_program(
    program_id: str,
    program_data: ProgramUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update a program"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Find existing program
        existing_program = db.branch_programs.find_one({
            "_id": ObjectId(program_id),
            "franchise_code": context["franchise_code"]
        })
        
        if not existing_program:
            raise HTTPException(status_code=404, detail="Program not found")
        
        # Prepare update data
        update_data = {}
        for field, value in program_data.dict(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        update_data["updated_at"] = datetime.utcnow().isoformat()
        update_data["updated_by"] = context["user_id"]
        
        # Update program
        result = db.branch_programs.update_one(
            {"_id": ObjectId(program_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update program")
        
        # Get updated program
        updated_program = db.branch_programs.find_one({"_id": ObjectId(program_id)})
        
        # Get counts
        course_count = db.branch_courses.count_documents({
            "program_id": str(updated_program["_id"]),
            "franchise_code": context["franchise_code"]
        })
        
        student_count = db.branch_students.count_documents({
            "program": updated_program["program_name"],
            "franchise_code": context["franchise_code"]
        })
        
        return ProgramResponse(
            id=str(updated_program["_id"]),
            program_name=updated_program["program_name"],
            program_code=updated_program["program_code"],
            description=updated_program.get("description", ""),
            program_type=updated_program["program_type"],
            duration_years=updated_program.get("duration_years"),
            total_semesters=updated_program.get("total_semesters"),
            eligibility=updated_program.get("eligibility", ""),
            program_fee=updated_program.get("program_fee", 0.0),
            total_courses=course_count,
            total_students=student_count,
            status=updated_program["status"],
            branch_code=updated_program["branch_code"],
            franchise_code=updated_program["franchise_code"],
            created_at=updated_program["created_at"],
            updated_at=updated_program["updated_at"]
        )
        
    except Exception as e:
        print(f"Error updating program: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/programs/{program_id}")
async def delete_program(
    program_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete a program (soft delete by changing status to inactive)"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Check if program exists
        program = db.branch_programs.find_one({
            "_id": ObjectId(program_id),
            "franchise_code": context["franchise_code"]
        })
        
        if not program:
            raise HTTPException(status_code=404, detail="Program not found")
        
        # Check if program has courses
        course_count = db.branch_courses.count_documents({
            "program_id": str(program["_id"]),
            "franchise_code": context["franchise_code"]
        })
        
        if course_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete program with {course_count} courses. Please remove courses first."
            )
        
        # Soft delete by updating status
        result = db.branch_programs.update_one(
            {"_id": ObjectId(program_id)},
            {
                "$set": {
                    "status": "deleted",
                    "updated_at": datetime.utcnow().isoformat(),
                    "deleted_by": context["user_id"]
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to delete program")
        
        return {"message": "Program deleted successfully"}
        
    except Exception as e:
        print(f"Error deleting program: {e}")
        raise HTTPException(status_code=500, detail=str(e))