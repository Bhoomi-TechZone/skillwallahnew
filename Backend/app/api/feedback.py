from fastapi import APIRouter, Request, HTTPException, Query, Path, Depends
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from app.utils.branch_filter import BranchAccessManager
from app.schemas.feedback import (
    FeedbackCreate, FeedbackUpdate, FeedbackRequestCreate, 
    FeedbackResponseCreate, FeedbackFilter, FeedbackOut
)
from app.services.feedback_service import (
    create_feedback, create_feedback_request, get_user_feedback,
    get_instructor_feedback, update_feedback, delete_feedback,
    add_instructor_response, get_feedback_analytics,
    get_course_feedback_summary, mark_overdue_feedback
)

feedback_router = APIRouter(prefix="/feedback", tags=["Feedback"])

@feedback_router.post("/", response_model=dict)
def submit_feedback(request: Request, payload: FeedbackCreate):
    """Submit feedback for a course, assignment, quiz, or instructor"""
    db = request.app.mongodb
    return create_feedback(db, payload)

@feedback_router.post("/request", response_model=dict)
def create_feedback_request_endpoint(request: Request, payload: FeedbackRequestCreate):
    """Create a feedback request for a student (used when they complete an activity)"""
    db = request.app.mongodb
    return create_feedback_request(db, payload)

@feedback_router.get("/user/{user_id}", response_model=List[FeedbackOut])
def get_user_feedback_list(
    request: Request, 
    user_id: str = Path(..., description="User ID"),
    status: Optional[str] = Query(None, description="Filter by status: pending, completed, overdue, all")
):
    """Get all feedback for a specific user (student dashboard)"""
    db = request.app.mongodb
    return get_user_feedback(db, user_id, status)

@feedback_router.get("/instructor/{instructor_id}", response_model=List[FeedbackOut])
def get_instructor_feedback_list(
    request: Request,
    instructor_id: str = Path(..., description="Instructor ID"),
    course_id: Optional[str] = Query(None, description="Filter by specific course")
):
    """Get all feedback for an instructor's courses"""
    db = request.app.mongodb
    return get_instructor_feedback(db, instructor_id, course_id)

@feedback_router.put("/{feedback_id}", response_model=dict)
def update_feedback_entry(
    request: Request,
    payload: FeedbackUpdate,
    feedback_id: str = Path(..., description="Feedback ID")
):
    """Update feedback entry (student submitting pending feedback)"""
    try:
        # Validate feedback_id is a valid ObjectId
        if not ObjectId.is_valid(feedback_id):
            raise HTTPException(status_code=422, detail="Invalid feedback ID format")
        
        db = request.app.mongodb
        return update_feedback(db, feedback_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except HTTPException:
        raise  # Re-raise HTTPExceptions as-is
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@feedback_router.delete("/{feedback_id}")
def delete_feedback_entry(
    request: Request,
    feedback_id: str = Path(..., description="Feedback ID")
):
    """Delete feedback entry"""
    try:
        # Validate feedback_id is a valid ObjectId
        if not ObjectId.is_valid(feedback_id):
            raise HTTPException(status_code=422, detail="Invalid feedback ID format")
        
        db = request.app.mongodb
        return delete_feedback(db, feedback_id)
    except HTTPException:
        raise  # Re-raise HTTPExceptions as-is
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@feedback_router.post("/{feedback_id}/response", response_model=dict)
def add_instructor_response_endpoint(
    request: Request,
    payload: FeedbackResponseCreate,
    feedback_id: str = Path(..., description="Feedback ID")
):
    """Add instructor response to feedback"""
    try:
        # Validate feedback_id is a valid ObjectId
        if not ObjectId.is_valid(feedback_id):
            raise HTTPException(status_code=422, detail="Invalid feedback ID format")
        
        db = request.app.mongodb
        return add_instructor_response(db, feedback_id, payload.instructor_id, payload.response)
    except HTTPException:
        raise  # Re-raise HTTPExceptions as-is
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@feedback_router.get("/analytics")
def get_feedback_analytics_endpoint(
    request: Request,
    instructor_id: Optional[str] = Query(None, description="Filter by instructor"),
    course_id: Optional[str] = Query(None, description="Filter by course")
):
    """Get feedback analytics and statistics"""
    db = request.app.mongodb
    return get_feedback_analytics(db, instructor_id, course_id)

@feedback_router.get("/course/{course_id}/summary")
def get_course_feedback_summary_endpoint(
    request: Request,
    course_id: str = Path(..., description="Course ID")
):
    """Get feedback summary for a specific course"""
    db = request.app.mongodb
    return get_course_feedback_summary(db, course_id)

@feedback_router.post("/admin/mark-overdue")
def mark_overdue_feedback_endpoint(request: Request):
    """Mark pending feedback as overdue (admin/system task)"""
    db = request.app.mongodb
    return mark_overdue_feedback(db)

# Additional endpoints for frontend requirements

@feedback_router.get("/instructor/{instructor_id}/courses")
def get_instructor_courses(
    request: Request,
    instructor_id: str = Path(..., description="Instructor ID or Instructor Name")
):
    """Get all courses for a specific instructor (accepts instructor_id or instructor_name)"""
    from app.services.feedback_service import get_instructor_courses_from_api
    db = request.app.mongodb
    return get_instructor_courses_from_api(db, instructor_id)

@feedback_router.get("/instructor/profile/{instructor_id}/courses")
def get_instructor_courses_by_profile(
    request: Request,
    instructor_id: str = Path(..., description="Instructor ID from profile")
):
    """Get all courses for a specific instructor using the course API"""
    from app.services.feedback_service import get_instructor_courses_from_course_api
    db = request.app.mongodb
    return get_instructor_courses_from_course_api(instructor_id, db)

@feedback_router.get("/stats/user/{user_id}")
def get_user_feedback_stats(
    request: Request,
    user_id: str = Path(..., description="User ID")
):
    """Get feedback statistics for user dashboard"""
    db = request.app.mongodb
    
    all_feedback = get_user_feedback(db, user_id)
    pending_count = len([f for f in all_feedback if f["status"] == "pending"])
    completed_count = len([f for f in all_feedback if f["status"] == "completed"])
    
    return {
        "all": len(all_feedback),
        "pending": pending_count,
        "completed": completed_count
    }

@feedback_router.get("/admin/all")
def get_all_feedback_admin(
    request: Request,
    status: Optional[str] = Query(None, description="Filter by status"),
    target_type: Optional[str] = Query(None, description="Filter by type"),
    rating: Optional[int] = Query(None, description="Filter by rating"),
    search: Optional[str] = Query(None, description="Search in comments or titles"),
    limit: int = Query(50, description="Limit results"),
    offset: int = Query(0, description="Offset for pagination")
):
    """Get all feedback for admin dashboard with filters and optimized queries"""
    from app.models.feedback import get_feedback_collection
    from app.models.user import get_user_collection
    from bson import ObjectId
    
    db = request.app.mongodb
    collection = get_feedback_collection(db)
    users_collection = get_user_collection(db)
    
    # Get branch filter for multi-tenancy
    current_user = getattr(request.state, 'user', None)
    access_manager = BranchAccessManager(current_user)
    branch_filter = access_manager.get_filter_query()
    
    # Build optimized query with proper indexing
    query = {}
    
    # Apply branch filter for multi-tenancy
    if branch_filter:
        query.update(branch_filter)
    
    # Status filter (indexed)
    if status and status != "all":
        query["status"] = status
    
    # Target type filter (indexed)
    if target_type and target_type != "all":
        clean_type = target_type.replace("_review", "")
        query["target_type"] = clean_type
    
    # Rating filter (indexed)
    if rating and rating != "all":
        try:
            query["rating"] = int(rating)
        except (ValueError, TypeError):
            pass
    
    # Search filter using text index for better performance
    if search and search.strip():
        query["$text"] = {"$search": search.strip()}
    
    # Use aggregation pipeline for better performance with user data
    pipeline = [
        {"$match": query},
        {"$sort": {"created_date": -1}},
        {"$skip": offset},
        {"$limit": limit},
        {
            "$lookup": {
                "from": "users",
                "let": {"user_id": {"$toObjectId": "$user_id"}},
                "pipeline": [
                    {"$match": {"$expr": {"$eq": ["$_id", "$$user_id"]}}},
                    {"$project": {
                        "full_name": 1,
                        "name": 1,
                        "email": 1,
                        "avatar_url": 1
                    }}
                ],
                "as": "user_data"
            }
        },
        {
            "$addFields": {
                "user": {"$arrayElemAt": ["$user_data", 0]}
            }
        },
        {
            "$project": {
                "user_data": 0  # Remove the array field
            }
        }
    ]
    
    try:
        # Execute aggregation pipeline
        feedback_list = list(collection.aggregate(pipeline))
        
        # Get total count for pagination (optimized separate query)
        count_pipeline = [{"$match": query}, {"$count": "total"}]
        count_result = list(collection.aggregate(count_pipeline))
        total_count = count_result[0]["total"] if count_result else 0
        
        # Format results for frontend
        result = []
        for feedback in feedback_list:
            user = feedback.get("user", {})
            
            # Format feedback for frontend with all required fields
            formatted_feedback = {
                "id": str(feedback["_id"]),
                "_id": str(feedback["_id"]),
                "type": f"{feedback.get('target_type', 'course')}_review",
                "userName": user.get("full_name") or user.get("name") or "Anonymous User",
                "userEmail": user.get("email", "N/A"),
                "userAvatar": user.get("avatar_url", ""),
                "user_name": user.get("full_name") or user.get("name") or "Anonymous User",
                "user_email": user.get("email", "N/A"),
                "courseName": feedback.get("target_title", feedback.get("course_name", "")),
                "course_title": feedback.get("target_title", feedback.get("course_name", "")),
                "instructorName": feedback.get("instructor_name", "N/A"),
                "instructor_name": feedback.get("instructor_name", "N/A"),
                "rating": feedback.get("rating", 0),
                "title": feedback.get("target_title") or f"{feedback.get('target_type', 'Course')} Feedback",
                "comment": feedback.get("comment", "No comment provided"),
                "createdDate": feedback.get("created_date", datetime.utcnow()).isoformat() if feedback.get("created_date") else datetime.utcnow().isoformat(),
                "created_at": feedback.get("created_date", datetime.utcnow()),
                "status": feedback.get("status", "pending"),
                "helpful": feedback.get("helpful", 0),
                "reported": feedback.get("reported", 0),
                "courseId": feedback.get("course_id") or feedback.get("target_id"),
                "course_id": feedback.get("course_id") or feedback.get("target_id"),
                "target_type": feedback.get("target_type", "course"),
                "target_id": feedback.get("target_id", ""),
                "target_title": feedback.get("target_title", ""),
                "instructor_response": feedback.get("instructor_response"),
                "instructor_response_date": feedback.get("instructor_response_date"),
                "updated_date": feedback.get("updated_date"),
                "due_date": feedback.get("due_date"),
                "completed_date": feedback.get("completed_date"),
                "attended_date": feedback.get("attended_date"),
                "submitted_date": feedback.get("submitted_date")
            }
            
            result.append(formatted_feedback)
        
        return {
            "feedback": result,
            "data": result,  # For compatibility
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": len(result) == limit,
            "page": (offset // limit) + 1 if limit > 0 else 1
        }
        
    except Exception as e:
        print(f"Error in feedback aggregation: {e}")
        # Fallback to simple query if aggregation fails
        feedback_list = list(
            collection.find(query)
            .sort("created_date", -1)
            .skip(offset)
            .limit(limit)
        )
        
        # Enrich with user data (fallback method)
        result = []
        for feedback in feedback_list:
            user = None
            try:
                if isinstance(feedback["user_id"], str):
                    user = users_collection.find_one({"_id": ObjectId(feedback["user_id"])})
                else:
                    user = users_collection.find_one({"_id": feedback["user_id"]})
            except:
                pass
                
            # Format feedback for frontend
            formatted_feedback = {
                "id": str(feedback["_id"]),
                "_id": str(feedback["_id"]),
                "type": f"{feedback.get('target_type', 'course')}_review",
                "userName": user.get("full_name", user.get("name", "Anonymous User")) if user else "Anonymous User",
                "userEmail": user.get("email", "N/A") if user else "N/A",
                "userAvatar": user.get("avatar_url", "") if user else "",
                "user_name": user.get("full_name", user.get("name", "Anonymous User")) if user else "Anonymous User",
                "user_email": user.get("email", "N/A") if user else "N/A",
                "courseName": feedback.get("target_title", feedback.get("course_name", "")),
                "course_title": feedback.get("target_title", feedback.get("course_name", "")),
                "instructorName": feedback.get("instructor_name", "N/A"),
                "instructor_name": feedback.get("instructor_name", "N/A"),
                "rating": feedback.get("rating", 0),
                "title": feedback.get("target_title", f"{feedback.get('target_type', 'Course')} Feedback"),
                "comment": feedback.get("comment", "No comment provided"),
                "createdDate": feedback.get("created_date", datetime.utcnow()).isoformat() if feedback.get("created_date") else datetime.utcnow().isoformat(),
                "created_at": feedback.get("created_date", datetime.utcnow()),
                "status": feedback.get("status", "pending"),
                "helpful": feedback.get("helpful", 0),
                "reported": feedback.get("reported", 0),
                "courseId": feedback.get("course_id", feedback.get("target_id")),
                "course_id": feedback.get("course_id", feedback.get("target_id")),
                "target_type": feedback.get("target_type", "course"),
                "target_id": feedback.get("target_id", ""),
                "target_title": feedback.get("target_title", ""),
                "instructor_response": feedback.get("instructor_response"),
                "instructor_response_date": feedback.get("instructor_response_date"),
                "updated_date": feedback.get("updated_date"),
                "due_date": feedback.get("due_date"),
                "completed_date": feedback.get("completed_date"),
                "attended_date": feedback.get("attended_date"),
                "submitted_date": feedback.get("submitted_date")
            }
            
            result.append(formatted_feedback)
        
        # Get total count for pagination
        total_count = collection.count_documents(query)
        
        return {
            "feedback": result,
            "data": result,  # For compatibility
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": len(result) == limit,
            "page": (offset // limit) + 1 if limit > 0 else 1
        }

@feedback_router.put("/admin/{feedback_id}/status")
def update_feedback_status_admin(
    request: Request,
    feedback_id: str = Path(..., description="Feedback ID"),
    status: str = Query(..., description="New status")
):
    """Update feedback status (admin only)"""
    from app.models.feedback import get_feedback_collection
    from bson import ObjectId
    
    db = request.app.mongodb
    collection = get_feedback_collection(db)
    
    try:
        result = collection.update_one(
            {"_id": ObjectId(feedback_id)},
            {"$set": {
                "status": status,
                "updated_date": datetime.utcnow()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Feedback not found")
            
        return {"success": True, "message": f"Feedback status updated to {status}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating feedback: {str(e)}")

# Alternative endpoint for compatibility
@feedback_router.get("/")
def get_all_feedback_simple(request: Request):
    """Simple endpoint to get all feedback (for compatibility)"""
    # Redirect to admin endpoint with default parameters
    return get_all_feedback_admin(request, None, None, None, None, 100, 0)

@feedback_router.get("/admin/analytics")
def get_admin_analytics(request: Request):
    """Get analytics for admin dashboard"""
    from app.models.feedback import get_feedback_collection
    from datetime import datetime, timedelta
    
    db = request.app.mongodb
    collection = get_feedback_collection(db)
    
    # Get basic counts
    total_reviews = collection.count_documents({})
    pending_reviews = collection.count_documents({"status": "pending"})
    flagged_reviews = collection.count_documents({"status": "flagged"})
    completed_reviews = collection.count_documents({"status": "completed"})
    
    # Get average rating
    pipeline = [
        {"$match": {"rating": {"$exists": True, "$ne": None, "$ne": 0}}},
        {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}
    ]
    rating_result = list(collection.aggregate(pipeline))
    average_rating = round(rating_result[0]["avg_rating"], 2) if rating_result else 0.0
    
    # Get rating distribution
    rating_distribution = {}
    for rating in range(1, 6):
        count = collection.count_documents({"rating": rating})
        rating_distribution[str(rating)] = count
    
    # Get monthly trends (last 6 months)
    monthly_trends = {"labels": [], "data": []}
    for i in range(6):
        month_start = (datetime.utcnow().replace(day=1) - timedelta(days=32*i)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)
        
        month_query = {
            "created_date": {"$gte": month_start, "$lte": month_end}
        }
        count = collection.count_documents(month_query)
        
        monthly_trends["labels"].insert(0, month_start.strftime("%b"))
        monthly_trends["data"].insert(0, count)
    
    # Get feedback by type
    type_pipeline = [
        {"$group": {"_id": "$target_type", "count": {"$sum": 1}}}
    ]
    type_results = list(collection.aggregate(type_pipeline))
    feedback_by_type = {result["_id"]: result["count"] for result in type_results}
    
    return {
        "totalReviews": total_reviews,
        "averageRating": average_rating,
        "ratingDistribution": rating_distribution,
        "monthlyTrends": monthly_trends,
        "feedbackByType": feedback_by_type,
        "pendingReviews": pending_reviews,
        "flaggedReviews": flagged_reviews
    }

@feedback_router.post("/submit")
def submit_feedback_simple(request: Request, payload: dict):
    """Submit feedback with simple payload structure for frontend compatibility"""
    from app.schemas.feedback import FeedbackCreate
    
    db = request.app.mongodb
    
    # Convert frontend payload to backend schema
    feedback_data = FeedbackCreate(
        user_id=payload["user_id"],
        target_type=payload["target_type"],
        target_id=payload["target_id"],
        target_title=payload["target_title"],
        instructor_id=payload.get("instructor_id"),
        instructor_name=payload["instructor_name"],
        course_id=payload.get("course_id"),
        course_name=payload.get("course_name"),
        rating=payload["rating"],
        comment=payload.get("comment"),
        categories=payload.get("categories", []),
        category_ratings=payload.get("categoryRatings", {}),
        completed_date=datetime.fromisoformat(payload["completed_date"]) if payload.get("completed_date") else None,
        attended_date=datetime.fromisoformat(payload["attended_date"]) if payload.get("attended_date") else None,
        submitted_date=datetime.fromisoformat(payload["submitted_date"]) if payload.get("submitted_date") else None,
        due_date=datetime.fromisoformat(payload["due_date"]) if payload.get("due_date") else None
    )
    
    return create_feedback(db, feedback_data)

# Duplicate endpoint for frontend compatibility
@feedback_router.get("/user/{user_id}/counts")
def get_user_feedback_counts_alt(
    request: Request,
    user_id: str = Path(..., description="User ID")
):
    """Get feedback counts for user dashboard (alternative endpoint)"""
    from app.models.feedback import get_feedback_collection
    
    db = request.app.mongodb
    collection = get_feedback_collection(db)
    
    all_count = collection.count_documents({"user_id": user_id})
    pending_count = collection.count_documents({"user_id": user_id, "status": "pending"})
    completed_count = collection.count_documents({"user_id": user_id, "status": "completed"})
    
    return {
        "all": all_count,
        "pending": pending_count,
        "completed": completed_count
    }

@feedback_router.get("/instructor/{instructor_id}/analytics")
def get_instructor_analytics(
    request: Request,
    instructor_id: str = Path(..., description="Instructor ID")
):
    """Get analytics for instructor dashboard"""
    db = request.app.mongodb
    analytics = get_feedback_analytics(db, instructor_id)
    
    # Format for frontend
    return {
        "total_feedback": analytics["total_feedback"],
        "average_rating": analytics["average_rating"],
        "response_rate": analytics.get("response_rate", 0),
        "rating_distribution": analytics["rating_distribution"]
    }

@feedback_router.get("/admin/analytics")
def get_admin_analytics(request: Request):
    """Get analytics for admin dashboard"""
    from app.models.feedback import get_feedback_collection
    from datetime import datetime, timedelta
    
    db = request.app.mongodb
    collection = get_feedback_collection(db)
    
    # Get basic counts
    total_reviews = collection.count_documents({})
    pending_reviews = collection.count_documents({"status": "pending"})
    flagged_reviews = collection.count_documents({"status": "flagged"})
    completed_reviews = collection.count_documents({"status": "completed"})
    
    # Get average rating
    pipeline = [
        {"$match": {"rating": {"$exists": True, "$ne": None, "$ne": 0}}},
        {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}
    ]
    rating_result = list(collection.aggregate(pipeline))
    average_rating = round(rating_result[0]["avg_rating"], 2) if rating_result else 0.0
    
    # Get rating distribution
    rating_distribution = {}
    for rating in range(1, 6):
        count = collection.count_documents({"rating": rating})
        rating_distribution[str(rating)] = count
    
    # Get monthly trends (last 6 months)
    monthly_trends = {"labels": [], "data": []}
    for i in range(6):
        month_start = (datetime.utcnow().replace(day=1) - timedelta(days=32*i)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)
        
        month_query = {
            "created_date": {"$gte": month_start, "$lte": month_end}
        }
        count = collection.count_documents(month_query)
        
        monthly_trends["labels"].insert(0, month_start.strftime("%b"))
        monthly_trends["data"].insert(0, count)
    
    # Get feedback by type
    type_pipeline = [
        {"$group": {"_id": "$target_type", "count": {"$sum": 1}}}
    ]
    type_results = list(collection.aggregate(type_pipeline))
    feedback_by_type = {result["_id"]: result["count"] for result in type_results}
    
    return {
        "totalReviews": total_reviews,
        "averageRating": average_rating,
        "ratingDistribution": rating_distribution,
        "monthlyTrends": monthly_trends,
        "feedbackByType": feedback_by_type,
        "pendingReviews": pending_reviews,
        "flaggedReviews": flagged_reviews
    }

@feedback_router.post("/submit")
def submit_feedback_simple(request: Request, payload: dict):
    """Submit feedback with simple payload structure for frontend compatibility"""
    from app.schemas.feedback import FeedbackCreate
    
    db = request.app.mongodb
    
    # Convert frontend payload to backend schema
    feedback_data = FeedbackCreate(
        user_id=payload["user_id"],
        target_type=payload["target_type"],
        target_id=payload["target_id"],
        target_title=payload["target_title"],
        instructor_id=payload.get("instructor_id"),
        instructor_name=payload["instructor_name"],
        course_id=payload.get("course_id"),
        course_name=payload.get("course_name"),
        rating=payload["rating"],
        comment=payload.get("comment"),
        categories=payload.get("categories", []),
        category_ratings=payload.get("categoryRatings", {}),
        completed_date=datetime.fromisoformat(payload["completed_date"]) if payload.get("completed_date") else None,
        attended_date=datetime.fromisoformat(payload["attended_date"]) if payload.get("attended_date") else None,
        submitted_date=datetime.fromisoformat(payload["submitted_date"]) if payload.get("submitted_date") else None,
        due_date=datetime.fromisoformat(payload["due_date"]) if payload.get("due_date") else None
    )
    
    return create_feedback(db, feedback_data)


