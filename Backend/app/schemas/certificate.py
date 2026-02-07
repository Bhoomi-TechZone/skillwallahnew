from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CertificateCreate(BaseModel):
    student_id: str
    quiz_id: str
    score: float
    passed: bool
    issued_on: Optional[str]
    # Multi-tenancy fields
    franchise_code: Optional[str] = None
    franchise_id: Optional[str] = None

class CertificateUpdate(BaseModel):
    verified: Optional[bool]

# New comprehensive certificate schema for admin-created certificates
class AdminCertificateCreate(BaseModel):
    studentId: str = Field(..., description="Student ID from dropdown selection")
    courseId: str = Field(..., description="Course ID from dropdown selection") 
    instructorId: str = Field(..., description="Instructor ID from dropdown selection")
    grade: str = Field(..., description="Grade (A+, A, B+, etc.)")
    score: float = Field(..., ge=0, le=100, description="Score percentage (0-100)")
    completionDate: str = Field(..., description="Course completion date (YYYY-MM-DD)")
    templateUsed: str = Field(..., description="Certificate template name")
    certificateNumber: Optional[str] = Field(None, description="Certificate number (auto-generated if not provided)")
    status: str = Field(default="pending", description="Certificate status (pending, issued, revoked)")
    # Multi-tenancy fields
    franchise_code: Optional[str] = None
    franchise_id: Optional[str] = None

class AdminCertificateResponse(BaseModel):
    id: str
    studentName: str
    studentEmail: str
    courseName: str
    instructorName: str
    certificateNumber: str
    grade: str
    score: float
    completionDate: str
    templateUsed: str
    status: str
    downloadCount: int = 0
    createdAt: datetime
    updatedAt: datetime

class CertificateListResponse(BaseModel):
    certificates: list[AdminCertificateResponse]
    total: int
