from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import re

class CourseSchema(BaseModel):
    id: Union[str, int]
    title: str
    order: int
    completed: Optional[bool] = False
    
    @validator('id', pre=True)
    def convert_id_to_string(cls, v):
        return str(v)

class LearningPathCreateSchema(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=1000)
    category: str = Field(..., min_length=1, max_length=100)
    difficulty: str = Field(..., pattern=r"^(Beginner|Intermediate|Advanced)$")
    estimated_duration: str = Field(..., min_length=1, max_length=50)
    thumbnail: Optional[str] = None
    courses: List[CourseSchema] = []
    tags: List[str] = []
    status: str = Field(default="draft", pattern=r"^(draft|published)$")
    prerequisites: List[str] = []
    learning_outcomes: List[str] = []
    target_audience: Optional[str] = None
    certificate_template: Optional[str] = None

class LearningPathUpdateSchema(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=1000)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    difficulty: Optional[str] = Field(None, pattern=r"^(Beginner|Intermediate|Advanced)$")
    estimated_duration: Optional[str] = Field(None, min_length=1, max_length=50)
    thumbnail: Optional[str] = None
    courses: Optional[List[CourseSchema]] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = Field(None, pattern=r"^(draft|published)$")
    prerequisites: Optional[List[str]] = None
    learning_outcomes: Optional[List[str]] = None
    target_audience: Optional[str] = None
    certificate_template: Optional[str] = None

class LearningPathResponseSchema(BaseModel):
    id: Union[str, int]
    title: str
    description: str
    category: str
    difficulty: str
    estimated_duration: str
    thumbnail: Optional[str] = None
    courses: List[CourseSchema] = []
    tags: List[str] = []
    status: str
    prerequisites: List[str] = []
    learning_outcomes: List[str] = []
    target_audience: Optional[str] = None
    certificate_template: Optional[str] = None
    total_students: int = 0
    completion_rate: float = 0
    created_date: Optional[datetime] = None
    updated_date: Optional[datetime] = None
    
    @validator('id', pre=True)
    def convert_id_to_string(cls, v):
        return str(v)

    class Config:
        from_attributes = True
