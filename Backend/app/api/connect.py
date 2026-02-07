from fastapi import APIRouter, Request, HTTPException, Depends, Form, File, UploadFile
from fastapi.responses import JSONResponse
from typing import Optional, List
import json
import re
import uuid
from app.schemas.connect import (
    ConnectFormSuccessResponse,
    ConnectFormResponse,
    UserRole
)
from app.services.connect_service import ConnectService
from app.utils.auth import get_admin_user
from app.utils.serializers import json_serialize, json_response

connect_router = APIRouter(
    prefix="/connect",
    tags=["Connectus"]
)

@connect_router.post("/", response_model=ConnectFormSuccessResponse)
async def submit_connect_form(
    request: Request,
    fullName: str = Form(..., description="Full name of the person"),
    email: str = Form(..., description="Email address"),
    phone: Optional[str] = Form("", description="Phone number (optional)"),
    role: Optional[str] = Form("", description="User role (Student, Instructor, Job Seeker, Other)"),
    subject: Optional[str] = Form("", description="Subject of inquiry (optional)"),
    message: str = Form(..., description="Message or query"),
    resume: Optional[UploadFile] = File(None, description="Resume file upload (optional)")
):
    """
    Submit a connect form
    Public endpoint - no authentication required
    Accepts form data including optional file upload
    """
    try:
        db = request.app.mongodb
        
        # Validate required fields
        if not fullName or not fullName.strip():
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Full name is required"}
            )
        
        if not email or not email.strip():
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Email is required"}
            )
        
        if not message or not message.strip():
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Message is required"}
            )
        
        # Validate email format (basic validation)
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email.strip()):
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Please enter a valid email address"}
            )
        
        # Validate phone if provided
        if phone and phone.strip():
            phone_digits = ''.join(filter(str.isdigit, phone))
            if len(phone_digits) < 10 or len(phone_digits) > 15:
                return JSONResponse(
                    status_code=400,
                    content={"success": False, "message": "Phone number must be between 10 and 15 digits"}
                )
        
        # Validate message length
        if len(message.strip()) < 10:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Message must be at least 10 characters long"}
            )
        
        # Prepare form data
        form_data = {
            "fullName": fullName.strip(),
            "email": email.strip().lower(),
            "phone": phone.strip() if phone else "",
            "role": role.strip() if role else "",
            "subject": subject.strip() if subject else "",
            "message": message.strip()
        }
        
        # Handle file upload if provided
        resume_info = None
        if resume and resume.filename:
            # Validate file type
            allowed_extensions = ['.pdf', '.doc', '.docx']
            file_extension = resume.filename.lower().split('.')[-1]
            if f'.{file_extension}' not in allowed_extensions:
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False, 
                        "message": "Resume file must be PDF, DOC, or DOCX format"
                    }
                )
            
            # Validate file size (10MB limit)
            if resume.size and resume.size > 10 * 1024 * 1024:
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False, 
                        "message": "Resume file size must be less than 10MB"
                    }
                )
            
            # Create temporary submission ID for file naming
            import uuid
            temp_submission_id = str(uuid.uuid4())
            
            try:
                resume_info = ConnectService.save_resume_file(resume, temp_submission_id)
            except Exception as e:
                return JSONResponse(
                    status_code=500,
                    content={
                        "success": False, 
                        "message": f"Failed to upload resume: {str(e)}"
                    }
                )
        
        # Create submission in database
        result = ConnectService.create_connect_submission(db, form_data, resume_info)
        
        return JSONResponse(
            status_code=201 if result["success"] else 400,
            content=result
        )
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False, 
                "message": f"Internal server error: {str(e)}"
            }
        )

@connect_router.get("/submissions", response_model=dict)
async def get_connect_submissions(
    request: Request,
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    current_user: dict = Depends(get_admin_user)
):
    """
    Get all connect form submissions
    Admin access required
    """
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[Connect API] get_connect_submissions called by user: {current_user}")
        
        db = request.app.mongodb
        result = ConnectService.get_all_submissions(db, limit, offset, status)
        
        # Ensure all data is properly serialized, especially datetime objects
        serialized_result = json_serialize(result)
        
        # Use json.dumps with default=str as a failsafe for any remaining non-serializable objects
        json_str = json.dumps(serialized_result, default=str, ensure_ascii=False)
        
        # Parse back to ensure we have clean, JSON-safe data
        clean_data = json.loads(json_str)
        
        logger.info(f"[Connect API] Successfully returning {len(clean_data.get('submissions', []))} submissions")
        
        return JSONResponse(
            status_code=200,
            content=clean_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Connect API] Unexpected error in get_connect_submissions: {e}")
        # Ultimate error handling - return safe error response
        safe_error = {
            "success": False,
            "message": f"Internal server error: {str(e)}",
            "submissions": [],
            "total": 0,
            "limit": limit,
            "offset": offset
        }
        
        # Ensure error response is also properly serialized
        serialized_error = json_serialize(safe_error)
        json_str = json.dumps(serialized_error, default=str, ensure_ascii=False)
        clean_error = json.loads(json_str)
        
        return JSONResponse(status_code=500, content=clean_error)

@connect_router.get("/submissions/{submission_id}", response_model=dict)
async def get_connect_submission(
    submission_id: str,
    request: Request,
    current_user: dict = Depends(get_admin_user)
):
    """
    Get a specific connect submission by ID
    Admin access required
    """
    try:
        db = request.app.mongodb
        submission = ConnectService.get_submission_by_id(db, submission_id)
        
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        # Create response data and ensure proper serialization
        response_data = {"success": True, "submission": submission}
        
        # Ensure all data is properly serialized, especially datetime objects
        serialized_result = json_serialize(response_data)
        
        # Use json.dumps with default=str as a failsafe for any remaining non-serializable objects
        json_str = json.dumps(serialized_result, default=str, ensure_ascii=False)
        
        # Parse back to ensure we have clean, JSON-safe data
        clean_data = json.loads(json_str)
        
        return JSONResponse(
            status_code=200,
            content=clean_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Ultimate error handling - return safe error response
        safe_error = {
            "success": False,
            "message": f"Internal server error: {str(e)}",
            "submission": None
        }
        
        # Ensure error response is also properly serialized
        serialized_error = json_serialize(safe_error)
        json_str = json.dumps(serialized_error, default=str, ensure_ascii=False)
        clean_error = json.loads(json_str)
        
        return JSONResponse(status_code=500, content=clean_error)

@connect_router.put("/submissions/{submission_id}/status", response_model=ConnectFormSuccessResponse)
async def update_submission_status(
    submission_id: str,
    request: Request,
    status: str = Form(..., description="New status"),
    admin_notes: Optional[str] = Form("", description="Admin notes (optional)"),
    current_user: dict = Depends(get_admin_user)
):
    """
    Update connect submission status
    Admin access required
    """
    try:
        db = request.app.mongodb
        result = ConnectService.update_submission_status(
            db, submission_id, status, admin_notes
        )
        
        # Use json_response for guaranteed serialization
        return json_response(
            result, 
            status_code=200 if result["success"] else 404
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

