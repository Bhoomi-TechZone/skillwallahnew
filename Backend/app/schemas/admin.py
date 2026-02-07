from pydantic import BaseModel
from typing import Optional

class AdminUserUpdate(BaseModel):
    name: Optional[str]
    role: Optional[str]

class CertificateVerification(BaseModel):
    verified: bool
