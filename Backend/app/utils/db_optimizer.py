"""
Database optimization script - adds indexes for better performance
"""
from pymongo import ASCENDING, DESCENDING, IndexModel
import logging

logger = logging.getLogger("uvicorn")

def create_database_indexes(db):
    """Create indexes for all collections to optimize queries"""
    try:
        # Users collection indexes (skip unique email if duplicates exist)
        users = db["users"]
        try:
            users.create_index([("email", ASCENDING)], unique=True, background=True)
        except Exception as e:
            logger.warning(f"⚠️ Could not create unique email index (duplicates may exist): {str(e)[:100]}")
            # Create non-unique index instead
            users.create_index([("email", ASCENDING)], background=True)
        users.create_index([("role", ASCENDING)], background=True)
        users.create_index([("created_at", DESCENDING)], background=True)
        logger.info("✅ Created indexes for users collection")
        
        # Franchises collection indexes
        franchises = db["franchises"]
        franchises.create_index([("franchise_code", ASCENDING)], unique=True, background=True)
        franchises.create_index([("owner.email", ASCENDING)], background=True)
        franchises.create_index([("status", ASCENDING)], background=True)
        logger.info("✅ Created indexes for franchises collection")
        
        # Branches collection indexes
        branches = db["branches"]
        branches.create_index([("franchise_code", ASCENDING)], background=True)
        branches.create_index([("branchCode", ASCENDING)], background=True)
        branches.create_index([("branch_code", ASCENDING)], background=True)
        branches.create_index([("status", ASCENDING)], background=True)
        logger.info("✅ Created indexes for branches collection")
        
        # Courses collection indexes
        courses = db["courses"]
        courses.create_index([("created_by", ASCENDING)], background=True)
        courses.create_index([("is_published", ASCENDING)], background=True)
        courses.create_index([("created_at", DESCENDING)], background=True)
        courses.create_index([("franchise_code", ASCENDING)], background=True)
        logger.info("✅ Created indexes for courses collection")
        
        # Enrollments collection indexes
        enrollments = db["enrollments"]
        enrollments.create_index([("student_id", ASCENDING)], background=True)
        enrollments.create_index([("course_id", ASCENDING)], background=True)
        enrollments.create_index([("enrolled_at", DESCENDING)], background=True)
        enrollments.create_index([("franchise_code", ASCENDING)], background=True)
        logger.info("✅ Created indexes for enrollments collection")
        
        # Certificates collection indexes
        certificates = db["certificates"]
        certificates.create_index([("student_id", ASCENDING)], background=True)
        certificates.create_index([("course_id", ASCENDING)], background=True)
        certificates.create_index([("issued_at", DESCENDING)], background=True)
        logger.info("✅ Created indexes for certificates collection")
        
        # Branch students collection indexes
        branch_students = db["branch_students"]
        branch_students.create_index([("branch_code", ASCENDING)], background=True)
        branch_students.create_index([("franchise_code", ASCENDING)], background=True)
        branch_students.create_index([("email", ASCENDING)], background=True)
        branch_students.create_index([("student_id", ASCENDING)], background=True)
        logger.info("✅ Created indexes for branch_students collection")
        
        # Branch courses collection indexes
        branch_courses = db["branch_courses"]
        branch_courses.create_index([("branch_code", ASCENDING)], background=True)
        branch_courses.create_index([("franchise_code", ASCENDING)], background=True)
        branch_courses.create_index([("courseCode", ASCENDING)], background=True)
        logger.info("✅ Created indexes for branch_courses collection")
        
        # Branch batches collection indexes
        branch_batches = db["branch_batches"]
        branch_batches.create_index([("branch_code", ASCENDING)], background=True)
        branch_batches.create_index([("franchise_code", ASCENDING)], background=True)
        branch_batches.create_index([("batchCode", ASCENDING)], background=True)
        logger.info("✅ Created indexes for branch_batches collection")
        
        # Branch programs collection indexes
        branch_programs = db["branch_programs"]
        branch_programs.create_index([("branch_code", ASCENDING)], background=True)
        branch_programs.create_index([("franchise_code", ASCENDING)], background=True)
        logger.info("✅ Created indexes for branch_programs collection")
        
        logger.info("🎉 All database indexes created successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating indexes: {e}")
        return False
