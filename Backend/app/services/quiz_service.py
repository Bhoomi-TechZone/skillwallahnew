from bson import ObjectId
from datetime import datetime
from typing import List, Dict, Any
import traceback
from app.models.quiz import get_quiz_collection, get_question_collection
from app.models.quiz_attempt import get_quiz_attempt_collection

def create_quiz(db, payload):
    """Create a new quiz with embedded questions"""
    try:
        # Prepare quiz data
        quiz_data = payload.dict()
        quiz_data['created_at'] = datetime.utcnow()
        quiz_data['updated_at'] = datetime.utcnow()
        
        # Process and validate questions
        processed_questions = []
        for i, question in enumerate(quiz_data.get('questions', [])):
            processed_question = {
                'type': question.get('type'),
                'question': question.get('question'),
                'points': question.get('points', 1)
            }
            
            # Handle different question types
            if question.get('type') == 'mcq':
                processed_question['options'] = question.get('options', [])
                processed_question['correct_answer'] = question.get('correct_answer')
            elif question.get('type') == 'true_false':
                processed_question['correct_answer'] = question.get('correct_answer')
            elif question.get('type') == 'fill_blanks':
                processed_question['correct_answer'] = question.get('correct_answer')
            elif question.get('type') == 'subjective':
                processed_question['expected_answer'] = question.get('expected_answer', '')
                # For subjective questions, we don't have a definitive correct answer
                processed_question['correct_answer'] = None
            
            # Add explanation if provided
            if question.get('explanation'):
                processed_question['explanation'] = question.get('explanation')
            
            processed_questions.append(processed_question)
        
        quiz_data['questions'] = processed_questions
        
        # Calculate total points
        total_points = sum(q.get('points', 1) for q in processed_questions)
        quiz_data['total_points'] = total_points
        quiz_data['total_questions'] = len(processed_questions)
        
        # Set default values if not provided
        quiz_data.setdefault('is_active', True)
        quiz_data.setdefault('passing_score', 70)
        quiz_data.setdefault('randomize_questions', False)
        quiz_data.setdefault('show_results_immediately', True)
        
        # Insert quiz with embedded questions
        result = get_quiz_collection(db).insert_one(quiz_data)
        quiz_id = str(result.inserted_id)
        
        print(f"✅ Quiz created successfully: {quiz_id} with {len(processed_questions)} questions")
        
        return {
            "success": True,
            "quiz_id": quiz_id,
            "message": f"Quiz created successfully with {quiz_data['total_questions']} questions",
            "total_questions": quiz_data['total_questions'],
            "total_points": total_points
        }
    except Exception as e:
        print(f"Error creating quiz: {str(e)}")
        import traceback
        traceback.print_exc()
        raise Exception(f"Failed to create quiz: {str(e)}")

def add_question(db, payload):
    """Add a single question to existing quiz (legacy support)"""
    question_data = payload.dict()
    question_data['created_at'] = datetime.utcnow()
    
    result = get_question_collection(db).insert_one(question_data)
    return {"question_id": str(result.inserted_id)}

def get_all_quizzes(db):
    """Get all quizzes from the database"""
    try:
        quizzes = list(get_quiz_collection(db).find({}))
        
        # Convert ObjectId fields to strings for JSON serialization
        for quiz in quizzes:
            quiz["_id"] = str(quiz["_id"])
            quiz["id"] = str(quiz["_id"])  # Add id field for frontend compatibility
            
            if isinstance(quiz.get("course_id"), ObjectId):
                quiz["course_id"] = str(quiz["course_id"])
            
            if isinstance(quiz.get("created_by"), ObjectId):
                quiz["created_by"] = str(quiz["created_by"])
            
            # Ensure required fields exist
            quiz.setdefault('total_questions', len(quiz.get('questions', [])))
            quiz.setdefault('total_points', sum(q.get('points', 1) for q in quiz.get('questions', [])))
            quiz.setdefault('is_active', True)
            quiz.setdefault('passing_score', 70)
            quiz.setdefault('randomize_questions', False)
            quiz.setdefault('show_results_immediately', True)
            
            # Ensure dates are properly formatted
            if quiz.get('created_at') and not isinstance(quiz['created_at'], str):
                quiz['created_at'] = quiz['created_at'].isoformat() if hasattr(quiz['created_at'], 'isoformat') else str(quiz['created_at'])
            if quiz.get('updated_at') and not isinstance(quiz['updated_at'], str):
                quiz['updated_at'] = quiz['updated_at'].isoformat() if hasattr(quiz['updated_at'], 'isoformat') else str(quiz['updated_at'])
            
        return quizzes
    except Exception as e:
        print(f"Error fetching quizzes: {str(e)}")
        return []

def get_quiz_by_id(db, quiz_id: str, for_student: bool = False):
    """Get a specific quiz by ID"""
    try:
        # Convert string ID to ObjectId
        object_id = ObjectId(quiz_id)
        quiz = get_quiz_collection(db).find_one({"_id": object_id})
        
        if not quiz:
            return None
        
        # Convert ObjectId fields to strings
        quiz["_id"] = str(quiz["_id"])
        quiz["id"] = str(quiz["_id"])
        
        if isinstance(quiz.get("course_id"), ObjectId):
            quiz["course_id"] = str(quiz["course_id"])
            
        if isinstance(quiz.get("created_by"), ObjectId):
            quiz["created_by"] = str(quiz["created_by"])
        
        # Ensure required fields exist
        quiz.setdefault('total_questions', len(quiz.get('questions', [])))
        quiz.setdefault('total_points', sum(q.get('points', 1) for q in quiz.get('questions', [])))
        quiz.setdefault('is_active', True)
        quiz.setdefault('passing_score', 70)
        quiz.setdefault('randomize_questions', False)
        quiz.setdefault('show_results_immediately', True)
        
        # If this is for a student, remove correct answers and sensitive data
        if for_student and quiz.get('questions'):
            student_questions = []
            for i, question in enumerate(quiz['questions']):
                student_question = {
                    'index': i,
                    'type': question.get('type'),
                    'question': question.get('question'),
                    'points': question.get('points', 1)
                }
                
                # Add options for MCQ but not correct answer
                if question.get('type') == 'mcq' and question.get('options'):
                    student_question['options'] = question['options']
                
                # For subjective questions, don't include expected_answer
                if question.get('type') == 'subjective':
                    # Don't include expected_answer for students
                    pass
                
                student_questions.append(student_question)
            
            quiz['questions'] = student_questions
        
        # Ensure dates are properly formatted
        if quiz.get('created_at') and not isinstance(quiz['created_at'], str):
            quiz['created_at'] = quiz['created_at'].isoformat() if hasattr(quiz['created_at'], 'isoformat') else str(quiz['created_at'])
        if quiz.get('updated_at') and not isinstance(quiz['updated_at'], str):
            quiz['updated_at'] = quiz['updated_at'].isoformat() if hasattr(quiz['updated_at'], 'isoformat') else str(quiz['updated_at'])
        
        return quiz
    except Exception as e:
        print(f"Error fetching quiz {quiz_id}: {str(e)}")
        return None

def get_quizzes_for_course(db, course_id):
    """Get all quizzes for a specific course"""
    try:
        # Try both ObjectId and string format for course_id
        query_conditions = [{"course_id": course_id}]
        
        if isinstance(course_id, str) and len(course_id) == 24:
            try:
                query_conditions.append({"course_id": ObjectId(course_id)})
            except:
                pass
        
        quizzes = []
        for condition in query_conditions:
            found_quizzes = list(get_quiz_collection(db).find(condition))
            if found_quizzes:
                quizzes = found_quizzes
                break
        
        # Convert ObjectId fields to strings for JSON serialization
        for quiz in quizzes:
            quiz["_id"] = str(quiz["_id"])
            quiz["id"] = str(quiz["_id"])
            
            if isinstance(quiz.get("course_id"), ObjectId):
                quiz["course_id"] = str(quiz["course_id"])
            
            if isinstance(quiz.get("created_by"), ObjectId):
                quiz["created_by"] = str(quiz["created_by"])
            
            # Ensure required fields exist
            quiz.setdefault('total_questions', len(quiz.get('questions', [])))
            quiz.setdefault('total_points', sum(q.get('points', 1) for q in quiz.get('questions', [])))
            quiz.setdefault('is_active', True)
            quiz.setdefault('passing_score', 70)
            quiz.setdefault('randomize_questions', False)
            quiz.setdefault('show_results_immediately', True)
            
            # Ensure dates are properly formatted
            if quiz.get('created_at') and not isinstance(quiz['created_at'], str):
                quiz['created_at'] = quiz['created_at'].isoformat() if hasattr(quiz['created_at'], 'isoformat') else str(quiz['created_at'])
            if quiz.get('updated_at') and not isinstance(quiz['updated_at'], str):
                quiz['updated_at'] = quiz['updated_at'].isoformat() if hasattr(quiz['updated_at'], 'isoformat') else str(quiz['updated_at'])
            
        return quizzes
    except Exception as e:
        print(f"Error fetching quizzes for course {course_id}: {str(e)}")
        return []

def get_questions_for_quiz(db, quiz_id):
    """Get questions for a quiz (legacy support for separate questions collection)"""
    try:
        # First try to get questions from the quiz document itself
        quiz = get_quiz_by_id(db, quiz_id)
        if quiz and quiz.get('questions'):
            return quiz['questions']
        
        # Fallback to separate questions collection
        query_conditions = [{"quiz_id": quiz_id}]
        
        if isinstance(quiz_id, str) and len(quiz_id) == 24:
            try:
                query_conditions.append({"quiz_id": ObjectId(quiz_id)})
            except:
                pass
        
        questions = []
        for condition in query_conditions:
            found_questions = list(get_question_collection(db).find(condition))
            if found_questions:
                questions = found_questions
                break
        
        # Convert ObjectId fields to strings
        for question in questions:
            question["_id"] = str(question["_id"])
            if isinstance(question.get("quiz_id"), ObjectId):
                question["quiz_id"] = str(question["quiz_id"])
        
        return questions
    except Exception as e:
        print(f"Error fetching questions for quiz {quiz_id}: {str(e)}")
        return []

def update_quiz(db, quiz_id, payload):
    """Update an existing quiz"""
    try:
        update_data = payload.dict(exclude_unset=True)
        update_data['updated_at'] = datetime.utcnow()
        
        result = get_quiz_collection(db).update_one(
            {"_id": ObjectId(quiz_id)},
            {"$set": update_data}
        )
        
        return {
            "success": result.modified_count > 0,
            "updated": result.modified_count > 0,
            "message": "Quiz updated successfully" if result.modified_count > 0 else "No changes made"
        }
    except Exception as e:
        print(f"Error updating quiz {quiz_id}: {str(e)}")
        return {"success": False, "error": str(e)}

def submit_quiz_attempt(db, quiz_id: str, student_id: str, answers: List[Dict], time_taken: int = None):
    """Submit and grade a quiz attempt"""
    try:
        # Get the quiz
        quiz = get_quiz_by_id(db, quiz_id)
        if not quiz:
            raise Exception("Quiz not found")
        
        # Grade the answers
        graded_answers = []
        total_points_earned = 0
        total_possible_points = 0
        
        quiz_questions = quiz.get('questions', [])
        
        for answer in answers:
            question_index = answer.get('question_index', 0)
            student_answer = answer.get('student_answer')
            
            if question_index < len(quiz_questions):
                question = quiz_questions[question_index]
                question_points = question.get('points', 1)
                total_possible_points += question_points
                
                # Grade the answer based on question type
                is_correct, points_earned = grade_answer(question, student_answer)
                
                graded_answer = {
                    'question_index': question_index,
                    'student_answer': student_answer,
                    'is_correct': is_correct,
                    'points_earned': points_earned,
                    'question_type': question.get('type'),
                    'correct_answer': question.get('correct_answer') if question.get('type') != 'subjective' else None
                }
                
                graded_answers.append(graded_answer)
                total_points_earned += points_earned
        
        # Calculate percentage and pass status
        percentage = (total_points_earned / total_possible_points * 100) if total_possible_points > 0 else 0
        passing_score = quiz.get('passing_score', 70)
        is_passed = percentage >= passing_score
        
        # Create attempt document
        attempt_data = {
            'quiz_id': ObjectId(quiz_id),
            'student_id': ObjectId(student_id) if isinstance(student_id, str) else student_id,
            'answers': graded_answers,
            'score': total_points_earned,
            'total_questions': len(quiz_questions),
            'total_points': total_possible_points,
            'points_earned': total_points_earned,
            'percentage': round(percentage, 2),
            'time_taken': time_taken,
            'is_passed': is_passed,
            'reviewed': False,  # Will be True after manual review for subjective questions
            'submitted_at': datetime.utcnow()
        }
        
        # Save attempt
        result = get_quiz_attempt_collection(db).insert_one(attempt_data)
        
        return {
            'success': True,
            'attempt_id': str(result.inserted_id),
            'score': total_points_earned,
            'total_points': total_possible_points,
            'percentage': round(percentage, 2),
            'is_passed': is_passed,
            'answers': graded_answers,
            'message': f'Quiz submitted successfully. Score: {total_points_earned}/{total_possible_points} ({percentage:.1f}%)'
        }
        
    except Exception as e:
        print(f"Error submitting quiz attempt: {str(e)}")
        raise Exception(f"Failed to submit quiz attempt: {str(e)}")

def grade_answer(question: Dict[str, Any], student_answer: Any) -> tuple[bool, int]:
    """Grade a single answer based on question type"""
    question_type = question.get('type')
    correct_answer = question.get('correct_answer')
    question_points = question.get('points', 1)
    
    if not student_answer:
        return False, 0
    
    try:
        if question_type == 'mcq':
            # For MCQ, compare the selected answer text
            is_correct = str(student_answer).strip().lower() == str(correct_answer).strip().lower()
            return is_correct, question_points if is_correct else 0
            
        elif question_type == 'true_false':
            # For True/False, compare boolean or string values
            student_str = str(student_answer).strip().lower()
            correct_str = str(correct_answer).strip().lower()
            is_correct = student_str == correct_str
            return is_correct, question_points if is_correct else 0
            
        elif question_type == 'fill_blanks':
            # For fill in the blanks, do case-insensitive comparison
            student_str = str(student_answer).strip().lower()
            correct_str = str(correct_answer).strip().lower()
            is_correct = student_str == correct_str
            return is_correct, question_points if is_correct else 0
            
        elif question_type == 'subjective':
            # Subjective questions need manual grading
            return None, 0  # Will be graded manually
            
        else:
            return False, 0
            
    except Exception as e:
        print(f"Error grading answer: {str(e)}")
        return False, 0

def get_quiz_attempts(db, quiz_id: str = None, student_id: str = None):
    """Get quiz attempts with optional filtering"""
    try:
        query = {}
        
        if quiz_id:
            query['quiz_id'] = ObjectId(quiz_id) if isinstance(quiz_id, str) else quiz_id
            
        if student_id:
            query['student_id'] = ObjectId(student_id) if isinstance(student_id, str) else student_id
        
        attempts = list(get_quiz_attempt_collection(db).find(query).sort('submitted_at', -1))
        
        # Convert ObjectIds to strings
        for attempt in attempts:
            attempt['_id'] = str(attempt['_id'])
            attempt['id'] = str(attempt['_id'])
            attempt['quiz_id'] = str(attempt['quiz_id'])
            attempt['student_id'] = str(attempt['student_id'])
        
        return attempts
        
    except Exception as e:
        print(f"Error fetching quiz attempts: {str(e)}")
        return []

def get_quiz_statistics(db, instructor_id: str = None):
    """Get quiz statistics for instructor dashboard"""
    try:
        # Base query for instructor's quizzes
        quiz_query = {}
        if instructor_id:
            quiz_query['created_by'] = instructor_id
        
        # Get all quizzes
        quizzes = list(get_quiz_collection(db).find(quiz_query))
        total_quizzes = len(quizzes)
        published_quizzes = len([q for q in quizzes if q.get('is_active', True)])
        
        # Get quiz attempts for these quizzes
        quiz_ids = [q['_id'] for q in quizzes]
        attempts = list(get_quiz_attempt_collection(db).find({'quiz_id': {'$in': quiz_ids}}))
        
        total_attempts = len(attempts)
        
        # Calculate average score
        if attempts:
            avg_percentage = sum(a.get('percentage', 0) for a in attempts) / len(attempts)
        else:
            avg_percentage = 0
        
        return {
            'total_quizzes': total_quizzes,
            'published_quizzes': published_quizzes,
            'total_attempts': total_attempts,
            'average_score': round(avg_percentage, 1)
        }
        
    except Exception as e:
        print(f"Error fetching quiz statistics: {str(e)}")
        return {
            'total_quizzes': 0,
            'published_quizzes': 0,
            'total_attempts': 0,
            'average_score': 0
        }
