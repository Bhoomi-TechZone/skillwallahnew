from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class Course(BaseModel):
    id: str
    title: str
    order: int
    completed: Optional[bool] = False

class LearningPath(BaseModel):
    id: Optional[str] = None
    title: str
    description: str
    category: str
    difficulty: str  # Beginner, Intermediate, Advanced
    estimated_duration: str
    thumbnail: Optional[str] = None
    courses: List[Course] = []
    tags: List[str] = []
    status: str = "draft"  # draft, published
    prerequisites: List[str] = []
    learning_outcomes: List[str] = []
    target_audience: Optional[str] = None
    certificate_template: Optional[str] = None
    total_students: int = 0
    completion_rate: float = 0
    created_date: Optional[datetime] = None
    updated_date: Optional[datetime] = None

    class Config:
        from_attributes = True

class LearningPathCreate(BaseModel):
    title: str
    description: str
    category: str
    difficulty: str
    estimated_duration: str
    thumbnail: Optional[str] = None
    courses: List[Course] = []
    tags: List[str] = []
    status: str = "draft"
    prerequisites: List[str] = []
    learning_outcomes: List[str] = []
    target_audience: Optional[str] = None
    certificate_template: Optional[str] = None

class LearningPathUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    estimated_duration: Optional[str] = None
    thumbnail: Optional[str] = None
    courses: Optional[List[Course]] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    prerequisites: Optional[List[str]] = None
    learning_outcomes: Optional[List[str]] = None
    target_audience: Optional[str] = None
    certificate_template: Optional[str] = None

def get_learning_paths_collection(db):
    """Get the learning paths collection with proper indexing"""
    collection = db["learning_paths"]
    return collection