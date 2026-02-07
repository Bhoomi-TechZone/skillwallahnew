from fastapi import APIRouter, HTTPException, Request, Depends
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.config import settings
from app.utils.auth_helpers_enhanced import get_current_user
from app.utils.multi_tenant import MultiTenantManager
from pydantic import BaseModel, Field, validator

router = APIRouter(prefix="/api/branch-courses", tags=["Branch Course Management"])

# Course Models
class CourseCreate(BaseModel):
    course_name: str
    course_code: str
    program_id: Optional[str] = None
    category: Optional[str] = ""  # Add category field
    description: Optional[str] = ""
    duration_months: int
    fee: float = 0.0
    admission_fee: float = 0.0
    syllabus_outline: Optional[str] = ""
    prerequisites: Optional[str] = ""
    max_students: Optional[int] = 50
    status: str = "active"  # active, inactive, draft
    
    @validator('course_code')
    def course_code_must_be_uppercase(cls, v):
        return v.upper() if v else v

class CourseUpdate(BaseModel):
    course_name: Optional[str] = None
    category: Optional[str] = None  # Add category field
    description: Optional[str] = None
    duration_months: Optional[int] = None
    fee: Optional[float] = None
    admission_fee: Optional[float] = None
    syllabus_outline: Optional[str] = None
    prerequisites: Optional[str] = None
    max_students: Optional[int] = None
    status: Optional[str] = None

class CourseResponse(BaseModel):
    id: str
    course_name: str
    course_code: str
    program_id: Optional[str] = None
    program_name: Optional[str] = None
    category: Optional[str] = ""  # Add category field
    description: str
    duration_months: int
    fee: float
    admission_fee: float
    syllabus_outline: str
    prerequisites: str
    max_students: int
    enrolled_students: int = 0
    status: str
    branch_code: str
    franchise_code: str
    created_at: str
    updated_at: str

@router.post("/courses", response_model=CourseResponse)
async def create_course(
    course_data: CourseCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a new course for the branch"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Check if course code already exists in this branch
        existing_course = db.branch_courses.find_one({
            "course_code": course_data.course_code,
            "franchise_code": context["franchise_code"]
        })
        
        if existing_course:
            raise HTTPException(
                status_code=400,
                detail=f"Course with code {course_data.course_code} already exists in this branch"
            )
        
        # Get program details if program_id is provided
        program_name = None
        if course_data.program_id:
            program = db.branch_programs.find_one({
                "_id": ObjectId(course_data.program_id),
                "franchise_code": context["franchise_code"]
            })
            if program:
                program_name = program.get("program_name")
        
        # Create course document
        course_doc = {
            "_id": ObjectId(),
            "course_name": course_data.course_name,
            "course_code": course_data.course_code,
            "program_id": course_data.program_id,
            "program_name": program_name,
            "category": course_data.category or "",
            "description": course_data.description or "",
            "duration_months": course_data.duration_months,
            "fee": course_data.fee,
            "admission_fee": course_data.admission_fee,
            "syllabus_outline": course_data.syllabus_outline or "",
            "prerequisites": course_data.prerequisites or "",
            "max_students": course_data.max_students or 50,
            "enrolled_students": 0,
            "status": course_data.status,
            "franchise_code": context["franchise_code"],
            "branch_code": context["branch_code"],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "created_by": context["user_id"]
        }
        
        # Insert course
        result = db.branch_courses.insert_one(course_doc)
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to create course")
        
        # Return response
        return CourseResponse(
            id=str(result.inserted_id),
            course_name=course_data.course_name,
            course_code=course_data.course_code,
            program_id=course_data.program_id,
            program_name=program_name,
            description=course_data.description or "",
            duration_months=course_data.duration_months,
            fee=course_data.fee,
            admission_fee=course_data.admission_fee,
            syllabus_outline=course_data.syllabus_outline or "",
            prerequisites=course_data.prerequisites or "",
            max_students=course_data.max_students or 50,
            enrolled_students=0,
            status=course_data.status,
            branch_code=context["branch_code"],
            franchise_code=context["franchise_code"],
            created_at=course_doc["created_at"],
            updated_at=course_doc["updated_at"]
        )
        
    except Exception as e:
        print(f"Error creating course: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/courses", response_model=List[CourseResponse])
async def get_courses(
    request: Request,
    program_id: Optional[str] = None,
    status: Optional[str] = None,
    branch_code: Optional[str] = None,
    franchise_code: Optional[str] = None
):
    """Get all courses for the branch with optional filtering - No authentication required for dropdown access"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        db = request.app.mongodb
        
        # Try to get branch_code/franchise_code from headers if not in query params
        if not branch_code:
            branch_code = request.headers.get("X-Branch-Code")
        if not franchise_code:
            franchise_code = request.headers.get("X-Franchise-Code")
        
        logger.info(f"[COURSES] Request params - program_id: {program_id}, branch_code: {branch_code}, franchise_code: {franchise_code}")
        
        # Build filter query - filter by logic
        filter_query = {}
        
        if program_id:
            filter_query["program_id"] = program_id
            logger.info(f"[COURSES] Filtering by program_id: {program_id}")
            
        if branch_code:
            filter_query["branch_code"] = branch_code
        if franchise_code:
            filter_query["franchise_code"] = franchise_code
        
        if status:
            filter_query["status"] = status
        else:
            # Only show active courses by default
            filter_query["status"] = {"$ne": "deleted"}
        
        logger.info(f"[COURSES] Final filter query: {filter_query}")
        
        # Count total courses
        total_courses = db.branch_courses.count_documents(filter_query)
        logger.info(f"[COURSES] Found {total_courses} courses matching filter")
        
        if total_courses == 0:
            logger.warning(f"[COURSES] No courses found for filter: {filter_query}")
            return []
        
        # Get courses
        courses_cursor = db.branch_courses.find(filter_query)
        courses = []
        
        for i, course in enumerate(courses_cursor):
            logger.info(f"[COURSES] Processing course {i+1}: {course.get('course_name')} (Code: {course.get('course_code')})")
            
            # Get enrolled student count (use branch_code or franchise_code for filtering)
            student_filter = {
                "course": course["course_name"]
            }
            if course.get("branch_code"):
                student_filter["branch_code"] = course["branch_code"]
            elif course.get("franchise_code"):
                student_filter["franchise_code"] = course["franchise_code"]
            
            enrolled_count = db.branch_students.count_documents(student_filter)
            
            courses.append(CourseResponse(
                id=str(course["_id"]),
                course_name=course["course_name"],
                course_code=course["course_code"],
                program_id=course.get("program_id"),
                program_name=course.get("program_name"),
                category=course.get("category", ""),
                description=course.get("description", ""),
                duration_months=course["duration_months"],
                fee=course["fee"],
                admission_fee=course.get("admission_fee", 0.0),
                syllabus_outline=course.get("syllabus_outline", ""),
                prerequisites=course.get("prerequisites", ""),
                max_students=course.get("max_students", 50),
                enrolled_students=enrolled_count,
                status=course["status"],
                branch_code=course["branch_code"],
                franchise_code=course["franchise_code"],
                created_at=course["created_at"],
                updated_at=course["updated_at"]
            ))
        
        logger.info(f"[COURSES] Returning {len(courses)} courses successfully")
        return courses
        
    except Exception as e:
        logger.error(f"[COURSES] Error fetching courses: {str(e)}")
        # Return empty list instead of raising exception to prevent dropdown failures
        return []

@router.get("/courses/dropdown")
async def get_courses_dropdown(
    request: Request,
    branch_code: Optional[str] = None,
    franchise_code: Optional[str] = None
):
    """Get simplified course data for dropdown selections - No authentication required"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[COURSES DROPDOWN] Getting courses for branch_code: {branch_code}, franchise_code: {franchise_code}")
        
        db = request.app.mongodb
        
        # Build filter query
        filter_query = {"status": {"$ne": "deleted"}}
        
        if branch_code:
            filter_query["branch_code"] = branch_code
        elif franchise_code:
            filter_query["franchise_code"] = franchise_code
        
        # Count courses
        total_count = db.branch_courses.count_documents(filter_query)
        logger.info(f"[COURSES DROPDOWN] Found {total_count} courses")
        
        if total_count == 0:
            return {
                "success": True,
                "message": "No courses found",
                "count": 0,
                "courses": [],
                "options": []
            }
        
        # Get courses
        courses_cursor = db.branch_courses.find(
            filter_query,
            {"_id": 1, "course_name": 1, "course_code": 1, "category": 1, "fee": 1, "branch_code": 1, "duration": 1, "duration_months": 1, "course_duration": 1}
        )
        
        dropdown_data = []
        for course in courses_cursor:
            # Get duration from any available field
            duration = course.get("duration", "") or course.get("course_duration", "")
            if not duration and course.get("duration_months"):
                duration = f"{course.get('duration_months')} Months"
            
            dropdown_data.append({
                "id": str(course["_id"]),
                "value": course["course_name"],
                "label": f"{course['course_code']} - {course['course_name']}",
                "course_code": course["course_code"],
                "course_name": course["course_name"],
                "category": course.get("category", ""),
                "fee": course.get("fee", 0),
                "duration": duration,
                "course_duration": duration,
                "branch_code": course.get("branch_code", "")
            })
        
        logger.info(f"[COURSES DROPDOWN] Returning {len(dropdown_data)} course options")
        
        return {
            "success": True,
            "count": len(dropdown_data),
            "courses": dropdown_data,
            "options": dropdown_data
        }
        
    except Exception as e:
        logger.error(f"[COURSES DROPDOWN] Error: {str(e)}")
        return {
            "success": True,
            "message": "Error retrieving courses, but continuing",
            "count": 0,
            "courses": [],
            "options": []
        }

@router.get("/courses/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific course by ID"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Find course
        course = db.branch_courses.find_one({
            "_id": ObjectId(course_id),
            "franchise_code": context["franchise_code"]
        })
        
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Get enrolled student count
        enrolled_count = db.branch_students.count_documents({
            "course": course["course_name"],
            "franchise_code": context["franchise_code"]
        })
        
        return CourseResponse(
            id=str(course["_id"]),
            course_name=course["course_name"],
            course_code=course["course_code"],
            program_id=course.get("program_id"),
            program_name=course.get("program_name"),
            description=course.get("description", ""),
            duration_months=course["duration_months"],
            fee=course["fee"],
            admission_fee=course.get("admission_fee", 0.0),
            syllabus_outline=course.get("syllabus_outline", ""),
            prerequisites=course.get("prerequisites", ""),
            max_students=course.get("max_students", 50),
            enrolled_students=enrolled_count,
            status=course["status"],
            branch_code=course["branch_code"],
            franchise_code=course["franchise_code"],
            created_at=course["created_at"],
            updated_at=course["updated_at"]
        )
        
    except Exception as e:
        print(f"Error fetching course: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/courses/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: str,
    course_data: CourseUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update a course"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        print(f"[UPDATE_COURSE] Looking for course ID: {course_id}")
        print(f"[UPDATE_COURSE] User context: {context}")
        
        # First, try to find the course without franchise filter to see if it exists
        course_exists = db.branch_courses.find_one({"_id": ObjectId(course_id)})
        
        if course_exists:
            print(f"[UPDATE_COURSE] Course exists in DB:")
            print(f"  - branch_code: {course_exists.get('branch_code')}")
            print(f"  - franchise_code: {course_exists.get('franchise_code')}")
            print(f"[UPDATE_COURSE] User context:")
            print(f"  - branch_code: {context.get('branch_code')}")
            print(f"  - franchise_code: {context.get('franchise_code')}")
        else:
            print(f"[UPDATE_COURSE] Course with ID {course_id} does not exist in database")
            raise HTTPException(status_code=404, detail=f"Course with ID {course_id} not found")
        
        # Find existing course - check both franchise_code and branch_code for flexibility
        existing_course = db.branch_courses.find_one({
            "_id": ObjectId(course_id),
            "$or": [
                {"franchise_code": context["franchise_code"]},
                {"branch_code": context["branch_code"]}
            ]
        })
        
        if not existing_course:
            print(f"[UPDATE_COURSE] Course found but access denied")
            print(f"[UPDATE_COURSE] Course franchise: {course_exists.get('franchise_code')}, User franchise: {context['franchise_code']}")
            print(f"[UPDATE_COURSE] Course branch: {course_exists.get('branch_code')}, User branch: {context['branch_code']}")
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied. Course belongs to different branch/franchise"
            )
        
        print(f"[UPDATE_COURSE] Course found and access granted")
        
        # Prepare update data
        update_data = {}
        for field, value in course_data.dict(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        update_data["updated_at"] = datetime.utcnow().isoformat()
        update_data["updated_by"] = context["user_id"]
        
        print(f"[UPDATE_COURSE] Course ID: {course_id}")
        print(f"[UPDATE_COURSE] Update data: {update_data}")
        
        # Update course
        result = db.branch_courses.update_one(
            {"_id": ObjectId(course_id)},
            {"$set": update_data}
        )
        
        print(f"[UPDATE_COURSE] Matched count: {result.matched_count}")
        print(f"[UPDATE_COURSE] Modified count: {result.modified_count}")
        
        # Check if course was found (matched_count should be 1)
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Course not found or access denied")
        
        # Note: modified_count can be 0 if no fields actually changed, which is OK
        # So we don't raise an error for modified_count == 0
        
        # Get updated course
        updated_course = db.branch_courses.find_one({"_id": ObjectId(course_id)})
        
        if not updated_course:
            raise HTTPException(status_code=404, detail="Course not found after update")
        
        # Get enrolled student count
        enrolled_count = db.branch_students.count_documents({
            "course": updated_course["course_name"],
            "franchise_code": context["franchise_code"]
        })
        
        return CourseResponse(
            id=str(updated_course["_id"]),
            course_name=updated_course["course_name"],
            course_code=updated_course["course_code"],
            program_id=updated_course.get("program_id"),
            program_name=updated_course.get("program_name"),
            category=updated_course.get("category", ""),
            description=updated_course.get("description", ""),
            duration_months=updated_course["duration_months"],
            fee=updated_course["fee"],
            admission_fee=updated_course.get("admission_fee", 0.0),
            syllabus_outline=updated_course.get("syllabus_outline", ""),
            prerequisites=updated_course.get("prerequisites", ""),
            max_students=updated_course.get("max_students", 50),
            enrolled_students=enrolled_count,
            status=updated_course["status"],
            branch_code=updated_course["branch_code"],
            franchise_code=updated_course["franchise_code"],
            created_at=updated_course["created_at"],
            updated_at=updated_course["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[UPDATE_COURSE] Error updating course: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/courses/{course_id}")
async def delete_course(
    course_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete a course (soft delete by changing status to deleted)"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        print(f"[DELETE_COURSE] Attempting to delete course ID: {course_id}")
        print(f"[DELETE_COURSE] User context: {context}")
        
        # First, check if course exists
        course_exists = db.branch_courses.find_one({"_id": ObjectId(course_id)})
        
        if not course_exists:
            print(f"[DELETE_COURSE] Course with ID {course_id} does not exist")
            raise HTTPException(status_code=404, detail=f"Course with ID {course_id} not found")
        
        print(f"[DELETE_COURSE] Course found:")
        print(f"  - branch_code: {course_exists.get('branch_code')}")
        print(f"  - franchise_code: {course_exists.get('franchise_code')}")
        print(f"  - status: {course_exists.get('status')}")
        
        # Check if course belongs to this branch/franchise (flexible matching)
        course = db.branch_courses.find_one({
            "_id": ObjectId(course_id),
            "$or": [
                {"franchise_code": context["franchise_code"]},
                {"branch_code": context["branch_code"]}
            ]
        })
        
        if not course:
            print(f"[DELETE_COURSE] Access denied - course belongs to different branch/franchise")
            raise HTTPException(
                status_code=403,
                detail="Access denied. Course belongs to different branch/franchise"
            )
        
        # Check if course has enrolled students
        enrolled_count = db.branch_students.count_documents({
            "course": course["course_name"],
            "$or": [
                {"franchise_code": context["franchise_code"]},
                {"branch_code": context["branch_code"]}
            ]
        })
        
        print(f"[DELETE_COURSE] Enrolled students count: {enrolled_count}")
        
        if enrolled_count > 0:
            print(f"[DELETE_COURSE] Cannot delete - {enrolled_count} students enrolled")
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete course with {enrolled_count} enrolled students. Please transfer students first."
            )
        
        # Soft delete by updating status
        result = db.branch_courses.update_one(
            {"_id": ObjectId(course_id)},
            {
                "$set": {
                    "status": "deleted",
                    "updated_at": datetime.utcnow().isoformat(),
                    "deleted_by": context["user_id"],
                    "deleted_at": datetime.utcnow().isoformat()
                }
            }
        )
        
        print(f"[DELETE_COURSE] Delete operation result:")
        print(f"  - matched_count: {result.matched_count}")
        print(f"  - modified_count: {result.modified_count}")
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Course not found")
        
        if result.modified_count == 0:
            print(f"[DELETE_COURSE] Warning: Course was already deleted or status unchanged")
        
        print(f"[DELETE_COURSE] Course deleted successfully")
        return {
            "success": True,
            "message": "Course deleted successfully",
            "course_id": course_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DELETE_COURSE] Error deleting course: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/debug/courses-for-program")
async def debug_get_courses_for_program(
    request: Request,
    program_id: Optional[str] = None
):
    """Debug endpoint to check what courses exist for a program (ignores branch/franchise filters)"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        db = request.app.mongodb
        logger.info(f"[DEBUG COURSES] Looking for courses with program_id: {program_id}")
        
        if not program_id:
            return {
                "success": False,
                "message": "program_id is required",
                "total_courses_in_db": db.branch_courses.count_documents({})
            }
        
        # Get all courses for this program regardless of branch/franchise
        courses = list(db.branch_courses.find({"program_id": program_id}))
        
        logger.info(f"[DEBUG COURSES] Found {len(courses)} courses for program {program_id}")
        
        return {
            "success": True,
            "program_id": program_id,
            "total_found": len(courses),
            "courses": [
                {
                    "id": str(c["_id"]),
                    "course_name": c.get("course_name"),
                    "course_code": c.get("course_code"),
                    "program_id": c.get("program_id"),
                    "branch_code": c.get("branch_code"),
                    "franchise_code": c.get("franchise_code"),
                    "status": c.get("status")
                }
                for c in courses
            ],
            "total_in_database": db.branch_courses.count_documents({})
        }
        
    except Exception as e:
        logger.error(f"[DEBUG COURSES] Error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "total_in_database": db.branch_courses.count_documents({})
        }