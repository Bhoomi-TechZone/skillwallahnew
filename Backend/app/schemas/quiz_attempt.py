from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime

class StudentAnswer(BaseModel):
    """Schema for individual student answer"""
    question_index: int  # Index of the question in the quiz
    question_id: Optional[str] = None  # Optional question ID
    student_answer: Any  # The answer provided by student
    is_correct: Optional[bool] = None  # Will be calculated during grading
    points_earned: Optional[int] = 0  # Points earned for this answer
    
class QuizAttemptCreate(BaseModel):
    quiz_id: str
    student_id: Optional[str] = None  # Will be set from token
    answers: List[StudentAnswer]  # List of student answers
    time_taken: Optional[int] = None  # Time taken in seconds
    
    # These will be calculated automatically
    score: Optional[int] = None
    total_questions: Optional[int] = None
    percentage: Optional[float] = None
    
class QuizAttemptUpdate(BaseModel):
    score: Optional[int] = None
    percentage: Optional[float] = None
    feedback: Optional[str] = None
    reviewed: Optional[bool] = None
    graded_by: Optional[str] = None
    graded_at: Optional[datetime] = None

class QuizAttemptResponse(BaseModel):
    """Schema for quiz attempt response"""
    id: str
    quiz_id: str
    student_id: str
    answers: List[StudentAnswer]
    score: int
    total_questions: int
    total_points: int
    points_earned: int
    percentage: float
    time_taken: Optional[int]
    is_passed: bool
    feedback: Optional[str]
    reviewed: bool
    submitted_at: datetime
    graded_at: Optional[datetime]
    
    @validator('id', pre=True)
    def convert_object_id(cls, v):
        return str(v)

class QuizGradingRequest(BaseModel):
    """Schema for manual grading of subjective questions"""
    attempt_id: str
    question_index: int
    points_awarded: int
    feedback: Optional[str] = None
    
class QuizResultsSummary(BaseModel):
    """Schema for quiz results summary"""
    quiz_id: str
    quiz_title: str
    total_attempts: int
    average_score: float
    pass_rate: float
    highest_score: int
    lowest_score: int
    completion_time_avg: Optional[float] = None
