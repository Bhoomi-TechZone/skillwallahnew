from pymongo import IndexModel, ASCENDING, DESCENDING

def get_live_session_collection(db):
    """Get the live sessions collection with proper indexing"""
    collection = db["live_sessions"]
    
    # Create indexes for better performance
    indexes = [
        IndexModel([("course_id", ASCENDING)]),
        IndexModel([("scheduled_time", ASCENDING)]),
        IndexModel([("status", ASCENDING)]),
        IndexModel([("created_by", ASCENDING)]),
        IndexModel([("channel_name", ASCENDING)], unique=True)
    ]
    
    try:
        collection.create_indexes(indexes)
    except Exception as e:
        # Index creation might fail if they already exist, which is fine
        pass
    
    return collection
