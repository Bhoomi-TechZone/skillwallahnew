from fastapi import APIRouter, Request, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
from app.schemas.enquiry import (
    EnquiryCreate, 
    EnquiryResponse, 
    EnquiryUpdate, 
    EnquiryFilter,
    EnquiryResponseCreate,
    EnquiryListResponse,
    EnquirySuccessResponse,
    EnquiryStatus,
    EnquiryPriority,
    EnquiryCategory
)
from app.services.enquiry_service import (
    create_enquiry,
    get_enquiry_by_id,
    get_all_enquiries,
    update_enquiry,
    delete_enquiry,
    create_enquiry_response,
    get_enquiry_responses,
    get_enquiry_stats
)
from app.utils.auth import get_admin_user
from app.utils.branch_filter import BranchAccessManager

enquiry_router = APIRouter(prefix="/enquiry", tags=["Enquiry"])

@enquiry_router.post("/", response_model=EnquirySuccessResponse)
async def submit_enquiry(enquiry_data: EnquiryCreate, request: Request):
    """
    Submit a new enquiry from contact form
    Public endpoint - no authentication required
    """
    try:
        db = request.app.mongodb
        
        # Get franchise context from request if available
        current_user = getattr(request.state, 'user', None)
        if current_user and current_user.get('franchise_code'):
            # Add franchise information to enquiry if user is authenticated
            enquiry_data.franchise_code = current_user.get('franchise_code')
            enquiry_data.franchise_id = current_user.get('franchise_id')
        
        result = create_enquiry(db, enquiry_data)
        return JSONResponse(
            status_code=201 if result["success"] else 400,
            content=result
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Internal server error: {str(e)}"}
        )

@enquiry_router.get("/", response_model=EnquiryListResponse)
async def get_enquiries(
    request: Request,
    status: Optional[EnquiryStatus] = Query(None, description="Filter by status"),
    priority: Optional[EnquiryPriority] = Query(None, description="Filter by priority"),
    category: Optional[EnquiryCategory] = Query(None, description="Filter by category"),
    assigned_to: Optional[str] = Query(None, description="Filter by assigned admin"),
    email: Optional[str] = Query(None, description="Filter by email"),
    search: Optional[str] = Query(None, description="Search in name, email, or message"),
    limit: int = Query(50, ge=1, le=100, description="Number of enquiries per page"),
    offset: int = Query(0, ge=0, description="Number of enquiries to skip")
):
    """
    Get all enquiries with optional filters
    Admin access required
    """
    try:
        db = request.app.mongodb
        
        # Get branch filter for multi-tenancy
        current_user = getattr(request.state, 'user', None)
        # Get branch filter using static method (no branch filtering for enquiries)
        branch_filter = {}  # Enquiries are not branch-specific, so no filtering needed
        
        # Create filter object with branch filtering
        filters = EnquiryFilter(
            status=status,
            priority=priority,
            category=category,
            assigned_to=assigned_to,
            email=email,
            search=search,
            branch_filter=branch_filter  # Add branch filter to service call
        )
        
        result = get_all_enquiries(db, filters, limit, offset)
        
        return JSONResponse(
            status_code=200,
            content=result
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@enquiry_router.get("/{enquiry_id}", response_model=EnquiryResponse)
async def get_enquiry(
    enquiry_id: str, 
    request: Request
):
    """
    Get a specific enquiry by ID
    Admin access required
    """
    try:
        db = request.app.mongodb
        
        # Get branch filter for multi-tenancy
        current_user = getattr(request.state, 'user', None)
        # Fixed BranchAccessManager usage
        
        # Get branch filter for multi-tenancy
        # Fixed BranchAccessManager usage
        branch_filter = access_manager.get_filter_query()
        
        enquiry = get_enquiry_by_id(db, enquiry_id, branch_filter)
        
        if not enquiry:
            raise HTTPException(status_code=404, detail="Enquiry not found")
        
        return JSONResponse(
            status_code=200,
            content=enquiry
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@enquiry_router.put("/{enquiry_id}", response_model=EnquirySuccessResponse)
async def update_enquiry_status(
    enquiry_id: str,
    update_data: EnquiryUpdate,
    request: Request
):
    """
    Update an enquiry (status, priority, admin notes, etc.)
    Admin access required
    """
    try:
        db = request.app.mongodb
        
        # Get branch filter for multi-tenancy
        current_user = getattr(request.state, 'user', None)
        # Fixed BranchAccessManager usage
        
        # Get branch filter for multi-tenancy
        # Fixed BranchAccessManager usage
        branch_filter = access_manager.get_filter_query()
        
        result = update_enquiry(db, enquiry_id, update_data, branch_filter)
        
        return JSONResponse(
            status_code=200 if result["success"] else 404,
            content=result
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@enquiry_router.delete("/{enquiry_id}", response_model=EnquirySuccessResponse)
async def delete_enquiry_by_id(
    enquiry_id: str,
    request: Request
):
    """
    Delete an enquiry
    Admin access required
    """
    try:
        db = request.app.mongodb
        
        # Get branch filter for multi-tenancy
        current_user = getattr(request.state, 'user', None)
        # Fixed BranchAccessManager usage
        
        # Get branch filter for multi-tenancy
        # Fixed BranchAccessManager usage
        branch_filter = access_manager.get_filter_query()
        
        result = delete_enquiry(db, enquiry_id, branch_filter)
        
        return JSONResponse(
            status_code=200 if result["success"] else 404,
            content=result
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@enquiry_router.post("/{enquiry_id}/responses", response_model=EnquirySuccessResponse)
async def add_enquiry_response(
    enquiry_id: str,
    response_data: EnquiryResponseCreate,
    request: Request
):
    """
    Add a response to an enquiry
    Admin access required
    """
    try:
        db = request.app.mongodb
        
        # Get branch filter for multi-tenancy
        current_user = getattr(request.state, 'user', None)
        # Fixed BranchAccessManager usage
        
        # Get branch filter for multi-tenancy
        # Fixed BranchAccessManager usage
        branch_filter = access_manager.get_filter_query()
        
        # Set enquiry_id from URL parameter
        response_data.enquiry_id = enquiry_id
        response_data.admin_id = current_user["id"]
        response_data.admin_name = current_user.get("name", "Admin")
        
        # Add franchise context to response
        if current_user.get('franchise_code'):
            response_data.franchise_code = current_user.get('franchise_code')
            response_data.franchise_id = current_user.get('franchise_id')
        
        result = create_enquiry_response(db, response_data, branch_filter)
        
        return JSONResponse(
            status_code=201 if result["success"] else 400,
            content=result
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")



