
import json
from bson import ObjectId
from datetime import datetime, date, timezone
from typing import Any, Dict, List, Union
from fastapi.responses import JSONResponse
from decimal import Decimal

def serialize_document(doc, id_field="_id", rename_to="id"):
    """Serialize MongoDB documents and handle ObjectId + nested objects recursively"""
    
    if isinstance(doc, list):
        return [serialize_document(d, id_field, rename_to) for d in doc]

    if isinstance(doc, dict):
        serialized = {}
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                serialized[key] = str(value)
            elif isinstance(value, datetime):
                serialized[key] = value.isoformat()
            elif isinstance(value, (dict, list)):
                serialized[key] = serialize_document(value, id_field, rename_to)
            else:
                serialized[key] = value
        
        # Rename ObjectId field if present
        if id_field in serialized:
            serialized[rename_to] = serialized.pop(id_field)
        return serialized

    if isinstance(doc, ObjectId):
        return str(doc)
    
    if isinstance(doc, datetime):
        return doc.isoformat()

    return doc

def serialize_assignment(assignment: Dict[str, Any]) -> Dict[str, Any]:
    """
    Serialize an assignment document from MongoDB to a JSON-safe format
    """
    if not assignment:
        return assignment
    
    # Use the generic serializer first
    serialized = serialize_document(assignment)
    
    # Handle assigned_students array specifically
    if "assigned_students" in serialized and serialized["assigned_students"]:
        serialized["assigned_students"] = [
            str(student_id) if isinstance(student_id, ObjectId) else student_id
            for student_id in serialized["assigned_students"]
        ]
    else:
        serialized["assigned_students"] = []
    
    # Ensure file paths are strings or None
    for field in ["attachment_file", "questions_pdf_path"]:
        if field in serialized:
            serialized[field] = str(serialized[field]) if serialized[field] else None
    
    # Ensure numeric fields are properly typed
    for field in ["max_points", "submissions", "graded"]:
        if field in serialized and serialized[field] is not None:
            try:
                serialized[field] = int(serialized[field])
            except (ValueError, TypeError):
                serialized[field] = 0
    
    # Ensure float fields are properly typed
    for field in ["estimated_time", "avg_score"]:
        if field in serialized and serialized[field] is not None:
            try:
                serialized[field] = float(serialized[field])
            except (ValueError, TypeError):
                serialized[field] = 0.0
    
    return serialized

def serialize_assignment_list(assignments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Serialize a list of assignment documents
    """
    return [serialize_assignment(assignment) for assignment in assignments]

class MongoJSONEncoder(json.JSONEncoder):
    """
    Custom JSON encoder that handles MongoDB ObjectId and datetime objects
    """
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        elif isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

def safe_serialize(data: Any) -> Any:
    """
    Safely serialize any data structure, converting problematic types
    """
    try:
        return serialize_document(data)
    except Exception as e:
        print(f"❌ Serialization error: {str(e)}")
        return str(data) if data is not None else None

def json_serialize(data: Any) -> Any:
    """
    Comprehensive JSON serialization function that converts MongoDB documents 
    or any data structure into JSON-safe objects by converting:
    - ObjectId → str(ObjectId)
    - datetime → datetime.isoformat()
    - date → date.isoformat()
    - Decimal → float(Decimal)
    - Nested dicts/lists recursively handled
    
    Args:
        data: Any data structure (dict, list, primitive, etc.)
        
    Returns:
        JSON-safe version of the data
    """
    if data is None:
        return None
    
    if isinstance(data, ObjectId):
        return str(data)
    
    if isinstance(data, datetime):
        # Handle timezone-aware datetime objects safely
        try:
            return data.isoformat()
        except Exception:
            # Fallback for problematic datetime objects
            return str(data)
    
    if isinstance(data, date):
        try:
            return data.isoformat()
        except Exception:
            # Fallback for problematic date objects
            return str(data)
    
    if isinstance(data, Decimal):
        return float(data)
    
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            # Handle the _id field specially
            if key == "_id" and isinstance(value, ObjectId):
                result["id"] = str(value)
            else:
                result[key] = json_serialize(value)
        return result
    
    if isinstance(data, (list, tuple)):
        return [json_serialize(item) for item in data]
    
    if isinstance(data, (int, float, str, bool)):
        return data
    
    # For any other types, try to convert to string
    try:
        return str(data)
    except Exception:
        return None

def json_response(data: Any, status_code: int = 200) -> JSONResponse:
    """
    Create a JSONResponse with proper serialization of MongoDB data.
    Always uses json_serialize and includes default=str as fallback.
    
    Args:
        data: Any data structure to serialize
        status_code: HTTP status code (default: 200)
        
    Returns:
        JSONResponse with properly serialized data
    """
    try:
        # First, serialize using our comprehensive function
        serialized_data = json_serialize(data)
        
        # Create JSON string with fallback default=str for any remaining edge cases
        json_str = json.dumps(serialized_data, default=str, ensure_ascii=False)
        
        return JSONResponse(
            status_code=status_code,
            content=json.loads(json_str)  # Parse back to ensure it's valid JSON
        )
    except Exception as e:
        # Ultimate fallback - return error response
        error_data = {
            "success": False,
            "message": f"Serialization error: {str(e)}",
            "data": str(data) if data is not None else None
        }
        return JSONResponse(
            status_code=500,
            content=error_data
        )
