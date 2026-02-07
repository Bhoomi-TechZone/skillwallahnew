from fastapi import HTTPException
from bson import ObjectId
from app.models.submission import get_submission_collection
from datetime import datetime

def create_submission(db, payload):
    """Create a new submission with automatic timestamp"""
    collection = get_submission_collection(db)
    
    # Convert payload to dict and add timestamp
    submission_data = payload.dict()
    submission_data["submission_date"] = datetime.utcnow()
    
    # Convert string IDs to ObjectIds for database storage
    if "student_id" in submission_data and isinstance(submission_data["student_id"], str):
        submission_data["student_id"] = ObjectId(submission_data["student_id"])
    if "assignment_id" in submission_data and isinstance(submission_data["assignment_id"], str):
        submission_data["assignment_id"] = ObjectId(submission_data["assignment_id"])
    
    # Set default status
    submission_data["status"] = "submitted"
    submission_data["grade"] = None
    submission_data["feedback"] = None
    
    result = collection.insert_one(submission_data)
    return {
        "success": True, 
        "submission_id": str(result.inserted_id),
        "message": "Assignment submitted successfully!"
    }

def get_submissions_by_assignment(db, assignment_id):
    collection = get_submission_collection(db)
    return list(collection.find({"assignment_id": assignment_id}))

def update_submission(db, submission_id, updates):
    collection = get_submission_collection(db)
    result = collection.update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": updates.dict(exclude_unset=True)}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"success": True, "message": "Submission updated"}

def delete_submission(db, submission_id):
    collection = get_submission_collection(db)
    result = collection.delete_one({"_id": ObjectId(submission_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"success": True, "message": "Submission deleted"}
