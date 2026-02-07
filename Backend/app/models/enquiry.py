from pymongo import MongoClient
from pymongo.collection import Collection
import os

def get_enquiry_collection(db) -> Collection:
    """Get the enquiry collection from MongoDB"""
    return db.enquiries

def get_enquiry_responses_collection(db) -> Collection:
    """Get the enquiry responses collection from MongoDB"""
    return db.enquiry_responses

def create_enquiry_indexes(db):
    """Create indexes for enquiry collections"""
    try:
        # Enquiry collection indexes
        enquiry_collection = get_enquiry_collection(db)
        enquiry_collection.create_index("email")
        enquiry_collection.create_index("status")
        enquiry_collection.create_index("category")
        enquiry_collection.create_index("priority")
        enquiry_collection.create_index("created_date")
        enquiry_collection.create_index("assigned_to")
        
        # Compound indexes for common queries
        enquiry_collection.create_index([("status", 1), ("priority", 1)])
        enquiry_collection.create_index([("category", 1), ("created_date", -1)])
        enquiry_collection.create_index([("email", 1), ("created_date", -1)])
        
        # Text search index
        enquiry_collection.create_index([
            ("name", "text"),
            ("email", "text"), 
            ("message", "text")
        ])
        
        # Enquiry responses collection indexes
        responses_collection = get_enquiry_responses_collection(db)
        responses_collection.create_index("enquiry_id")
        responses_collection.create_index("admin_id")
        responses_collection.create_index("created_date")
        
        print("✅ Enquiry indexes created successfully")
        
    except Exception as e:
        print(f"❌ Error creating enquiry indexes: {e}")