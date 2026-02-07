from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class RecordingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    course_id: str
    video_url: str
    pdf_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    syllabus_percent: Optional[int] = 0
    lecture_percent: Optional[int] = 0
    tags: Optional[List[str]] = []

class RecordingOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    course_id: str
    course_title: Optional[str] = None
    instructor_name: Optional[str] = None
    video_url: str
    pdf_url: Optional[str] = None
    recorded_date: datetime
    duration_minutes: Optional[int] = None
    syllabus_percent: Optional[int] = 0
    lecture_percent: Optional[int] = 0
    tags: Optional[List[str]] = []
    view_count: Optional[int] = 0
