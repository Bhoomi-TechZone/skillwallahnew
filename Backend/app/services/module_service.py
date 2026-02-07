from fastapi import HTTPException
from bson import ObjectId
from datetime import datetime
from app.models.module import get_module_collection
from app.models.lesson import get_lesson_collection
from app.utils.serializers import serialize_document

def create_module(db, course_id, payload):
    """Create a new module for a course"""
    collection = get_module_collection(db)
    course_collection = db["courses"]
    
    # Try to find the course and get its proper ID
    course = course_collection.find_one({"id": course_id})
    if not course:
        try:
            course = course_collection.find_one({"_id": ObjectId(course_id)})
        except:
            course = course_collection.find_one({"_id": course_id})
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Use the course's id or _id for consistency
    course_ref_id = course.get("id", course.get("_id"))
    
    # Check if a module with same name already exists for this course
    existing_by_name = collection.find_one({
        "course_id": course_ref_id,
        "name": payload.name
    })
    
    if existing_by_name:
        raise HTTPException(
            status_code=400, 
            detail=f"A module with name '{payload.name}' already exists in this course"
        )
    
    # Check if order already exists for this course (only if order is provided)
    if hasattr(payload, 'order') and payload.order:
        existing_by_order = collection.find_one({
            "course_id": course_ref_id,
            "order": payload.order
        })
        
        if existing_by_order:
            raise HTTPException(
                status_code=400, 
                detail=f"A module with order {payload.order} already exists in this course"
            )
    
    # Prepare module document
    module_data = payload.dict()
    
    # Ensure both name and title are set (for compatibility)
    if 'name' in module_data and 'title' not in module_data:
        module_data['title'] = module_data['name']
    elif 'title' in module_data and 'name' not in module_data:
        module_data['name'] = module_data['title']
    
    module_doc = {
        **module_data, 
        "course_id": course_ref_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    print(f"Creating module document: {module_doc}")
    result = collection.insert_one(module_doc)
    
    created_module = collection.find_one({"_id": result.inserted_id})
    from app.utils.serializers import serialize_document
    
    return {
        "success": True, 
        "module_id": str(result.inserted_id),
        "module": serialize_document(created_module)
    }

def get_modules_for_course(db, course_id):
    """Get all modules for a course with lesson count, ordered by order field"""
    module_collection = get_module_collection(db)
    lesson_collection = get_lesson_collection(db)
    course_collection = db["courses"]
    
    # Try to find the course and get its proper ID
    course = course_collection.find_one({"id": course_id})
    if not course:
        try:
            course = course_collection.find_one({"_id": ObjectId(course_id)})
        except:
            course = course_collection.find_one({"_id": course_id})
    
    if not course:
        return []
    
    # Use the course's id or _id for consistency
    course_ref_id = course.get("id", course.get("_id"))
    
    modules = list(module_collection.find({"course_id": course_ref_id}).sort("order", 1))
    
    # Add lesson count to each module
    for module in modules:
        lesson_count = lesson_collection.count_documents({"module_id": module["_id"]})
        module["lessons_count"] = lesson_count
    
    return [serialize_document(m) for m in modules]

def update_module(db, module_id, updates):
    """Update a module"""
    collection = get_module_collection(db)
    
    update_data = updates.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    # If updating order, check for conflicts
    if "order" in update_data:
        module = collection.find_one({"_id": ObjectId(module_id)})
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        
        existing_module = collection.find_one({
            "course_id": module["course_id"],
            "order": update_data["order"],
            "_id": {"$ne": ObjectId(module_id)}
        })
        
        if existing_module:
            raise HTTPException(
                status_code=400,
                detail=f"A module with order {update_data['order']} already exists in this course"
            )
    
    result = collection.update_one(
        {"_id": ObjectId(module_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Module not found")
    
    return {"success": True, "message": "Module updated successfully"}

def delete_module(db, module_id):
    """Delete a module and all its lessons"""
    module_collection = get_module_collection(db)
    lesson_collection = get_lesson_collection(db)
    
    # First delete all lessons in this module
    lesson_collection.delete_many({"module_id": ObjectId(module_id)})
    
    # Then delete the module
    result = module_collection.delete_one({"_id": ObjectId(module_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Module not found")
    
    return {"success": True, "message": "Module and all its lessons deleted successfully"}

def get_module_by_id(db, module_id):
    """Get a specific module by ID with lesson count"""
    module_collection = get_module_collection(db)
    lesson_collection = get_lesson_collection(db)
    
    module = module_collection.find_one({"_id": ObjectId(module_id)})
    
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    # Add lesson count
    lesson_count = lesson_collection.count_documents({"module_id": module["_id"]})
    module["lessons_count"] = lesson_count
    
    return serialize_document(module)
