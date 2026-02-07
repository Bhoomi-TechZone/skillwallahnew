from fastapi import APIRouter, Request
from app.schemas.review import ReviewCreate, ReviewUpdate
from app.services.review_service import (
    create_review, get_reviews_by_submission,
    update_review, delete_review
)

review_router = APIRouter(prefix="/reviews", tags=["Reviews"])

@review_router.post("/")
def add_review(request: Request, payload: ReviewCreate):
    db = request.app.mongodb
    return create_review(db, payload)

# Other review endpoints removed - only basic creation used in frontend


