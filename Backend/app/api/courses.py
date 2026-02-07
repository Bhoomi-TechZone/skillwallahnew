from fastapi import APIRouter, Request, Path, Query, HTTPException, Depends, UploadFile, File, Form
from typing import Optional, List
import os
import uuid
import shutil
from pathlib import Path as PathlibPath
from app.schemas.course import CourseCreate, CourseUpdate, CourseFilter
from app.services.course_service import (
    create_course, get_all_courses, get_course_by_id, update_course, delete_course,
    get_courses_by_instructor, get_course_statistics, bulk_update_courses
)
from app.utils.branch_filter import BranchAccessManager
from app.utils.auth_helpers import get_current_user

course_router = APIRouter(prefix="/course", tags=["Courses"])

@course_router.post("/", response_model=dict)
def create_course_handler(request: Request, payload: CourseCreate, user=Depends(get_current_user)):
    """Create a new course with branch-specific access control"""
    db = request.app.mongodb
    
    # Add franchise code to course data if user is a branch admin
    course_data = payload.dict()
    course_data = BranchAccessManager.add_franchise_code_to_data(course_data, user)
    
    # Convert back to CourseCreate object
    payload = CourseCreate(**course_data)
    
    return create_course(db, payload)

@course_router.get("/", response_model=dict)
def get_courses_handler(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of courses to skip"),
    limit: int = Query(100, ge=1, le=500, description="Number of courses to return"),
    category: Optional[str] = Query(None, description="Filter by category"),
    level: Optional[str] = Query(None, description="Filter by level (Beginner, Intermediate, Advanced)"),
    published: Optional[bool] = Query(None, description="Filter by published status"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price filter"),
    search: Optional[str] = Query(None, description="Search in title, description, and tags"),
    instructor: Optional[str] = Query(None, description="Filter by instructor ID"),
    user=Depends(get_current_user)
):
    """Get all courses with optional filtering, pagination, and enriched with enrollment and review data.
    Branch admins will only see courses from their franchise."""
    print(f"[API] Courses request - skip: {skip}, limit: {limit}")
    print(f"[API] User: {user.get('email', 'unknown')} ({user.get('role', 'unknown')})")
    
    db = request.app.mongodb
    
    # Create filter object
    filters = CourseFilter(
        category=category,
        level=level,
        published=published,
        min_price=min_price,
        max_price=max_price,
        search=search,
        instructor=instructor
    )
    
    # Apply branch filtering at database level for security
    branch_filter = BranchAccessManager.get_branch_filter(user)
    print(f"[DEBUG] MongoDB query: {branch_filter}")
    
    # Get courses from service with branch filtering applied at query level
    courses_response = get_all_courses(db, filters, skip, limit, branch_filter)
    courses = courses_response.get('courses', [])
    
    print(f"[DEBUG] Total courses in database: {courses_response.get('total', len(courses))}")
    print(f"[DEBUG] Retrieved {len(courses)} courses from database")
    print(f"[API] Applying branch filtering for user: {user.get('email')}")
    print(f"[API] Filtered courses count: {len(courses)}")  # Will already be filtered at DB level
        
    # Enrich courses with enrollment and review data
    try:
        enrollment_collection = db.enrollments
        reviews_collection = db.reviews if hasattr(db, 'reviews') else None
        
        enriched_courses = []
        for course in courses:
            course_id = course.get('id') or course.get('course_id')
            
            # Count enrollments for this course (also apply branch filtering to enrollments)
            enrollment_filter = {
                "$or": [
                    {"course_id": course_id},
                    {"course_id": str(course_id)},
                    {"course": course_id}
                ]
            }
            
            # Add branch filtering to enrollment count if needed
            if not BranchAccessManager.is_super_admin(user):
                branch_filter = BranchAccessManager.get_branch_filter(user)
                if branch_filter:
                    enrollment_filter = {"$and": [enrollment_filter, branch_filter]}
            
            enrollment_count = enrollment_collection.count_documents(enrollment_filter)
            
            # Get reviews and calculate average rating (also apply branch filtering)
            total_reviews = 0
            average_rating = 0
            if reviews_collection and course_id:
                try:
                    review_filter = {
                        "$or": [
                            {"course_id": course_id},
                            {"course_id": str(course_id)}
                        ]
                    }
                    
                    # Add branch filtering to reviews if needed
                    if not BranchAccessManager.is_super_admin(user):
                        branch_filter = BranchAccessManager.get_branch_filter(user)
                        if branch_filter:
                            review_filter = {"$and": [review_filter, branch_filter]}
                    
                    reviews = list(reviews_collection.find(review_filter))
                    
                    if reviews:
                        total_reviews = len(reviews)
                        ratings = [review.get('rating', 0) for review in reviews if review.get('rating')]
                        if ratings:
                            average_rating = sum(ratings) / len(ratings)
                except Exception as e:
                    print(f"[WARNING] Error fetching reviews for course {course_id}: {e}")
            
            # Enrich course data
            enriched_course = {
                **course,
                'enrolled_students': enrollment_count,
                'total_enrollments': enrollment_count,
                'rating': round(average_rating, 1) if average_rating > 0 else 0,
                'total_reviews': total_reviews,
                'total_ratings': total_reviews  # For compatibility
            }
            
            enriched_courses.append(enriched_course)
            print(f"[DEBUG] Course {course_id}: {enrollment_count} enrollments, {average_rating:.1f} rating")
        
        # Return enriched response
        return {
            **courses_response,
            'courses': enriched_courses
        }
        
    except Exception as e:
        print(f"[ERROR] Error enriching courses with enrollment/review data: {e}")
        # Return original response if enrichment fails
        return courses_response

@course_router.get("/{course_id}", response_model=dict)
def get_course_handler(request: Request, course_id: str = Path(..., description="Course ID")):
    """Get a specific course by ID with enrollment and review data"""
    db = request.app.mongodb
    
    # Get branch filter for multi-tenancy
    current_user = getattr(request.state, 'user', None)
    # Fixed BranchAccessManager usage
    branch_filter = BranchAccessManager.get_branch_filter(current_user) if current_user else None
    
    # Get course from service with branch filtering
    course_response = get_course_by_id(db, course_id, branch_filter)
    course = course_response.get('course')
    
    if course:
        try:
            # Enrich with enrollment and review data
            enrollment_collection = db.enrollments
            reviews_collection = db.reviews if hasattr(db, 'reviews') else None
            
            # Count enrollments
            enrollment_count = enrollment_collection.count_documents({
                "$or": [
                    {"course_id": course_id},
                    {"course_id": str(course_id)},
                    {"course": course_id}
                ]
            })
            
            # Get reviews and ratings
            total_reviews = 0
            average_rating = 0
            recent_reviews = []
            
            if reviews_collection:
                try:
                    reviews = list(reviews_collection.find({
                        "$or": [
                            {"course_id": course_id},
                            {"course_id": str(course_id)}
                        ]
                    }).sort("created_at", -1))
                    
                    if reviews:
                        total_reviews = len(reviews)
                        ratings = [review.get('rating', 0) for review in reviews if review.get('rating')]
                        if ratings:
                            average_rating = sum(ratings) / len(ratings)
                        recent_reviews = reviews[:5]  # Get 5 most recent reviews
                        
                except Exception as e:
                    print(f"[WARNING] Error fetching reviews for course {course_id}: {e}")
            
            # Enrich course data
            enriched_course = {
                **course,
                'enrolled_students': enrollment_count,
                'total_enrollments': enrollment_count,
                'rating': round(average_rating, 1) if average_rating > 0 else 0,
                'total_reviews': total_reviews,
                'total_ratings': total_reviews,
                'recent_reviews': recent_reviews
            }
            
            return {
                **course_response,
                'course': enriched_course
            }
            
        except Exception as e:
            print(f"[ERROR] Error enriching course {course_id}: {e}")
    
    return course_response

@course_router.get("/{course_id}/reviews", response_model=dict)
def get_course_reviews_handler(
    request: Request, 
    course_id: str = Path(..., description="Course ID"),
    skip: int = Query(0, ge=0, description="Number of reviews to skip"),
    limit: int = Query(10, ge=1, le=50, description="Number of reviews to return")
):
    """Get reviews for a specific course"""
    try:
        db = request.app.mongodb
        reviews_collection = db.reviews if hasattr(db, 'reviews') else None
        
        if not reviews_collection:
            return {
                "success": True,
                "reviews": [],
                "total": 0,
                "average_rating": 0,
                "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            }
        
        # Get reviews for the course
        reviews_cursor = reviews_collection.find({
            "$or": [
                {"course_id": course_id},
                {"course_id": str(course_id)}
            ]
        }).sort("created_at", -1).skip(skip).limit(limit)
        
        reviews = list(reviews_cursor)
        
        # Get total count
        total_reviews = reviews_collection.count_documents({
            "$or": [
                {"course_id": course_id},
                {"course_id": str(course_id)}
            ]
        })
        
        # Calculate statistics
        all_reviews = list(reviews_collection.find({
            "$or": [
                {"course_id": course_id},
                {"course_id": str(course_id)}
            ]
        }))
        
        ratings = [review.get('rating', 0) for review in all_reviews if review.get('rating')]
        average_rating = sum(ratings) / len(ratings) if ratings else 0
        
        # Rating distribution
        rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for rating in ratings:
            if 1 <= rating <= 5:
                rating_distribution[int(rating)] += 1
        
        # Convert ObjectId to string for JSON serialization
        for review in reviews:
            if '_id' in review:
                review['_id'] = str(review['_id'])
        
        return {
            "success": True,
            "reviews": reviews,
            "total": total_reviews,
            "average_rating": round(average_rating, 1),
            "rating_distribution": rating_distribution,
            "page": skip // limit + 1,
            "per_page": limit
        }
        
    except Exception as e:
        print(f"[ERROR] Error fetching course reviews: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching course reviews: {str(e)}")

@course_router.get("/{course_id}/content", response_model=dict)
def get_course_content_handler(request: Request, course_id: str = Path(..., description="Course ID")):
    try:
        db = request.app.mongodb
        course_collection = db["courses"]
        branch_courses_collection = db["branch_courses"]
        module_collection = db["modules"]
        
        is_branch_course = False
        course_name = None
        branch_code = None
        franchise_code = None
        
        # Get course data - try multiple collections
        course = course_collection.find_one({"id": course_id})
        if not course:
            try:
                from bson import ObjectId
                course = course_collection.find_one({"_id": ObjectId(course_id)})
            except:
                course = course_collection.find_one({"_id": course_id})
        
        # If not found in courses, try branch_courses
        if not course:
            print(f"⚠️ Course not found in 'courses', trying 'branch_courses'...")
            try:
                from bson import ObjectId
                course = branch_courses_collection.find_one({"_id": ObjectId(course_id)})
            except:
                course = branch_courses_collection.find_one({"_id": course_id})
            
            if not course:
                course = branch_courses_collection.find_one({"id": course_id})
            
            if course:
                is_branch_course = True
                course_name = course.get('course_name', course.get('title'))
                branch_code = course.get('branch_code')
                franchise_code = course.get('franchise_code')
                print(f"✅ Course found in branch_courses: {course_name}")
                # Normalize field names for branch_courses
                if 'course_name' in course and 'title' not in course:
                    course['title'] = course['course_name']
        
        if not course:
            print(f"❌ Course not found in any collection: {course_id}")
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Initialize paper_sets and course_questions for non-branch courses
        paper_sets = []
        course_questions = []
        
        # Get course lectures and PDFs
        course_lectures = course.get("lectures", [])
        course_pdfs = course.get("pdfs", [])
        
        # Get modules for this course
        course_obj_id = course.get("id", course.get("_id"))
        modules = list(module_collection.find({"course_id": course_obj_id}).sort("order", 1))
        
        # Organize content by modules
        organized_modules = []
        for module in modules:
            module_content = []
            module_id_str = str(module["_id"])
            
            # Find lectures for this module
            module_lectures = [
                lecture for lecture in course_lectures 
                if (lecture.get("module_id") == module_id_str or 
                    lecture.get("module_name", "").lower() == module.get("name", "").lower())
            ]
            
            # Find PDFs for this module
            module_pdfs = [
                pdf for pdf in course_pdfs 
                if (pdf.get("module_id") == module_id_str or 
                    pdf.get("module_name", "").lower() == module.get("name", "").lower())
            ]
            
            # Add lectures to module content
            for lecture in module_lectures:
                module_content.append({
                    "type": "video",
                    "title": lecture.get("original_name", lecture.get("filename")),
                    "filename": lecture.get("filename"),
                    "file_path": lecture.get("file_path"),
                    "file_size": lecture.get("file_size"),
                    "upload_date": lecture.get("upload_date"),
                    "sequence_number": lecture.get("sequence_number")
                })
            
            # Add PDFs to module content
            for pdf in module_pdfs:
                module_content.append({
                    "type": "pdf",
                    "title": pdf.get("original_name", pdf.get("filename")),
                    "filename": pdf.get("filename"),
                    "file_path": pdf.get("file_path"),
                    "file_size": pdf.get("file_size"),
                    "upload_date": pdf.get("upload_date"),
                    "sequence_number": pdf.get("sequence_number")
                })
            
            # Sort content by sequence number
            module_content.sort(key=lambda x: x.get("sequence_number", 0))
            
            organized_modules.append({
                "id": module_id_str,
                "name": module.get("name"),
                "title": module.get("name"),
                "description": module.get("description"),
                "order": module.get("order", 0),
                "content": module_content
            })
        
        # Handle content without modules (fallback)
        unassigned_content = []
        assigned_lecture_ids = set()
        assigned_pdf_ids = set()
        
        # Collect IDs of assigned content
        for module in organized_modules:
            for content in module["content"]:
                if content["type"] == "video":
                    assigned_lecture_ids.add(content["filename"])
                else:
                    assigned_pdf_ids.add(content["filename"])
        
        # Find unassigned lectures
        for lecture in course_lectures:
            if lecture.get("filename") not in assigned_lecture_ids:
                unassigned_content.append({
                    "type": "video",
                    "title": lecture.get("original_name", lecture.get("filename")),
                    "filename": lecture.get("filename"),
                    "file_path": lecture.get("file_path"),
                    "file_size": lecture.get("file_size"),
                    "upload_date": lecture.get("upload_date"),
                    "sequence_number": lecture.get("sequence_number")
                })
        
        # Find unassigned PDFs
        for pdf in course_pdfs:
            if pdf.get("filename") not in assigned_pdf_ids:
                unassigned_content.append({
                    "type": "pdf",
                    "title": pdf.get("original_name", pdf.get("filename")),
                    "filename": pdf.get("filename"),
                    "file_path": pdf.get("file_path"),
                    "file_size": pdf.get("file_size"),
                    "upload_date": pdf.get("upload_date"),
                    "sequence_number": pdf.get("sequence_number")
                })
        
        # For branch courses, also fetch study materials, video classes, and syllabi
        if is_branch_course and course_name:
            print(f"📚 Fetching branch content for course: {course_name}, branch: {branch_code}")
            
            # Build filter for branch content
            branch_filter = {"status": "active"}
            if branch_code:
                branch_filter["branch_code"] = branch_code
            if franchise_code:
                branch_filter["franchise_code"] = franchise_code
            
            # Fetch study materials for this course
            study_materials_filter = {**branch_filter}
            # Try multiple field names for course matching
            study_materials = list(db.branch_study_materials.find({
                "$or": [
                    {"course_name": course_name, **branch_filter},
                    {"course_id": course_id, **branch_filter},
                    {"course_name": {"$regex": course_name.strip(), "$options": "i"}, **branch_filter}
                ]
            }))
            print(f"📖 Found {len(study_materials)} study materials")
            
            for idx, material in enumerate(study_materials):
                material_type = material.get("material_type", "document")
                file_url = material.get("file_url", "")
                
                # Determine content type based on material_type or file extension
                if material_type in ["video", "recording"] or (file_url and any(ext in file_url.lower() for ext in ['.mp4', '.webm', '.mov', '.avi'])):
                    content_type = "video"
                else:
                    content_type = "pdf"
                
                unassigned_content.append({
                    "type": content_type,
                    "title": material.get("material_name", f"Study Material {idx+1}"),
                    "filename": material.get("file_url", "").split("/")[-1] if material.get("file_url") else "",
                    "file_path": material.get("file_url", ""),
                    "file_size": material.get("file_size"),
                    "upload_date": material.get("created_at"),
                    "sequence_number": idx,
                    "description": material.get("description", ""),
                    "external_link": material.get("external_link")
                })
            
            # Fetch video classes for this course
            video_classes = list(db.video_classes.find({
                "$or": [
                    {"course_name": course_name, **branch_filter},
                    {"course_id": course_id, **branch_filter},
                    {"course_name": {"$regex": course_name.strip(), "$options": "i"}, **branch_filter}
                ]
            }))
            print(f"🎥 Found {len(video_classes)} video classes")
            
            for idx, video in enumerate(video_classes):
                unassigned_content.append({
                    "type": "video",
                    "title": video.get("title", video.get("class_name", f"Video Class {idx+1}")),
                    "filename": video.get("file_url", "").split("/")[-1] if video.get("file_url") else "",
                    "file_path": video.get("file_url", ""),
                    "file_size": video.get("file_size"),
                    "upload_date": video.get("created_at"),
                    "sequence_number": len(study_materials) + idx,
                    "description": video.get("description", ""),
                    "external_link": video.get("video_url") or video.get("youtube_url") or video.get("external_link"),
                    "duration": video.get("duration")
                })
            
            # Fetch syllabi for this course
            syllabi = list(db.branch_syllabi.find({
                "$or": [
                    {"course_name": course_name, **branch_filter},
                    {"course_id": course_id, **branch_filter},
                    {"course_name": {"$regex": course_name.strip(), "$options": "i"}, **branch_filter}
                ]
            }))
            print(f"📋 Found {len(syllabi)} syllabi")
            
            for idx, syllabus in enumerate(syllabi):
                unassigned_content.append({
                    "type": "pdf",
                    "title": syllabus.get("syllabus_name", syllabus.get("title", f"Syllabus {idx+1}")),
                    "filename": syllabus.get("file_url", "").split("/")[-1] if syllabus.get("file_url") else "",
                    "file_path": syllabus.get("file_url", ""),
                    "file_size": syllabus.get("file_size"),
                    "upload_date": syllabus.get("created_at"),
                    "sequence_number": len(study_materials) + len(video_classes) + idx,
                    "description": syllabus.get("description", "")
                })
            
            # Fetch paper sets (quizzes/tests) for this course
            paper_sets = list(db.branch_paper_sets.find({
                "$or": [
                    {"courseName": course_name, "branchCode": branch_code, "franchiseCode": franchise_code},
                    {"courseName": course_name.strip(), "branchCode": branch_code},
                    {"courseName": {"$regex": course_name.strip(), "$options": "i"}, "branchCode": branch_code},
                    {"course_name": course_name, "branch_code": branch_code},
                    {"course_id": course_id}
                ],
                "status": {"$ne": "deleted"}
            }))
            print(f"📝 Found {len(paper_sets)} paper sets/quizzes")
            
            # Fetch questions from questions collection for this course
            questions_filter = {
                "$or": [
                    {"course": course_name, "branch_code": branch_code},
                    {"course": course_name, "franchise_code": franchise_code},
                    {"course": course_name.strip(), "branch_code": branch_code},
                    {"course": {"$regex": course_name.strip(), "$options": "i"}, "branch_code": branch_code},
                    {"course_name": course_name, "branch_code": branch_code},
                    {"course_id": course_id, "branch_code": branch_code},
                    # Also get questions by paper_set_id for linked paper sets
                    {"paper_set_id": {"$in": [str(ps.get("_id")) for ps in paper_sets]}} if paper_sets else {"_id": None}
                ]
            }
            course_questions = list(db.questions.find(questions_filter))
            print(f"❓ Found {len(course_questions)} questions for course: {course_name}")
        
        # Add unassigned content as a general module if exists
        if unassigned_content:
            unassigned_content.sort(key=lambda x: x.get("sequence_number", 0))
            organized_modules.append({
                "id": "general",
                "name": "Course Materials",
                "title": "Course Materials",
                "description": "General course materials",
                "order": 999,
                "content": unassigned_content
            })
        
        # Prepare paper sets response
        quizzes_data = []
        if is_branch_course:
            for ps in paper_sets:
                quizzes_data.append({
                    "id": str(ps.get("_id")),
                    "name": ps.get("paperName", ps.get("paper_name", "Unnamed Test")),
                    "questions": ps.get("numberOfQuestions", ps.get("total_questions", 0)),
                    "duration": ps.get("timeLimit", ps.get("duration", 0)),
                    "marks": ps.get("perQuestionMark", ps.get("marks_per_question", 0)),
                    "total_marks": ps.get("totalMarks", ps.get("total_marks", 0)),
                    "status": ps.get("status", "active"),
                    "available_from": ps.get("availableFrom"),
                    "available_to": ps.get("availableTo"),
                    "course_name": ps.get("courseName", ps.get("course_name")),
                    "description": ps.get("description", "")
                })
        
        # Prepare questions data
        questions_data = []
        for q in course_questions:
            questions_data.append({
                "id": str(q.get("_id")),
                "question_text": q.get("question_text", ""),
                "option_a": q.get("option_a", ""),
                "option_b": q.get("option_b", ""),
                "option_c": q.get("option_c", ""),
                "option_d": q.get("option_d", ""),
                "correct_answer": q.get("correct_answer", ""),
                "marks": q.get("marks", 1),
                "negative_marks": q.get("negative_marks", 0),
                "difficulty": q.get("difficulty", "medium"),
                "subject": q.get("subject", ""),
                "explanation": q.get("explanation", ""),
                "paper_set_id": q.get("paper_set_id"),
                "course": q.get("course", q.get("course_name", ""))
            })
        
        from app.utils.serializers import serialize_document
        return {
            "course": serialize_document(course),
            "modules": organized_modules,
            "total_modules": len(organized_modules),
            "total_content": sum(len(m["content"]) for m in organized_modules),
            "quizzes": quizzes_data,
            "total_quizzes": len(quizzes_data),
            "questions": questions_data,
            "total_questions": len(questions_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting course content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get course content: {str(e)}")

@course_router.put("/{course_id}", response_model=dict)
def update_course_handler(
    payload: CourseUpdate,
    request: Request, 
    course_id: str = Path(..., description="Course ID")
):
    """Update a specific course"""
    print(f"=== COURSE UPDATE ENDPOINT DEBUG ===")
    print(f"Course ID: {course_id}")
    print(f"Payload type: {type(payload)}")
    print(f"Payload data: {payload}")
    if hasattr(payload, 'model_dump'):
        print(f"Payload dict: {payload.model_dump()}")
    else:
        print(f"Payload dict: {payload.dict()}")
    print(f"====================================")
    db = request.app.mongodb
    return update_course(db, course_id, payload)

@course_router.delete("/{course_id}", response_model=dict)
def delete_course_handler(request: Request, course_id: str = Path(..., description="Course ID")):
    """Delete a specific course"""
    db = request.app.mongodb
    return delete_course(db, course_id)

@course_router.post("/{course_id}/enroll", response_model=dict)
def enroll_in_course_handler(request: Request, course_id: str = Path(..., description="Course ID"), current_user: dict = Depends(get_current_user)):
    """Enroll the current user in a course"""
    from datetime import datetime
    from bson import ObjectId
    
    db = request.app.mongodb
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required to enroll in course")
    
    print(f"\n{'='*60}")
    print(f"🎓 [COURSE ENROLL] Starting enrollment")
    print(f"{'='*60}")
    print(f"User: {current_user}")
    print(f"Course ID: {course_id}")
    
    # Get user info from token
    user_id = current_user.get("user_id") or current_user.get("id") or current_user.get("sub")
    email = current_user.get("email", "")
    name = current_user.get("name") or current_user.get("full_name", "")
    branch_code = current_user.get("branch_code", "")
    franchise_code = current_user.get("franchise_code", "")
    is_branch_student = current_user.get("is_branch_student", False)
    
    print(f"User ID: {user_id}")
    print(f"Email: {email}")
    print(f"Name: {name}")
    print(f"Branch Code: {branch_code}")
    print(f"Is Branch Student: {is_branch_student}")
    
    # Validate course exists
    course = None
    
    # First check branch_courses if user is branch student
    if is_branch_student and branch_code:
        try:
            course = db.branch_courses.find_one({"_id": ObjectId(course_id)})
            if course:
                print(f"✅ Found course in branch_courses: {course.get('course_name')}")
        except:
            pass
    
    # Then check main courses collection
    if not course:
        try:
            course = db.courses.find_one({"_id": ObjectId(course_id)})
            if course:
                print(f"✅ Found course in courses: {course.get('title')}")
        except:
            pass
    
    if not course:
        print(f"❌ Course not found: {course_id}")
        raise HTTPException(status_code=404, detail="Course not found")
    
    course_name = course.get("course_name") or course.get("title") or "Unknown Course"
    
    # Check if already enrolled
    enrollment_collection = db.enrollments
    
    existing = enrollment_collection.find_one({
        "$or": [
            {"student_id": user_id, "course_id": course_id},
            {"user_id": user_id, "course_id": course_id},
            {"email": email, "course_id": course_id}
        ]
    })
    
    if existing:
        print(f"⚠️ User already enrolled in this course")
        return {
            "success": True,
            "message": "You are already enrolled in this course",
            "enrollment_id": str(existing["_id"]),
            "already_enrolled": True
        }
    
    # Create enrollment record
    enrollment_doc = {
        "student_id": user_id,
        "user_id": user_id,
        "email": email,
        "student_name": name,
        "course_id": course_id,
        "course_name": course_name,
        "branch_code": branch_code,
        "franchise_code": franchise_code,
        "is_branch_student": is_branch_student,
        "enrollment_date": datetime.now(),
        "progress": 0,
        "completed": False,
        "status": "active",
        "payment_status": "free",
        "payment_method": "free",
        "amount_paid": 0,
        "last_accessed": datetime.now()
    }
    
    print(f"📄 Creating enrollment:")
    print(f"   - Student: {name} ({email})")
    print(f"   - Course: {course_name}")
    print(f"   - Branch: {branch_code}")
    
    result = enrollment_collection.insert_one(enrollment_doc)
    print(f"✅ Enrollment created: {result.inserted_id}")
    
    return {
        "success": True,
        "message": f"Successfully enrolled in {course_name}",
        "enrollment_id": str(result.inserted_id),
        "already_enrolled": False
    }

@course_router.get("/instructor/{instructor_id}", response_model=dict)
def get_instructor_courses_handler(
    request: Request, 
    instructor_id: str = Path(..., description="Instructor user ID"),
    published_only: bool = Query(False, description="Return only published courses")
):
    """Get all courses for a specific instructor with total count"""
    try:
        db = request.app.mongodb
        
        # Get branch filter for multi-tenancy
        current_user = getattr(request.state, 'user', None)
        # Fixed BranchAccessManager usage
        branch_filter = BranchAccessManager.get_branch_filter(current_user) if current_user else None
        
        print(f"DEBUG: Calling service with instructor_id={instructor_id}, published_only={published_only}")
        result = get_courses_by_instructor(db, instructor_id, published_only, branch_filter)
        print(f"DEBUG: Service returned type={type(result)}, keys={list(result.keys()) if isinstance(result, dict) else 'Not dict'}")
        print(f"DEBUG: Result preview: {str(result)[:200]}...")
        return result
    except Exception as e:
        print(f"ERROR in get_instructor_courses_handler: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching courses: {str(e)}")

@course_router.get("/{course_id}/statistics", response_model=dict)
def get_course_statistics_handler(
    request: Request, 
    course_id: str = Path(..., description="Course ID")
):
    """Get detailed statistics for a course"""
    db = request.app.mongodb
    
    # Get branch filter for multi-tenancy
    current_user = getattr(request.state, 'user', None)
    # Fixed BranchAccessManager usage
    branch_filter = BranchAccessManager.get_branch_filter(current_user) if current_user else None
    
    return get_course_statistics(db, course_id, branch_filter)

@course_router.patch("/bulk-update", response_model=dict)
def bulk_update_courses_handler(
    request: Request,
    course_ids: List[str],
    updates: dict
):
    """Bulk update multiple courses"""
    db = request.app.mongodb
    
    if not course_ids:
        raise HTTPException(status_code=400, detail="Course IDs list cannot be empty")
    
    if not updates:
        raise HTTPException(status_code=400, detail="Updates dictionary cannot be empty")
    
    return bulk_update_courses(db, course_ids, updates)

@course_router.get("/categories/list", response_model=List[str])
def get_course_categories_handler(request: Request):
    """Get all unique course categories"""
    db = request.app.mongodb
    try:
        collection = db["courses"]
        categories = collection.distinct("category")
        return [cat for cat in categories if cat]  # Filter out None/empty values
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching categories: {str(e)}")

@course_router.get("/levels/list", response_model=List[str])
def get_course_levels_handler(request: Request):
    """Get all available course levels"""
    return ["Beginner", "Intermediate", "Advanced"]

@course_router.post("/{course_id}/upload-lecture")
async def upload_lecture_handler(
    request: Request,
    course_id: str = Path(..., description="Course ID"),
    file: UploadFile = File(...),
    module_name: Optional[str] = Form(None, description="Module name for organizing files"),
    module_id: Optional[str] = Form(None, description="Module ID if exists"),
):
    """Upload lecture video for a course"""
    try:
        db = request.app.mongodb
        
        # Verify course exists
        course_collection = db["courses"]
        
        # Try to find course by id field (string) or by _id (MongoDB ObjectId)
        from bson import ObjectId
        course = None
        
        # First try by 'id' field (which is what the courses seem to use)
        course = course_collection.find_one({"id": course_id})
        
        # If not found, try by '_id' field as ObjectId
        if not course:
            try:
                course = course_collection.find_one({"_id": ObjectId(course_id)})
            except:
                # If ObjectId conversion fails, try as string
                course = course_collection.find_one({"_id": course_id})
            
        if not course:
            raise HTTPException(status_code=404, detail=f"Course not found with ID: {course_id}")
        
        # Validate file type
        allowed_video_types = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm']
        if file.content_type not in allowed_video_types:
            raise HTTPException(
                status_code=415, 
                detail="Unsupported file type. Please upload MP4, AVI, MOV, WMV, or WebM files."
            )
        
        # Validate file size (500MB max)
        max_size = 500 * 1024 * 1024  # 500MB
        file_size = 0
        content = await file.read()
        file_size = len(content)
        
        if file_size > max_size:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 500MB.")
        
        # Create organized directory structure: uploads/courses/{course_name}/{module_name}/
        course_name = course.get("title", "unknown_course")
        # Clean course name for folder (remove special characters)
        clean_course_name = "".join(c for c in course_name if c.isalnum() or c in (' ', '_', '-')).strip()
        clean_course_name = clean_course_name.replace(' ', '_')
        
        # Clean module name if provided, otherwise use "general"
        if module_name:
            clean_module_name = "".join(c for c in module_name if c.isalnum() or c in (' ', '_', '-')).strip()
            clean_module_name = clean_module_name.replace(' ', '_')
        else:
            clean_module_name = "general"
        
        # Create module in database if it doesn't exist and module_name is provided
        created_module_id = module_id  # Use provided module_id if exists
        if module_name and module_name != "general" and not created_module_id:
            try:
                from bson import ObjectId
                module_collection = db["modules"]
                
                # Try to find course by id or _id
                course_obj_id = None
                if "id" in course:
                    # Try to find by id field first
                    course_obj_id = course["id"]
                elif "_id" in course:
                    course_obj_id = course["_id"]
                
                # Check if module already exists for this course
                existing_module = module_collection.find_one({
                    "course_id": course_obj_id,
                    "name": module_name
                })
                
                if not existing_module:
                    # Get the max order number for modules in this course
                    max_order_module = module_collection.find_one(
                        {"course_id": course_obj_id},
                        sort=[("order", -1)]
                    )
                    next_order = (max_order_module.get("order", 0) + 1) if max_order_module else 1
                    
                    # Create new module
                    from datetime import datetime
                    new_module = {
                        "name": module_name,
                        "course_id": course_obj_id,
                        "order": next_order,
                        "description": f"Module for {module_name}",
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                    result = module_collection.insert_one(new_module)
                    created_module_id = str(result.inserted_id)
                    print(f"✓ Created new module: {module_name} with ID: {created_module_id}")
                else:
                    created_module_id = str(existing_module["_id"])
                    print(f"✓ Using existing module: {module_name} with ID: {created_module_id}")
            except Exception as e:
                print(f"⚠ Warning: Could not create/find module: {str(e)}")
                # Continue with upload even if module creation fails
        
        upload_dir = PathlibPath("uploads/courses") / clean_course_name / clean_module_name
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate automatic lecture name based on course name + sequence
        course_prefix = clean_course_name[:3].upper()  # First 3 characters
        
        # Count existing lectures to get next sequence number
        existing_lectures = course.get("lectures", [])
        lecture_count = len(existing_lectures) + 1
        
        # Generate filename with original extension
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'mp4'
        auto_filename = f"{course_prefix}{lecture_count}.{file_extension}"
        file_path = upload_dir / auto_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Update course with lecture information
        from datetime import datetime
        print(f"DEBUG LECTURE: Final linking - module_name={clean_module_name}, module_id={created_module_id}")
        
        lecture_data = {
            "filename": auto_filename,
            "original_name": file.filename,
            "file_path": str(file_path),
            "file_size": file_size,
            "content_type": file.content_type,
            "upload_date": datetime.utcnow(),
            "sequence_number": lecture_count,
            "course_prefix": course_prefix,
            "module_name": clean_module_name,
            "module_id": created_module_id  # Add module_id for better linking
        }
        
        # Add to course lectures array - use the same query that found the course
        if "id" in course:
            query = {"id": course["id"]}
        elif "_id" in course:
            query = {"_id": course["_id"]}
        else:
            query = {"id": course_id}  # fallback
            
        course_collection.update_one(
            query,
            {
                "$push": {"lectures": lecture_data},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return {
            "message": "Lecture uploaded successfully",
            "filename": auto_filename,
            "original_name": file.filename,
            "file_size": file_size,
            "course_id": course_id,
            "sequence_number": lecture_count,
            "folder_path": str(upload_dir),
            "module_name": clean_module_name,
            "module_id": created_module_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading lecture: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload lecture: {str(e)}")

@course_router.post("/{course_id}/upload-pdf")
async def upload_pdf_handler(
    request: Request,
    course_id: str = Path(..., description="Course ID"),
    file: UploadFile = File(...),
    module_name: Optional[str] = Form(None, description="Module name for organizing files"),
    module_id: Optional[str] = Form(None, description="Module ID if exists"),
):
    """Upload PDF materials for a course"""
    try:
        db = request.app.mongodb
        
        # Verify course exists
        course_collection = db["courses"]
        
        # Try to find course by id field (string) or by _id (MongoDB ObjectId)
        from bson import ObjectId
        course = None
        
        # First try by 'id' field (which is what the courses seem to use)
        course = course_collection.find_one({"id": course_id})
        
        # If not found, try by '_id' field as ObjectId
        if not course:
            try:
                course = course_collection.find_one({"_id": ObjectId(course_id)})
            except:
                # If ObjectId conversion fails, try as string
                course = course_collection.find_one({"_id": course_id})
            
        if not course:
            raise HTTPException(status_code=404, detail=f"Course not found with ID: {course_id}")
        
        # Validate file type
        if file.content_type != 'application/pdf':
            raise HTTPException(
                status_code=415, 
                detail="Unsupported file type. Please upload PDF files only."
            )
        
        # Validate file size (50MB max for PDFs)
        max_size = 50 * 1024 * 1024  # 50MB
        content = await file.read()
        file_size = len(content)
        
        if file_size > max_size:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 50MB.")
        
        # Create organized directory structure: uploads/courses/{course_name}/{module_name}/
        course_name = course.get("title", "unknown_course")
        # Clean course name for folder (remove special characters)
        clean_course_name = "".join(c for c in course_name if c.isalnum() or c in (' ', '_', '-')).strip()
        clean_course_name = clean_course_name.replace(' ', '_')
        
        # Clean module name if provided, otherwise use "general"
        if module_name:
            clean_module_name = "".join(c for c in module_name if c.isalnum() or c in (' ', '_', '-')).strip()
            clean_module_name = clean_module_name.replace(' ', '_')
        else:
            clean_module_name = "general"
        
        # Create module in database if it doesn't exist and module_name is provided
        created_module_id = module_id  # Use provided module_id if exists
        if module_name and module_name != "general" and not created_module_id:
            try:
                from bson import ObjectId
                module_collection = db["modules"]
                
                # Try to find course by id or _id
                course_obj_id = None
                if "id" in course:
                    course_obj_id = course["id"]
                elif "_id" in course:
                    course_obj_id = course["_id"]
                
                # Check if module already exists for this course
                existing_module = module_collection.find_one({
                    "course_id": course_obj_id,
                    "name": module_name
                })
                
                if not existing_module:
                    # Get the max order number for modules in this course
                    max_order_module = module_collection.find_one(
                        {"course_id": course_obj_id},
                        sort=[("order", -1)]
                    )
                    next_order = (max_order_module.get("order", 0) + 1) if max_order_module else 1
                    
                    # Create new module
                    from datetime import datetime
                    new_module = {
                        "name": module_name,
                        "course_id": course_obj_id,
                        "order": next_order,
                        "description": f"Module for {module_name}",
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                    result = module_collection.insert_one(new_module)
                    created_module_id = str(result.inserted_id)
                    print(f"✓ Created new module: {module_name} with ID: {created_module_id}")
                else:
                    created_module_id = str(existing_module["_id"])
                    print(f"✓ Using existing module: {module_name} with ID: {created_module_id}")
            except Exception as e:
                print(f"⚠ Warning: Could not create/find module: {str(e)}")
                # Continue with upload even if module creation fails
        
        upload_dir = PathlibPath("uploads/courses") / clean_course_name / clean_module_name
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate automatic PDF name based on course name + sequence (separate from lectures)
        course_prefix = clean_course_name[:3].upper()  # First 3 characters
        
        # Count existing PDFs to get next sequence number
        existing_pdfs = course.get("pdfs", [])
        pdf_count = len(existing_pdfs) + 1
        
        # Generate PDF filename
        auto_filename = f"{course_prefix}{pdf_count}.pdf"
        file_path = upload_dir / auto_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Update course with PDF information
        from datetime import datetime
        print(f"DEBUG PDF: Final linking - module_name={clean_module_name}, module_id={created_module_id}")
        
        pdf_data = {
            "filename": auto_filename,
            "original_name": file.filename,
            "file_path": str(file_path),
            "file_size": file_size,
            "content_type": file.content_type,
            "upload_date": datetime.utcnow(),
            "sequence_number": pdf_count,
            "course_prefix": course_prefix,
            "module_name": clean_module_name,
            "module_id": created_module_id  # Add module_id for better linking
        }
        
        # Add to course PDFs array - use the same query that found the course
        if "id" in course:
            query = {"id": course["id"]}
        elif "_id" in course:
            query = {"_id": course["_id"]}
        else:
            query = {"id": course_id}  # fallback
            
        course_collection.update_one(
            query,
            {
                "$push": {"pdfs": pdf_data},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return {
            "message": "PDF uploaded successfully",
            "filename": auto_filename,
            "original_name": file.filename,
            "file_size": file_size,
            "course_id": course_id,
            "sequence_number": pdf_count,
            "folder_path": str(upload_dir),
            "module_name": clean_module_name,
            "module_id": created_module_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload PDF: {str(e)}")

@course_router.get("/{course_id}/lectures")
def get_course_lectures_handler(request: Request, course_id: str = Path(..., description="Course ID")):
    """Get all lectures for a course"""
    try:
        db = request.app.mongodb
        course_collection = db["courses"]
        
        # Try to find course by id field first, then _id
        course = course_collection.find_one({"id": course_id}, {"lectures": 1, "title": 1})
        if not course:
            # Try with _id as ObjectId
            from bson import ObjectId
            try:
                course = course_collection.find_one({"_id": ObjectId(course_id)}, {"lectures": 1, "title": 1})
            except:
                course = course_collection.find_one({"_id": course_id}, {"lectures": 1, "title": 1})
        
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        return {
            "course_id": course_id,
            "course_title": course.get("title", ""),
            "lectures": course.get("lectures", []),
            "total_lectures": len(course.get("lectures", []))
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching lectures: {str(e)}")

@course_router.get("/{course_id}/pdfs")
def get_course_pdfs_handler(request: Request, course_id: str = Path(..., description="Course ID")):
    """Get all PDFs for a course"""
    try:
        db = request.app.mongodb
        course_collection = db["courses"]
        
        # Try to find course by id field first, then _id
        course = course_collection.find_one({"id": course_id}, {"pdfs": 1, "title": 1})
        if not course:
            # Try with _id as ObjectId
            from bson import ObjectId
            try:
                course = course_collection.find_one({"_id": ObjectId(course_id)}, {"pdfs": 1, "title": 1})
            except:
                course = course_collection.find_one({"_id": course_id}, {"pdfs": 1, "title": 1})
        
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        return {
            "course_id": course_id,
            "course_title": course.get("title", ""),
            "pdfs": course.get("pdfs", []),
            "total_pdfs": len(course.get("pdfs", []))
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching PDFs: {str(e)}")

@course_router.delete("/{course_id}/lecture/{lecture_filename}")
def delete_lecture_handler(
    request: Request, 
    course_id: str = Path(..., description="Course ID"),
    lecture_filename: str = Path(..., description="Lecture filename")
):
    """Delete a specific lecture from a course"""
    try:
        db = request.app.mongodb
        course_collection = db["courses"]
        
        # Remove lecture from database
        from datetime import datetime
        result = course_collection.update_one(
            {"_id": course_id},
            {
                "$pull": {"lectures": {"filename": lecture_filename}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Try to delete file from filesystem using new structure
        try:
            # Get course to find the file path and module name
            course_info = course_collection.find_one(
                {"id": course_id}, 
                {"title": 1, "lectures": 1}
            )
            if course_info:
                course_name = course_info.get("title", "unknown_course")
                clean_course_name = "".join(c for c in course_name if c.isalnum() or c in (' ', '_', '-')).strip()
                clean_course_name = clean_course_name.replace(' ', '_')
                
                # Find the lecture to get its module name
                lectures = course_info.get("lectures", [])
                lecture = next((l for l in lectures if l.get("filename") == lecture_filename), None)
                module_name = lecture.get("module_name", "general") if lecture else "general"
                
                file_path = PathlibPath("uploads/courses") / clean_course_name / module_name / lecture_filename
                if file_path.exists():
                    file_path.unlink()
                else:
                    # Try old path structure for backward compatibility
                    old_path = PathlibPath("uploads/courses") / clean_course_name / "sessions" / lecture_filename
                    if old_path.exists():
                        old_path.unlink()
        except Exception as e:
            print(f"Warning: Could not delete file {lecture_filename}: {str(e)}")
        
        return {"message": "Lecture deleted successfully", "filename": lecture_filename}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting lecture: {str(e)}")

@course_router.delete("/{course_id}/pdf/{pdf_filename}")
def delete_pdf_handler(
    request: Request, 
    course_id: str = Path(..., description="Course ID"),
    pdf_filename: str = Path(..., description="PDF filename")
):
    """Delete a specific PDF from a course"""
    try:
        db = request.app.mongodb
        course_collection = db["courses"]
        
        # Remove PDF from database
        from datetime import datetime
        result = course_collection.update_one(
            {"_id": course_id},
            {
                "$pull": {"pdfs": {"filename": pdf_filename}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Try to delete file from filesystem using new structure
        try:
            # Get course to find the file path and module name
            course_info = course_collection.find_one(
                {"id": course_id}, 
                {"title": 1, "pdfs": 1}
            )
            if course_info:
                course_name = course_info.get("title", "unknown_course")
                clean_course_name = "".join(c for c in course_name if c.isalnum() or c in (' ', '_', '-')).strip()
                clean_course_name = clean_course_name.replace(' ', '_')
                
                # Find the PDF to get its module name
                pdfs = course_info.get("pdfs", [])
                pdf = next((p for p in pdfs if p.get("filename") == pdf_filename), None)
                module_name = pdf.get("module_name", "general") if pdf else "general"
                
                file_path = PathlibPath("uploads/courses") / clean_course_name / module_name / pdf_filename
                if file_path.exists():
                    file_path.unlink()
                else:
                    # Try old path structure for backward compatibility
                    old_path = PathlibPath("uploads/courses") / clean_course_name / "sessions" / pdf_filename
                    if old_path.exists():
                        old_path.unlink()
        except Exception as e:
            print(f"Warning: Could not delete file {pdf_filename}: {str(e)}")
        
        return {"message": "PDF deleted successfully", "filename": pdf_filename}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting PDF: {str(e)}")


