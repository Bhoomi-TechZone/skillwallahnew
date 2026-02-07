import logging
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class DonationModel(BaseModel):
    id: Optional[str] = None  # Remove alias, make optional
    donor_name: str
    donor_email: str
    donor_phone: Optional[str] = None
    amount: int
    currency: str = "INR"
    campaign_id: str
    provider: str
    status: str = "created"
    provider_order_id: Optional[str] = None
    payment_id: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "donor_name": "Arzu Mehreen",
                "donor_email": "arzu@example.com",
                "donor_phone": "9876543210",
                "amount": 500,
                "currency": "INR",
                "campaign_id": "64f7c8f5a2b3d5c8e4f1d2a1",
                "provider": "razorpay",
                "status": "created"
            }
        }
        allow_population_by_field_name = True


class CourseEnrollmentInit(BaseModel):
    student_name: str
    student_email: str
    student_phone: Optional[str] = None
    amount: int   # in INR (100 = 100 INR)
    course_id: str
    currency: str = "INR"
    provider: str = "razorpay"

    class Config:
        json_schema_extra = {
            "example": {
                "student_name": "Arzu Mehreen",
                "student_email": "arzu@example.com",
                "student_phone": "9876543210",
                "amount": 5000,
                "course_id": "64f7c8f5a2b3d5c8e4f1d2a1",
                "currency": "INR",
                "provider": "razorpay"
            }
        }






# -------------------------
# Course Enrollment Response
# -------------------------
class CourseEnrollmentResponse(BaseModel):
    enrollment_id: str
    provider: str
    razorpay_order_id: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    client_secret: Optional[str] = None
    amount: int
    currency: str
    course_id: str
    course_name: str

    class Config:
        json_schema_extra = {
            "example": {
                "enrollment_id": "64f7c8f5a2b3d5c8e4f1d2a1",
                "provider": "razorpay",
                "razorpay_order_id": "order_9A33XWu170gUtm",
                "razorpay_key_id": "rzp_test_xxxxxxxx",
                "client_secret": None,
                "amount": 5000,
                "currency": "INR",
                "course_id": "64f7c8f5a2b3d5c8e4f1d2a1",
                "course_name": "Complete Python Course"
            }
        }


# -------------------------
# Donation Verify Request
# -------------------------
class CourseEnrollmentVerifyRequest(BaseModel):
    enrollment_id: str
    order_id: str
    payment_id: str
    signature: str

