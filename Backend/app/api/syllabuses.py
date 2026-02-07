from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.config import settings
from app.utils.auth_helpers_enhanced import get_current_user
from pydantic import BaseModel, Field, validator
import os
import logging
from fastapi.responses import FileResponse

logger = logging.getLogger("uvicorn")

router = APIRouter(prefix="/api/syllabuses", tags=["Syllabus Management"])

# Syllabus Models
class SyllabusCreate(BaseModel):
    program_id: str
    course_id: str
    subject_id: str
    title: str
    description: Optional[str] = ""
    file_name: str
    file_path: str
    file_size: Optional[str] = ""
    
class SyllabusUpdate(BaseModel):
    program_id: Optional[str] = None
    course_id: Optional[str] = None
    subject_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[str] = None

class SyllabusResponse(BaseModel):
    id: str
    program_id: str
    program_name: str
    course_id: str
    course_name: str
    subject_id: str
    subject_name: str
    title: str
    description: str
    file_name: str
    file_url: str
    file_size: str
    uploaded_by: str
    uploaded_date: str
    created_at: datetime
    updated_at: datetime

# OPTIONS endpoints for CORS preflight
@router.options("/")
async def syllabuses_options():
    """Handle CORS preflight for syllabuses endpoint"""
    return {}

@router.get("/", response_model=dict)
async def get_syllabuses(
    request: Request,
    program_id: Optional[str] = None,
    course_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all syllabuses with optional filtering"""
    try:
        print(f"[SYLLABUSES] User access: {current_user}")
        
        # Get database from request
        db = request.app.mongodb
        
        # Use multi-tenant system for role-based access
        from app.utils.multi_tenant import MultiTenantManager
        multi_tenant = MultiTenantManager(db)
        
        try:
            # Get branch context based on user role and permissions
            context = multi_tenant.get_branch_context(current_user)
            print(f"[SYLLABUSES] Context: {context}")
        except Exception as e:
            print(f"[SYLLABUSES] Multi-tenant context error: {e}")
            # Fallback for admin users only - no super admin access
            if current_user.get("role") in ["admin", "franchise_admin"]:
                context = {
                    "franchise_code": current_user.get("franchise_code", "ADMIN_ACCESS"),
                    "branch_code": current_user.get("branch_code", "ADMIN_ACCESS"), 
                    "access_level": "FRANCHISE",
                    "role": current_user.get("role")
                }
            else:
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Direct database access
        collection = db.syllabuses
        
        # Build query with tenant filtering
        query = {
            "is_deleted": {"$ne": True}
        }
        
        # Apply tenant filtering based on user role and access level
        if context.get("access_level") == "GLOBAL":
            # Super admin can see all syllabuses - no additional filtering
            pass
        elif current_user.get("role") in ["branch_admin", "franchise_admin", "admin"] or current_user.get("is_branch_admin"):
            # Branch admins, franchise admins, and admin can see syllabuses from their franchise
            franchise_code = context.get("franchise_code")
            branch_code = context.get("branch_code")
            
            if franchise_code:
                # Create flexible query for admin access
                query["$or"] = [
                    {"franchise_code": franchise_code},  # Direct franchise match
                    {"branch_code": franchise_code},     # Legacy data where branch_code = franchise_code
                    {"branch_code": branch_code} if branch_code and branch_code != franchise_code else {"_id": ObjectId("000000000000000000000000")}  # Specific branch match
                ]
        else:
            # Apply standard tenant filtering for other roles
            tenant_filter = multi_tenant.create_tenant_filter(context)
            query.update(tenant_filter)
        
        # Add additional filters
        if program_id:
            query["program_id"] = program_id
        if course_id:
            query["course_id"] = course_id
        if subject_id:
            query["subject_id"] = subject_id
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"subject_name": {"$regex": search, "$options": "i"}},
                {"course_name": {"$regex": search, "$options": "i"}}
            ]
        
        print(f"[SYLLABUSES] Final query: {query}")
        
        syllabuses = list(collection.find(query).sort("created_at", -1))
        
        logger.info(f"[SYLLABUS] Found {len(syllabuses)} syllabuses")
        if syllabuses:
            logger.info(f"[SYLLABUS] Sample syllabus keys: {list(syllabuses[0].keys())}")
            logger.info(f"[SYLLABUS] Sample syllabus data: {syllabuses[0]}")
        
        # Convert ObjectId to string and format response
        for syllabus in syllabuses:
            syllabus["id"] = str(syllabus["_id"])
            del syllabus["_id"]
            
            # Add file URL
            syllabus["file_url"] = f"/uploads/syllabuses/{syllabus.get('file_name', '')}"
            
            # Format date
            if "created_at" in syllabus:
                syllabus["uploaded_date"] = syllabus["created_at"].strftime("%Y-%m-%d")
            
            # Log current state
            logger.info(f"[SYLLABUS] Processing: program_id={syllabus.get('program_id')}, program_name={syllabus.get('program_name')}")
            logger.info(f"[SYLLABUS] Processing: course_id={syllabus.get('course_id')}, course_name={syllabus.get('course_name')}")
            logger.info(f"[SYLLABUS] Processing: program_id={syllabus.get('program_id')}, program_name={syllabus.get('program_name')}")
            logger.info(f"[SYLLABUS] Processing: course_id={syllabus.get('course_id')}, course_name={syllabus.get('course_name')}")
            logger.info(f"[SYLLABUS] Processing: subject_id={syllabus.get('subject_id')}, subject_name={syllabus.get('subject_name')}")
                
            # Populate missing name fields for older syllabuses
            try:
                # Helper function to find document by ID (tries ObjectId and string)
                def find_by_id(collection, doc_id):
                    if not doc_id:
                        return None
                    # Try as ObjectId first
                    try:
                        result = collection.find_one({"_id": ObjectId(doc_id)})
                        if result:
                            return result
                    except Exception as e:
                        logger.debug(f"[SYLLABUS] ObjectId lookup failed: {e}")
                    # Try as string
                    try:
                        result = collection.find_one({"_id": doc_id})
                        if result:
                            return result
                    except Exception as e:
                        logger.debug(f"[SYLLABUS] String ID lookup failed: {e}")
                    return None
                
                # Try to get program name - check both branch_programs and programs collections
                if not syllabus.get('program_name') and syllabus.get('program_id'):
                    program_id = syllabus['program_id']
                    program = find_by_id(db.branch_programs, program_id)
                    if not program:
                        program = find_by_id(db.programs, program_id)
                    
                    if program:
                        syllabus['program_name'] = program.get('program_name') or program.get('name') or 'Unknown Program'
                        logger.info(f"[SYLLABUS] Found program: {syllabus['program_name']}")
                    else:
                        logger.warning(f"[SYLLABUS] Program not found for ID: {program_id}")
                        syllabus['program_name'] = 'Unknown Program'
                
                # Try to get course name - check both branch_courses and courses collections
                if not syllabus.get('course_name') and syllabus.get('course_id'):
                    course_id = syllabus['course_id']
                    course = find_by_id(db.branch_courses, course_id)
                    if not course:
                        course = find_by_id(db.courses, course_id)
                    
                    if course:
                        syllabus['course_name'] = course.get('course_name') or course.get('name') or 'Unknown Course'
                        logger.info(f"[SYLLABUS] Found course: {syllabus['course_name']}")
                    else:
                        logger.warning(f"[SYLLABUS] Course not found for ID: {course_id}")
                        syllabus['course_name'] = 'Unknown Course'
                
                # Try to get subject name - check both branch_subjects and subjects collections
                if not syllabus.get('subject_name') and syllabus.get('subject_id'):
                    subject_id = syllabus['subject_id']
                    subject = find_by_id(db.branch_subjects, subject_id)
                    if not subject:
                        subject = find_by_id(db.subjects, subject_id)
                    
                    if subject:
                        syllabus['subject_name'] = subject.get('subject_name') or subject.get('name') or 'Unknown Subject'
                        logger.info(f"[SYLLABUS] Found subject: {syllabus['subject_name']}")
                    else:
                        logger.warning(f"[SYLLABUS] Subject not found for ID: {subject_id}")
                        syllabus['subject_name'] = 'Unknown Subject'
                        
            except Exception as e:
                logger.warning(f"[SYLLABUS] Failed to populate names for syllabus {syllabus.get('id')}: {e}")
            
            # Ensure all name fields have values (fallback to empty values won't break UI)
            if not syllabus.get('program_name'):
                syllabus['program_name'] = syllabus.get('program', 'N/A')
            if not syllabus.get('course_name'):
                syllabus['course_name'] = syllabus.get('course', 'N/A')
            if not syllabus.get('subject_name'):
                syllabus['subject_name'] = syllabus.get('subject', 'N/A')
        
        return {
            "status": "success",
            "syllabuses": syllabuses,
            "total": len(syllabuses)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching syllabuses: {str(e)}")

@router.get("/{syllabus_id}", response_model=dict)
async def get_syllabus(
    syllabus_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get syllabus details by ID"""
    try:
        print(f"[SYLLABUSES] Get single syllabus: {syllabus_id}")
        
        # Get database from request
        db = request.app.mongodb
        
        # Use multi-tenant system for role-based access
        from app.utils.multi_tenant import MultiTenantManager
        multi_tenant = MultiTenantManager(db)
        
        try:
            context = multi_tenant.get_branch_context(current_user)
            print(f"[SYLLABUSES] Context: {context}")
        except Exception as e:
            print(f"[SYLLABUSES] Multi-tenant context error: {e}")
            # Fallback for admin users
            if current_user.get("role") == "super_admin":
                context = {
                    "access_level": "GLOBAL",
                    "role": current_user.get("role")
                }
            else:
                raise HTTPException(status_code=403, detail="Access denied")
        
        collection = db.syllabuses
        
        # Build query with tenant filtering
        query = {
            "_id": ObjectId(syllabus_id),
            "is_deleted": {"$ne": True}
        }
        
        # Apply tenant filtering based on access level and role
        if context.get("access_level") == "GLOBAL":
            # Super admin can access any syllabus - no additional filtering
            pass
        elif current_user.get("role") in ["branch_admin", "franchise_admin", "admin"] or current_user.get("is_branch_admin"):
            # Branch admins, franchise admins, and admin can access syllabuses from their franchise
            franchise_code = context.get("franchise_code")
            branch_code = context.get("branch_code")
            
            if franchise_code:
                # Create flexible query for admin access - add $and to combine with the _id filter
                query["$and"] = [
                    {"_id": ObjectId(syllabus_id), "is_deleted": {"$ne": True}},  # Original query
                    {"$or": [
                        {"franchise_code": franchise_code},  # Direct franchise match
                        {"branch_code": franchise_code},     # Legacy data where branch_code = franchise_code
                        {"branch_code": branch_code} if branch_code and branch_code != franchise_code else {"_id": ObjectId("000000000000000000000000")}  # Specific branch match
                    ]}
                ]
                # Remove the duplicate conditions
                del query["_id"]
                del query["is_deleted"]
        else:
            # Apply standard tenant filtering for other roles
            tenant_filter = multi_tenant.create_tenant_filter(context)
            query.update(tenant_filter)
        
        print(f"[SYLLABUSES] Single syllabus query: {query}")
        
        syllabus = collection.find_one(query)
        
        if not syllabus:
            raise HTTPException(status_code=404, detail="Syllabus not found")
        
        # Convert ObjectId to string and format response
        syllabus["id"] = str(syllabus["_id"])
        del syllabus["_id"]
        
        # Add file URL
        syllabus["file_url"] = f"/uploads/syllabuses/{syllabus.get('file_name', '')}"
        
        # Format date
        if "created_at" in syllabus:
            syllabus["uploaded_date"] = syllabus["created_at"].strftime("%Y-%m-%d")
        
        # Helper function to find document by ID (tries ObjectId and string)
        def find_by_id(collection, doc_id):
            if not doc_id:
                return None
            # Try as ObjectId first
            try:
                result = collection.find_one({"_id": ObjectId(doc_id)})
                if result:
                    return result
            except Exception:
                pass
            # Try as string
            try:
                result = collection.find_one({"_id": doc_id})
                if result:
                    return result
            except Exception:
                pass
            return None
        
        # Populate missing name fields
        if not syllabus.get('program_name') and syllabus.get('program_id'):
            program = find_by_id(db.branch_programs, syllabus['program_id'])
            if not program:
                program = find_by_id(db.programs, syllabus['program_id'])
            if program:
                syllabus['program_name'] = program.get('program_name') or program.get('name') or 'Unknown Program'
        
        if not syllabus.get('course_name') and syllabus.get('course_id'):
            course = find_by_id(db.branch_courses, syllabus['course_id'])
            if not course:
                course = find_by_id(db.courses, syllabus['course_id'])
            if course:
                syllabus['course_name'] = course.get('course_name') or course.get('name') or 'Unknown Course'
        
        if not syllabus.get('subject_name') and syllabus.get('subject_id'):
            subject = find_by_id(db.branch_subjects, syllabus['subject_id'])
            if not subject:
                subject = find_by_id(db.subjects, syllabus['subject_id'])
            if subject:
                syllabus['subject_name'] = subject.get('subject_name') or subject.get('name') or 'Unknown Subject'
        
        # Ensure all fields have values
        syllabus.setdefault('program_name', 'N/A')
        syllabus.setdefault('course_name', 'N/A')
        syllabus.setdefault('subject_name', 'N/A')
        syllabus.setdefault('title', 'N/A')
        syllabus.setdefault('description', '')
        syllabus.setdefault('file_name', 'N/A')
        syllabus.setdefault('file_size', 'N/A')
        syllabus.setdefault('uploaded_by', 'N/A')
        syllabus.setdefault('uploaded_date', 'N/A')
        
        return {
            "status": "success",
            "syllabus": syllabus
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching syllabus: {str(e)}")

@router.get("/{syllabus_id}/download")
async def download_syllabus(
    syllabus_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Download syllabus file"""
    try:
        logger.info(f"📥 Download request for syllabus ID: {syllabus_id}")
        db = request.app.mongodb
        collection = db.syllabuses
        
        # Find syllabus
        syllabus = collection.find_one({
            "_id": ObjectId(syllabus_id),
            "is_deleted": {"$ne": True}
        })
        
        if not syllabus:
            logger.error(f"❌ Syllabus not found with ID: {syllabus_id}")
            raise HTTPException(status_code=404, detail="Syllabus not found")
        
        logger.info(f"✅ Found syllabus: {syllabus.get('title', 'N/A')}")
        
        # Try multiple file path strategies
        file_name = syllabus.get("file_name", "")
        if not file_name:
            logger.error("❌ No file name found in syllabus record")
            raise HTTPException(status_code=404, detail="File name not found in syllabus record")
        
        # Strategy 1: Check stored file_path if exists
        stored_path = syllabus.get("file_path", "")
        if stored_path and os.path.exists(stored_path):
            logger.info(f"✅ Using stored file path: {stored_path}")
            return FileResponse(
                path=stored_path,
                filename=file_name,
                media_type='application/octet-stream'
            )
        
        # Strategy 2: Check uploads/syllabuses directory
        uploads_path = os.path.join(settings.UPLOAD_DIR, "syllabuses", file_name)
        if os.path.exists(uploads_path):
            logger.info(f"✅ Using uploads directory path: {uploads_path}")
            return FileResponse(
                path=uploads_path,
                filename=file_name,
                media_type='application/octet-stream'
            )
        
        # Strategy 3: Check root uploads directory
        root_uploads_path = os.path.join("uploads", "syllabuses", file_name)
        if os.path.exists(root_uploads_path):
            logger.info(f"✅ Using root uploads path: {root_uploads_path}")
            return FileResponse(
                path=root_uploads_path,
                filename=file_name,
                media_type='application/octet-stream'
            )
        
        # Log all attempted paths for debugging
        logger.error(f"❌ File not found. Attempted paths:")
        logger.error(f"   - Stored path: {stored_path}")
        logger.error(f"   - Uploads path: {uploads_path}")
        logger.error(f"   - Root uploads path: {root_uploads_path}")
        logger.error(f"   - File name: {file_name}")
        logger.error(f"   - Current working directory: {os.getcwd()}")
        logger.error(f"   - UPLOAD_DIR setting: {settings.UPLOAD_DIR}")
        
        # List available files for debugging
        try:
            syllabuses_dir = os.path.join("uploads", "syllabuses")
            if os.path.exists(syllabuses_dir):
                available_files = os.listdir(syllabuses_dir)
                logger.error(f"   - Available files in uploads/syllabuses: {available_files}")
            else:
                logger.error(f"   - uploads/syllabuses directory does not exist")
        except Exception as list_error:
            logger.error(f"   - Error listing files: {list_error}")
        
        raise HTTPException(status_code=404, detail=f"Syllabus file '{file_name}' not found on server")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error downloading syllabus: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error downloading syllabus: {str(e)}")

@router.post("/", response_model=dict)
async def create_syllabus(
    syllabus_data: SyllabusCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create new syllabus - only franchise_admin and admin can create"""
    try:
        # Check if user has permission to create syllabuses
        user_role = current_user.get("role")
        if user_role not in ["franchise_admin", "admin"]:
            raise HTTPException(
                status_code=403,
                detail="Only franchise administrators and admins can create syllabuses"
            )
        logger.info(f"[SYLLABUS] Create request started for user: {current_user.get('name')}")
        logger.info(f"[SYLLABUS] Current user data: {current_user}")
        
        # Get branch_code from headers
        branch_code = request.headers.get("X-Branch-Code")
        if not branch_code:
            branch_code = current_user.get("branch_code")
            
        logger.info(f"[SYLLABUS] Branch code from header: {request.headers.get('X-Branch-Code')}")
        logger.info(f"[SYLLABUS] Branch code from user: {current_user.get('branch_code')}")
        logger.info(f"[SYLLABUS] Final branch_code: {branch_code}")
        
        # For admin users, if no branch_code is provided, allow them to proceed without branch restriction
        if not branch_code and current_user.get("role") == "super_admin":
            logger.info(f"[SYLLABUS] Super admin user detected, proceeding without branch restriction")
            branch_code = None  # Super admin can access all branches
        elif not branch_code:
            logger.error(f"[SYLLABUS] No branch code available for non-admin user")
            raise HTTPException(status_code=400, detail="Branch code is required")
        
        db = request.app.mongodb
        logger.info(f"[SYLLABUS] Database connection obtained: {type(db)}")
        
        # Direct database access instead of MultiTenantManager
        collection = db.syllabuses
        logger.info(f"[SYLLABUS] Collection obtained: {type(collection)}")
        
        # Get other collections directly
        programs_collection = db.branch_programs
        courses_collection = db.branch_courses
        subjects_collection = db.branch_subjects
        
        logger.info(f"[SYLLABUS] Looking for program_id: {syllabus_data.program_id}")
        # For admin users, don't filter by branch_code
        if branch_code:
            program = programs_collection.find_one({"_id": ObjectId(syllabus_data.program_id), "branch_code": branch_code})
            course = courses_collection.find_one({"_id": ObjectId(syllabus_data.course_id), "branch_code": branch_code})
            subject = subjects_collection.find_one({"_id": ObjectId(syllabus_data.subject_id), "branch_code": branch_code})
        else:
            # Admin can access all branches
            program = programs_collection.find_one({"_id": ObjectId(syllabus_data.program_id)})
            course = courses_collection.find_one({"_id": ObjectId(syllabus_data.course_id)})
            subject = subjects_collection.find_one({"_id": ObjectId(syllabus_data.subject_id)})
            
        logger.info(f"[SYLLABUS] Program found: {bool(program)}")
        
        logger.info(f"[SYLLABUS] Looking for course_id: {syllabus_data.course_id}")
        logger.info(f"[SYLLABUS] Course found: {bool(course)}")
        
        logger.info(f"[SYLLABUS] Looking for subject_id: {syllabus_data.subject_id}")
        logger.info(f"[SYLLABUS] Subject found: {bool(subject)}")
        
        syllabus_doc = {
            "program_id": syllabus_data.program_id,
            "program_name": program.get("program_name", "") if program else "",
            "course_id": syllabus_data.course_id,
            "course_name": course.get("course_name", "") if course else "",
            "subject_id": syllabus_data.subject_id,
            "subject_name": subject.get("subject_name", "") if subject else "",
            "title": syllabus_data.title,
            "description": syllabus_data.description,
            "file_name": syllabus_data.file_name,
            "file_path": syllabus_data.file_path,
            "file_size": syllabus_data.file_size,
            "uploaded_by": current_user.get("name", "Unknown"),
            "uploaded_by_id": current_user.get("user_id"),
            "franchise_code": current_user.get("franchise_code"),  # Add franchise_code for tenant filtering
            "branch_code": branch_code or program.get("branch_code") if program else current_user.get("franchise_code"),  # Use branch_code or fallback to franchise_code
            "is_deleted": False,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        result = collection.insert_one(syllabus_doc)
        
        return {
            "status": "success",
            "message": "Syllabus created successfully",
            "syllabus_id": str(result.inserted_id)
        }
        
    except Exception as e:
        logger.error(f"[SYLLABUS] Error creating syllabus: {str(e)}")
        logger.error(f"[SYLLABUS] Exception type: {type(e)}")
        import traceback
        logger.error(f"[SYLLABUS] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error creating syllabus: {str(e)}")

@router.put("/{syllabus_id}", response_model=dict)
async def update_syllabus(
    syllabus_id: str,
    syllabus_data: SyllabusUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update syllabus"""
    try:
        db = request.app.mongodb
        collection = db.syllabuses
        
        # Check if syllabus exists
        existing_syllabus = collection.find_one({
            "_id": ObjectId(syllabus_id),
            "is_deleted": {"$ne": True}
        })
        
        if not existing_syllabus:
            raise HTTPException(status_code=404, detail="Syllabus not found")
        
        # Build update data
        update_data = {}
        
        if syllabus_data.program_id:
            program = db.programs.find_one({"_id": ObjectId(syllabus_data.program_id)})
            update_data["program_id"] = syllabus_data.program_id
            update_data["program_name"] = program.get("name", "") if program else ""
            
        if syllabus_data.course_id:
            course = db.courses.find_one({"_id": ObjectId(syllabus_data.course_id)})
            update_data["course_id"] = syllabus_data.course_id
            update_data["course_name"] = course.get("course_name", "") if course else ""
            
        if syllabus_data.subject_id:
            subject = db.subjects.find_one({"_id": ObjectId(syllabus_data.subject_id)})
            update_data["subject_id"] = syllabus_data.subject_id
            update_data["subject_name"] = subject.get("name", "") if subject else ""
        
        if syllabus_data.title:
            update_data["title"] = syllabus_data.title
        if syllabus_data.description is not None:
            update_data["description"] = syllabus_data.description
        if syllabus_data.file_name:
            update_data["file_name"] = syllabus_data.file_name
        if syllabus_data.file_path:
            update_data["file_path"] = syllabus_data.file_path
        if syllabus_data.file_size:
            update_data["file_size"] = syllabus_data.file_size
            
        update_data["updated_at"] = datetime.now()
        
        collection.update_one(
            {"_id": ObjectId(syllabus_id)},
            {"$set": update_data}
        )
        
        return {
            "status": "success",
            "message": "Syllabus updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating syllabus: {str(e)}")

@router.delete("/{syllabus_id}", response_model=dict)
async def delete_syllabus(
    syllabus_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete syllabus (soft delete)"""
    try:
        db = request.app.mongodb
        collection = db.syllabuses
        
        # Check if syllabus exists
        existing_syllabus = collection.find_one({
            "_id": ObjectId(syllabus_id),
            "is_deleted": {"$ne": True}
        })
        
        if not existing_syllabus:
            raise HTTPException(status_code=404, detail="Syllabus not found")
        
        # Soft delete
        collection.update_one(
            {"_id": ObjectId(syllabus_id)},
            {"$set": {
                "is_deleted": True,
                "deleted_at": datetime.now(),
                "deleted_by": current_user.get("user_id")
            }}
        )
        
        return {
            "status": "success",
            "message": "Syllabus deleted successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting syllabus: {str(e)}")

# OPTIONS endpoint for CORS preflight
@router.options("/upload")
async def upload_options():
    """Handle CORS preflight for upload endpoint"""
    return {}

@router.post("/upload", response_model=dict)
async def upload_syllabus_file(
    file: UploadFile = File(...),
    request: Request = None,
    current_user: dict = Depends(get_current_user)
):
    """Upload syllabus file"""
    try:
        # Validate file type
        allowed_extensions = ['.pdf', '.doc', '.docx', '.txt']
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        # Create upload directory if it doesn't exist
        upload_dir = os.path.join(settings.UPLOAD_DIR, "syllabuses")
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_name = f"{timestamp}_{file.filename}"
        file_path = os.path.join(upload_dir, file_name)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Get file size
        file_size = f"{len(content) / (1024 * 1024):.2f} MB"
        
        return {
            "status": "success",
            "message": "File uploaded successfully",
            "file_name": file_name,
            "file_path": f"syllabuses/{file_name}",
            "file_size": file_size,
            "original_name": file.filename
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

# Additional endpoints for programs, courses, and subjects

@router.get("/programs", response_model=dict)
async def get_programs(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get all programs"""
    try:
        print(f"[SYLLABUSES] Get programs request")
        
        db = request.app.mongodb
        
        # Use multi-tenant system for role-based access
        from app.utils.multi_tenant import MultiTenantManager
        multi_tenant = MultiTenantManager(db)
        
        try:
            context = multi_tenant.get_branch_context(current_user)
            print(f"[SYLLABUSES] Programs context: {context}")
        except Exception as e:
            print(f"[SYLLABUSES] Multi-tenant context error: {e}")
            # Fallback for admin users
            if current_user.get("role") == "super_admin":
                context = {"access_level": "GLOBAL"}
            else:
                raise HTTPException(status_code=403, detail="Access denied")
        
        collection = db.programs
        
        # Build query with tenant filtering
        query = {"is_deleted": {"$ne": True}}
        
        # Apply tenant filtering for non-global access
        if context.get("access_level") != "GLOBAL":
            tenant_filter = multi_tenant.create_tenant_filter(context)
            query.update(tenant_filter)
        
        print(f"[SYLLABUSES] Programs query: {query}")
        
        programs = list(collection.find(query))
        
        for program in programs:
            program["id"] = str(program["_id"])
            del program["_id"]
        
        print(f"[SYLLABUSES] Found {len(programs)} programs")
        
        return {
            "status": "success",
            "programs": programs
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching programs: {str(e)}")

@router.get("/programs/{program_id}/courses", response_model=dict)
async def get_courses_by_program(
    program_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get courses by program ID"""
    try:
        db = request.app.mongodb
        collection = db.courses
        
        courses = list(collection.find({
            "program_id": program_id,
            "is_deleted": {"$ne": True}
        }))
        
        for course in courses:
            course["id"] = str(course["_id"])
            del course["_id"]
        
        return {
            "status": "success",
            "courses": courses
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching courses: {str(e)}")

@router.get("/courses/{course_id}/subjects", response_model=dict)
async def get_subjects_by_course(
    course_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get subjects by course ID"""
    try:
        db = request.app.mongodb
        collection = db.subjects
        
        subjects = list(collection.find({
            "course_id": course_id,
            "is_deleted": {"$ne": True}
        }))
        
        for subject in subjects:
            subject["id"] = str(subject["_id"])
            del subject["_id"]
        
        return {
            "status": "success",
            "subjects": subjects
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching subjects: {str(e)}")
