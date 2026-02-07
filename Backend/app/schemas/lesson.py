from pydantic import BaseModel, Field
from typing import Optional

class LessonCreate(BaseModel):
    title: str = Field(..., min_length=3)
    description: Optional[str] = None
    duration: str = Field(..., pattern=r'^\d{2}:\d{2}$')  # Format: MM:SS or HH:MM
    order: int = Field(..., ge=1)
    video_url: Optional[str] = None
    pdf_url: Optional[str] = None
    pdf_filename: Optional[str] = None

class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = Field(None, pattern=r'^\d{2}:\d{2}$')
    order: Optional[int] = Field(None, ge=1)
    video_url: Optional[str] = None
    pdf_url: Optional[str] = None
    pdf_filename: Optional[str] = None

class LessonResponse(BaseModel):
    id: str
    module_id: str
    title: str
    description: Optional[str] = None
    duration: str
    order: int
    video_url: Optional[str] = None
    pdf_url: Optional[str] = None
    pdf_filename: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None