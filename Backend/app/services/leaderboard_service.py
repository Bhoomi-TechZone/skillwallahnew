from app.models.attempt import get_attempt_collection

def generate_leaderboard(db, top_n=10):
    pipeline = [
        {
            "$group": {
                "_id": "$student_id",
                "total_score": {"$sum": "$score"},
                "quizzes_taken": {"$sum": 1}
            }
        },
        {"$sort": {"total_score": -1}},
        {"$limit": top_n}
    ]
    result = get_attempt_collection(db).aggregate(pipeline)
    
    leaderboard = []
    for idx, entry in enumerate(result, start=1):
        leaderboard.append({
            "student_id": entry["_id"],
            "total_score": entry["total_score"],
            "quizzes_taken": entry["quizzes_taken"],
            "rank": idx,
            "xp": entry["total_score"] * 10  # basic XP formula
        })

    return leaderboard
