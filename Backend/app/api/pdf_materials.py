from fastapi import APIRouter, Request, Depends, Query, UploadFile, File, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.schemas.pdf_material import PDFMaterialCreate, PDFMaterialUpdate, PDFMaterialResponse, PDFMaterialListResponse
from app.services.pdf_material_service import (
    create_pdf_material, get_pdf_materials_by_course, get_pdf_materials_by_module,
    update_pdf_material, delete_pdf_material, get_pdf_material_by_id, update_pdf_material_file
)
from app.utils.auth import verify_token, get_current_user
from typing import Optional
import aiofiles
import os
from datetime import datetime

pdf_material_router = APIRouter(prefix="/pdf-materials", tags=["PDF Materials"])
security = HTTPBearer()

async def get_current_instructor(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current instructor from JWT token"""
    try:
        payload = verify_token(credentials.credentials)
        return payload.get("sub")  # instructor ID
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

@pdf_material_router.post("/create")
async def create_pdf_material_endpoint(
    request: Request, 
    payload: PDFMaterialCreate,
    instructor_id: str = Depends(get_current_instructor)
):
    """Create a new PDF material for a specific course and module"""
    db = request.app.mongodb
    return create_pdf_material(db, payload, instructor_id)

@pdf_material_router.get("/course/{course_id}")
async def get_pdf_materials_by_course_endpoint(
    request: Request,
    course_id: str,
    module_id: Optional[str] = Query(None, description="Optional module ID to filter materials"),
    instructor_id: str = Depends(get_current_instructor)
):
    """Get all PDF materials for a specific course (and optionally module)"""
    db = request.app.mongodb
    return get_pdf_materials_by_course(db, course_id, instructor_id, module_id)

@pdf_material_router.get("/module/{module_id}")
async def get_pdf_materials_by_module_endpoint(
    request: Request,
    module_id: str,
    instructor_id: str = Depends(get_current_instructor)
):
    """Get all PDF materials for a specific module"""
    db = request.app.mongodb
    return get_pdf_materials_by_module(db, module_id, instructor_id)

@pdf_material_router.get("/{material_id}")
async def get_pdf_material_endpoint(
    request: Request,
    material_id: str,
    instructor_id: str = Depends(get_current_instructor)
):
    """Get a specific PDF material by ID"""
    db = request.app.mongodb
    return get_pdf_material_by_id(db, material_id, instructor_id)

@pdf_material_router.put("/{material_id}")
async def update_pdf_material_endpoint(
    request: Request,
    material_id: str,
    payload: PDFMaterialUpdate,
    instructor_id: str = Depends(get_current_instructor)
):
    """Update a PDF material"""
    db = request.app.mongodb
    return update_pdf_material(db, material_id, payload, instructor_id)

@pdf_material_router.delete("/{material_id}")
async def delete_pdf_material_endpoint(
    request: Request,
    material_id: str,
    instructor_id: str = Depends(get_current_instructor)
):
    """Delete a PDF material"""
    db = request.app.mongodb
    return delete_pdf_material(db, material_id, instructor_id)

@pdf_material_router.post("/{material_id}/upload-pdf")
async def upload_pdf_file(
    request: Request,
    material_id: str,
    file: UploadFile = File(...),
    instructor_id: str = Depends(get_current_instructor)
):
    """Upload PDF file for a material"""
    db = request.app.mongodb
    
    # Validate file type
    allowed_types = ['application/pdf']
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a PDF file"
        )
    
    # Validate file extension
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file extension. Only .pdf files are allowed"
        )
    
    # Validate file size (100MB max for PDFs)
    max_size = 100 * 1024 * 1024  # 100MB
    file_size = 0
    
    # Create uploads directory if it doesn't exist
    upload_dir = "/www/wwwroot/Skill_wallah_edtech/uploads/pdf_materials"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"pdf_material_{material_id}_{timestamp}{file_extension}"
    file_path = os.path.join(upload_dir, filename)
    
    try:
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            while chunk := await file.read(8192):  # Read in 8KB chunks
                file_size += len(chunk)
                if file_size > max_size:
                    # Remove partial file
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=400,
                        detail="File too large. Maximum size is 100MB"
                    )
                await f.write(chunk)
        
        # Generate URL for the uploaded file
        file_url = f"/uploads/pdf_materials/{filename}"
        
        # Update PDF material with file information
        result = update_pdf_material_file(db, material_id, file_url, file.filename, file_size, instructor_id)
        
        return {
            "success": True,
            "message": "PDF uploaded successfully",
            "file_url": file_url,
            "filename": filename,
            "file_size": file_size
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Clean up file if something went wrong
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# Endpoint to get instructor's PDF material statistics
@pdf_material_router.get("/stats/summary")
async def get_pdf_material_stats(
    request: Request,
    instructor_id: str = Depends(get_current_instructor)
):
    """Get PDF material statistics for the instructor"""
    from app.models.pdf_material import get_pdf_material_collection
    
    db = request.app.mongodb
    pdf_collection = get_pdf_material_collection(db)
    
    # Get total materials
    total_materials = pdf_collection.count_documents({"instructor_id": instructor_id})
    
    # Get materials with files
    materials_with_files = pdf_collection.count_documents({
        "instructor_id": instructor_id,
        "file_url": {"$ne": None, "$exists": True}
    })
    
    # Get materials by course
    pipeline = [
        {"$match": {"instructor_id": instructor_id}},
        {"$group": {
            "_id": "$course_id",
            "count": {"$sum": 1}
        }},
        {"$lookup": {
            "from": "courses",
            "localField": "_id",
            "foreignField": "_id",
            "as": "course"
        }},
        {"$unwind": "$course"},
        {"$project": {
            "course_id": "$_id",
            "course_title": "$course.title",
            "material_count": "$count"
        }}
    ]
    
    materials_by_course = list(pdf_collection.aggregate(pipeline))
    
    return {
        "total_materials": total_materials,
        "materials_with_files": materials_with_files,
        "materials_without_files": total_materials - materials_with_files,
        "materials_by_course": materials_by_course
    }

