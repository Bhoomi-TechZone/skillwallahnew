from fastapi import APIRouter, HTTPException, Depends, Request
from bson import ObjectId
from datetime import datetime
from typing import Optional, List
import logging
from app.config import settings
from app.utils.auth_helpers import get_current_user
from app.utils.multi_tenant import MultiTenantManager

router = APIRouter(prefix="/api/branch-paper-sets", tags=["Branch Paper Sets"])
logger = logging.getLogger("uvicorn")

# Pydantic models for paper sets
from pydantic import BaseModel

class PaperSetCreate(BaseModel):
    courseCategory: str
    courseId: str
    courseName: str
    paperName: str
    numberOfQuestions: int
    perQuestionMark: int
    minusMarking: float
    timeLimit: int
    availableFrom: str
    availableTo: str
    memberType: str
    status: str
    branchCode: Optional[str] = None
    franchiseCode: Optional[str] = None
    created_by: Optional[str] = "Admin"

class PaperSetUpdate(BaseModel):
    courseCategory: Optional[str] = None
    courseId: Optional[str] = None
    courseName: Optional[str] = None
    paperName: Optional[str] = None
    numberOfQuestions: Optional[int] = None
    perQuestionMark: Optional[int] = None
    minusMarking: Optional[float] = None
    timeLimit: Optional[int] = None
    availableFrom: Optional[str] = None
    availableTo: Optional[str] = None
    memberType: Optional[str] = None
    status: Optional[str] = None

@router.get("/paper-sets")
async def get_paper_sets(
    request: Request, 
    courseId: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Get all paper sets for the current branch, optionally filtered by course"""
    try:
        logger.info(f"📋 [PAPER SETS API] Getting paper sets for user: {current_user.get('name')}")
        
        # Connect to database
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get proper branch context
        context = multi_tenant.get_branch_context(current_user)
        branch_code = context["branch_code"]
        franchise_code = context["franchise_code"]
        user_role = current_user.get("role")
        user_franchise_code = current_user.get("franchise_code")
        access_level = context.get("access_level", "BRANCH")
        
        logger.info(f"📋 [PAPER SETS API] User: {current_user.get('email')} | Role: {user_role} | Franchise: {user_franchise_code} | CourseId: {courseId}")
        
        # Build filter query based on role and access level
        if access_level == "GLOBAL":
            # Super admin sees all paper sets
            query = {}
            logger.info(f"📋 [PAPER SETS API] Super admin access - showing all paper sets")
        elif user_role in ["franchise_admin", "admin", "branch_admin"] or current_user.get("is_branch_admin"):
            if user_franchise_code:
                # Show paper sets from their franchise using multiple field matches
                query = {
                    "$or": [
                        {"franchiseCode": user_franchise_code},  # Direct match
                        {"branchCode": user_franchise_code},     # Legacy data
                        {"branchCode": branch_code},            # Current branch
                        {"franchiseCode": franchise_code}        # Current franchise
                    ]
                }
                logger.info(f"📋 [PAPER SETS API] Using franchise filter for {user_role}: {query}")
            else:
                # If no franchise code, show paper sets for current branch
                query = {"branchCode": branch_code}
                logger.info(f"📋 [PAPER SETS API] Using branch filter: {query}")
        elif user_role == "student" or current_user.get("is_branch_student"):
            # Students can see active paper sets from their branch (branch_code is primary)
            student_branch_code = current_user.get("branch_code") or user_franchise_code
            student_franchise_code = user_franchise_code or current_user.get("branch_code")
            
            logger.info(f"📋 [PAPER SETS API] Student access - branch_code: {student_branch_code}, franchise_code: {student_franchise_code}")
            
            if student_branch_code:
                query = {
                    "$or": [
                        {"branchCode": student_branch_code},  # Primary match
                        {"franchiseCode": student_branch_code},  # Fallback
                        {"branchCode": branch_code},
                        {"franchiseCode": student_franchise_code}
                    ],
                    "status": "active"  # Only show active paper sets to students
                }
                logger.info(f"📋 [PAPER SETS API] Student filter: {query}")
            else:
                # Fallback - show all active paper sets
                query = {"status": "active"}
                logger.info(f"📋 [PAPER SETS API] Student with no branch info - showing all active paper sets")
        else:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied for role: {user_role}"
            )
        
        # Add course filter if provided
        if courseId:
            query["courseId"] = courseId
            logger.info(f"📋 [PAPER SETS API] Added courseId filter: {courseId}")
        
        # Get paper sets from database
        paper_sets_collection = db.branch_paper_sets
        paper_sets_cursor = paper_sets_collection.find(query)
        paper_sets = []
        
        for paper_set in paper_sets_cursor:
            # Convert ObjectId to string
            paper_set["id"] = str(paper_set["_id"])
            del paper_set["_id"]
            paper_sets.append(paper_set)
        
        logger.info(f"📋 [PAPER SETS API] Found {len(paper_sets)} paper sets")
        
        return {
            "success": True,
            "data": paper_sets,
            "count": len(paper_sets)
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"📋 [PAPER SETS API] Error getting paper sets: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get paper sets: {str(e)}")

@router.post("/paper-sets")
async def create_paper_set(paper_set_data: PaperSetCreate, request: Request, current_user = Depends(get_current_user)):
    """Create a new paper set"""
    try:
        logger.info(f"📝 [PAPER SETS API] Creating paper set: {paper_set_data.paperName}")
        logger.info(f"📝 [PAPER SETS API] Received data: {paper_set_data}")
        
        # Connect to database
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get proper branch context (branch_code from branches collection)
        context = multi_tenant.get_branch_context(current_user)
        branch_code = context["branch_code"]
        franchise_code = context["franchise_code"]
            
        logger.info(f"📝 [PAPER SETS API] Using branch_code: {branch_code}, franchise_code: {franchise_code}")
        
        # Override branchCode and franchiseCode with proper values
        paper_set_data.branchCode = branch_code
        paper_set_data.franchiseCode = franchise_code
        
        # Prepare document for insertion
        paper_set_doc = {
            **paper_set_data.dict(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": current_user.get('name') or current_user.get('email') or 'Admin'
        }
        
        logger.info(f"📝 [PAPER SETS API] Paper set document: {paper_set_doc}")
        
        # Insert paper set
        paper_sets_collection = db.branch_paper_sets
        result = paper_sets_collection.insert_one(paper_set_doc)
        
        if result.inserted_id:
            # Return the created paper set
            created_paper_set = paper_sets_collection.find_one({"_id": result.inserted_id})
            created_paper_set["id"] = str(created_paper_set["_id"])
            del created_paper_set["_id"]
            
            logger.info(f"✅ [PAPER SETS API] Paper set created successfully with ID: {result.inserted_id}")
            
            return {
                "success": True,
                "message": "Paper set created successfully",
                "data": created_paper_set
            }
        else:
            logger.error("📝 [PAPER SETS API] Failed to create paper set - no ID returned")
            raise HTTPException(status_code=500, detail="Failed to create paper set")
            
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"📝 [PAPER SETS API] Error creating paper set: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create paper set: {str(e)}")

@router.put("/paper-sets/{paper_set_id}")
async def update_paper_set(paper_set_id: str, paper_set_data: PaperSetUpdate, request: Request, current_user = Depends(get_current_user)):
    """Update an existing paper set"""
    try:
        logger.info(f"📝 [PAPER SETS API] Updating paper set: {paper_set_id}")
        
        # Validate paper set ID
        try:
            paper_set_obj_id = ObjectId(paper_set_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid paper set ID")
        
        # Connect to database
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get proper branch context (branch_code from branches collection)
        context = multi_tenant.get_branch_context(current_user)
        branch_code = context["branch_code"]
        paper_sets_collection = db.branch_paper_sets
        
        # Check if paper set exists - be more flexible with branch matching
        existing_paper_set = paper_sets_collection.find_one({"_id": paper_set_obj_id})
        
        if not existing_paper_set:
            raise HTTPException(status_code=404, detail="Paper set not found")
        
        # Log paper set details for debugging
        logger.info(f"📝 [PAPER SETS API] Found paper set with branchCode: {existing_paper_set.get('branchCode')}")
        logger.info(f"📝 [PAPER SETS API] Current user branch_code: {branch_code}")
        
        # Verify access - allow update if:
        # 1. Paper set belongs to current branch, OR
        # 2. User is branch admin/franchise admin (more permissive access)
        user_role = current_user.get("role", "")
        user_franchise_code = current_user.get("franchise_code", "")
        is_admin = user_role in ["admin", "branch_admin", "franchise_admin"] or current_user.get("is_branch_admin")
        
        # Check access permissions
        paper_set_branch = existing_paper_set.get("branchCode", "")
        paper_set_franchise = existing_paper_set.get("franchiseCode", "")
        
        has_access = (
            paper_set_branch == branch_code or  # Exact branch match
            paper_set_branch == user_franchise_code or  # Branch stored as franchise
            paper_set_franchise == user_franchise_code or  # Franchise match
            is_admin  # Admin override
        )
        
        if not has_access:
            logger.warning(f"📝 [PAPER SETS API] Access denied - Paper set: {paper_set_branch}/{paper_set_franchise}, User: {branch_code}/{user_franchise_code}")
            raise HTTPException(status_code=403, detail="Access denied to this paper set")
        
        # Prepare update data
        update_data = {k: v for k, v in paper_set_data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        logger.info(f"📝 [PAPER SETS API] Update data: {update_data}")
        
        # Update paper set
        result = paper_sets_collection.update_one(
            {"_id": paper_set_obj_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            # Return the updated paper set
            updated_paper_set = paper_sets_collection.find_one({"_id": paper_set_obj_id})
            updated_paper_set["id"] = str(updated_paper_set["_id"])
            del updated_paper_set["_id"]
            
            logger.info(f"✅ [PAPER SETS API] Paper set updated successfully")
            
            return {
                "success": True,
                "message": "Paper set updated successfully",
                "data": updated_paper_set
            }
        else:
            logger.info("📝 [PAPER SETS API] No changes made to paper set")
            return {
                "success": True,
                "message": "No changes made",
                "data": existing_paper_set
            }
            
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"📝 [PAPER SETS API] Error updating paper set: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update paper set: {str(e)}")

@router.delete("/paper-sets/{paper_set_id}")
async def delete_paper_set(paper_set_id: str, request: Request, current_user = Depends(get_current_user)):
    """Delete a paper set"""
    try:
        logger.info(f"🗑️ [PAPER SETS API] Deleting paper set: {paper_set_id}")
        
        # Validate paper set ID
        try:
            paper_set_obj_id = ObjectId(paper_set_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid paper set ID")
        
        # Connect to database
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get proper branch context (branch_code from branches collection)
        context = multi_tenant.get_branch_context(current_user)
        branch_code = context["branch_code"]
        paper_sets_collection = db.branch_paper_sets
        
        # Check if paper set exists - be more flexible with branch matching
        existing_paper_set = paper_sets_collection.find_one({"_id": paper_set_obj_id})
        
        if not existing_paper_set:
            raise HTTPException(status_code=404, detail="Paper set not found")
        
        # Log paper set details for debugging
        logger.info(f"🗑️ [PAPER SETS API] Found paper set with branchCode: {existing_paper_set.get('branchCode')}")
        logger.info(f"🗑️ [PAPER SETS API] Current user branch_code: {branch_code}")
        
        # Verify access - allow deletion if:
        # 1. Paper set belongs to current branch, OR
        # 2. User is branch admin/franchise admin (more permissive access)
        user_role = current_user.get("role", "")
        user_franchise_code = current_user.get("franchise_code", "")
        is_admin = user_role in ["admin", "branch_admin", "franchise_admin"] or current_user.get("is_branch_admin")
        
        # Check access permissions
        paper_set_branch = existing_paper_set.get("branchCode", "")
        paper_set_franchise = existing_paper_set.get("franchiseCode", "")
        
        has_access = (
            paper_set_branch == branch_code or  # Exact branch match
            paper_set_branch == user_franchise_code or  # Branch stored as franchise
            paper_set_franchise == user_franchise_code or  # Franchise match
            is_admin  # Admin override
        )
        
        if not has_access:
            logger.warning(f"🗑️ [PAPER SETS API] Access denied - Paper set: {paper_set_branch}/{paper_set_franchise}, User: {branch_code}/{user_franchise_code}")
            raise HTTPException(status_code=403, detail="Access denied to this paper set")
        
        # Delete paper set using just ID (no branch filtering since we've already verified access)
        result = paper_sets_collection.delete_one({"_id": paper_set_obj_id})
        
        if result.deleted_count > 0:
            logger.info(f"✅ [PAPER SETS API] Paper set deleted successfully")
            
            return {
                "success": True,
                "message": "Paper set deleted successfully"
            }
        else:
            logger.error("🗑️ [PAPER SETS API] Failed to delete paper set")
            raise HTTPException(status_code=500, detail="Failed to delete paper set")
            
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"🗑️ [PAPER SETS API] Error deleting paper set: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete paper set: {str(e)}")

@router.get("/paper-sets/{paper_set_id}")
async def get_paper_set_details(paper_set_id: str, request: Request, current_user = Depends(get_current_user)):
    """Get detailed information for a specific paper set including questions"""
    try:
        logger.info(f"📋 [PAPER SETS API] Getting paper set details: {paper_set_id}")
        
        # Validate paper set ID
        try:
            paper_set_obj_id = ObjectId(paper_set_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid paper set ID")
        
        # Connect to database
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        
        # Get proper branch context
        context = multi_tenant.get_branch_context(current_user)
        franchise_code = context["franchise_code"]
        
        # Get paper set
        paper_set = db.branch_paper_sets.find_one({"_id": paper_set_obj_id})
        
        if not paper_set:
            raise HTTPException(status_code=404, detail="Paper set not found")
        
        # Convert ObjectId to string
        paper_set["id"] = str(paper_set["_id"])
        del paper_set["_id"]
        
        logger.info(f"✅ [PAPER SETS API] Found paper set: {paper_set.get('paperName')}")
        
        return {
            "success": True,
            "data": paper_set
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"📋 [PAPER SETS API] Error getting paper set details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get paper set: {str(e)}")

@router.get("/test")
async def test_paper_sets_endpoint(request: Request):
    """Test endpoint for paper sets API"""
    logger.info("📋 [PAPER SETS API] Test endpoint called")
    
    try:
        # Test database connection
        db = request.app.mongodb
        collections = db.list_collection_names()
        
        return {
            "success": True,
            "message": "Paper sets API is working",
            "database_collections": collections,
            "paper_sets_collection_exists": "branch_paper_sets" in collections
        }
    except Exception as e:
        logger.error(f"📋 [PAPER SETS API] Test endpoint error: {str(e)}")
        return {
            "success": False,
            "message": f"Error connecting to database: {str(e)}"
        }