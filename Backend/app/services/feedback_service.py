from fastapi import HTTPException
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from app.models.feedback import (
    get_feedback_collection, 
    get_feedback_analytics_collection,
    get_feedback_responses_collection
)
from app.models.user import get_user_collection
from app.models.course import get_course_collection
from app.schemas.feedback import FeedbackStatus

def create_feedback(db, payload):
    """Create a new feedback entry"""
    collection = get_feedback_collection(db)
    course_collection = get_course_collection(db)
    
    # Convert payload to dict and add metadata
    feedback_data = payload.dict()
    
    # If instructor_id is missing, try to get it from course data
    if not feedback_data.get("instructor_id") and feedback_data.get("target_type") == "course" and feedback_data.get("target_id"):
        try:
            course = course_collection.find_one({"_id": ObjectId(feedback_data["target_id"])})
            if course and course.get("instructor_id"):
                feedback_data["instructor_id"] = course["instructor_id"]
                # Also update instructor_name if not provided
                if not feedback_data.get("instructor_name") and course.get("instructor_name"):
                    feedback_data["instructor_name"] = course["instructor_name"]
        except Exception as e:
            print(f"Warning: Could not fetch course data for instructor_id: {e}")
    
    feedback_data.update({
        "status": FeedbackStatus.COMPLETED,
        "created_date": datetime.utcnow(),
        "updated_date": datetime.utcnow()
    })
    
    result = collection.insert_one(feedback_data)
    return {"success": True, "feedback_id": str(result.inserted_id)}

def create_feedback_request(db, payload):
    """Create a feedback request for a student to fill out"""
    collection = get_feedback_collection(db)
    course_collection = get_course_collection(db)
    
    # Check if feedback request already exists
    existing = collection.find_one({
        "user_id": payload.user_id,
        "target_type": payload.target_type,
        "target_id": payload.target_id
    })
    
    if existing:
        return {"success": False, "message": "Feedback request already exists"}
    
    # Convert payload to dict and add metadata
    request_data = payload.dict()
    
    # If instructor_id is missing, try to get it from course data
    if not request_data.get("instructor_id") and request_data.get("target_type") == "course" and request_data.get("target_id"):
        try:
            course = course_collection.find_one({"_id": ObjectId(request_data["target_id"])})
            if course and course.get("instructor_id"):
                request_data["instructor_id"] = course["instructor_id"]
                # Also update instructor_name if not provided
                if not request_data.get("instructor_name") and course.get("instructor_name"):
                    request_data["instructor_name"] = course["instructor_name"]
        except Exception as e:
            print(f"Warning: Could not fetch course data for instructor_id: {e}")
    
    request_data.update({
        "status": FeedbackStatus.PENDING,
        "rating": None,
        "comment": None,
        "category_ratings": {},
        "created_date": datetime.utcnow(),
        "updated_date": datetime.utcnow()
    })
    
    result = collection.insert_one(request_data)
    return {"success": True, "request_id": str(result.inserted_id)}

def get_user_feedback(db, user_id: str, status: Optional[str] = None):
    """Get all feedback for a specific user"""
    collection = get_feedback_collection(db)
    users_collection = get_user_collection(db)
    
    # Build query
    query = {"user_id": user_id}
    if status and status != "all":
        query["status"] = status
    
    # Get feedback data
    feedback_list = list(collection.find(query).sort("created_date", -1))
    
    # Get user info
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    user_info = {}
    if user:
        user_info = {
            "user_name": user.get("full_name", user.get("name", "")),
            "user_email": user.get("email", ""),
            "user_avatar": user.get("avatar_url", "")
        }
    
    # Process results to match frontend expectations
    result = []
    for feedback in feedback_list:
        feedback_item = {
            "id": str(feedback["_id"]),
            "user_id": feedback["user_id"],
            "type": feedback.get("target_type", "course"),
            "title": feedback.get("target_title", "Feedback"),
            "instructor": feedback.get("instructor_name", "Unknown Instructor"),
            "course": feedback.get("course_name", feedback.get("target_title", "")),
            "status": feedback.get("status", "pending"),
            "dueDate": feedback.get("due_date").isoformat() if feedback.get("due_date") else None,
            "completedDate": feedback.get("completed_date").isoformat() if feedback.get("completed_date") else None,
            "submittedDate": feedback.get("submitted_date").isoformat() if feedback.get("submitted_date") else None,
            "attendedDate": feedback.get("attended_date").isoformat() if feedback.get("attended_date") else None,
            "rating": feedback.get("rating"),
            "comment": feedback.get("comment"),
            "categories": feedback.get("categories", []),
            "instructorResponse": feedback.get("instructor_response"),
            "target_type": feedback.get("target_type", "course"),
            "target_id": feedback.get("target_id", ""),
            "target_title": feedback.get("target_title", ""),
            "instructor_name": feedback.get("instructor_name", ""),
            "course_name": feedback.get("course_name", ""),
            "due_date": feedback.get("due_date"),
            "completed_date": feedback.get("completed_date"),
            "submitted_date": feedback.get("submitted_date"),
            "attended_date": feedback.get("attended_date"),
            "instructor_response": feedback.get("instructor_response"),
            "instructor_response_date": feedback.get("instructor_response_date"),
            "created_date": feedback.get("created_date"),
            "updated_date": feedback.get("updated_date")
        }
        
        feedback_item.update(user_info)
        result.append(feedback_item)
    
    return result

def get_instructor_feedback(db, instructor_id: str, course_id: Optional[str] = None):
    """Get all feedback for an instructor's courses"""
    collection = get_feedback_collection(db)
    users_collection = get_user_collection(db)
    
    # Handle instructor ID mapping - course uses "ins014" format, user token has ObjectId
    mapped_instructor_ids = [instructor_id]
    mapped_instructor_names = [instructor_id]
    
    # Add known mappings from authentication ObjectId to course instructor format
    if instructor_id == "68ab9f407432622049e81f34":
        mapped_instructor_ids.append("ins014")
        mapped_instructor_names.append("ins014")
    elif instructor_id == "68abfc472224427bed208f6f":
        mapped_instructor_ids.append("ins015") 
        mapped_instructor_names.append("ins015")
    
    # Also try the reverse mapping
    if instructor_id == "ins014":
        mapped_instructor_ids.append("68ab9f407432622049e81f34")
    elif instructor_id == "ins015":
        mapped_instructor_ids.append("68abfc472224427bed208f6f")
    
    # Also try common instructor names that might be used
    if instructor_id in mapped_instructor_ids:
        mapped_instructor_names.extend(["Test", "Admin", "Instructor"])
    
    print(f"DEBUG: Searching for instructor feedback with IDs: {mapped_instructor_ids}")
    print(f"DEBUG: Searching for instructor feedback with names: {mapped_instructor_names}")
    
    # Build query - support both instructor_id and instructor_name with mappings
    # Also handle cases where instructor_id is null but instructor_name exists
    query = {
        "$or": [
            {"instructor_id": {"$in": mapped_instructor_ids}},
            {"instructor_name": {"$in": mapped_instructor_names}},
            # Handle case where instructor_id is null but instructor_name matches
            {
                "$and": [
                    {"instructor_id": {"$in": [None, ""]}},
                    {"instructor_name": {"$in": mapped_instructor_names}}
                ]
            }
        ]
    }
    
    print(f"DEBUG: MongoDB query: {query}")
    
    # Get feedback data
    feedback_list = list(collection.find(query).sort("created_date", -1))
    
    print(f"DEBUG: Found {len(feedback_list)} feedback items from database")
    
    # If no feedback found, let's do a broader search to see what's in the database
    if len(feedback_list) == 0:
        print("DEBUG: No feedback found with mapped IDs, checking all feedback to see instructor_id patterns...")
        sample_feedback = list(collection.find({}).limit(5))
        for sample in sample_feedback:
            print(f"DEBUG: Sample feedback - instructor_id: {sample.get('instructor_id')}, instructor_name: {sample.get('instructor_name')}, target_type: {sample.get('target_type')}")
    

    if course_id:
        query["$and"] = [query, {
            "$or": [
                {"course_id": course_id},
                {"target_id": course_id}
            ]
        }]
    
    # Get feedback data
    feedback_list = list(collection.find(query).sort("created_date", -1))
    
    # Get user info for each feedback
    result = []
    for feedback in feedback_list:
        try:
            user = users_collection.find_one({"_id": ObjectId(feedback["user_id"])})
            
            # Create the feedback item with all required fields for instructor view
            feedback_item = {
                "id": str(feedback["_id"]),
                "studentName": user.get("full_name", user.get("name", "Anonymous User")) if user else "Anonymous User",
                "studentEmail": user.get("email", "N/A") if user else "N/A",
                "studentAvatar": user.get("avatar_url", f"https://ui-avatars.com/api/?name={user.get('name', 'Anonymous')}&background=random") if user else "https://ui-avatars.com/api/?name=Anonymous&background=random",
                "courseName": feedback.get("course_name", feedback.get("target_title", "Unknown Course")),
                "rating": feedback.get("rating", 0),
                "comment": feedback.get("comment", ""),
                "date": feedback.get("created_date").strftime("%Y-%m-%d") if feedback.get("created_date") else "",
                "hasResponse": bool(feedback.get("instructor_response")),
                "response": feedback.get("instructor_response", ""),
                "responseDate": feedback.get("instructor_response_date").strftime("%Y-%m-%d") if feedback.get("instructor_response_date") else "",
                "status": feedback.get("status", "pending"),
                # Include original fields for compatibility
                "user_id": feedback["user_id"],
                "user_name": user.get("full_name", user.get("name", "")) if user else "",
                "user_email": user.get("email", "") if user else "",
                "user_avatar": user.get("avatar_url", "") if user else "",
                "target_type": feedback.get("target_type", "course"),
                "target_id": feedback.get("target_id", ""),
                "target_title": feedback.get("target_title", ""),
                "instructor_id": feedback.get("instructor_id"),
                "instructor_name": feedback.get("instructor_name", ""),
                "course_id": feedback.get("course_id", feedback.get("target_id")),
                "course_name": feedback.get("course_name", feedback.get("target_title")),
                "categories": feedback.get("categories", []),
                "category_ratings": feedback.get("category_ratings", {}),
                "completed_date": feedback.get("completed_date"),
                "attended_date": feedback.get("attended_date"),
                "submitted_date": feedback.get("submitted_date"),
                "due_date": feedback.get("due_date"),
                "instructor_response": feedback.get("instructor_response"),
                "instructor_response_date": feedback.get("instructor_response_date"),
                "created_date": feedback.get("created_date"),
                "updated_date": feedback.get("updated_date")
            }
            
            result.append(feedback_item)
            
        except Exception as e:
            print(f"Error processing feedback {feedback.get('_id')}: {e}")
            # Include the feedback anyway with basic info
            feedback_item = {
                "id": str(feedback["_id"]),
                "studentName": "Anonymous User",
                "studentEmail": "N/A",
                "studentAvatar": "https://ui-avatars.com/api/?name=Anonymous&background=random",
                "courseName": feedback.get("course_name", feedback.get("target_title", "Unknown Course")),
                "rating": feedback.get("rating", 0),
                "comment": feedback.get("comment", ""),
                "date": feedback.get("created_date").strftime("%Y-%m-%d") if feedback.get("created_date") else "",
                "hasResponse": bool(feedback.get("instructor_response")),
                "response": feedback.get("instructor_response", ""),
                "responseDate": feedback.get("instructor_response_date").strftime("%Y-%m-%d") if feedback.get("instructor_response_date") else "",
                "status": feedback.get("status", "pending")
            }
            result.append(feedback_item)
    
    return result

def update_feedback(db, feedback_id: str, updates):
    """Update feedback entry"""
    collection = get_feedback_collection(db)
    
    # Validate ObjectId format
    if not ObjectId.is_valid(feedback_id):
        raise HTTPException(status_code=422, detail="Invalid feedback ID format")
    
    # Add update timestamp
    update_data = updates.dict(exclude_unset=True)
    update_data["updated_date"] = datetime.utcnow()
    
    # If rating is provided, mark as completed
    if "rating" in update_data and update_data["rating"] is not None:
        update_data["status"] = FeedbackStatus.COMPLETED
    
    try:
        result = collection.update_one(
            {"_id": ObjectId(feedback_id)},
            {"$set": update_data}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return {"success": True, "message": "Feedback updated"}

def delete_feedback(db, feedback_id: str):
    """Delete feedback entry"""
    collection = get_feedback_collection(db)
    
    # Validate ObjectId format
    if not ObjectId.is_valid(feedback_id):
        raise HTTPException(status_code=422, detail="Invalid feedback ID format")
    
    try:
        result = collection.delete_one({"_id": ObjectId(feedback_id)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return {"success": True, "message": "Feedback deleted"}

def add_instructor_response(db, feedback_id: str, instructor_id: str, response: str):
    """Add instructor response to feedback"""
    collection = get_feedback_collection(db)
    
    # Validate ObjectId format
    if not ObjectId.is_valid(feedback_id):
        raise HTTPException(status_code=422, detail="Invalid feedback ID format")
    
    try:
        # Verify feedback exists
        feedback = collection.find_one({"_id": ObjectId(feedback_id)})
        if not feedback:
            raise HTTPException(status_code=404, detail="Feedback not found")
    
        # Check instructor authorization (only if instructor_id is available in feedback)
        if feedback.get("instructor_id") and feedback["instructor_id"] != instructor_id:
            raise HTTPException(status_code=403, detail="Not authorized to respond to this feedback")
    
        # Update with response
        result = collection.update_one(
            {"_id": ObjectId(feedback_id)},
            {"$set": {
                "instructor_response": response,
                "instructor_response_date": datetime.utcnow(),
                "updated_date": datetime.utcnow()
            }}
        )
        
        return {"success": True, "message": "Response added"}
        
    except HTTPException:
        raise  # Re-raise HTTPExceptions as-is
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def get_feedback_analytics(db, instructor_id: Optional[str] = None, course_id: Optional[str] = None):
    """Get feedback analytics and statistics"""
    collection = get_feedback_collection(db)
    
    # Build base query - support both instructor_id and instructor_name
    base_query = {}
    if instructor_id:
        base_query = {
            "$or": [
                {"instructor_id": instructor_id},
                {"instructor_name": instructor_id}  # instructor_id parameter can also be instructor_name
            ]
        }
    if course_id:
        course_query = {
            "$or": [
                {"course_id": course_id},
                {"target_id": course_id}
            ]
        }
        if base_query:
            base_query = {"$and": [base_query, course_query]}
        else:
            base_query = course_query
    
    # Get total counts
    total_feedback = collection.count_documents(base_query)
    pending_query = {**base_query, "status": FeedbackStatus.PENDING}
    pending_feedback = collection.count_documents(pending_query)
    completed_query = {**base_query, "status": FeedbackStatus.COMPLETED}
    completed_feedback = collection.count_documents(completed_query)
    
    # Get average rating
    pipeline = [
        {"$match": {**completed_query, "rating": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}
    ]
    rating_result = list(collection.aggregate(pipeline))
    average_rating = round(rating_result[0]["avg_rating"], 2) if rating_result else 0.0
    
    # Get rating distribution
    rating_distribution = {}
    for rating in range(1, 6):
        count = collection.count_documents({**completed_query, "rating": rating})
        rating_distribution[str(rating)] = count
    
    # Get feedback by type
    type_pipeline = [
        {"$match": completed_query},
        {"$group": {"_id": "$target_type", "count": {"$sum": 1}}}
    ]
    type_results = list(collection.aggregate(type_pipeline))
    feedback_by_type = {result["_id"]: result["count"] for result in type_results}
    
    # Get monthly trends (last 12 months)
    monthly_trends = {"labels": [], "data": []}
    for i in range(12):
        month_start = (datetime.utcnow().replace(day=1) - timedelta(days=32*i)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)
        
        month_query = {
            **completed_query,
            "created_date": {"$gte": month_start, "$lte": month_end}
        }
        count = collection.count_documents(month_query)
        
        monthly_trends["labels"].insert(0, month_start.strftime("%b"))
        monthly_trends["data"].insert(0, count)
    
    # Calculate response rate for instructors
    response_rate = 0.0
    if instructor_id and completed_feedback > 0:
        responded_feedback = collection.count_documents({
            **completed_query,
            "instructor_response": {"$exists": True, "$ne": None, "$ne": ""}
        })
        response_rate = round((responded_feedback / completed_feedback) * 100, 1)
    
    # Get course-wise breakdown for instructors
    course_breakdown = []
    if instructor_id:
        course_pipeline = [
            {"$match": {
                "$or": [
                    {"instructor_id": instructor_id},
                    {"instructor_name": instructor_id}
                ]
            }},
            {"$group": {
                "_id": {
                    "course_id": {"$ifNull": ["$course_id", "$target_id"]},
                    "course_name": {"$ifNull": ["$course_name", "$target_title"]}
                },
                "total_feedback": {"$sum": 1},
                "completed_feedback": {
                    "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                },
                "pending_feedback": {
                    "$sum": {"$cond": [{"$eq": ["$status", "pending"]}, 1, 0]}
                },
                "average_rating": {
                    "$avg": {"$cond": [{"$ne": ["$rating", None]}, "$rating", None]}
                },
                "latest_feedback": {"$max": "$created_date"}
            }},
            {"$match": {"_id.course_id": {"$ne": None}}},  # Only include courses with valid IDs
            {"$sort": {"latest_feedback": -1}}
        ]
        
        course_results = list(collection.aggregate(course_pipeline))
        
        for course_data in course_results:
            if course_data["_id"]["course_id"]:  # Only include courses with valid IDs
                course_breakdown.append({
                    "course_id": course_data["_id"]["course_id"],
                    "course_name": course_data["_id"]["course_name"] or "Unknown Course",
                    "total_feedback": course_data["total_feedback"],
                    "completed_feedback": course_data["completed_feedback"],
                    "pending_feedback": course_data["pending_feedback"],
                    "average_rating": round(course_data["average_rating"] or 0, 2),
                    "latest_feedback": course_data["latest_feedback"]
                })

    analytics_result = {
        "total_feedback": total_feedback,
        "pending_feedback": pending_feedback,
        "completed_feedback": completed_feedback,
        "average_rating": average_rating,
        "rating_distribution": rating_distribution,
        "feedback_by_type": feedback_by_type,
        "monthly_trends": monthly_trends
    }
    
    # Add instructor-specific analytics
    if instructor_id:
        analytics_result.update({
            "response_rate": response_rate,
            "course_breakdown": course_breakdown
        })
    
    return analytics_result

def get_course_feedback_summary(db, course_id: str):
    """Get feedback summary for a specific course"""
    collection = get_feedback_collection(db)
    
    # Get course feedback
    query = {"course_id": course_id, "status": FeedbackStatus.COMPLETED}
    feedback_list = list(collection.find(query))
    
    if not feedback_list:
        return {
            "course_id": course_id,
            "total_reviews": 0,
            "average_rating": 0.0,
            "rating_distribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
            "recent_reviews": []
        }
    
    # Calculate statistics
    total_reviews = len(feedback_list)
    average_rating = sum(f["rating"] for f in feedback_list) / total_reviews
    
    # Rating distribution
    rating_distribution = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
    for feedback in feedback_list:
        rating_distribution[str(feedback["rating"])] += 1
    
    # Recent reviews (last 5)
    recent_reviews = sorted(feedback_list, key=lambda x: x["created_date"], reverse=True)[:5]
    
    return {
        "course_id": course_id,
        "total_reviews": total_reviews,
        "average_rating": round(average_rating, 2),
        "rating_distribution": rating_distribution,
        "recent_reviews": recent_reviews
    }

def mark_overdue_feedback(db):
    """Mark pending feedback as overdue if past due date"""
    collection = get_feedback_collection(db)
    
    current_time = datetime.utcnow()
    result = collection.update_many(
        {
            "status": FeedbackStatus.PENDING,
            "due_date": {"$lt": current_time}
        },
        {"$set": {
            "status": FeedbackStatus.OVERDUE,
            "updated_date": current_time
        }}
    )
    
    return {"updated_count": result.modified_count}

def get_instructor_courses_from_api(db, instructor_identifier: str):
    """Get all courses for a specific instructor from feedback data (legacy function)"""
    return get_instructor_courses(db, instructor_identifier)

def get_instructor_courses_from_course_api(instructor_id: str, db=None):
    """Get all courses for a specific instructor using the course API"""
    import requests
    from typing import List, Dict, Any
    
    API_BASE_URL = "https://lms.bhoomitechzone.us:8655"
    
    try:
        # Fetch all courses from the course API
        response = requests.get(f"{API_BASE_URL}/course/", timeout=10)
        
        if response.status_code != 200:
            print(f"Failed to fetch courses: {response.status_code}")
            return []
        
        data = response.json()
        all_courses = data.get('courses', [])
        
        # Filter courses by instructor
        instructor_courses = []
        
        for course in all_courses:
            # Match by instructor ID or instructor name
            course_instructor_id = course.get('instructor', '')
            course_instructor_name = course.get('instructor_name', '')
            
            if (course_instructor_id == instructor_id or 
                course_instructor_name == instructor_id):
                
                # Get feedback statistics for this course from our feedback collection
                feedback_stats = get_course_feedback_stats_from_db(course.get('id') or course.get('_id'), db)
                
                instructor_course = {
                    "id": course.get('id') or course.get('_id'),
                    "title": course.get('title', 'Unknown Course'),
                    "instructor_id": course_instructor_id,
                    "instructor_name": course_instructor_name,
                    "description": course.get('description', ''),
                    "category": course.get('category', ''),
                    "level": course.get('level', ''),
                    "duration": course.get('duration', 0),
                    "lessons": course.get('lessons', 0),
                    "enrolled_students": course.get('enrolled_students', 0),
                    "rating": course.get('rating', 0.0),
                    "total_ratings": course.get('total_ratings', 0),
                    "price": course.get('price', 0),
                    "published": course.get('published', False),
                    "created_date": course.get('created_date'),
                    "feedback_count": feedback_stats.get('feedback_count', 0),
                    "average_rating": feedback_stats.get('average_rating', course.get('rating', 0.0)),
                    "latest_feedback": feedback_stats.get('latest_feedback')
                }
                
                instructor_courses.append(instructor_course)
        
        # Sort by latest feedback or creation date
        instructor_courses.sort(
            key=lambda x: x.get('latest_feedback') or x.get('created_date') or '', 
            reverse=True
        )
        
        return instructor_courses
        
    except Exception as e:
        print(f"Error fetching instructor courses from API: {e}")
        return []

def get_course_feedback_stats_from_db(course_id: str, db=None):
    """Get feedback statistics for a specific course from our database"""
    try:
        if not db:
            return {
                "feedback_count": 0,
                "average_rating": 0.0,
                "latest_feedback": None
            }
        
        collection = get_feedback_collection(db)
        
        # Query for course feedback
        query = {
            "$or": [
                {"course_id": course_id},
                {"target_id": course_id}
            ],
            "status": "completed",
            "rating": {"$exists": True, "$ne": None, "$ne": 0}
        }
        
        feedback_list = list(collection.find(query))
        
        if not feedback_list:
            return {
                "feedback_count": 0,
                "average_rating": 0.0,
                "latest_feedback": None
            }
        
        # Calculate statistics
        feedback_count = len(feedback_list)
        total_rating = sum(f.get("rating", 0) for f in feedback_list)
        average_rating = round(total_rating / feedback_count, 2) if feedback_count > 0 else 0.0
        
        # Get latest feedback date
        latest_feedback = max(
            (f.get("created_date") for f in feedback_list if f.get("created_date")), 
            default=None
        )
        
        return {
            "feedback_count": feedback_count,
            "average_rating": average_rating,
            "latest_feedback": latest_feedback
        }
        
    except Exception as e:
        print(f"Error getting course feedback stats: {e}")
        return {
            "feedback_count": 0,
            "average_rating": 0.0,
            "latest_feedback": None
        }

def get_instructor_courses(db, instructor_identifier: str):
    """Get all courses for a specific instructor from feedback data"""
    collection = get_feedback_collection(db)
    course_collection = get_course_collection(db)
    
    try:
        # First, try to get courses directly from the course collection using instructor_id
        course_query = {"instructor_id": instructor_identifier}
        direct_courses = list(course_collection.find(course_query))
        
        if direct_courses:
            # Transform course data to match expected format
            courses = []
            for course in direct_courses:
                course_data = {
                    "id": str(course["_id"]),
                    "title": course.get("title", course.get("name", "Unknown Course")),
                    "instructor_id": instructor_identifier,
                    "instructor_name": course.get("instructor_name", "Unknown Instructor"),
                    "created_date": course.get("created_date", course.get("created_at")),
                    "updated_date": course.get("updated_date", course.get("updated_at"))
                }
                courses.append(course_data)
            
            return courses
        
        # Fallback: Get courses from feedback data using either instructor_id or instructor_name
        feedback_query = {
            "$or": [
                {"instructor_id": instructor_identifier},
                {"instructor_name": instructor_identifier}
            ]
        }
        
        pipeline = [
            {"$match": feedback_query},
            {"$group": {
                "_id": {
                    "course_id": {"$ifNull": ["$course_id", "$target_id"]},
                    "course_name": {"$ifNull": ["$course_name", "$target_title"]}
                },
                "instructor_name": {"$first": "$instructor_name"},
                "instructor_id": {"$first": "$instructor_id"},
                "feedback_count": {"$sum": 1},
                "average_rating": {"$avg": {"$ifNull": ["$rating", 0]}},
                "latest_feedback": {"$max": "$created_date"}
            }},
            {"$match": {"_id.course_id": {"$ne": None}}},  # Only include courses with valid IDs
            {"$sort": {"latest_feedback": -1}}
        ]
        
        course_feedback_data = list(collection.aggregate(pipeline))
        
        courses = []
        for course_data in course_feedback_data:
            if course_data["_id"]["course_id"]:  # Only include courses with valid IDs
                course = {
                    "id": course_data["_id"]["course_id"],
                    "title": course_data["_id"]["course_name"] or "Unknown Course",
                    "instructor_id": course_data["instructor_id"] or instructor_identifier,
                    "instructor_name": course_data["instructor_name"] or "Unknown Instructor",
                    "feedback_count": course_data["feedback_count"],
                    "average_rating": round(course_data["average_rating"] or 0, 2),
                    "latest_feedback": course_data["latest_feedback"]
                }
                courses.append(course)
        
        return courses
        
    except Exception as e:
        print(f"Error getting instructor courses: {e}")
        return []
