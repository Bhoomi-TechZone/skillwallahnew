from typing import Optional, Dict, List, Any
from datetime import datetime
from bson import ObjectId
from app.models.quiz import get_question_collection

def create_question(question_data: Dict[str, Any], db=None) -> Optional[str]:
    """Create a new question"""
    try:
        if db is None:
            # Fallback to import the db if not provided
            from app.config import settings
            from pymongo import MongoClient
            client = MongoClient(settings.MONGO_URI)
            db = client[settings.DB_NAME]
            
        collection = get_question_collection(db)
        
        # Add timestamps
        question_data['created_at'] = datetime.utcnow().isoformat()
        question_data['updated_at'] = datetime.utcnow().isoformat()
        
        result = collection.insert_one(question_data)
        
        if result.inserted_id:
            print(f"✅ Question created with ID: {result.inserted_id}")
            return str(result.inserted_id)
        
        return None
        
    except Exception as e:
        print(f"❌ Error creating question: {str(e)}")
        return None

def get_all_questions(branch_code: str, db=None) -> List[Dict[str, Any]]:
    """Get all questions for a branch"""
    try:
        if db is None:
            # Fallback to import the db if not provided
            from app.config import settings
            from pymongo import MongoClient
            client = MongoClient(settings.MONGO_URI)
            db = client[settings.DB_NAME]
            
        collection = get_question_collection(db)
        
        questions = list(collection.find(
            {"branch_code": branch_code},
            {"_id": 0}
        ).sort("created_at", -1))
        
        # Convert ObjectId to string for each question
        for question in questions:
            if "_id" in question:
                question["id"] = str(question["_id"])
                del question["_id"]
        
        return questions
        
    except Exception as e:
        print(f"❌ Error fetching questions: {str(e)}")
        return []

def get_questions_by_filters(filters: Dict[str, Any], page: int = 1, limit: int = 10, db=None) -> Dict[str, Any]:
    """Get questions with pagination and filters"""
    try:
        if db is None:
            # Fallback to import the db if not provided
            from app.config import settings
            from pymongo import MongoClient
            client = MongoClient(settings.MONGO_URI)
            db = client[settings.DB_NAME]
            
        collection = get_question_collection(db)
        
        # Calculate skip for pagination
        skip = (page - 1) * limit
        
        # Get total count
        total = collection.count_documents(filters)
        
        # Get questions with pagination
        # Note: Don't use projection to include all fields - questions may have different field formats:
        # - Some have 'text' field, others have 'question_text'
        # - Some have 'options' array, others have 'option_a', 'option_b', etc.
        questions = list(collection.find(
            filters
        ).sort("created_at", -1).skip(skip).limit(limit))
        
        # Convert ObjectId to string for each question and all nested ObjectIds
        serialized_questions = []
        for question in questions:
            serialized_q = {}
            for key, value in question.items():
                if key == "_id":
                    serialized_q["id"] = str(value)
                elif isinstance(value, ObjectId):
                    serialized_q[key] = str(value)
                else:
                    serialized_q[key] = value
            serialized_questions.append(serialized_q)
        
        return {
            "questions": serialized_questions,
            "total": total
        }
        
    except Exception as e:
        print(f"❌ Error fetching questions with filters: {str(e)}")
        return {"questions": [], "total": 0}

def get_question_by_id(question_id: str, branch_code: str, db=None) -> Optional[Dict[str, Any]]:
    """Get a specific question by ID"""
    try:
        if db is None:
            # Fallback to import the db if not provided
            from app.config import settings
            from pymongo import MongoClient
            client = MongoClient(settings.MONGO_URI)
            db = client[settings.DB_NAME]
            
        collection = get_question_collection(db)
        
        question = collection.find_one({
            "_id": ObjectId(question_id),
            "branch_code": branch_code
        })
        
        if question:
            question["id"] = str(question["_id"])
            del question["_id"]
            return question
        
        return None
        
    except Exception as e:
        print(f"❌ Error fetching question by ID: {str(e)}")
        return None

def update_question(question_id: str, update_data: Dict[str, Any], branch_code: str, db=None) -> bool:
    """Update an existing question"""
    try:
        if db is None:
            # Fallback to import the db if not provided
            from app.config import settings
            from pymongo import MongoClient
            client = MongoClient(settings.MONGO_URI)
            db = client[settings.DB_NAME]
            
        collection = get_question_collection(db)
        
        # Add update timestamp
        update_data['updated_at'] = datetime.utcnow().isoformat()
        
        result = collection.update_one(
            {
                "_id": ObjectId(question_id),
                "branch_code": branch_code
            },
            {"$set": update_data}
        )
        
        if result.matched_count > 0:
            print(f"✅ Question updated: {question_id}")
            return True
        
        print(f"❌ Question not found for update: {question_id}")
        return False
        
    except Exception as e:
        print(f"❌ Error updating question: {str(e)}")
        return False

def delete_question(question_id: str, branch_code: str, db=None) -> bool:
    """Delete a question"""
    try:
        if db is None:
            # Fallback to import the db if not provided
            from app.config import settings
            from pymongo import MongoClient
            client = MongoClient(settings.MONGO_URI)
            db = client[settings.DB_NAME]
            
        collection = get_question_collection(db)
        
        result = collection.delete_one({
            "_id": ObjectId(question_id),
            "branch_code": branch_code
        })
        
        if result.deleted_count > 0:
            print(f"✅ Question deleted: {question_id}")
            return True
        
        print(f"❌ Question not found for deletion: {question_id}")
        return False
        
    except Exception as e:
        print(f"❌ Error deleting question: {str(e)}")
        return False

def get_questions_by_subject(subject: str, branch_code: str, db=None) -> List[Dict[str, Any]]:
    """Get questions by subject"""
    try:
        if db is None:
            # Fallback to import the db if not provided
            from app.config import settings
            from pymongo import MongoClient
            client = MongoClient(settings.MONGO_URI)
            db = client[settings.DB_NAME]
            
        filters = {
            "subject": subject,
            "branch_code": branch_code
        }
        
        result = get_questions_by_filters(filters, page=1, limit=1000, db=db)  # Large limit to get all
        return result.get("questions", [])
        
    except Exception as e:
        print(f"❌ Error fetching questions by subject: {str(e)}")
        return []

def get_questions_by_course(course: str, branch_code: str, db=None) -> List[Dict[str, Any]]:
    """Get questions by course"""
    try:
        if db is None:
            # Fallback to import the db if not provided
            from app.config import settings
            from pymongo import MongoClient
            client = MongoClient(settings.MONGO_URI)
            db = client[settings.DB_NAME]
            
        filters = {
            "course": course,
            "branch_code": branch_code
        }
        
        result = get_questions_by_filters(filters, page=1, limit=1000, db=db)  # Large limit to get all
        return result.get("questions", [])
        
    except Exception as e:
        print(f"❌ Error fetching questions by course: {str(e)}")
        return []

def get_questions_by_difficulty(difficulty: str, branch_code: str, db=None) -> List[Dict[str, Any]]:
    """Get questions by difficulty"""
    try:
        if db is None:
            # Fallback to import the db if not provided
            from app.config import settings
            from pymongo import MongoClient
            client = MongoClient(settings.MONGO_URI)
            db = client[settings.DB_NAME]
            
        filters = {
            "difficulty": difficulty,
            "branch_code": branch_code
        }
        
        result = get_questions_by_filters(filters, page=1, limit=1000, db=db)  # Large limit to get all
        return result.get("questions", [])
        
    except Exception as e:
        print(f"❌ Error fetching questions by difficulty: {str(e)}")
        return []