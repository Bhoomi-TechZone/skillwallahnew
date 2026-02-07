from fastapi import APIRouter, Request, File, UploadFile, Form, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate, AssignmentResponse
from app.services.assignment_service import (
    create_assignment, get_assignments_for_course, get_assignments_for_instructor,
    get_assignment_by_id, update_assignment, delete_assignment, get_all_assignments
)
from app.utils.auth import verify_token, get_current_user
import os
import uuid
import json
from pathlib import Path
from typing import List, Optional

assignment_router = APIRouter(prefix="/assignments", tags=["Assignments"])
student_assignment_router = APIRouter(prefix="/student", tags=["Student Assignments"])
api_assignment_router = APIRouter(prefix="/api/assignments", tags=["API Student Assignments"])
security = HTTPBearer()

@assignment_router.get("/", response_model=dict)
async def get_all_assignments_endpoint(
    request: Request,
    token: str = Depends(security)
):
    """Get all assignments in the system (super admin)"""
    db = request.app.mongodb
    
    # Verify token
    user_info = verify_token(token.credentials)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get branch filter for multi-tenancy
    access_manager = BranchAccessManager(user_info)
    branch_filter = access_manager.get_filter_query()
    
    try:
        assignments = get_all_assignments(db, branch_filter)
        print(f"✅ Retrieved {len(assignments)} assignments for admin")
        
        return {
            "status": "success",
            "message": f"Retrieved {len(assignments)} assignments",
            "assignments": assignments,
            "count": len(assignments)
        }
    except Exception as e:
        print(f"❌ Error in get_all_assignments_endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching assignments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@assignment_router.post("/create", response_model=dict)
async def create_assignment_endpoint(
    request: Request,
    title: str = Form(...),
    description: str = Form(""),
    instructions: str = Form(""),
    type: str = Form("exercise"),
    max_points: int = Form(...),
    due_date: str = Form(...),
    course_id: str = Form(...),
    assigned_students: str = Form("[]"),  # JSON string of student IDs
    visibility: str = Form("draft"),
    estimated_time: Optional[float] = Form(None),
    attachment: UploadFile = File(None),
    token: str = Depends(security)
):
    """Create a new assignment"""
    db = request.app.mongodb
    
    # Verify token and get user info
    user_info = verify_token(token.credentials)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Handle file upload if provided
    attachment_file_path = None
    if attachment and attachment.filename:
        # Validate file type
        allowed_extensions = ['.pdf', '.docx', '.zip']
        if not any(attachment.filename.lower().endswith(ext) for ext in allowed_extensions):
            raise HTTPException(status_code=400, detail="Only PDF, DOCX, and ZIP files are allowed")
        
        # Create uploads directory if it doesn't exist
        upload_dir = Path("uploads/assignments")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_extension = os.path.splitext(attachment.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = upload_dir / unique_filename
        
        # Save the file
        try:
            content = await attachment.read()
            with open(file_path, "wb") as buffer:
                buffer.write(content)
            attachment_file_path = str(file_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Parse assigned_students JSON string
    import json
    try:
        assigned_students_list = json.loads(assigned_students) if assigned_students else []
    except json.JSONDecodeError:
        assigned_students_list = []
    
    # Create assignment data
    assignment_data = AssignmentCreate(
        title=title,
        description=description,
        instructions=instructions,
        type=type,
        max_points=max_points,
        due_date=due_date,
        course_id=course_id,
        assigned_students=assigned_students_list,
        visibility=visibility,
        estimated_time=estimated_time,
        attachment_file=attachment_file_path,
        questions_pdf_path=attachment_file_path
    )
    
    # Add franchise context to assignment
    if user_info.get('franchise_code'):
        assignment_data.franchise_code = user_info.get('franchise_code')
        assignment_data.franchise_id = user_info.get('franchise_id')
    
    return create_assignment(db, assignment_data, user_info["user_id"])

@assignment_router.get("/instructor")
async def get_instructor_assignments(
    request: Request,
    token: str = Depends(security)
):
    """Get all assignments created by the current instructor"""
    db = request.app.mongodb
    
    try:
        # Verify token and get user info
        print(f"🔍 Token received: {token.credentials[:20]}..." if token.credentials else "No token")
        user_info = verify_token(token.credentials)
        if not user_info:
            print("❌ Invalid token provided for /assignments/instructor")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        print(f"✅ Valid token for user: {user_info.get('user_id')} ({user_info.get('email')})")
        print(f"👤 User role: {user_info.get('role')}")
        
        # Check if user has instructor role
        if user_info.get("role") != "instructor":
            print(f"❌ User {user_info.get('user_id')} does not have instructor role")
            raise HTTPException(status_code=403, detail="Instructor access required")
        
        print(f"🔍 Fetching assignments for instructor: {user_info['user_id']}")
        assignments = get_assignments_for_instructor(db, user_info["user_id"])
        print(f"📊 Retrieved {len(assignments)} assignments for instructor")
        
        return {"success": True, "data": assignments, "count": len(assignments)}
    except HTTPException:
        # Re-raise HTTP exceptions without modification
        raise
    except Exception as e:
        print(f"❌ Unexpected error in get_instructor_assignments: {str(e)}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@assignment_router.get("/{assignment_id}/pdf")
async def get_assignment_pdf(
    assignment_id: str, 
    request: Request,
    token: str = Depends(security)
):
    """Serve the PDF file for an assignment"""
    db = request.app.mongodb
    
    # Verify token
    user_info = verify_token(token.credentials)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    from app.models.assignment import get_assignment_collection
    from bson import ObjectId
    
    # Get assignment from database
    assignment_collection = get_assignment_collection(db)
    assignment = assignment_collection.find_one({"_id": ObjectId(assignment_id)})
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    pdf_path = assignment.get("attachment_file") or assignment.get("questions_pdf_path")
    if not pdf_path or not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=f"assignment_{assignment_id}_questions.pdf"
    )

@assignment_router.get("/course/{course_id}")
async def list_assignments_for_course(
    request: Request, 
    course_id: str,
    token: str = Depends(security)
):
    """Get all assignments for a specific course"""
    db = request.app.mongodb
    
    # Verify token and get user info
    user_info = verify_token(token.credentials)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        # For instructors, only return their assignments
        if user_info.get("role") == "instructor":
            assignments = get_assignments_for_course(db, course_id, user_info["user_id"])
        else:
            assignments = get_assignments_for_course(db, course_id)
        
        return {"success": True, "data": assignments}
    except Exception as e:
        print(f"❌ Error in list_assignments_for_course: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching assignments: {str(e)}")

@assignment_router.get("/{assignment_id}")
async def get_assignment(
    assignment_id: str,
    request: Request,
    token: str = Depends(security)
):
    """Get a specific assignment by ID"""
    db = request.app.mongodb
    
    # Verify token and get user info
    user_info = verify_token(token.credentials)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        assignment = get_assignment_by_id(db, assignment_id)
        return {"success": True, "data": assignment}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_assignment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching assignment: {str(e)}")

@assignment_router.put("/{assignment_id}", response_model=dict)
async def update_assignment_endpoint(
    assignment_id: str,
    request: Request,
    token: str = Depends(security)
):
    """Update an assignment - handles both JSON and form data automatically"""
    try:
        print(f"🔍 Assignment update request received:")
        print(f"   - assignment_id: {assignment_id}")
        print(f"   - content_type: {request.headers.get('content-type', 'unknown')}")
        print(f"   - token: {token.credentials[:20]}..." if token and token.credentials else "No token")
        
        db = request.app.mongodb
        
        # Verify token and get user info
        user_info = verify_token(token.credentials)
        if not user_info:
            print("❌ Token verification failed")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        print(f"✅ Token verified for user: {user_info.get('user_id')} ({user_info.get('role')})")
        
        # Check content type and handle accordingly
        content_type = request.headers.get("content-type", "").lower()
        update_data = {}
        attachment_file_path = None
        
        if "application/json" in content_type:
            # Handle JSON request
            print("� Processing JSON request")
            body = await request.json()
            print(f"   - JSON body: {body}")
            
            # Map frontend field names to backend schema
            field_mapping = {
                "title": "title",
                "description": "description", 
                "instructions": "instructions",
                "type": "type",
                "maxPoints": "max_points",
                "max_points": "max_points",
                "dueDate": "due_date", 
                "due_date": "due_date",
                "courseId": "course_id",
                "course_id": "course_id", 
                "assignedStudents": "assigned_students",
                "assigned_students": "assigned_students",
                "visibility": "visibility",
                "status": "status",
                "estimatedTime": "estimated_time",
                "estimated_time": "estimated_time"
            }
            
            for frontend_key, backend_key in field_mapping.items():
                if frontend_key in body and body[frontend_key] is not None:
                    update_data[backend_key] = body[frontend_key]
            
        elif "multipart/form-data" in content_type:
            # Handle form data request  
            print("📝 Processing form data request")
            form = await request.form()
            
            # Parse form data
            for field in ["title", "description", "instructions", "type", "max_points", 
                         "due_date", "course_id", "status", "visibility", "estimated_time"]:
                if field in form and form[field]:
                    if field == "max_points":
                        update_data[field] = int(form[field])
                    elif field == "estimated_time":
                        update_data[field] = float(form[field])
                    else:
                        update_data[field] = str(form[field])
            
            # Handle assigned_students JSON string
            if "assigned_students" in form and form["assigned_students"]:
                try:
                    update_data["assigned_students"] = json.loads(form["assigned_students"])
                except json.JSONDecodeError:
                    print("⚠️ Failed to parse assigned_students, keeping as empty list")
                    update_data["assigned_students"] = []
            
            # Handle file upload
            if "attachment" in form:
                file = form["attachment"]
                if hasattr(file, 'filename') and file.filename:
                    print(f"📎 Processing file upload: {file.filename}")
                    # Validate file type
                    allowed_extensions = ['.pdf', '.docx', '.zip']
                    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
                        raise HTTPException(status_code=400, detail="Only PDF, DOCX, and ZIP files are allowed")
                    
                    # Create uploads directory
                    upload_dir = Path("uploads/assignments")
                    upload_dir.mkdir(parents=True, exist_ok=True)
                    
                    # Generate unique filename
                    file_extension = os.path.splitext(file.filename)[1]
                    unique_filename = f"{uuid.uuid4()}{file_extension}"
                    file_path = upload_dir / unique_filename
                    
                    # Save the file
                    content = await file.read()
                    with open(file_path, "wb") as buffer:
                        buffer.write(content)
                    
                    attachment_file_path = str(file_path)
                    update_data["attachment_file"] = attachment_file_path
                    update_data["questions_pdf_path"] = attachment_file_path
                    print(f"✅ File saved: {attachment_file_path}")
        else:
            raise HTTPException(status_code=400, detail="Unsupported content type. Use application/json or multipart/form-data")
        
        # Handle status/visibility mapping
        if "visibility" in update_data and "status" not in update_data:
            update_data["status"] = update_data["visibility"]
        elif "status" in update_data and "visibility" not in update_data:
            update_data["visibility"] = update_data["status"]
        
        print(f"🔄 Final update data: {update_data}")
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid update data provided")
        
        # Create AssignmentUpdate object
        payload = AssignmentUpdate(**update_data)
        
        # For instructors, only allow updating their own assignments
        if user_info.get("role") == "instructor":
            print(f"🔒 Instructor update - checking ownership")
            result = update_assignment(db, assignment_id, payload, user_info["user_id"])
        else:
            print(f"🔓 Admin/other role update")
            result = update_assignment(db, assignment_id, payload)
        
        print(f"✅ Assignment update successful: {result}")
        return result
        
    except HTTPException as he:
        print(f"❌ HTTP Exception in assignment update: {he.detail}")
        raise
    except Exception as e:
        print(f"❌ Unexpected error in assignment update: {str(e)}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@assignment_router.delete("/{assignment_id}", response_model=dict)
async def delete_assignment_endpoint(
    assignment_id: str,
    request: Request,
    token: str = Depends(security)
):
    """Delete an assignment"""
    db = request.app.mongodb
    
    # Verify token and get user info
    user_info = verify_token(token.credentials)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # For instructors, only allow deleting their own assignments
    if user_info.get("role") == "instructor":
        return delete_assignment(db, assignment_id, user_info["user_id"])
    else:
        return delete_assignment(db, assignment_id)

@assignment_router.get("/student/my-assignments")
async def get_student_assignments(
    request: Request,
    student_id: Optional[str] = None,
    token: str = Depends(security)
):
    """Get all assignments for a student based on their enrolled courses"""
    db = request.app.mongodb
    
    try:
        # Import ObjectId and other dependencies first
        from app.models.enrollment import get_enrollment_collection
        from app.models.assignment import get_assignment_collection
        from app.models.submission import get_submission_collection
        from app.models.course import get_course_collection
        from bson import ObjectId
        
        # Verify token and get user info
        user_info = verify_token(token.credentials)
        if not user_info:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Use provided student_id or get from token
        if student_id:
            try:
                target_student_id = ObjectId(student_id)
                print(f"🔍 Using provided student_id: {student_id}")
            except:
                target_student_id = ObjectId(user_info["user_id"])
                print(f"🔍 Invalid student_id parameter, using token user_id: {user_info['user_id']}")
        else:
            target_student_id = ObjectId(user_info["user_id"])
            print(f"🔍 Using token user_id: {user_info['user_id']}")
        
        print(f"🔍 Student assignments request from user: {user_info.get('user_id')} ({user_info.get('role')})")
        print(f"🔍 Target student_id: {target_student_id}")
        
        # Check if user has student role (optional - could allow any authenticated user)
        if user_info.get("role") not in ["student", "user"]:
            print(f"⚠️  User {user_info.get('user_id')} has role {user_info.get('role')}, allowing anyway")
        
        enrollment_collection = get_enrollment_collection(db)
        assignment_collection = get_assignment_collection(db)
        submission_collection = get_submission_collection(db)
        course_collection = get_course_collection(db)
        
        # Get all enrollments for the student
        print(f"🔍 Looking for enrollments for student_id: {target_student_id}")
        enrollments = list(enrollment_collection.find({"student_id": target_student_id}))
        print(f"📚 Found {len(enrollments)} enrollments")
        
        if not enrollments:
            print("📚 No enrollments found for student")
            return {"success": True, "data": [], "message": "No enrolled courses found"}
        
        # Get course IDs from enrollments
        enrolled_course_ids = [enrollment["course_id"] for enrollment in enrollments]
        print(f"📚 Enrolled course ObjectIds: {enrolled_course_ids}")
        
        # Get course details to map ObjectId to course_id strings
        courses = list(course_collection.find({"_id": {"$in": enrolled_course_ids}}))
        print(f"🔍 Found {len(courses)} course records")
        
        # Debug: Print course structure to understand the schema
        if courses:
            print(f"📋 Sample course fields: {list(courses[0].keys())}")
            print(f"📋 Sample course data: {courses[0]}")
        
        # Build mapping from assignment course_id (string) to course ObjectId
        course_id_map = {}
        course_name_map = {}
        course_instructor_map = {}
        
        # Build list of possible course_id strings to search for in assignments
        possible_assignment_course_ids = []
        
        for course in courses:
            obj_id = course["_id"]
            obj_id_str = str(obj_id)
            
            # The primary course_id to use for assignment matching
            assignment_course_id = course.get("course_id")  # This should be the string like "JAVA001", "ARTI001"
            
            if assignment_course_id:
                # Store mappings using the course_id string (like "JAVA001")
                course_id_map[assignment_course_id] = obj_id
                course_name_map[assignment_course_id] = course.get("title", course.get("name", "Unknown Course"))
                course_instructor_map[assignment_course_id] = course.get("instructor_name", course.get("instructor", "Unknown Instructor"))
                
                # Add to list of course IDs to search for in assignments
                possible_assignment_course_ids.append(assignment_course_id)
                print(f"✅ Added course mapping: {assignment_course_id} -> {obj_id} ({course.get('title')})")
            else:
                print(f"⚠️  Course {obj_id} has no course_id field")
            
            # Also add ObjectId string as fallback
            if obj_id_str not in possible_assignment_course_ids:
                possible_assignment_course_ids.append(obj_id_str)
                course_id_map[obj_id_str] = obj_id
                course_name_map[obj_id_str] = course.get("title", course.get("name", "Unknown Course"))
                course_instructor_map[obj_id_str] = course.get("instructor_name", course.get("instructor", "Unknown Instructor"))
        
        print(f"🗺️  Course ID mapping: {course_id_map}")
        print(f"📚 Looking for assignments with course_id in: {possible_assignment_course_ids}")
        
        # Only fetch published assignments for students
        assignments = list(assignment_collection.find({
            "course_id": {"$in": possible_assignment_course_ids},
            "status": "published"  # Filter to only show published assignments
        }))
        
        print(f"📋 Found {len(assignments)} published assignments for enrolled courses")
        
        # Debug: Show sample assignments if any found
        if assignments:
            print(f"🔍 Sample assignment course_ids found: {[a.get('course_id') for a in assignments[:3]]}")
        
        # If no assignments found, let's check what assignments exist in the database
        if len(assignments) == 0:
            all_assignments = list(assignment_collection.find({"status": "published"}, {"course_id": 1, "title": 1}))
            print(f"🔍 DEBUG: Found {len(all_assignments)} total published assignments in database")
            if all_assignments:
                unique_course_ids = list(set(a.get('course_id') for a in all_assignments))
                print(f"🔍 DEBUG: Unique course_ids in assignments: {unique_course_ids}")
                print(f"🔍 DEBUG: We were looking for: {possible_assignment_course_ids}")
                print(f"🔍 DEBUG: Sample assignment titles: {[a.get('title', 'No title') for a in all_assignments[:5]]}")
        
        # Get student's submissions
        assignment_ids = [assignment["_id"] for assignment in assignments]
        submissions = list(submission_collection.find({
            "assignment_id": {"$in": assignment_ids},
            "student_id": target_student_id
        }))
        
        print(f"📝 Found {len(submissions)} submissions from student")
        
        # Create submission map for quick lookup
        submission_map = {submission["assignment_id"]: submission for submission in submissions}
        
        # Process assignments and add submission status
        processed_assignments = []
        for assignment in assignments:
            assignment_id = assignment["_id"]
            assignment_course_id = assignment["course_id"]
            
            # Find the course ObjectId for this assignment using the course_id_map
            course_obj_id = course_id_map.get(assignment_course_id)
            
            submission = submission_map.get(assignment_id)
            
            # Determine status
            status = "pending"
            if submission:
                if submission.get("grade") is not None:
                    status = "graded"
                else:
                    status = "submitted"
            else:
                # Check if overdue
                if assignment.get("due_date"):
                    from datetime import datetime
                    try:
                        due_date = datetime.fromisoformat(assignment["due_date"].replace('Z', '+00:00'))
                        if due_date < datetime.now():
                            status = "overdue"
                    except:
                        pass
            
            processed_assignment = {
                "_id": str(assignment_id),
                "title": assignment.get("title", "Untitled Assignment"),
                "description": assignment.get("description", ""),
                "instructions": assignment.get("instructions", ""),
                "course_id": assignment.get("course_id"),
                "course_name": course_name_map.get(assignment_course_id, "Unknown Course"),
                "instructor_name": course_instructor_map.get(assignment_course_id, "Unknown Instructor"),
                "due_date": assignment.get("due_date"),
                "max_points": assignment.get("max_points", 0),
                "type": assignment.get("type", "exercise"),
                "estimated_time": assignment.get("estimated_time"),
                "status": status,
                "attachment_file": assignment.get("attachment_file"),
                "questions_pdf_path": assignment.get("questions_pdf_path"),
                "created_date": assignment.get("created_date"),
                "updated_date": assignment.get("updated_date"),
                # Add submission details if available
                "submission": {
                    "id": str(submission["_id"]) if submission else None,
                    "submitted_date": submission.get("submitted_date") if submission else None,
                    "grade": submission.get("grade") if submission else None,
                    "feedback": submission.get("feedback") if submission else None,
                    "file_path": submission.get("file_path") if submission else None,
                    "comments": submission.get("comments") if submission else None
                } if submission else None
            }
            
            processed_assignments.append(processed_assignment)
        
        print(f"✅ Returning {len(processed_assignments)} processed assignments")
        
        return {
            "success": True, 
            "data": processed_assignments,
            "count": len(processed_assignments),
            "enrolled_courses": len(enrollments)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting student assignments: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching student assignments: {str(e)}")

# Main endpoint - handles all form data including file uploads
@assignment_router.post("/", response_model=dict)
async def add_assignment_main(
    request: Request,
    title: str = Form(...),
    description: str = Form(""),
    instructions: str = Form(""),
    type: str = Form("exercise"),
    max_points: int = Form(...),
    due_date: str = Form(...),
    course_id: str = Form(...),
    assigned_students: str = Form("[]"),  # JSON string of student IDs
    status: str = Form("draft"),  # Use status instead of visibility
    estimated_time: Optional[float] = Form(None),
    attachment: UploadFile = File(None),  # This should match your frontend field name
    questions_pdf: UploadFile = File(None),  # Legacy support
    token: str = Depends(security)
):
    """Main assignment creation endpoint - handles both new and legacy formats"""
    db = request.app.mongodb
    
    try:
        print(f"🔍 Assignment creation request received:")
        print(f"   - title: {title}")
        print(f"   - course_id: {course_id}")
        print(f"   - assigned_students: {assigned_students}")
        print(f"   - status: {status}")
        print(f"   - token: {token.credentials[:20]}...")
        
        # Verify token and get user info
        user_info = verify_token(token.credentials)
        if not user_info:
            print("❌ Token verification failed")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        print(f"✅ Token verified for user: {user_info.get('user_id')} ({user_info.get('role')})")
        
    except HTTPException as he:
        print(f"❌ HTTP Exception in assignment creation: {he.detail}")
        raise
    except Exception as e:
        print(f"❌ Unexpected error in assignment creation: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    # Handle file upload - check both attachment and questions_pdf fields
    attachment_file_path = None
    file_to_process = attachment if attachment and attachment.filename else (questions_pdf if questions_pdf and questions_pdf.filename else None)
    
    try:
        if file_to_process and file_to_process.filename:
            print(f"📎 Processing file upload: {file_to_process.filename}")
            # Validate file type
            allowed_extensions = ['.pdf', '.docx', '.zip']
            if not any(file_to_process.filename.lower().endswith(ext) for ext in allowed_extensions):
                raise HTTPException(status_code=400, detail="Only PDF, DOCX, and ZIP files are allowed")
            
            # Create uploads directory if it doesn't exist
            upload_dir = Path("uploads/assignments")
            upload_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate unique filename
            file_extension = os.path.splitext(file_to_process.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = upload_dir / unique_filename
            
            # Save the file
            try:
                content = await file_to_process.read()
                with open(file_path, "wb") as buffer:
                    buffer.write(content)
                attachment_file_path = str(file_path)
                print(f"✅ File saved successfully: {attachment_file_path}")
            except Exception as e:
                print(f"❌ Error saving file: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
        
        # Parse assigned_students JSON string
        import json
        try:
            assigned_students_list = json.loads(assigned_students) if assigned_students else []
            print(f"📋 Parsed assigned_students: {assigned_students_list}")
        except json.JSONDecodeError as e:
            print(f"❌ Error parsing assigned_students JSON: {str(e)}")
            assigned_students_list = []
        
        # Create assignment data
        assignment_data = AssignmentCreate(
            title=title,
            description=description,
            instructions=instructions,
            type=type,
            max_points=max_points,
            due_date=due_date,
            course_id=course_id,
            assigned_students=assigned_students_list,
            visibility=status,  # Map status to visibility
            status=status,
            estimated_time=estimated_time,
            attachment_file=attachment_file_path,
            questions_pdf_path=attachment_file_path  # Ensure both fields are set consistently
        )
        
        print(f"📋 Creating assignment with data:")
        print(f"   - Title: {title}")
        print(f"   - File uploaded: {attachment_file_path is not None}")
        print(f"   - attachment_file: {attachment_file_path}")  
        print(f"   - questions_pdf_path: {assignment_data.questions_pdf_path}")
        print(f"   - Full payload: {assignment_data.model_dump()}")
        
        result = create_assignment(db, assignment_data, user_info["user_id"])
        
        # Return detailed response
        return {
            "success": True,
            "assignment_id": result["assignment_id"],
            "message": "Assignment created successfully",
            "file_uploaded": attachment_file_path is not None,
            "file_path": attachment_file_path,
            "debug_info": {
                "attachment_file": attachment_file_path,
                "questions_pdf_path": assignment_data.questions_pdf_path
            }
        }
        
    except HTTPException as he:
        print(f"❌ HTTP Exception in assignment processing: {he.detail}")
        raise
    except Exception as e:
        print(f"❌ Unexpected error in assignment processing: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Alternative endpoints for student assignments (to match frontend expectations)
@assignment_router.get("/my-assignments")
async def get_my_assignments_alt(request: Request, token: str = Depends(security)):
    """Alternative endpoint for student assignments (no /student prefix)"""
    return await get_student_assignments(request, token)

# Direct /student/assignments endpoint
@student_assignment_router.get("/assignments")
async def get_student_assignments_direct(
    request: Request, 
    student_id: Optional[str] = None,
    token: str = Depends(security)
):
    """Direct endpoint for /student/assignments that matches frontend expectations"""
    return await get_student_assignments(request, token)

# File download endpoint for assignment attachments
@assignment_router.get("/{assignment_id}/download")
async def download_assignment_file(
    assignment_id: str,
    request: Request,
    token: str = Depends(security)
):
    """Download assignment attachment file"""
    from fastapi.responses import FileResponse
    from pathlib import Path
    from app.models.assignment import get_assignment_collection
    from bson import ObjectId
    
    try:
        # Verify token
        user_info = verify_token(token.credentials)
        if not user_info:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        db = request.app.mongodb
        assignment_collection = get_assignment_collection(db)
        
        # Find the assignment
        try:
            assignment = assignment_collection.find_one({"_id": ObjectId(assignment_id)})
        except:
            assignment = assignment_collection.find_one({"_id": assignment_id})
            
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Get the file path
        file_path = assignment.get("attachment_file") or assignment.get("questions_pdf_path")
        if not file_path:
            raise HTTPException(status_code=404, detail="No attachment file found for this assignment")
        
        # Convert to absolute path
        if not os.path.isabs(file_path):
            file_path = os.path.join(os.getcwd(), file_path)
        
        # Check if file exists
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            
            # Try alternative paths
            alternative_paths = [
                os.path.join(os.getcwd(), "uploads", "assignments", os.path.basename(file_path)),
                os.path.join(os.getcwd(), "london_lms", "uploads", "assignments", os.path.basename(file_path))
            ]
            
            file_found = False
            for alt_path in alternative_paths:
                if os.path.exists(alt_path):
                    file_path = alt_path
                    file_found = True
                    print(f"✅ Found file at alternative path: {file_path}")
                    break
            
            if not file_found:
                # List available files for debugging
                assignments_dir = os.path.join(os.getcwd(), "uploads", "assignments")
                if os.path.exists(assignments_dir):
                    available_files = os.listdir(assignments_dir)
                    print(f"📁 Available files in assignments directory: {available_files}")
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Assignment file not found. Available files: {available_files}"
                    )
                else:
                    raise HTTPException(status_code=404, detail="Assignment file not found and uploads directory doesn't exist")
        
        # Get filename for download
        filename = os.path.basename(file_path)
        
        print(f"📥 Serving file: {file_path} as {filename}")
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type='application/octet-stream'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error downloading assignment file: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")

# Alternative download endpoint with filename
@assignment_router.get("/{assignment_id}/file/{filename}")
async def download_assignment_file_by_name(
    assignment_id: str,
    filename: str,
    request: Request,
    token: str = Depends(security)
):
    """Download assignment attachment file by filename"""
    return await download_assignment_file(assignment_id, request, token)

# API version for student assignments
@api_assignment_router.get("/student")
async def get_api_student_assignments(
    request: Request,
    student_id: Optional[str] = None, 
    token: str = Depends(security)
):
    """API endpoint for /api/assignments/student"""
    return await get_student_assignments(request, token)

@api_assignment_router.get("/my-assignments")
async def get_api_my_assignments(
    request: Request,
    student_id: Optional[str] = None,
    token: str = Depends(security)
):
    """API endpoint for /api/assignments/my-assignments"""
    return await get_student_assignments(request, token)


