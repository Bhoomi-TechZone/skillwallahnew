from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SubmissionCreate(BaseModel):
    student_id: str
    assignment_id: str
    content: Optional[str] = None  # written answer
    file_url: Optional[str] = None  # link to uploaded file
    file_path: Optional[str] = None  # local file path
    file_name: Optional[str] = None  # original filename
    comments: Optional[str] = None  # student comments
    submission_date: Optional[datetime] = None  # will be set automatically
    # Multi-tenancy fields
    franchise_code: Optional[str] = None
    franchise_id: Optional[str] = None

class SubmissionUpdate(BaseModel):
    content: Optional[str] = None
    file_url: Optional[str] = None
    grade: Optional[str] = None
    feedback: Optional[str] = None
    