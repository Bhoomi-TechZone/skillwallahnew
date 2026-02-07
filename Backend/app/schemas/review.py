from pydantic import BaseModel, Field
from typing import Optional

class ReviewCreate(BaseModel):
    submission_id: str
    instructor_id: str
    grade: Optional[str] = None
    feedback: Optional[str] = None

class ReviewUpdate(BaseModel):
    grade: Optional[str] = None
    feedback: Optional[str] = None
