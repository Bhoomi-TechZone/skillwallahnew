from fastapi import Request, HTTPException, Depends
from app.utils.jwt_handler import decode_token

def verify_token(token: str):
    if not token:
        return None
    
    payload = decode_token(token)
    if not payload:
        return None
    
    return payload

def get_current_user(token: str):
    return verify_token(token)

async def get_admin_user(request: Request):
    import logging
    logger = logging.getLogger("uvicorn")
    
    user = getattr(request.state, 'user', None)
    logger.info(f"[Auth] get_admin_user called for {request.url.path}")
    logger.info(f"[Auth] User from request state: {user}")
    
    if not user:
        logger.warning(f"[Auth] No user found in request state for {request.url.path}")
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Check if user has admin role
    user_role = user.get("role", "")
    logger.info(f"[Auth] User role: {user_role}")
    
    if user_role not in ["admin", "super_admin"]:
        logger.warning(f"[Auth] User {user.get('email')} with role '{user_role}' attempted to access admin endpoint")
        raise HTTPException(status_code=403, detail="Admin access required")
    
    logger.info(f"[Auth] Admin access granted to {user.get('email')} with role {user_role}")
    return user

async def get_authenticated_user(request: Request):
    user = getattr(request.state, 'user', None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    return user

def role_required(required_roles: list):
    async def role_checker(request: Request):
        user = getattr(request.state, 'user', None)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user_role = user.get("role", "")
        if user_role not in required_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        return user
    return role_checker
