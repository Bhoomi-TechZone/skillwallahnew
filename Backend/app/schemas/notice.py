from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime

class NoticeCreate(BaseModel):
    title: str = Field(
        ..., 
        min_length=1, 
        max_length=200,
        description="Notice title is required",
        example="Important Announcement"
    )
    content: str = Field(
        ..., 
        min_length=1,
        description="Notice content is required", 
        example="This is the detailed content of the notice"
    )
    # Support both 'type' and 'category' fields
    type: Optional[str] = Field(
        default="announcement", 
        max_length=50,
        description="Type of notice (announcement, alert, info, etc.)",
        example="announcement"
    )
    category: Optional[str] = Field(
        default=None, 
        max_length=50,
        description="Category of notice",
        example="general"
    ) 
    priority: Optional[str] = Field(
        default="medium",
        description="Priority level (low, medium, high, urgent)",
        example="medium"
    )
    # Support both expiry date formats
    expiryDate: Optional[str] = Field(
        None,
        description="Expiry date in YYYY-MM-DD format",
        example="2025-12-31"
    )
    expires_at: Optional[datetime] = Field(
        None,
        description="Expiry datetime",
        example="2025-12-31T23:59:59"
    )
    # Optional fields that may be sent but not stored
    status: Optional[str] = Field(
        default="active",
        description="Status of the notice",
        example="active"
    )
    targetAudience: Optional[str] = Field(
        default="students",
        description="Target audience for the notice",
        example="students"
    )
    author: Optional[str] = Field(
        None,
        description="Author of the notice",
        example="John Doe"
    )
    isSticky: Optional[bool] = Field(
        default=False,
        description="Whether the notice should be pinned/sticky",
        example=False
    )
    
    @validator('title')
    def validate_title(cls, v):
        """Validate title field"""
        if not v or not v.strip():
            raise ValueError("Title cannot be empty. Please provide a valid title.")
        
        if len(v.strip()) < 1:
            raise ValueError("Title must be at least 1 character long.")
            
        if len(v) > 200:
            raise ValueError("Title cannot exceed 200 characters.")
            
        return v.strip()
    
    @validator('content')
    def validate_content(cls, v):
        """Validate content field"""
        if not v or not v.strip():
            raise ValueError("Content cannot be empty. Please provide notice content.")
        
        if len(v.strip()) < 1:
            raise ValueError("Content must be at least 1 character long.")
            
        return v.strip()
    
    @validator('priority')
    def validate_priority(cls, v):
        """Validate and map priority values with clear error messages"""
        if not v:
            return 'normal'
            
        # Map frontend priorities to backend priorities
        priority_mapping = {
            'low': 'low',
            'medium': 'normal', 
            'high': 'high',
            'urgent': 'urgent',
            'normal': 'normal'
        }
        
        mapped_priority = priority_mapping.get(v.lower())
        if not mapped_priority:
            valid_priorities = list(priority_mapping.keys())
            raise ValueError(
                f"Invalid priority '{v}'. Must be one of: {', '.join(valid_priorities)}"
            )
        
        return mapped_priority
    
    @validator('expires_at', pre=True, always=True)
    def parse_expiry_date(cls, v, values):
        """Parse expiry date with clear error messages"""
        # If expires_at is provided, use it
        if v:
            return v
        # If expiryDate is provided, parse it
        if 'expiryDate' in values and values['expiryDate']:
            try:
                # Parse date string to datetime
                return datetime.strptime(values['expiryDate'], '%Y-%m-%d')
            except ValueError:
                try:
                    # Try with datetime format
                    return datetime.fromisoformat(values['expiryDate'].replace('Z', '+00:00'))
                except ValueError:
                    raise ValueError(
                        f"Invalid date format for expiryDate '{values['expiryDate']}'. "
                        f"Please use YYYY-MM-DD format (e.g., 2025-12-31)"
                    )
        return None
    
    @validator('category', always=True)
    def set_category(cls, v, values):
        # Use 'type' field as 'category' if category is not provided
        if not v and values.get('type'):
            return values.get('type')
        return v or 'general'

class NoticeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    type: Optional[str] = Field(None, max_length=50)
    category: Optional[str] = Field(None, max_length=50)
    priority: Optional[str] = None
    expiryDate: Optional[str] = None
    expires_at: Optional[datetime] = None
    status: Optional[str] = None
    targetAudience: Optional[str] = None
    isSticky: Optional[bool] = None
    
    @validator('priority')
    def validate_priority(cls, v):
        if not v:
            return v
        # Map frontend priorities to backend priorities
        priority_mapping = {
            'low': 'low',
            'medium': 'normal', 
            'high': 'high',
            'urgent': 'urgent',
            'normal': 'normal'
        }
        return priority_mapping.get(v.lower(), 'normal')
    
    @validator('expires_at', pre=True, always=True)
    def parse_expiry_date(cls, v, values):
        # If expires_at is provided, use it
        if v:
            return v
        # If expiryDate is provided, parse it
        if 'expiryDate' in values and values['expiryDate']:
            try:
                return datetime.strptime(values['expiryDate'], '%Y-%m-%d')
            except ValueError:
                try:
                    return datetime.fromisoformat(values['expiryDate'].replace('Z', '+00:00'))
                except:
                    return None
        return None

class NoticeResponse(BaseModel):
    id: str
    title: str
    content: str
    category: str
    type: Optional[str] = None  # Allow type field in response
    priority: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    is_pinned: bool
    views: int
    expires_at: Optional[datetime] = None
    status: Optional[str] = "active"  # Default status
    targetAudience: Optional[str] = "students"  # Default target audience

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
