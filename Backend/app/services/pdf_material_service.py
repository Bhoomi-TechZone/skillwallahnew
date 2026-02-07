from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from app.models.pdf_material import get_pdf_material_collection
from app.schemas.pdf_material import PDFMaterialCreate, PDFMaterialUpdate
import logging

logger = logging.getLogger(__name__)

def create_pdf_material(db, payload: PDFMaterialCreate, instructor_id: str) -> Dict[str, Any]:
    """Create a new PDF material for a specific course and module"""
    try:
        pdf_collection = get_pdf_material_collection(db)
        
        # Verify course belongs to instructor
        course_collection = db["courses"]
        course = course_collection.find_one({
            "_id": ObjectId(payload.course_id),
            "instructor_id": instructor_id
        })
        
        if not course:
            raise HTTPException(
                status_code=404,
                detail="Course not found or you don't have permission to add materials to it"
            )
        
        # Verify module belongs to the course (if module_id is provided)
        if payload.module_id:
            module_collection = db["modules"]
            module = module_collection.find_one({
                "_id": ObjectId(payload.module_id),
                "course_id": payload.course_id
            })
            
            if not module:
                raise HTTPException(
                    status_code=404,
                    detail="Module not found or doesn't belong to the specified course"
                )
        
        # Create PDF material document
        pdf_doc = {
            "title": payload.title,
            "description": payload.description,
            "course_id": payload.course_id,
            "module_id": payload.module_id,
            "instructor_id": instructor_id,
            "file_url": None,
            "file_name": None,
            "file_size": None,
            "tags": payload.tags or [],
            "is_downloadable": payload.is_downloadable,
            "uploaded_at": datetime.now(timezone.utc),
            "updated_at": None
        }
        
        result = pdf_collection.insert_one(pdf_doc)
        
        # Return the created PDF material
        created_material = pdf_collection.find_one({"_id": result.inserted_id})
        created_material["id"] = str(created_material["_id"])
        del created_material["_id"]
        
        return {
            "success": True,
            "message": "PDF material created successfully",
            "material": created_material
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating PDF material: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create PDF material")

def get_pdf_materials_by_course(db, course_id: str, instructor_id: str, module_id: Optional[str] = None) -> Dict[str, Any]:
    """Get all PDF materials for a specific course (with proper course isolation)"""
    try:
        pdf_collection = get_pdf_material_collection(db)
        
        # Verify course belongs to instructor
        course_collection = db["courses"]
        course = course_collection.find_one({
            "_id": ObjectId(course_id),
            "instructor_id": instructor_id
        })
        
        if not course:
            raise HTTPException(
                status_code=404,
                detail="Course not found or you don't have permission to view its materials"
            )
        
        # Build query with proper course isolation
        query = {
            "course_id": course_id,
            "instructor_id": instructor_id  # Ensure only instructor's content is returned
        }
        
        # Add module filter if provided
        if module_id:
            query["module_id"] = module_id
        
        # Get PDF materials sorted by upload date
        materials = list(pdf_collection.find(query).sort([
            ("uploaded_at", -1)
        ]))
        
        # Convert ObjectId to string for JSON serialization
        for material in materials:
            material["id"] = str(material["_id"])
            del material["_id"]
        
        return {
            "success": True,
            "materials": materials,
            "total": len(materials),
            "course_id": course_id,
            "module_id": module_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting PDF materials by course: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve PDF materials")

def get_pdf_materials_by_module(db, module_id: str, instructor_id: str) -> Dict[str, Any]:
    """Get all PDF materials for a specific module (with proper course isolation)"""
    try:
        pdf_collection = get_pdf_material_collection(db)
        
        # Get module info to verify course ownership
        module_collection = db["modules"]
        module = module_collection.find_one({"_id": ObjectId(module_id)})
        
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        
        # Verify course belongs to instructor
        course_collection = db["courses"]
        course = course_collection.find_one({
            "_id": ObjectId(module["course_id"]),
            "instructor_id": instructor_id
        })
        
        if not course:
            raise HTTPException(
                status_code=404,
                detail="You don't have permission to view materials from this module"
            )
        
        # Get PDF materials with proper isolation
        query = {
            "module_id": module_id,
            "course_id": module["course_id"],
            "instructor_id": instructor_id
        }
        
        materials = list(pdf_collection.find(query).sort([
            ("uploaded_at", -1)
        ]))
        
        # Convert ObjectId to string
        for material in materials:
            material["id"] = str(material["_id"])
            del material["_id"]
        
        return {
            "success": True,
            "materials": materials,
            "total": len(materials),
            "module_id": module_id,
            "course_id": module["course_id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting PDF materials by module: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve PDF materials")

def get_pdf_material_by_id(db, material_id: str, instructor_id: str) -> Dict[str, Any]:
    """Get a specific PDF material by ID (with ownership verification)"""
    try:
        pdf_collection = get_pdf_material_collection(db)
        
        material = pdf_collection.find_one({
            "_id": ObjectId(material_id),
            "instructor_id": instructor_id  # Ensure ownership
        })
        
        if not material:
            raise HTTPException(
                status_code=404,
                detail="PDF material not found or you don't have permission to view it"
            )
        
        material["id"] = str(material["_id"])
        del material["_id"]
        
        return {
            "success": True,
            "material": material
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting PDF material by ID: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve PDF material")

def update_pdf_material(db, material_id: str, payload: PDFMaterialUpdate, instructor_id: str) -> Dict[str, Any]:
    """Update a PDF material (with ownership verification)"""
    try:
        pdf_collection = get_pdf_material_collection(db)
        
        # Verify material ownership
        existing_material = pdf_collection.find_one({
            "_id": ObjectId(material_id),
            "instructor_id": instructor_id
        })
        
        if not existing_material:
            raise HTTPException(
                status_code=404,
                detail="PDF material not found or you don't have permission to update it"
            )
        
        # Build update document
        update_doc = {"updated_at": datetime.now(timezone.utc)}
        
        if payload.title is not None:
            update_doc["title"] = payload.title
        if payload.description is not None:
            update_doc["description"] = payload.description
        if payload.module_id is not None:
            # Verify module belongs to the same course
            if payload.module_id:
                module_collection = db["modules"]
                module = module_collection.find_one({
                    "_id": ObjectId(payload.module_id),
                    "course_id": existing_material["course_id"]
                })
                if not module:
                    raise HTTPException(
                        status_code=400,
                        detail="Module doesn't belong to the same course"
                    )
            update_doc["module_id"] = payload.module_id
        if payload.tags is not None:
            update_doc["tags"] = payload.tags
        if payload.is_downloadable is not None:
            update_doc["is_downloadable"] = payload.is_downloadable
        
        # Update the material
        result = pdf_collection.update_one(
            {"_id": ObjectId(material_id)},
            {"$set": update_doc}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="No changes were made")
        
        # Return updated material
        updated_material = pdf_collection.find_one({"_id": ObjectId(material_id)})
        updated_material["id"] = str(updated_material["_id"])
        del updated_material["_id"]
        
        return {
            "success": True,
            "message": "PDF material updated successfully",
            "material": updated_material
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating PDF material: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update PDF material")

def delete_pdf_material(db, material_id: str, instructor_id: str) -> Dict[str, Any]:
    """Delete a PDF material (with ownership verification)"""
    try:
        pdf_collection = get_pdf_material_collection(db)
        
        # Verify material ownership before deletion
        existing_material = pdf_collection.find_one({
            "_id": ObjectId(material_id),
            "instructor_id": instructor_id
        })
        
        if not existing_material:
            raise HTTPException(
                status_code=404,
                detail="PDF material not found or you don't have permission to delete it"
            )
        
        # Delete the material
        result = pdf_collection.delete_one({
            "_id": ObjectId(material_id),
            "instructor_id": instructor_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=400, detail="Failed to delete PDF material")
        
        # TODO: Also delete the PDF file from storage if it exists
        if existing_material.get("file_url"):
            import os
            file_path = f"/www/wwwroot/Skill_wallah_edtech{existing_material['file_url']}"
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    logger.warning(f"Failed to delete PDF file: {str(e)}")
        
        return {
            "success": True,
            "message": "PDF material deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting PDF material: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete PDF material")

def update_pdf_material_file(db, material_id: str, file_url: str, file_name: str, file_size: int, instructor_id: str) -> Dict[str, Any]:
    """Update PDF material with file information (with ownership verification)"""
    try:
        pdf_collection = get_pdf_material_collection(db)
        
        # Verify material ownership
        existing_material = pdf_collection.find_one({
            "_id": ObjectId(material_id),
            "instructor_id": instructor_id
        })
        
        if not existing_material:
            raise HTTPException(
                status_code=404,
                detail="PDF material not found or you don't have permission to update it"
            )
        
        # Update with file information
        result = pdf_collection.update_one(
            {"_id": ObjectId(material_id)},
            {
                "$set": {
                    "file_url": file_url,
                    "file_name": file_name,
                    "file_size": file_size,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to update PDF material with file")
        
        return {
            "success": True,
            "message": "PDF material file updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating PDF material file: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update PDF material file")