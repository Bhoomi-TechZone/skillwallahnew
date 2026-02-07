from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    created_at: Optional[str] = None
    last_login: Optional[str] = None

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field(..., pattern="^(student|instructor|admin)$")
    # Multi-tenancy fields
    franchise_code: Optional[str] = Field(None, description="Franchise code for multi-tenant isolation")
    franchise_id: Optional[str] = Field(None, description="Franchise ID for multi-tenant isolation")

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2)
    role: Optional[str] = Field(None)

class UserResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
