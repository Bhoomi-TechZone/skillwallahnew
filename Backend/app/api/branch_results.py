from fastapi import APIRouter, HTTPException, Depends, Request, Query
from bson import ObjectId
from datetime import datetime
from typing import Optional, List
import logging
from app.config import settings
from app.utils.auth_helpers import get_current_user
from app.utils.multi_tenant import MultiTenantManager

router = APIRouter(prefix="/api/branch-results", tags=["Branch Results"])
logger = logging.getLogger("uvicorn")

# Pydantic models for results
from pydantic import BaseModel

class ResultCreate(BaseModel):
    student_name: str
    student_id: str
    test_name: str
    paper_set_id: Optional[str] = None
    total_questions: int
    attempted_questions: int
    correct_answers: int
    wrong_answers: int
    total_marks: int
    obtained_marks: int
    percentage: float
    status: str  # passed, failed
    time_taken: Optional[int] = None  # in seconds
    branch_code: Optional[str] = None
    franchise_code: Optional[str] = None

class ResultResponse(BaseModel):
    id: str
    student_name: str
    student_id: str
    test_name: str
    paper_set_id: Optional[str] = None
    total_questions: int
    attempted_questions: int
    left_questions: int
    correct_answers: int
    wrong_answers: int
    total_marks: int
    obtained_marks: int
    percentage: float
    status: str
    time_taken: Optional[int] = None
    created_at: str
    branch_code: str
    franchise_code: str

@router.get("/results")
async def get_results(
    request: Request, 
    current_user = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    student_name: Optional[str] = Query(None),
    test_name: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    """Get all results for the current branch with pagination and filters"""
    try:
        logger.info(f"📊 [RESULTS API] Getting results for user: {current_user.get('email')}")
        
        # Connect to database
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get user role and franchise info
        user_role = current_user.get("role")
        user_franchise_code = current_user.get("franchise_code")
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        branch_code = context["branch_code"]
        franchise_code = context["franchise_code"]
        
        logger.info(f"📊 [RESULTS API] User: {current_user.get('email')} | Role: {user_role} | Franchise: {user_franchise_code}")
        
        # Build filter query based on role and access level
        if user_role in ["franchise_admin", "admin", "branch_admin"] or current_user.get("is_branch_admin"):
            if user_franchise_code:
                # Show results from their franchise using multiple field matches
                query = {
                    "$or": [
                        {"franchise_code": user_franchise_code},  # Direct match
                        {"branch_code": user_franchise_code},     # Legacy data
                        {"branch_code": branch_code},            # Current branch
                        {"franchise_code": franchise_code}        # Current franchise
                    ]
                }
                logger.info(f"📊 [RESULTS API] Using franchise filter for {user_role}: {query}")
            else:
                # If no franchise code, show results for current branch
                query = {"branch_code": branch_code}
                logger.info(f"📊 [RESULTS API] Using branch filter: {query}")
        else:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied for role: {user_role}"
            )
        
        # Add additional filters
        if student_name:
            query["student_name"] = {"$regex": student_name, "$options": "i"}
        if test_name:
            query["test_name"] = {"$regex": test_name, "$options": "i"}
        if status:
            query["status"] = status
        
        logger.info(f"📊 [RESULTS API] Final query: {query}")
        
        # Get results from database with pagination
        results_collection = db.branch_results
        
        # Get total count
        total_count = results_collection.count_documents(query)
        
        # Get paginated results
        skip = (page - 1) * limit
        results_cursor = results_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        results = []
        
        for result in results_cursor:
            total_questions = result.get("total_questions", 0)
            correct_answers = result.get("correct_answers", 0)
            attempted_questions = result.get("attempted_questions", 0)
            
            # Calculate percentage
            percentage = (correct_answers / total_questions * 100) if total_questions > 0 else 0
            
            # Determine status based on percentage and attempt
            if attempted_questions == 0:
                status = "Not Attempted"
            elif percentage >= 60:  # Pass mark is 60%
                status = "Passed"
            elif percentage >= 40:  # Grace mark
                status = "Grace"
            else:
                status = "Failed"
            
            # Get student details for proper registration number
            student_registration = result.get("student_registration")
            if not student_registration and result.get("student_id"):
                # Try to find student from branch_students collection
                try:
                    student_info = db.branch_students.find_one({"_id": ObjectId(result.get("student_id"))})
                    if student_info:
                        student_registration = student_info.get("registration_number")
                        logger.info(f"📋 Found student registration: {student_registration} for student_id: {result.get('student_id')}")
                    else:
                        # If not found in branch_students, try by student_id field
                        student_info = db.branch_students.find_one({"student_id": result.get("student_id")})
                        if student_info:
                            student_registration = student_info.get("registration_number")
                except Exception as e:
                    logger.warning(f"⚠️ Could not fetch student registration for {result.get('student_id')}: {e}")
                    student_registration = result.get("student_id")  # Fallback to student_id
            
            result_data = {
                "id": str(result["_id"]),
                "student_name": result.get("student_name"),
                "student_id": result.get("student_id"),
                "student_registration": student_registration or result.get("student_id"),
                "test_name": result.get("test_name"),
                "paper_name": result.get("paper_name") or result.get("test_name"),
                "paper_set_id": result.get("paper_set_id"),
                "total_questions": total_questions,
                "attempted_questions": attempted_questions,
                "left_questions": total_questions - attempted_questions,
                "correct_answers": correct_answers,
                "wrong_answers": result.get("wrong_answers", 0),
                "total_marks": result.get("total_marks", 0),
                "obtained_marks": result.get("obtained_marks", 0),
                "percentage": round(percentage, 2),
                "status": result.get("status") or status,  # Use stored status or calculated
                "grade": result.get("grade") or ("A" if percentage >= 80 else "B" if percentage >= 60 else "C" if percentage >= 40 else "F"),
                "time_taken": result.get("time_taken"),
                "created_at": result.get("created_at", datetime.utcnow().isoformat()),
                "exam_date": result.get("exam_date") or result.get("created_at", datetime.utcnow().isoformat()),
                "branch_code": result.get("branch_code"),
                "franchise_code": result.get("franchise_code")
            }
            results.append(result_data)
        
        total_pages = (total_count + limit - 1) // limit
        
        logger.info(f"📊 [RESULTS API] Found {len(results)} results, page {page}/{total_pages}")
        
        return {
            "success": True,
            "data": results,
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "branch_code": branch_code
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"📊 [RESULTS API] Error getting results: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting results: {str(e)}")

@router.post("/results", response_model=dict)
async def create_result(
    result_data: ResultCreate,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Create a new result entry"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Create result document
        result_doc = {
            "_id": ObjectId(),
            **result_data.dict(),
            "left_questions": result_data.total_questions - result_data.attempted_questions,
            "branch_code": context["branch_code"],
            "franchise_code": context["franchise_code"],
            "created_at": datetime.utcnow().isoformat(),
            "created_by": current_user.get("email")
        }
        
        # Insert result
        result = db.branch_results.insert_one(result_doc)
        
        if result.inserted_id:
            return {
                "success": True,
                "message": "Result created successfully",
                "result_id": str(result.inserted_id)
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create result")
            
    except Exception as e:
        logger.error(f"📊 [RESULTS API] Error creating result: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating result: {str(e)}")

@router.get("/student-results", response_model=dict)
async def get_student_results(
    request: Request,
    current_user = Depends(get_current_user)
):
    """Get all test results for the current logged-in student"""
    try:
        logger.info(f"📊 [STUDENT RESULTS API] Getting results for student: {current_user.get('email')}")
        
        db = request.app.mongodb
        
        # Get student information
        student_id = current_user.get("user_id") or str(current_user.get("_id", ""))
        student_email = current_user.get("email")
        student_branch_code = current_user.get("branch_code")
        student_franchise_code = current_user.get("franchise_code")
        
        logger.info(f"📊 [STUDENT RESULTS API] Student ID: {student_id}, Email: {student_email}")
        
        # Build query to find student's results
        query = {
            "$or": [
                {"student_id": student_id},
                {"student_email": student_email},
                {"email": student_email},
                {"user_id": student_id}
            ]
        }
        
        # Search in multiple collections for results
        all_results = []
        
        # 1. Check branch_results collection
        results_cursor = db.branch_results.find(query).sort("created_at", -1)
        for result in results_cursor:
            all_results.append(format_result_for_student(result))
        
        # 2. Check quiz_attempts collection for quiz results
        quiz_attempts_cursor = db.quiz_attempts.find(query).sort("created_at", -1)
        for attempt in quiz_attempts_cursor:
            all_results.append(format_quiz_attempt_for_student(attempt, db))
        
        # 3. Check exam_results collection
        exam_results_cursor = db.exam_results.find(query).sort("created_at", -1)
        for exam_result in exam_results_cursor:
            all_results.append(format_result_for_student(exam_result))
        
        # 4. Check test_submissions collection
        test_submissions_cursor = db.test_submissions.find(query).sort("submitted_at", -1)
        for submission in test_submissions_cursor:
            all_results.append(format_test_submission_for_student(submission, db))
        
        # Remove duplicates based on test/quiz name and date
        seen = set()
        unique_results = []
        for result in all_results:
            key = f"{result.get('test_name', '')}_{result.get('exam_date', '')}"
            if key not in seen:
                seen.add(key)
                unique_results.append(result)
        
        # Sort by date (newest first)
        unique_results.sort(key=lambda x: x.get('exam_date', ''), reverse=True)
        
        logger.info(f"📊 [STUDENT RESULTS API] Found {len(unique_results)} results for student")
        
        return {
            "success": True,
            "results": unique_results,
            "total": len(unique_results)
        }
        
    except Exception as e:
        logger.error(f"📊 [STUDENT RESULTS API] Error getting student results: {str(e)}")
        import traceback
        logger.error(f"📊 [STUDENT RESULTS API] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error getting results: {str(e)}")

def format_result_for_student(result):
    """Format a result document for student view"""
    total_questions = result.get("total_questions", 0)
    correct_answers = result.get("correct_answers", 0)
    attempted_questions = result.get("attempted_questions", 0)
    
    # Calculate percentage
    percentage = (correct_answers / total_questions * 100) if total_questions > 0 else 0
    
    # Determine status
    if attempted_questions == 0:
        status = "Not Attempted"
    elif percentage >= 60:
        status = "Passed"
    elif percentage >= 40:
        status = "Grace"
    else:
        status = "Failed"
    
    return {
        "id": str(result.get("_id", "")),
        "test_name": result.get("test_name") or result.get("paper_name") or result.get("quiz_name") or "Test",
        "paper_name": result.get("paper_name") or result.get("test_name") or "Test",
        "total_questions": total_questions,
        "attempted_questions": attempted_questions,
        "correct_answers": correct_answers,
        "wrong_answers": result.get("wrong_answers", total_questions - correct_answers),
        "total_marks": result.get("total_marks", total_questions),
        "obtained_marks": result.get("obtained_marks", correct_answers),
        "percentage": round(percentage, 2),
        "status": result.get("status") or status,
        "grade": result.get("grade") or ("A" if percentage >= 80 else "B" if percentage >= 60 else "C" if percentage >= 40 else "F"),
        "time_taken": result.get("time_taken"),
        "exam_date": result.get("created_at") or result.get("exam_date") or datetime.utcnow().isoformat(),
        "subject": result.get("subject", ""),
        "course": result.get("course", "")
    }

def format_quiz_attempt_for_student(attempt, db):
    """Format a quiz attempt for student view"""
    # Get quiz details if available
    quiz_id = attempt.get("quiz_id")
    quiz_name = attempt.get("quiz_title") or "Quiz"
    
    if quiz_id:
        try:
            quiz = db.quizzes.find_one({"_id": ObjectId(quiz_id)})
            if quiz:
                quiz_name = quiz.get("title", quiz_name)
        except:
            pass
    
    total_questions = attempt.get("total_questions", 0)
    correct_answers = attempt.get("correct_answers", 0)
    score = attempt.get("score", 0)
    
    # Calculate percentage
    percentage = attempt.get("percentage", 0)
    if not percentage and total_questions > 0:
        percentage = (correct_answers / total_questions * 100)
    
    return {
        "id": str(attempt.get("_id", "")),
        "test_name": quiz_name,
        "paper_name": quiz_name,
        "total_questions": total_questions,
        "attempted_questions": attempt.get("attempted", total_questions),
        "correct_answers": correct_answers,
        "wrong_answers": attempt.get("wrong_answers", total_questions - correct_answers),
        "total_marks": attempt.get("total_marks", total_questions),
        "obtained_marks": attempt.get("score", correct_answers),
        "percentage": round(percentage, 2),
        "status": attempt.get("status") or ("Passed" if percentage >= 60 else "Failed"),
        "grade": attempt.get("grade") or ("A" if percentage >= 80 else "B" if percentage >= 60 else "C" if percentage >= 40 else "F"),
        "time_taken": attempt.get("time_taken"),
        "exam_date": attempt.get("submitted_at") or attempt.get("created_at") or datetime.utcnow().isoformat(),
        "subject": attempt.get("subject", ""),
        "course": attempt.get("course", "")
    }

def format_test_submission_for_student(submission, db):
    """Format a test submission for student view"""
    paper_id = submission.get("paper_id") or submission.get("paper_set_id")
    paper_name = submission.get("paper_name") or "Test"
    
    if paper_id:
        try:
            paper = db.paper_sets.find_one({"_id": ObjectId(paper_id)})
            if paper:
                paper_name = paper.get("name") or paper.get("paper_name", paper_name)
        except:
            pass
    
    total_questions = submission.get("total_questions", 0)
    correct_answers = submission.get("correct_answers", 0)
    
    # Calculate percentage
    percentage = submission.get("percentage", 0)
    if not percentage and total_questions > 0:
        percentage = (correct_answers / total_questions * 100)
    
    return {
        "id": str(submission.get("_id", "")),
        "test_name": paper_name,
        "paper_name": paper_name,
        "total_questions": total_questions,
        "attempted_questions": submission.get("attempted_questions", total_questions),
        "correct_answers": correct_answers,
        "wrong_answers": submission.get("wrong_answers", total_questions - correct_answers),
        "total_marks": submission.get("total_marks", total_questions),
        "obtained_marks": submission.get("obtained_marks", correct_answers),
        "percentage": round(percentage, 2),
        "status": submission.get("status") or ("Passed" if percentage >= 60 else "Failed"),
        "grade": submission.get("grade") or ("A" if percentage >= 80 else "B" if percentage >= 60 else "C" if percentage >= 40 else "F"),
        "time_taken": submission.get("time_taken"),
        "exam_date": submission.get("submitted_at") or submission.get("created_at") or datetime.utcnow().isoformat(),
        "subject": submission.get("subject", ""),
        "course": submission.get("course", "")
    }

@router.get("/results/{result_id}", response_model=dict)
async def get_result_by_id(
    result_id: str,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Get a specific result by ID"""
    try:
        logger.info(f"📊 [RESULTS API] Getting result: {result_id}")
        
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        branch_code = context["branch_code"]
        franchise_code = context["franchise_code"]
        
        # Find result with multi-tenant filtering
        result = db.branch_results.find_one({
            "_id": ObjectId(result_id),
            "$or": [
                {"branch_code": branch_code},
                {"franchise_code": franchise_code}
            ]
        })
        
        if not result:
            raise HTTPException(status_code=404, detail="Result not found")
        
        # Convert ObjectId to string
        result["id"] = str(result["_id"])
        del result["_id"]
        
        logger.info(f"📊 [RESULTS API] Result found: {result.get('student_name')}")
        
        return {
            "success": True,
            "data": result
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"📊 [RESULTS API] Error getting result: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting result: {str(e)}")

@router.delete("/results/{result_id}", response_model=dict)
async def delete_result(
    result_id: str,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Delete a specific result by ID"""
    try:
        logger.info(f"🗑️ [RESULTS API] Deleting result: {result_id}")
        
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        branch_code = context["branch_code"]
        franchise_code = context["franchise_code"]
        
        # Check if result exists and belongs to user's branch/franchise
        result = db.branch_results.find_one({
            "_id": ObjectId(result_id),
            "$or": [
                {"branch_code": branch_code},
                {"franchise_code": franchise_code}
            ]
        })
        
        if not result:
            raise HTTPException(status_code=404, detail="Result not found or not authorized to delete")
        
        # Delete the result
        delete_result = db.branch_results.delete_one({
            "_id": ObjectId(result_id),
            "$or": [
                {"branch_code": branch_code},
                {"franchise_code": franchise_code}
            ]
        })
        
        if delete_result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Result not found or already deleted")
        
        logger.info(f"✅ [RESULTS API] Result deleted successfully: {result_id}")
        
        return {
            "success": True,
            "message": "Result deleted successfully",
            "deleted_id": result_id
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"🗑️ [RESULTS API] Error deleting result: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting result: {str(e)}")