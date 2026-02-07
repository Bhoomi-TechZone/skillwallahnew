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

class PDFMaterialCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Title of the PDF material")
    description: Optional[str] = Field(None, max_length=1000, description="Description of the PDF material")
    course_id: str = Field(..., description="ID of the course this PDF belongs to")
    module_id: Optional[str] = Field(None, description="ID of the module this PDF belongs to")
    tags: Optional[List[str]] = Field(default=[], description="Tags for categorizing the PDF")
    is_downloadable: bool = Field(default=True, description="Whether students can download this PDF")
    
    class Config:
        json_encoders = {ObjectId: str}

class PDFMaterialUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    module_id: Optional[str] = None
    tags: Optional[List[str]] = None
    is_downloadable: Optional[bool] = None
    
    class Config:
        json_encoders = {ObjectId: str}

class PDFMaterialResponse(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    title: str
    description: Optional[str] = None
    course_id: str
    module_id: Optional[str] = None
    instructor_id: str
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    tags: List[str] = []
    is_downloadable: bool = True
    uploaded_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class PDFMaterialListResponse(BaseModel):
    materials: List[PDFMaterialResponse]
    total: int
    page: int
    page_size: int
    
    class Config:
        json_encoders = {ObjectId: str}