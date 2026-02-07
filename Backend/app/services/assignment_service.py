from fastapi import HTTPException
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime
import json
from app.models.assignment import get_assignment_collection
from app.models.submission import get_submission_collection
from app.models.course import get_course_collection
from app.utils.serializers import serialize_assignment, serialize_assignment_list
from typing import List, Optional

def create_assignment(db, payload, instructor_id: str = None):
    """Create a new assignment"""
    
    try:
        print(f"🔍 Assignment service called with:")
        print(f"   - instructor_id: '{instructor_id}' (type: {type(instructor_id)})")
        print(f"   - payload type: {type(payload)}")
        
        collection = get_assignment_collection(db)
        
        # Prepare assignment data
        assignment_data = payload.model_dump()  # Updated from deprecated dict() method
        assignment_data["created_date"] = datetime.utcnow()
        assignment_data["updated_date"] = datetime.utcnow()
        
        # Set instructor_id if provided - handle both ObjectId and string formats
        if instructor_id:
            print(f"🔍 Setting instructor_id: '{instructor_id}' (type: {type(instructor_id)})")
            if instructor_id.startswith('ins'):
                # For 'ins' format IDs, store as string
                assignment_data["instructor_id"] = instructor_id
                print(f"📝 Stored instructor_id as string: '{instructor_id}'")
            else:
                # For ObjectId format, convert to ObjectId
                try:
                    assignment_data["instructor_id"] = ObjectId(instructor_id)
                    print(f"📝 Stored instructor_id as ObjectId: {ObjectId(instructor_id)}")
                except Exception as oid_error:
                    print(f"❌ Error converting instructor_id to ObjectId: {str(oid_error)}")
                    # Fall back to storing as string
                    assignment_data["instructor_id"] = instructor_id
                    print(f"📝 Fallback: Stored instructor_id as string: '{instructor_id}'")
        else:
            print("⚠️  No instructor_id provided")
        
        print(f"🔍 Final assignment_data instructor_id: {assignment_data.get('instructor_id')} (type: {type(assignment_data.get('instructor_id'))})")
        
        # Store course_id as string - no conversion needed
        # The course_id field should be stored as string like "JAVA001", "TEST001" to match the course collection
        if "course_id" in assignment_data:
            course_id_value = assignment_data["course_id"]
            print(f"🔍 Storing course_id as string: '{course_id_value}' (type: {type(course_id_value)})")
            # Keep it as string - don't convert to ObjectId
            assignment_data["course_id"] = str(course_id_value)
        
        # Convert assigned_students to ObjectIds
        if "assigned_students" in assignment_data and assignment_data["assigned_students"]:
            try:
                print(f"🔍 Converting assigned_students: {assignment_data['assigned_students']}")
                assignment_data["assigned_students"] = [ObjectId(student_id) for student_id in assignment_data["assigned_students"]]
                print(f"✅ Successfully converted assigned_students to ObjectIds")
            except Exception as students_error:
                print(f"❌ Error converting assigned_students to ObjectIds: {str(students_error)}")
                # Keep original list if conversion fails
                print(f"📝 Keeping original assigned_students: {assignment_data['assigned_students']}")
        
        # Set status based on visibility for backward compatibility
        if assignment_data.get("visibility") == "published":
            assignment_data["status"] = "published"
        
        # Properly handle file path fields - ensure both are set consistently
        attachment_file = assignment_data.get("attachment_file")
        questions_pdf_path = assignment_data.get("questions_pdf_path")
        
        # If either field has a file path, ensure both are set
        if attachment_file and not questions_pdf_path:
            assignment_data["questions_pdf_path"] = attachment_file
            print(f"🔄 Set questions_pdf_path from attachment_file: {attachment_file}")
        elif questions_pdf_path and not attachment_file:
            assignment_data["attachment_file"] = questions_pdf_path
            print(f"🔄 Set attachment_file from questions_pdf_path: {questions_pdf_path}")
        elif not attachment_file and not questions_pdf_path:
            # Explicitly set both to None if no file is provided
            assignment_data["attachment_file"] = None
            assignment_data["questions_pdf_path"] = None
            print("📝 No file provided - setting both file fields to None")
        
        # Debug logging
        print(f"💾 Saving assignment to database:")
        print(f"   - attachment_file: {assignment_data.get('attachment_file')}")
        print(f"   - questions_pdf_path: {assignment_data.get('questions_pdf_path')}")
        print(f"   - Full assignment data: {json.dumps(assignment_data, default=str, indent=2)}")
        
        try:
            result = collection.insert_one(assignment_data)
            assignment_id = str(result.inserted_id)
            
            # Verify the data was saved correctly
            saved_assignment = collection.find_one({"_id": result.inserted_id})
            print(f"✅ Assignment saved with ID: {assignment_id}")
            print(f"   - Verified attachment_file: {saved_assignment.get('attachment_file')}")
            print(f"   - Verified questions_pdf_path: {saved_assignment.get('questions_pdf_path')}")
            
            return {"success": True, "assignment_id": assignment_id}
        except Exception as db_error:
            print(f"❌ Database error during assignment creation: {str(db_error)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")
            
    except Exception as e:
        print(f"❌ General error creating assignment: {str(e)}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating assignment: {str(e)}")

def get_assignments_for_course(db, course_id, instructor_id: str = None, branch_filter: dict = None):
    """Get all assignments for a specific course"""
    collection = get_assignment_collection(db)
    course_collection = get_course_collection(db)
    submission_collection = get_submission_collection(db)
    
    try:
        # Build query filter - use course_id as string
        query_filter = {"course_id": str(course_id)}
        
        # Apply branch filtering for multi-tenancy
        if branch_filter:
            query_filter.update(branch_filter)
        
        # If instructor_id is provided, filter by instructor
        if instructor_id:
            if instructor_id.startswith('ins'):
                query_filter["instructor_id"] = instructor_id
            else:
                query_filter["instructor_id"] = ObjectId(instructor_id)
        
        assignments = list(collection.find(query_filter))
        print(f"📊 Found {len(assignments)} assignments with course_id '{course_id}'")
        
        # Get course information by course_id string
        course = course_collection.find_one({"course_id": str(course_id)})
        course_name = course.get("title", "Unknown Course") if course else "Unknown Course"
        print(f"📚 Course name: {course_name}")
        
        # Process each assignment
        for assignment in assignments:
            # Get course name
            assignment["course_name"] = course_name
            
            # Calculate submission statistics
            assignment_id = assignment["_id"]
            submissions_cursor = submission_collection.find({"assignment_id": assignment_id})
            submissions = list(submissions_cursor)
            
            assignment["submissions"] = len(submissions)
            assignment["graded"] = len([sub for sub in submissions if sub.get("grade") is not None])
            
            # Calculate average score
            graded_submissions = [sub for sub in submissions if sub.get("grade") is not None]
            if graded_submissions:
                total_score = sum(sub["grade"] for sub in graded_submissions)
                assignment["avg_score"] = round(total_score / len(graded_submissions), 1)
            else:
                assignment["avg_score"] = 0.0
            
            # Ensure backward compatibility
            if "questions_pdf_path" in assignment and assignment["questions_pdf_path"]:
                assignment["attachment_file"] = assignment["questions_pdf_path"]
        
        # Serialize all assignments at once
        return serialize_assignment_list(assignments)
    except Exception as e:
        print(f"Error fetching assignments for course {course_id}: {str(e)}")
        return []

def get_assignments_for_instructor(db, instructor_id: str, branch_filter: dict = None):
    """Get all assignments created by a specific instructor"""
    collection = get_assignment_collection(db)
    course_collection = get_course_collection(db)
    submission_collection = get_submission_collection(db)
    
    try:
        print(f"🔍 Querying assignments for instructor: '{instructor_id}' (type: {type(instructor_id)})")
        
        # Handle both ObjectId format and 'ins' format instructor IDs
        if instructor_id.startswith('ins'):
            # For 'ins' format IDs, use string comparison
            instructor_query = instructor_id
            print(f"🔎 Using string query: '{instructor_query}'")
        else:
            # For ObjectId format, convert to ObjectId
            instructor_query = ObjectId(instructor_id)
            print(f"🔎 Using ObjectId query: {instructor_query}")
        
        # Build query with branch filtering
        query = {"instructor_id": instructor_query}
        if branch_filter:
            query.update(branch_filter)
            
        print(f"🔎 Final query: {query}")
        assignments = list(collection.find(query))
        print(f"📊 Found {len(assignments)} assignments with matching instructor_id")
        
        # If no assignments found, also check for assignments with None instructor_id
        # This is a fallback for assignments that might have been created without proper instructor_id
        if len(assignments) == 0:
            print("🔍 No assignments found with specific instructor_id, checking for assignments with None instructor_id...")
            none_assignments = list(collection.find({"instructor_id": None}))
            print(f"📊 Found {len(none_assignments)} assignments with None instructor_id")
            
            # For now, let's return empty array for security - don't show assignments with None instructor_id
            # In a real scenario, you'd want to fix the data or use a different approach
            
        # Debug: Let's also check what assignments exist in the collection
        print("🔍 DEBUG: Checking all assignments in collection...")
        all_assignments = list(collection.find({}))
        print(f"📊 Total assignments in collection: {len(all_assignments)}")
        for i, assignment in enumerate(all_assignments[-5:]):  # Show last 5
            print(f"  Assignment {i+1}:")
            print(f"    - _id: {assignment.get('_id')}")
            print(f"    - title: {assignment.get('title', 'N/A')}")
            print(f"    - instructor_id: {assignment.get('instructor_id')} (type: {type(assignment.get('instructor_id'))})")
            print(f"    - course_id: {assignment.get('course_id')}")
            print(f"    - attachment_file: {assignment.get('attachment_file', 'NULL')}")
            print(f"    - questions_pdf_path: {assignment.get('questions_pdf_path', 'NULL')}")
        
        print(f"🔄 Continuing with processing {len(assignments)} matching assignments...")
        
        for assignment in assignments:
            # Get course name - look up by course_id string, not _id
            course = course_collection.find_one({"course_id": assignment["course_id"]})
            assignment["course_name"] = course.get("title", "Unknown Course") if course else "Unknown Course"
            
            # Calculate submission statistics
            assignment_id = assignment["_id"]
            submissions_cursor = submission_collection.find({"assignment_id": assignment_id})
            submissions = list(submissions_cursor)
            
            assignment["submissions"] = len(submissions)
            assignment["graded"] = len([sub for sub in submissions if sub.get("grade") is not None])
            
            # Calculate average score
            graded_submissions = [sub for sub in submissions if sub.get("grade") is not None]
            if graded_submissions:
                total_score = sum(sub["grade"] for sub in graded_submissions)
                assignment["avg_score"] = round(total_score / len(graded_submissions), 1)
            else:
                assignment["avg_score"] = 0.0
            
            # Ensure backward compatibility
            if "questions_pdf_path" in assignment and assignment["questions_pdf_path"]:
                assignment["attachment_file"] = assignment["questions_pdf_path"]
        
        # Serialize all assignments at once
        return serialize_assignment_list(assignments)
    except Exception as e:
        print(f"Error fetching assignments for instructor {instructor_id}: {str(e)}")
        return []

def get_assignment_by_id(db, assignment_id: str):
    """Get a specific assignment by ID"""
    collection = get_assignment_collection(db)
    course_collection = get_course_collection(db)
    submission_collection = get_submission_collection(db)
    
    try:
        # Validate and convert assignment_id to ObjectId
        try:
            assignment_obj_id = ObjectId(assignment_id)
            print(f"✅ Valid assignment_id ObjectId: {assignment_obj_id}")
        except InvalidId as oid_error:
            print(f"❌ Invalid assignment_id: {assignment_id}, error: {str(oid_error)}")
            raise HTTPException(status_code=400, detail="Invalid assignment ID format")
        
        assignment = collection.find_one({"_id": assignment_obj_id})
        
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Get course name - look up by course_id string, not _id
        course = course_collection.find_one({"course_id": assignment["course_id"]})
        assignment["course_name"] = course.get("title", "Unknown Course") if course else "Unknown Course"
        
        # Calculate submission statistics
        submissions_cursor = submission_collection.find({"assignment_id": assignment_obj_id})
        submissions = list(submissions_cursor)
        
        assignment["submissions"] = len(submissions)
        assignment["graded"] = len([sub for sub in submissions if sub.get("grade") is not None])
        
        # Calculate average score
        graded_submissions = [sub for sub in submissions if sub.get("grade") is not None]
        if graded_submissions:
            total_score = sum(sub["grade"] for sub in graded_submissions)
            assignment["avg_score"] = round(total_score / len(graded_submissions), 1)
        else:
            assignment["avg_score"] = 0.0
        
        # Ensure backward compatibility
        if "questions_pdf_path" in assignment and assignment["questions_pdf_path"]:
            assignment["attachment_file"] = assignment["questions_pdf_path"]
        
        # Serialize the assignment
        return serialize_assignment(assignment)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid assignment ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching assignment: {str(e)}")

def update_assignment(db, assignment_id, updates, instructor_id: str = None):
    """Update an assignment"""
    collection = get_assignment_collection(db)
    
    try:
        # Validate and convert assignment_id to ObjectId
        try:
            assignment_obj_id = ObjectId(assignment_id)
            print(f"✅ Valid assignment_id ObjectId: {assignment_obj_id}")
        except InvalidId as oid_error:
            print(f"❌ Invalid assignment_id: {assignment_id}, error: {str(oid_error)}")
            raise HTTPException(status_code=400, detail="Invalid assignment ID format")
        
        # If instructor_id is provided, verify ownership with flexible matching
        if instructor_id:
            print(f"🔍 Verifying ownership for instructor_id: '{instructor_id}' (type: {type(instructor_id)})")
            
            # First, get the assignment to see what instructor_id format it has
            existing_assignment = collection.find_one({"_id": assignment_obj_id})
            if not existing_assignment:
                print(f"❌ Assignment {assignment_obj_id} not found in database")
                raise HTTPException(status_code=404, detail="Assignment not found")
            
            stored_instructor_id = existing_assignment.get("instructor_id")
            print(f"🔍 Stored instructor_id: '{stored_instructor_id}' (type: {type(stored_instructor_id)})")
            
            # Try multiple matching strategies
            ownership_verified = False
            
            # Strategy 1: Direct match
            if stored_instructor_id == instructor_id:
                ownership_verified = True
                print("✅ Direct instructor_id match")
            
            # Strategy 2: String vs ObjectId conversion
            elif isinstance(stored_instructor_id, ObjectId) and not instructor_id.startswith('ins'):
                try:
                    if ObjectId(instructor_id) == stored_instructor_id:
                        ownership_verified = True
                        print("✅ ObjectId conversion match")
                except:
                    pass
            
            # Strategy 3: ObjectId vs string conversion
            elif isinstance(instructor_id, str) and not instructor_id.startswith('ins'):
                try:
                    if stored_instructor_id == ObjectId(instructor_id):
                        ownership_verified = True
                        print("✅ String to ObjectId match")
                except:
                    pass
            
            # Strategy 4: Both as strings
            elif str(stored_instructor_id) == str(instructor_id):
                ownership_verified = True
                print("✅ String representation match")
            
            if not ownership_verified:
                print(f"❌ Ownership verification failed:")
                print(f"   - Current user ID: '{instructor_id}' ({type(instructor_id)})")
                print(f"   - Stored instructor ID: '{stored_instructor_id}' ({type(stored_instructor_id)})")
                raise HTTPException(status_code=403, detail="You do not have permission to update this assignment")
            
            print("✅ Ownership verified - proceeding with update")
        
        # Prepare update data
        update_data = updates.model_dump(exclude_unset=True)  # Updated from deprecated dict() method
        update_data["updated_date"] = datetime.utcnow()
        
        # Convert assigned_students to ObjectIds if present
        if "assigned_students" in update_data and update_data["assigned_students"]:
            converted_students = []
            for student_id in update_data["assigned_students"]:
                try:
                    converted_students.append(ObjectId(student_id))
                except InvalidId:
                    print(f"⚠️ Invalid student_id ObjectId: {student_id}, keeping as string")
                    converted_students.append(student_id)
            update_data["assigned_students"] = converted_students
        
        # Store course_id as string - no conversion needed
        # The course_id field should be stored as string like "JAVA001", "TEST001" to match the course collection
        if "course_id" in update_data:
            course_id_value = update_data["course_id"]
            print(f"🔍 Storing course_id as string for update: '{course_id_value}' (type: {type(course_id_value)})")
            # Keep it as string - don't convert to ObjectId
            update_data["course_id"] = str(course_id_value)
        
        # Set status based on visibility for backward compatibility
        if "visibility" in update_data and update_data["visibility"] == "published":
            update_data["status"] = "published"
        elif "visibility" in update_data and update_data["visibility"] == "draft":
            update_data["status"] = "draft"
        
        print(f"🔄 Updating assignment {assignment_obj_id} with data: {update_data}")
        
        result = collection.update_one(
            {"_id": assignment_obj_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        print(f"✅ Assignment update successful. Modified count: {result.modified_count}")
        return {"success": True, "message": "Assignment updated successfully"}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid assignment ID")
    except Exception as e:
        print(f"❌ Full error details in update_assignment: {str(e)}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error updating assignment: {str(e)}")

def delete_assignment(db, assignment_id, instructor_id: str = None):
    """Delete an assignment"""
    collection = get_assignment_collection(db)
    
    try:
        # Validate and convert assignment_id to ObjectId
        try:
            assignment_obj_id = ObjectId(assignment_id)
            print(f"✅ Valid assignment_id ObjectId: {assignment_obj_id}")
        except InvalidId as oid_error:
            print(f"❌ Invalid assignment_id: {assignment_id}, error: {str(oid_error)}")
            raise HTTPException(status_code=400, detail="Invalid assignment ID format")
        
        # Build query - include instructor_id filter if provided
        query = {"_id": assignment_obj_id}
        if instructor_id:
            if instructor_id.startswith('ins'):
                query["instructor_id"] = instructor_id
            else:
                try:
                    instructor_obj_id = ObjectId(instructor_id)
                    query["instructor_id"] = instructor_obj_id
                except InvalidId:
                    # If instructor_id is not a valid ObjectId, treat as string
                    query["instructor_id"] = instructor_id
        
        print(f"🗑️ Deleting assignment with query: {query}")
        
        result = collection.delete_one(query)
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Assignment not found or access denied")
        
        print(f"✅ Assignment deleted successfully. Deleted count: {result.deleted_count}")
        return {"success": True, "message": "Assignment deleted successfully"}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid assignment ID")
    except Exception as e:
        print(f"❌ Full error details in delete_assignment: {str(e)}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error deleting assignment: {str(e)}")


def get_all_assignments(db):
    """Get all assignments in the system (for super admin)"""
    try:
        collection = get_assignment_collection(db)
        course_collection = get_course_collection(db)
        submission_collection = get_submission_collection(db)
        
        # Import the user model to get instructor information
        from app.models.user import get_user_collection
        user_collection = get_user_collection(db)
        
        print(f"🔍 Fetching all assignments from database")
        
        # Get all assignments
        assignments = list(collection.find({}))
        print(f"📊 Found {len(assignments)} total assignments")
        
        # Create dictionaries for quick lookups
        instructor_ids = []
        for assignment in assignments:
            instructor_id = assignment.get('instructor_id')
            if instructor_id:
                instructor_ids.append(instructor_id)
        
        # Remove duplicates
        instructor_ids = list(set(instructor_ids))
        
        # Get instructor details - try both ObjectId and string formats
        instructors_dict = {}
        if instructor_ids:
            print(f"🔍 Looking up {len(instructor_ids)} instructors")
            
            # Try ObjectId format first
            try:
                from bson import ObjectId
                instructor_object_ids = []
                for iid in instructor_ids:
                    try:
                        if not str(iid).startswith('ins'):
                            instructor_object_ids.append(ObjectId(iid))
                    except:
                        pass
                
                if instructor_object_ids:
                    instructors_cursor = user_collection.find({'_id': {'$in': instructor_object_ids}})
                    for instructor in instructors_cursor:
                        instructors_dict[str(instructor['_id'])] = instructor
            except:
                pass
            
            # Also try string format for 'ins' prefixed IDs
            string_instructor_ids = [str(iid) for iid in instructor_ids if str(iid).startswith('ins')]
            if string_instructor_ids:
                instructors_cursor = user_collection.find({'user_id': {'$in': string_instructor_ids}})
                for instructor in instructors_cursor:
                    instructors_dict[instructor.get('user_id', str(instructor['_id']))] = instructor
        
        # Enrich with course information, instructor names and submission counts
        enriched_assignments = []
        for assignment in assignments:
            # Get course information
            if assignment.get('course_id'):
                course = course_collection.find_one({"course_id": assignment['course_id']})
                if course:
                    assignment['course_title'] = course.get('title', 'Unknown Course')
                    assignment['course_name'] = course.get('title', 'Unknown Course')
                else:
                    assignment['course_title'] = 'Unknown Course'
                    assignment['course_name'] = 'Unknown Course'
            else:
                assignment['course_title'] = 'No Course Assigned'
                assignment['course_name'] = 'No Course Assigned'
            
            # Get instructor name from the lookup
            instructor_id = assignment.get('instructor_id')
            if instructor_id:
                # Try to find instructor by different possible keys
                instructor = instructors_dict.get(str(instructor_id)) or instructors_dict.get(instructor_id) or {}
                if instructor:
                    # Try different possible name fields
                    instructor_name = (
                        instructor.get('name') or 
                        instructor.get('full_name') or 
                        instructor.get('username') or 
                        f'Instructor {instructor_id}'
                    )
                    assignment['instructor_name'] = instructor_name
                else:
                    assignment['instructor_name'] = f'Instructor {instructor_id}'
            else:
                assignment['instructor_name'] = 'Unassigned Instructor'
            
            # Get submission count
            assignment_id_str = str(assignment['_id'])
            submission_count = submission_collection.count_documents({"assignment_id": assignment_id_str})
            assignment['submission_count'] = submission_count
            
            enriched_assignments.append(assignment)
        
        print(f"✅ Successfully enriched {len(enriched_assignments)} assignments with instructor and course data")
        return serialize_assignment_list(enriched_assignments)
    except Exception as e:
        print(f"❌ Error getting all assignments: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving assignments: {str(e)}")
