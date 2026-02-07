from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

class AssignmentCreate(BaseModel):
    model_config = ConfigDict(
        # Allow extra fields that might come from the database
        extra="allow",
        # Use enum values directly
        use_enum_values=True,
        # Allow population by field name
        populate_by_name=True,
        # Handle arbitrary types like ObjectId
        arbitrary_types_allowed=True
    )
    
    title: str = Field(..., min_length=3)
    description: Optional[str] = None
    instructions: Optional[str] = None
    type: str = Field(default="exercise")  # exercise, project, quiz, essay
    max_points: int = Field(..., gt=0)
    due_date: str  # ISO format date string
    course_id: str
    instructor_id: Optional[str] = None  # Will be set from token
    assigned_students: List[str] = Field(default_factory=list)  # List of student IDs
    visibility: str = Field(default="draft")  # draft, published
    estimated_time: Optional[float] = None  # Hours
    attachment_file: Optional[str] = None  # File path
    questions_pdf_path: Optional[str] = None  # Backward compatibility
    status: str = Field(default="draft")  # draft, published, archived
    created_date: Optional[datetime] = None
    # Multi-tenancy fields
    franchise_code: Optional[str] = None
    franchise_id: Optional[str] = None

class AssignmentUpdate(BaseModel):
    model_config = ConfigDict(
        extra="allow",
        use_enum_values=True,
        populate_by_name=True,
        arbitrary_types_allowed=True
    )
    
    title: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    type: Optional[str] = None
    max_points: Optional[int] = None
    due_date: Optional[str] = None
    course_id: Optional[str] = None
    assigned_students: Optional[List[str]] = None
    visibility: Optional[str] = None
    status: Optional[str] = None
    # Multi-tenancy fields
    franchise_code: Optional[str] = None
    franchise_id: Optional[str] = None
    estimated_time: Optional[float] = None
    attachment_file: Optional[str] = None
    questions_pdf_path: Optional[str] = None

class AssignmentResponse(BaseModel):
    model_config = ConfigDict(
        extra="allow",
        use_enum_values=True,
        populate_by_name=True,
        arbitrary_types_allowed=True
    )
    
    id: str
    title: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    type: str
    max_points: int
    due_date: str
    course_id: str
    course_name: Optional[str] = None
    instructor_id: str
    assigned_students: List[str] = Field(default_factory=list)
    visibility: str
    estimated_time: Optional[float] = None
    attachment_file: Optional[str] = None
    questions_pdf_path: Optional[str] = None
    status: str
    created_date: Optional[Any] = None  # Can be datetime or string
    updated_date: Optional[Any] = None  # Can be datetime or string
    submissions: int = 0
    graded: int = 0
    avg_score: float = 0.0
