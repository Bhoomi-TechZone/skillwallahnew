

from fastapi import HTTPException, Request
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)

class BranchAccessManager:
    """
    Manages branch-specific access control and data filtering
    """
    
    @staticmethod
    def get_branch_context_from_user(user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract branch context from authenticated user
        
        Args:
            user: Authenticated user data from JWT token
            
        Returns:
            Dict containing branch context or None if not a branch admin
        """
        if not user:
            return None
            
        # Check if user is a branch-specific admin
        is_branch_admin = user.get("is_branch_admin", False)
        access_scope = user.get("access_scope")
        
        if not is_branch_admin or access_scope != "branch":
            return None
            
        return {
            "franchise_code": user.get("franchise_code"),
            "franchise_id": user.get("franchise_id"),
            "franchise_name": user.get("franchise_name"),
            "is_restricted": True,
            "user_id": user.get("user_id"),
            "user_email": user.get("email")
        }
    
    @staticmethod
    def is_super_admin(user: Dict[str, Any]) -> bool:
        """
        Check if user is a super admin with unrestricted access
        
        Args:
            user: Authenticated user data
            
        Returns:
            True if user is super admin, False otherwise
        """
        if not user:
            return False
            
        role = user.get("role", "").lower()
        access_scope = user.get("access_scope", "")
        is_branch_admin = user.get("is_branch_admin", False)
        
        # User must explicitly be a super admin with global scope AND not be a branch admin
        return (
            role in ["super_admin", "superadmin"] and
            access_scope == "global" and
            is_branch_admin is False
        )
    
    @staticmethod
    def is_branch_restricted(user: Dict[str, Any]) -> bool:
        """
        Check if user is a branch admin with restricted access
        
        Args:
            user: Authenticated user data
            
        Returns:
            True if user is branch admin, False otherwise
        """
        if not user:
            return False
            
        is_branch_admin = user.get("is_branch_admin", False)
        access_scope = user.get("access_scope", "")
        
        return is_branch_admin and access_scope == "branch"
    
    @staticmethod
    def get_branch_filter(user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get MongoDB filter for branch-specific queries
        
        Args:
            user: Authenticated user data
            
        Returns:
            Dict containing MongoDB filter conditions
        """
        # If super admin, return empty filter (no restrictions)
        if BranchAccessManager.is_super_admin(user):
            return {}
            
        # If branch admin, return franchise-specific filter
        branch_context = BranchAccessManager.get_branch_context_from_user(user)
        if branch_context:
            return {"franchise_code": branch_context["franchise_code"]}
            
        # Default: no access
        logger.warning(f"User {user.get('email', 'unknown')} has no valid access context")
        return {"_id": {"$exists": False}}  # This will match no documents
    
    @staticmethod
    def add_branch_filter_to_query(query: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add branch filtering to existing MongoDB query
        
        Args:
            query: Existing MongoDB query
            user: Authenticated user data
            
        Returns:
            Modified query with branch filtering applied
        """
        branch_filter = BranchAccessManager.get_branch_filter(user)
        
        if not branch_filter:
            return query
            
        # Merge branch filter with existing query
        if query:
            return {"$and": [query, branch_filter]}
        else:
            return branch_filter
    
    @staticmethod
    def validate_branch_access(user: Dict[str, Any], resource_franchise_code: str) -> bool:
        """
        Validate if user can access a specific resource based on franchise code
        
        Args:
            user: Authenticated user data
            resource_franchise_code: The franchise code of the resource being accessed
            
        Returns:
            True if access is allowed, False otherwise
        """
        # Super admins can access everything
        if BranchAccessManager.is_super_admin(user):
            return True
            
        # Branch admins can only access their own franchise data
        branch_context = BranchAccessManager.get_branch_context_from_user(user)
        if branch_context:
            return branch_context["franchise_code"] == resource_franchise_code
            
        return False
    
    @staticmethod
    def get_accessible_franchise_codes(user: Dict[str, Any]) -> List[str]:
        """
        Get list of franchise codes that the user can access
        
        Args:
            user: Authenticated user data
            
        Returns:
            List of accessible franchise codes
        """
        # Super admins can access all franchises
        if BranchAccessManager.is_super_admin(user):
            return []  # Empty list means "all" for super admin queries
            
        # Branch admins can only access their own franchise
        branch_context = BranchAccessManager.get_branch_context_from_user(user)
        if branch_context and branch_context["franchise_code"]:
            return [branch_context["franchise_code"]]
            
        return []
    
    @staticmethod
    def filter_data_for_branch(data: List[Dict[str, Any]], user: Dict[str, Any], 
                              franchise_code_field: str = "franchise_code") -> List[Dict[str, Any]]:
        """
        Filter data list to only include items accessible by the user
        
        Args:
            data: List of data items to filter
            user: Authenticated user data
            franchise_code_field: Field name containing franchise code in data items
            
        Returns:
            Filtered list of data items
        """
        # Super admins see everything
        if BranchAccessManager.is_super_admin(user):
            return data
            
        # Get user's accessible franchise codes
        accessible_codes = BranchAccessManager.get_accessible_franchise_codes(user)
        
        if not accessible_codes:
            return []
            
        # Filter data to only include accessible items
        filtered_data = []
        for item in data:
            item_franchise_code = item.get(franchise_code_field)
            if item_franchise_code in accessible_codes:
                filtered_data.append(item)
                
        return filtered_data

    @staticmethod
    def add_franchise_code_to_data(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Automatically add franchise_code to data being created by branch admin
        
        Args:
            data: Data being created/updated
            user: Authenticated user data
            
        Returns:
            Data with franchise_code added if applicable
        """
        # Only add franchise code for branch admins
        branch_context = BranchAccessManager.get_branch_context_from_user(user)
        if branch_context:
            data["franchise_code"] = branch_context["franchise_code"]
            data["franchise_id"] = branch_context["franchise_id"]
            data["created_by_franchise"] = branch_context["franchise_name"]
            
        return data

def require_branch_access(allowed_roles: List[str] = None):
    """
    Decorator to enforce branch-specific access control
    
    Args:
        allowed_roles: List of roles that can access this endpoint
        
    Returns:
        Decorated function that enforces branch access
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Extract request and user from args/kwargs
            request = None
            user = None
            
            # Find request object in args
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            # Get user from request state
            if request and hasattr(request.state, "user"):
                user = request.state.user
                
            if not user:
                raise HTTPException(status_code=401, detail="Authentication required")
                
            # Check role if specified
            if allowed_roles:
                user_role = user.get("role", "").lower()
                if user_role not in [role.lower() for role in allowed_roles]:
                    raise HTTPException(status_code=403, detail="Insufficient permissions")
            
            # Add branch context to kwargs for the function
            kwargs["branch_context"] = BranchAccessManager.get_branch_context_from_user(user)
            kwargs["is_super_admin"] = BranchAccessManager.is_super_admin(user)
            
            return func(*args, **kwargs)
        return wrapper
    return decorator