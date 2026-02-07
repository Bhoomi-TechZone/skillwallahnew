from pydantic import BaseModel, Field, validator
from typing import Optional, List, Literal
from datetime import datetime
from decimal import Decimal

class LectureContent(BaseModel):
    filename: str
    original_name: str
    file_path: str
    file_size: int
    content_type: str
    upload_date: Optional[datetime] = None

class PDFContent(BaseModel):
    filename: str
    original_name: str
    file_path: str
    file_size: int
    content_type: str
    upload_date: Optional[datetime] = None

class LectureContent(BaseModel):
    filename: str
    original_name: str
    file_path: str
    file_size: int
    content_type: str
    upload_date: datetime

class PDFContent(BaseModel):
    filename: str
    original_name: str
    file_path: str
    file_size: int
    content_type: str
    upload_date: datetime

class CourseCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    instructor: str                    # instructor user ID
    instructor_name: Optional[str] = None
    price: float = Field(0.0, ge=0)   # must be >= 0
    original_price: Optional[float] = Field(None, ge=0)
    thumbnail: Optional[str] = None
    category: str = Field(..., min_length=1)
    duration: Optional[str] = None    # e.g., "24 hours"
    lessons: Optional[int] = Field(None, ge=0)
    level: Optional[str] = Field("Beginner")
    language: Optional[str] = "English"
    # Multi-tenancy fields
    franchise_code: Optional[str] = Field(None, description="Franchise code for multi-tenant isolation")
    franchise_id: Optional[str] = Field(None, description="Franchise ID for multi-tenant isolation")
    tags: Optional[List[str]] = []
    published: bool = False
    status: Optional[str] = Field("Active", description="Course status: Active, Pending, Rejected")
    created_by: Optional[str] = None
    created_by_role: Optional[str] = None
    commission_type: Literal["percentage", "fixed"] = Field("percentage", description="Commission calculation method")
    commission_value: float = Field(0.0, ge=0, le=100, description="Commission value (percentage 0-100 or fixed amount)")
    
    @validator('commission_value')
    @classmethod
    def validate_commission_value(cls, v, values):
        commission_type = values.get('commission_type', 'percentage')
        if commission_type == 'percentage' and v > 100:
            raise ValueError('Commission percentage must be between 0 and 100')
        return v
    
    @validator('status')
    @classmethod
    def validate_status(cls, v):
        if v and v not in ["Active", "Pending", "Rejected"]:
            raise ValueError('Status must be one of: Active, Pending, Rejected')
        return v
    
    @validator('level')
    @classmethod
    def validate_level(cls, v):
        if v not in ["Beginner", "Intermediate", "Advanced"]:
            raise ValueError('Level must be one of: Beginner, Intermediate, Advanced')
        return v
    
    @validator('original_price')
    @classmethod
    def validate_original_price(cls, v, values):
        # Allow original price to be different from current price
        # This handles cases where prices may have been adjusted over time
        if v is not None and v < 0:
            raise ValueError('Original price must be greater than or equal to 0')
        return v

class CourseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    price: Optional[float] = Field(None, ge=0)
    original_price: Optional[float] = Field(None, ge=0)
    thumbnail: Optional[str] = None
    category: Optional[str] = None
    duration: Optional[str] = None
    lessons: Optional[int] = Field(None, ge=0)
    level: Optional[str] = None
    language: Optional[str] = None
    tags: Optional[List[str]] = None
    published: Optional[bool] = None
    status: Optional[str] = None
    commission_type: Optional[Literal["percentage", "fixed"]] = None
    commission_value: Optional[float] = Field(None, ge=0)
    
    @validator('commission_value')
    @classmethod
    def validate_commission_value(cls, v, values):
        if v is not None:
            commission_type = values.get('commission_type', 'percentage')
            if commission_type == 'percentage' and v > 100:
                raise ValueError('Commission percentage must be between 0 and 100')
        return v
    
    @validator('level')
    @classmethod
    def validate_level(cls, v):
        if v is not None and v not in ["Beginner", "Intermediate", "Advanced"]:
            raise ValueError('Level must be one of: Beginner, Intermediate, Advanced')
        return v
    
    @validator('original_price')
    @classmethod
    def validate_original_price(cls, v, values):
        # Allow original price to be different from current price
        # This handles cases where prices may have been adjusted over time
        if v is not None and v < 0:
            raise ValueError('Original price must be greater than or equal to 0')
        return v

class CourseOut(BaseModel):
    id: str
    course_id: Optional[str] = None  # Generated course ID (e.g., AMIT001)
    title: str
    description: Optional[str]
    instructor: str
    instructor_name: Optional[str]
    price: float
    original_price: Optional[float]
    thumbnail: Optional[str]
    category: str
    duration: Optional[str]
    lessons: Optional[int]
    level: str
    language: str
    tags: List[str]
    published: bool
    status: Optional[str] = "Active"
    enrolled_students: Optional[int] = 0
    rating: Optional[float] = 0.0
    total_ratings: Optional[int] = 0
    revenue: Optional[float] = 0.0
    commission_type: Optional[str] = "percentage"
    commission_value: Optional[float] = 0.0
    instructor_earn: Optional[float] = 0.0
    platform_earn: Optional[float] = 0.0
    lectures: Optional[List[LectureContent]] = []
    pdfs: Optional[List[PDFContent]] = []
    created_date: Optional[datetime] = None
    last_updated: Optional[datetime] = None

class CourseFilter(BaseModel):
    category: Optional[str] = None
    level: Optional[str] = None
    published: Optional[bool] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    search: Optional[str] = None
    instructor: Optional[str] = None
