from pymongo import IndexModel, ASCENDING, DESCENDING

def get_lecture_collection(db):
    """Get the lectures collection with proper indexing"""
    collection = db["lectures"]
    
    # Create indexes for better performance
    indexes = [
        IndexModel([("course_id", ASCENDING)]),  # Course filter
        IndexModel([("module_id", ASCENDING)]),  # Module filter
        IndexModel([("instructor_id", ASCENDING)]),  # Instructor filter
        IndexModel([("title", "text")]),  # Text search
        IndexModel([("uploaded_at", DESCENDING)]),  # Sort by upload date
        IndexModel([("course_id", ASCENDING), ("module_id", ASCENDING)]),  # Course-Module compound index
        IndexModel([("course_id", ASCENDING), ("uploaded_at", DESCENDING)]),  # Course-Date compound index
    ]
    
    try:
        collection.create_indexes(indexes)
    except Exception as e:
        # Index creation might fail if they already exist, which is fine
        pass
    
    return collection