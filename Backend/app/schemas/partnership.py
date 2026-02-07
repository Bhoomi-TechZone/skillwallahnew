from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional
import re

class PartnershipRequest(BaseModel):
    organizationName: str = Field(..., title="Organization Name")
    organizationType: str = Field(..., title="Type of Organization")
    website: Optional[str] = Field(None, title="Website/Social Link")
    contactName: str = Field(..., title="Contact Person Name")
    designation: str = Field(..., title="Designation/Role")
    email: EmailStr = Field(..., title="Email Address")
    phone: Optional[str] = Field(None, title="Phone Number")
    collaborationAreas: List[str] = Field(default_factory=list, title="Collaboration Areas")
    message: Optional[str] = Field(None, title="Message/Proposal")
    agreedToContact: bool = Field(..., title="Agreement to Contact")
    
    @validator('website')
    def validate_website(cls, v):
        if v is None:
            return v
        # Basic URL validation
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
            r'localhost|'  # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        if not url_pattern.match(v):
            raise ValueError('Invalid URL format')
        return v
