"""
Video serving API for course thumbnails and media files
"""
import os
import mimetypes
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import FileResponse, StreamingResponse
from typing import Optional

router = APIRouter()

# Video MIME types mapping
VIDEO_MIME_TYPES = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.m4v': 'video/mp4',
    '.3gp': 'video/3gpp'
}

def get_video_mime_type(filename: str) -> str:
    """Get MIME type for video files"""
    _, ext = os.path.splitext(filename.lower())
    return VIDEO_MIME_TYPES.get(ext, 'video/mp4')

@router.get("/video-serve/{filename}")
async def serve_video(filename: str, request: Request, range_header: Optional[str] = None):
    """
    Serve video files with proper MIME types and range support for streaming
    """
    # Construct file path
    uploads_dir = os.path.join(os.getcwd(), "uploads", "courses")
    file_path = os.path.join(uploads_dir, filename)
    
    # Check if file exists
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    # Get file info
    file_size = os.path.getsize(file_path)
    mime_type = get_video_mime_type(filename)
    
    # Handle range requests for video streaming
    range_header = request.headers.get('Range')
    if range_header:
        # Parse range header
        try:
            start_str = range_header.replace('bytes=', '').split('-')[0]
            start = int(start_str) if start_str else 0
            end = file_size - 1  # Default to end of file
            
            # Read the range of bytes
            with open(file_path, 'rb') as f:
                f.seek(start)
                chunk_size = min(1024 * 1024, end - start + 1)  # 1MB chunks
                data = f.read(chunk_size)
            
            # Return partial content response
            response = Response(
                content=data,
                status_code=206,
                headers={
                    'Content-Range': f'bytes {start}-{start + len(data) - 1}/{file_size}',
                    'Accept-Ranges': 'bytes',
                    'Content-Length': str(len(data)),
                    'Content-Type': mime_type
                }
            )
            return response
            
        except (ValueError, IndexError):
            # Invalid range header, serve full file
            pass
    
    # Serve full file
    return FileResponse(
        path=file_path,
        media_type=mime_type,
        filename=filename,
        headers={
            'Accept-Ranges': 'bytes',
            'Content-Length': str(file_size)
        }
    )

