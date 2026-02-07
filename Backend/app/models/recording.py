# MongoDB collection access for recordings data
def get_recordings_collection(db):
    return db["recordings"]
