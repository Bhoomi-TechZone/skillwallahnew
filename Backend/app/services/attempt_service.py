
from bson import ObjectId
from fastapi.encoders import jsonable_encoder
from app.models.attempt import get_attempt_collection
from app.models.quiz import get_question_collection


def submit_quiz_attempt(db, payload):
    """
    Insert a new quiz attempt into MongoDB after grading it.
    Ensures answers (Pydantic models) are converted to dicts.
    """

    # Convert answers from Pydantic objects to dicts
    answers_map = {ans.question_id: ans.selected_answer for ans in payload.answers}
    answers_list = [ans.dict() if hasattr(ans, 'dict') else ans for ans in payload.answers]

    # Fetch questions for grading
    questions = get_question_collection(db).find({"quiz_id": payload.quiz_id})

    score = 0
    total = 0

    for q in questions:
        if q.get("question_type") in ["mcq", "true_false", "fill_blanks"]:
            total += 1
            if answers_map.get(str(q["_id"])) == q.get("correct_answer"):
                score += 1

    # Build the attempt document
    attempt_doc = {
        "student_id": str(payload.student_id),
        "quiz_id": str(payload.quiz_id),
        "answers": answers_list,  # ✅ now safe for MongoDB
        "score": score,
        "graded": True,
    }

    # Use jsonable_encoder to ensure everything is BSON compatible
    attempt_doc = jsonable_encoder(attempt_doc)

    # Insert into DB
    collection = get_attempt_collection(db)
    result = collection.insert_one(attempt_doc)

    return {
        "success": True,
        "attempt_id": str(result.inserted_id),
        "score": score,
        "total": total
    }


def list_attempts(db, quiz_id):
    """Retrieve all attempts for a given quiz_id."""
    return list(get_attempt_collection(db).find({"quiz_id": str(quiz_id)}))


def update_attempt_feedback(db, attempt_id, payload):
    """
    Update feedback for a specific attempt.
    """
    collection = get_attempt_collection(db)
    result = collection.update_one(
        {"_id": ObjectId(attempt_id)},
        {"$set": payload.dict(exclude_unset=True)}
    )
    return {"updated": result.modified_count > 0}
