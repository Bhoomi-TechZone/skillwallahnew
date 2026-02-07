from pymongo import MongoClient
from datetime import datetime

def get_notice_collection(db):
    """Get notice collection from database"""
    return db.notices

class Notice:
    def __init__(self, title, content, category="general", priority="normal", created_by=None):
        self.title = title
        self.content = content
        self.category = category
        self.priority = priority
        self.created_by = created_by
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.is_pinned = False
        self.views = 0
        self.expires_at = None
