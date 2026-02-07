from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
import os
import logging
from pathlib import Path

router = APIRouter(prefix="/api", tags=["Images"])
logger = logging.getLogger(__name__)

@router.get("/serve-image")
async def serve_local_image(file_path: str):
    """
    Serve local image files from the system
    This endpoint allows serving images stored as local file paths in the database
    """
    try:
        logger.info(f"🖼️ [SERVE IMAGE] Request to serve: {file_path}")
        
        # Security check - only allow certain file types
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
        file_extension = Path(file_path).suffix.lower()
        
        if file_extension not in allowed_extensions:
            logger.warning(f"❌ [SERVE IMAGE] Invalid file type: {file_extension}")
            raise HTTPException(status_code=400, detail="Invalid file type")
        
        # Check if file exists
        if not os.path.exists(file_path):
            logger.warning(f"❌ [SERVE IMAGE] File not found: {file_path}")
            raise HTTPException(status_code=404, detail="Image file not found")
        
        # Check file size (limit to 10MB)
        file_size = os.path.getsize(file_path)
        if file_size > 10 * 1024 * 1024:  # 10MB limit
            logger.warning(f"❌ [SERVE IMAGE] File too large: {file_size} bytes")
            raise HTTPException(status_code=400, detail="Image file too large")
        
        logger.info(f"✅ [SERVE IMAGE] Serving file: {file_path} ({file_size} bytes)")
        
        # Determine media type
        media_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg', 
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp'
        }
        
        media_type = media_types.get(file_extension, 'image/jpeg')
        
        return FileResponse(
            path=file_path,
            media_type=media_type,
            filename=Path(file_path).name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [SERVE IMAGE] Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to serve image")

@router.get("/serve-uploaded-logo")
async def serve_uploaded_logo(filename: str):
    """Serve uploaded logo files"""
    try:
        logger.info(f"🖼️ [SERVE UPLOADED LOGO] Request for filename: {filename}")
        
        # Security check - prevent path traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            logger.warning(f"⚠️ [SERVE UPLOADED LOGO] Blocked suspicious filename: {filename}")
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        # Build the full file path for uploaded logos
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))  # Go up to project root
        full_path = os.path.join(base_dir, "uploads", "logos", filename)
        
        logger.info(f"📂 [SERVE UPLOADED LOGO] Full path: {full_path}")
        logger.info(f"🔍 [SERVE UPLOADED LOGO] File exists: {os.path.exists(full_path)}")
        
        if not os.path.exists(full_path):
            logger.error(f"❌ [SERVE UPLOADED LOGO] File not found: {full_path}")
            raise HTTPException(status_code=404, detail="File not found")
        
        # Determine media type
        _, ext = os.path.splitext(full_path)
        media_type = "application/octet-stream"
        
        if ext.lower() in ['.jpg', '.jpeg']:
            media_type = "image/jpeg"
        elif ext.lower() == '.png':
            media_type = "image/png"
        elif ext.lower() == '.gif':
            media_type = "image/gif"
        elif ext.lower() == '.bmp':
            media_type = "image/bmp"
        elif ext.lower() == '.webp':
            media_type = "image/webp"
        
        logger.info(f"📋 [SERVE UPLOADED LOGO] Media type: {media_type}")
        
        # Return the file
        return FileResponse(full_path, media_type=media_type)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [SERVE UPLOADED LOGO] Error serving logo {filename}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/image-info")
async def get_image_info(file_path: str):
    """
    Get information about a local image file
    """
    try:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Image file not found")
        
        file_stats = os.stat(file_path)
        
        return {
            "path": file_path,
            "exists": True,
            "size": file_stats.st_size,
            "size_mb": round(file_stats.st_size / (1024 * 1024), 2),
            "extension": Path(file_path).suffix.lower(),
            "filename": Path(file_path).name,
            "serve_url": f"/api/serve-image?file_path={file_path}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [IMAGE INFO] Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get image info")