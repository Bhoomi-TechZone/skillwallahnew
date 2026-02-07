from pydantic import BaseModel, Field, validator
from typing import Optional, List

class ModuleCreate(BaseModel):
    name: str = Field(..., min_length=1, description="Module name")
    title: Optional[str] = None  # Keep for backward compatibility
    description: Optional[str] = None
    content: Optional[str] = None
    order: int = Field(1, ge=1)
    
    @validator('title', pre=True, always=True)
    def set_title_from_name(cls, v, values):
        """Use name as title if title not provided"""
        return v or values.get('name')

class ModuleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    order: Optional[int] = Field(None, ge=1)

class ModuleResponse(BaseModel):
    id: str
    course_id: str
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    order: int
    lessons_count: Optional[int] = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
