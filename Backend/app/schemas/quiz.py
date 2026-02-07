from pydantic import BaseModel, Field, validator
from typing import Optional, List, Union, Dict, Any
from datetime import datetime

class QuestionSchema(BaseModel):
    """Schema for individual question within a quiz"""
    type: str = Field(..., pattern="^(mcq|true_false|fill_blanks|subjective)$")
    question: str = Field(..., min_length=1)
    options: Optional[List[str]] = None  # For MCQ questions
    correct_answer: Optional[Union[str, List[str], bool]] = None  # The correct answer - now accepts bool for true_false
    expected_answer: Optional[str] = None  # For subjective questions
    points: Optional[int] = Field(default=1, ge=1)  # Points for this question
    explanation: Optional[str] = None  # Optional explanation for the answer
    
    @validator('options')
    def validate_options(cls, v, values):
        if values.get('type') == 'mcq' and (not v or len(v) < 2):
            raise ValueError('MCQ questions must have at least 2 options')
        return v
    
    @validator('correct_answer')
    def validate_correct_answer(cls, v, values):
        question_type = values.get('type')
        
        # For true_false questions, validate the answer format
        if question_type == 'true_false':
            if v is None:
                raise ValueError('True/False questions must have a correct answer')
            # Accept both boolean and string representations
            if isinstance(v, bool):
                return v
            if isinstance(v, str) and str(v).lower() in ['true', 'false']:
                return str(v).lower() == 'true'
            raise ValueError('True/False questions must have "true" or "false" as correct answer')
        
        # For MCQ questions, answer is required
        elif question_type == 'mcq':
            if v is None or v == '':
                raise ValueError('MCQ questions must have a correct answer')
        
        # For fill_blanks questions, answer is required
        elif question_type == 'fill_blanks':
            if v is None or str(v).strip() == '':
                raise ValueError('Fill in the blanks questions must have a correct answer')
        
        # For subjective questions, correct_answer can be None (use expected_answer instead)
        
        return v

class QuizCreate(BaseModel):
    course_id: str
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    quiz_guidelines: Optional[str] = Field(None, max_length=1000)
    quiz_type: str = Field(..., pattern="^(mcq|true_false|fill_blanks|subjective)$")
    duration_minutes: Optional[int] = Field(None, ge=1, le=480)  # Max 8 hours
    max_attempts: Optional[int] = Field(None, ge=1, le=10)
    questions: List[QuestionSchema] = Field(..., min_items=1)  # Questions included in quiz creation
    passing_score: Optional[int] = Field(default=70, ge=0, le=100)  # Percentage needed to pass
    is_active: Optional[bool] = Field(default=True)
    randomize_questions: Optional[bool] = Field(default=False)
    show_results_immediately: Optional[bool] = Field(default=True)
    created_by: Optional[str] = None  # Will be set from token
    # Multi-tenancy fields
    franchise_code: Optional[str] = None
    franchise_id: Optional[str] = None
    
    @validator('questions')
    def validate_questions_basic(cls, v, values):
        # Basic validation for questions - removed strict type matching
        # to allow mixed question types in a quiz
        if not v or len(v) == 0:
            raise ValueError('At least one question is required')
        return v

class QuestionCreate(BaseModel):
    quiz_id: str
    type: str = Field(..., pattern="^(mcq|true_false|fill_blanks|subjective)$")
    question: str = Field(..., min_length=1)
    options: Optional[List[str]] = None
    correct_answer: Union[str, List[str], bool]  # Now accepts bool for true_false questions
    expected_answer: Optional[str] = None
    points: Optional[int] = Field(default=1, ge=1)
    explanation: Optional[str] = None

class QuizUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    quiz_guidelines: Optional[str] = Field(None, max_length=1000)
    duration_minutes: Optional[int] = Field(None, ge=1, le=480)
    max_attempts: Optional[int] = Field(None, ge=1, le=10)
    passing_score: Optional[int] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None
    randomize_questions: Optional[bool] = None
    show_results_immediately: Optional[bool] = None

class QuizResponse(BaseModel):
    """Schema for quiz response with all details"""
    id: str
    course_id: str
    title: str
    description: Optional[str]
    quiz_guidelines: Optional[str]
    quiz_type: str
    duration_minutes: Optional[int]
    max_attempts: Optional[int]
    questions: List[QuestionSchema]
    passing_score: int
    is_active: bool
    randomize_questions: bool
    show_results_immediately: bool
    created_by: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    total_questions: int
    total_points: int
    
    @validator('id', pre=True)
    def convert_object_id(cls, v):
        return str(v)

class StudentQuizResponse(BaseModel):
    """Schema for quiz response to students (without correct answers)"""
    id: str
    course_id: str
    title: str
    description: Optional[str]
    quiz_guidelines: Optional[str]
    quiz_type: str
    duration_minutes: Optional[int]
    max_attempts: Optional[int]
    questions: List[Dict[str, Any]]  # Questions without correct answers
    passing_score: int
    is_active: bool
    total_questions: int
    total_points: int
