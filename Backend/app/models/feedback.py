from pymongo import IndexModel, ASCENDING, DESCENDING

def get_feedback_collection(db):
    """Get the feedback collection with proper indexing"""
    collection = db["feedback"]
    
    # Create indexes for better performance
    indexes = [
        IndexModel([("user_id", ASCENDING)]),  # Filter by user
        IndexModel([("target_type", ASCENDING)]),  # Filter by feedback type
        IndexModel([("target_id", ASCENDING)]),  # Filter by target (course, assignment, etc.)
        IndexModel([("status", ASCENDING)]),  # Filter by status
        IndexModel([("created_date", DESCENDING)]),  # Sort by creation date
        IndexModel([("rating", DESCENDING)]),  # Sort by rating
        IndexModel([("instructor_id", ASCENDING)]),  # Filter by instructor
        IndexModel([("course_id", ASCENDING)]),  # Filter by course
        IndexModel([("due_date", ASCENDING)]),  # Sort by due date
    ]
    
    try:
        collection.create_indexes(indexes)
    except Exception as e:
        # Index creation might fail if they already exist, which is fine
        pass
    
    return collection

def get_feedback_analytics_collection(db):
    """Get collection for feedback analytics and aggregated data"""
    return db["feedback_analytics"]

def get_feedback_responses_collection(db):
    """Get collection for instructor responses to feedback"""
    return db["feedback_responses"]
