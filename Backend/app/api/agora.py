from fastapi import APIRouter, Depends, HTTPException, Request
from agora_token_builder import RtcTokenBuilder
import time
from typing import List
from datetime import datetime
from bson import ObjectId

from app.utils.auth_helpers import get_current_user
from app.models.live_session import get_live_session_collection
from app.models.enrollment import get_enrollment_collection
from app.schemas.live_session import LiveSessionCreate, LiveSessionOut, LiveSessionBase

router = APIRouter()

print("[DEBUG] Agora Router Loaded - /api/live-sessions route should be available")

APP_ID = "615d6aeeb5424278ba7f08af23a05a36"
APP_CERTIFICATE = "b9c2632b158745ecab4d70a1d1fad008"

@router.get("/generate-token/{session_id}")
async def generate_token(
    session_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    db = request.app.mongodb
    live_collection = get_live_session_collection(db)
    enrollment_collection = get_enrollment_collection(db)

    # Validate session
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID")

    session = live_collection.find_one({"_id": ObjectId(session_id)})

    if not session:
        raise HTTPException(status_code=404, detail="Live session not found")

    # Check if session is live
    if session.get("status") != "live":
        raise HTTPException(status_code=400, detail="Session is not live")

    channel_name = session["channel_name"]
    session_course_id = session.get("course_id")

    # For students, check if they are enrolled in the course
    user_role = current_user.get("role")
    is_branch_student = current_user.get("is_branch_student", False)
    
    if user_role == "student":
        student_id = current_user.get("user_id")
        if student_id:
            if is_branch_student:
                # For branch students, check in branch_students collection
                branch_student = db.branch_students.find_one({"_id": ObjectId(student_id)})
                if branch_student:
                    # Check if the course matches the student's enrolled course
                    student_course_name = branch_student.get("course") or branch_student.get("course_name")
                    
                    # Handle both ObjectId and string session_course_id formats
                    course_query = {}
                    if ObjectId.is_valid(session_course_id):
                        course_query = {"_id": ObjectId(session_course_id)}
                    else:
                        # If session_course_id is already a string, try different formats
                        course_query = {"_id": session_course_id}
                    
                    session_course_obj = db.branch_courses.find_one(course_query)
                    
                    if session_course_obj and student_course_name:
                        session_course_name = session_course_obj.get("course_name") or session_course_obj.get("title")
                        if session_course_name != student_course_name:
                            raise HTTPException(status_code=403, detail="Not enrolled in this course")
                    else:
                        # Fallback: check if the student's course id matches session course id
                        # This handles cases where we need to compare course IDs directly
                        pass
            else:
                # For regular students, check in enrollments collection
                # Handle both ObjectId and string formats for course_id
                course_filter = ObjectId(session_course_id) if ObjectId.is_valid(session_course_id) else session_course_id
                
                enrollment = enrollment_collection.find_one({
                    "student_id": ObjectId(student_id),
                    "course_id": course_filter
                })
                if not enrollment:
                    raise HTTPException(status_code=403, detail="Not enrolled in this course")
        else:
            raise HTTPException(status_code=400, detail="Student ID not found in token")

    # Role logic
    if user_role in ["admin", "branch_admin"]:
        role_num = 1  # publisher
    else:
        role_num = 2  # student = subscriber

    expiration_time = 3600
    current_timestamp = int(time.time())
    privilege_expired_ts = current_timestamp + expiration_time

    token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channel_name,
        int(current_user.get("uid", 0)),
        role_num,
        privilege_expired_ts
    )

    return {
        "token": token,
        "appId": APP_ID,
        "channel": channel_name,
        "uid": current_user.get("uid")
    }


@router.post("/", response_model=LiveSessionOut)
async def create_live_session(
    session_in: LiveSessionBase,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    db = request.app.mongodb
    live_collection = get_live_session_collection(db)
    
    # Verify course exists
    print(f"[LIVE SESSION] Creating session for course: {session_in.course_id}")
    
    # Verify course exists - Check both collections
    course = None
    
    # 1. Try branch_courses first (since frontend uses branchCourseService)
    try:
        if ObjectId.is_valid(session_in.course_id):
            course = db.branch_courses.find_one({"_id": ObjectId(session_in.course_id)})
    except:
        pass
        
    # 2. Try regular courses if not found
    if not course:
        try:
            if ObjectId.is_valid(session_in.course_id):
                course = db.courses.find_one({"_id": ObjectId(session_in.course_id)})
        except:
            pass

    # 3. Try finding by string ID if stored that way (branch_courses)
    if not course:
        course = db.branch_courses.find_one({"_id": session_in.course_id})
        
    # 4. Try finding by string ID if stored that way (courses)
    if not course:
        course = db.courses.find_one({"_id": session_in.course_id})
    
    # 5. Try 'id' field
    if not course:
        course = db.branch_courses.find_one({"id": session_in.course_id})
    if not course:
        course = db.courses.find_one({"id": session_in.course_id})

    if not course:
        print(f"[LIVE SESSION] 404 - Course not found: {session_in.course_id}")
        raise HTTPException(status_code=404, detail=f"Course not found for ID: {session_in.course_id}")

    # Generate Channel Name
    # Format: live_{course_id}_{timestamp}
    timestamp = int(datetime.utcnow().timestamp())
    channel_name = f"live_{session_in.course_id}_{timestamp}"

    new_session = {
        "course_id": session_in.course_id,
        "scheduled_time": session_in.scheduled_time,
        "status": session_in.status,
        "channel_name": channel_name,
        "created_by": str(current_user.get("_id", "admin")),
        "created_by_role": current_user.get("role", "admin"),
        "created_at": datetime.utcnow()
    }

    result = live_collection.insert_one(new_session)
    
    # Return formatted result
    return {
        "id": str(result.inserted_id),
        "course_id": session_in.course_id,
        "scheduled_time": session_in.scheduled_time,
        "status": session_in.status,
        "channel_name": channel_name,
        "created_by": str(current_user.get("_id", "admin")),
        "created_by_role": current_user.get("role", "admin"),
        "course_title": course.get("title") or course.get("course_name") or "Unknown Course",
        "created_at": new_session["created_at"]
    }

@router.get("/", response_model=List[LiveSessionOut])
async def get_live_sessions(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    db = request.app.mongodb
    live_collection = get_live_session_collection(db)
    
    sessions = list(live_collection.find().sort("scheduled_time", -1))
    
    results = []
    
    # Optimization: fetch all needed courses in one go
    course_ids = set()
    for s in sessions:
        if "course_id" in s:
            course_ids.add(s["course_id"])
            
    # Fetch courses
    courses_map = {}
    if course_ids:
        # Prepare queries for both ObjectId and String
        obj_ids = []
        str_ids = []
        for cid in course_ids:
            if ObjectId.is_valid(cid):
                obj_ids.append(ObjectId(cid))
            else:
                str_ids.append(cid)
                
        if course_ids:
            # Prepare queries for both ObjectId and String
            obj_ids = []
            str_ids = []
            for cid in course_ids:
                if ObjectId.is_valid(cid):
                    obj_ids.append(ObjectId(cid))
                else:
                    str_ids.append(cid)
                
        # Find courses in REGULAR COURSES collection
        found_courses = list(db.courses.find({
            "$or": [
                {"_id": {"$in": obj_ids}},
                {"_id": {"$in": str_ids}},
                {"id": {"$in": str_ids}}
            ]
        }))
        
        # Find courses in BRANCH COURSES collection
        found_branch_courses = list(db.branch_courses.find({
            "$or": [
                {"_id": {"$in": obj_ids}},
                {"_id": {"$in": str_ids}},
                {"id": {"$in": str_ids}}
            ]
        }))
        
        # Merge results
        all_courses = found_courses + found_branch_courses
        
        for c in all_courses:
            title = c.get("title") or c.get("course_name") or "Unknown Course"
            courses_map[str(c["_id"])] = title
            if "id" in c:
                courses_map[c["id"]] = title
    
    for s in sessions:
        # Robustly handle course_id to string conversion
        c_id = s.get("course_id")
        if isinstance(c_id, ObjectId):
            c_id = str(c_id)
        
        # Determine course title
        c_title = "Unknown Course"
        if c_id and c_id in courses_map:
            c_title = courses_map[c_id]
        
        # Handle scheduled_time to ensure it's UTC
        sched_time = s.get("scheduled_time")
        if sched_time is None:
            sched_time = datetime.utcnow()
        
        # If it's a naive datetime (no timezone), assume it's stored as UTC
        if isinstance(sched_time, datetime) and sched_time.tzinfo is None:
            # We assume it was stored as UTC (naive), so we just add the Z indicator when serializing
            # Or better, make it aware
            # sched_time = sched_time.replace(tzinfo=timezone.utc)
            pass # Pydantic/FastAPI will serialize naive as-is. We should ensure frontend treats it as UTC.
            # But to be safe and explicit:
            # sched_time = sched_time.isoformat() 
            # if not sched_time.endswith('Z') and not '+' in sched_time:
            #    sched_time += 'Z'
        
        s_out = {
            "id": str(s["_id"]),
            "course_id": c_id,
            "scheduled_time": sched_time,
            "status": s.get("status", "scheduled"),
            "channel_name": s.get("channel_name", ""),
            "created_by": str(s.get("created_by", "system")),
            "created_by_role": s.get("created_by_role", "admin"),
            "created_at": s.get("created_at") or datetime.utcnow(),
            "course_title": c_title
        }
        results.append(s_out)
        
    return results

@router.delete("/{session_id}")
async def delete_live_session(
    session_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    db = request.app.mongodb
    live_collection = get_live_session_collection(db)
    
    try:
        if ObjectId.is_valid(session_id):
            result = live_collection.delete_one({"_id": ObjectId(session_id)})
        else:
             raise HTTPException(status_code=400, detail="Invalid ID format")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return {"message": "Session deleted"}

@router.put("/{session_id}/status")
async def update_live_session_status(
    session_id: str,
    status_data: dict,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    db = request.app.mongodb
    live_collection = get_live_session_collection(db)
    
    # Permission check - only admin/branch admin/instructor can update status
    # Assuming standard role checks are sufficient via UI, but good to enforce
    if current_user.get("role") not in ["admin", "branch_admin", "instructor", "teacher"]:
         raise HTTPException(status_code=403, detail="Not authorized to update session status")

    try:
        if not ObjectId.is_valid(session_id):
             raise HTTPException(status_code=400, detail="Invalid ID format")
             
        new_status = status_data.get("status")
        if new_status not in ["scheduled", "live", "completed"]:
            raise HTTPException(status_code=400, detail="Invalid status")
            
        result = live_collection.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"status": new_status}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")
            
        return {"message": "Status updated", "status": new_status}
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update status")


@router.get("/student/live-now")
async def live_now(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    db = request.app.mongodb
    live_collection = get_live_session_collection(db)

    # Find only live sessions
    sessions = list(live_collection.find({"status": "live"}))

    result = []

    # Optimization: fetch all needed courses in one go
    course_ids = set()
    for s in sessions:
        if "course_id" in s:
            course_ids.add(s["course_id"])
            
    # Fetch courses
    courses_map = {}
    if course_ids:
        # Prepare queries for both ObjectId and String
        obj_ids = []
        str_ids = []
        for cid in course_ids:
            if ObjectId.is_valid(cid):
                obj_ids.append(ObjectId(cid))
            else:
                str_ids.append(cid)
                
        # Find courses in REGULAR COURSES collection
        found_courses = list(db.courses.find({
            "$or": [
                {"_id": {"$in": obj_ids}},
                {"_id": {"$in": str_ids}},
                {"id": {"$in": str_ids}}
            ]
        }))
        
        # Find courses in BRANCH COURSES collection
        found_branch_courses = list(db.branch_courses.find({
            "$or": [
                {"_id": {"$in": obj_ids}},
                {"_id": {"$in": str_ids}},
                {"id": {"$in": str_ids}}
            ]
        }))
        
        # Merge results
        all_courses = found_courses + found_branch_courses
        
        for c in all_courses:
            title = c.get("title") or c.get("course_name") or "Unknown Course"
            courses_map[str(c["_id"])] = title
            if "id" in c:
                courses_map[c["id"]] = title

    for s in sessions:
        # Robustly handle course_id to string conversion
        c_id = s.get("course_id")
        if isinstance(c_id, ObjectId):
            c_id = str(c_id)
        
        # Determine course title
        c_title = "Unknown Course"
        if c_id and c_id in courses_map:
            c_title = courses_map[c_id]
        
        result.append({
            "session_id": str(s["_id"]),
            "course_id": c_id,
            "channel_name": s["channel_name"],
            "course_title": c_title
        })

    return result
