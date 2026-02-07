from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Dict, Any, List

class StudentCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Full Name")
    email: EmailStr = Field(..., description="Email Address")
    phone_number: str = Field(..., min_length=10, max_length=15, description="Phone Number")
    password: str = Field(..., min_length=6, description="Password")
    confirm_password: str = Field(..., min_length=6, description="Confirm Password")
    
    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('phone_number')
    def validate_phone_number(cls, v):
        # Remove any spaces, dashes, or parentheses
        cleaned = ''.join(char for char in v if char.isdigit())
        if len(cleaned) < 10 or len(cleaned) > 15:
            raise ValueError('Phone number must be between 10 and 15 digits')
        return cleaned

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None
    role: Optional[str] = "student"
    # Instructor-specific fields
    specialization: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    certifications: Optional[str] = None
    languages: Optional[str] = None
    instructor_roles: Optional[List[str]] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenVerify(BaseModel):
    token: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None

class SimpleResponse(BaseModel):
    success: bool
    message: str

class ForgotPassword(BaseModel):
    email: EmailStr

class UpdateProfile(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None

class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class VerifyOTP(BaseModel):
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP")

class ResetPasswordWithOTP(BaseModel):
    new_password: str = Field(..., min_length=6, description="New password")
    confirm_password: str = Field(..., min_length=6, description="Confirm new password")
    
    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v
