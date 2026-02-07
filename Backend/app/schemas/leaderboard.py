from pydantic import BaseModel
from typing import Optional

class LeaderboardEntry(BaseModel):
    student_id: str
    total_score: float
    quizzes_taken: int
    xp: Optional[int]
    rank: Optional[int]
