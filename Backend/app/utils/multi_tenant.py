"""
Multi-tenancy utilities for branch-based data isolation
"""
from fastapi import HTTPException
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class MultiTenantManager:
    """Handles multi-tenant data isolation for branch-based operations"""
    
    def __init__(self, db):
        self.db = db
    
    def get_branch_context(self, user: Dict[str, Any]) -> Dict[str, str]:
        """Extract branch context from authenticated user with role-based access"""
        branch_code = user.get("branch_code")
        franchise_code = user.get("franchise_code")
        role = user.get("role")
        is_branch_admin = user.get("is_branch_admin", False)
        is_branch_student = user.get("is_branch_student", False)
        
        print(f"[MULTI_TENANT] User context: role={role}, is_branch_admin={is_branch_admin}, is_branch_student={is_branch_student}, franchise_code={franchise_code}, branch_code={branch_code}")
        
        # Handle branch students - use their branch_code directly from token
        if is_branch_student or role == "student":
            print(f"[MULTI_TENANT] Branch student access - using branch_code from token: {branch_code}")
            return {
                "franchise_code": franchise_code,
                "branch_code": branch_code,  # Use student's branch_code directly, don't override
                "user_id": user.get("user_id"),
                "email": user.get("email"),
                "role": role,
                "access_level": "STUDENT"
            }
        
        # Only true super admin has global access - no restrictions  
        if role == "super_admin":
            print(f"[MULTI_TENANT] Super admin access granted")
            return {
                "franchise_code": franchise_code or "SUPER_ADMIN",
                "branch_code": branch_code or "SUPER_ADMIN",
                "user_id": user.get("user_id"),
                "email": user.get("email"),
                "role": role,
                "access_level": "GLOBAL"
            }
        
        # Branch admin has access only to their specific branch
        if is_branch_admin:
            print(f"[MULTI_TENANT] Processing branch admin access")
            
            # If branch_code is missing, try to find it from branches collection
            if not branch_code and franchise_code:
                print(f"[MULTI_TENANT] Branch code missing, looking up from franchise: {franchise_code}")
                
                # Look for branch under this franchise
                branch_doc = None
                query_patterns = [
                    {"franchise_code": franchise_code},
                    {"centre_info.franchise_code": franchise_code},
                    {"franchiseCode": franchise_code},
                    {"franchise": franchise_code}
                ]
                
                for pattern in query_patterns:
                    print(f"[MULTI_TENANT] Trying query pattern: {pattern}")
                    branch_doc = self.db.branches.find_one(pattern)
                    if branch_doc:
                        print(f"[MULTI_TENANT] Found branch document with pattern: {pattern}")
                        break
                
                if branch_doc:
                    # Extract branch_code from different possible field patterns
                    if "centre_info" in branch_doc and "branch_code" in branch_doc["centre_info"]:
                        branch_code = branch_doc["centre_info"]["branch_code"]
                        print(f"[MULTI_TENANT] Found branch_code in centre_info: {branch_code}")
                    elif "centre_info" in branch_doc and "code" in branch_doc["centre_info"]:
                        branch_code = branch_doc["centre_info"]["code"]
                        print(f"[MULTI_TENANT] Found code in centre_info: {branch_code}")
                    elif "branch_code" in branch_doc:
                        branch_code = branch_doc["branch_code"]
                        print(f"[MULTI_TENANT] Found direct branch_code: {branch_code}")
                    elif "branchCode" in branch_doc:
                        branch_code = branch_doc["branchCode"]
                        print(f"[MULTI_TENANT] Found branchCode: {branch_code}")
            
            if branch_code:
                print(f"[MULTI_TENANT] Branch admin access for branch: {branch_code}")
                return {
                    "franchise_code": franchise_code,
                    "branch_code": branch_code,
                    "user_id": user.get("user_id"),
                    "email": user.get("email"),
                    "role": role,
                    "access_level": "BRANCH"
                }
            else:
                print(f"[MULTI_TENANT] Warning: Branch admin without valid branch_code")
        
        # Franchise admin has access to all branches in their franchise
        if role == "franchise_admin" or (role == "admin" and franchise_code and not is_branch_admin):
            print(f"[MULTI_TENANT] Franchise admin access for franchise: {franchise_code}")
            
            # For franchise users, always try to get the proper branch_code from branches collection
            if franchise_code:
                print(f"[MULTI_TENANT] Looking for branches with franchise_code: {franchise_code}")
                
                # Look for branches under this franchise - try multiple query patterns
                branch_doc = None
                
                # Try different field patterns for franchise_code
                query_patterns = [
                    {"franchise_code": franchise_code},
                    {"centre_info.franchise_code": franchise_code},
                    {"franchiseCode": franchise_code},
                    {"franchise": franchise_code}
                ]
                
                for pattern in query_patterns:
                    print(f"[MULTI_TENANT] Trying query pattern: {pattern}")
                    branch_doc = self.db.branches.find_one(pattern)
                    if branch_doc:
                        print(f"[MULTI_TENANT] Found branch document with pattern: {pattern}")
                        break
                
                print(f"[MULTI_TENANT] Branch document found: {bool(branch_doc)}")
                if branch_doc:
                    print(f"[MULTI_TENANT] Branch document keys: {list(branch_doc.keys())}")
                
                if branch_doc:
                    # Try different field patterns for branch_code
                    actual_branch_code = None
                
                if "centre_info" in branch_doc and "branch_code" in branch_doc["centre_info"]:
                    actual_branch_code = branch_doc["centre_info"]["branch_code"]
                    print(f"[MULTI_TENANT] Found branch_code in centre_info: {actual_branch_code}")
                elif "centre_info" in branch_doc and "code" in branch_doc["centre_info"]:
                    actual_branch_code = branch_doc["centre_info"]["code"]
                    print(f"[MULTI_TENANT] Found code in centre_info: {actual_branch_code}")
                elif "branch_code" in branch_doc:
                    actual_branch_code = branch_doc["branch_code"]
                    print(f"[MULTI_TENANT] Found direct branch_code: {actual_branch_code}")
                elif "code" in branch_doc:
                    actual_branch_code = branch_doc["code"]
                    print(f"[MULTI_TENANT] Found direct code: {actual_branch_code}")
                elif "branchCode" in branch_doc:
                    actual_branch_code = branch_doc["branchCode"]
                    print(f"[MULTI_TENANT] Found branchCode: {actual_branch_code}")
                    
                if actual_branch_code and actual_branch_code != franchise_code:
                    print(f"[MULTI_TENANT] Using branch_code from database: {actual_branch_code} for franchise: {franchise_code}")
                    branch_code = actual_branch_code
                else:
                    print(f"[MULTI_TENANT] No different branch_code found, using franchise_code as fallback")
                    branch_code = franchise_code
            else:
                print(f"[MULTI_TENANT] No branch document found for franchise: {franchise_code}")
                branch_code = franchise_code
        
            # Return context with franchise-level access
            return {
                "franchise_code": franchise_code,
                "branch_code": branch_code,
                "user_id": user.get("user_id"),
                "email": user.get("email"),
                "role": role,
                "access_level": "FRANCHISE"
            }
        
        # Regular users (students, instructors) - restricted to specific branch
        if not franchise_code and not branch_code:
            print(f"[MULTI_TENANT] User data: {user}")
            raise HTTPException(
                status_code=403, 
                detail="User does not have branch access"
            )
        
        # For students/instructors, look up the actual branch_code from branches collection
        # to ensure we have the correct branch_code (not franchise_code as fallback)
        final_branch_code = branch_code
        final_franchise_code = franchise_code
        
        # If branch_code is missing or same as franchise_code, look it up from branches
        if (not branch_code or branch_code == franchise_code) and franchise_code:
            print(f"[MULTI_TENANT] Looking up branch_code for student/instructor with franchise: {franchise_code}")
            
            # Try to find branch document
            branch_doc = None
            query_patterns = [
                {"franchise_code": franchise_code},
                {"centre_info.franchise_code": franchise_code},
                {"franchiseCode": franchise_code},
                {"franchise": franchise_code}
            ]
            
            for pattern in query_patterns:
                print(f"[MULTI_TENANT] Trying query pattern: {pattern}")
                branch_doc = self.db.branches.find_one(pattern)
                if branch_doc:
                    print(f"[MULTI_TENANT] Found branch document with pattern: {pattern}")
                    break
            
            if branch_doc:
                # Extract actual branch_code
                actual_branch_code = None
                
                if "centre_info" in branch_doc and "branch_code" in branch_doc["centre_info"]:
                    actual_branch_code = branch_doc["centre_info"]["branch_code"]
                    print(f"[MULTI_TENANT] Found branch_code in centre_info: {actual_branch_code}")
                elif "centre_info" in branch_doc and "code" in branch_doc["centre_info"]:
                    actual_branch_code = branch_doc["centre_info"]["code"]
                    print(f"[MULTI_TENANT] Found code in centre_info: {actual_branch_code}")
                elif "branch_code" in branch_doc:
                    actual_branch_code = branch_doc["branch_code"]
                    print(f"[MULTI_TENANT] Found direct branch_code: {actual_branch_code}")
                elif "code" in branch_doc:
                    actual_branch_code = branch_doc["code"]
                    print(f"[MULTI_TENANT] Found direct code: {actual_branch_code}")
                elif "branchCode" in branch_doc:
                    actual_branch_code = branch_doc["branchCode"]
                    print(f"[MULTI_TENANT] Found branchCode: {actual_branch_code}")
                
                if actual_branch_code and actual_branch_code != franchise_code:
                    final_branch_code = actual_branch_code
                    print(f"[MULTI_TENANT] Updated branch_code to: {actual_branch_code}")
                else:
                    # Fallback
                    final_branch_code = branch_code or franchise_code
                    print(f"[MULTI_TENANT] No distinct branch_code found, using fallback: {final_branch_code}")
            else:
                # No branch found, use fallback
                final_branch_code = branch_code or franchise_code
                print(f"[MULTI_TENANT] No branch document found, using fallback: {final_branch_code}")
        else:
            # branch_code is already different from franchise_code, use it
            final_branch_code = branch_code or franchise_code
        
        # Ensure franchise_code is set
        final_franchise_code = franchise_code or branch_code
        
        print(f"[MULTI_TENANT] Final regular user context - branch_code: {final_branch_code}, franchise_code: {final_franchise_code}")
        
        return {
            "franchise_code": final_franchise_code,
            "branch_code": final_branch_code,
            "user_id": user.get("user_id"),
            "email": user.get("email"),
            "role": role,
            "access_level": "BRANCH"
        }
    
    def validate_branch_access(self, user: Dict[str, Any], target_franchise_code: str) -> bool:
        """Validate if user has access to the target franchise"""
        user_franchise = user.get("franchise_code")
        
        if not user_franchise:
            return False
        
        return user_franchise == target_franchise_code
    
    def create_tenant_filter(self, context: Dict[str, str], additional_filters: Dict = None) -> Dict:
        """Create MongoDB filter with tenant isolation and role-based access"""
        access_level = context.get("access_level", "BRANCH")
        role = context.get("role")
        
        # Super admin can access everything - no filters
        if access_level == "GLOBAL":
            print(f"[MULTI_TENANT] Global access - no filters applied")
            base_filter = additional_filters or {}
            return base_filter
        
        # Franchise level access - can access data from their franchise
        elif access_level == "FRANCHISE":
            print(f"[MULTI_TENANT] Franchise level access for: {context['franchise_code']}")
            base_filter = {
                "franchise_code": context["franchise_code"]
            }
            
            # Branch admins might also need branch_code filtering
            if role == "branch_admin" and context["branch_code"] != context["franchise_code"]:
                base_filter["branch_code"] = context["branch_code"]
                print(f"[MULTI_TENANT] Added branch_code filter: {context['branch_code']}")
        
        # Branch level access - restricted to specific branch
        else:
            print(f"[MULTI_TENANT] Branch level access for: {context['branch_code']}")
            base_filter = {
                "franchise_code": context["franchise_code"],
                "branch_code": context["branch_code"]
            }
        
        if additional_filters:
            base_filter.update(additional_filters)
        
        print(f"[MULTI_TENANT] Final filter: {base_filter}")
        return base_filter
    
    def can_access_data(self, context: Dict[str, str], data_franchise_code: str, data_branch_code: str = None) -> bool:
        """Check if user can access data based on role and context"""
        access_level = context.get("access_level", "BRANCH")
        user_role = context.get("role")
        
        # Global access (super admin, admin)
        if access_level == "GLOBAL":
            return True
        
        # Franchise level access
        if access_level == "FRANCHISE":
            # Can access any data within their franchise
            if context["franchise_code"] == data_franchise_code:
                return True
            # Branch admin might have limited access
            if user_role == "branch_admin" and data_branch_code:
                return context["branch_code"] == data_branch_code
            return False
        
        # Branch level access - must match both franchise and branch
        return (context["franchise_code"] == data_franchise_code and 
                context["branch_code"] == data_branch_code)
    
    def add_tenant_data(self, context: Dict[str, str], data: Dict[str, Any]) -> Dict[str, Any]:
        """Add tenant information to data for creation/update operations"""
        access_level = context.get("access_level", "BRANCH")
        
        # Always add franchise_code if it exists
        if context.get("franchise_code") and context["franchise_code"] != "SUPER_ADMIN":
            data["franchise_code"] = context["franchise_code"]
        
        # Add branch_code for branch-level operations
        if access_level in ["BRANCH", "FRANCHISE"] and context.get("branch_code") and context["branch_code"] != "SUPER_ADMIN":
            data["branch_code"] = context["branch_code"]
        
        # Add creator information
        data["created_by"] = context.get("user_id")
        data["created_by_email"] = context.get("email")
        data["created_by_role"] = context.get("role")
        
        print(f"[MULTI_TENANT] Added tenant data: franchise_code={data.get('franchise_code')}, branch_code={data.get('branch_code')}")
        return data
    
    def get_tenant_stats(self, context: Dict[str, str]) -> Dict[str, Any]:
        """Get comprehensive statistics for the tenant"""
        franchise_code = context["franchise_code"]
        
        # Get franchise info
        franchise = self.db.franchises.find_one({"franchise_code": franchise_code})
        if not franchise:
            raise HTTPException(status_code=404, detail="Franchise not found")
        
        # Student statistics
        student_pipeline = [
            {"$match": {"franchise_code": franchise_code}},
            {
                "$group": {
                    "_id": "$admission_status",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        student_stats = {item["_id"]: item["count"] for item in self.db.branch_students.aggregate(student_pipeline)}
        
        # Course statistics (if courses are branch-specific)
        course_stats = self.db.courses.count_documents({"franchise_code": franchise_code})
        
        # Financial statistics
        financial_pipeline = [
            {"$match": {"franchise_code": franchise_code, "admission_status": "ACTIVE"}},
            {
                "$group": {
                    "_id": None,
                    "total_fees": {"$sum": "$total_fee"},
                    "total_discount": {"$sum": "$discount"},
                    "net_revenue": {"$sum": {"$subtract": ["$total_fee", "$discount"]}}
                }
            }
        ]
        
        financial_stats = list(self.db.branch_students.aggregate(financial_pipeline))
        financial_data = financial_stats[0] if financial_stats else {
            "total_fees": 0, "total_discount": 0, "net_revenue": 0
        }
        
        return {
            "franchise_info": {
                "name": franchise.get("franchise_name"),
                "code": franchise_code,
                "status": franchise.get("status"),
                "owner": franchise.get("owner", {}).get("name")
            },
            "students": {
                "active": student_stats.get("ACTIVE", 0),
                "inactive": student_stats.get("INACTIVE", 0),
                "total": sum(student_stats.values())
            },
            "courses": {
                "total": course_stats
            },
            "financial": {
                "total_fees_collected": financial_data.get("total_fees", 0),
                "total_discounts_given": financial_data.get("total_discount", 0),
                "net_revenue": financial_data.get("net_revenue", 0)
            }
        }
    
    def log_tenant_activity(self, context: Dict[str, str], action: str, details: Dict = None):
        """Log tenant-specific activities for audit trail"""
        log_entry = {
            "franchise_code": context["franchise_code"],
            "branch_code": context.get("branch_code"),
            "user_id": context.get("user_id"),
            "user_email": context.get("email"),
            "action": action,
            "details": details or {},
            "timestamp": "$$NOW"  # MongoDB server time
        }
        
        try:
            self.db.audit_logs.insert_one(log_entry)
        except Exception as e:
            logger.warning(f"Failed to log activity: {e}")
    
    def get_branch_students_with_isolation(self, context: Dict[str, str], filters: Dict = None, page: int = 1, limit: int = 20):
        """Get students with full tenant isolation"""
        base_filter = self.create_tenant_filter(context, filters)
        
        skip = (page - 1) * limit
        
        # Get total count for pagination
        total_count = self.db.branch_students.count_documents(base_filter)
        
        # Get students with pagination
        students = list(
            self.db.branch_students
            .find(base_filter)
            .skip(skip)
            .limit(limit)
            .sort("created_at", -1)
        )
        
        # Convert ObjectId to string for JSON serialization
        for student in students:
            student["_id"] = str(student["_id"])
            student["id"] = student["_id"]
        
        return {
            "students": students,
            "pagination": {
                "total": total_count,
                "page": page,
                "limit": limit,
                "pages": (total_count + limit - 1) // limit
            }
        }
    
    def ensure_tenant_isolation_in_update(self, context: Dict[str, str], student_id: str, update_data: Dict):
        """Ensure updates maintain tenant isolation"""
        # Verify student belongs to this tenant
        existing_student = self.db.branch_students.find_one({
            "_id": student_id,
            "franchise_code": context["franchise_code"]
        })
        
        if not existing_student:
            raise HTTPException(status_code=404, detail="Student not found or access denied")
        
        # Prevent changing tenant-critical fields
        restricted_fields = ["franchise_code", "branch_code", "registration_number", "created_at", "created_by"]
        for field in restricted_fields:
            if field in update_data:
                del update_data[field]
        
        return update_data

# Global instance
def get_multi_tenant_manager(db):
    """Factory function to get MultiTenantManager instance"""
    return MultiTenantManager(db)