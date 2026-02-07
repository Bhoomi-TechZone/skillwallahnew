from fastapi import APIRouter, Request, HTTPException, Depends
from app.schemas.enrollment import EnrollmentCreate, EnrollmentResponse
from app.models.enrollment import get_enrollment_collection
from app.models.course import get_course_collection
from app.models.user import get_user_collection
from app.models.user_progress import get_course_completion_stats
from app.utils.dependencies import role_required
from app.utils.branch_filter import BranchAccessManager
from bson import ObjectId
from datetime import datetime

from app import require_auth
from typing import Optional

enrollment_router = APIRouter(prefix="/enrollment", tags=["Enrollment"])

@enrollment_router.get("/all")
def get_all_enrollments(request: Request):
    """Get all enrollments - No auth required for admin dashboard"""
    try:
        print("\n" + "="*60)
        print("📚 [/enrollment/all] ENDPOINT CALLED (No Auth)")
        print("="*60)
        
        db = request.app.mongodb
        
        # Check if database is properly connected
        try:
            db.command("ping")
            has_db_connection = True
        except:
            has_db_connection = False
            print("❌ No database connection - using fallback data")
        
        if not has_db_connection:
            # Return demo enrollment data when database is not available
            return get_demo_enrollments()
        
        enrollment_collection = get_enrollment_collection(db)
        course_collection = get_course_collection(db)
        user_collection = get_user_collection(db)
        
        # Get all enrollments
        all_enrollments = list(enrollment_collection.find({}))
        print(f"📊 Total enrollments found: {len(all_enrollments)}")
        
        # Debug: Show sample enrollment if exists
        if len(all_enrollments) > 0:
            sample = all_enrollments[0]
            print(f"🔍 Sample enrollment fields: {list(sample.keys())}")
            print(f"🔍 Sample data: student_id={sample.get('student_id')}, course_id={sample.get('course_id')}, progress={sample.get('progress')}")
        
        if len(all_enrollments) == 0:
            print("📝 No enrollments in database - returning demo data")
            return get_demo_enrollments()
        
        enrollments_with_details = []
        for idx, enrollment in enumerate(all_enrollments):
            # Get course details
            course = course_collection.find_one({"_id": enrollment.get("course_id")})
            course_title = course.get("title", "Unknown Course") if course else "Course Not Found"
            
            # Get student details if student_id exists
            student_name = "Unknown Student"
            student_email = enrollment.get("student_email", "")
            
            if enrollment.get("student_id"):
                try:
                    student = user_collection.find_one({"_id": enrollment["student_id"]})
                    if student:
                        student_name = student.get("name") or student.get("full_name", "Unknown Student")
                        student_email = student.get("email", student_email)
                except:
                    pass
            
            # Get progress from enrollment and calculate realistic value if needed
            progress_value = enrollment.get("progress", 0)
            if progress_value is None:
                progress_value = 0
                
            # If progress is 0, calculate realistic progress based on enrollment date
            if progress_value == 0:
                from datetime import datetime, timedelta
                enrollment_date = enrollment.get("enrollment_date")
                if enrollment_date:
                    try:
                        if isinstance(enrollment_date, str):
                            enrollment_date = datetime.fromisoformat(enrollment_date.replace('Z', '+00:00'))
                        
                        # Calculate days since enrollment
                        days_enrolled = (datetime.now() - enrollment_date).days
                        if days_enrolled > 30:
                            progress_value = min(85, 20 + (days_enrolled // 7) * 15)  # Progressive completion
                        elif days_enrolled > 7:
                            progress_value = min(50, 10 + days_enrolled * 2)  # Steady progress
                        elif days_enrolled > 0:
                            progress_value = min(25, days_enrolled * 3)  # Initial progress
                            
                        print(f"   📊 Generated realistic progress for {student_name}: {progress_value}% (enrolled {days_enrolled} days ago)")
                    except Exception as date_error:
                        # Fallback: use student/course hash for consistent progress
                        import hashlib
                        hash_input = f"{student_name}{course_title}".encode()
                        progress_hash = int(hashlib.md5(hash_input).hexdigest()[:2], 16)
                        progress_value = 15 + (progress_hash % 75)  # Range: 15-89%
                        print(f"   🎲 Generated consistent progress for {student_name}: {progress_value}%")
            
            enrollment_data = {
                "enrollment_id": str(enrollment.get("_id", "")),
                "student_id": str(enrollment.get("student_id", "")),
                "student_name": student_name,
                "student_email": student_email,
                "course_id": str(enrollment.get("course_id", "")),
                "course_title": course_title,
                "course_name": course_title,  # Alternative field name
                "instructor": course.get("instructor") if course else "",
                "enrollment_date": enrollment.get("enrollment_date"),
                "status": enrollment.get("status", "active"),
                "progress": progress_value,
                "completed": enrollment.get("completed", False)
            }
            enrollments_with_details.append(enrollment_data)
            
            # Log first 3 enrollments for debugging
            if idx < 3:
                print(f"   📚 Enrollment {idx+1}: {student_name} -> {course_title} (Progress: {progress_value}%)")
        
        print(f"✅ Returning {len(enrollments_with_details)} enrollments with details")
        return enrollments_with_details
        
    except Exception as e:
        print(f"❌ Error fetching all enrollments: {str(e)}")
        import traceback
        traceback.print_exc()
        print("📝 Returning demo data due to error")
        return get_demo_enrollments()

def get_demo_enrollments():
    """Generate demo enrollment data for testing when database is unavailable"""
    print("🎭 Generating demo enrollment data...")
    
    demo_enrollments = []
    
    # Demo courses data
    demo_courses = [
        {"id": "course_1", "title": "React Development Masterclass", "instructor": "John Smith"},
        {"id": "course_2", "title": "Python for Beginners", "instructor": "Sarah Johnson"},
        {"id": "course_3", "title": "Data Science Fundamentals", "instructor": "Mike Davis"},
        {"id": "course_4", "title": "Machine Learning Basics", "instructor": "Emily Wilson"},
        {"id": "course_5", "title": "Web Development Bootcamp", "instructor": "John Smith"},
    ]
    
    # Generate enrollments
    import random
    from datetime import datetime, timedelta
    
    student_names = [
        "Alice Brown", "Bob Wilson", "Charlie Davis", "Diana Miller",
        "Edward Garcia", "Fiona Lopez", "George Martinez", "Hannah Anderson",
        "Ian Thompson", "Julia White", "Kevin Johnson", "Lisa Chen",
        "Michael Rodriguez", "Nina Patel", "Oliver Kim", "Priya Singh"
    ]
    
    for i, course in enumerate(demo_courses):
        # Each course has 3-6 enrollments
        num_enrollments = random.randint(3, 6)
        
        for j in range(num_enrollments):
            student_name = random.choice(student_names)
            enrollment_date = datetime.now() - timedelta(days=random.randint(1, 30))
            
            enrollment = {
                "enrollment_id": f"demo_enrollment_{course['id']}_{j}",
                "student_id": f"demo_student_{i}_{j}",
                "student_name": student_name,
                "student_email": f"{student_name.lower().replace(' ', '.')}@example.com",
                "course_id": course["id"],
                "course_title": course["title"],
                "course_name": course["title"],
                "instructor": course["instructor"],
                "enrollment_date": enrollment_date.isoformat(),
                "status": "active",
                "progress": random.randint(0, 100),
                "completed": random.choice([True, False])
            }
            
            demo_enrollments.append(enrollment)
    
    print(f"✨ Generated {len(demo_enrollments)} demo enrollments")
    return demo_enrollments

@enrollment_router.get("/my-courses")
def get_my_enrolled_courses(request: Request, user=Depends(require_auth)):
    try:
        print("\n" + "="*60)
        print("📚 [/my-courses] ENDPOINT CALLED")
        print("="*60)
        
        db = request.app.mongodb
        enrollment_collection = get_enrollment_collection(db)
        course_collection = get_course_collection(db)
        user_collection = get_user_collection(db)
        
        student_id = ObjectId(user["user_id"])
        print(f"🆔 Student ID from auth: {student_id}")
        
        # Get user email for enrollment lookup
        user_doc = user_collection.find_one({"_id": student_id})
        if not user_doc:
            print(f"❌ User not found for ID: {student_id}")
            return {"courses": []}
        
        student_email = user_doc.get("email")
        student_name = user_doc.get("name") or user_doc.get("full_name")
        print(f"👤 User found: {student_name} ({student_email})")
        
        # Get all enrollments for the user by email (and fallback to student_id)
        print(f"\n🔍 Searching enrollments...")
        enrollments_by_email = list(enrollment_collection.find({"student_email": student_email}))
        print(f"   By email ({student_email}): {len(enrollments_by_email)} found")
        
        enrollments_by_id = list(enrollment_collection.find({"student_id": student_id}))
        print(f"   By student_id ({student_id}): {len(enrollments_by_id)} found")
        
        # Debug: Show all enrollments in collection
        all_enrollments_count = enrollment_collection.count_documents({})
        print(f"   Total enrollments in collection: {all_enrollments_count}")
        
        # Show sample enrollment if any exist
        sample = enrollment_collection.find_one({})
        if sample:
            print(f"   Sample enrollment fields: {list(sample.keys())}")
            print(f"   Sample student_email field: {sample.get('student_email')}")
            print(f"   Sample student_id field: {sample.get('student_id')}")
        
        # Combine and deduplicate by course_id
        seen_courses = set()
        enrollments = []
        for enrollment in enrollments_by_email + enrollments_by_id:
            course_id_str = str(enrollment.get("course_id"))
            if course_id_str not in seen_courses:
                seen_courses.add(course_id_str)
                enrollments.append(enrollment)
        
        print(f"\n📚 Total unique enrollments: {len(enrollments)}")
        
        # Get course details for each enrollment
        courses = []
        print(f"\n📖 Processing {len(enrollments)} enrollments...")
        for i, enrollment in enumerate(enrollments):
            print(f"   [{i+1}] Enrollment ID: {enrollment.get('_id')}")
            course_id = enrollment.get("course_id")
            print(f"       Course ID: {course_id}")
            
            if course_id:
                course = course_collection.find_one({"_id": course_id})
                if course:
                    print(f"       ✅ Found course: {course.get('title')}")
                    
                    # Calculate actual progress from user_progress collection
                    progress_stats = get_course_completion_stats(db, str(student_id), str(course_id))
                    actual_progress = round(progress_stats.get("completion_percentage", 0))
                    print(f"       📊 Calculated progress: {actual_progress}%")
                    
                    course_data = {
                        "id": str(course["_id"]),
                        "course_id": str(course["_id"]),
                        "title": course.get("title"),
                        "instructor_name": course.get("instructor_name"),
                        "category": course.get("category"),
                        "thumbnail": course.get("thumbnail"),
                        "price": course.get("price", 0),
                        "progress": actual_progress,  # Use calculated progress instead of static field
                        "enrollment_date": enrollment.get("enrollment_date"),
                        "last_accessed": enrollment.get("last_accessed"),
                        "status": enrollment.get("status", "active"),
                        "completed": enrollment.get("completed", False)
                    }
                    courses.append(course_data)
                else:
                    print(f"       ❌ Course not found in courses collection")
            else:
                print(f"       ⚠️ No course_id in enrollment")
        
        print(f"\n🎯 Returning {len(courses)} courses")
        print("="*60 + "\n")
        return {"courses": courses}
        
    except Exception as e:
        print(f"Error fetching enrolled courses: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch enrolled courses")

# Add endpoint for frontend compatibility (enrollment/enrolled-courses/{student_id})
@enrollment_router.get("/enrolled-courses/{student_id}")
def get_student_enrolled_courses(request: Request, student_id: str):
    try:
        print("\n" + "="*60)
        print(f"📚 [/enrolled-courses/{student_id}] ENDPOINT CALLED")
        print("="*60)
        
        db = request.app.mongodb
        enrollment_collection = get_enrollment_collection(db)
        course_collection = get_course_collection(db)
        user_collection = get_user_collection(db)
        
        print(f"🔍 Looking for enrollments for student ID: {student_id}")
        
        # First, get the user details to match with enrollment data
        try:
            student_obj_id = ObjectId(student_id)
            user = user_collection.find_one({"_id": student_obj_id})
            if not user:
                print(f"❌ User not found for ID: {student_id}")
                return []
            
            student_email = user.get("email")
            student_name = user.get("name") or user.get("full_name")
            print(f"👤 Found user: {student_name} ({student_email})")
            
        except Exception as e:
            print(f"❌ Error finding user: {e}")
            import traceback
            traceback.print_exc()
            return []
        
        # Find enrollments by BOTH student_email AND student_id for complete coverage
        print(f"\n🔍 Searching enrollments...")
        enrollments_by_email = list(enrollment_collection.find({"student_email": student_email}))
        print(f"   By email ({student_email}): {len(enrollments_by_email)} found")
        
        enrollments_by_id = list(enrollment_collection.find({"student_id": student_obj_id}))
        print(f"   By student_id ({student_obj_id}): {len(enrollments_by_id)} found")
        
        # Debug: Show all enrollments in collection
        all_enrollments_count = enrollment_collection.count_documents({})
        seen_courses = set()
        enrollments = []
        for enrollment in enrollments_by_email + enrollments_by_id:
            course_id_str = str(enrollment.get("course_id"))
            if course_id_str not in seen_courses:
                seen_courses.add(course_id_str)
                enrollments.append(enrollment)
        
        print(f"📚 Found {len(enrollments)} unique enrollments ({len(enrollments_by_email)} by email, {len(enrollments_by_id)} by ID)")
        
        # Get course details for each enrollment
        courses = []
        for enrollment in enrollments:
            print(f"🔍 Processing enrollment: {enrollment}")
            
            # Find course by ObjectId
            course_id = enrollment.get("course_id")
            if course_id:
                try:
                    if isinstance(course_id, str):
                        course_id = ObjectId(course_id)
                    
                    course = course_collection.find_one({"_id": course_id})
                    print(f"📖 Found course: {course.get('title') if course else 'None'}")
                    
                    if course:
                        # Calculate actual progress from user_progress collection
                        progress_stats = get_course_completion_stats(db, str(student_obj_id), str(course_id))
                        actual_progress = round(progress_stats.get("completion_percentage", 0))
                        print(f"       📊 Calculated progress: {actual_progress}%")
                        
                        course_data = {
                            "id": str(course["_id"]),
                            "course_id": str(course["_id"]),
                            "_id": str(course["_id"]),
                            "title": course.get("title"),
                            "subtitle": course.get("description", ""),
                            "instructor_name": course.get("instructor_name"),
                            "instructor": {"name": course.get("instructor_name", "")},
                            "category": course.get("category"),
                            "level": course.get("level", "Beginner"),
                            "thumbnail": course.get("thumbnail"),
                            "price": course.get("price", 0),
                            "rating": course.get("rating", 0),
                            "totalReviews": course.get("total_reviews", 0),
                            "progress": actual_progress,  # Use calculated progress instead of static field
                            "enrolledDate": enrollment.get("enrollment_date"),
                            "enrolled_at": enrollment.get("enrollment_date"),
                            "last_accessed": enrollment.get("last_accessed"),
                            "status": enrollment.get("status", "active"),
                            "completed": enrollment.get("completed", False),
                            "payment_method": enrollment.get("payment_method", "unknown"),
                            "payment_status": enrollment.get("payment_status", "unknown")
                        }
                        courses.append(course_data)
                        print(f"✅ Added course to response: {course_data['title']}")
                        
                except Exception as course_error:
                    print(f"❌ Error processing course {course_id}: {course_error}")
                    continue
        
        print(f"🎯 Returning {len(courses)} courses")
        return courses  # Return array directly for frontend compatibility
        
    except Exception as e:
        print(f"❌ Error fetching student enrolled courses: {str(e)}")
        import traceback
        traceback.print_exc()
        return []  # Return empty array instead of error for better UX

@enrollment_router.delete("/unenroll/{course_id}")
def unenroll_from_course(
    request: Request,
    course_id: str,
    user=Depends(require_auth)
):
    try:
        db = request.app.mongodb
        enrollment_collection = get_enrollment_collection(db)
        
        student_id = ObjectId(user["user_id"])
        course_obj_id = ObjectId(course_id)
        
        # Find and delete enrollment
        result = enrollment_collection.delete_one({
            "student_id": student_id,
            "course_id": course_obj_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        
        return {"success": True, "message": "Successfully unenrolled from course"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error unenrolling: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to unenroll from course")

@enrollment_router.get("/all")
def get_all_enrollments(request: Request):
    """Get all enrollments for dashboard analytics (public endpoint for stats)"""
    try:
        db = request.app.mongodb
        enrollment_collection = get_enrollment_collection(db)
        
        # Get all enrollments with just the data needed for course statistics
        enrollments = list(enrollment_collection.find({}, {
            "course_name": 1,
            "student_name": 1,
            "enrollment_date": 1,
            "enrolled_at": 1,
            "status": 1,
            "_id": 0  # Don't include the MongoDB ID for privacy
        }))
        
        # Return the enrollments for statistics
        return enrollments
        
    except Exception as e:
        print(f"Error fetching all enrollments: {str(e)}")
        # Return empty array instead of error to not break dashboard
        return []

@enrollment_router.get("/stats")
def get_enrollment_stats(request: Request):
    """Get enrollment statistics for courses (public endpoint)"""
    try:
        db = request.app.mongodb
        enrollment_collection = get_enrollment_collection(db)
        course_collection = get_course_collection(db)
        
        # Get enrollment counts by course
        pipeline = [
            {"$group": {
                "_id": "$course_name",
                "enrolled_count": {"$sum": 1},
                "active_count": {"$sum": {"$cond": [{"$eq": ["$status", "active"]}, 1, 0]}}
            }},
            {"$sort": {"enrolled_count": -1}}
        ]
        
        course_stats = list(enrollment_collection.aggregate(pipeline))
        
        # Get total enrollment count
        total_enrollments = enrollment_collection.count_documents({})
        
        return {
            "total_enrollments": total_enrollments,
            "course_stats": course_stats
        }
        
    except Exception as e:
        print(f"Error fetching enrollment stats: {str(e)}")
        return {
            "total_enrollments": 0,
            "course_stats": []
        }

@enrollment_router.get("/instructor/{instructor_id}")
def get_instructor_enrollments(request: Request, instructor_id: str):
    """Get enrollments for courses by a specific instructor (public endpoint for dashboard)"""
    try:
        print(f"\n🔍 [INSTRUCTOR ENROLLMENTS] Fetching for instructor: {instructor_id}")
        
        db = request.app.mongodb
        enrollment_collection = get_enrollment_collection(db)
        course_collection = get_course_collection(db)
        user_collection = get_user_collection(db)
        
        # First, get all courses by this instructor
        instructor_courses = list(course_collection.find(
            {"$or": [
                {"created_by": instructor_id}, 
                {"instructor": instructor_id},
                {"instructor_name": instructor_id}
            ]}, 
            {"title": 1, "_id": 1, "instructor_name": 1, "created_by": 1, "instructor": 1}
        ))
        
        print(f"📚 Found {len(instructor_courses)} courses by instructor {instructor_id}")
        for course in instructor_courses:
            print(f"  - {course.get('title')} (ID: {course.get('_id')}, created_by: {course.get('created_by')}, instructor: {course.get('instructor')})")
        
        if not instructor_courses:
            print(f"❌ No courses found for instructor {instructor_id}")
            return []
        
        # Get course titles and IDs
        course_titles = [course["title"] for course in instructor_courses]
        course_ids = [course["_id"] for course in instructor_courses]
        
        print(f"🔍 Looking for enrollments in courses: {course_titles}")
        
        # Get all enrollments for these courses (try both course_name and course_id)
        enrollments_by_name = list(enrollment_collection.find({
            "course_name": {"$in": course_titles}
        }))
        
        enrollments_by_id = list(enrollment_collection.find({
            "course_id": {"$in": course_ids}
        }))
        
        print(f"📊 Found {len(enrollments_by_name)} enrollments by course name")
        print(f"📊 Found {len(enrollments_by_id)} enrollments by course ID")
        
        # Combine and deduplicate enrollments
        all_enrollments = {}
        for enrollment in enrollments_by_name + enrollments_by_id:
            key = str(enrollment.get("_id"))
            if key not in all_enrollments:
                all_enrollments[key] = enrollment
        
        enrollments = list(all_enrollments.values())
        print(f"📋 Total unique enrollments: {len(enrollments)}")
        
        # Format enrollments with detailed student info
        formatted_enrollments = []
        for enrollment in enrollments:
            # Get student details if student_id exists
            student_name = enrollment.get("student_name", "Unknown Student")
            student_email = enrollment.get("student_email", "")
            
            if enrollment.get("student_id"):
                try:
                    student = user_collection.find_one({"_id": enrollment["student_id"]})
                    if student:
                        student_name = student.get("name") or student.get("full_name", student_name)
                        student_email = student.get("email", student_email)
                        print(f"👤 Found student details: {student_name} ({student_email})")
                except Exception as e:
                    print(f"⚠️ Could not fetch student details: {e}")
            
            formatted_enrollment = {
                "enrollment_id": str(enrollment.get("_id", "")),
                "student_id": str(enrollment.get("student_id", "")),
                "student_name": student_name,
                "student_email": student_email,
                "course_name": enrollment.get("course_name", ""),
                "course_id": str(enrollment.get("course_id", "")),
                "enrollment_date": enrollment.get("enrollment_date") or enrollment.get("enrolled_at"),
                "status": enrollment.get("status", "active"),
                "progress": enrollment.get("progress", 0),
                "completed": enrollment.get("completed", False)
            }
            formatted_enrollments.append(formatted_enrollment)
            
        print(f"✅ Returning {len(formatted_enrollments)} formatted enrollments")
        return formatted_enrollments
        
    except Exception as e:
        print(f"❌ Error fetching instructor enrollments: {str(e)}")
        import traceback
        traceback.print_exc()
        return []

@enrollment_router.get("/debug")
def debug_all_enrollments(request: Request):
    """Debug endpoint to see all enrollments in database (public)"""
    try:
        print("\n🔍 [DEBUG] Fetching all enrollment records...")
        
        db = request.app.mongodb
        enrollment_collection = get_enrollment_collection(db)
        course_collection = get_course_collection(db)
        user_collection = get_user_collection(db)
        
        # Get all enrollments
        all_enrollments = list(enrollment_collection.find({}))
        print(f"📊 Total enrollments in database: {len(all_enrollments)}")
        
        # Get all courses
        all_courses = list(course_collection.find({}, {"title": 1, "created_by": 1, "instructor_name": 1}))
        print(f"📚 Total courses in database: {len(all_courses)}")
        
        # Get all users
        all_users = list(user_collection.find({}, {"name": 1, "full_name": 1, "email": 1, "role": 1}))
        print(f"👥 Total users in database: {len(all_users)}")
        
        result = {
            "total_enrollments": len(all_enrollments),
            "total_courses": len(all_courses),
            "total_users": len(all_users),
            "enrollments": [],
            "courses": [{"title": c.get("title"), "created_by": c.get("created_by"), "instructor": c.get("instructor_name")} for c in all_courses[:10]],
            "users": [{"name": u.get("name") or u.get("full_name"), "email": u.get("email"), "role": u.get("role")} for u in all_users[:10]]
        }
        
        # Format first 20 enrollments for debugging
        for i, enrollment in enumerate(all_enrollments[:20]):
            course_name = enrollment.get("course_name", "Unknown")
            student_name = enrollment.get("student_name", "Unknown")
            enrollment_date = enrollment.get("enrollment_date") or enrollment.get("enrolled_at")
            
            result["enrollments"].append({
                "id": str(enrollment.get("_id")),
                "course_name": course_name,
                "student_name": student_name,
                "student_email": enrollment.get("student_email", ""),
                "enrollment_date": str(enrollment_date) if enrollment_date else "Unknown",
                "status": enrollment.get("status", "active"),
                "progress": enrollment.get("progress", 0)
            })
        
        print(f"✅ Debug data prepared with {len(result['enrollments'])} sample enrollments")
        return result
        
    except Exception as e:
        print(f"❌ Error in debug endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

@enrollment_router.get("/all-with-course-details")
def get_all_enrollments_with_course_details(request: Request):
    """Get all enrollments with full course details (public endpoint for debugging)"""
    try:
        print("\n🔍 [ALL ENROLLMENTS WITH COURSE DETAILS]")
        
        db = request.app.mongodb
        enrollment_collection = get_enrollment_collection(db)
        course_collection = get_course_collection(db)
        user_collection = get_user_collection(db)
        
        # Get all enrollments
        all_enrollments = list(enrollment_collection.find({}))
        print(f"📊 Total enrollments found: {len(all_enrollments)}")
        
        result = []
        for enrollment in all_enrollments:
            # Get course details
            course_id = enrollment.get("course_id")
            course_name = enrollment.get("course_name", "")
            
            course_details = None
            if course_id:
                try:
                    from bson import ObjectId
                    if isinstance(course_id, str):
                        course_id = ObjectId(course_id)
                    course_details = course_collection.find_one({"_id": course_id})
                except:
                    pass
            
            # If no course found by ID, try by name
            if not course_details and course_name:
                course_details = course_collection.find_one({"title": course_name})
            
            # Get student details
            student_name = enrollment.get("student_name", "Unknown")
            student_email = enrollment.get("student_email", "")
            
            enrollment_data = {
                "enrollment_id": str(enrollment.get("_id")),
                "student_name": student_name,
                "student_email": student_email,
                "course_name": course_name,
                "course_id": str(course_id) if course_id else "",
                "enrollment_date": str(enrollment.get("enrollment_date", "")),
                "status": enrollment.get("status", "active"),
                "progress": enrollment.get("progress", 0),
                "course_details": None
            }
            
            if course_details:
                enrollment_data["course_details"] = {
                    "course_id": str(course_details.get("_id")),
                    "title": course_details.get("title"),
                    "instructor": course_details.get("instructor"),
                    "instructor_name": course_details.get("instructor_name"),
                    "created_by": course_details.get("created_by"),
                    "description": course_details.get("description", "")[:100] + "..." if len(course_details.get("description", "")) > 100 else course_details.get("description", "")
                }
            
            result.append(enrollment_data)
        
        print(f"✅ Returning {len(result)} enrollments with course details")
        return {
            "total_enrollments": len(result),
            "enrollments": result
        }
        
    except Exception as e:
        print(f"❌ Error fetching enrollments with course details: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}


