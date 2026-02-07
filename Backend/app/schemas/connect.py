from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Literal
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    STUDENT = "Student"
    INSTRUCTOR = "Instructor"
    JOB_SEEKER = "Job Seeker"
    OTHER = "Other"

class ConnectFormCreate(BaseModel):
    fullName: str
    email: EmailStr
    phone: Optional[str] = ""
    role: Optional[UserRole] = None
    subject: Optional[str] = ""
    message: str
    # Note: resume file will be handled separately in the endpoint
    
    @validator('fullName')
    def validate_full_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Full name is required')
        if len(v.strip()) < 2:
            raise ValueError('Full name must be at least 2 characters long')
        return v.strip()
    
    @validator('message')
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError('Message is required')
        if len(v.strip()) < 10:
            raise ValueError('Message must be at least 10 characters long')
        return v.strip()
    
    @validator('phone')
    def validate_phone(cls, v):
        if v and v.strip():
            # Optional phone validation
            phone_digits = ''.join(filter(str.isdigit, v))
            if len(phone_digits) < 10 or len(phone_digits) > 15:
                raise ValueError('Phone number must be between 10 and 15 digits')
        return v.strip() if v else ""

class ConnectFormResponse(BaseModel):
    id: str
    fullName: str
    email: str
    phone: Optional[str]
    role: Optional[str]
    subject: Optional[str]
    message: str
    resume_filename: Optional[str] = None
    resume_path: Optional[str] = None
    created_date: datetime
    status: str = "new"

class ConnectFormSuccessResponse(BaseModel):
    success: bool
    message: str
    submission_id: Optional[str] = None