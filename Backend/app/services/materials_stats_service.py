from typing import Dict, Any, Optional
from bson import ObjectId
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def get_materials_dashboard_stats(db, franchise_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Aggregates statistics for the Materials Dashboard.
    Supports filtering by franchise_id.
    """
    try:
        filter_query = {}
        franchise_code = None

        if franchise_id and franchise_id != 'all':
            try:
                franchise = db.franchises.find_one({"_id": ObjectId(franchise_id)})
                if franchise:
                    franchise_code = franchise.get("franchise_code")
                    if franchise_code:
                        filter_query["franchise_code"] = franchise_code
                    else:
                        # Fallback if no franchise_code (shouldn't happen for valid franchises)
                        # Maybe filter by franchise_id if supported, but standar is code
                        pass 
            except Exception as e:
                logger.error(f"Error fetching franchise for stats: {e}")
                # If invalid ID, maybe return empty or global
                pass

        logger.info(f"Generating material stats with filter: {filter_query}")

        # 1. Courses
        # Use branch_courses collection
        total_courses = db.branch_courses.count_documents(filter_query)
        # Note: 'status': 'active' default? The UI says "All Courses", so maybe total is better, or strictly active.
        # User requested "all cards counts values show appropraite data". 
        # Usually dashboard shows everything or active. 
        # Let's count non-deleted for now if status exists, else all.
        course_filter = filter_query.copy()
        course_filter["status"] = {"$ne": "deleted"}
        total_courses = db.branch_courses.count_documents(course_filter)

        # 2. Instructors
        # Use users collection with role instructor
        instructor_filter = filter_query.copy()
        instructor_filter["role"] = "instructor"
        total_instructors = db.users.count_documents(instructor_filter)

        # 3. Programs
        # Use branch_programs collection
        program_filter = filter_query.copy()
        # program_filter["status"] = {"$ne": "deleted"} # Check if status exists on programs usually
        total_programs = db.branch_programs.count_documents(program_filter)

        # 4. Batches
        # Use branch_batches collection
        batch_filter = filter_query.copy()
        # batch_filter["status"] = {"$ne": "deleted"} 
        total_batches = db.branch_batches.count_documents(batch_filter)

        # 5. Subjects
        # Use branch_subjects collection
        subject_filter = filter_query.copy()
        total_subjects = db.branch_subjects.count_documents(subject_filter)

        # 6. Students / Materials
        # The card says "Study Materials" in the frontend code (line 150), but stats variable is 'totalStudents' (line 31)
        # Wait, the frontend `dataCards` array uses `selectedFranchise === 'all' ? 320 : ...` for "Study Materials" (card id 'materials'), 
        # but the stats state has `totalStudents`.
        # However, looking at the cards:
        # Card 'materials' -> "Study Materials" -> path '/superadmin/materials/resources'
        # The user's code for 'materials' card count is:
        # line 152: `count: selectedFranchise === 'all' ? 320 : Math.floor(Math.random() * 50) + 10,`
        # It does NOT use `stats.totalStudents`.
        # BUT `stats` state has `totalStudents: 1250` (line 31).
        # There is no card for `students` in `dataCards`!
        # `dataCards` has: courses, instructors, programs, batches, subjects, materials.
        
        # S0 I should provide a count for "Study Materials" (PDFs, etc).
        # And I should probably check if there is a 'Students' card missing or if `totalStudents` in state is unused.
        # `dataCards` uses `stats.totalCourses`, `stats.totalInstructors`, `stats.totalPrograms`, `stats.totalBatches`, `stats.totalSubjects`.
        # It does NOT use `stats.totalStudents`.
        # Instead valid 'materials' card uses hardcoded/random.
        
        # So I should fetch count of "Study Materials".
        # This is likely `branch_study_materials` or `pdf_materials` collection.
        # `api/branch_study_materials.py` -> `db.branch_study_materials`.
        
        material_filter = filter_query.copy()
        total_materials = db.branch_study_materials.count_documents(material_filter)

        return {
            "totalCourses": total_courses,
            "totalInstructors": total_instructors,
            "totalPrograms": total_programs,
            "totalBatches": total_batches,
            "totalSubjects": total_subjects,
            "totalMaterials": total_materials # Adding this new field
        }

    except Exception as e:
        logger.error(f"Error generating materials dashboard stats: {e}")
        return {
            "totalCourses": 0,
            "totalInstructors": 0,
            "totalPrograms": 0,
            "totalBatches": 0,
            "totalSubjects": 0,
            "totalMaterials": 0
        }
