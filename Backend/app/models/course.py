from pymongo import IndexModel, ASCENDING, DESCENDING

def get_course_collection(db):
    """Get the courses collection with proper indexing"""
    collection = db["courses"]
    
    # Create indexes for better performance
    indexes = [
        IndexModel([("title", "text"), ("description", "text")]),  # Text search
        IndexModel([("category", ASCENDING)]),  # Category filter
        IndexModel([("instructor", ASCENDING)]),  # Instructor filter
        IndexModel([("published", ASCENDING)]),  # Published status filter
        IndexModel([("price", ASCENDING)]),  # Price range filter
        IndexModel([("created_date", DESCENDING)]),  # Sort by creation date
        IndexModel([("rating", DESCENDING)]),  # Sort by rating
        IndexModel([("enrolled_students", DESCENDING)]),  # Sort by popularity
    ]
    
    try:
        collection.create_indexes(indexes)
    except Exception as e:
        # Index creation might fail if they already exist, which is fine
        pass
    
    return collection

def get_course_stats_collection(db):
    """Get collection for course statistics and analytics"""
    return db["course_stats"]

def get_enrollment_collection(db):
    """Get collection for course enrollments"""
    return db["enrollments"]
