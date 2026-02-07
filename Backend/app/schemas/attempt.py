from pydantic import BaseModel, Field
from typing import List, Optional

class AttemptAnswer(BaseModel):
    question_id: str
    selected_answer: Optional[str]  # or list if multi-select

class QuizAttemptCreate(BaseModel):
    student_id: str
    quiz_id: str
    answers: List[AttemptAnswer]

class QuizAttemptUpdate(BaseModel):
    score: Optional[float]
    feedback: Optional[str]
    graded: bool = False
