from fastapi import APIRouter, Request, File, UploadFile, Form, HTTPException, Depends
from fastapi.security import HTTPBearer
from app.schemas.submission import SubmissionCreate, SubmissionUpdate
from app.services.submission_service import (
    create_submission, get_submissions_by_assignment,
    update_submission, delete_submission
)
from app.utils.auth_helpers import get_current_user
from app.utils.auth import verify_token
from app.models.submission import get_submission_collection
from app.models.assignment import get_assignment_collection
from app.models.user import get_user_collection
import os
import uuid
from pathlib import Path
from typing import List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
submission_router = APIRouter(prefix="/submissions", tags=["Submissions"])
security = HTTPBearer()

@submission_router.get("/debug", response_model=dict)
async def debug_submissions_data(request: Request, token: str = Depends(security)):
    """Debug endpoint to check what data exists in submissions, assignments, and users collections"""
    db = request.app.mongodb
    
    # Verify token
    user_info = verify_token(token.credentials)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        submission_collection = get_submission_collection(db)
        assignment_collection = get_assignment_collection(db)
        user_collection = get_user_collection(db)
        
        # Get sample data from each collection
        submissions_sample = list(submission_collection.find().limit(3))
        assignments_sample = list(assignment_collection.find().limit(3))
        users_sample = list(user_collection.find().limit(3))
        
        # Convert ObjectIds to strings for JSON serialization
        for item in submissions_sample:
            item['_id'] = str(item['_id'])
        for item in assignments_sample:
            item['_id'] = str(item['_id'])
        for item in users_sample:
            item['_id'] = str(item['_id'])
        
        return {
            'submissions_count': submission_collection.count_documents({}),
            'assignments_count': assignment_collection.count_documents({}),
            'users_count': user_collection.count_documents({}),
            'submissions_sample': submissions_sample,
            'assignments_sample': assignments_sample,
            'users_sample': users_sample
        }
    except Exception as e:
        return {'error': str(e)}

@submission_router.get("/", response_model=dict)
async def get_all_submissions(
    request: Request,
    limit: int = 100,
    offset: int = 0,
    token: str = Depends(security)
):
    """Get all submissions for admin/super admin"""
    try:
        db = request.app.mongodb
        
        # Verify token and get user info
        user_info = verify_token(token.credentials)
        if not user_info:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Check if user is admin or super admin
        user_role = user_info.get('role', '').lower()
        if user_role not in ['admin', 'super_admin', 'superadmin']:
            raise HTTPException(status_code=403, detail="Access denied. Admin privileges required.")
        
        logger.info(f"[Submissions API] get_all_submissions called by user: {user_info.get('username', 'unknown')}")
        
        # Get collections
        submission_collection = get_submission_collection(db)
        assignment_collection = get_assignment_collection(db)
        user_collection = get_user_collection(db)
        
        # Get all submissions with pagination
        submissions_cursor = submission_collection.find().skip(offset).limit(limit)
        submissions = list(submissions_cursor)
        
        # Get total count
        total_count = submission_collection.count_documents({})
        
        logger.info(f"[Submissions API] Found {len(submissions)} submissions from database")
        
        # Create dictionaries for quick lookups
        assignment_ids = []
        student_ids = []
        
        for submission in submissions:
            assignment_id = submission.get('assignment_id')
            student_id = submission.get('student_id')
            
            if assignment_id:
                assignment_ids.append(assignment_id)
            if student_id:
                student_ids.append(student_id)
        
        # Remove duplicates
        assignment_ids = list(set(assignment_ids))
        student_ids = list(set(student_ids))
        
        logger.info(f"[Submissions API] Looking up {len(assignment_ids)} assignments and {len(student_ids)} students")
        
        # Get assignment details - try both ObjectId and string formats
        assignments_dict = {}
        if assignment_ids:
            # Try ObjectId format first
            try:
                from bson import ObjectId
                assignment_object_ids = []
                for aid in assignment_ids:
                    try:
                        assignment_object_ids.append(ObjectId(aid))
                    except:
                        pass
                
                if assignment_object_ids:
                    assignments_cursor = assignment_collection.find({'_id': {'$in': assignment_object_ids}})
                    for assignment in assignments_cursor:
                        assignments_dict[str(assignment['_id'])] = assignment
            except:
                pass
            
            # Also try string format
            assignments_cursor = assignment_collection.find({'assignment_id': {'$in': assignment_ids}})
            for assignment in assignments_cursor:
                assignments_dict[assignment.get('assignment_id', str(assignment['_id']))] = assignment
        
        # Get student details - try both ObjectId and string formats
        students_dict = {}
        if student_ids:
            # Try ObjectId format first
            try:
                from bson import ObjectId
                student_object_ids = []
                for sid in student_ids:
                    try:
                        student_object_ids.append(ObjectId(sid))
                    except:
                        pass
                
                if student_object_ids:
                    students_cursor = user_collection.find({'_id': {'$in': student_object_ids}})
                    for student in students_cursor:
                        students_dict[str(student['_id'])] = student
            except:
                pass
            
            # Also try string format
            students_cursor = user_collection.find({'user_id': {'$in': student_ids}})
            for student in students_cursor:
                students_dict[student.get('user_id', str(student['_id']))] = student
        
        # Process submissions
        processed_submissions = []
        for submission in submissions:
            assignment_id = submission.get('assignment_id', '')
            student_id = submission.get('student_id', '')
            
            # Try to find assignment by different possible keys
            assignment = assignments_dict.get(str(assignment_id)) or assignments_dict.get(assignment_id) or {}
            
            # Try to find student by different possible keys  
            student = students_dict.get(str(student_id)) or students_dict.get(student_id) or {}
            
            # Get better date formatting
            submitted_at = submission.get('submitted_at', '')
            if submitted_at:
                try:
                    from datetime import datetime
                    if isinstance(submitted_at, str):
                        submitted_at = submitted_at
                    elif hasattr(submitted_at, 'isoformat'):
                        submitted_at = submitted_at.isoformat()
                except:
                    submitted_at = str(submitted_at)
            
            processed_submission = {
                'id': str(submission.get('_id', '')),
                'assignment_id': str(assignment_id),
                'assignment_title': assignment.get('title', assignment.get('assignment_title', f'Assignment {assignment_id}' if assignment_id else 'Unknown Assignment')),
                'student_id': str(student_id),
                'student_name': student.get('name', student.get('username', student.get('full_name', f'Student {student_id}' if student_id else 'Unknown Student'))),
                'student_email': student.get('email', ''),
                'submitted_at': submitted_at,
                'status': submission.get('status', 'submitted'),
                'grade': submission.get('grade'),
                'feedback': submission.get('feedback', ''),
                'file_path': submission.get('file_path', ''),
                'comments': submission.get('comments', ''),
                'course_id': assignment.get('course_id', ''),
                'course_title': assignment.get('course_title', '')
            }
            processed_submissions.append(processed_submission)
        
        logger.info(f"[Submissions API] Successfully processed {len(processed_submissions)} submissions")
        logger.info(f"[Submissions API] Sample submission data: {processed_submissions[0] if processed_submissions else 'No submissions'}")
        
        logger.info(f"[Submissions API] Successfully returning {len(processed_submissions)} submissions")
        
        return {
            'success': True,
            'submissions': processed_submissions,
            'total': total_count,
            'limit': limit,
            'offset': offset
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Submissions API] Unexpected error in get_all_submissions: {e}")
        return {
            'success': False,
            'message': f'Failed to fetch submissions: {str(e)}',
            'submissions': [],
            'total': 0,
            'limit': limit,
            'offset': offset
        }

@submission_router.post("/submit")
async def submit_assignment_file(
    request: Request,
    assignment_id: str = Form(...),
    comments: str = Form(""),
    file: UploadFile = File(...)
):
    """Submit an assignment with file upload"""
    db = request.app.mongodb
    
    # Get current user from token
    current_user = await get_current_user(request)
    
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Check file size (10MB limit)
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    # Validate file type
    allowed_extensions = ['.pdf', '.doc', '.docx', '.txt', '.zip', '.rar']
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Accepted formats: {', '.join(allowed_extensions)}"
        )
    
    # Create uploads directory
    upload_dir = Path("uploads/submissions")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = upload_dir / unique_filename
    
    # Save the file
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Create submission data
    submission_data = SubmissionCreate(
        assignment_id=assignment_id,
        student_id=current_user["user_id"],
        file_path=str(file_path),
        file_name=file.filename,
        comments=comments,
        submission_date=None  # Will be set by service
    )
    
    return create_submission(db, submission_data)

@submission_router.put("/{submission_id}/grade", response_model=dict)
async def grade_submission(
    request: Request,
    submission_id: str,
    grade_data: dict,
    token: str = Depends(security)
):
    """Grade a submission"""
    try:
        db = request.app.mongodb
        
        # Verify token and get user info
        user_info = verify_token(token.credentials)
        if not user_info:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Check if user is admin, instructor, or super admin
        user_role = user_info.get('role', '').lower()
        if user_role not in ['admin', 'super_admin', 'superadmin', 'instructor']:
            raise HTTPException(status_code=403, detail="Access denied. Admin or instructor privileges required.")
        
        logger.info(f"[Submissions API] Grading submission {submission_id} by user: {user_info.get('username', 'unknown')}")
        
        # Get collections
        submission_collection = get_submission_collection(db)
        
        # Find submission
        from bson import ObjectId
        try:
            submission_object_id = ObjectId(submission_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid submission ID format")
        
        submission = submission_collection.find_one({"_id": submission_object_id})
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        # Extract grade data
        grade = grade_data.get('grade')
        feedback = grade_data.get('feedback', '')
        status = grade_data.get('status', 'graded')
        
        # Validate grade
        if grade is None or grade == '':
            raise HTTPException(status_code=400, detail="Grade is required")
        
        try:
            grade_value = float(grade)
            if grade_value < 0 or grade_value > 100:
                raise HTTPException(status_code=400, detail="Grade must be between 0 and 100")
        except ValueError:
            raise HTTPException(status_code=400, detail="Grade must be a valid number")
        
        # Update submission with grade
        update_data = {
            "grade": grade_value,
            "feedback": feedback,
            "status": status,
            "graded_date": datetime.utcnow().isoformat(),
            "graded_by": user_info.get('user_id')
        }
        
        result = submission_collection.update_one(
            {"_id": submission_object_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Submission not found or no changes made")
        
        logger.info(f"[Submissions API] Successfully graded submission {submission_id}")
        
        return {
            "success": True,
            "message": "Submission graded successfully",
            "submission_id": submission_id,
            "grade": grade_value,
            "status": status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Submissions API] Error grading submission {submission_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to grade submission: {str(e)}")

@submission_router.post("/")
def submit_assignment(request: Request, payload: SubmissionCreate):
    """Legacy endpoint for JSON submissions"""
    db = request.app.mongodb
    return create_submission(db, payload)

@submission_router.get("/{assignment_id}")
def list_submissions(request: Request, assignment_id: str):
    db = request.app.mongodb
    return get_submissions_by_assignment(db, assignment_id)

@submission_router.put("/{submission_id}")
def update_submission_handler(request: Request, submission_id: str, payload: SubmissionUpdate):
    db = request.app.mongodb
    return update_submission(db, submission_id, payload)

@submission_router.delete("/{submission_id}")
def delete_submission_handler(request: Request, submission_id: str):
    db = request.app.mongodb
    return delete_submission(db, submission_id)


