from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form, Request
from fastapi.responses import FileResponse
import os
import shutil
from pathlib import Path
import uuid
from typing import Optional
import mimetypes
from PIL import Image
import io
from bson import ObjectId
from datetime import datetime
from app.utils.auth_helpers import get_current_user
import logging

upload_router = APIRouter(prefix="/upload", tags=["File Upload"])

# Configuration
UPLOAD_DIR = Path("uploads")
COURSE_THUMBNAILS_DIR = UPLOAD_DIR / "courses" / "thumbnails"
COURSE_VIDEOS_DIR = UPLOAD_DIR / "courses" / "videos"
COURSE_PDFS_DIR = UPLOAD_DIR / "courses" / "pdfs"
PROFILE_AVATARS_DIR = UPLOAD_DIR / "profile" / "avatars"

# File size limits
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_VIDEO_SIZE = 500 * 1024 * 1024  # 500MB
MAX_PDF_SIZE = 50 * 1024 * 1024  # 50MB

# Allowed file types
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".wmv", ".webm", ".mkv"}
ALLOWED_VIDEO_MIME_TYPES = {"video/mp4", "video/avi", "video/quicktime", "video/x-ms-wmv", "video/webm", "video/x-matroska"}

ALLOWED_PDF_EXTENSIONS = {".pdf"}
ALLOWED_PDF_MIME_TYPES = {"application/pdf"}

# Create upload directories if they don't exist
UPLOAD_DIR.mkdir(exist_ok=True)
COURSE_THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
COURSE_VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
COURSE_PDFS_DIR.mkdir(parents=True, exist_ok=True)
PROFILE_AVATARS_DIR.mkdir(parents=True, exist_ok=True)

def validate_image_file(file: UploadFile) -> bool:
    """Validate uploaded file is a valid image"""
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_IMAGE_EXTENSIONS:
        return False
    
    if file.content_type not in ALLOWED_IMAGE_MIME_TYPES:
        return False
    
    return True

def validate_video_file(file: UploadFile) -> bool:
    """Validate uploaded file is a valid video"""
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_VIDEO_EXTENSIONS:
        return False
    
    if file.content_type and file.content_type not in ALLOWED_VIDEO_MIME_TYPES:
        return False
    
    return True

def validate_pdf_file(file: UploadFile) -> bool:
    """Validate uploaded file is a valid PDF"""
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_PDF_EXTENSIONS:
        return False
    
    if file.content_type not in ALLOWED_PDF_MIME_TYPES:
        return False
    
    return True

def get_file_extension(filename: str, content_type: str) -> str:
    """Get appropriate file extension based on filename and content type"""
    # Try to get extension from filename first
    file_ext = Path(filename).suffix.lower()
    if file_ext in ALLOWED_IMAGE_EXTENSIONS:
        return file_ext
    
    # Fallback to content type
    ext_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png", 
        "image/webp": ".webp",
        "image/gif": ".gif"
    }
    return ext_map.get(content_type, ".jpg")

def resize_image(image_data: bytes, max_width: int = 800, max_height: int = 600) -> bytes:
    """Resize image to maximum dimensions while maintaining aspect ratio"""
    try:
        # Open image from bytes
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary (for PNG with transparency)
        if image.mode in ("RGBA", "P"):
            # Create a white background
            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "P":
                image = image.convert("RGBA")
            background.paste(image, mask=image.split()[-1] if image.mode == "RGBA" else None)
            image = background
        
        # Calculate new dimensions
        width, height = image.size
        if width > max_width or height > max_height:
            # Calculate aspect ratio
            aspect_ratio = min(max_width / width, max_height / height)
            new_width = int(width * aspect_ratio)
            new_height = int(height * aspect_ratio)
            
            # Resize image
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Save to bytes
        output = io.BytesIO()
        image.save(output, format="JPEG", quality=85, optimize=True)
        return output.getvalue()
        
    except Exception as e:
        # If resize fails, return original
        return image_data

@upload_router.post("/course-thumbnail/{course_id}")
async def upload_course_thumbnail(
    course_id: str,
    file: UploadFile = File(...),
    resize: bool = Form(default=True)
):
    """Upload and save course thumbnail with course_id as filename"""
    
    # Validate file
    if not validate_image_file(file):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_IMAGE_SIZE // (1024*1024)}MB"
        )
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Resize image if requested
        if resize:
            file_content = resize_image(file_content)
        
        # Get appropriate file extension
        file_ext = get_file_extension(file.filename, file.content_type)
        
        # Create filename with course_id
        filename = f"{course_id}{file_ext}"
        file_path = COURSE_THUMBNAILS_DIR / filename
        
        # Remove existing thumbnail if it exists
        for existing_file in COURSE_THUMBNAILS_DIR.glob(f"{course_id}.*"):
            existing_file.unlink(missing_ok=True)
        
        # Save new file
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        # Generate URL for the uploaded file
        thumbnail_url = f"/upload/course-thumbnail/{course_id}{file_ext}"
        
        return {
            "success": True,
            "message": "Thumbnail uploaded successfully",
            "course_id": course_id,
            "filename": filename,
            "thumbnail_url": thumbnail_url,
            "file_size": len(file_content)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@upload_router.get("/course-thumbnail/{filename}")
async def get_course_thumbnail(filename: str):
    """Serve course thumbnail files"""
    
    file_path = COURSE_THUMBNAILS_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    
    # Get MIME type
    mime_type, _ = mimetypes.guess_type(str(file_path))
    if not mime_type:
        mime_type = "image/jpeg"
    
    return FileResponse(
        path=str(file_path),
        media_type=mime_type,
        filename=filename
    )

@upload_router.delete("/course-thumbnail/{course_id}")
async def delete_course_thumbnail(course_id: str):
    """Delete course thumbnail"""
    
    deleted_files = []
    
    # Find and delete all files with this course_id
    for file_path in COURSE_THUMBNAILS_DIR.glob(f"{course_id}.*"):
        file_path.unlink(missing_ok=True)
        deleted_files.append(file_path.name)
    
    if not deleted_files:
        raise HTTPException(status_code=404, detail="No thumbnail found for this course")
    
    return {
        "success": True,
        "message": "Thumbnail deleted successfully",
        "course_id": course_id,
        "deleted_files": deleted_files
    }

@upload_router.get("/course-thumbnails/list")
async def list_course_thumbnails():
    """List all course thumbnails"""
    
    thumbnails = []
    
    for file_path in COURSE_THUMBNAILS_DIR.iterdir():
        if file_path.is_file():
            # Extract course_id from filename
            course_id = file_path.stem
            file_ext = file_path.suffix
            
            thumbnails.append({
                "course_id": course_id,
                "filename": file_path.name,
                "thumbnail_url": f"/upload/course-thumbnail/{file_path.name}",
                "file_size": file_path.stat().st_size,
                "extension": file_ext
            })
    
    return {
        "success": True,
        "thumbnails": thumbnails,
        "total": len(thumbnails)
    }

@upload_router.post("/lesson-video/{lesson_id}")
async def upload_lesson_video(
    lesson_id: str,
    file: UploadFile = File(...),
    request: Request = None
):
    """Upload and save lesson video"""
    
    # Validate file
    if not validate_video_file(file):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}"
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > MAX_VIDEO_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_VIDEO_SIZE // (1024*1024)}MB"
        )
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Get file extension
        file_ext = Path(file.filename).suffix.lower()
        if not file_ext:
            file_ext = ".mp4"  # Default to mp4
        
        # Create filename with lesson_id
        filename = f"{lesson_id}{file_ext}"
        file_path = COURSE_VIDEOS_DIR / filename
        
        # Remove existing video if it exists
        for existing_file in COURSE_VIDEOS_DIR.glob(f"{lesson_id}.*"):
            existing_file.unlink(missing_ok=True)
        
        # Save new file
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        # Generate URL for the uploaded file
        video_url = f"/upload/lesson-video/{filename}"
        
        # Update lesson in database with video URL
        if request and hasattr(request.app, 'mongodb'):
            from app.services.lesson_service import update_lesson_video_url
            db = request.app.mongodb
            update_lesson_video_url(db, lesson_id, video_url)
        
        return {
            "success": True,
            "message": "Video uploaded successfully",
            "lesson_id": lesson_id,
            "filename": filename,
            "video_url": video_url,
            "file_size": len(file_content)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@upload_router.get("/lesson-video/{filename}")
async def get_lesson_video(filename: str):
    """Serve lesson video files"""
    
    file_path = COURSE_VIDEOS_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Get MIME type
    mime_type, _ = mimetypes.guess_type(str(file_path))
    if not mime_type:
        mime_type = "video/mp4"
    
    return FileResponse(
        path=str(file_path),
        media_type=mime_type,
        filename=filename
    )

@upload_router.post("/lesson-pdf/{lesson_id}")
async def upload_lesson_pdf(
    lesson_id: str,
    file: UploadFile = File(...),
    request: Request = None
):
    """Upload and save lesson PDF materials"""
    
    # Validate file
    if not validate_pdf_file(file):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_PDF_EXTENSIONS)}"
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > MAX_PDF_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_PDF_SIZE // (1024*1024)}MB"
        )
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Create filename with lesson_id and original filename
        original_filename = file.filename or "document.pdf"
        filename = f"{lesson_id}_{original_filename}"
        file_path = COURSE_PDFS_DIR / filename
        
        # Remove existing PDF if it exists
        for existing_file in COURSE_PDFS_DIR.glob(f"{lesson_id}_*"):
            existing_file.unlink(missing_ok=True)
        
        # Save new file
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        # Generate URL for the uploaded file
        pdf_url = f"/upload/lesson-pdf/{filename}"
        
        # Update lesson in database with PDF URL
        if request and hasattr(request.app, 'mongodb'):
            from app.services.lesson_service import update_lesson_pdf_url
            db = request.app.mongodb
            update_lesson_pdf_url(db, lesson_id, pdf_url, original_filename)
        
        return {
            "success": True,
            "message": "PDF uploaded successfully",
            "lesson_id": lesson_id,
            "filename": filename,
            "original_filename": original_filename,
            "pdf_url": pdf_url,
            "file_size": len(file_content)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@upload_router.get("/lesson-pdf/{filename}")
async def get_lesson_pdf(filename: str):
    """Serve lesson PDF files"""
    
    file_path = COURSE_PDFS_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found")
    
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=filename
    )

@upload_router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
    resize: bool = Form(default=True)
):
    """Upload user avatar image"""
    
    # Validate file
    if not validate_image_file(file):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_IMAGE_SIZE // (1024*1024)}MB"
        )
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Resize image if requested (smaller for avatars)
        if resize:
            file_content = resize_image(file_content, max_width=400, max_height=400)
        
        # Get appropriate file extension
        file_ext = get_file_extension(file.filename, file.content_type)
        
        # Generate unique filename
        if user_id:
            filename = f"{user_id}_{uuid.uuid4().hex[:8]}{file_ext}"
        else:
            filename = f"avatar_{uuid.uuid4().hex}{file_ext}"
        
        file_path = PROFILE_AVATARS_DIR / filename
        
        # Save new file
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        # Generate URL for the uploaded file
        avatar_url = f"/upload/avatar/{filename}"
        
        return {
            "success": True,
            "message": "Avatar uploaded successfully",
            "filename": filename,
            "avatar_url": avatar_url,
            "url": avatar_url,  # Alternative key for compatibility
            "file_url": avatar_url,  # Another alternative key
            "file_size": len(file_content)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@upload_router.get("/avatar/{filename}")
async def get_avatar(filename: str):
    """Serve avatar image files"""
    
    file_path = PROFILE_AVATARS_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    # Get MIME type
    mime_type, _ = mimetypes.guess_type(str(file_path))
    if not mime_type:
        mime_type = "image/jpeg"
    
    return FileResponse(
        path=str(file_path),
        media_type=mime_type,
        filename=filename
    )

@upload_router.delete("/avatar/{filename}")
async def delete_avatar(filename: str):
    """Delete avatar image"""
    
    file_path = PROFILE_AVATARS_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    try:
        file_path.unlink()
        return {
            "success": True,
            "message": "Avatar deleted successfully",
            "filename": filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete avatar: {str(e)}")


@upload_router.post("/student-photo")
async def upload_student_photo(
    request: Request,
    photo: UploadFile = File(...),
    student_id: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload student photo for ID cards"""
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[UPLOAD PHOTO] Uploading photo for student: {student_id}")
        
        # Validate file type
        if not photo.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Validate file size (max 5MB)
        if photo.size > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size too large (max 5MB)")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="Branch code not found")
        
        # Verify student exists
        student = db.branch_students.find_one({"_id": ObjectId(student_id)})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Create uploads directory
        upload_dir = Path("uploads") / "profile" / branch_code
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_extension = photo.filename.split('.')[-1] if '.' in photo.filename else 'jpg'
        filename = f"student_{student_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_extension}"
        file_path = upload_dir / filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        
        # Convert relative path to web-accessible format
        web_path = f"/uploads/profile/{branch_code}/{filename}"
        
        # Update student record with photo path
        db.branch_students.update_one(
            {"_id": ObjectId(student_id)},
            {
                "$set": {
                    "photo": str(file_path),
                    "photo_url": web_path,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"[UPLOAD PHOTO] Photo uploaded successfully: {file_path}")
        
        return {
            "success": True,
            "message": "Photo uploaded successfully",
            "photo_url": web_path,
            "file_path": str(file_path)
        }
        
    except Exception as e:
        logger.error(f"[UPLOAD PHOTO] Error uploading photo: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload photo")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

