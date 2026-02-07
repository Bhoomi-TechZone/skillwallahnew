from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Literal
from datetime import datetime
from enum import Enum

class EnquiryCategory(str, Enum):
    GENERAL = "general"
    COURSE_INQUIRY = "course_inquiry"
    TECHNICAL_SUPPORT = "technical_support"
    BILLING = "billing"
    COMPLAINT = "complaint"
    FEEDBACK = "feedback"
    OTHER = "other"

class EnquiryPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class EnquiryStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class EnquiryCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    message: str
    category: Optional[EnquiryCategory] = EnquiryCategory.GENERAL
    priority: Optional[EnquiryPriority] = EnquiryPriority.MEDIUM
    # Multi-tenancy fields
    franchise_code: Optional[str] = None
    franchise_id: Optional[str] = None
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v.strip()
    
    @validator('phone')
    def validate_phone(cls, v):
        if not v or not v.strip():
            raise ValueError('Phone number cannot be empty')
        # Remove spaces and special characters for validation
        phone_digits = ''.join(filter(str.isdigit, v))
        if len(phone_digits) < 10 or len(phone_digits) > 15:
            raise ValueError('Phone number must be between 10 and 15 digits')
        return v.strip()
    
    @validator('message')
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError('Message cannot be empty')
        if len(v.strip()) < 10:
            raise ValueError('Message must be at least 10 characters long')
        return v.strip()

class EnquiryResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    message: str
    category: str
    priority: str
    status: str
    admin_notes: Optional[str] = ""
    assigned_to: Optional[str] = None
    created_date: datetime
    updated_date: datetime
    resolved_date: Optional[datetime] = None
    response_count: int = 0
    # Multi-tenancy fields
    franchise_code: Optional[str] = None
    franchise_id: Optional[str] = None

class EnquiryUpdate(BaseModel):
    status: Optional[EnquiryStatus] = None
    priority: Optional[EnquiryPriority] = None
    category: Optional[EnquiryCategory] = None
    admin_notes: Optional[str] = None
    assigned_to: Optional[str] = None

class EnquiryFilter(BaseModel):
    status: Optional[EnquiryStatus] = None
    priority: Optional[EnquiryPriority] = None
    category: Optional[EnquiryCategory] = None
    assigned_to: Optional[str] = None
    email: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None

class EnquiryResponseCreate(BaseModel):
    enquiry_id: str
    admin_id: str
    admin_name: str
    response: str
    is_public: bool = True
    
    @validator('response')
    def validate_response(cls, v):
        if not v or not v.strip():
            raise ValueError('Response cannot be empty')
        return v.strip()

class EnquiryListResponse(BaseModel):
    enquiries: list[EnquiryResponse]
    total: int
    limit: int
    offset: int

class EnquirySuccessResponse(BaseModel):
    success: bool
    message: str
    enquiry_id: Optional[str] = None
    backup_location: Optional[str] = None