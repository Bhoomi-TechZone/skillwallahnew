from fastapi import APIRouter, Request, Path
from app.schemas.module import ModuleCreate, ModuleUpdate
from app.services.module_service import (
    create_module, get_modules_for_course, update_module, delete_module, get_module_by_id
)

module_router = APIRouter(prefix="/courses", tags=["Modules"])

@module_router.post("/{course_id}/modules")
def add_module(request: Request, course_id: str, payload: ModuleCreate):
    """Add a new module to a course"""
    db = request.app.mongodb
    return create_module(db, course_id, payload)

@module_router.get("/{course_id}/modules")
def list_modules(request: Request, course_id: str):
    """Get all modules for a specific course"""
    db = request.app.mongodb
    return get_modules_for_course(db, course_id)

@module_router.get("/modules/{module_id}")
def get_module(request: Request, module_id: str):
    """Get a specific module by ID"""
    db = request.app.mongodb
    return get_module_by_id(db, module_id)

@module_router.put("/modules/{module_id}")
def update_module_handler(request: Request, module_id: str, payload: ModuleUpdate):
    """Update a module"""
    db = request.app.mongodb
    return update_module(db, module_id, payload)

@module_router.delete("/modules/{module_id}")
def delete_module_handler(request: Request, module_id: str):
    """Delete a module and all its lessons"""
    db = request.app.mongodb
    return delete_module(db, module_id)

# Additional router for direct module access (without /courses prefix)
direct_module_router = APIRouter(prefix="/modules", tags=["Direct Module Access"])

@direct_module_router.get("/{module_id}")
def get_module_direct(request: Request, module_id: str):
    """Get a specific module by ID (direct access)"""
    db = request.app.mongodb
    return get_module_by_id(db, module_id)

@direct_module_router.get("/{module_id}/lessons")
def get_module_lessons_direct(request: Request, module_id: str):
    """Get all lessons for a specific module (direct access)"""
    from app.services.lesson_service import get_lessons_for_module
    db = request.app.mongodb
    return get_lessons_for_module(db, module_id)


