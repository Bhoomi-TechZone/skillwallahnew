from fastapi import APIRouter, Request
from app.schemas.attempt import QuizAttemptCreate, QuizAttemptUpdate
from app.services.attempt_service import submit_quiz_attempt, list_attempts, update_attempt_feedback

attempt_router = APIRouter(prefix="/quiz-attempts", tags=["Quiz Attempts"])

@attempt_router.post("/")
def submit_attempt(request: Request, payload: QuizAttemptCreate):
    db = request.app.mongodb
    return submit_quiz_attempt(db, payload)

# Unused endpoints removed - get attempts and update not used in frontend


