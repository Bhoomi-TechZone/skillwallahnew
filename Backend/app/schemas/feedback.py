from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class FeedbackType(str, Enum):
    COURSE = "course"
    ASSIGNMENT = "assignment" 
    QUIZ = "quiz"
    INSTRUCTOR = "instructor"

class FeedbackStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed" 
    OVERDUE = "overdue"

class FeedbackCreate(BaseModel):
    user_id: str
    target_type: FeedbackType
    target_id: str  # ID of course, assignment, quiz, etc.
    target_title: str  # Title/name of the target
    instructor_id: Optional[str] = None  # Made optional since frontend may not have it
    instructor_name: str
    course_id: Optional[str] = None  # For non-course feedback
    course_name: Optional[str] = None
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=2000)
    categories: Optional[List[str]] = []  # e.g., ['content_quality', 'instructor_performance']
    category_ratings: Optional[Dict[str, int]] = {}  # Category-specific ratings
    completed_date: Optional[datetime] = None  # When the course/assignment was completed
    attended_date: Optional[datetime] = None
    submitted_date: Optional[datetime] = None  # For assignments
    due_date: Optional[datetime] = None
    
    @validator('rating')
    @classmethod
    def validate_rating(cls, v):
        if not (1 <= v <= 5):
            raise ValueError('Rating must be between 1 and 5')
        return v
    
    @validator('category_ratings')
    @classmethod
    def validate_category_ratings(cls, v):
        if v:
            for category, rating in v.items():
                if not (1 <= rating <= 5):
                    raise ValueError(f'Category rating for {category} must be between 1 and 5')
        return v

class FeedbackUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=2000)
    category_ratings: Optional[Dict[str, int]] = {}
    status: Optional[FeedbackStatus] = None
    
    @validator('rating')
    @classmethod
    def validate_rating(cls, v):
        if v is not None and not (1 <= v <= 5):
            raise ValueError('Rating must be between 1 and 5')
        return v
    
    @validator('category_ratings')
    @classmethod
    def validate_category_ratings(cls, v):
        if v:
            for category, rating in v.items():
                if not isinstance(rating, int) or not (1 <= rating <= 5):
                    raise ValueError(f'Category rating for {category} must be an integer between 1 and 5')
        return v

class FeedbackOut(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_avatar: Optional[str] = None
    student_name: Optional[str] = None  # For instructor view
    student_email: Optional[str] = None  # For instructor view
    student_avatar: Optional[str] = None  # For instructor view
    target_type: str
    target_id: str
    target_title: str
    instructor_id: Optional[str] = None
    instructor_name: str
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    rating: Optional[int] = None  # Allow None for pending feedback
    comment: Optional[str] = None
    categories: List[str] = []
    category_ratings: Dict[str, int] = {}
    status: str
    completed_date: Optional[datetime] = None
    attended_date: Optional[datetime] = None
    submitted_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    created_date: Optional[datetime] = None
    updated_date: Optional[datetime] = None
    date: Optional[str] = None  # Formatted date string for frontend
    has_response: bool = False
    instructor_response: Optional[str] = None
    response: Optional[str] = None  # Alias for instructor_response
    instructor_response_date: Optional[datetime] = None
    response_date: Optional[str] = None  # Formatted response date for frontend
    # Admin-specific fields
    userName: Optional[str] = None
    userEmail: Optional[str] = None
    userAvatar: Optional[str] = None
    courseName: Optional[str] = None
    instructorName: Optional[str] = None
    title: Optional[str] = None
    createdDate: Optional[str] = None
    helpful: int = 0
    reported: int = 0
    type: Optional[str] = None  # For admin view (course_review, instructor_review, etc.)

class FeedbackRequestCreate(BaseModel):
    """For creating feedback requests when students complete activities"""
    user_id: str
    target_type: FeedbackType
    target_id: str
    target_title: str
    instructor_id: Optional[str] = None  # Made optional
    instructor_name: str
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    categories: List[str] = []
    completed_date: Optional[datetime] = None
    attended_date: Optional[datetime] = None
    submitted_date: Optional[datetime] = None
    due_date: Optional[datetime] = None  # When feedback is due

class FeedbackResponseCreate(BaseModel):
    """For instructor responses to feedback"""
    feedback_id: str
    instructor_id: str
    response: str = Field(..., max_length=1000)

class FeedbackFilter(BaseModel):
    user_id: Optional[str] = None
    instructor_id: Optional[str] = None
    course_id: Optional[str] = None
    target_type: Optional[FeedbackType] = None
    status: Optional[FeedbackStatus] = None
    min_rating: Optional[int] = Field(None, ge=1, le=5)
    max_rating: Optional[int] = Field(None, ge=1, le=5)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class FeedbackAnalytics(BaseModel):
    total_feedback: int
    pending_feedback: int
    completed_feedback: int
    average_rating: float
    rating_distribution: Dict[str, int]  # {"1": 10, "2": 5, ...}
    feedback_by_type: Dict[str, int]  # {"course": 50, "assignment": 30, ...}
    monthly_trends: Dict[str, Any]
    response_rate: Optional[float] = None  # For instructor analytics
    course_breakdown: Optional[List[Dict[str, Any]]] = None  # For instructor analytics

class InstructorFeedbackAnalytics(BaseModel):
    """Analytics specifically for instructor feedback view"""
    total_feedback: int
    average_rating: float
    response_rate: float
    rating_distribution: Dict[str, int]
    course_breakdown: List[Dict[str, Any]]

class AdminFeedbackAnalytics(BaseModel):
    """Analytics for admin feedback dashboard"""
    totalReviews: int
    averageRating: float
    ratingDistribution: Dict[str, int]
    monthlyTrends: Dict[str, List]
    feedbackByType: Dict[str, int]
    pendingReviews: int
    flaggedReviews: int
