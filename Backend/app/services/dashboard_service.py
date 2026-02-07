from app.models.attempt import get_attempt_collection
from app.models.certificate import get_certificate_collection
from datetime import datetime, timedelta
from bson import ObjectId

async def get_student_dashboard(db, student_id):
    attempts_cursor = get_attempt_collection(db).find({"student_id": student_id})
    cert_cursor = get_certificate_collection(db).find({"student_id": student_id})

    cert_map = {
        cert["quiz_id"]: str(cert["_id"])
        for cert in cert_cursor
    }

    quiz_data = []
    for attempt in attempts_cursor:
        quiz_data.append({
            "quiz_id": attempt["quiz_id"],
            "score": attempt.get("score", 0),
            "graded": attempt.get("graded", False),
            "feedback": attempt.get("feedback"),
            "certificate_id": cert_map.get(attempt["quiz_id"])
        })

    return {"student_id": student_id, "quizzes": quiz_data}


async def generate_dashboard_summary(db, user_id):
    # Convert user_id string to ObjectId for MongoDB query
    try:
        user_object_id = ObjectId(user_id)
    except:
        user_object_id = user_id  # fallback to string if conversion fails
    
    # Count unique active courses (avoid duplicates and inactive enrollments)
    active_enrollments = list(db.enrollments.find({
        "student_id": user_object_id,
        "status": {"$nin": ["withdrawn", "cancelled", "inactive"]}
    }))
    
    # Get unique course IDs to avoid counting duplicates
    unique_course_ids = set()
    completed_course_ids = set()
    
    for enrollment in active_enrollments:
        course_id = enrollment.get("course_id")
        if course_id:
            unique_course_ids.add(course_id)
            if enrollment.get("completed", False):
                completed_course_ids.add(course_id)
    
    courses = len(unique_course_ids)
    completed = len(completed_course_ids)
    
    # Count assignments and quizzes (keep existing logic)
    assignments = db.assignments.count_documents({"student_id": user_object_id, "status": "pending"})
    quizzes = db.quizzes.count_documents({"student_id": user_object_id, "status": "open"})
    certs = db.certificates.count_documents({"student_id": user_object_id})

    return {
        "total_courses": courses,
        "completed_courses": completed,
        "active_assignments": assignments,
        "quizzes_due": quizzes,
        "certificates_earned": certs
    }


async def get_enrolled_courses(db, user_id):
    """Get all courses that the user is enrolled in with course details"""
    
    # Convert user_id string to ObjectId for MongoDB query
    from bson import ObjectId
    try:
        user_object_id = ObjectId(user_id)
    except:
        user_object_id = user_id  # fallback to string if conversion fails
    
    print(f"[Dashboard Service] Looking for enrollments for user_id: {user_id} (ObjectId: {user_object_id})")
    
    # Get all enrollments for the user (try both user_id and student_id)
    enrollments_cursor = db.enrollments.find({"student_id": user_object_id})
    enrollments = []
    
    enrollment_count = 0
    for enrollment in enrollments_cursor:
        enrollment_count += 1
        course_id = enrollment.get("course_id")
        print(f"[Dashboard Service] Found enrollment {enrollment_count}: course_id={course_id}")
        
        # Fetch course details
        course = db.courses.find_one({"_id": course_id}) if course_id else None
        
        if course:
            # Determine status based on enrollment data
            status = "Completed" if enrollment.get("completed", False) else "Ongoing"
            progress = enrollment.get("progress", 0)
            
            if progress < 30:
                status = "Just Started"
            elif progress < 100:
                status = "Ongoing"
            else:
                status = "Completed"
            
            course_info = {
                "id": str(course.get("_id")),
                "_id": str(course.get("_id")),  # Add both id and _id for frontend compatibility
                "course_id": str(course.get("_id")),
                "title": course.get("title", "Unknown Course"),
                "description": course.get("description", "No description available"),
                "instructor_name": course.get("instructor_name", "TBA"),
                "instructor": course.get("instructor", ""),
                "enrolled_date": enrollment.get("enrollment_date"),  # Use enrollment_date from enrollment record
                "enrolled_at": enrollment.get("enrollment_date"),  # Alternative name for frontend
                "status": status,
                "progress": progress,
                "completed": enrollment.get("completed", False),
                "category": course.get("category", "general"),
                "level": course.get("level", "Beginner"),
                "price": course.get("price", 0),
                "thumbnail": course.get("thumbnail", ""),
                "rating": course.get("rating", 0),
                "duration": course.get("duration", ""),
                "tags": course.get("tags", [])
            }
            enrollments.append(course_info)
            print(f"[Dashboard Service] Added course: {course_info['title']}")
        else:
            print(f"[Dashboard Service] Course not found for course_id: {course_id}")
    
    print(f"[Dashboard Service] Total enrollments found: {enrollment_count}")
    print(f"[Dashboard Service] Total courses with details: {len(enrollments)}")
    
    return {"courses": enrollments}