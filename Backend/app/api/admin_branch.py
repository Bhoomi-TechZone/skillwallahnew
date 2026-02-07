"""
Enhanced Admin API endpoints with branch/franchise filtering for B2B multi-tenant workflow
Ensures that branch admins can only access data specific to their franchise
"""

from fastapi import APIRouter, HTTPException, Request, Depends, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from bson import ObjectId
import logging

from app.utils.dependencies import role_required
from app.utils.auth_helpers import get_current_user
from app.utils.branch_filter import BranchAccessManager
from app.models.user import get_user_collection
from app.models.course import get_course_collection
from app.models.enrollment import get_enrollment_collection
from app.models.certificate import get_certificate_collection
from app.schemas.auth import UserLogin, TokenResponse

logger = logging.getLogger(__name__)

# Create a new admin router for branch-filtered operations
admin_branch_router = APIRouter(prefix="/branch", tags=["Branch Admin Operations"])

@admin_branch_router.get("/courses")
async def get_branch_courses(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    user=Depends(get_current_user)
):
    """Get courses visible to the branch admin based on their franchise"""
    db = request.app.mongodb
    course_collection = get_course_collection(db)
    
    # Build base query
    base_query = {}
    if search:
        base_query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
    if category:
        base_query["category"] = category
    
    # Apply branch filtering
    filtered_query = BranchAccessManager.add_branch_filter_to_query(base_query, user)
    
    logger.info(f"Branch admin {user.get('email')} querying courses with filter: {filtered_query}")
    
    try:
        # Get total count
        total_count = course_collection.count_documents(filtered_query)
        
        # Get courses with pagination
        courses = list(course_collection.find(filtered_query)
                      .skip(skip)
                      .limit(limit)
                      .sort("created_date", -1))
        
        # Serialize courses
        serialized_courses = []
        for course in courses:
            course["id"] = str(course["_id"])
            del course["_id"]
            serialized_courses.append(course)
        
        return {
            "success": True,
            "courses": serialized_courses,
            "total": total_count,
            "skip": skip,
            "limit": limit,
            "franchise_context": BranchAccessManager.get_branch_context_from_user(user)
        }
        
    except Exception as e:
        logger.error(f"Error fetching branch courses for user {user.get('email')}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch courses")

@admin_branch_router.get("/students")
async def get_branch_students(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
    user=Depends(get_current_user)
):
    """Get students enrolled in courses from this branch's franchise"""
    db = request.app.mongodb
    user_collection = get_user_collection(db)
    enrollment_collection = get_enrollment_collection(db)
    course_collection = get_course_collection(db)
    
    try:
        # First, get all courses belonging to this franchise
        course_filter = BranchAccessManager.get_branch_filter(user)
        franchise_courses = list(course_collection.find(course_filter, {"_id": 1}))
        franchise_course_ids = [str(course["_id"]) for course in franchise_courses]
        
        if not franchise_course_ids:
            return {
                "success": True,
                "students": [],
                "total": 0,
                "skip": skip,
                "limit": limit,
                "message": "No courses found for this franchise"
            }
        
        # Get enrollments for franchise courses
        enrollment_filter = {
            "course_id": {"$in": franchise_course_ids}
        }
        
        enrollments = list(enrollment_collection.find(enrollment_filter))
        enrolled_student_ids = [enrollment["student_id"] for enrollment in enrollments]
        
        if not enrolled_student_ids:
            return {
                "success": True,
                "students": [],
                "total": 0,
                "skip": skip,
                "limit": limit,
                "message": "No students enrolled in franchise courses"
            }
        
        # Build student query
        student_query = {
            "_id": {"$in": [ObjectId(sid) for sid in enrolled_student_ids if ObjectId.is_valid(sid)]},
            "role": "student"
        }
        
        if search:
            student_query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
        
        # Get total count
        total_count = user_collection.count_documents(student_query)
        
        # Get students with pagination
        students = list(user_collection.find(student_query)
                       .skip(skip)
                       .limit(limit)
                       .sort("created_at", -1))
        
        # Enrich student data with enrollment information
        enriched_students = []
        for student in students:
            student_id = str(student["_id"])
            
            # Get enrollment details for this student
            student_enrollments = [e for e in enrollments if e["student_id"] == student_id]
            
            enriched_student = {
                "id": student_id,
                "name": student.get("name", ""),
                "email": student.get("email", ""),
                "phone": student.get("phone", ""),
                "created_at": student.get("created_at"),
                "status": student.get("status", "active"),
                "enrolled_courses_count": len(student_enrollments),
                "enrollments": student_enrollments[:5]  # Show first 5 enrollments
            }
            enriched_students.append(enriched_student)
        
        return {
            "success": True,
            "students": enriched_students,
            "total": total_count,
            "skip": skip,
            "limit": limit,
            "franchise_context": BranchAccessManager.get_branch_context_from_user(user)
        }
        
    except Exception as e:
        logger.error(f"Error fetching branch students for user {user.get('email')}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch students")

@admin_branch_router.get("/instructors")
async def get_branch_instructors(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
    user=Depends(get_current_user)
):
    """Get instructors who have created courses for this franchise"""
    db = request.app.mongodb
    user_collection = get_user_collection(db)
    course_collection = get_course_collection(db)
    
    try:
        # Get all courses belonging to this franchise
        course_filter = BranchAccessManager.get_branch_filter(user)
        franchise_courses = list(course_collection.find(course_filter))
        
        # Extract instructor IDs from courses
        instructor_ids = set()
        for course in franchise_courses:
            instructor_id = course.get("instructor") or course.get("instructor_id")
            if instructor_id:
                instructor_ids.add(str(instructor_id))
        
        if not instructor_ids:
            return {
                "success": True,
                "instructors": [],
                "total": 0,
                "skip": skip,
                "limit": limit,
                "message": "No instructors found for this franchise"
            }
        
        # Build instructor query
        instructor_query = {
            "$or": [
                {"_id": {"$in": [ObjectId(iid) for iid in instructor_ids if ObjectId.is_valid(iid)]}},
                {"user_id": {"$in": list(instructor_ids)}}
            ],
            "role": "instructor"
        }
        
        if search:
            search_conditions = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
            if "$or" in instructor_query:
                instructor_query = {
                    "$and": [
                        {"$or": instructor_query["$or"]},
                        {"role": "instructor"},
                        {"$or": search_conditions}
                    ]
                }
            else:
                instructor_query["$or"] = search_conditions
        
        # Get total count
        total_count = user_collection.count_documents(instructor_query)
        
        # Get instructors with pagination
        instructors = list(user_collection.find(instructor_query)
                          .skip(skip)
                          .limit(limit)
                          .sort("created_at", -1))
        
        # Enrich instructor data with course information
        enriched_instructors = []
        for instructor in instructors:
            instructor_id = str(instructor["_id"])
            instructor_user_id = instructor.get("user_id", instructor_id)
            
            # Count courses created by this instructor in this franchise
            instructor_courses = [c for c in franchise_courses 
                                if str(c.get("instructor", "")) == instructor_id or 
                                   str(c.get("instructor", "")) == instructor_user_id or
                                   str(c.get("instructor_id", "")) == instructor_id]
            
            enriched_instructor = {
                "id": instructor_id,
                "name": instructor.get("name", ""),
                "email": instructor.get("email", ""),
                "phone": instructor.get("phone", ""),
                "specialization": instructor.get("specialization", ""),
                "experience": instructor.get("experience", ""),
                "created_at": instructor.get("created_at"),
                "status": instructor.get("status", "active"),
                "courses_count": len(instructor_courses),
                "courses": [{"id": str(c["_id"]), "title": c.get("title", "")} 
                           for c in instructor_courses[:5]]  # Show first 5 courses
            }
            enriched_instructors.append(enriched_instructor)
        
        return {
            "success": True,
            "instructors": enriched_instructors,
            "total": total_count,
            "skip": skip,
            "limit": limit,
            "franchise_context": BranchAccessManager.get_branch_context_from_user(user)
        }
        
    except Exception as e:
        logger.error(f"Error fetching branch instructors for user {user.get('email')}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch instructors")

@admin_branch_router.get("/certificates")
async def get_branch_certificates(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user=Depends(get_current_user)
):
    """Get certificates issued for courses in this franchise"""
    db = request.app.mongodb
    certificate_collection = get_certificate_collection(db)
    course_collection = get_course_collection(db)
    user_collection = get_user_collection(db)
    
    try:
        # Get all courses belonging to this franchise
        course_filter = BranchAccessManager.get_branch_filter(user)
        franchise_courses = list(course_collection.find(course_filter, {"_id": 1}))
        franchise_course_ids = [str(course["_id"]) for course in franchise_courses]
        
        if not franchise_course_ids:
            return {
                "success": True,
                "certificates": [],
                "total": 0,
                "skip": skip,
                "limit": limit,
                "message": "No courses found for this franchise"
            }
        
        # Get certificates for franchise courses
        certificate_query = {
            "course_id": {"$in": franchise_course_ids}
        }
        
        # Get total count
        total_count = certificate_collection.count_documents(certificate_query)
        
        # Get certificates with pagination
        certificates = list(certificate_collection.find(certificate_query)
                           .skip(skip)
                           .limit(limit)
                           .sort("issued_date", -1))
        
        # Enrich certificates with student and course details
        enriched_certificates = []
        for cert in certificates:
            # Get student details
            student_info = {}
            if cert.get("student_id"):
                student = user_collection.find_one({"_id": ObjectId(cert["student_id"])})
                if student:
                    student_info = {
                        "name": student.get("name", ""),
                        "email": student.get("email", "")
                    }
            
            # Get course details
            course_info = {}
            if cert.get("course_id"):
                course = course_collection.find_one({"_id": ObjectId(cert["course_id"])})
                if course:
                    course_info = {
                        "title": course.get("title", ""),
                        "category": course.get("category", "")
                    }
            
            enriched_cert = {
                "id": str(cert["_id"]),
                "certificate_id": cert.get("certificate_id", ""),
                "student": student_info,
                "course": course_info,
                "issued_date": cert.get("issued_date"),
                "status": cert.get("status", "active"),
                "grade": cert.get("grade", ""),
                "completion_date": cert.get("completion_date")
            }
            enriched_certificates.append(enriched_cert)
        
        return {
            "success": True,
            "certificates": enriched_certificates,
            "total": total_count,
            "skip": skip,
            "limit": limit,
            "franchise_context": BranchAccessManager.get_branch_context_from_user(user)
        }
        
    except Exception as e:
        logger.error(f"Error fetching branch certificates for user {user.get('email')}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch certificates")

@admin_branch_router.get("/dashboard-stats")
async def get_branch_dashboard_stats(
    request: Request,
    user=Depends(get_current_user)
):
    """
    Get dashboard statistics specific to this branch/franchise using branch_* collections
    Highly optimized for concurrent execution
    """
    from app.utils.cache import app_cache
    from starlette.concurrency import run_in_threadpool
    import asyncio
    
    db = request.app.mongodb
    
    try:
        # Get branch context
        branch_context = BranchAccessManager.get_branch_context_from_user(user)
        if not branch_context:
            raise HTTPException(status_code=403, detail="Branch access required")
        
        franchise_code = branch_context["franchise_code"]
        branch_code = branch_context.get("branch_code")
        
        # Try cache first (2 minute TTL)
        cache_key = f"branch_dashboard_stats:{franchise_code}"
        cached_stats = app_cache.get(cache_key)
        
        if cached_stats:
            logger.info(f"[Dashboard] Returning cached stats for {franchise_code}")
            return {"success": True, "stats": cached_stats, "timestamp": datetime.utcnow().isoformat(), "cached": True}
        
        print(f"[DEBUG DASHBOARD] Fetching fresh stats for franchise: {franchise_code} (Parallel Execution)")
        
        # Define helper for safe count
        def safe_count(collection_name, query):
            if collection_name not in db.list_collection_names():
                return 0
            return db[collection_name].count_documents(query)
            
        # Define helper for aggregations
        def run_aggregation(collection_name, pipeline):
            if collection_name not in db.list_collection_names():
                return []
            return list(db[collection_name].aggregate(pipeline))

        # Robust instructor query construction
        user_collection = db["users"]
        instructor_query_conditions = [
            {"franchise_code": franchise_code},
            {"franchise_code": str(franchise_code)}
        ]
        if ObjectId.is_valid(franchise_code):
            instructor_query_conditions.append({"franchise_code": ObjectId(franchise_code)})
            
        if branch_code:
            instructor_query_conditions.append({"branch_code": branch_code})
            if ObjectId.is_valid(branch_code):
                instructor_query_conditions.append({"branch_code": ObjectId(branch_code)})
                
        instructor_final_query = {
            "role": "instructor",
            "$or": instructor_query_conditions
        }
        
        # Staff query - Use robust conditions
        staff_query = {
            "role": {"$in": ["staff", "admin"]}, 
            "$or": instructor_query_conditions
        }
        
        # Wallet Balance Query Construction (Ported from branch.py)
        wallet_query = {"franchise_code": franchise_code}
        if branch_code:
             # Basic filtering by branch code if available
             wallet_query["$or"] = [
                 {"branch_code": branch_code},
                 # We skip the complex name lookup for speed, assuming code is sufficient for most
             ]

        def calculate_wallet_balance():
            pipeline = [
                {"$match": wallet_query},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
            ]
            result = list(db.branch_payments.aggregate(pipeline))
            return result[0]["total"] if result else 0

        # Chart Pipelines
        six_months_ago_date = datetime.utcnow() - timedelta(days=180)
        six_months_ago_str = six_months_ago_date.isoformat()
        
        course_dist_pipeline = [
            {"$match": {"franchise_code": franchise_code}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}}
        ]
        
        student_growth_pipeline = [
            {"$match": {"franchise_code": franchise_code, "created_at": {"$gte": six_months_ago_str}}},
            {"$project": {"month": {"$substr": ["$created_at", 0, 7]}}}, # YYYY-MM
            {"$group": {"_id": "$month", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        
        batch_growth_pipeline = [
            {"$match": {"franchise_code": franchise_code, "created_at": {"$gte": six_months_ago_str}}},
            {"$project": {"month": {"$substr": ["$created_at", 0, 7]}}},
            {"$group": {"_id": "$month", "count": {"$sum": 1}}}
        ]

        # Prepare all counting tasks
        base_query = {"franchise_code": franchise_code}
        
        # EXECUTE EVERYTHING IN PARALLEL
        (
            branches_count,
            courses_count,
            students_count,
            batches_count,
            programs_count,
            subjects_count,
            study_materials_count,
            staff_count_branch,
            instructors_count,
            staff_count_users,
            departments_list,
            wallet_balance,
            course_dist_raw,
            student_growth_raw,
            batch_growth_raw
        ) = await asyncio.gather(
            # Counts
            run_in_threadpool(db.branches.count_documents, base_query),
            run_in_threadpool(db.branch_courses.count_documents, base_query),
            run_in_threadpool(db.branch_students.count_documents, base_query),
            run_in_threadpool(db.branch_batches.count_documents, base_query),
            run_in_threadpool(db.branch_programs.count_documents, base_query),
            run_in_threadpool(db.branch_subjects.count_documents, base_query),
            run_in_threadpool(safe_count, "branch_study_materials", base_query),
            run_in_threadpool(safe_count, "branch_staff", base_query),
            run_in_threadpool(user_collection.count_documents, instructor_final_query),
            run_in_threadpool(user_collection.count_documents, staff_query),
            # Distinct
            run_in_threadpool(db.branch_students.distinct, "department", base_query),
            # Wallet
            run_in_threadpool(calculate_wallet_balance),
            # Charts
            run_in_threadpool(run_aggregation, "branch_courses", course_dist_pipeline),
            run_in_threadpool(run_aggregation, "branch_students", student_growth_pipeline),
            run_in_threadpool(run_aggregation, "branch_batches", batch_growth_pipeline)
        )
        
        # Process Results
        staff_count = staff_count_branch if staff_count_branch > 0 else staff_count_users
        departments_count = len(departments_list) if departments_list else 0
        
        # Process Charts
        course_distribution = {item["_id"] or "Uncategorized": item["count"] for item in course_dist_raw}
        students_monthly = {item["_id"]: item["count"] for item in student_growth_raw}
        batches_monthly = {item["_id"]: item["count"] for item in batch_growth_raw}

        stats = {
            "branches": branches_count,
            "programs": programs_count,
            "courses": courses_count,
            "subjects": subjects_count,
            "students": students_count,
            "staff": staff_count,
            "instructors": instructors_count,
            "departments": departments_count,
            "batches": batches_count,
            "study_materials": study_materials_count,
            "studyMaterials": study_materials_count,
            "walletBalance": wallet_balance, # Added wallet balance here
            "franchise_info": {
                "name": branch_context.get("franchise_name", "N/A"),
                "code": franchise_code
            },
            "charts": {
                "courseDistribution": course_distribution,
                "monthlyStudents": students_monthly,
                "monthlyBatches": batches_monthly
            }
        }
        
        # Cache for 2 minutes
        app_cache.set(cache_key, stats, ttl_seconds=120)
        logger.info(f"[Dashboard] Computed stats for {franchise_code}: {stats}")
        
        return {
            "success": True,
            "stats": stats,
            "timestamp": datetime.utcnow().isoformat(),
            "cached": False
        }
        
    except Exception as e:
        logger.error(f"Error fetching dashboard stats for user {user.get('email')}: {str(e)}")
        # Return zeros instead of error to prevent dashboard from breaking
        return {
            "success": True,
            "stats": {
                "branches": 0,
                "programs": 0,
                "courses": 0,
                "subjects": 0,
                "students": 0,
                "staff": 0,
                "departments": 0,
                "batches": 0,
                "study_materials": 0,
                "studyMaterials": 0
            },
            "error": str(e)
        }

@admin_branch_router.get("/enrollments")
async def get_branch_enrollments(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    course_id: Optional[str] = Query(None),
    user=Depends(get_current_user)
):
    """Get enrollments for courses in this franchise"""
    db = request.app.mongodb
    enrollment_collection = get_enrollment_collection(db)
    course_collection = get_course_collection(db)
    user_collection = get_user_collection(db)
    
    try:
        # Get all courses belonging to this franchise
        course_filter = BranchAccessManager.get_branch_filter(user)
        if course_id:
            course_filter["_id"] = ObjectId(course_id)
            
        franchise_courses = list(course_collection.find(course_filter))
        franchise_course_ids = [str(course["_id"]) for course in franchise_courses]
        
        if not franchise_course_ids:
            return {
                "success": True,
                "enrollments": [],
                "total": 0,
                "skip": skip,
                "limit": limit,
                "message": "No courses found for this franchise"
            }
        
        # Get enrollments for franchise courses
        enrollment_query = {
            "course_id": {"$in": franchise_course_ids}
        }
        
        # Get total count
        total_count = enrollment_collection.count_documents(enrollment_query)
        
        # Get enrollments with pagination
        enrollments = list(enrollment_collection.find(enrollment_query)
                          .skip(skip)
                          .limit(limit)
                          .sort("enrolled_at", -1))
        
        # Enrich enrollments with student and course details
        enriched_enrollments = []
        for enrollment in enrollments:
            # Get student details
            student_info = {}
            if enrollment.get("student_id"):
                student = user_collection.find_one({"_id": ObjectId(enrollment["student_id"])})
                if student:
                    student_info = {
                        "id": str(student["_id"]),
                        "name": student.get("name", ""),
                        "email": student.get("email", "")
                    }
            
            # Get course details
            course_info = {}
            if enrollment.get("course_id"):
                course = course_collection.find_one({"_id": ObjectId(enrollment["course_id"])})
                if course:
                    course_info = {
                        "id": str(course["_id"]),
                        "title": course.get("title", ""),
                        "category": course.get("category", "")
                    }
            
            enriched_enrollment = {
                "id": str(enrollment["_id"]),
                "student": student_info,
                "course": course_info,
                "enrolled_at": enrollment.get("enrolled_at"),
                "status": enrollment.get("status", "active"),
                "progress": enrollment.get("progress", 0),
                "completion_date": enrollment.get("completion_date")
            }
            enriched_enrollments.append(enriched_enrollment)
        
        return {
            "success": True,
            "enrollments": enriched_enrollments,
            "total": total_count,
            "skip": skip,
            "limit": limit,
            "franchise_context": BranchAccessManager.get_branch_context_from_user(user)
        }
        
    except Exception as e:
        logger.error(f"Error fetching branch enrollments for user {user.get('email')}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch enrollments")
