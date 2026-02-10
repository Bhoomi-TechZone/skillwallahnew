from fastapi import APIRouter, Request, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionResponse
from app.services.question_service import (
    create_question, get_all_questions, get_question_by_id, 
    update_question, delete_question, get_questions_by_filters
)
from app.utils.auth_helpers import get_current_user
from app.utils.multi_tenant import MultiTenantManager

question_router = APIRouter(prefix="/questions", tags=["Questions"])

@question_router.post("/", response_model=dict)
async def create_new_question(request: Request, payload: QuestionCreate, current_user = Depends(get_current_user)):
    try:
        print(f"🔍 Creating question: {payload.question_text[:50]}...")
        
        # Get database and branch context using MultiTenantManager
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        branch_info = multi_tenant.get_branch_context(current_user)
        
        # Add branch context to the question
        question_data = payload.dict()
        question_data.update({
            'created_by': current_user.get('id', current_user.get('_id')),
            'created_at': datetime.utcnow().isoformat(),
            'branch_code': branch_info.get('branch_code'),
            'franchise_code': branch_info.get('franchise_code')
        })
        
        result = create_question(question_data, db)
        
        if result:
            return {
                "success": True,
                "message": "Question created successfully",
                "question_id": str(result),
                "branch_code": branch_info.get('branch_code')
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create question")
            
    except Exception as e:
        print(f"❌ Error creating question: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating question: {str(e)}")

@question_router.get("/", response_model=dict)
async def get_questions(
    request: Request,
    current_user = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    subject: Optional[str] = Query(None),
    course: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    paper_set_id: Optional[str] = Query(None),
    paperId: Optional[str] = Query(None)
):
    """Get all questions with pagination and filters"""
    try:
        print(f"🔍 Fetching questions - page: {page}, limit: {limit}")
        
        # Handle parameter alias
        if paperId and not paper_set_id:
            paper_set_id = paperId
        
        # Get database and branch context using MultiTenantManager
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        branch_info = multi_tenant.get_branch_context(current_user)
        
        # Get user role for proper filtering
        user_role = current_user.get("role")
        user_franchise_code = current_user.get("franchise_code")
        user_branch_code = current_user.get("branch_code")
        
        # Build filters based on user role
        # Start with empty filter - will add branch filtering if needed
        filters = {}
        branch_filter = None
        
        if user_role in ["franchise_admin", "admin", "branch_admin"] or current_user.get("is_branch_admin"):
            # Branch admin can see all questions from the questions collection
            # This includes questions created by franchise administration
            print(f"[QUESTIONS] Branch admin access - showing all available questions for franchise: {user_franchise_code}")
            
            # Build branch filter to include:
            # 1. Questions with matching franchise_code
            # 2. Questions with matching branch_code
            # 3. Legacy questions without branch/franchise codes
            # 4. Questions accessible to all branches
            branch_filter = {
                "$or": [
                    {"franchise_code": user_franchise_code} if user_franchise_code else {},
                    {"branch_code": user_franchise_code} if user_franchise_code else {},
                    {"branch_code": user_branch_code} if user_branch_code else {},
                    {"franchise_code": {"$exists": False}},
                    {"branch_code": {"$exists": False}},
                    {"franchise_code": None},
                    {"branch_code": None},
                    {"franchise_code": ""},
                    {"branch_code": ""},
                    # Include questions that are globally available
                    {"is_global": True}
                ]
            }
            # Remove empty dicts from $or
            branch_filter["$or"] = [f for f in branch_filter["$or"] if f]
            
            if branch_filter["$or"]:
                filters = branch_filter
                print(f"[QUESTIONS] Using branch admin filter for questions")
            else:
                # If no valid filter conditions, show all questions
                filters = {}
                print(f"[QUESTIONS] No filter conditions - showing all questions")
                
        elif user_role == "student" or current_user.get("is_branch_student"):
            # Students can see questions from their branch (branch_code is primary)
            student_branch_code = user_branch_code or user_franchise_code
            student_franchise_code = user_franchise_code or user_branch_code
            
            print(f"[QUESTIONS] Student access - branch_code: {student_branch_code}, franchise_code: {student_franchise_code}")
            
            if student_branch_code:
                filters = {
                    "$or": [
                        {"branch_code": student_branch_code},  # Primary match
                        {"franchise_code": student_branch_code},  # Fallback
                        {"franchise_code": student_franchise_code} if student_franchise_code else {"branch_code": student_branch_code}
                    ]
                }
                print(f"[QUESTIONS] Student filter: {filters}")
            else:
                # Fallback - show all questions if no branch/franchise info
                filters = {}
                print(f"[QUESTIONS] Student with no branch info - showing all questions")
        else:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied for role: {user_role}"
            )
        
        # Add additional filters
        if subject:
            filters['subject'] = subject
        if course:
            filters['course'] = course
        if difficulty:
            filters['difficulty'] = difficulty
        if paper_set_id:
            filters['paper_set_id'] = paper_set_id
        
        # Handle search - use $and to combine with existing $or branch filter
        if search:
            search_filter = {
                '$or': [
                    {'question_text': {'$regex': search, '$options': 'i'}},
                    {'explanation': {'$regex': search, '$options': 'i'}}
                ]
            }
            # If we already have a branch $or filter, combine using $and
            if '$or' in filters:
                existing_or = filters.pop('$or')
                filters['$and'] = [
                    {'$or': existing_or},
                    search_filter
                ]
            else:
                filters.update(search_filter)
        
        print(f"[QUESTIONS] Final filter: {filters}")
        result = get_questions_by_filters(filters, page, limit, db)
        
        # Calculate total pages
        total = result.get('total', 0)
        total_pages = (total + limit - 1) // limit if limit > 0 else 1
        
        # Return full response with pagination info
        return {
            "success": True,
            "questions": result.get('questions', []),
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        }
        
    except Exception as e:
        print(f"❌ Error fetching questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching questions: {str(e)}")

# IMPORTANT: Specific routes like /bulk-create MUST come before parameterized routes like /{question_id}
@question_router.post("/bulk-create", response_model=dict)
async def create_questions_bulk(
    request: Request, 
    payload: dict, 
    current_user = Depends(get_current_user)
):
    """Create multiple questions at once for a paper set"""
    try:
        print(f"📝 Creating bulk questions for paper_set_id: {payload.get('paper_set_id')}")
        
        # Get database and branch context using MultiTenantManager
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        branch_info = multi_tenant.get_branch_context(current_user)
        
        paper_set_id = payload.get('paper_set_id')
        questions = payload.get('questions', [])
        
        if not paper_set_id or not questions:
            raise HTTPException(status_code=400, detail="paper_set_id and questions are required")
        
        created_questions = []
        from app.models.quiz import get_question_collection
        collection = get_question_collection(db)
        
        for q_data in questions:
            question_data = {
                'paper_set_id': paper_set_id,
                'question_text': q_data.get('question_text'),
                'option_a': q_data.get('option_a'),
                'option_b': q_data.get('option_b'),
                'option_c': q_data.get('option_c'),
                'option_d': q_data.get('option_d'),
                'correct_answer': q_data.get('correct_answer'),
                'marks': q_data.get('marks', 1),
                'negative_marks': q_data.get('negative_marks', 0),
                'subject': q_data.get('subject', ''),
                'course': q_data.get('course', ''),
                'difficulty': q_data.get('difficulty', 'medium'),
                'explanation': q_data.get('explanation', ''),
                'franchise_code': branch_info.get('franchise_code'),
                'branch_code': branch_info.get('branch_code'),
                'created_by': current_user.get('id', current_user.get('_id')),
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            result = collection.insert_one(question_data)
            question_data['_id'] = str(result.inserted_id)
            created_questions.append(question_data)
        
        print(f"✅ Created {len(created_questions)} questions successfully")
        
        return {
            "success": True,
            "message": f"Successfully created {len(created_questions)} questions",
            "count": len(created_questions),
            "questions": created_questions,
            "branch_code": branch_info.get('branch_code')
        }
        
    except Exception as e:
        print(f"❌ Error creating bulk questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating bulk questions: {str(e)}")

@question_router.get("/{question_id}", response_model=dict)
async def get_question(request: Request, question_id: str, current_user = Depends(get_current_user)):
    """Get a specific question by ID"""
    try:
        print(f"🔍 Fetching question: {question_id}")
        
        # Get database and branch context using MultiTenantManager
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        branch_info = multi_tenant.get_branch_context(current_user)
        
        question = get_question_by_id(question_id, branch_info.get('branch_code'), db)
        
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
            
        return {
            "success": True,
            "question": question,
            "branch_code": branch_info.get('branch_code')
        }
        
    except Exception as e:
        print(f"❌ Error fetching question: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching question: {str(e)}")

@question_router.put("/{question_id}", response_model=dict)
async def update_existing_question(
    request: Request, 
    question_id: str, 
    payload: QuestionUpdate, 
    current_user = Depends(get_current_user)
):
    """Update an existing question"""
    try:
        print(f"🔍 Updating question: {question_id}")
        
        # Get database and branch context using MultiTenantManager
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        branch_info = multi_tenant.get_branch_context(current_user)
        
        # Add update metadata
        update_data = payload.dict(exclude_unset=True)
        update_data.update({
            'updated_by': current_user.get('id', current_user.get('_id')),
            'updated_at': datetime.utcnow().isoformat()
        })
        
        result = update_question(question_id, update_data, branch_info.get('branch_code'), db)
        
        if not result:
            raise HTTPException(status_code=404, detail="Question not found or update failed")
            
        return {
            "success": True,
            "message": "Question updated successfully",
            "branch_code": branch_info.get('branch_code')
        }
        
    except Exception as e:
        print(f"❌ Error updating question: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating question: {str(e)}")

@question_router.delete("/{question_id}", response_model=dict)
async def delete_existing_question(
    request: Request, 
    question_id: str, 
    current_user = Depends(get_current_user)
):
    """Delete a question"""
    # Validate ObjectId format early and return 400 for invalid ids
    try:
        ObjectId(question_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid question id")

    try:
        print(f"🔍 Deleting question: {question_id}")
        
        # Get database and branch context using MultiTenantManager
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        branch_info = multi_tenant.get_branch_context(current_user)
        branch_code = branch_info.get('branch_code')
        franchise_code = branch_info.get('franchise_code')
        
        # Directly inspect the question to determine ownership/authorization
        from app.models.quiz import get_question_collection
        collection = get_question_collection(db)
        question = collection.find_one({"_id": ObjectId(question_id)})

        if not question:
            print(f"❌ Question not found for deletion: {question_id}")
            raise HTTPException(status_code=404, detail="Question not found")

        # Determine if the current user (branch admin) is allowed to delete this question
        # Allowed when:
        # - question.branch_code matches current branch
        # - OR question.franchise_code matches current franchise
        # - OR question has no branch/franchise (legacy)
        # - OR question is marked is_global
        q_branch = question.get('branch_code')
        q_franchise = question.get('franchise_code')
        q_is_global = question.get('is_global', False)

        allowed = False
        user_role = current_user.get('role')
        if user_role in ["franchise_admin", "admin", "branch_admin"] or current_user.get('is_branch_admin'):
            if (q_branch and q_branch == branch_code) or (q_franchise and q_franchise == franchise_code):
                allowed = True
            elif not q_branch and not q_franchise:
                # Legacy question without branch/franchise: allow branch admins to manage
                allowed = True
            elif q_is_global:
                allowed = True

        if not allowed:
            print(f"⚠️ Unauthorized delete attempt by user: role={user_role}, branch={branch_code}, franchise={franchise_code} for question {question_id} (q_branch={q_branch}, q_franchise={q_franchise})")
            raise HTTPException(status_code=403, detail="Forbidden: cannot delete question from another branch")

        # Proceed to delete the question by its ID (no branch filter needed since authorization was checked)
        result = collection.delete_one({"_id": ObjectId(question_id)})
        if result.deleted_count > 0:
            print(f"✅ Question deleted: {question_id}")
            return {
                "success": True,
                "message": "Question deleted successfully",
                "branch_code": branch_code
            }

        # Should not ordinarily happen - deletion failed
        print(f"❌ Deletion attempt failed for question: {question_id}")
        raise HTTPException(status_code=500, detail="Failed to delete question")

    except HTTPException:
        # Re-raise HTTP exceptions so FastAPI can return correct status codes
        raise
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"❌ Error deleting question: {str(e)}")
        print(tb)
        # Return a helpful error message while exposing minimal details
        raise HTTPException(status_code=500, detail=f"Error deleting question")

@question_router.get("/filters/options", response_model=dict)
async def get_filter_options(request: Request, current_user = Depends(get_current_user)):
    """Get available filter options for subjects, courses, and difficulties"""
    try:
        # Get database and branch context using MultiTenantManager
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        branch_info = multi_tenant.get_branch_context(current_user)
        
        from app.models.quiz import get_question_collection
        
        # Get database connection from request
        collection = get_question_collection(db)
        
        # Get unique values for filters
        subjects = collection.distinct("subject", {"branch_code": branch_info.get('branch_code')})
        courses = collection.distinct("course", {"branch_code": branch_info.get('branch_code')})
        difficulties = collection.distinct("difficulty", {"branch_code": branch_info.get('branch_code')})
        
        return {
            "success": True,
            "filters": {
                "subjects": sorted([s for s in subjects if s]),
                "courses": sorted([c for c in courses if c]),
                "difficulties": sorted([d for d in difficulties if d])
            },
            "branch_code": branch_info.get('branch_code')
        }
        
    except Exception as e:
        print(f"❌ Error fetching filter options: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching filter options: {str(e)}")