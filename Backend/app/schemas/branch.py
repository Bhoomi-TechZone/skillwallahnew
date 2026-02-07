from pydantic import BaseModel, EmailStr
from datetime import date

class BranchCreate(BaseModel):
    franchise_code: str | None = None  # Optional, will be taken from authenticated user

    # Centre Information
    code: str | None = None  # Optional, will be auto-generated if not provided
    territory_type: str  # Territory type: state_level, district_level, city_level, master_level
    centre_name: str
    society_trust_company: str
    registration_number: str
    registration_year: str
    centre_address: str
    state: str
    district: str
    office_contact: str
    date_of_joining: date

    # Centre Head Profile
    name: str
    gender: str
    mobile: str
    email: EmailStr
    password: str  # Login password for branch admin
    address: str
    address_proof_type: str
    id_number: str
    logo_url: str | None = None

class BranchLogin(BaseModel):
    """Branch admin login model"""
    email: EmailStr
    password: str

class BranchLoginResponse(BaseModel):
    """Branch admin login response model"""
    success: bool
    message: str
    access_token: str | None = None
    token_type: str = "bearer"
    user: dict | None = None
    expires_in: int | None = None
