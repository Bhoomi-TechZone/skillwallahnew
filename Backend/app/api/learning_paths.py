from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import List, Optional
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId
import os

from app.schemas.learning_path import (
    LearningPathCreateSchema, 
    LearningPathUpdateSchema, 
    LearningPathResponseSchema
)
from app.models.learning_path import LearningPath, LearningPathCreate, LearningPathUpdate
from app.utils.dependencies import get_authenticated_user

# Create router
learning_path_router = APIRouter(prefix="/api/learning-paths", tags=["learning-paths"])

# MongoDB connection
client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
db = client[os.getenv("DB_NAME", "lms")]
learning_paths_collection = db.learning_paths


def serialize_learning_path(learning_path_doc):
    """Convert MongoDB document to LearningPath model"""
    if learning_path_doc:
        learning_path_doc["id"] = str(learning_path_doc["_id"])
        del learning_path_doc["_id"]
        return learning_path_doc
    return None

@learning_path_router.post("/", response_model=LearningPathResponseSchema)
async def create_learning_path(learning_path_data: LearningPathCreateSchema):
    """Create a new learning path"""
    try:
        # Convert to dict and add creation metadata
        learning_path_dict = learning_path_data.dict()
        learning_path_dict["created_date"] = datetime.utcnow()
        learning_path_dict["total_students"] = 0
        learning_path_dict["completion_rate"] = 0
        
        # Insert into MongoDB
        result = learning_paths_collection.insert_one(learning_path_dict)
        
        # Retrieve the created learning path
        created_learning_path = learning_paths_collection.find_one({"_id": result.inserted_id})
        
        if not created_learning_path:
            raise HTTPException(status_code=500, detail="Failed to create learning path")
        
        # Serialize and return
        serialized_path = serialize_learning_path(created_learning_path)
        return LearningPathResponseSchema(**serialized_path)
        
    except Exception as e:
        print(f"Error creating learning path: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating learning path: {str(e)}")

@learning_path_router.get("/", response_model=List[LearningPathResponseSchema])
async def get_learning_paths(
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    status: Optional[str] = None,
    limit: Optional[int] = 50,
    skip: Optional[int] = 0
):
    """Get all learning paths with optional filtering"""
    try:
        # Build filter query
        filter_query = {}
        if category:
            filter_query["category"] = category
        if difficulty:
            filter_query["difficulty"] = difficulty
        if status:
            filter_query["status"] = status
        
        # Get learning paths from MongoDB
        cursor = learning_paths_collection.find(filter_query).skip(skip).limit(limit)
        learning_paths = []
        
        for learning_path_doc in cursor:
            serialized_path = serialize_learning_path(learning_path_doc)
            learning_paths.append(LearningPathResponseSchema(**serialized_path))
        
        return learning_paths
        
    except Exception as e:
        print(f"Error fetching learning paths: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching learning paths: {str(e)}")

@learning_path_router.get("/{learning_path_id}", response_model=LearningPathResponseSchema)
async def get_learning_path(learning_path_id: str):
    """Get a specific learning path by ID"""
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(learning_path_id):
            raise HTTPException(status_code=400, detail="Invalid learning path ID")
        
        # Find learning path
        learning_path_doc = learning_paths_collection.find_one({"_id": ObjectId(learning_path_id)})
        
        if not learning_path_doc:
            raise HTTPException(status_code=404, detail="Learning path not found")
        
        # Serialize and return
        serialized_path = serialize_learning_path(learning_path_doc)
        return LearningPathResponseSchema(**serialized_path)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching learning path: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching learning path: {str(e)}")

@learning_path_router.put("/{learning_path_id}", response_model=LearningPathResponseSchema)
async def update_learning_path(learning_path_id: str, learning_path_update: LearningPathUpdateSchema):
    """Update a learning path"""
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(learning_path_id):
            raise HTTPException(status_code=400, detail="Invalid learning path ID")
        
        # Get update data, excluding None values
        update_data = {k: v for k, v in learning_path_update.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        # Add updated timestamp
        update_data["updated_date"] = datetime.utcnow()
        
        # Update in MongoDB
        result = learning_paths_collection.update_one(
            {"_id": ObjectId(learning_path_id)}, 
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Learning path not found")
        
        # Retrieve updated learning path
        updated_learning_path = learning_paths_collection.find_one({"_id": ObjectId(learning_path_id)})
        
        # Serialize and return
        serialized_path = serialize_learning_path(updated_learning_path)
        return LearningPathResponseSchema(**serialized_path)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating learning path: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating learning path: {str(e)}")

@learning_path_router.delete("/{learning_path_id}")
async def delete_learning_path(learning_path_id: str):
    """Delete a learning path"""
    try:
        # Validate ObjectId
        if not ObjectId.is_valid(learning_path_id):
            raise HTTPException(status_code=400, detail="Invalid learning path ID")
        
        # Delete from MongoDB
        result = learning_paths_collection.delete_one({"_id": ObjectId(learning_path_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Learning path not found")
        
        return {"message": "Learning path deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting learning path: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting learning path: {str(e)}")

@learning_path_router.get("/stats/summary")
async def get_learning_paths_stats_summary(
    request: Request,
    current_user: dict = Depends(get_authenticated_user)
):
    """Get learning paths statistics summary"""
    try:
        # Get total learning paths
        total_paths = learning_paths_collection.count_documents({})
        
        # Get active learning paths
        active_paths = learning_paths_collection.count_documents({"status": "active"})
        
        # Get draft learning paths
        draft_paths = learning_paths_collection.count_documents({"status": "draft"})
        
        # Get archived learning paths
        archived_paths = learning_paths_collection.count_documents({"status": "archived"})
        
        # Calculate completion rate (average of all paths)
        pipeline = [
            {"$group": {
                "_id": None, 
                "avg_completion": {"$avg": "$completion_rate"},
                "total_students": {"$sum": "$total_students"}
            }}
        ]
        
        completion_stats = list(learning_paths_collection.aggregate(pipeline))
        avg_completion = completion_stats[0]["avg_completion"] if completion_stats else 0
        total_students = completion_stats[0]["total_students"] if completion_stats else 0
        
        # Get category breakdown
        category_pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        categories = list(learning_paths_collection.aggregate(category_pipeline))
        
        # Get difficulty breakdown
        difficulty_pipeline = [
            {"$group": {"_id": "$difficulty", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        difficulties = list(learning_paths_collection.aggregate(difficulty_pipeline))
        
        return {
            "total_paths": total_paths,
            "active_paths": active_paths,
            "draft_paths": draft_paths,
            "archived_paths": archived_paths,
            "avg_completion_rate": round(avg_completion, 2) if avg_completion else 0,
            "total_enrolled_students": total_students,
            "categories": categories,
            "difficulties": difficulties,
            "success": True
        }
        
    except Exception as e:
        print(f"Error fetching learning paths stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching learning paths stats: {str(e)}")

# Statistics endpoints removed - not used in frontend
# Categories endpoint removed - not used in frontend

# Router is already defined as learning_path_router above


