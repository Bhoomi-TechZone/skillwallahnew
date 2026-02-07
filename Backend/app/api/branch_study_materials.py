from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import os
import shutil
from app.config import settings
from app.utils.auth_helpers_enhanced import get_current_user
from app.utils.multi_tenant import MultiTenantManager
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/branch-study-materials", tags=["Branch Study Material Management"])

# Study Material Models
class StudyMaterialCreate(BaseModel):
    material_name: str
    material_type: str = "document"  # document, video, audio, image, link
    program_id: Optional[str] = None
    course_id: Optional[str] = None
    subject_id: Optional[str] = None
    batch_id: Optional[str] = None
    description: Optional[str] = ""
    file_url: Optional[str] = None
    external_link: Optional[str] = None
    file_size: Optional[int] = None  # in bytes
    file_format: Optional[str] = None
    duration: Optional[str] = None  # for video/audio materials
    tags: Optional[str] = ""
    access_level: str = "public"  # public, restricted, premium
    status: str = "active"  # active, inactive, archived

class StudyMaterialUpdate(BaseModel):
    material_name: Optional[str] = None
    description: Optional[str] = None
    external_link: Optional[str] = None
    tags: Optional[str] = None
    access_level: Optional[str] = None
    status: Optional[str] = None

class StudyMaterialResponse(BaseModel):
    id: str
    material_name: str
    material_type: str
    program_id: Optional[str] = None
    program_name: Optional[str] = None
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    subject_id: Optional[str] = None
    subject_name: Optional[str] = None
    batch_id: Optional[str] = None
    batch_name: Optional[str] = None
    description: str
    file_url: Optional[str] = None
    external_link: Optional[str] = None
    file_size: Optional[int] = None
    file_format: Optional[str] = None
    duration: Optional[str] = None
    tags: str
    access_level: str
    download_count: int = 0
    view_count: int = 0
    status: str
    branch_code: str
    franchise_code: str
    created_at: str
    updated_at: str

@router.get("/debug/user-materials")
async def debug_user_materials(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Debug endpoint to check user's materials access"""
    try:
        db = request.app.mongodb
        
        # Check user info
        user_info = {
            "email": current_user.get("email"),
            "role": current_user.get("role"),
            "franchise_code": current_user.get("franchise_code"),
            "branch_code": current_user.get("branch_code"),
            "user_id": current_user.get("user_id"),
            "is_branch_admin": current_user.get("is_branch_admin")
        }
        
        # Check total materials in database
        total_materials = db.branch_study_materials.count_documents({})
        
        # Check materials by franchise_code
        franchise_materials = 0
        if current_user.get("franchise_code"):
            franchise_materials = db.branch_study_materials.count_documents({
                "franchise_code": current_user.get("franchise_code")
            })
        
        # Check materials by branch_code
        branch_materials = 0
        if current_user.get("franchise_code"):
            branch_materials = db.branch_study_materials.count_documents({
                "branch_code": current_user.get("franchise_code")
            })
        
        # Sample materials structure
        sample_materials = list(db.branch_study_materials.find({}, {
            "material_name": 1,
            "franchise_code": 1,
            "branch_code": 1,
            "created_by": 1,
            "material_type": 1
        }).limit(3))
        
        return {
            "user_info": user_info,
            "database_info": {
                "total_materials": total_materials,
                "franchise_materials": franchise_materials,
                "branch_materials": branch_materials
            },
            "sample_materials": [
                {
                    "id": str(m.get("_id")),
                    "name": m.get("material_name"),
                    "type": m.get("material_type"),
                    "franchise_code": m.get("franchise_code"),
                    "branch_code": m.get("branch_code"),
                    "created_by": m.get("created_by")
                } for m in sample_materials
            ]
        }
    except Exception as e:
        return {"error": str(e), "user": current_user}

@router.post("/materials", response_model=StudyMaterialResponse)
async def create_study_material(
    material_data: StudyMaterialCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a new study material for the branch - only franchise_admin and admin can create"""
    try:
        # Check if user has permission to create materials
        user_role = current_user.get("role")
        if user_role not in ["franchise_admin", "admin"]:
            raise HTTPException(
                status_code=403, 
                detail="Only franchise administrators and admins can create study materials"
            )
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Get related entity details
        program_name = None
        course_name = None
        subject_name = None
        batch_name = None
        
        if material_data.program_id:
            program = db.branch_programs.find_one({
                "_id": ObjectId(material_data.program_id),
                "franchise_code": context["franchise_code"]
            })
            if program:
                program_name = program.get("program_name")
        
        if material_data.course_id:
            course = db.branch_courses.find_one({
                "_id": ObjectId(material_data.course_id),
                "franchise_code": context["franchise_code"]
            })
            if course:
                course_name = course.get("course_name")
        
        if material_data.subject_id:
            subject = db.branch_subjects.find_one({
                "_id": ObjectId(material_data.subject_id),
                "franchise_code": context["franchise_code"]
            })
            if subject:
                subject_name = subject.get("subject_name")
        
        if material_data.batch_id:
            batch = db.branch_batches.find_one({
                "_id": ObjectId(material_data.batch_id),
                "franchise_code": context["franchise_code"]
            })
            if batch:
                batch_name = batch.get("batch_name")
        
        # Create study material document
        material_doc = {
            "_id": ObjectId(),
            "material_name": material_data.material_name,
            "material_type": material_data.material_type,
            "program_id": material_data.program_id,
            "program_name": program_name,
            "course_id": material_data.course_id,
            "course_name": course_name,
            "subject_id": material_data.subject_id,
            "subject_name": subject_name,
            "batch_id": material_data.batch_id,
            "batch_name": batch_name,
            "description": material_data.description or "",
            "file_url": material_data.file_url,
            "external_link": material_data.external_link,
            "file_size": material_data.file_size,
            "file_format": material_data.file_format,
            "duration": material_data.duration,
            "tags": material_data.tags or "",
            "access_level": material_data.access_level,
            "download_count": 0,
            "view_count": 0,
            "status": material_data.status,
            "franchise_code": context["franchise_code"],
            "branch_code": context["branch_code"],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "created_by": context["user_id"]
        }
        
        # Insert study material
        result = db.branch_study_materials.insert_one(material_doc)
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to create study material")
        
        # Return response
        return StudyMaterialResponse(
            id=str(result.inserted_id),
            material_name=material_data.material_name,
            material_type=material_data.material_type,
            program_id=material_data.program_id,
            program_name=program_name,
            course_id=material_data.course_id,
            course_name=course_name,
            subject_id=material_data.subject_id,
            subject_name=subject_name,
            batch_id=material_data.batch_id,
            batch_name=batch_name,
            description=material_data.description or "",
            file_url=material_data.file_url,
            external_link=material_data.external_link,
            file_size=material_data.file_size,
            file_format=material_data.file_format,
            duration=material_data.duration,
            tags=material_data.tags or "",
            access_level=material_data.access_level,
            download_count=0,
            view_count=0,
            status=material_data.status,
            branch_code=context["branch_code"],
            franchise_code=context["franchise_code"],
            created_at=material_doc["created_at"],
            updated_at=material_doc["updated_at"]
        )
        
    except Exception as e:
        print(f"Error creating study material: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/materials/upload")
async def upload_study_material(
    request: Request,
    file: UploadFile = File(...),
    material_name: str = Form(""),
    program_id: Optional[str] = Form(None),
    course_id: Optional[str] = Form(None),
    subject_id: Optional[str] = Form(None),
    description: Optional[str] = Form(""),
    tags: Optional[str] = Form(""),
    access_level: str = Form("public"),
    current_user: dict = Depends(get_current_user)
):
    """Upload a study material file"""
    try:
        # Convert empty strings to None for proper database handling
        program_id = program_id if program_id and program_id.strip() else None
        course_id = course_id if course_id and course_id.strip() else None
        subject_id = subject_id if subject_id and subject_id.strip() else None
        
        print(f"[UPLOAD] Received - material_name: {material_name}, program_id: {program_id}, course_id: {course_id}, subject_id: {subject_id}")
        
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Create upload directory for the branch
        upload_dir = f"uploads/study_materials/{context['franchise_code']}"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file info
        file_size = os.path.getsize(file_path)
        file_format = file_extension[1:] if file_extension else ""
        
        # Determine material type based on file extension
        material_type = "document"
        if file_format.lower() in ['mp4', 'avi', 'mov', 'wmv']:
            material_type = "video"
        elif file_format.lower() in ['mp3', 'wav', 'aac']:
            material_type = "audio"
        elif file_format.lower() in ['jpg', 'jpeg', 'png', 'gif']:
            material_type = "image"
        
        # Create study material record
        material_create = StudyMaterialCreate(
            material_name=material_name or file.filename,
            material_type=material_type,
            program_id=program_id,
            course_id=course_id,
            subject_id=subject_id,
            description=description or "",
            file_url=file_path,
            file_size=file_size,
            file_format=file_format,
            tags=tags or "",
            access_level=access_level,
            status="active"
        )
        
        return await create_study_material(material_create, request, current_user)
        
    except Exception as e:
        print(f"Error uploading study material: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/materials", response_model=List[StudyMaterialResponse])
async def get_study_materials(
    request: Request,
    program_id: Optional[str] = None,
    course_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    batch_id: Optional[str] = None,
    material_type: Optional[str] = None,
    access_level: Optional[str] = None,
    status: Optional[str] = None,
    branch_code: Optional[str] = None,
    franchise_code: Optional[str] = None
):
    """Get study materials - No authentication required for dashboard access"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        db = request.app.mongodb
        
        logger.info(f"[STUDY_MATERIALS] GET /materials called with branch_code={branch_code}, franchise_code={franchise_code}")
        
        # Build filter query using query params
        filter_query = {}
        
        # Filter by branch_code or franchise_code from query params
        if branch_code:
            filter_query["$or"] = [
                {"branch_code": branch_code},
                {"franchise_code": branch_code}
            ]
            logger.info(f"[STUDY_MATERIALS] Filtering by branch_code: {branch_code}")
        elif franchise_code:
            filter_query["franchise_code"] = franchise_code
            logger.info(f"[STUDY_MATERIALS] Filtering by franchise_code: {franchise_code}")
        
        # Exclude deleted materials by default
        filter_query["status"] = {"$ne": "deleted"}
        
        if program_id:
            filter_query["program_id"] = program_id
        if course_id:
            filter_query["course_id"] = course_id
        if subject_id:
            filter_query["subject_id"] = subject_id
        if batch_id:
            filter_query["batch_id"] = batch_id
        if material_type:
            filter_query["material_type"] = material_type
        if access_level:
            filter_query["access_level"] = access_level
        if status:
            filter_query["status"] = status
        
        logger.info(f"[STUDY_MATERIALS] Final query: {filter_query}")
        
        # Get study materials
        materials_cursor = db.branch_study_materials.find(filter_query)
        materials = []
        
        material_count = 0
        for material in materials_cursor:
            material_count += 1
            
            # Lookup program name if program_id exists
            program_name = material.get("program_name")
            if not program_name and material.get("program_id"):
                try:
                    program_id = material.get("program_id")
                    # Try ObjectId first, then string
                    try:
                        program_doc = db.branch_programs.find_one({"_id": ObjectId(program_id)})
                    except:
                        # If ObjectId fails, try string lookup
                        program_doc = db.branch_programs.find_one({"program_name": program_id})
                        if not program_doc:
                            # Try by program_id field
                            program_doc = db.branch_programs.find_one({"program_id": program_id})
                    
                    if program_doc:
                        program_name = program_doc.get("program_name")
                        print(f"[LOOKUP] Found program name: {program_name} for ID: {program_id}")
                    else:
                        print(f"[LOOKUP] No program found for ID: {program_id}")
                except Exception as e:
                    print(f"[LOOKUP] Error looking up program: {e}")
            
            # Lookup course name if course_id exists
            course_name = material.get("course_name") 
            if not course_name and material.get("course_id"):
                try:
                    course_id = material.get("course_id")
                    # Try ObjectId first, then string
                    try:
                        course_doc = db.branch_courses.find_one({"_id": ObjectId(course_id)})
                    except:
                        # If ObjectId fails, try string lookup
                        course_doc = db.branch_courses.find_one({"course_name": course_id})
                        if not course_doc:
                            # Try by course_id field
                            course_doc = db.branch_courses.find_one({"course_id": course_id})
                    
                    if course_doc:
                        course_name = course_doc.get("course_name")
                        print(f"[LOOKUP] Found course name: {course_name} for ID: {course_id}")
                    else:
                        print(f"[LOOKUP] No course found for ID: {course_id}")
                except Exception as e:
                    print(f"[LOOKUP] Error looking up course: {e}")
            
            # Lookup subject name if subject_id exists
            subject_name = material.get("subject_name")
            if not subject_name and material.get("subject_id"):
                try:
                    subject_id = material.get("subject_id")
                    # Try ObjectId first, then string
                    try:
                        subject_doc = db.branch_subjects.find_one({"_id": ObjectId(subject_id)})
                    except:
                        # If ObjectId fails, try string lookup
                        subject_doc = db.branch_subjects.find_one({"subject_name": subject_id})
                        if not subject_doc:
                            # Try by subject_id field
                            subject_doc = db.branch_subjects.find_one({"subject_id": subject_id})
                    
                    if subject_doc:
                        subject_name = subject_doc.get("subject_name")
                        print(f"[LOOKUP] Found subject name: {subject_name} for ID: {subject_id}")
                    else:
                        print(f"[LOOKUP] No subject found for ID: {subject_id}")
                except Exception as e:
                    print(f"[LOOKUP] Error looking up subject: {e}")
            
            print(f"[MATERIAL] {material.get('material_name')} -> Program: {program_name}, Course: {course_name}, Subject: {subject_name}")
            
            # Parse download_count and view_count properly (they may be stored as strings)
            try:
                download_count = int(material.get("download_count", 0) or 0)
            except (TypeError, ValueError):
                download_count = 0
            try:
                view_count = int(material.get("view_count", 0) or 0)
            except (TypeError, ValueError):
                view_count = 0
            
            # Parse file_size properly
            try:
                file_size = int(material.get("file_size") or 0) if material.get("file_size") else None
            except (TypeError, ValueError):
                file_size = None
            
            materials.append(StudyMaterialResponse(
                id=str(material["_id"]),
                material_name=material["material_name"],
                material_type=material["material_type"],
                program_id=material.get("program_id"),
                program_name=program_name,
                course_id=material.get("course_id"),
                course_name=course_name,
                subject_id=material.get("subject_id"),
                subject_name=subject_name,
                batch_id=material.get("batch_id") if material.get("batch_id") != "None" else None,
                batch_name=material.get("batch_name") if material.get("batch_name") != "None" else None,
                description=material.get("description", "") or "",
                file_url=material.get("file_url") if material.get("file_url") != "None" else None,
                external_link=material.get("external_link") if material.get("external_link") != "None" else None,
                file_size=file_size,
                file_format=material.get("file_format") if material.get("file_format") != "None" else None,
                duration=material.get("duration") if material.get("duration") != "None" else None,
                tags=material.get("tags", "") or "",
                access_level=material.get("access_level", "public") or "public",
                download_count=download_count,
                view_count=view_count,
                status=material.get("status", "active") or "active",
                branch_code=material.get("branch_code", "") or "",
                franchise_code=material.get("franchise_code", "") or "",
                created_at=str(material.get("created_at", "")),
                updated_at=str(material.get("updated_at", ""))
            ))
        
        logger.info(f"[STUDY_MATERIALS] Found {material_count} materials for branch_code={branch_code}, franchise_code={franchise_code}")
        return materials
        
    except Exception as e:
        print(f"Error fetching study materials: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/materials/{material_id}", response_model=StudyMaterialResponse)
async def get_study_material(
    material_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific study material by ID"""
    try:
        db = request.app.mongodb
        
        # Simplified approach - get user info directly
        user_role = current_user.get("role")
        user_franchise_code = current_user.get("franchise_code")
        
        print(f"[STUDY_MATERIAL_SINGLE] User: {current_user.get('email')} | Role: {user_role} | Material ID: {material_id}")
        print(f"[STUDY_MATERIAL_SINGLE] User franchise: {user_franchise_code}")
        
        if user_role in ["franchise_admin", "admin", "branch_admin"] or current_user.get("is_branch_admin"):
            if user_franchise_code:
                # Simple query for material access
                query = {
                    "_id": ObjectId(material_id),
                    "$or": [
                        {"franchise_code": user_franchise_code},
                        {"branch_code": user_franchise_code}
                    ]
                }
                print(f"[STUDY_MATERIAL_SINGLE] Using simple query: {query}")
            else:
                # Fallback: just check by ID
                query = {"_id": ObjectId(material_id)}
                print(f"[STUDY_MATERIAL_SINGLE] Using fallback query: {query}")
        else:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied for role: {user_role}"
            )
        
        # Find study material
        material = db.branch_study_materials.find_one(query)
        
        if not material:
            raise HTTPException(status_code=404, detail="Study material not found")
        
        # Increment view count
        db.branch_study_materials.update_one(
            {"_id": ObjectId(material_id)},
            {"$inc": {"view_count": 1}}
        )
        
        return StudyMaterialResponse(
            id=str(material["_id"]),
            material_name=material["material_name"],
            material_type=material["material_type"],
            program_id=material.get("program_id"),
            program_name=material.get("program_name"),
            course_id=material.get("course_id"),
            course_name=material.get("course_name"),
            subject_id=material.get("subject_id"),
            subject_name=material.get("subject_name"),
            batch_id=material.get("batch_id"),
            batch_name=material.get("batch_name"),
            description=material.get("description", ""),
            file_url=material.get("file_url"),
            external_link=material.get("external_link"),
            file_size=material.get("file_size"),
            file_format=material.get("file_format"),
            duration=material.get("duration"),
            tags=material.get("tags", ""),
            access_level=material["access_level"],
            download_count=material.get("download_count", 0),
            view_count=material.get("view_count", 0) + 1,
            status=material["status"],
            branch_code=material["branch_code"],
            franchise_code=material["franchise_code"],
            created_at=material["created_at"],
            updated_at=material["updated_at"]
        )
        
    except Exception as e:
        print(f"Error fetching study material: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/materials/{material_id}", response_model=StudyMaterialResponse)
async def update_study_material(
    material_id: str,
    material_data: StudyMaterialUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update a study material"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Find existing study material
        existing_material = db.branch_study_materials.find_one({
            "_id": ObjectId(material_id),
            "franchise_code": context["franchise_code"]
        })
        
        if not existing_material:
            raise HTTPException(status_code=404, detail="Study material not found")
        
        # Prepare update data
        update_data = {}
        for field, value in material_data.dict(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        update_data["updated_at"] = datetime.utcnow().isoformat()
        update_data["updated_by"] = context["user_id"]
        
        # Update study material
        result = db.branch_study_materials.update_one(
            {"_id": ObjectId(material_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update study material")
        
        # Get updated study material
        updated_material = db.branch_study_materials.find_one({"_id": ObjectId(material_id)})
        
        return StudyMaterialResponse(
            id=str(updated_material["_id"]),
            material_name=updated_material["material_name"],
            material_type=updated_material["material_type"],
            program_id=updated_material.get("program_id"),
            program_name=updated_material.get("program_name"),
            course_id=updated_material.get("course_id"),
            course_name=updated_material.get("course_name"),
            subject_id=updated_material.get("subject_id"),
            subject_name=updated_material.get("subject_name"),
            batch_id=updated_material.get("batch_id"),
            batch_name=updated_material.get("batch_name"),
            description=updated_material.get("description", ""),
            file_url=updated_material.get("file_url"),
            external_link=updated_material.get("external_link"),
            file_size=updated_material.get("file_size"),
            file_format=updated_material.get("file_format"),
            duration=updated_material.get("duration"),
            tags=updated_material.get("tags", ""),
            access_level=updated_material["access_level"],
            download_count=updated_material.get("download_count", 0),
            view_count=updated_material.get("view_count", 0),
            status=updated_material["status"],
            branch_code=updated_material["branch_code"],
            franchise_code=updated_material["franchise_code"],
            created_at=updated_material["created_at"],
            updated_at=updated_material["updated_at"]
        )
        
    except Exception as e:
        print(f"Error updating study material: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/materials/{material_id}")
async def delete_study_material(
    material_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete a study material - HARD DELETE"""
    try:
        db = request.app.mongodb
        
        print(f"[DELETE MATERIAL] Starting delete for material_id: {material_id}")
        
        # Find study material by ID only (no franchise filter for flexibility)
        material = db.branch_study_materials.find_one({"_id": ObjectId(material_id)})
        
        if material:
            print(f"[DELETE MATERIAL] Found material: {material.get('material_name')}")
            
            # Delete file if exists
            if material.get("file_url") and os.path.exists(material["file_url"]):
                try:
                    os.remove(material["file_url"])
                    print(f"[DELETE MATERIAL] Deleted file: {material['file_url']}")
                except Exception as e:
                    print(f"[DELETE MATERIAL] Error deleting file: {e}")
        else:
            print(f"[DELETE MATERIAL] Material not found, but will try to delete anyway")
        
        # Delete study material record - direct by ID
        result = db.branch_study_materials.delete_one({"_id": ObjectId(material_id)})
        
        print(f"[DELETE MATERIAL] Delete result - deleted_count: {result.deleted_count}")
        
        if result.deleted_count > 0:
            return {"success": True, "message": "Study material deleted successfully"}
        else:
            # Still return success for idempotent behavior
            return {"success": True, "message": "Study material already deleted or not found"}
        
    except Exception as e:
        print(f"[DELETE MATERIAL] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/materials/{material_id}/download")
async def download_study_material(
    material_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Track download of a study material"""
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get branch context
        context = multi_tenant.get_branch_context(current_user)
        
        # Find study material
        material = db.branch_study_materials.find_one({
            "_id": ObjectId(material_id),
            "franchise_code": context["franchise_code"]
        })
        
        if not material:
            raise HTTPException(status_code=404, detail="Study material not found")
        
        # Increment download count
        db.branch_study_materials.update_one(
            {"_id": ObjectId(material_id)},
            {"$inc": {"download_count": 1}}
        )
        
        return {"message": "Download tracked successfully", "file_url": material.get("file_url")}
        
    except Exception as e:
        print(f"Error tracking download: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files/{material_id}")
async def serve_file(
    material_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Serve study material files for download/preview"""
    try:
        db = request.app.mongodb
        
        # Check user role
        user_role = current_user.get("role")
        
        # Find study material based on role
        if user_role in ["super_admin", "superadmin"]:
            # Super admin can access any material
            material = db.branch_study_materials.find_one({
                "_id": ObjectId(material_id)
            })
        else:
            # Other users need tenant filtering
            multi_tenant = MultiTenantManager(db)
            
            # Get branch context
            context = multi_tenant.get_branch_context(current_user)
            
            # Find study material
            material = db.branch_study_materials.find_one({
                "_id": ObjectId(material_id),
                "franchise_code": context["franchise_code"]
            })
        
        if not material:
            raise HTTPException(status_code=404, detail="Study material not found")
        
        file_url = material.get("file_url")
        if not file_url or not os.path.exists(file_url):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Get file info
        filename = material.get("material_name", "download")
        file_format = material.get("file_format", "")
        
        # Set proper filename with extension
        if file_format and not filename.endswith(f".{file_format}"):
            filename = f"{filename}.{file_format}"
        
        # Determine content type
        content_type_map = {
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg', 
            'png': 'image/png',
            'gif': 'image/gif',
            'mp4': 'video/mp4',
            'mp3': 'audio/mpeg',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain'
        }
        
        media_type = content_type_map.get(file_format.lower(), 'application/octet-stream')
        
        # Increment download count (optional)
        db.branch_study_materials.update_one(
            {"_id": ObjectId(material_id)},
            {"$inc": {"download_count": 1}}
        )
        
        return FileResponse(
            path=file_url,
            filename=filename,
            media_type=media_type
        )
        
    except Exception as e:
        print(f"Error serving file: {e}")
        raise HTTPException(status_code=500, detail=str(e))