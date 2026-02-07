from fastapi import APIRouter, HTTPException, Request, Depends
from app.utils.auth_helpers_enhanced import get_current_user
from app.utils.dependencies import get_authenticated_user
from app.models.course import get_course_collection
from app.models.enrollment import get_enrollment_collection
from app.models.assignment import get_assignment_collection
from app.models.quiz import get_quiz_collection
from app.models.quiz_attempt import get_quiz_attempt_collection
from app.models.certificate import get_certificate_collection
from app.models.submission import get_submission_collection
from bson import ObjectId
from datetime import datetime
from typing import Optional, List, Dict, Any
import traceback

# Create router for branch student dashboard
branch_student_dashboard_router = APIRouter(prefix="/api/branch-students", tags=["Branch Student Dashboard"])

def get_student_branch_context(current_user: dict) -> dict:
    """Extract student's branch information from authenticated user"""
    branch_code = current_user.get("branch_code")
    franchise_code = current_user.get("franchise_code") 
    is_branch_student = current_user.get("is_branch_student", False)
    student_id = current_user.get("user_id")
    
    if not is_branch_student:
        raise HTTPException(status_code=403, detail="Access denied: Branch student access required")
        
    if not branch_code:
        raise HTTPException(status_code=400, detail="Missing branch information")
    
    return {
        "student_id": student_id,
        "branch_code": branch_code,
        "franchise_code": franchise_code,
        "is_branch_student": is_branch_student
    }

@branch_student_dashboard_router.get("/dashboard")
async def get_branch_student_dashboard(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
 
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        db = request.app.mongodb
        
        # Extract student info from current_user
        student_id_str = current_user.get("user_id")
        student_id_obj = ObjectId(student_id_str)
        branch_code = current_user.get("branch_code")
        franchise_code = current_user.get("franchise_code")
        
        logger.info(f"[STUDENT DASHBOARD] Getting dashboard for student: {student_id_str}")
        logger.info(f"[STUDENT DASHBOARD] Branch: {branch_code}, Franchise: {franchise_code}")
        
        # Get student details
        student = db.branch_students.find_one({"_id": student_id_obj})
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Get student's course details from branch_courses collection
        student_course_name = student.get("course", student.get("course_name"))
        course_info = None
        if student_course_name:
            course_info = db.branch_courses.find_one({
                "course_name": student_course_name,
                "branch_code": branch_code,
                "franchise_code": franchise_code
            })
        
        # Get quizzes/paper sets for this student's course
        paper_sets = list(db.branch_paper_sets.find({
            "courseName": student_course_name,
            "branchCode": branch_code,
            "franchiseCode": franchise_code,
            "status": {"$ne": "deleted"}
        }))
        
        logger.info(f"[STUDENT DASHBOARD] Found {len(paper_sets)} paper sets for course: {student_course_name}")
        
        # Get study materials
        study_materials = list(db.branch_study_materials.find({
            "course_name": student_course_name,
            "branch_code": branch_code,
            "franchise_code": franchise_code,
            "status": "active"
        }).limit(10))
        
        logger.info(f"[STUDENT DASHBOARD] Found {len(study_materials)} study materials")
        
        # Calculate statistics
        total_tests = len(paper_sets)
        available_tests = len([ps for ps in paper_sets if ps.get("status") == "active"])
        completed_tests = 0  # TODO: Track from quiz attempts
        pending_tests = available_tests - completed_tests
        
        # Get payment/fee information
        total_fee = student.get("total_fee", 0) or 0
        net_fee = student.get("net_fee", 0) or 0
        # TODO: Get actual payments from payments collection
        paid_amount = 0
        due_amount = net_fee - paid_amount
        
        # Format tests data
        tests_data = []
        for ps in paper_sets[:10]:  # Limit to 10 recent tests
            tests_data.append({
                "id": str(ps["_id"]),
                "name": ps.get("paperName", "Unnamed Test"),
                "questions": ps.get("numberOfQuestions", 0),
                "duration": ps.get("timeLimit", 0),
                "marks": ps.get("perQuestionMark", 0),
                "status": "Open" if ps.get("status") == "active" else "Waiting",
                "availableFrom": ps.get("availableFrom"),
                "availableTo": ps.get("availableTo"),
                "courseCategory": ps.get("courseCategory"),
                "courseName": ps.get("courseName")
            })
        
        # Format study materials
        materials_data = []
        for sm in study_materials:
            materials_data.append({
                "id": str(sm["_id"]),
                "title": sm.get("material_name", "Unnamed Material"),
                "type": sm.get("material_type", "document"),
                "file_url": sm.get("file_url"),
                "external_link": sm.get("external_link"),
                "description": sm.get("description", ""),
                "uploaded_at": sm.get("created_at")
            })
        
        # Construct dashboard response
        dashboard_data = {
            "success": True,
            "student": {
                "id": str(student["_id"]),
                "student_id": student.get("student_id"),
                "name": student.get("name", student.get("student_name")),
                "email": student.get("email", student.get("email_id")),
                "contact": student.get("contact_number", student.get("contact_no")),
                "course": student_course_name,
                "batch": student.get("batch", student.get("batch_name")),
                "branch": student.get("branch_name", "N/A"),
                "registration_number": student.get("registration_number"),
                "admission_date": student.get("date_of_admission"),
                "status": student.get("status", "Active"),
                "photo": student.get("photo", ""),
                "branch_code": branch_code,
                "franchise_code": franchise_code
            },
            "course_info": {
                "course_name": student_course_name,
                "course_code": course_info.get("course_code") if course_info else None,
                "duration": course_info.get("duration_months") if course_info else None,
                "fee": course_info.get("fee") if course_info else total_fee,
                "description": course_info.get("description") if course_info else ""
            },
            "statistics": {
                "total_tests": total_tests,
                "available_tests": available_tests,
                "completed_tests": completed_tests,
                "pending_tests": pending_tests,
                "total_fee": total_fee,
                "net_fee": net_fee,
                "paid_amount": paid_amount,
                "due_amount": due_amount,
                "progress_percentage": 0  # TODO: Calculate based on completed tests/assignments
            },
            "tests": tests_data,
            "study_materials": materials_data,
            "recent_activities": []  # TODO: Add activity tracking
        }
        
        logger.info(f"[STUDENT DASHBOARD] Successfully prepared dashboard data")
        return dashboard_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[STUDENT DASHBOARD] Error: {str(e)}")
        logger.error(f"[STUDENT DASHBOARD] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard data: {str(e)}")

@branch_student_dashboard_router.get("/courses")
async def get_branch_student_courses(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get enrolled courses for branch student"""
    try:
        db = request.app.mongodb
        student_context = get_student_branch_context(current_user)
        
        student_id = ObjectId(student_context["student_id"])
        branch_code = student_context["branch_code"]
        franchise_code = student_context["franchise_code"]
        
        # Create branch filter
        branch_filter = {
            "branch_code": branch_code,
            "franchise_code": franchise_code
        }
        
        courses = []
        seen_course_ids = set()
        
        # FIRST: Get the student's primary course from their student record
        student = db.branch_students.find_one({"_id": student_id})
        if student:
            student_course_name = student.get("course", student.get("course_name"))
            print(f"📚 [COURSES] Student primary course: {student_course_name}")
            
            if student_course_name:
                # Find the course in branch_courses collection
                course = db.branch_courses.find_one({
                    "course_name": student_course_name,
                    "branch_code": branch_code,
                    "franchise_code": franchise_code
                })
                
                if course:
                    course_id = str(course["_id"])
                    seen_course_ids.add(course_id)
                    courses.append({
                        "id": course_id,
                        "_id": course_id,
                        "title": course.get("course_name", course.get("title")),
                        "description": course.get("description", ""),
                        "instructor": course.get("instructor", ""),
                        "progress": 0,
                        "status": "In Progress",
                        "enrolled_at": student.get("date_of_admission", student.get("created_at")),
                        "admission_date": student.get("date_of_admission"),
                        "branch_code": course.get("branch_code"),
                        "franchise_code": course.get("franchise_code"),
                        "course_code": course.get("course_code"),
                        "duration_months": course.get("duration_months"),
                        "fee": course.get("fee"),
                        "batch": student.get("batch", student.get("batch_name"))
                    })
                    print(f"✅ [COURSES] Added primary course: {course.get('course_name')}")
                else:
                    print(f"⚠️ [COURSES] Primary course not found in branch_courses: {student_course_name}")
        
        # SECOND: Get additional courses from enrollments collection
        enrollment_collection = get_enrollment_collection(db)
        
        enrollments = list(enrollment_collection.find({
            "student_id": student_id,
            **branch_filter
        }))
        
        print(f"📚 [COURSES] Found {len(enrollments)} enrollments in enrollments collection")
        
        for enrollment in enrollments:
            course_id_obj = enrollment.get("course_id")
            if course_id_obj:
                course_id_str = str(course_id_obj)
                
                # Skip if already added from primary course
                if course_id_str in seen_course_ids:
                    continue
                    
                seen_course_ids.add(course_id_str)
                
                # Try to find in branch_courses first, then regular courses
                course = db.branch_courses.find_one({"_id": course_id_obj})
                if not course:
                    course = db.courses.find_one({"_id": course_id_obj})
                
                if course:
                    courses.append({
                        "id": course_id_str,
                        "_id": course_id_str,
                        "title": course.get("course_name", course.get("title")),
                        "description": course.get("description", ""),
                        "instructor": course.get("instructor", ""),
                        "progress": enrollment.get("progress", 0),
                        "status": "Completed" if enrollment.get("completed", False) else "In Progress",
                        "enrolled_at": enrollment.get("enrolled_at", enrollment.get("enrollment_date")),
                        "branch_code": course.get("branch_code"),
                        "franchise_code": course.get("franchise_code"),
                        "course_code": course.get("course_code"),
                        "duration_months": course.get("duration_months"),
                        "fee": course.get("fee")
                    })
        
        print(f"✅ [COURSES] Returning {len(courses)} total courses")
        
        return {
            "success": True,
            "courses": courses,
            "total": len(courses),
            "branch_info": {
                "branch_code": branch_code,
                "franchise_code": franchise_code
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Branch student courses error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve courses")

@branch_student_dashboard_router.get("/assignments")
async def get_branch_student_assignments(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get assignments for branch student"""
    try:
        db = request.app.mongodb
        student_context = get_student_branch_context(current_user)
        
        student_id = ObjectId(student_context["student_id"])
        branch_code = student_context["branch_code"]
        franchise_code = student_context["franchise_code"]
        
        # Create branch filter
        branch_filter = {
            "branch_code": branch_code,
            "franchise_code": franchise_code
        }
        
        # Get student's enrolled courses first
        enrollment_collection = get_enrollment_collection(db)
        enrollments = list(enrollment_collection.find({
            "student_id": student_id,
            **branch_filter
        }))
        enrolled_course_ids = [e["course_id"] for e in enrollments if "course_id" in e]
        
        # Get assignments for enrolled courses
        assignment_collection = get_assignment_collection(db)
        submission_collection = get_submission_collection(db)
        
        assignments = list(assignment_collection.find({
            "course_id": {"$in": enrolled_course_ids} if enrolled_course_ids else {},
            **branch_filter
        }))
        
        # Get submissions
        submissions = list(submission_collection.find({
            "student_id": student_id,
            **branch_filter
        }))
        
        assignment_data = []
        for assignment in assignments:
            submission = next((s for s in submissions if s.get("assignment_id") == assignment["_id"]), None)
            
            assignment_data.append({
                "id": str(assignment["_id"]),
                "title": assignment.get("title"),
                "description": assignment.get("description"),
                "due_date": assignment.get("due_date"),
                "course_id": str(assignment.get("course_id", "")),
                "status": "Submitted" if submission else "Pending",
                "score": submission.get("score") if submission else None,
                "submitted_at": submission.get("submitted_at") if submission else None,
                "branch_code": assignment.get("branch_code"),
                "franchise_code": assignment.get("franchise_code")
            })
        
        return {
            "success": True,
            "assignments": assignment_data,
            "total": len(assignment_data),
            "branch_info": {
                "branch_code": branch_code,
                "franchise_code": franchise_code
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Branch student assignments error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve assignments")

@branch_student_dashboard_router.get("/quizzes")
async def get_branch_student_quizzes(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get quizzes for branch student"""
    try:
        db = request.app.mongodb
        student_context = get_student_branch_context(current_user)
        
        student_id = ObjectId(student_context["student_id"])
        branch_code = student_context["branch_code"]
        franchise_code = student_context["franchise_code"]
        
        # Create branch filter
        branch_filter = {
            "branch_code": branch_code,
            "franchise_code": franchise_code
        }
        
        # Get student's enrolled courses
        enrollment_collection = get_enrollment_collection(db)
        enrollments = list(enrollment_collection.find({
            "student_id": student_id,
            **branch_filter
        }))
        enrolled_course_ids = [e["course_id"] for e in enrollments if "course_id" in e]
        
        # Get quizzes for enrolled courses
        quiz_collection = get_quiz_collection(db)
        quiz_attempt_collection = get_quiz_attempt_collection(db)
        
        quizzes = list(quiz_collection.find({
            "course_id": {"$in": enrolled_course_ids} if enrolled_course_ids else {},
            **branch_filter
        }))
        
        # Get attempts
        attempts = list(quiz_attempt_collection.find({
            "student_id": student_id,
            **branch_filter
        }))
        
        quiz_data = []
        for quiz in quizzes:
            attempt = next((a for a in attempts if a.get("quiz_id") == quiz["_id"]), None)
            
            quiz_data.append({
                "id": str(quiz["_id"]),
                "title": quiz.get("title"),
                "description": quiz.get("description"),
                "time_limit": quiz.get("time_limit", 0),
                "total_questions": quiz.get("total_questions", 0),
                "course_id": str(quiz.get("course_id", "")),
                "status": "Completed" if attempt else "Available",
                "score": attempt.get("score") if attempt else None,
                "completed_at": attempt.get("completed_at") if attempt else None,
                "branch_code": quiz.get("branch_code"),
                "franchise_code": quiz.get("franchise_code")
            })
        
        return {
            "success": True,
            "quizzes": quiz_data,
            "total": len(quiz_data),
            "branch_info": {
                "branch_code": branch_code,
                "franchise_code": franchise_code
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Branch student quizzes error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve quizzes")

@branch_student_dashboard_router.get("/study-materials")
async def get_branch_student_study_materials(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get study materials for branch student"""
    try:
        db = request.app.mongodb
        student_context = get_student_branch_context(current_user)
        
        branch_code = student_context["branch_code"]
        franchise_code = student_context["franchise_code"]
        
        # Create branch filter
        branch_filter = {
            "branch_code": branch_code,
            "franchise_code": franchise_code
        }
        
        # Get study materials for this branch
        study_materials = list(db.study_materials.find(branch_filter))
        
        material_data = []
        for material in study_materials:
            material_data.append({
                "id": str(material["_id"]),
                "title": material.get("title"),
                "description": material.get("description"),
                "file_url": material.get("file_url"),
                "file_type": material.get("file_type"),
                "subject": material.get("subject"),
                "uploaded_at": material.get("uploaded_at"),
                "branch_code": material.get("branch_code"),
                "franchise_code": material.get("franchise_code")
            })
        
        return {
            "success": True,
            "study_materials": material_data,
            "total": len(material_data),
            "branch_info": {
                "branch_code": branch_code,
                "franchise_code": franchise_code
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Branch student study materials error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve study materials")

@branch_student_dashboard_router.get("/video-classes")
async def get_branch_student_video_classes(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get video classes for branch student"""
    try:
        db = request.app.mongodb
        student_context = get_student_branch_context(current_user)
        
        branch_code = student_context["branch_code"]
        franchise_code = student_context["franchise_code"]
        
        # Create branch filter
        branch_filter = {
            "branch_code": branch_code,
            "franchise_code": franchise_code
        }
        
        # Get video classes for this branch
        video_classes = list(db.video_classes.find(branch_filter))
        
        video_data = []
        for video in video_classes:
            video_data.append({
                "id": str(video["_id"]),
                "title": video.get("title"),
                "description": video.get("description"),
                "video_url": video.get("video_url"),
                "duration": video.get("duration"),
                "subject": video.get("subject"),
                "instructor": video.get("instructor"),
                "uploaded_at": video.get("uploaded_at"),
                "branch_code": video.get("branch_code"),
                "franchise_code": video.get("franchise_code")
            })
        
        return {
            "success": True,
            "video_classes": video_data,
            "total": len(video_data),
            "branch_info": {
                "branch_code": branch_code,
                "franchise_code": franchise_code
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Branch student video classes error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve video classes")

@branch_student_dashboard_router.get("/profile")
async def get_branch_student_profile(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get profile data for branch student"""
    try:
        db = request.app.mongodb
        student_context = get_student_branch_context(current_user)
        
        print(f"[BRANCH STUDENT PROFILE] Student context: {student_context}")
        
        student_id = ObjectId(student_context["student_id"])
        branch_code = student_context["branch_code"]
        franchise_code = student_context["franchise_code"]
        
        # Get student data from branch_students collection
        student = db.branch_students.find_one({
            "_id": student_id,
            "branch_code": branch_code,
            "franchise_code": franchise_code
        })
        
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        
        print(f"[BRANCH STUDENT PROFILE] Found student data: {student}")
        
        # Get branch details
        branch = db.branches.find_one({
            "branch_code": branch_code,
            "franchise_code": franchise_code
        })
        
        # Calculate fee details - using actual field names from database
        total_fee = student.get("total_fee", 0)
        paid_amount = student.get("paid_amount", 0)
        due_amount = total_fee - paid_amount
        
        # Get enrollment count
        enrollment_collection = get_enrollment_collection(db)
        enrollment_count = enrollment_collection.count_documents({
            "student_id": student_id,
            "branch_code": branch_code
        })
        
        # Format profile data - using actual database field names
        # Database has: student_name, course (not course_name), contact_no, etc.
        profile_data = {
            "id": str(student["_id"]),
            "name": student.get("name") or student.get("student_name", ""),  # Try both field names
            "email": student.get("email") or student.get("email_id", ""),  # Try both field names
            "status": student.get("status") or student.get("admission_status", "Active"),  # Use status or admission_status
            "admission_status": student.get("admission_status", ""),
            "registrationNo": student.get("registration_number", ""),  # Changed from student_id
            "student_id": student.get("student_id", ""),  # UUID student ID
            "branch": branch.get("branch_name", branch_code) if branch else branch_code,
            "branch_code": branch_code,
            "franchise_code": franchise_code,
            "mobile": student.get("contact_no") or student.get("contact_number", ""),  # Try both field names
            "phone": student.get("contact_no") or student.get("contact_number", ""),
            "doj": student.get("created_at", ""),  # Use created_at as joining date
            "course": student.get("course") or student.get("course_name", ""),  # Try course first, then course_name
            "courseName": student.get("course") or student.get("course_name", ""),
            "batch": student.get("batch") or student.get("batch_name", ""),
            "batchName": student.get("batch") or student.get("batch_name", ""),
            "father": student.get("father_name", ""),
            "fatherName": student.get("father_name", ""),
            "fatherPhone": student.get("father_phone", ""),
            "motherName": student.get("mother_name", ""),
            "dob": student.get("date_of_birth", ""),  # Changed from dob
            "dateOfBirth": student.get("date_of_birth", ""),
            "gender": student.get("gender", ""),
            "address": student.get("address", ""),
            "category": student.get("category", ""),
            "joiningDate": student.get("created_at", ""),
            "admission_year": student.get("admission_year", ""),
            "totalFee": total_fee,
            "paidAmount": paid_amount,
            "dueAmount": due_amount,
            "enrolledCourses": enrollment_count,
            "lastLogin": student.get("last_login", ""),
            "createdAt": student.get("created_at", ""),
            "updatedAt": student.get("updated_at", ""),
            "updatedBy": student.get("updated_by", ""),
            "student_info": {
                "student_id": str(student["_id"]),
                "student_name": student.get("name"),
                "registration_number": student.get("registration_number"),
                "branch_code": branch_code,
                "franchise_code": franchise_code,
                "is_branch_student": True
            }
        }
        
        print(f"[BRANCH STUDENT PROFILE] Returning profile data: {profile_data}")
        
        return {
            "success": True,
            "data": profile_data,
            "message": "Profile retrieved successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Branch student profile error: {str(e)}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve profile: {str(e)}")