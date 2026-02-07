from pydantic import BaseModel
from typing import List, Optional

class QuizSummary(BaseModel):
    quiz_id: str
    score: float
    graded: bool
    feedback: Optional[str]
    certificate_id: Optional[str]

class StudentDashboard(BaseModel):
    student_id: str
    quizzes: List[QuizSummary]
