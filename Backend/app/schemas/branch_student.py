from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Union
from datetime import datetime, date

class BranchStudentRegistration(BaseModel):
    """Student registration model for branch students"""
    # Personal Details - with aliases for frontend compatibility
    student_name: str = Field(..., min_length=2, max_length=100, alias='student_name')
    name: Optional[str] = Field(None, min_length=2, max_length=100)  # Backend compatibility
    email_id: Optional[EmailStr] = Field(None, alias='email_id')
    email: Optional[EmailStr] = Field(None)  # Backend compatibility
    contact_no: str = Field(..., min_length=10, max_length=15, alias='contact_no')
    phone: Optional[str] = Field(None, min_length=10, max_length=15)  # Backend compatibility
    whatsapp: Optional[str] = Field(None, min_length=10, max_length=15)
    address: Optional[str] = Field(None, max_length=500)
    
    # Academic Details - with aliases for backend compatibility
    branch_code: str = Field(..., description="Branch code", alias='branch_code')
    branchCode: Optional[str] = Field(None, description="Branch code")  # Backend compatibility
    course: str = Field(..., description="Course name")
    batch: Optional[str] = None
    course_category: Optional[str] = None
    
    # Registration Details - with aliases for backend compatibility
    admission_year: str = Field(..., description="Admission year", alias='admission_year')
    admissionYear: Optional[str] = Field(None, description="Admission year")  # Backend compatibility
    registration_number: Optional[str] = Field(None, description="Registration number")
    
    # Additional Fields
    password: Optional[str] = Field(None, min_length=6)
    father_name: Optional[str] = None
    parent_contact: Optional[str] = None
    date_of_birth: Optional[Union[str, date]] = None
    gender: Optional[str] = None
    qualification: Optional[str] = None
    last_general_qualification: Optional[str] = None
    
    # Extended personal details from frontend
    mother_name: Optional[str] = None
    marital_status: Optional[str] = None  
    category: Optional[str] = None
    identity_type: Optional[str] = None
    id_number: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    pincode: Optional[str] = None
    religion: Optional[str] = None
    
    # Course and financial details
    course_duration: Optional[str] = None
    duration: Optional[str] = None
    net_fee: Optional[float] = None
    discount: Optional[float] = None
    other_charges: Optional[float] = Field(None, alias='other_charges')
    other_charge: Optional[float] = Field(None)  # Alternative field name for compatibility
    date_of_admission: Optional[Union[str, date]] = None
    enquiry_source: Optional[str] = None
    admission_status: Optional[str] = None
    
    class Config:
        populate_by_name = True  # Allow both field names and aliases
        allow_population_by_field_name = True  # For Pydantic v1 compatibility
    
    # System Fields
    franchise_code: Optional[str] = None
    franchise_id: Optional[str] = None
    status: Optional[str] = "active"
    
    @validator('email_id', pre=True)
    def validate_email_id(cls, v):
        """Convert empty string to None for email validation"""
        if v == '' or v is None:
            return None
        return v
    
    @validator('email', pre=True)
    def validate_email(cls, v):
        """Convert empty string to None for email validation"""
        if v == '' or v is None:
            return None
        return v

class BranchStudentUpdate(BaseModel):
    """Student update model for branch students"""
    # Personal Details
    student_name: Optional[str] = Field(None, min_length=2, max_length=100)
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    contact_no: Optional[str] = Field(None, min_length=10, max_length=15)
    parent_contact: Optional[str] = Field(None, min_length=10, max_length=15)
    gender: Optional[str] = None
    category: Optional[str] = None
    religion: Optional[str] = None
    marital_status: Optional[str] = None
    identity_type: Optional[str] = None
    id_number: Optional[str] = None
    last_general_qualification: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = Field(None, max_length=500)
    pincode: Optional[str] = None
    email: Optional[str] = None
    
    # Academic Details
    branch_code: Optional[str] = None
    course: Optional[str] = None
    batch: Optional[str] = None
    course_category: Optional[str] = None
    
    # Financial Details
    net_fee: Optional[float] = None
    discount: Optional[float] = None
    other_charge: Optional[float] = None
    enquiry_source: Optional[str] = None
    
    # System Fields
    status: Optional[str] = None
    can_login: Optional[bool] = None

class BranchStudentResponse(BaseModel):
    """Student response model"""
    id: str
    registration_number: Optional[str] = None
    student_name: Optional[str] = None
    email_id: Optional[str] = None
    contact_no: Optional[str] = None
    whatsapp: Optional[str] = None
    address: Optional[str] = None
    
    # Academic Details
    branch_code: Optional[str] = None
    course: Optional[str] = None
    batch: Optional[str] = None
    course_category: Optional[str] = None
    
    # Registration Details
    admission_year: Optional[str] = None
    franchise_code: Optional[str] = None
    admission_status: Optional[str] = None
    created_at: Optional[str] = None
    
    # Additional Fields
    parentName: Optional[str] = None
    parentPhone: Optional[str] = None
    dateOfBirth: Optional[str] = None
    gender: Optional[str] = None
    qualification: Optional[str] = None
    
    # System Fields
    franchise_code: Optional[str] = None
    status: str = "active"
    can_login: bool = True
    updated_at: Optional[str] = None
    
    class Config:
        populate_by_name = True
        allow_population_by_field_name = True

class StudentListFilters(BaseModel):
    """Filters for student listing"""
    page: Optional[int] = Field(1, ge=1)
    limit: Optional[int] = Field(10, ge=1, le=100)
    search: Optional[str] = None
    course: Optional[str] = None
    batch: Optional[str] = None
    branchCode: Optional[str] = None
    status: Optional[str] = None
    admission_year: Optional[str] = None