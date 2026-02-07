from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class InstructorCreate(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None
    specialization: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    certifications: Optional[str] = None
    languages: Optional[str] = None
    instructor_roles: Optional[List[str]] = []

class InstructorResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    role: str = "instructor"
    specialization: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    certifications: Optional[str] = None
    languages: Optional[str] = None
    instructor_roles: List[str] = []
    status: str = "active"
    courses: List[str] = []
    students_count: int = 0
    rating: float = 0.0
    reviews_count: int = 0
    total_earnings: float = 0.0
    monthly_earnings: float = 0.0
    completion_rate: float = 0.0
    response_time: str = "N/A"
    profile_complete: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class InstructorUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    certifications: Optional[str] = None
    languages: Optional[str] = None
    instructor_roles: Optional[List[str]] = None
    status: Optional[str] = None
