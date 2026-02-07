from fastapi import HTTPException
from bson import ObjectId
from datetime import datetime
from app.models.lesson import get_lesson_collection
from app.utils.serializers import serialize_document

def create_lesson(db, module_id, payload):
    """Create a new lesson for a module"""
    collection = get_lesson_collection(db)
    
    # Check if order already exists for this module
    existing_lesson = collection.find_one({
        "module_id": ObjectId(module_id),
        "order": payload.order
    })
    
    if existing_lesson:
        raise HTTPException(
            status_code=400, 
            detail=f"A lesson with order {payload.order} already exists in this module"
        )
    
    lesson_doc = {
        **payload.dict(),
        "module_id": ObjectId(module_id),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = collection.insert_one(lesson_doc)
    return {"success": True, "lesson_id": str(result.inserted_id)}

def get_lessons_for_module(db, module_id):
    """Get all lessons for a specific module, ordered by order field"""
    collection = get_lesson_collection(db)
    lessons = list(collection.find({"module_id": ObjectId(module_id)}).sort("order", 1))
    return [serialize_document(lesson) for lesson in lessons]

def update_lesson(db, lesson_id, updates):
    """Update a lesson"""
    collection = get_lesson_collection(db)
    
    update_data = updates.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    # If updating order, check for conflicts
    if "order" in update_data:
        lesson = collection.find_one({"_id": ObjectId(lesson_id)})
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        existing_lesson = collection.find_one({
            "module_id": lesson["module_id"],
            "order": update_data["order"],
            "_id": {"$ne": ObjectId(lesson_id)}
        })
        
        if existing_lesson:
            raise HTTPException(
                status_code=400,
                detail=f"A lesson with order {update_data['order']} already exists in this module"
            )
    
    result = collection.update_one(
        {"_id": ObjectId(lesson_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    return {"success": True, "message": "Lesson updated successfully"}

def update_lesson_video_url(db, lesson_id, video_url):
    """Update lesson with video URL after successful upload"""
    collection = get_lesson_collection(db)
    
    result = collection.update_one(
        {"_id": ObjectId(lesson_id)},
        {"$set": {
            "video_url": video_url,
            "updated_at": datetime.utcnow()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    return {"success": True, "message": "Lesson video URL updated successfully"}

def update_lesson_pdf_url(db, lesson_id, pdf_url, pdf_filename):
    """Update lesson with PDF URL after successful upload"""
    collection = get_lesson_collection(db)
    
    result = collection.update_one(
        {"_id": ObjectId(lesson_id)},
        {"$set": {
            "pdf_url": pdf_url,
            "pdf_filename": pdf_filename,
            "updated_at": datetime.utcnow()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    return {"success": True, "message": "Lesson PDF URL updated successfully"}

def delete_lesson(db, lesson_id):
    """Delete a lesson"""
    collection = get_lesson_collection(db)
    result = collection.delete_one({"_id": ObjectId(lesson_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    return {"success": True, "message": "Lesson deleted successfully"}

def get_lesson_by_id(db, lesson_id):
    """Get a specific lesson by ID"""
    collection = get_lesson_collection(db)
    lesson = collection.find_one({"_id": ObjectId(lesson_id)})
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    return serialize_document(lesson)