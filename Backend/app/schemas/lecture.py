from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)
    
    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")
        return field_schema

class LectureCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Title of the lecture")
    description: Optional[str] = Field(None, max_length=1000, description="Description of the lecture")
    course_id: str = Field(..., description="ID of the course this lecture belongs to")
    module_id: Optional[str] = Field(None, description="ID of the module this lecture belongs to")
    duration: Optional[str] = Field(None, description="Duration of the lecture (e.g., '1h 30m')")
    order: Optional[int] = Field(default=0, description="Order/sequence of the lecture in the module")
    tags: Optional[List[str]] = Field(default=[], description="Tags for categorizing the lecture")
    is_published: Optional[bool] = Field(default=False, description="Whether the lecture is published")
    # Multi-tenancy fields
    franchise_code: Optional[str] = None
    franchise_id: Optional[str] = None
    
    class Config:
        json_encoders = {ObjectId: str}

class LectureUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    module_id: Optional[str] = None
    duration: Optional[str] = None
    order: Optional[int] = None
    tags: Optional[List[str]] = None
    is_published: Optional[bool] = None
    # Multi-tenancy fields
    franchise_code: Optional[str] = None
    franchise_id: Optional[str] = None
    
    class Config:
        json_encoders = {ObjectId: str}

class LectureResponse(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    title: str
    description: Optional[str] = None
    course_id: str
    module_id: Optional[str] = None
    instructor_id: str
    video_file: Optional[str] = None
    duration: Optional[str] = None
    order: int = 0
    tags: List[str] = []
    is_published: bool = False
    uploaded_at: datetime
    updated_at: Optional[datetime] = None
    # Multi-tenancy fields
    franchise_code: Optional[str] = None
    franchise_id: Optional[str] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class LectureListResponse(BaseModel):
    lectures: List[LectureResponse]
    total: int
    course_id: str
    module_id: Optional[str] = None
    
    class Config:
        json_encoders = {ObjectId: str}