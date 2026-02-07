# MongoDB collection access for enrollment data
def get_enrollment_collection(db):
    return db["enrollments"]