from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

class EnrollmentCreate(BaseModel):
    course_id: str = Field(..., description="Course ID to enroll in")
    payment_method: Optional[str] = Field(None, description="Payment method used")
    amount_paid: Optional[float] = Field(0, description="Amount paid for the course")
    # Multi-tenancy fields
    franchise_code: Optional[str] = Field(None, description="Franchise code for multi-tenant isolation")
    franchise_id: Optional[str] = Field(None, description="Franchise ID for multi-tenant isolation")

class EnrollmentResponse(BaseModel):
    success: bool
    message: str
    enrollment_id: Optional[str] = None
    course_title: Optional[str] = None