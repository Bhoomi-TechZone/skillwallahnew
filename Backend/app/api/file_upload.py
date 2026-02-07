from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import os
import uuid
from PIL import Image
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Ensure uploads directory exists
UPLOAD_DIR = "uploads/logos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def validate_image_file(file: UploadFile) -> bool:
    """Validate if the uploaded file is a valid image"""
    if not file.filename:
        return False
    
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_IMAGE_EXTENSIONS:
        return False
    
    return True

def resize_image(input_path: str, output_path: str, max_size: tuple = (300, 300)):
    """Resize image to optimize for web usage"""
    try:
        with Image.open(input_path) as img:
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Resize while maintaining aspect ratio
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save optimized image
            img.save(output_path, 'JPEG', quality=85, optimize=True)
            return True
    except Exception as e:
        logger.error(f"Error resizing image: {e}")
        return False

@router.post("/upload-logo")
async def upload_logo(file: UploadFile = File(...)):
    """Upload and process logo image"""
    try:
        # Validate file
        if not validate_image_file(file):
            raise HTTPException(
                status_code=400, 
                detail="Invalid file type. Only images (jpg, jpeg, png, gif, bmp, webp) are allowed."
            )
        
        # Check file size
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail="File too large. Maximum size is 5MB."
            )
        
        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1].lower()
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        temp_file_path = os.path.join(UPLOAD_DIR, f"temp_{unique_filename}")
        final_file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save temporary file
        with open(temp_file_path, "wb") as temp_file:
            temp_file.write(contents)
        
        # Resize and optimize image
        if resize_image(temp_file_path, final_file_path):
            # Remove temporary file
            os.remove(temp_file_path)
            
            # Return file path that can be used by frontend
            relative_path = f"uploads/logos/{unique_filename}"
            
            logger.info(f"✅ Logo uploaded successfully: {relative_path}")
            
            return JSONResponse({
                "success": True,
                "message": "Logo uploaded successfully",
                "file_path": relative_path,
                "original_filename": file.filename
            })
        else:
            # Remove temporary file on error
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            raise HTTPException(status_code=400, detail="Failed to process image")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error uploading logo: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during file upload")

@router.delete("/delete-logo/{filename}")
async def delete_logo(filename: str):
    """Delete uploaded logo file"""
    try:
        # Validate filename to prevent path traversal
        if not filename or ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"✅ Logo deleted successfully: {filename}")
            return JSONResponse({
                "success": True,
                "message": "Logo deleted successfully"
            })
        else:
            raise HTTPException(status_code=404, detail="File not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting logo: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during file deletion")