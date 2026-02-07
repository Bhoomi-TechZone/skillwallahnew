from fastapi import APIRouter, Request, HTTPException
from app.schemas.lesson import LessonCreate, LessonUpdate
from app.services.lesson_service import (
    create_lesson, get_lessons_for_module, update_lesson, 
    delete_lesson, get_lesson_by_id
)

lesson_router = APIRouter(prefix="/modules", tags=["Lessons"])

@lesson_router.get("/{module_id}")
def get_module_with_lessons(request: Request, module_id: str):
    """Get module info with all its lessons"""
    from app.services.module_service import get_module_by_id
    db = request.app.mongodb
    
    # Get module info
    module = get_module_by_id(db, module_id)
    
    # Get lessons for this module
    lessons = get_lessons_for_module(db, module_id)
    
    # Return combined data
    return {
        "module": module,
        "lessons": lessons,
        "total_lessons": len(lessons)
    }

@lesson_router.post("/{module_id}/lessons")
def add_lesson(request: Request, module_id: str, payload: LessonCreate):
    """Add a new lesson to a module"""
    db = request.app.mongodb
    return create_lesson(db, module_id, payload)

@lesson_router.get("/{module_id}/lessons")
def list_lessons(request: Request, module_id: str):
    """Get all lessons for a specific module"""
    db = request.app.mongodb
    return get_lessons_for_module(db, module_id)

@lesson_router.get("/lessons/{lesson_id}")
def get_lesson(request: Request, lesson_id: str):
    """Get a specific lesson by ID"""
    db = request.app.mongodb
    return get_lesson_by_id(db, lesson_id)

@lesson_router.put("/lessons/{lesson_id}")
def update_lesson_handler(request: Request, lesson_id: str, payload: LessonUpdate):
    """Update a lesson"""
    db = request.app.mongodb
    return update_lesson(db, lesson_id, payload)

@lesson_router.delete("/lessons/{lesson_id}")
def delete_lesson_handler(request: Request, lesson_id: str):
    """Delete a lesson"""
    db = request.app.mongodb
    return delete_lesson(db, lesson_id)

