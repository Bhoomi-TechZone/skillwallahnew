from datetime import datetime, timedelta
from bson import ObjectId
from app.models.recording import get_recordings_collection
from app.models.course import get_course_collection
from app.models.user import get_user_collection
import asyncio
import os
import json
from pathlib import Path
from typing import Optional, Dict, Any
import subprocess
import tempfile

class WebRTCRecordingService:
    def __init__(self, recordings_dir: str = "uploads/recordings"):
        self.recordings_dir = Path(recordings_dir)
        self.recordings_dir.mkdir(parents=True, exist_ok=True)
        self.active_recordings: Dict[str, Dict[str, Any]] = {}
    
    async def start_recording(self, session_id: str, metadata: Optional[Dict] = None) -> str:
        """Start recording for a session"""
        if session_id in self.active_recordings:
            raise ValueError(f"Recording already active for session {session_id}")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        recording_filename = f"session_{session_id}_{timestamp}.webm"
        recording_path = self.recordings_dir / recording_filename
        
        # Create recording metadata
        recording_metadata = {
            "session_id": session_id,
            "filename": recording_filename,
            "filepath": str(recording_path),
            "started_at": datetime.now().isoformat(),
            "status": "recording",
            "metadata": metadata or {}
        }
        
        self.active_recordings[session_id] = recording_metadata
        
        # Create metadata file
        metadata_path = recording_path.with_suffix('.json')
        with open(metadata_path, 'w') as f:
            json.dump(recording_metadata, f, indent=2)
        
        return recording_filename
    
    async def stop_recording(self, session_id: str) -> Optional[str]:
        """Stop recording for a session"""
        if session_id not in self.active_recordings:
            return None
        
        recording_info = self.active_recordings[session_id]
        recording_info["stopped_at"] = datetime.now().isoformat()
        recording_info["status"] = "completed"
        
        # Update metadata file
        metadata_path = Path(recording_info["filepath"]).with_suffix('.json')
        with open(metadata_path, 'w') as f:
            json.dump(recording_info, f, indent=2)
        
        del self.active_recordings[session_id]
        return recording_info["filename"]
    
    def get_recording_info(self, session_id: str) -> Optional[Dict]:
        """Get recording information for a session"""
        return self.active_recordings.get(session_id)
    
    def list_recordings(self) -> list:
        """List all recorded sessions"""
        recordings = []
        for metadata_file in self.recordings_dir.glob("*.json"):
            try:
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                recordings.append(metadata)
            except Exception as e:
                print(f"Error reading metadata file {metadata_file}: {e}")
        return recordings

# Global WebRTC recording service instance
webrtc_recording_service = WebRTCRecordingService()


async def get_recordings_for_student(db, student_id, limit=50):
    """Get recordings for courses the student is enrolled in"""
    
    # Get student's enrolled courses
    enrollments = list(db.enrollments.find({"student_id": ObjectId(student_id)}))
    enrolled_course_ids = [enrollment["course_id"] for enrollment in enrollments]
    
    if not enrolled_course_ids:
        return []
    
    recordings_collection = get_recordings_collection(db)
    course_collection = get_course_collection(db)
    user_collection = get_user_collection(db)
    
    # Find recordings for enrolled courses
    recordings_cursor = recordings_collection.find({
        "course_id": {"$in": enrolled_course_ids}
    }).sort("recorded_date", -1).limit(limit)
    
    recordings = []
    for recording in recordings_cursor:
        # Get course details
        course = course_collection.find_one({"_id": recording["course_id"]})
        course_title = course.get("title", "Unknown Course") if course else "Unknown Course"
        
        # Get instructor details
        instructor = user_collection.find_one({"_id": recording["instructor_id"]})
        instructor_name = instructor.get("name", "Unknown Instructor") if instructor else "Unknown Instructor"
        
        recordings.append({
            "id": str(recording["_id"]),
            "title": recording["title"],
            "description": recording.get("description", ""),
            "course_id": str(recording["course_id"]),
            "course_title": course_title,
            "instructor_name": instructor_name,
            "video_url": recording["video_url"],
            "pdf_url": recording.get("pdf_url", ""),
            "recorded_date": recording["recorded_date"].isoformat(),
            "duration_minutes": recording.get("duration_minutes", 60),
            "syllabus_percent": recording.get("syllabus_percent", 0),
            "lecture_percent": recording.get("lecture_percent", 0),
            "tags": recording.get("tags", []),
            "view_count": recording.get("view_count", 0)
        })
    
    return recordings

async def update_recording_view_count(db, recording_id):
    """Increment view count when recording is played"""
    
    recordings_collection = get_recordings_collection(db)
    
    result = recordings_collection.update_one(
        {"_id": ObjectId(recording_id)},
        {
            "$inc": {"view_count": 1},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return result.modified_count > 0

async def get_all_recordings(db, skip=0, limit=50):
    """Get all recordings (for admin/instructor use)"""
    
    recordings_collection = get_recordings_collection(db)
    course_collection = get_course_collection(db)
    user_collection = get_user_collection(db)
    
    recordings_cursor = recordings_collection.find().sort("recorded_date", -1).skip(skip).limit(limit)
    
    recordings = []
    for recording in recordings_cursor:
        # Get course details
        course = course_collection.find_one({"_id": recording["course_id"]})
        course_title = course.get("title", "Unknown Course") if course else "Unknown Course"
        
        # Get instructor details
        instructor = user_collection.find_one({"_id": recording["instructor_id"]})
        instructor_name = instructor.get("name", "Unknown Instructor") if instructor else "Unknown Instructor"
        
        recordings.append({
            "id": str(recording["_id"]),
            "title": recording["title"],
            "description": recording.get("description", ""),
            "course_id": str(recording["course_id"]),
            "course_title": course_title,
            "instructor_name": instructor_name,
            "video_url": recording["video_url"],
            "pdf_url": recording.get("pdf_url", ""),
            "recorded_date": recording["recorded_date"].isoformat(),
            "duration_minutes": recording.get("duration_minutes", 60),
            "syllabus_percent": recording.get("syllabus_percent", 0),
            "lecture_percent": recording.get("lecture_percent", 0),
            "tags": recording.get("tags", []),
            "view_count": recording.get("view_count", 0)
        })
    
    return recordings


