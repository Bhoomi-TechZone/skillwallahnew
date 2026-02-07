# Example service for handling partnership requests
from app.schemas.partnership import PartnershipRequest
from fastapi import Request
from typing import List, Dict, Any
from bson import ObjectId

# You can implement DB save, email, etc. here
def save_partnership_request(request_data: PartnershipRequest, app_request: Request):
    db = app_request.app.mongodb
    partnership_collection = db.get_collection("partnership_requests")
    
    # Now that website is just a string, we can use standard dict() method
    request_dict = request_data.dict()
    
    result = partnership_collection.insert_one(request_dict)
    return str(result.inserted_id)


def get_all_partnership_requests(app_request: Request) -> List[Dict[str, Any]]:
    """
    Retrieve all partnership requests from the database
    """
    db = app_request.app.mongodb
    partnership_collection = db.get_collection("partnership_requests")
    
    # Get all partnership requests
    cursor = partnership_collection.find({})
    partnerships = []
    
    for partnership in cursor:
        # Convert ObjectId to string for JSON serialization
        partnership["_id"] = str(partnership["_id"])
        partnerships.append(partnership)
    
    return partnerships


def update_partnership_status(partnership_id: str, status: str, app_request: Request) -> bool:
    """
    Update the status of a partnership request
    """
    try:
        db = app_request.app.mongodb
        partnership_collection = db.get_collection("partnership_requests")
        
        # Update the partnership status
        result = partnership_collection.update_one(
            {"_id": ObjectId(partnership_id)},
            {"$set": {"status": status}}
        )
        
        return result.modified_count > 0
    except Exception as e:
        raise Exception(f"Failed to update partnership status: {str(e)}")
