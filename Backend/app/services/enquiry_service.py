from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional, List, Dict
from app.models.enquiry import get_enquiry_collection, get_enquiry_responses_collection
from app.schemas.enquiry import EnquiryCreate, EnquiryUpdate, EnquiryFilter, EnquiryResponseCreate

def serialize_datetime(obj):
    """Convert datetime objects to ISO format strings for JSON serialization"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def serialize_enquiry(enquiry):
    """Serialize a single enquiry document for JSON response"""
    if enquiry:
        # Make a copy to avoid modifying the original
        enquiry_copy = dict(enquiry)
        enquiry_copy["id"] = str(enquiry_copy["_id"])
        del enquiry_copy["_id"]
        
        # Convert datetime fields to ISO format strings
        for field in ["created_date", "updated_date", "resolved_date"]:
            if field in enquiry_copy and enquiry_copy[field] is not None:
                enquiry_copy[field] = serialize_datetime(enquiry_copy[field])
        
        return enquiry_copy
    return None

def serialize_enquiries(enquiries):
    """Serialize a list of enquiry documents for JSON response"""
    serialized = []
    for enquiry in enquiries:
        serialized_enquiry = serialize_enquiry(enquiry)
        if serialized_enquiry:
            serialized.append(serialized_enquiry)
    return serialized

def create_enquiry(db, enquiry_data: EnquiryCreate):
    """Create a new enquiry"""
    try:
        collection = get_enquiry_collection(db)
        
        enquiry_doc = {
            "_id": ObjectId(),
            "name": enquiry_data.name,
            "email": enquiry_data.email.lower(),
            "phone": enquiry_data.phone,
            "message": enquiry_data.message,
            "category": enquiry_data.category,
            "priority": enquiry_data.priority,
            "status": "open",
            "admin_notes": "",
            "assigned_to": None,
            "created_date": datetime.now(timezone.utc),
            "updated_date": datetime.now(timezone.utc),
            "resolved_date": None,
            "response_count": 0
        }
        
        result = collection.insert_one(enquiry_doc)
        
        if result.inserted_id:
            return {
                "success": True,
                "message": "Enquiry submitted successfully",
                "enquiry_id": str(result.inserted_id)
            }
        else:
            return {"success": False, "message": "Failed to submit enquiry"}
            
    except Exception as e:
        error_msg = str(e)
        print(f"MongoDB Error: {error_msg}")
        
        # Handle authentication errors specifically
        if "authentication" in error_msg.lower() or "unauthorized" in error_msg.lower():
            # Fallback: Store in a local file
            try:
                import json
                import os
                
                # Create enquiries directory if it doesn't exist
                enquiries_dir = "enquiries_backup"
                os.makedirs(enquiries_dir, exist_ok=True)
                
                # Save to JSON file as backup
                backup_file = os.path.join(enquiries_dir, "enquiries.json")
                
                enquiry_backup = {
                    "id": str(enquiry_doc["_id"]),
                    "name": enquiry_data.name,
                    "email": enquiry_data.email.lower(),
                    "phone": enquiry_data.phone,
                    "message": enquiry_data.message,
                    "category": enquiry_data.category,
                    "status": "open",
                    "created_date": datetime.now(timezone.utc).isoformat(),
                    "updated_date": datetime.now(timezone.utc).isoformat()
                }
                
                # Read existing data
                existing_data = []
                if os.path.exists(backup_file):
                    try:
                        with open(backup_file, 'r') as f:
                            existing_data = json.load(f)
                    except:
                        existing_data = []
                
                # Add new enquiry
                existing_data.append(enquiry_backup)
                
                # Save back to file
                with open(backup_file, 'w') as f:
                    json.dump(existing_data, f, indent=2)
                
                return {
                    "success": True,
                    "message": "Enquiry submitted successfully (saved to backup file)",
                    "enquiry_id": enquiry_backup["id"],
                    "backup_location": backup_file
                }
                
            except Exception as backup_error:
                return {
                    "success": False, 
                    "message": f"Database authentication error and backup failed: {str(backup_error)}"
                }
        
        return {"success": False, "message": f"Error creating enquiry: {error_msg}"}

def get_enquiry_by_id(db, enquiry_id: str):
    """Get a specific enquiry by ID"""
    try:
        collection = get_enquiry_collection(db)
        enquiry = collection.find_one({"_id": ObjectId(enquiry_id)})
        return serialize_enquiry(enquiry)
        
    except Exception as e:
        return None

def get_all_enquiries(db, filters: Optional[EnquiryFilter] = None, limit: int = 50, offset: int = 0):
    """Get all enquiries with optional filters"""
    try:
        collection = get_enquiry_collection(db)
        
        # Build query
        query = {}
        if filters:
            if filters.status:
                query["status"] = filters.status
            if filters.priority:
                query["priority"] = filters.priority
            if filters.category:
                query["category"] = filters.category
            if filters.assigned_to:
                query["assigned_to"] = filters.assigned_to
            if filters.email:
                query["email"] = filters.email.lower()
            if filters.start_date:
                query["created_date"] = {"$gte": filters.start_date}
            if filters.end_date:
                if "created_date" in query:
                    query["created_date"]["$lte"] = filters.end_date
                else:
                    query["created_date"] = {"$lte": filters.end_date}
            if filters.search:
                query["$or"] = [
                    {"name": {"$regex": filters.search, "$options": "i"}},
                    {"email": {"$regex": filters.search, "$options": "i"}},
                    {"message": {"$regex": filters.search, "$options": "i"}}
                ]
        
        # Get enquiries with pagination
        enquiries = list(
            collection.find(query)
            .sort("created_date", -1)
            .skip(offset)
            .limit(limit)
        )
        
        # Serialize enquiries (convert ObjectId and datetime)
        serialized_enquiries = serialize_enquiries(enquiries)
        
        # Get total count
        total_count = collection.count_documents(query)
        
        # Ensure all data is JSON serializable
        result = {
            "enquiries": serialized_enquiries,
            "total": int(total_count),  # Ensure it's a regular int
            "limit": int(limit),
            "offset": int(offset)
        }
        
        return result
        
    except Exception as e:
        print(f"Error in get_all_enquiries: {str(e)}")  # Debug log
        return {"enquiries": [], "total": 0, "limit": int(limit), "offset": int(offset), "error": str(e)}

def update_enquiry(db, enquiry_id: str, update_data: EnquiryUpdate):
    """Update an enquiry"""
    try:
        collection = get_enquiry_collection(db)
        
        update_doc = {"updated_date": datetime.now(timezone.utc)}
        
        if update_data.status is not None:
            update_doc["status"] = update_data.status
            if update_data.status in ["resolved", "closed"]:
                update_doc["resolved_date"] = datetime.now(timezone.utc)
        
        if update_data.priority is not None:
            update_doc["priority"] = update_data.priority
            
        if update_data.category is not None:
            update_doc["category"] = update_data.category
            
        if update_data.admin_notes is not None:
            update_doc["admin_notes"] = update_data.admin_notes
            
        if update_data.assigned_to is not None:
            update_doc["assigned_to"] = update_data.assigned_to
        
        result = collection.update_one(
            {"_id": ObjectId(enquiry_id)},
            {"$set": update_doc}
        )
        
        if result.modified_count > 0:
            return {"success": True, "message": "Enquiry updated successfully"}
        else:
            return {"success": False, "message": "Enquiry not found or no changes made"}
            
    except Exception as e:
        return {"success": False, "message": f"Error updating enquiry: {str(e)}"}

def delete_enquiry(db, enquiry_id: str):
    """Delete an enquiry"""
    try:
        collection = get_enquiry_collection(db)
        result = collection.delete_one({"_id": ObjectId(enquiry_id)})
        
        if result.deleted_count > 0:
            return {"success": True, "message": "Enquiry deleted successfully"}
        else:
            return {"success": False, "message": "Enquiry not found"}
            
    except Exception as e:
        return {"success": False, "message": f"Error deleting enquiry: {str(e)}"}

def create_enquiry_response(db, response_data: EnquiryResponseCreate):
    """Create a response to an enquiry"""
    try:
        responses_collection = get_enquiry_responses_collection(db)
        enquiry_collection = get_enquiry_collection(db)
        
        response_doc = {
            "_id": ObjectId(),
            "enquiry_id": response_data.enquiry_id,
            "admin_id": response_data.admin_id,
            "admin_name": response_data.admin_name,
            "response": response_data.response,
            "is_public": response_data.is_public,
            "created_date": datetime.now(timezone.utc)
        }
        
        result = responses_collection.insert_one(response_doc)
        
        if result.inserted_id:
            # Update enquiry response count
            enquiry_collection.update_one(
                {"_id": ObjectId(response_data.enquiry_id)},
                {
                    "$inc": {"response_count": 1},
                    "$set": {"updated_date": datetime.now(timezone.utc)}
                }
            )
            
            return {
                "success": True,
                "message": "Response added successfully",
                "response_id": str(result.inserted_id)
            }
        else:
            return {"success": False, "message": "Failed to add response"}
            
    except Exception as e:
        return {"success": False, "message": f"Error creating response: {str(e)}"}

def get_enquiry_responses(db, enquiry_id: str):
    """Get all responses for an enquiry"""
    try:
        collection = get_enquiry_responses_collection(db)
        
        responses = list(
            collection.find({"enquiry_id": enquiry_id})
            .sort("created_date", 1)
        )
        
        # Convert ObjectId to string and serialize datetime
        for response in responses:
            response["id"] = str(response["_id"])
            del response["_id"]
            
            # Convert datetime fields
            if "created_date" in response and response["created_date"]:
                response["created_date"] = serialize_datetime(response["created_date"])
        
        return responses
        
    except Exception as e:
        return []

def get_enquiry_stats(db):
    """Get enquiry statistics"""
    try:
        collection = get_enquiry_collection(db)
        
        # Total counts
        total_enquiries = collection.count_documents({})
        open_enquiries = collection.count_documents({"status": "open"})
        in_progress_enquiries = collection.count_documents({"status": "in_progress"})
        resolved_enquiries = collection.count_documents({"status": "resolved"})
        closed_enquiries = collection.count_documents({"status": "closed"})
        
        # Category distribution
        category_pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}}
        ]
        category_results = list(collection.aggregate(category_pipeline))
        enquiries_by_category = {result["_id"]: result["count"] for result in category_results}
        
        # Priority distribution
        priority_pipeline = [
            {"$group": {"_id": "$priority", "count": {"$sum": 1}}}
        ]
        priority_results = list(collection.aggregate(priority_pipeline))
        enquiries_by_priority = {result["_id"]: result["count"] for result in priority_results}
        
        # Monthly trends (last 12 months)
        monthly_pipeline = [
            {
                "$match": {
                    "created_date": {
                        "$gte": datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                    }
                }
            },
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$created_date"},
                        "month": {"$month": "$created_date"}
                    },
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        monthly_results = list(collection.aggregate(monthly_pipeline))
        monthly_trends = {
            f"{result['_id']['year']}-{result['_id']['month']:02d}": result["count"] 
            for result in monthly_results
        }
        
        return {
            "total_enquiries": total_enquiries,
            "open_enquiries": open_enquiries,
            "in_progress_enquiries": in_progress_enquiries,
            "resolved_enquiries": resolved_enquiries,
            "closed_enquiries": closed_enquiries,
            "enquiries_by_category": enquiries_by_category,
            "enquiries_by_priority": enquiries_by_priority,
            "monthly_trends": monthly_trends
        }
        
    except Exception as e:
        return {"error": str(e)}
