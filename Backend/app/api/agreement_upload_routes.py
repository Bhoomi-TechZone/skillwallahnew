from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import FileResponse
from bson import ObjectId
from datetime import datetime
import os
import shutil

router = APIRouter(prefix="/api/agreement-uploads", tags=["Agreement Uploads"])

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads/agreements"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def upload_helper(data: dict) -> dict:
    return {
        "fileName": data["fileName"],
        "originalName": data["originalName"],
        "franchiseId": data["franchiseId"],
        "franchiseName": data["franchiseName"],
        "uploadedBy": data.get("uploadedBy", "SuperAdmin"),
        "uploadDate": datetime.utcnow(),
        "status": "Pending",
        "fileSize": data["fileSize"],
        "fileType": data["fileType"],
        "filePath": data["filePath"]
    }

@router.post("/upload")
async def upload_agreement(
    request: Request,
    file: UploadFile = File(...),
    franchiseId: str = Form(...)
):
    db = request.app.mongodb
    
    # Get franchise details
    franchise = db.franchises.find_one({"_id": ObjectId(franchiseId)})
    if not franchise:
        raise HTTPException(status_code=404, detail="Franchise not found")
    
    # Validate file type
    allowed_types = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF and Word documents are allowed")
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{franchiseId}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Save upload info to database
        upload_data = upload_helper({
            "fileName": unique_filename,
            "originalName": file.filename,
            "franchiseId": franchiseId,
            "franchiseName": franchise["franchise_name"],
            "fileSize": file.size,
            "fileType": file.content_type,
            "filePath": file_path
        })
        
        result = db.agreement_uploads.insert_one(upload_data)
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to save upload record")
        
        return {
            "success": True,
            "message": "Agreement uploaded successfully",
            "uploadId": str(result.inserted_id)
        }
        
    except Exception as e:
        # Clean up file if database operation fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/")
def get_all_uploaded_agreements(request: Request):
    db = request.app.mongodb
    uploads = []
    
    for upload in db.agreement_uploads.find().sort("uploadDate", -1):
        upload["_id"] = str(upload["_id"])
        uploads.append(upload)
    
    return {
        "success": True,
        "data": uploads
    }

@router.get("/{upload_id}")
def get_upload_by_id(request: Request, upload_id: str):
    db = request.app.mongodb
    upload = db.agreement_uploads.find_one({"_id": ObjectId(upload_id)})
    
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    upload["_id"] = str(upload["_id"])
    return {
        "success": True,
        "data": upload
    }

@router.put("/{upload_id}/status")
def update_upload_status(request: Request, upload_id: str, status_data: dict):
    db = request.app.mongodb
    
    update_data = {
        "status": status_data.get("status"),
        "reason": status_data.get("reason", ""),
        "reviewedAt": datetime.utcnow(),
        "reviewedBy": "SuperAdmin"  # In real app, get from auth context
    }
    
    result = db.agreement_uploads.update_one(
        {"_id": ObjectId(upload_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    return {
        "success": True,
        "message": "Status updated successfully"
    }

@router.delete("/{upload_id}")
def delete_upload(request: Request, upload_id: str):
    db = request.app.mongodb
    
    # Get upload info to delete file
    upload = db.agreement_uploads.find_one({"_id": ObjectId(upload_id)})
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    # Delete file from disk
    file_path = upload.get("filePath")
    if file_path and os.path.exists(file_path):
        os.remove(file_path)
    
    # Delete from database
    result = db.agreement_uploads.delete_one({"_id": ObjectId(upload_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    return {
        "success": True,
        "message": "Upload deleted successfully"
    }

@router.get("/{upload_id}/download")
def download_uploaded_agreement(request: Request, upload_id: str):
    db = request.app.mongodb
    upload = db.agreement_uploads.find_one({"_id": ObjectId(upload_id)})
    
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    file_path = upload.get("filePath")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        file_path,
        media_type=upload["fileType"],
        filename=upload["originalName"]
    )

