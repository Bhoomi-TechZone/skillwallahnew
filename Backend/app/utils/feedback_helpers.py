"""
Helper functions for automated feedback request generation
These functions should be called when students complete activities
"""

from datetime import datetime, timedelta
from app.models.feedback import get_feedback_collection
from app.schemas.feedback import FeedbackRequestCreate, FeedbackType
from app.services.feedback_service import create_feedback_request

def generate_course_completion_feedback_request(db, user_id: str, course_id: str, instructor_id: str):
    """
    Generate feedback request when student completes a course
    """
    from app.models.course import get_course_collection
    from app.models.user import get_user_collection
    
    course_collection = get_course_collection(db)
    user_collection = get_user_collection(db)
    
    # Get course and instructor details
    course = course_collection.find_one({"_id": course_id})
    instructor = user_collection.find_one({"_id": instructor_id})
    
    if not course or not instructor:
        return {"success": False, "message": "Course or instructor not found"}
    
    # Create feedback request
    request_payload = FeedbackRequestCreate(
        user_id=user_id,
        target_type=FeedbackType.COURSE,
        target_id=course_id,
        target_title=course["title"],
        instructor_id=instructor_id,
        instructor_name=instructor.get("full_name", instructor.get("name", "Instructor")),
        course_id=course_id,
        course_name=course["title"],
        categories=["content_quality", "instructor_performance", "course_structure", "overall_satisfaction"],
        completed_date=datetime.utcnow(),
        due_date=datetime.utcnow() + timedelta(days=7)  # 7 days to provide feedback
    )
    
    return create_feedback_request(db, request_payload)

def generate_assignment_submission_feedback_request(db, user_id: str, assignment_id: str, course_id: str, instructor_id: str):
    """
    Generate feedback request when student submits an assignment
    """
    from app.models.course import get_course_collection
    from app.models.user import get_user_collection
    from app.models.assignment import get_assignment_collection
    
    course_collection = get_course_collection(db)
    user_collection = get_user_collection(db)
    assignment_collection = get_assignment_collection(db)
    
    # Get details
    course = course_collection.find_one({"_id": course_id})
    instructor = user_collection.find_one({"_id": instructor_id})
    assignment = assignment_collection.find_one({"_id": assignment_id})
    
    if not all([course, instructor, assignment]):
        return {"success": False, "message": "Course, instructor, or assignment not found"}
    
    # Create feedback request
    request_payload = FeedbackRequestCreate(
        user_id=user_id,
        target_type=FeedbackType.ASSIGNMENT,
        target_id=assignment_id,
        target_title=assignment["title"],
        instructor_id=instructor_id,
        instructor_name=instructor.get("full_name", instructor.get("name", "Instructor")),
        course_id=course_id,
        course_name=course["title"],
        categories=["clarity", "difficulty", "relevance", "feedback_quality"],
        submitted_date=datetime.utcnow(),
        due_date=datetime.utcnow() + timedelta(days=7)
    )
    
    return create_feedback_request(db, request_payload)



def generate_quiz_completion_feedback_request(db, user_id: str, quiz_id: str, course_id: str, instructor_id: str):
    """
    Generate feedback request when student completes a quiz
    """
    from app.models.course import get_course_collection
    from app.models.user import get_user_collection
    from app.models.quiz import get_quiz_collection
    
    course_collection = get_course_collection(db)
    user_collection = get_user_collection(db)
    quiz_collection = get_quiz_collection(db)
    
    # Get details
    course = course_collection.find_one({"_id": course_id})
    instructor = user_collection.find_one({"_id": instructor_id})
    quiz = quiz_collection.find_one({"_id": quiz_id})
    
    if not all([course, instructor, quiz]):
        return {"success": False, "message": "Course, instructor, or quiz not found"}
    
    # Create feedback request
    request_payload = FeedbackRequestCreate(
        user_id=user_id,
        target_type=FeedbackType.QUIZ,
        target_id=quiz_id,
        target_title=quiz["title"],
        instructor_id=instructor_id,
        instructor_name=instructor.get("full_name", instructor.get("name", "Instructor")),
        course_id=course_id,
        course_name=course["title"],
        categories=["question_clarity", "difficulty_level", "coverage", "time_allocation"],
        completed_date=datetime.utcnow(),
        due_date=datetime.utcnow() + timedelta(days=5)
    )
    
    return create_feedback_request(db, request_payload)

def generate_instructor_feedback_request(db, user_id: str, instructor_id: str, course_id: str):
    """
    Generate feedback request for instructor evaluation (end of course)
    """
    from app.models.course import get_course_collection
    from app.models.user import get_user_collection
    
    course_collection = get_course_collection(db)
    user_collection = get_user_collection(db)
    
    # Get details
    course = course_collection.find_one({"_id": course_id})
    instructor = user_collection.find_one({"_id": instructor_id})
    
    if not course or not instructor:
        return {"success": False, "message": "Course or instructor not found"}
    
    # Create feedback request
    request_payload = FeedbackRequestCreate(
        user_id=user_id,
        target_type=FeedbackType.INSTRUCTOR,
        target_id=instructor_id,
        target_title=instructor.get("full_name", instructor.get("name", "Instructor")),
        instructor_id=instructor_id,
        instructor_name=instructor.get("full_name", instructor.get("name", "Instructor")),
        course_id=course_id,
        course_name=course["title"],
        categories=["teaching_style", "communication", "responsiveness", "expertise"],
        completed_date=datetime.utcnow(),
        due_date=datetime.utcnow() + timedelta(days=10)  # Longer window for instructor feedback
    )
    
    return create_feedback_request(db, request_payload)

# Integration helper functions to be called from other APIs

def on_course_completion(db, user_id: str, course_id: str, instructor_id: str):
    """Call this when a student completes a course"""
    # Generate course feedback request
    course_feedback = generate_course_completion_feedback_request(db, user_id, course_id, instructor_id)
    
    # Also generate instructor feedback request
    instructor_feedback = generate_instructor_feedback_request(db, user_id, instructor_id, course_id)
    
    return {
        "course_feedback_request": course_feedback,
        "instructor_feedback_request": instructor_feedback
    }

def on_assignment_submission(db, user_id: str, assignment_id: str, course_id: str, instructor_id: str):
    """Call this when a student submits an assignment"""
    return generate_assignment_submission_feedback_request(db, user_id, assignment_id, course_id, instructor_id)

def on_quiz_completion(db, user_id: str, quiz_id: str, course_id: str, instructor_id: str):
    """Call this when a student completes a quiz"""
    return generate_quiz_completion_feedback_request(db, user_id, quiz_id, course_id, instructor_id)
