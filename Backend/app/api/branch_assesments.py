from fastapi import APIRouter, HTTPException, Request, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from bson import ObjectId
from app.config import settings
from app.utils.auth_helpers_enhanced import get_current_user
from app.utils.multi_tenant import MultiTenantManager
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger("uvicorn")

router = APIRouter(prefix="/api/branch-assessments", tags=["Branch Assessment Management"])

# Assessment Models
class QuestionCreate(BaseModel):
    question_text: str
    question_type: str = "multiple_choice"  # multiple_choice, true_false, short_answer, essay, fill_blank
    options: Optional[List[str]] = []  # For multiple choice questions
    correct_answer: str
    marks: int = 1
    difficulty: str = "medium"  # easy, medium, hard
    explanation: Optional[str] = ""
    tags: Optional[str] = ""

class PaperSetCreate(BaseModel):
    paper_name: str
    paper_code: str
    program_id: Optional[str] = None
    course_id: Optional[str] = None
    subject_id: Optional[str] = None
    batch_id: Optional[str] = None
    exam_type: str = "quiz"  # quiz, mid_term, final_exam, assignment
    duration_minutes: int = 60
    total_marks: int = 100
    pass_marks: int = 40
    instructions: Optional[str] = ""
    questions: List[QuestionCreate] = []
    status: str = "draft"  # draft, published, archived

class ExamScheduleCreate(BaseModel):
    paper_id: str
    exam_date: str
    start_time: str
    end_time: str
    venue: Optional[str] = ""
    invigilator: Optional[str] = ""
    instructions: Optional[str] = ""
    status: str = "scheduled"  # scheduled, ongoing, completed, cancelled

class ResultCreate(BaseModel):
    student_id: str
    paper_id: str
    exam_schedule_id: Optional[str] = None
    marks_obtained: float
    total_marks: float
    percentage: float
    grade: Optional[str] = ""
    status: str = "pass"  # pass, fail, absent
    remarks: Optional[str] = ""
    answers: Optional[Dict[str, Any]] = {}

class PaperSetResponse(BaseModel):
    id: str
    paper_name: str
    paper_code: str
    program_id: Optional[str] = None
    program_name: Optional[str] = None
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    subject_id: Optional[str] = None
    subject_name: Optional[str] = None
    batch_id: Optional[str] = None
    batch_name: Optional[str] = None
    exam_type: str
    duration_minutes: int
    total_marks: int
    pass_marks: int
    instructions: str
    total_questions: int
    status: str
    branch_code: str
    franchise_code: str
    created_at: str
    updated_at: str

class ExamScheduleResponse(BaseModel):
    id: str
    paper_id: str
    paper_name: str
    exam_date: str
    start_time: str
    end_time: str
    venue: str
    invigilator: str
    instructions: str
    total_students: int = 0
    appeared_students: int = 0
    status: str
    branch_code: str
    franchise_code: str
    created_at: str

class ResultResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    student_registration: str
    paper_id: str
    paper_name: str
    exam_schedule_id: Optional[str] = None
    marks_obtained: float
    total_marks: float
    percentage: float
    grade: str
    status: str
    remarks: str
    exam_date: Optional[str] = None
    branch_code: str
    franchise_code: str
    created_at: str

@router.post("/papers", response_model=PaperSetResponse)
async def create_paper_set(
    paper_data: PaperSetCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a new paper set for the branch"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Check if paper code already exists in this branch
        existing_paper = db.branch_paper_sets.find_one({
            "paper_code": paper_data.paper_code,
            "franchise_code": context["franchise_code"]
        })
        
        if existing_paper:
            raise HTTPException(
                status_code=400,
                detail=f"Paper with code {paper_data.paper_code} already exists in this branch"
            )
        
        # Get related entity details
        program_name = None
        course_name = None
        subject_name = None
        batch_name = None
        
        if paper_data.program_id:
            program = db.branch_programs.find_one({
                "_id": ObjectId(paper_data.program_id),
                "franchise_code": context["franchise_code"]
            })
            if program:
                program_name = program.get("program_name")
        
        if paper_data.course_id:
            course = db.branch_courses.find_one({
                "_id": ObjectId(paper_data.course_id),
                "franchise_code": context["franchise_code"]
            })
            if course:
                course_name = course.get("course_name")
        
        if paper_data.subject_id:
            subject = db.branch_subjects.find_one({
                "_id": ObjectId(paper_data.subject_id),
                "franchise_code": context["franchise_code"]
            })
            if subject:
                subject_name = subject.get("subject_name")
        
        if paper_data.batch_id:
            batch = db.branch_batches.find_one({
                "_id": ObjectId(paper_data.batch_id),
                "franchise_code": context["franchise_code"]
            })
            if batch:
                batch_name = batch.get("batch_name")
        
        # Create paper set document
        paper_doc = {
            "_id": ObjectId(),
            "paper_name": paper_data.paper_name,
            "paper_code": paper_data.paper_code,
            "program_id": paper_data.program_id,
            "program_name": program_name,
            "course_id": paper_data.course_id,
            "course_name": course_name,
            "subject_id": paper_data.subject_id,
            "subject_name": subject_name,
            "batch_id": paper_data.batch_id,
            "batch_name": batch_name,
            "exam_type": paper_data.exam_type,
            "duration_minutes": paper_data.duration_minutes,
            "total_marks": paper_data.total_marks,
            "pass_marks": paper_data.pass_marks,
            "instructions": paper_data.instructions or "",
            "questions": [q.dict() for q in paper_data.questions],
            "total_questions": len(paper_data.questions),
            "status": paper_data.status,
            "franchise_code": context["franchise_code"],
            "branch_code": context["branch_code"],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "created_by": context["user_id"]
        }
        
        # Insert paper set
        result = db.branch_paper_sets.insert_one(paper_doc)
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to create paper set")
        
        return PaperSetResponse(
            id=str(result.inserted_id),
            paper_name=paper_data.paper_name,
            paper_code=paper_data.paper_code,
            program_id=paper_data.program_id,
            program_name=program_name,
            course_id=paper_data.course_id,
            course_name=course_name,
            subject_id=paper_data.subject_id,
            subject_name=subject_name,
            batch_id=paper_data.batch_id,
            batch_name=batch_name,
            exam_type=paper_data.exam_type,
            duration_minutes=paper_data.duration_minutes,
            total_marks=paper_data.total_marks,
            pass_marks=paper_data.pass_marks,
            instructions=paper_data.instructions or "",
            total_questions=len(paper_data.questions),
            status=paper_data.status,
            branch_code=context["branch_code"],
            franchise_code=context["franchise_code"],
            created_at=paper_doc["created_at"],
            updated_at=paper_doc["updated_at"]
        )
        
    except Exception as e:
        print(f"Error creating paper set: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/papers", response_model=List[PaperSetResponse])
async def get_paper_sets(
    request: Request,
    program_id: Optional[str] = None,
    course_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    batch_id: Optional[str] = None,
    exam_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all paper sets for the branch with optional filtering"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Build filter query
        filter_query = {"franchise_code": context["franchise_code"]}
        
        if program_id:
            filter_query["program_id"] = program_id
        if course_id:
            filter_query["course_id"] = course_id
        if subject_id:
            filter_query["subject_id"] = subject_id
        if batch_id:
            filter_query["batch_id"] = batch_id
        if exam_type:
            filter_query["exam_type"] = exam_type
        if status:
            filter_query["status"] = status
        
        # Get paper sets
        papers_cursor = db.branch_paper_sets.find(filter_query)
        papers = []
        
        for paper in papers_cursor:
            papers.append(PaperSetResponse(
                id=str(paper["_id"]),
                paper_name=paper["paper_name"],
                paper_code=paper["paper_code"],
                program_id=paper.get("program_id"),
                program_name=paper.get("program_name"),
                course_id=paper.get("course_id"),
                course_name=paper.get("course_name"),
                subject_id=paper.get("subject_id"),
                subject_name=paper.get("subject_name"),
                batch_id=paper.get("batch_id"),
                batch_name=paper.get("batch_name"),
                exam_type=paper["exam_type"],
                duration_minutes=paper["duration_minutes"],
                total_marks=paper["total_marks"],
                pass_marks=paper["pass_marks"],
                instructions=paper.get("instructions", ""),
                total_questions=paper.get("total_questions", 0),
                status=paper["status"],
                branch_code=paper["branch_code"],
                franchise_code=paper["franchise_code"],
                created_at=paper["created_at"],
                updated_at=paper["updated_at"]
            ))
        
        return papers
        
    except Exception as e:
        print(f"Error fetching paper sets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/exams", response_model=ExamScheduleResponse)
async def schedule_exam(
    exam_data: ExamScheduleCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Schedule an exam for a paper set"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Verify paper exists
        paper = db.branch_paper_sets.find_one({
            "_id": ObjectId(exam_data.paper_id),
            "franchise_code": context["franchise_code"]
        })
        
        if not paper:
            raise HTTPException(status_code=404, detail="Paper set not found")
        
        # Create exam schedule document
        exam_doc = {
            "_id": ObjectId(),
            "paper_id": exam_data.paper_id,
            "paper_name": paper["paper_name"],
            "exam_date": exam_data.exam_date,
            "start_time": exam_data.start_time,
            "end_time": exam_data.end_time,
            "venue": exam_data.venue or "",
            "invigilator": exam_data.invigilator or "",
            "instructions": exam_data.instructions or "",
            "status": exam_data.status,
            "franchise_code": context["franchise_code"],
            "branch_code": context["branch_code"],
            "created_at": datetime.utcnow().isoformat(),
            "created_by": context["user_id"]
        }
        
        # Insert exam schedule
        result = db.branch_exam_schedules.insert_one(exam_doc)
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to schedule exam")
        
        return ExamScheduleResponse(
            id=str(result.inserted_id),
            paper_id=exam_data.paper_id,
            paper_name=paper["paper_name"],
            exam_date=exam_data.exam_date,
            start_time=exam_data.start_time,
            end_time=exam_data.end_time,
            venue=exam_data.venue or "",
            invigilator=exam_data.invigilator or "",
            instructions=exam_data.instructions or "",
            total_students=0,
            appeared_students=0,
            status=exam_data.status,
            branch_code=context["branch_code"],
            franchise_code=context["franchise_code"],
            created_at=exam_doc["created_at"]
        )
        
    except Exception as e:
        print(f"Error scheduling exam: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/exams", response_model=List[ExamScheduleResponse])
async def get_exam_schedules(
    request: Request,
    exam_date: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all exam schedules for the branch"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Build filter query
        filter_query = {"franchise_code": context["franchise_code"]}
        
        if exam_date:
            filter_query["exam_date"] = exam_date
        if status:
            filter_query["status"] = status
        
        # Get exam schedules
        exams_cursor = db.branch_exam_schedules.find(filter_query)
        exams = []
        
        for exam in exams_cursor:
            # Get student counts
            total_students = db.branch_students.count_documents({
                "franchise_code": context["franchise_code"]
            })
            
            appeared_students = db.branch_results.count_documents({
                "exam_schedule_id": str(exam["_id"]),
                "franchise_code": context["franchise_code"]
            })
            
            exams.append(ExamScheduleResponse(
                id=str(exam["_id"]),
                paper_id=exam["paper_id"],
                paper_name=exam["paper_name"],
                exam_date=exam["exam_date"],
                start_time=exam["start_time"],
                end_time=exam["end_time"],
                venue=exam.get("venue", ""),
                invigilator=exam.get("invigilator", ""),
                instructions=exam.get("instructions", ""),
                total_students=total_students,
                appeared_students=appeared_students,
                status=exam["status"],
                branch_code=exam["branch_code"],
                franchise_code=exam["franchise_code"],
                created_at=exam["created_at"]
            ))
        
        return exams
        
    except Exception as e:
        print(f"Error fetching exam schedules: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/results", response_model=ResultResponse)
async def create_result(
    result_data: ResultCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a result for a student"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Verify student exists
        student = db.branch_students.find_one({
            "_id": ObjectId(result_data.student_id),
            "franchise_code": context["franchise_code"]
        })
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Verify paper exists
        paper = db.branch_paper_sets.find_one({
            "_id": ObjectId(result_data.paper_id),
            "franchise_code": context["franchise_code"]
        })
        
        if not paper:
            raise HTTPException(status_code=404, detail="Paper set not found")
        
        # Calculate grade based on percentage
        grade = ""
        if result_data.percentage >= 90:
            grade = "A+"
        elif result_data.percentage >= 80:
            grade = "A"
        elif result_data.percentage >= 70:
            grade = "B+"
        elif result_data.percentage >= 60:
            grade = "B"
        elif result_data.percentage >= 50:
            grade = "C+"
        elif result_data.percentage >= 40:
            grade = "C"
        else:
            grade = "F"
        
        # Create result document
        result_doc = {
            "_id": ObjectId(),
            "student_id": result_data.student_id,
            "student_name": student["name"],
            "student_registration": student["registration_number"],
            "paper_id": result_data.paper_id,
            "paper_name": paper["paper_name"],
            "exam_schedule_id": result_data.exam_schedule_id,
            "marks_obtained": result_data.marks_obtained,
            "total_marks": result_data.total_marks,
            "percentage": result_data.percentage,
            "grade": grade,
            "status": result_data.status,
            "remarks": result_data.remarks or "",
            "answers": result_data.answers or {},
            "franchise_code": context["franchise_code"],
            "branch_code": context["branch_code"],
            "created_at": datetime.utcnow().isoformat(),
            "created_by": context["user_id"]
        }
        
        # Get exam date if exam schedule exists
        exam_date = None
        if result_data.exam_schedule_id:
            exam = db.branch_exam_schedules.find_one({
                "_id": ObjectId(result_data.exam_schedule_id),
                "franchise_code": context["franchise_code"]
            })
            if exam:
                exam_date = exam.get("exam_date")
        
        result_doc["exam_date"] = exam_date
        
        # Insert result
        insert_result = db.branch_results.insert_one(result_doc)
        
        if not insert_result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to create result")
        
        return ResultResponse(
            id=str(insert_result.inserted_id),
            student_id=result_data.student_id,
            student_name=student["name"],
            student_registration=student["registration_number"],
            paper_id=result_data.paper_id,
            paper_name=paper["paper_name"],
            exam_schedule_id=result_data.exam_schedule_id,
            marks_obtained=result_data.marks_obtained,
            total_marks=result_data.total_marks,
            percentage=result_data.percentage,
            grade=grade,
            status=result_data.status,
            remarks=result_data.remarks or "",
            exam_date=exam_date,
            branch_code=context["branch_code"],
            franchise_code=context["franchise_code"],
            created_at=result_doc["created_at"]
        )
        
    except Exception as e:
        print(f"Error creating result: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/results", response_model=List[ResultResponse])
async def get_results(
    request: Request,
    student_id: Optional[str] = None,
    paper_id: Optional[str] = None,
    exam_schedule_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all results for the branch with optional filtering"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Build filter query
        filter_query = {"franchise_code": context["franchise_code"]}
        
        if student_id:
            filter_query["student_id"] = student_id
        if paper_id:
            filter_query["paper_id"] = paper_id
        if exam_schedule_id:
            filter_query["exam_schedule_id"] = exam_schedule_id
        if status:
            filter_query["status"] = status
        
        # Get results
        results_cursor = db.branch_results.find(filter_query)
        results = []
        
        for result in results_cursor:
            results.append(ResultResponse(
                id=str(result["_id"]),
                student_id=result["student_id"],
                student_name=result["student_name"],
                student_registration=result["student_registration"],
                paper_id=result["paper_id"],
                paper_name=result["paper_name"],
                exam_schedule_id=result.get("exam_schedule_id"),
                marks_obtained=result["marks_obtained"],
                total_marks=result["total_marks"],
                percentage=result["percentage"],
                grade=result["grade"],
                status=result["status"],
                remarks=result.get("remarks", ""),
                exam_date=result.get("exam_date"),
                branch_code=result["branch_code"],
                franchise_code=result["franchise_code"],
                created_at=result["created_at"]
            ))
        
        return results
        
    except Exception as e:
        print(f"Error fetching results: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/results/{result_id}", response_model=ResultResponse)
async def get_result(
    result_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get a single result by ID"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Get result
        result = db.branch_results.find_one({
            "_id": ObjectId(result_id),
            "franchise_code": context["franchise_code"]
        })
        
        if not result:
            raise HTTPException(status_code=404, detail="Result not found")
        
        return ResultResponse(
            id=str(result["_id"]),
            student_id=result["student_id"],
            student_name=result["student_name"],
            student_registration=result["student_registration"],
            paper_id=result["paper_id"],
            paper_name=result["paper_name"],
            exam_schedule_id=result.get("exam_schedule_id"),
            marks_obtained=result["marks_obtained"],
            total_marks=result["total_marks"],
            percentage=result["percentage"],
            grade=result["grade"],
            status=result["status"],
            remarks=result.get("remarks", ""),
            exam_date=result.get("exam_date"),
            branch_code=result["branch_code"],
            franchise_code=result["franchise_code"],
            created_at=result["created_at"]
        )
        
    except Exception as e:
        print(f"Error fetching result: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/results/{result_id}")
async def delete_result(
    result_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete a result"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Delete result
        delete_result = db.branch_results.delete_one({
            "_id": ObjectId(result_id),
            "franchise_code": context["franchise_code"]
        })
        
        if delete_result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Result not found")
        
        return {"message": "Result deleted successfully"}
        
    except Exception as e:
        print(f"Error deleting result: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/results/{result_id}/solution")
async def download_solution(
    result_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Download solution for a result"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Get result
        result = db.branch_results.find_one({
            "_id": ObjectId(result_id),
            "franchise_code": context["franchise_code"]
        })
        
        if not result:
            raise HTTPException(status_code=404, detail="Result not found")
        
        # Get paper details - paper_id might be an ObjectId string, subject name, or paper name
        paper_id = result.get("paper_id") or result.get("paper_set_id")
        paper = None
        
        logger.info(f"[SOLUTION] Looking for paper - paper_id: {paper_id}, paper_name: {result.get('paper_name')}, subject: {result.get('subject')}")
        
        # Try multiple approaches to find the paper
        if paper_id:
            # Check if paper_id is a valid ObjectId
            try:
                if ObjectId.is_valid(paper_id):
                    paper = db.branch_paper_sets.find_one({
                        "_id": ObjectId(paper_id),
                        "franchise_code": context["franchise_code"]
                    })
                    logger.info(f"[SOLUTION] Found paper by ObjectId: {bool(paper)}")
            except Exception as e:
                logger.info(f"[SOLUTION] paper_id is not a valid ObjectId: {paper_id}")
            
            # If not found by ObjectId, try by paper_name
            if not paper:
                paper = db.branch_paper_sets.find_one({
                    "paper_name": paper_id,
                    "franchise_code": context["franchise_code"]
                })
                logger.info(f"[SOLUTION] Found paper by paper_name match: {bool(paper)}")
        
        # Try to find by paper_name from result
        if not paper and result.get("paper_name"):
            paper = db.branch_paper_sets.find_one({
                "paper_name": result.get("paper_name"),
                "franchise_code": context["franchise_code"]
            })
            logger.info(f"[SOLUTION] Found paper by result paper_name: {bool(paper)}")
        
        # Try by subject name
        if not paper and result.get("subject"):
            paper = db.branch_paper_sets.find_one({
                "$or": [
                    {"subject": result.get("subject")},
                    {"subject_name": result.get("subject")},
                    {"paper_name": {"$regex": result.get("subject"), "$options": "i"}}
                ],
                "franchise_code": context["franchise_code"]
            })
            logger.info(f"[SOLUTION] Found paper by subject: {bool(paper)}")
        
        if not paper:
            logger.warning(f"Paper not found for result {result_id}, paper_id: {paper_id}")
            # Generate solution without paper questions as fallback
            paper = {"questions": [], "paper_name": result.get("paper_name", "Unknown Paper")}
        
        # Generate solution data - use .get() with defaults for all fields
        student_name = result.get("student_name") or result.get("studentName") or "Unknown Student"
        student_registration = result.get("student_registration") or result.get("registration_number") or result.get("studentRegistration") or "N/A"
        paper_name = result.get("paper_name") or result.get("paperName") or paper_id or "Unknown Paper"
        
        solution_data = {
            "student_name": student_name,
            "student_registration": student_registration,
            "paper_name": paper_name,
            "subject": result.get("subject") or result.get("subject_name") or paper_id or "N/A",
            "exam_date": result.get("exam_date") or result.get("examDate") or result.get("created_at"),
            "marks_obtained": result.get("marks_obtained") or result.get("marksObtained") or 0,
            "total_marks": result.get("total_marks") or result.get("totalMarks") or 100,
            "percentage": result.get("percentage") or 0,
            "grade": result.get("grade") or "N/A",
            "status": result.get("status") or "pending",
            "answers": result.get("answers", {}),
            "questions": paper.get("questions", []),
            "generated_at": datetime.utcnow().isoformat()
        }
        
        # Safe filename
        safe_student_name = student_name.replace(" ", "_").replace("/", "_")
        safe_paper_name = paper_name.replace(" ", "_").replace("/", "_")
        
        return {
            "message": "Solution data generated successfully",
            "solution": solution_data,
            "download_filename": f"{safe_student_name}_{safe_paper_name}_solution.json"
        }
        
    except Exception as e:
        print(f"Error generating solution: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/results/stats/summary")
async def get_results_summary(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get results summary statistics"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Get results stats
        pipeline = [
            {"$match": {"franchise_code": context["franchise_code"]}},
            {
                "$group": {
                    "_id": None,
                    "total_results": {"$sum": 1},
                    "passed": {"$sum": {"$cond": [{"$eq": ["$status", "pass"]}, 1, 0]}},
                    "failed": {"$sum": {"$cond": [{"$eq": ["$status", "fail"]}, 1, 0]}},
                    "average_percentage": {"$avg": "$percentage"},
                    "highest_marks": {"$max": "$marks_obtained"},
                    "lowest_marks": {"$min": "$marks_obtained"}
                }
            }
        ]
        
        stats = list(db.branch_results.aggregate(pipeline))
        
        if not stats:
            return {
                "total_results": 0,
                "passed": 0,
                "failed": 0,
                "average_percentage": 0,
                "highest_marks": 0,
                "lowest_marks": 0,
                "pass_rate": 0
            }
        
        result = stats[0]
        pass_rate = (result["passed"] / result["total_results"] * 100) if result["total_results"] > 0 else 0
        
        return {
            "total_results": result["total_results"],
            "passed": result["passed"],
            "failed": result["failed"],
            "average_percentage": round(result["average_percentage"], 2),
            "highest_marks": result["highest_marks"],
            "lowest_marks": result["lowest_marks"],
            "pass_rate": round(pass_rate, 2)
        }
        
    except Exception as e:
        print(f"Error fetching results summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/results/filter/options")
async def get_filter_options(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get available filter options for results"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Get unique paper names
        papers = db.branch_results.distinct("paper_name", {"franchise_code": context["franchise_code"]})
        
        # Get unique statuses
        statuses = db.branch_results.distinct("status", {"franchise_code": context["franchise_code"]})
        
        return {
            "papers": sorted(papers),
            "statuses": sorted(statuses)
        }
        
    except Exception as e:
        print(f"Error fetching filter options: {e}")
        raise HTTPException(status_code=500, detail=str(e))