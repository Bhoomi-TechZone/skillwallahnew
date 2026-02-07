from fastapi import HTTPException
from bson import ObjectId
from app.models.review import get_review_collection

def create_review(db, payload):
    collection = get_review_collection(db)
    result = collection.insert_one(payload.dict())
    return {"success": True, "review_id": str(result.inserted_id)}

def get_reviews_by_submission(db, submission_id):
    collection = get_review_collection(db)
    return list(collection.find({"submission_id": submission_id}))

def update_review(db, review_id, updates):
    collection = get_review_collection(db)
    result = collection.update_one(
        {"_id": ObjectId(review_id)},
        {"$set": updates.dict(exclude_unset=True)}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"success": True, "message": "Review updated"}

def delete_review(db, review_id):
    collection = get_review_collection(db)
    result = collection.delete_one({"_id": ObjectId(review_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"success": True, "message": "Review deleted"}
