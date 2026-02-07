from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pymongo.database import Database
from bson import ObjectId
import os
import shutil
from fastapi import UploadFile
import uuid
from app.utils.serializers import json_serialize

class ConnectService:
    """Service for handling connect form submissions"""
    
    @staticmethod
    def save_resume_file(upload_file: UploadFile, submission_id: str) -> Dict[str, str]:
        """Save uploaded resume file and return file info"""
        try:
            # Create uploads directory structure
            base_upload_dir = "/www/wwwroot/Skill_wallah_edtech/uploads"
            connect_upload_dir = os.path.join(base_upload_dir, "connect_forms")
            
            # Create directory if it doesn't exist
            os.makedirs(connect_upload_dir, exist_ok=True)
            
            # Generate unique filename
            file_extension = os.path.splitext(upload_file.filename)[1]
            unique_filename = f"{submission_id}_{uuid.uuid4().hex[:8]}{file_extension}"
            file_path = os.path.join(connect_upload_dir, unique_filename)
            
            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(upload_file.file, buffer)
            
            return {
                "filename": unique_filename,
                "original_filename": upload_file.filename,
                "path": file_path,
                "relative_path": f"uploads/connect_forms/{unique_filename}"
            }
        except Exception as e:
            raise Exception(f"Failed to save resume file: {str(e)}")
    
    @staticmethod
    def create_connect_submission(
        db: Database, 
        form_data: Dict[str, Any], 
        resume_info: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Create a new connect form submission"""
        try:
            # Prepare document for MongoDB
            submission_doc = {
                "fullName": form_data.get("fullName"),
                "email": form_data.get("email"),
                "phone": form_data.get("phone", ""),
                "role": form_data.get("role", ""),
                "subject": form_data.get("subject", ""),
                "message": form_data.get("message"),
                "resume_filename": resume_info.get("filename") if resume_info else None,
                "resume_original_filename": resume_info.get("original_filename") if resume_info else None,
                "resume_path": resume_info.get("path") if resume_info else None,
                "resume_relative_path": resume_info.get("relative_path") if resume_info else None,
                "status": "new",
                "created_date": datetime.now(timezone.utc),
                "updated_date": datetime.now(timezone.utc)
            }
            
            # Insert into database
            result = db.connect_submissions.insert_one(submission_doc)
            
            if result.inserted_id:
                return {
                    "success": True,
                    "message": "Your message has been submitted successfully. We'll get back to you soon!",
                    "submission_id": str(result.inserted_id)
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to submit your message. Please try again."
                }
                
        except Exception as e:
            return {
                "success": False,
                "message": f"An error occurred while submitting your message: {str(e)}"
            }
    
    @staticmethod
    def get_submission_by_id(db: Database, submission_id: str) -> Optional[Dict[str, Any]]:
        """Get a connect submission by ID"""
        try:
            submission = db.connect_submissions.find_one({"_id": ObjectId(submission_id)})
            if submission:
                # Use json_serialize to handle all MongoDB-specific types
                submission = json_serialize(submission)
            return submission
        except Exception:
            return None
    
    @staticmethod
    def get_all_submissions(
        db: Database, 
        limit: int = 50, 
        offset: int = 0,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get all connect submissions with pagination"""
        try:
            # Build query
            query = {}
            if status:
                query["status"] = status
            
            # Get total count
            total = db.connect_submissions.count_documents(query)
            
            # Get submissions with pagination
            cursor = db.connect_submissions.find(query)\
                .sort("created_date", -1)\
                .skip(offset)\
                .limit(limit)
            
            submissions = []
            for submission in cursor:
                # Use json_serialize to handle all MongoDB-specific types
                serialized_submission = json_serialize(submission)
                submissions.append(serialized_submission)
            
            result = {
                "success": True,
                "submissions": submissions,
                "total": total,
                "limit": limit,
                "offset": offset
            }
            
            # Double-serialize the entire result to be absolutely sure
            return json_serialize(result)
            
        except Exception as e:
            # Return safe error response that's guaranteed to be serializable
            return {
                "success": False,
                "message": f"Failed to retrieve submissions: {str(e)}",
                "submissions": [],
                "total": 0,
                "limit": limit,
                "offset": offset
            }
    
    @staticmethod
    def update_submission_status(
        db: Database, 
        submission_id: str, 
        status: str,
        admin_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update submission status"""
        try:
            update_data = {
                "status": status,
                "updated_date": datetime.now(timezone.utc)
            }
            
            if admin_notes:
                update_data["admin_notes"] = admin_notes
            
            result = db.connect_submissions.update_one(
                {"_id": ObjectId(submission_id)},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                return {
                    "success": True,
                    "message": "Submission updated successfully"
                }
            else:
                return {
                    "success": False,
                    "message": "Submission not found or no changes made"
                }
                
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to update submission: {str(e)}"
            }