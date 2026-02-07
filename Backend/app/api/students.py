"""
Students API - Endpoints for student-related operations
"""
from fastapi import APIRouter, HTTPException, Request, Depends, File, UploadFile, Form
from app.utils.auth_helpers_enhanced import get_current_user
from bson import ObjectId
from datetime import datetime
import traceback
import logging
import os
import uuid
from pathlib import Path
import shutil

# Get logger
logger = logging.getLogger("uvicorn")

# Create router
students_router = APIRouter(prefix="/api/students", tags=["Students"])


@students_router.get("/enrolled-courses")
async def get_student_enrolled_courses(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    try:
        db = request.app.mongodb
        
        # Get user_id - try multiple fields from token
        user_id = current_user.get("user_id") or current_user.get("student_id") or current_user.get("id") or current_user.get("_id")
        is_branch_student = current_user.get("is_branch_student", False)
        branch_code = current_user.get("branch_code")
        franchise_code = current_user.get("franchise_code")
        
        logger.info(f"[ENROLLED-COURSES] Fetching courses for user: {user_id}, is_branch_student: {is_branch_student}")
        
        enrolled_courses = []
        
        if is_branch_student:
            # For branch students, get their course from branch_students collection
            student = None
            
            # Try finding by ObjectId first
            if user_id:
                try:
                    student = db.branch_students.find_one({"_id": ObjectId(user_id)})
                except:
                    pass
            
            if not student and user_id:
                # Try finding by other ID fields
                student = db.branch_students.find_one({
                    "$or": [
                        {"user_id": user_id},
                        {"student_id": user_id}
                    ]
                })
            
            # Try finding by email if still not found
            email = current_user.get("email")
            if not student and email:
                student = db.branch_students.find_one({
                    "email": email,
                    "branch_code": branch_code
                })
                logger.info(f"[ENROLLED-COURSES] Searched by email {email}, found: {bool(student)}")
            
            if student:
                student_course_name = student.get("course", student.get("course_name"))
                student_batch = student.get("batch", student.get("batch_name"))
                
                logger.info(f"[ENROLLED-COURSES] Found student: {student.get('name', student.get('full_name'))} with course: {student_course_name}, batch: {student_batch}")
                
                if student_course_name:
                    # Find the course in branch_courses
                    course_filter = {
                        "branch_code": branch_code,
                        "franchise_code": franchise_code
                    }
                    
                    # Try exact match first
                    course = db.branch_courses.find_one({
                        "course_name": student_course_name,
                        **course_filter
                    })
                    
                    # Try regex match if exact match fails
                    if not course:
                        course = db.branch_courses.find_one({
                            "course_name": {"$regex": student_course_name.strip(), "$options": "i"},
                            **course_filter
                        })
                    
                    if course:
                        course_id = str(course.get("_id"))
                        logger.info(f"[ENROLLED-COURSES] Found course in branch_courses: {course.get('course_name')}, id: {course_id}")
                        
                        # Get instructor info - try multiple sources
                        instructor_name = course.get("instructor_name") or course.get("instructor") or ""
                        if not instructor_name:
                            # Try to find instructor from batch
                            batch_doc = db.branch_batches.find_one({
                                "$or": [
                                    {"course_name": student_course_name},
                                    {"course_name": {"$regex": student_course_name.strip(), "$options": "i"}}
                                ],
                                "branch_code": branch_code
                            })
                            if batch_doc:
                                instructor_name = batch_doc.get("instructor_name", "")
                        
                        # If still no instructor, show "Not Assigned"
                        if not instructor_name:
                            instructor_name = "Not Assigned"
                        
                        # Get branch name
                        branch_doc = db.branches.find_one({"branch_code": branch_code})
                        branch_name = branch_doc.get("branch_name", branch_code) if branch_doc else branch_code
                        
                        # Get progress from user_progress collection
                        progress_data = db.user_progress.find({
                            "user_id": user_id,
                            "course_id": course_id
                        })
                        
                        completed_items = 0
                        total_items = 0
                        
                        # Count total content items for this course
                        total_content = db.branch_study_materials.count_documents({
                            "course_name": student_course_name,
                            "branch_code": branch_code,
                            "status": "active"
                        })
                        total_videos = db.video_classes.count_documents({
                            "course_name": student_course_name,
                            "branch_code": branch_code
                        })
                        total_items = total_content + total_videos
                        
                        # Count completed items
                        for prog in progress_data:
                            if prog.get("completed"):
                                completed_items += 1
                        
                        progress_percentage = (completed_items / total_items * 100) if total_items > 0 else 0
                        
                        enrolled_courses.append({
                            "id": course_id,
                            "_id": course_id,
                            "title": course.get("course_name", course.get("title")),
                            "course_name": course.get("course_name"),
                            "course_code": course.get("course_code"),
                            "description": course.get("description", ""),
                            "category": course.get("category", course.get("program_name", "General")),
                            "program_name": course.get("program_name"),
                            "duration": f"{course.get('duration_months', 0)} months",
                            "duration_months": course.get("duration_months", 0),
                            "fee": course.get("fee", 0),
                            "instructor": instructor_name,
                            "instructor_name": instructor_name,
                            "level": "Beginner",
                            "rating": 4.5,
                            "review_count": 0,
                            "enrollment_date": student.get("date_of_admission", student.get("created_at", datetime.now().isoformat())),
                            "enrolled_at": student.get("date_of_admission", student.get("created_at", datetime.now().isoformat())),
                            "last_accessed": datetime.now().isoformat(),
                            "progress": round(progress_percentage, 1),
                            "completion_percentage": round(progress_percentage, 1),
                            "status": "completed" if progress_percentage >= 100 else "in-progress",
                            "thumbnail": course.get("thumbnail", "/api/placeholder/400/300"),
                            "image_url": course.get("thumbnail"),
                            "total_lessons": total_items,
                            "lessons_count": total_items,
                            "completed_lessons": completed_items,
                            "batch": student_batch,
                            "batch_name": student_batch,
                            "branch_code": branch_code,
                            "branch_name": branch_name,
                            "franchise_code": franchise_code,
                            "skills": [],
                            "learning_outcomes": [],
                            "certificate_awarded": progress_percentage >= 100,
                            "has_certificate": progress_percentage >= 100
                        })
                        
                        logger.info(f"[ENROLLED-COURSES] Added course: {course.get('course_name')} with {progress_percentage}% progress")
                    else:
                        logger.warning(f"[ENROLLED-COURSES] Course not found in branch_courses: '{student_course_name}' with filter: {course_filter}")
                        # List all courses for this branch to debug
                        all_courses = list(db.branch_courses.find(course_filter, {"course_name": 1}))
                        logger.info(f"[ENROLLED-COURSES] Available courses in branch: {[c.get('course_name') for c in all_courses]}")
            else:
                logger.warning(f"[ENROLLED-COURSES] Student not found for user_id: {user_id}, email: {current_user.get('email')}")
            
            # Also check for any enrollments in the enrollments collection
            email = current_user.get("email")
            enrollments = list(db.enrollments.find({
                "$or": [
                    {"student_id": user_id},
                    {"user_id": user_id},
                    {"email": email} if email else {"_id": None},
                    {"student_email": email} if email else {"_id": None}
                ],
                "status": {"$in": ["active", "enrolled", "completed", "SUCCESS", "success"]}
            }))
            
            logger.info(f"[ENROLLED-COURSES] Found {len(enrollments)} enrollments for user_id: {user_id}, email: {email}")
            
            for enrollment in enrollments:
                course_id = enrollment.get("course_id")
                if course_id:
                    # Check if this course is already in our list
                    course_id_str = str(course_id) if not isinstance(course_id, str) else course_id
                    existing_ids = [c["id"] for c in enrolled_courses]
                    if course_id_str not in existing_ids:
                        course = None
                        try:
                            if ObjectId.is_valid(course_id_str):
                                course = db.branch_courses.find_one({"_id": ObjectId(course_id_str)})
                        except:
                            pass
                        if not course:
                            try:
                                if ObjectId.is_valid(course_id_str):
                                    course = db.courses.find_one({"_id": ObjectId(course_id_str)})
                            except:
                                pass
                        
                        if course:
                            # Get instructor info - try multiple sources
                            instructor_name = course.get("instructor_name") or course.get("instructor") or ""
                            if not instructor_name:
                                # Try to find from batch
                                course_name_for_batch = course.get("course_name", "").strip()
                                batch_doc = db.branch_batches.find_one({
                                    "$or": [
                                        {"course_name": course_name_for_batch},
                                        {"course_name": {"$regex": course_name_for_batch, "$options": "i"}}
                                    ],
                                    "branch_code": branch_code
                                })
                                if batch_doc:
                                    instructor_name = batch_doc.get("instructor_name", "")
                            
                            # If still no instructor, show "Not Assigned"
                            if not instructor_name:
                                instructor_name = "Not Assigned"
                            
                            # Get branch name
                            branch_doc = db.branches.find_one({"branch_code": branch_code})
                            branch_name = branch_doc.get("branch_name", branch_code) if branch_doc else branch_code
                            
                            # Get batch name from enrollment or course
                            batch_name = enrollment.get("batch_name", course.get("batch_name", ""))
                            
                            # Get progress
                            progress_data = db.user_progress.find({
                                "user_id": user_id,
                                "course_id": course_id_str
                            })
                            
                            completed_items = 0
                            for prog in progress_data:
                                if prog.get("completed"):
                                    completed_items += 1
                            
                            # Count total content items for this course
                            course_name = course.get("course_name", course.get("title"))
                            total_content = db.branch_study_materials.count_documents({
                                "course_name": course_name,
                                "branch_code": branch_code,
                                "status": "active"
                            })
                            total_videos = db.video_classes.count_documents({
                                "course_name": course_name,
                                "branch_code": branch_code
                            })
                            total_items = total_content + total_videos
                            
                            progress_percentage = (completed_items / total_items * 100) if total_items > 0 else enrollment.get("progress", 0)
                            
                            enrolled_courses.append({
                                "id": course_id_str,
                                "_id": course_id_str,
                                "title": course.get("course_name", course.get("title")),
                                "course_name": course.get("course_name", course.get("title")),
                                "course_code": course.get("course_code"),
                                "description": course.get("description", ""),
                                "category": course.get("category", course.get("program_name", "General")),
                                "program_name": course.get("program_name"),
                                "duration": f"{course.get('duration_months', 0)} months",
                                "duration_months": course.get("duration_months", 0),
                                "fee": course.get("fee", 0),
                                "instructor": instructor_name,
                                "instructor_name": instructor_name,
                                "level": "Beginner",
                                "rating": 4.5,
                                "review_count": 0,
                                "enrollment_date": enrollment.get("enrollment_date", datetime.now().isoformat()),
                                "enrolled_at": enrollment.get("enrollment_date", datetime.now().isoformat()),
                                "last_accessed": enrollment.get("last_accessed", datetime.now().isoformat()),
                                "progress": round(progress_percentage, 1),
                                "completion_percentage": round(progress_percentage, 1),
                                "status": "in-progress" if enrollment.get("status") in ["SUCCESS", "success", "active"] else enrollment.get("status", "in-progress"),
                                "thumbnail": course.get("thumbnail", "/api/placeholder/400/300"),
                                "image_url": course.get("thumbnail"),
                                "total_lessons": total_items,
                                "lessons_count": total_items,
                                "completed_lessons": completed_items,
                                "batch": batch_name,
                                "batch_name": batch_name,
                                "branch_code": branch_code,
                                "branch_name": branch_name,
                                "franchise_code": franchise_code,
                                "skills": [],
                                "learning_outcomes": [],
                                "certificate_awarded": progress_percentage >= 100,
                                "has_certificate": progress_percentage >= 100
                            })
                            
                            logger.info(f"[ENROLLED-COURSES] Added enrollment course: {course.get('course_name')} with {progress_percentage}% progress")
        else:
            # For regular students, check enrollments collection
            email = current_user.get("email")
            enrollments = list(db.enrollments.find({
                "$or": [
                    {"student_id": user_id},
                    {"user_id": user_id},
                    {"email": email} if email else {"_id": None},
                    {"student_email": email} if email else {"_id": None}
                ],
                "status": {"$in": ["active", "enrolled", "completed", "SUCCESS", "success"]}
            }))
            
            for enrollment in enrollments:
                course_id = enrollment.get("course_id")
                if course_id:
                    course = None
                    # Try to convert course_id to string if it's ObjectId
                    course_id_str = str(course_id) if not isinstance(course_id, str) else course_id
                    
                    # First try branch_courses
                    try:
                        if ObjectId.is_valid(course_id_str):
                            course = db.branch_courses.find_one({"_id": ObjectId(course_id_str)})
                    except:
                        pass
                    
                    # Then try main courses collection
                    if not course:
                        try:
                            if ObjectId.is_valid(course_id_str):
                                course = db.courses.find_one({"_id": ObjectId(course_id_str)})
                        except:
                            pass
                    
                    if not course:
                        course = db.courses.find_one({"id": course_id_str})
                    
                    if course:
                        # Get total content items
                        course_name = course.get("course_name", course.get("title"))
                        total_content = db.branch_study_materials.count_documents({
                            "course_name": course_name,
                            "status": "active"
                        })
                        total_videos = db.video_classes.count_documents({
                            "course_name": course_name
                        })
                        total_items = total_content + total_videos
                        
                        # Get progress
                        completed_items = 0
                        progress_data = db.user_progress.find({
                            "user_id": user_id,
                            "course_id": course_id_str
                        })
                        for prog in progress_data:
                            if prog.get("completed"):
                                completed_items += 1
                        
                        progress_percentage = (completed_items / total_items * 100) if total_items > 0 else enrollment.get("progress", 0)
                        
                        enrolled_courses.append({
                            "id": str(course.get("_id")),
                            "_id": str(course.get("_id")),
                            "title": course.get("title", course.get("course_name")),
                            "course_name": course.get("course_name", course.get("title")),
                            "course_code": course.get("course_code"),
                            "description": course.get("description", ""),
                            "category": course.get("category", course.get("program_name", "General")),
                            "program_name": course.get("program_name"),
                            "duration": f"{course.get('duration_months', 0)} months",
                            "duration_months": course.get("duration_months", 0),
                            "fee": course.get("fee", 0),
                            "instructor": course.get("instructor_name") or course.get("instructor") or "Not Assigned",
                            "instructor_name": course.get("instructor_name") or course.get("instructor") or "Not Assigned",
                            "level": "Beginner",
                            "rating": 4.5,
                            "review_count": 0,
                            "enrollment_date": enrollment.get("enrollment_date", datetime.now().isoformat()),
                            "enrolled_at": enrollment.get("enrollment_date", datetime.now().isoformat()),
                            "last_accessed": enrollment.get("last_accessed", datetime.now().isoformat()),
                            "progress": round(progress_percentage, 1),
                            "completion_percentage": round(progress_percentage, 1),
                            "status": "in-progress" if enrollment.get("status") in ["SUCCESS", "success", "active"] else enrollment.get("status", "in-progress"),
                            "thumbnail": course.get("thumbnail", "/api/placeholder/400/300"),
                            "image_url": course.get("thumbnail"),
                            "total_lessons": total_items,
                            "lessons_count": total_items,
                            "completed_lessons": completed_items,
                            "batch": enrollment.get("batch_name", ""),
                            "batch_name": enrollment.get("batch_name", ""),
                            "branch_code": course.get("branch_code", ""),
                            "branch_name": "",
                            "franchise_code": course.get("franchise_code", ""),
                            "skills": [],
                            "learning_outcomes": [],
                            "certificate_awarded": progress_percentage >= 100,
                            "has_certificate": progress_percentage >= 100
                        })
                        logger.info(f"[ENROLLED-COURSES] Added course from enrollment: {course.get('course_name', course.get('title'))}")
        
        logger.info(f"[ENROLLED-COURSES] Returning {len(enrolled_courses)} courses")
        
        return {
            "success": True,
            "courses": enrolled_courses,
            "data": enrolled_courses,
            "total": len(enrolled_courses),
            "message": f"Found {len(enrolled_courses)} enrolled course(s)"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ENROLLED-COURSES] Error: {str(e)}")
        logger.error(f"[ENROLLED-COURSES] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch enrolled courses: {str(e)}")


@students_router.get("/my-courses")
async def get_my_courses(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Alias endpoint for enrolled courses"""
    return await get_student_enrolled_courses(request, current_user)


@students_router.get("/course-progress/{course_id}")
async def get_course_progress(
    request: Request,
    course_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed progress for a specific course"""
    try:
        db = request.app.mongodb
        user_id = current_user.get("user_id")
        
        # Get all progress records for this course
        progress_records = list(db.user_progress.find({
            "user_id": user_id,
            "course_id": course_id
        }))
        
        completed_items = [p["content_id"] for p in progress_records if p.get("completed")]
        in_progress_items = [p["content_id"] for p in progress_records if not p.get("completed")]
        
        total_items = len(set([p["content_id"] for p in progress_records]))
        completed_count = len(completed_items)
        
        progress_percentage = (completed_count / total_items * 100) if total_items > 0 else 0
        
        return {
            "success": True,
            "course_id": course_id,
            "progress": {
                "percentage": round(progress_percentage, 1),
                "completed_items": completed_count,
                "total_items": total_items,
                "completed_content_ids": completed_items,
                "in_progress_content_ids": in_progress_items
            }
        }
        
    except Exception as e:
        logger.error(f"[COURSE-PROGRESS] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch course progress: {str(e)}")


@students_router.get("/my-files")
async def get_student_files(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get all uploaded files for the current student"""
    try:
        db = request.app.mongodb
        
        user_id = current_user.get("user_id") or current_user.get("id") or current_user.get("_id")
        is_branch_student = current_user.get("is_branch_student", False)
        
        logger.info(f"[MY-FILES] Fetching files for user: {user_id}, is_branch_student: {is_branch_student}")
        
        # Get files from student_files collection
        files = list(db.student_files.find({
            "user_id": user_id
        }).sort("uploaded_at", -1))
        
        # Format the response
        formatted_files = []
        for file in files:
            formatted_files.append({
                "id": str(file.get("_id")),
                "filename": file.get("filename"),
                "original_name": file.get("original_name"),
                "file_url": file.get("file_url"),
                "type": file.get("type"),
                "uploaded_at": file.get("uploaded_at")
            })
        
        logger.info(f"[MY-FILES] Found {len(formatted_files)} files for user: {user_id}")
        
        return {
            "success": True,
            "files": formatted_files,
            "total": len(formatted_files)
        }
        
    except Exception as e:
        logger.error(f"[MY-FILES] Error: {str(e)}")
        logger.error(f"[MY-FILES] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch files: {str(e)}")


@students_router.post("/upload-file")
async def upload_student_file(
    request: Request,
    file: UploadFile = File(...),
    type: str = Form("document"),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file for the student (profile photo, document, etc.)"""
    try:
        db = request.app.mongodb
        
        # Get user info
        user_id = current_user.get("user_id") or current_user.get("id") or current_user.get("_id")
        is_branch_student = current_user.get("is_branch_student", False)
        branch_code = current_user.get("branch_code", "")
        
        logger.info(f"[UPLOAD-FILE] Uploading file for user: {user_id}, type: {type}, is_branch_student: {is_branch_student}")
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Validate file size (10MB limit)
        file_content = await file.read()
        if len(file_content) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
        
        # Reset file pointer
        await file.seek(0)
        
        # Determine upload directory based on type
        type_to_folder = {
            "profile": "profile",
            "photo": "student_photos",
            "document": "documents",
            "certificate": "certificates",
            "id_card": "id_cards",
            "id_proof": "id_cards",
            "agreement": "agreements",
            "paper_answer": "paper_answers",
            "assignment": "assignments",
            "project": "projects",
            "marksheet": "marksheets",
            "other": "documents"
        }
        
        folder = type_to_folder.get(type, "documents")
        upload_dir = Path(f"uploads/{folder}")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Get file extension
        file_extension = os.path.splitext(file.filename)[1].lower()
        logger.info(f"[UPLOAD-FILE] File: {file.filename}, Extension: {file_extension}, Type: {type}")
        
        # Validate file type based on upload type
        if type in ["profile", "photo"]:
            allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
            if file_extension not in allowed_extensions:
                logger.warning(f"[UPLOAD-FILE] Image type not allowed: {file_extension}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Image file type not allowed. Accepted formats: {', '.join(allowed_extensions)}"
                )
        elif type in ["document", "paper_answer", "assignment", "project", "marksheet", "id_proof", "other", "certificate"]:
            allowed_extensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.zip', '.rar', '.txt', '.xls', '.xlsx']
            if file_extension not in allowed_extensions:
                logger.warning(f"[UPLOAD-FILE] Document type not allowed: {file_extension}")
                raise HTTPException(
                    status_code=400,
                    detail=f"File type not allowed. Accepted formats: {', '.join(allowed_extensions)}"
                )
        
        # Generate unique filename
        unique_id = str(uuid.uuid4())
        filename = f"{user_id}_{unique_id}{file_extension}"
        file_path = upload_dir / filename
        
        # Save the file - write the already-read content
        try:
            with open(file_path, "wb") as buffer:
                buffer.write(file_content)
        except Exception as e:
            logger.error(f"[UPLOAD-FILE] Error saving file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
        
        # Create file URL
        file_url = f"/uploads/{folder}/{filename}"
        
        # Save file info to student_files collection
        file_record = {
            "user_id": user_id,
            "filename": filename,
            "original_name": file.filename,
            "file_url": file_url,
            "type": type,
            "file_size": len(file_content),
            "is_branch_student": is_branch_student,
            "branch_code": branch_code,
            "uploaded_at": datetime.now().isoformat()
        }
        db.student_files.insert_one(file_record)
        logger.info(f"[UPLOAD-FILE] Saved file record to database")
        
        # If this is a profile photo, update the student's photo_url in database
        if type in ["profile", "photo"]:
            try:
                if is_branch_student and user_id:
                    db.branch_students.update_one(
                        {"_id": ObjectId(user_id)},
                        {"$set": {"photo_url": file_url, "updated_at": datetime.now()}}
                    )
                    logger.info(f"[UPLOAD-FILE] Updated photo_url for branch student: {user_id}")
                else:
                    db.users.update_one(
                        {"_id": ObjectId(user_id)},
                        {"$set": {"avatar": file_url, "updated_at": datetime.now()}}
                    )
                    logger.info(f"[UPLOAD-FILE] Updated avatar for user: {user_id}")
            except Exception as e:
                logger.warning(f"[UPLOAD-FILE] Could not update user photo: {str(e)}")
        
        logger.info(f"[UPLOAD-FILE] File uploaded successfully: {file_url}")
        
        return {
            "success": True,
            "message": "File uploaded successfully",
            "file_url": file_url,
            "filename": filename,
            "type": type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[UPLOAD-FILE] Error: {str(e)}")
        logger.error(f"[UPLOAD-FILE] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@students_router.get("/download-certificate")
async def download_student_certificate(request: Request, current_user: dict = Depends(get_current_user)):
    """Download student's certificate"""
    from fastapi.responses import FileResponse
    
    try:
        db = request.app.mongodb
        
        # Get user_id - try multiple fields from token
        user_id = current_user.get("user_id") or current_user.get("student_id") or current_user.get("id") or current_user.get("_id")
        is_branch_student = current_user.get("is_branch_student", False)
        branch_code = current_user.get("branch_code")
        
        logger.info(f"[STUDENT-CERTIFICATE] Downloading certificate for user: {user_id}")
        
        certificate = None
        
        if is_branch_student:
            # For branch students, find their certificate from branch_certificates collection
            certificate = db.branch_certificates.find_one({
                "student_id": str(user_id),
                "branch_code": branch_code
            })
        else:
            # For regular students, find certificate in main certificates collection
            certificate = db.certificates.find_one({
                "student_id": str(user_id)
            })
        
        if not certificate:
            raise HTTPException(status_code=404, detail="Certificate not found for this student")
        
        # Check if certificate is unlocked
        if not certificate.get("is_unlocked", False):
            raise HTTPException(status_code=403, detail="Certificate is not yet available. Complete requirements to unlock it.")
        
        file_path = certificate.get("file_path")
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Certificate file not found")
        
        return FileResponse(
            path=file_path,
            filename=f"certificate_{certificate.get('certificate_number', 'student')}.pdf",
            media_type="application/pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[STUDENT-CERTIFICATE] Error downloading certificate: {str(e)}")
        logger.error(f"[STUDENT-CERTIFICATE] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to download certificate")


@students_router.get("/download-marksheet")
async def download_student_marksheet(request: Request, current_user: dict = Depends(get_current_user)):
    """Download student's marksheet"""
    from fastapi.responses import FileResponse
    
    try:
        db = request.app.mongodb
        
        # Get user_id - try multiple fields from token
        user_id = current_user.get("user_id") or current_user.get("student_id") or current_user.get("id") or current_user.get("_id")
        is_branch_student = current_user.get("is_branch_student", False)
        branch_code = current_user.get("branch_code")
        
        logger.info(f"[STUDENT-MARKSHEET] Downloading marksheet for user: {user_id}")
        
        marksheet = None
        
        if is_branch_student:
            # For branch students, find their marksheet from branch_marksheets collection
            marksheet = db.branch_marksheets.find_one({
                "student_id": str(user_id),
                "branch_code": branch_code
            })
        else:
            # For regular students, find marksheet in main marksheets collection
            marksheet = db.marksheets.find_one({
                "student_id": str(user_id)
            })
        
        if not marksheet:
            raise HTTPException(status_code=404, detail="Marksheet not found for this student")
        
        file_path = marksheet.get("file_path")
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Marksheet file not found")
        
        return FileResponse(
            path=file_path,
            filename=f"marksheet_{marksheet.get('marksheet_number', 'student')}.pdf",
            media_type="application/pdf"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[STUDENT-MARKSHEET] Error downloading marksheet: {str(e)}")
        logger.error(f"[STUDENT-MARKSHEET] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to download marksheet")
