from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import date
import re

class OwnerInfo(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: Optional[str] = None  # For updates

class Documents(BaseModel):
    pan_number: str = Field(..., min_length=10, max_length=10)
    aadhaar_number: Optional[str] = Field(None, min_length=12, max_length=12, description="12-digit Aadhaar number")
    gstin: Optional[str] = Field(None, min_length=15, max_length=15)
    
    @validator('aadhaar_number')
    def validate_aadhaar_number(cls, v):
        if v is not None and not v.isdigit():
            raise ValueError('Aadhaar number must contain only digits')
        return v

class Address(BaseModel):
    state: str
    district: Optional[str] = None
    city: str
    full_address: str
    pincode: str = Field(..., min_length=6, max_length=6, description="6-digit pincode")
    
    @validator('pincode')
    def validate_pincode(cls, v):
        if not v.isdigit():
            raise ValueError('Pincode must contain only digits')
        return v

class Territory(BaseModel):
    type: str = "City"
    value: Optional[str] = None

class Financial(BaseModel):
    franchise_fee: float
    revenue_share_percent: float = Field(..., ge=0, le=100, description="Revenue share percentage between 0-100")
    
    @validator('revenue_share_percent')
    def validate_revenue_share(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Revenue share percentage must be between 0 and 100')
        return v

class BankInfo(BaseModel):
    bank_name: str
    account_holder_name: str
    account_number: str = Field(..., min_length=1, max_length=20, description="Bank account number (numeric only)")
    ifsc_code: str
    
    @validator('account_number')
    def validate_account_number(cls, v):
        if not v.isdigit():
            raise ValueError('Account number must contain only digits')
        return v

class Agreement(BaseModel):
    start: Optional[date] = None
    end: Optional[date] = None

class FranchiseCreate(BaseModel):
    franchise_name: str
    entity_type: str = "Private Limited"
    legal_entity_name: str
    status: Optional[str] = "PENDING"
    
    # Flat fields for compatibility with current frontend
    owner_name: str
    owner_email: EmailStr
    owner_phone: str
    password: str
    
    pan_number: str = Field(..., min_length=10, max_length=10)
    aadhaar_number: Optional[str] = Field(None, min_length=12, max_length=12, description="12-digit Aadhaar number")
    gstin: Optional[str] = Field(None, min_length=15, max_length=15)
    
    state: str
    district: Optional[str] = None
    city: str
    full_address: str
    pincode: str = Field(..., min_length=6, max_length=6, description="6-digit pincode")
    
    territory_type: str = "City"
    
    franchise_fee: float
    revenue_share_percent: float = Field(..., ge=0, le=100, description="Revenue share percentage between 0-100")
    
    bank_name: str
    account_holder_name: str
    account_number: str = Field(..., min_length=1, max_length=20, description="Bank account number (numeric only)")
    ifsc_code: str
    
    agreement_start: date
    agreement_end: date
    
    @validator('pincode')
    def validate_pincode(cls, v):
        if not v.isdigit():
            raise ValueError('Pincode must contain only digits')
        return v
    
    @validator('account_number')
    def validate_account_number(cls, v):
        if not v.isdigit():
            raise ValueError('Account number must contain only digits')
        return v
    
    @validator('aadhaar_number')
    def validate_aadhaar_number(cls, v):
        if v is not None and not v.isdigit():
            raise ValueError('Aadhaar number must contain only digits')
        return v
    
    @validator('revenue_share_percent')
    def validate_revenue_share(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Revenue share percentage must be between 0 and 100')
        return v

class FranchiseUpdate(BaseModel):
    franchise_name: Optional[str] = None
    entity_type: Optional[str] = None
    legal_entity_name: Optional[str] = None
    status: Optional[str] = None
    
    owner: Optional[OwnerInfo] = None
    documents: Optional[Documents] = None
    address: Optional[Address] = None
    territory: Optional[Territory] = None
    financial: Optional[Financial] = None
    bank: Optional[BankInfo] = None
    agreement: Optional[Agreement] = None
