from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime

class QuestionCreate(BaseModel):
    """Schema for creating a new question"""
    question_text: str = Field(..., min_length=1, max_length=2000)
    explanation: Optional[str] = Field(None, max_length=1000)
    option_a: str = Field(..., min_length=1, max_length=500)
    option_b: str = Field(..., min_length=1, max_length=500) 
    option_c: str = Field(..., min_length=1, max_length=500)
    option_d: str = Field(..., min_length=1, max_length=500)
    correct_answer: str = Field(..., pattern="^[ABCD]$")
    subject: str = Field(..., min_length=1, max_length=100)
    course: str = Field(..., min_length=1, max_length=200)
    difficulty: str = Field(..., pattern="^(Easy|Medium|Hard)$")
    marks: int = Field(default=1, ge=1, le=10)

class QuestionUpdate(BaseModel):
    """Schema for updating an existing question"""
    question_text: Optional[str] = Field(None, min_length=1, max_length=2000)
    explanation: Optional[str] = Field(None, max_length=1000)
    option_a: Optional[str] = Field(None, min_length=1, max_length=500)
    option_b: Optional[str] = Field(None, min_length=1, max_length=500)
    option_c: Optional[str] = Field(None, min_length=1, max_length=500) 
    option_d: Optional[str] = Field(None, min_length=1, max_length=500)
    correct_answer: Optional[str] = Field(None, pattern="^[ABCD]$")
    subject: Optional[str] = Field(None, min_length=1, max_length=100)
    course: Optional[str] = Field(None, min_length=1, max_length=200)
    difficulty: Optional[str] = Field(None, pattern="^(Easy|Medium|Hard)$")
    marks: Optional[int] = Field(None, ge=1, le=10)

class QuestionResponse(BaseModel):
    """Schema for question response"""
    id: str
    question_text: str
    explanation: Optional[str] = None
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    subject: str
    course: str
    difficulty: str
    marks: int
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    updated_by: Optional[str] = None
    updated_at: Optional[str] = None
    branch_code: Optional[str] = None
    franchise_code: Optional[str] = None

    class Config:
        from_attributes = True