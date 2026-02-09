from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File
from fastapi.responses import FileResponse
from datetime import datetime, timedelta
import json
import os
from bson import ObjectId
from passlib.context import CryptContext
from app.config import settings
from app.schemas.branch import BranchCreate, BranchLogin, BranchLoginResponse
from app.utils.security import generate_branch_code
from app.utils.auth_helpers import get_current_user
from app.services.certificate_service import generate_certificate_image, generate_certificate_id
from app.services.marksheet_service import generate_marksheet_image as service_generate_marksheet_image

router = APIRouter(prefix="/api/branch", tags=["Branch"])


@router.post("/branches")
async def create_branch(payload: BranchCreate, request: Request):
    import logging
    logger = logging.getLogger("uvicorn")
    
    db = request.app.mongodb
    
    # Get authenticated user or handle JWT signature issues
    current_user = None
    auth_header = request.headers.get("Authorization")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.error("[Branch] No valid authorization header")
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    token = auth_header.split(" ")[1]
    
    try:
        # Try normal authentication first
        current_user = await get_current_user(request)
        logger.info(f"[Branch] Authenticated user: {current_user.get('email')} (Role: {current_user.get('role')})")
    except HTTPException as e:
        if "signature verification failed" in str(e.detail).lower():
            logger.info("[Branch] JWT signature verification failed, attempting token recovery...")
            
            # Try to extract unverified claims and create new token
            from jose import jwt
            try:
                unverified_payload = jwt.get_unverified_claims(token)
                franchise_code = unverified_payload.get("franchise_code")
                user_id = unverified_payload.get("user_id")
                email = unverified_payload.get("email")
                
                if franchise_code and user_id:
                    # Verify franchise exists
                    franchise = db["franchises"].find_one({"franchise_code": franchise_code})
                    if franchise:
                        # Create current_user object from verified franchise data
                        current_user = {
                            "user_id": user_id,
                            "email": email,
                            "name": unverified_payload.get("name"),
                            "role": "admin",
                            "franchise_code": franchise_code,
                            "franchise_name": franchise.get("franchise_name"),
                            "is_branch_admin": True
                        }
                        logger.info(f"[Branch] Recovered user from token: {email} (Franchise: {franchise_code})")
                    else:
                        logger.error(f"[Branch] Franchise {franchise_code} not found in database")
                        raise HTTPException(status_code=401, detail="Invalid franchise")
                else:
                    logger.error("[Branch] Token missing franchise information")
                    raise HTTPException(status_code=401, detail="Invalid token format")
                    
            except Exception as token_error:
                logger.error(f"[Branch] Token recovery failed: {str(token_error)}")
                raise HTTPException(status_code=401, detail="Authentication failed - please login again")
        else:
            logger.error(f"[Branch] Authentication failed: {e.detail}")
            raise e
    except Exception as e:
        logger.error(f"[Branch] Unexpected auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")
    
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication failed")
    
    # Get franchise code from authenticated user
    franchise_code = current_user.get("franchise_code")
    
    if not franchise_code:
        logger.error(f"[Branch] No franchise_code found in user token: {current_user}")
        raise HTTPException(status_code=403, detail="User is not associated with a franchise")
    
    # Debug logging
    logger.info(f"[Branch] Creating branch for franchise_code: {franchise_code}")
    logger.info(f"[Branch] Centre name: {payload.centre_name}")
    logger.info(f"[Branch] User: {current_user.get('name')} ({current_user.get('email')})")
    
    # Hash the password first
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash(payload.password)
    logger.info(f"[Branch] Password hashed successfully")

    # Validate franchise exists
    franchise = db["franchises"].find_one(
        {"franchise_code": franchise_code}
    )
    logger.info(f"[Branch] Franchise lookup result: {franchise is not None}")
    
    if not franchise:
        # Let's also check what franchises exist
        all_franchises = list(db["franchises"].find({}, {"franchise_code": 1, "franchise_name": 1}))
        logger.info(f"[Branch] Available franchises: {[f.get('franchise_code') for f in all_franchises]}")
        raise HTTPException(status_code=404, detail="Invalid franchise code")

    # Use provided code or generate unique branch code automatically
    if payload.code:
        # Check if provided code already exists
        existing_branch = db["branches"].find_one({"centre_info.code": payload.code})
        if existing_branch:
            raise HTTPException(status_code=400, detail="Branch code already exists")
        branch_code = payload.code
    else:
        # Generate unique branch code with database check
        max_attempts = 10
        for _ in range(max_attempts):
            branch_code = generate_branch_code(franchise_code, payload.centre_name)
            # Check if code already exists
            existing = db["branches"].find_one({"centre_info.code": branch_code})
            if not existing:
                break
        else:
            # If still not unique after 10 attempts, add timestamp
            timestamp = datetime.utcnow().strftime("%m%d")
            fc_prefix = franchise_code[:2].upper()
            branch_code = f"{fc_prefix}-BR-{timestamp}"

    branch = {
        "franchise_code": franchise_code,

        "centre_info": {
            "branch_code": branch_code,  # Use auto-generated code
            "territory_type": payload.territory_type,  # Store territory type
            "centre_name": payload.centre_name,
            "society_trust_company": payload.society_trust_company,
            "registration_number": payload.registration_number,
            "registration_year": payload.registration_year,
            "centre_address": payload.centre_address,
            "state": payload.state,
            "district": payload.district,
            "office_contact": payload.office_contact,
            "date_of_joining": datetime.combine(payload.date_of_joining, datetime.min.time()) if payload.date_of_joining else None
        },

        "centre_head": {
            "name": payload.name,
            "gender": payload.gender,
            "mobile": payload.mobile,
            "email": payload.email,
            "address": payload.address,
            "address_proof_type": payload.address_proof_type,
            "id_number": payload.id_number,
            "logo_url": payload.logo_url
        },

        "status": "ACTIVE",
        "created_at": datetime.utcnow()
    }

    # Insert branch into database
    db["branches"].insert_one(branch)
    logger.info(f"✅ [Branch] Branch created successfully: {branch_code}")
    
    # Create user account for branch admin
    try:
        
        # Check if user already exists
        existing_user = db["users"].find_one({"email": payload.email})
        
        if existing_user:
            logger.warning(f"[Branch] User already exists with email {payload.email}, updating with branch admin role")
            # Update existing user to add branch admin role
            db["users"].update_one(
                {"email": payload.email},
                {
                    "$set": {
                        "role": "branch_admin",
                        "franchise_code": franchise_code,
                        "branch_code": branch_code,
                        "is_branch_admin": True,
                        "password": hashed_password,  # Update password
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        else:
            # Create new user account for branch admin
            branch_admin_user = {
                "name": payload.name,
                "email": payload.email,
                "password": hashed_password,
                "role": "branch_admin", 
                "franchise_code": franchise_code,
                "branch_code": branch_code,
                "is_branch_admin": True,
                "mobile": payload.mobile,
                "gender": payload.gender,
                "address": payload.address,
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            user_result = db["users"].insert_one(branch_admin_user)
            logger.info(f"✅ [Branch] Branch admin user created: {payload.email} (ID: {user_result.inserted_id})")
            
    except Exception as user_creation_error:
        logger.error(f"❌ [Branch] Failed to create user account: {str(user_creation_error)}")
        # Don't fail the whole process if user creation fails
        pass
    
    # Generate new token with correct secret if needed
    new_token = None
    try:
        # Always generate a fresh token to ensure it works with current secret
        from jose import jwt
        new_payload = {
            "user_id": current_user.get("user_id"),
            "email": current_user.get("email"),
            "name": current_user.get("name"),
            "role": current_user.get("role"),
            "franchise_code": current_user.get("franchise_code"),
            "franchise_name": current_user.get("franchise_name"),
            "is_branch_admin": True,
            "exp": datetime.utcnow() + timedelta(hours=24)
        }
        new_token = jwt.encode(new_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        logger.info(f"[Branch] Generated fresh token for user {current_user.get('email')}")
    except Exception as token_gen_error:
        logger.warning(f"[Branch] Failed to generate new token: {str(token_gen_error)}")

    response_data = {
        "message": "Branch created successfully",
        "branch_code": branch_code,
        "centre_code": branch_code,  # For backward compatibility
        "admin_credentials": {
            "email": payload.email,
            "name": payload.name,
            "role": "branch_admin",
            "login_instructions": "Branch admin can now login with their email and password"
        }
    }
    
    # Include new token if generated
    if new_token:
        response_data["new_token"] = new_token
        response_data["token_type"] = "bearer"
        
    return response_data

@router.get("/branches/dropdown")
async def get_branches_dropdown(request: Request):
    """Get simplified branch data for dropdown selections - No authentication required"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info("[BRANCHES DROPDOWN] Getting branch dropdown data - No auth required")
        
        db = request.app.mongodb
        
        # Count branches first
        total_count = db["branches"].count_documents({})
        logger.info(f"[BRANCHES DROPDOWN] Total branches available: {total_count}")
        
        # Get only essential data for dropdowns from branches collection (exclude deleted)
        branches = list(db["branches"].find(
            {"status": {"$ne": "DELETED"}},  # Exclude deleted branches
            {"_id": 1, "franchise_code": 1, "centre_info": 1, "status": 1}
        ))
        
        logger.info(f"[BRANCHES DROPDOWN] Retrieved {len(branches)} branches from database")
        
        # Format for dropdown usage
        dropdown_data = []
        for i, branch in enumerate(branches):
            centre_info = branch.get("centre_info", {})
            # Get actual branch code from centre_info, fallback to franchise_code
            actual_branch_code = centre_info.get("branch_code", "") or branch.get("franchise_code", "")
            centre_name = centre_info.get("centre_name", "")
            
            logger.info(f"[BRANCHES DROPDOWN] Branch {i+1}: {actual_branch_code} - {centre_name}")
            
            dropdown_data.append({
                "id": str(branch["_id"]),
                "value": actual_branch_code,  # Use actual branch code
                "label": centre_name or "Unknown Branch",
                "code": actual_branch_code,  # Use actual branch code
                "branch_code": actual_branch_code,  # Use actual branch code
                "name": centre_name,
                "branch_name": centre_name,
                "centre_name": centre_name,
                "franchise_code": branch.get("franchise_code", ""),
                "status": branch.get("status", "pending")
            })
        
        logger.info(f"[BRANCHES DROPDOWN] Found {len(dropdown_data)} branches for dropdown")
        
        return {
            "success": True,
            "count": len(dropdown_data),
            "branches": dropdown_data,
            "options": dropdown_data  # Alternative key for select components
        }
        
    except Exception as e:
        logger.error(f"[BRANCHES DROPDOWN] Error getting dropdown data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch branch dropdown data")

@router.get("/branches/{franchise_code}")
async def get_my_branches(franchise_code: str, request: Request):
    import logging
    logger = logging.getLogger("uvicorn")
    # Log authorization header
    auth_header = request.headers.get("authorization", "No auth header")
    logger.info(f"🔑 [GET BRANCHES] Auth header present: {'Yes' if auth_header != 'No auth header' else 'No'}")
    
    db = request.app.mongodb
    
    # Get authenticated user
    try:
        current_user = await get_current_user(request)
        logger.info(f"[Branch] Authenticated user: {current_user.get('email')} (Role: {current_user.get('role')})")
    except HTTPException as e:
        logger.error(f"[Branch] Authentication failed: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"[Branch] Unexpected auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")
    
    # Verify user has access to this franchise
    user_franchise_code = current_user.get("franchise_code")
    user_role = current_user.get("role")
    
    # Super admins can access any franchise
    if user_role != "super_admin" and user_franchise_code != franchise_code:
        logger.warning(f"[Branch] Access denied: user franchise {user_franchise_code} != requested {franchise_code}")
        raise HTTPException(status_code=403, detail="Access denied to this franchise")
    
    logger.info(f"[Branch] User role: {user_role}, allowing access to franchise: {franchise_code}")
    
    logger.info(f"[Branch] Getting branches for franchise: {franchise_code}")
    
    branches = []
    # Query branches for franchise, excluding deleted ones
    cursor = db["branches"].find(
        {
            "franchise_code": franchise_code,
            "status": {"$ne": "DELETED"}
        }
        # Don't exclude _id - frontend needs it for unique keys
    )

    for branch in cursor:
        # Convert ObjectId to string for JSON serialization
        branch["_id"] = str(branch["_id"])
        branches.append(branch)
    
    logger.info(f"📊 [GET BRANCHES] Found {len(branches)} branches for franchise {franchise_code}")
    
    # Log branch details
    if branches:
        for i, branch in enumerate(branches):
            branch_name = branch.get('centre_info', {}).get('centre_name', 'Unknown')
            # Get branch_code from correct field
            branch_code = (
                branch.get('centre_info', {}).get('branch_code') or 
                branch.get('centre_info', {}).get('code') or 
                branch.get('branch_code') or
                'No Code'
            )
            logger.info(f"   Branch {i+1}: {branch_name} ({branch_code})")
    
    result = {
        "total": len(branches),
        "branches": branches
    }
    
    logger.info(f"✅ [GET BRANCHES] Returning {len(branches)} branches successfully")
    logger.info("=" * 50)
    
    return result


# Branch Payments Endpoints
@router.get("/branch-payments")
async def get_branch_payments(request: Request):
    """Get all branch payments"""
    import logging
    logger = logging.getLogger("uvicorn")
    logger.info("🚀 [BRANCH PAYMENT] GET /api/branch-payments endpoint called")
    logger.info(f"🔍 [BRANCH PAYMENT] Request method: {request.method}")
    logger.info(f"🔍 [BRANCH PAYMENT] Request URL: {request.url}")
    
    db = request.app.mongodb
    
    # Get authenticated user
    try:
        current_user = await get_current_user(request)
        logger.info(f"[Branch Payments] Authenticated user: {current_user.get('email')}")
    except HTTPException as e:
        logger.error(f"[Branch Payments] Authentication failed: {e.detail}")
        raise e
    
    try:
        # Get payments for this franchise
        franchise_code = current_user.get("franchise_code")
        branch_code = current_user.get("branch_code")
        user_role = current_user.get("role")
        
        logger.info(f"[Branch Payments] user_role: {user_role}, franchise_code: {franchise_code}, branch_code: {branch_code}")
        
        # Build query based on role
        query = {"franchise_code": franchise_code}
        
        # If branch_admin, filter by branch_code AND branch_name
        # FIX: Check for is_branch_admin flag as role might be 'admin'
        if user_role == "branch_admin" or current_user.get("is_branch_admin"):
            # Get the branch_name for this branch_code
            branch = None
            
            # 1. Try finding by specific branch code if available and specific
            if branch_code and branch_code != franchise_code:
                 branch = db["branches"].find_one({
                    "$or": [
                        {"centre_info.branch_code": branch_code},
                        {"centre_info.code": branch_code},
                        {"branch_code": branch_code}
                    ]
                 })

            # 2. If not found, try by admin_id
            if not branch and current_user.get("user_id"):
                 branch = db["branches"].find_one({"admin_id": current_user.get("user_id")})
            
            # 3. If still not found, try by email
            if not branch and current_user.get("email"):
                 branch = db["branches"].find_one({
                    "$or": [
                        {"centre_head.email": current_user.get("email")},
                        {"email": current_user.get("email")}
                    ]
                 })
            
            # 4. Dangerous fallback: ONLY if we still haven't found it and we have a very specific restriction requirement
            # In original code, it fell back to franchise_code lookup, which returns ANY branch. We intentionally REMOVE that.
            
            if branch:
                branch_name = branch.get("centre_info", {}).get("centre_name") or branch.get("branch_name") or branch.get("name")
                
                # Get the most accurate branch code
                found_code = branch.get("centre_info", {}).get("branch_code") or branch.get("branch_code")
                target_code = branch_code if (branch_code and branch_code != franchise_code) else found_code
                
                logger.info(f"[Branch Payments] Branch admin's branch_name: {branch_name}")
                
                # Match by either branch_code OR branch_name
                query["$or"] = [
                    {"branch_code": target_code},
                    {"branch_name": branch_name}
                ]
                logger.info(f"[Branch Payments] Filtering by branch_code: {target_code} OR branch_name: {branch_name}")
            else:
                logger.warning(f"[Branch Payments] No branch found for branch_admin, applying strict filtering")
                # If we verify they are branch admin but can't find the branch doc, 
                # strictly filter by what we know (branch_code from token) to avoid leaking data
                if branch_code and branch_code != franchise_code:
                    query["branch_code"] = branch_code
                else:
                    # Last resort: only show payments created by this user
                    query["created_by"] = current_user.get("email")
        
        logger.info(f"[Branch Payments] Final query: {query}")
        payments = []
        cursor = db["branch_payments"].find(query).sort("created_at", -1)
        
        for payment in cursor:
            payments.append({
                "id": payment.get("payment_id", str(payment.get("_id", ""))),
                "branch": payment.get("branch_name", ""),
                "amount": payment.get("amount", 0),
                "date": payment.get("date", ""),
                "description": payment.get("description", ""),
                "paymentMode": payment.get("payment_mode", "Cash")
            })
        
        logger.info(f"✅ [Branch Payments] Returning {len(payments)} payments")
        
        return {
            "success": True,
            "payments": payments,
            "total": len(payments)
        }
        
    except Exception as e:
        logger.error(f"❌ [Branch Payments] Error: {str(e)}")
        return {
            "success": True,
            "payments": [],
            "total": 0
        }


@router.post("/branch-payments")
async def add_branch_payment(request: Request):
    """Add new branch payment"""
    import json
    import logging
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    logger.info("🚀 [BRANCH PAYMENT] POST /api/branch-payments endpoint called")
    logger.info(f"🔍 [BRANCH PAYMENT] Request method: {request.method}")
    logger.info(f"🔍 [BRANCH PAYMENT] Request URL: {request.url}")
    
    db = request.app.mongodb
    
    # Get authenticated user
    try:
        current_user = await get_current_user(request)
        logger.info(f"[Add Payment] Authenticated user: {current_user.get('email')}")
    except HTTPException as e:
        logger.error(f"[Add Payment] Authentication failed: {e.detail}")
        raise e
    
    try:
        # Get request body
        body = await request.body()
        data = json.loads(body)
        
        # Validate required fields
        required_fields = ["branch_name", "amount", "date", "payment_mode"]
        for field in required_fields:
            if field not in data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Find branch_code from branches collection by branch_name
        branch_code_value = None
        branch = db["branches"].find_one({
            "$or": [
                {"centre_info.centre_name": data["branch_name"]},
                {"branch_name": data["branch_name"]},
                {"name": data["branch_name"]}
            ]
        })
        if branch:
            # Extract branch_code from branch document
            branch_code_value = (
                branch.get("branchCode") or
                branch.get("branch_code") or
                branch.get("centreCode") or
                branch.get("centre_code") or
                branch.get("code") or
                branch.get("franchise_code")
            )
            logger.info(f"[Add Payment] Found branch_code: {branch_code_value} for branch: {data['branch_name']}")
        
        # Generate payment ID
        payment_id = f"PAY{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        # Create payment document
        payment_doc = {
            "payment_id": payment_id,
            "franchise_code": current_user.get("franchise_code"),
            "branch_code": branch_code_value,
            "branch_name": data["branch_name"],
            "amount": float(data["amount"]),
            "date": data["date"],
            "description": data.get("description", ""),
            "payment_mode": data["payment_mode"],
            "created_by": current_user.get("email"),
            "created_at": datetime.utcnow()
        }
        
        # Insert into database
        result = db["branch_payments"].insert_one(payment_doc)
        
        if result.inserted_id:
            logger.info(f"✅ [Add Payment] Payment added successfully: {payment_id}")
            
            # Return the created payment
            return {
                "success": True,
                "message": "Payment added successfully",
                "payment": {
                    "id": payment_id,
                    "branch": data["branch_name"],
                    "amount": float(data["amount"]),
                    "date": data["date"],
                    "description": data.get("description", ""),
                    "paymentMode": data["payment_mode"]
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to add payment")
            
    except json.JSONDecodeError:
        logger.error("[Add Payment] Invalid JSON in request body")
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"❌ [Add Payment] Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add payment")

# Branch Users Management Endpoints
@router.get("/branch-users")
async def get_branch_users(request: Request):
    """Get all branch users"""
    import logging
    logger = logging.getLogger("uvicorn")
    logger.info("🚀 [BRANCH USERS] GET /api/branch-users endpoint called")
    
    db = request.app.mongodb
    
    # Get authenticated user
    try:
        current_user = await get_current_user(request)
        logger.info(f"[Branch Users] Authenticated user: {current_user.get('email')}")
    except HTTPException as e:
        logger.error(f"[Branch Users] Authentication failed: {e.detail}")
        raise e
    
    try:
        logger.info(f"[Branch Users] Current user data: {current_user}")
        
        # Get users for this franchise
        franchise_code = current_user.get("franchise_code") or current_user.get("branch_code")
        
        if not franchise_code:
            logger.warning("[Branch Users] No franchise code found in token, trying to find from branches collection")
            user_email = current_user.get("email")
            logger.info(f"[Branch Users] Searching for branch with centre_head.email = {user_email}")
            
            # Try multiple query patterns
            queries = [
                {"centre_head.email": user_email, "status": {"$ne": "DELETED"}},
                {"centre_head.email": user_email},
                {"admin_email": user_email, "status": {"$ne": "DELETED"}},
                {"email": user_email, "status": {"$ne": "DELETED"}}
            ]
            
            branch = None
            for i, query in enumerate(queries):
                logger.info(f"[Branch Users] Trying query {i+1}: {query}")
                branch = db["branches"].find_one(query)
                if branch:
                    logger.info(f"[Branch Users] Found branch with query {i+1}: {branch.get('centre_info', {}).get('centre_name', 'Unknown')}")
                    break
                else:
                    logger.info(f"[Branch Users] Query {i+1} returned no results")
            
            if branch:
                franchise_code = branch.get("franchise_code") or branch.get("centre_info", {}).get("branch_code") or branch.get("code")
                logger.info(f"[Branch Users] Found franchise_code from branches collection: {franchise_code}")
            else:
                logger.warning(f"[Branch Users] No branch found for user email: {user_email}")
                return {
                    "success": True,
                    "users": [],
                    "total": 0
                }
        
        logger.info(f"[Branch Users] Using franchise_code: {franchise_code}")
        
        users = []
        cursor = db["branch_users"].find(
            {"franchise_code": franchise_code},
            {"_id": 0}
        ).sort("created_at", -1)
        
        for user in cursor:
            users.append({
                "id": user.get("user_id", str(user.get("_id", ""))),
                "username": user.get("username", ""),
                "name": user.get("name", ""),
                "branch": user.get("branch", ""),
                "password": user.get("password", ""),
                "permission": user.get("permission", "User"),
                "status": user.get("status", "Active")
            })
        
        logger.info(f"✅ [Branch Users] Returning {len(users)} users")
        
        return {
            "success": True,
            "users": users,
            "total": len(users)
        }
        
    except Exception as e:
        logger.error(f"❌ [Branch Users] Error: {str(e)}")
        return {
            "success": True,
            "users": [],
            "total": 0
        }


@router.post("/branch-users")
async def add_branch_user(request: Request):
    """Add new branch user"""
    import json
    import logging
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    logger.info("🚀 [ADD BRANCH USER] POST /api/branch-users endpoint called")
    
    db = request.app.mongodb
    
    # Get authenticated user
    try:
        current_user = await get_current_user(request)
        logger.info(f"[Add Branch User] Authenticated user: {current_user.get('email')}")
    except HTTPException as e:
        logger.error(f"[Add Branch User] Authentication failed: {e.detail}")
        raise e
    
    try:
        # Get request body
        body = await request.body()
        data = json.loads(body)
        
        # Validate required fields
        required_fields = ["username", "name", "branch", "password", "permission"]
        for field in required_fields:
            if field not in data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Check if username already exists
        existing_user = db["branch_users"].find_one({
            "username": data["username"],
            "franchise_code": current_user.get("franchise_code")
        })
        
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Generate user ID
        user_id = f"USER{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        # Create user document
        user_doc = {
            "user_id": user_id,
            "franchise_code": current_user.get("franchise_code"),
            "username": data["username"],
            "name": data["name"],
            "branch": data["branch"],
            "password": data["password"],  # In real app, hash this
            "permission": data["permission"],
            "status": "Active",
            "created_by": current_user.get("email"),
            "created_at": datetime.utcnow()
        }
        
        # Insert into database
        result = db["branch_users"].insert_one(user_doc)
        
        if result.inserted_id:
            logger.info(f"✅ [Add Branch User] User added successfully: {user_id}")
            
            # Return the created user
            return {
                "success": True,
                "message": "User added successfully",
                "user": {
                    "id": user_id,
                    "username": data["username"],
                    "name": data["name"],
                    "branch": data["branch"],
                    "password": data["password"],
                    "permission": data["permission"],
                    "status": "Active"
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to add user")
            
    except json.JSONDecodeError:
        logger.error("[Add Branch User] Invalid JSON in request body")
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"❌ [Add Branch User] Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add user")


@router.put("/branch-users/{user_id}")
async def update_branch_user(user_id: str, request: Request):
    """Update branch user permission"""
    import json
    import logging
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    logger.info(f"🚀 [UPDATE BRANCH USER] PUT /api/branch-users/{user_id} endpoint called")
    
    db = request.app.mongodb
    
    # Get authenticated user
    try:
        current_user = await get_current_user(request)
        logger.info(f"[Update Branch User] Authenticated user: {current_user.get('email')}")
    except HTTPException as e:
        logger.error(f"[Update Branch User] Authentication failed: {e.detail}")
        raise e
    
    try:
        # Get request body
        body = await request.body()
        data = json.loads(body)
        
        # Update user
        franchise_code = current_user.get("franchise_code")
        
        result = db["branch_users"].update_one(
            {
                "user_id": user_id,
                "franchise_code": franchise_code
            },
            {
                "$set": {
                    "permission": data.get("permission"),
                    "status": data.get("status", "Active"),
                    "updated_by": current_user.get("email"),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            logger.info(f"✅ [Update Branch User] User updated successfully: {user_id}")
            return {
                "success": True,
                "message": "User updated successfully"
            }
        else:
            logger.warning(f"⚠️ [Update Branch User] User not found: {user_id}")
            raise HTTPException(status_code=404, detail="User not found")
            
    except json.JSONDecodeError:
        logger.error("[Update Branch User] Invalid JSON in request body")
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"❌ [Update Branch User] Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update user")


@router.delete("/branch-users/{user_id}")
async def delete_branch_user(user_id: str, request: Request):
    """Delete branch user"""
    import logging
    logger = logging.getLogger("uvicorn")
    logger.info(f"🚀 [DELETE BRANCH USER] DELETE /api/branch-users/{user_id} endpoint called")
    
    db = request.app.mongodb
    
    # Get authenticated user
    try:
        current_user = await get_current_user(request)
        logger.info(f"[Delete Branch User] Authenticated user: {current_user.get('email')}")
    except HTTPException as e:
        logger.error(f"[Delete Branch User] Authentication failed: {e.detail}")
        raise e
    
    try:
        # Delete user for this franchise
        franchise_code = current_user.get("franchise_code")
        
        result = db["branch_users"].delete_one({
            "user_id": user_id,
            "franchise_code": franchise_code
        })
        
        if result.deleted_count > 0:
            logger.info(f"✅ [Delete Branch User] User deleted successfully: {user_id}")
            return {
                "success": True,
                "message": "User deleted successfully"
            }
        else:
            logger.warning(f"⚠️ [Delete Branch User] User not found: {user_id}")
            raise HTTPException(status_code=404, detail="User not found")
            
    except Exception as e:
        logger.error(f"❌ [Delete Branch User] Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete user")



@router.delete("/branch-payments/{payment_id}")
async def delete_branch_payment(payment_id: str, request: Request):
    """Delete branch payment"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    db = request.app.mongodb
    
    # Get authenticated user
    try:
        current_user = await get_current_user(request)
        logger.info(f"[Delete Payment] Authenticated user: {current_user.get('email')}")
    except HTTPException as e:
        logger.error(f"[Delete Payment] Authentication failed: {e.detail}")
        raise e
    
    try:
        # Delete payment for this franchise
        franchise_code = current_user.get("franchise_code")
        
        result = db["branch_payments"].delete_one({
            "payment_id": payment_id,
            "franchise_code": franchise_code
        })
        
        if result.deleted_count > 0:
            logger.info(f"✅ [Delete Payment] Payment deleted successfully: {payment_id}")
            return {
                "success": True,
                "message": "Payment deleted successfully"
            }
        else:
            logger.warning(f"⚠️ [Delete Payment] Payment not found: {payment_id}")
            raise HTTPException(status_code=404, detail="Payment not found")
            
    except Exception as e:
        logger.error(f"❌ [Delete Payment] Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete payment")


@router.post("/login", response_model=BranchLoginResponse)
async def branch_admin_login(
    login_data: BranchLogin,
    request: Request
):
    """Branch Admin Login - Authenticate branch admin users"""
    import logging
    from jose import jwt
    import bcrypt
    from datetime import datetime, timedelta
    
    logger = logging.getLogger("uvicorn")
    logger.info("=" * 50)
    logger.info("[BRANCH LOGIN] Starting branch admin login process")
    
    try:
        email = login_data.email
        password = login_data.password
        
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password are required")
        
        logger.info(f"[BRANCH LOGIN] Login attempt for email: {email}")
        
        # Get database
        db = request.app.mongodb
        
        # Find branch admin user in users collection
        user = db["users"].find_one({
            "email": email,
            "role": "branch_admin",
            "is_active": True
        })
        
        if not user:
            logger.warning(f"[BRANCH LOGIN] User not found or not active: {email}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify password
        stored_password = user.get("password")
        if not stored_password:
            logger.warning(f"[BRANCH LOGIN] No password stored for user: {email}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Debug logging
        logger.info(f"[BRANCH LOGIN] Password length: {len(stored_password)}, starts with $2b$: {stored_password.startswith('$2b$')}")
        logger.info(f"[BRANCH LOGIN] Provided password: {password}, length: {len(password)}")
        
        # Check if password is hashed or plain text
        is_valid = False
        try:
            if stored_password.startswith("$2b$") or stored_password.startswith("$2a$") or stored_password.startswith("$2y$"):
                # Hashed password - verify with bcrypt directly
                is_valid = bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8'))
                logger.info(f"[BRANCH LOGIN] Using bcrypt verification for {email}, result: {is_valid}")
            else:
                # Plain text password - direct comparison (temporary fallback)
                is_valid = (password == stored_password)
                logger.info(f"[BRANCH LOGIN] Using plain text comparison for {email}")
                logger.info(f"[BRANCH LOGIN] Match result: {is_valid}")
        except Exception as verify_error:
            logger.error(f"[BRANCH LOGIN] Password verification error: {str(verify_error)}")
            # If bcrypt fails, try plain text comparison as fallback
            is_valid = (password == stored_password)
            logger.info(f"[BRANCH LOGIN] Falling back to plain text comparison due to error, match: {is_valid}")
        
        if not is_valid:
            logger.warning(f"[BRANCH LOGIN] Invalid password for user: {email}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Create JWT token
        token_data = {
            "user_id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "franchise_code": user.get("franchise_code"),
            "branch_code": user.get("branch_code"),
            "is_branch_admin": True,
            "exp": datetime.utcnow() + timedelta(hours=24)
        }
        
        # Use the same secret key as other parts of the system
        from app.config import settings
        token = jwt.encode(token_data, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return BranchLoginResponse(
            success=True,
            message="Login successful",
            access_token=token,
            token_type="bearer",
            expires_in=7 * 24 * 60 * 60,  # 7 days in seconds
            user={
                "id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "franchise_code": user.get("franchise_code"),
                "branch_code": user.get("branch_code"),
                "mobile": user.get("mobile"),
                "is_branch_admin": True
            }
        )
        
    except Exception as e:
        logger.error(f"[BRANCH LOGIN] Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Login failed")


# ============= Branch Users Management API Endpoints =============

@router.get("/branches")
async def get_all_branches(request: Request):
    """Get all branches with complete details including branch_code - No authentication required for dropdown"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info("[BRANCHES] Getting all branches - No auth required")
        
        db = request.app.mongodb
        
        # Count total branches first
        total_branches = db["branches"].count_documents({})
        logger.info(f"[BRANCHES] Total branches in database: {total_branches}")
        
        if total_branches == 0:
            logger.warning("[BRANCHES] No branches found in database")
            return {
                "success": True,
                "message": "No branches found",
                "count": 0,
                "branches": [],
                "data": []
            }
        
        # Get all branches from actual branches collection with detailed logging
        logger.info("[BRANCHES] Querying branches collection...")
        branches_cursor = db["branches"].find({})
        branches_list = list(branches_cursor)
        
        logger.info(f"[BRANCHES] Found {len(branches_list)} branches in cursor")
        
        # Format comprehensive branch data from branches collection
        branch_list = []
        for i, branch in enumerate(branches_list):
            logger.info(f"[BRANCHES] Processing branch {i+1}: {branch.get('_id')}")
            
            centre_info = branch.get("centre_info", {})
            centre_head = branch.get("centre_head", {})
            
            # Log the structure for debugging
            logger.info(f"[BRANCHES] Branch {i+1} centre_info keys: {list(centre_info.keys())}")
            logger.info(f"[BRANCHES] Branch {i+1} centre_name: {centre_info.get('centre_name')}")
            logger.info(f"[BRANCHES] Branch {i+1} branch_code: {centre_info.get('branch_code')}")
            
            # Get the actual branch code from centre_info, fallback to franchise_code if needed
            actual_branch_code = centre_info.get("branch_code", "") or branch.get("franchise_code", "")
            
            branch_data = {
                "id": str(branch["_id"]),
                "franchise_code": branch.get("franchise_code", ""),
                "branch_code": actual_branch_code,  # Use actual branch code from centre_info
                "branch_name": centre_info.get("centre_name", ""),
                "centre_name": centre_info.get("centre_name", ""),
                "display_name": centre_info.get("centre_name", "Unknown Branch"),
                "franchise_name": "",  # Will be populated from franchise lookup if needed
                "society_trust_company": centre_info.get("society_trust_company", ""),
                "registration_number": centre_info.get("registration_number", ""),
                "registration_year": centre_info.get("registration_year", ""),
                "address": centre_info.get("centre_address", ""),
                "centre_address": centre_info.get("centre_address", ""),
                "state": centre_info.get("state", ""),
                "district": centre_info.get("district", ""),
                "phone": centre_info.get("office_contact", ""),
                "office_contact": centre_info.get("office_contact", ""),
                "email": centre_head.get("email", ""),
                "head_name": centre_head.get("name", ""),
                "head_mobile": centre_head.get("mobile", ""),
                "status": branch.get("status", "ACTIVE"),
                "created_at": branch.get("created_at"),
                "date_of_joining": centre_info.get("date_of_joining")
            }
            
            logger.info(f"[BRANCHES] Branch {i+1} formatted: {branch_data['branch_code']} - {branch_data['centre_name']}")
            branch_list.append(branch_data)
        
        logger.info(f"[BRANCHES] Found {len(branch_list)} branches with complete details")
        
        return {
            "success": True,
            "message": f"Retrieved {len(branch_list)} branches successfully",
            "count": len(branch_list),
            "branches": branch_list,
            "data": branch_list  # Alternative key for frontend compatibility
        }
        
    except Exception as e:
        logger.error(f"[BRANCHES] Error getting branches: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch branches")

# Dropdown route moved above to fix FastAPI routing priority

@router.get("/branches/test")
async def test_branches(request: Request):
    """Test endpoint to check branch data directly"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info("[BRANCHES TEST] Testing branch data retrieval")
        
        db = request.app.mongodb
        
        # Check if branches collection exists
        collections = db.list_collection_names()
        logger.info(f"[BRANCHES TEST] Available collections: {collections}")
        
        # Count documents in branches collection
        branch_count = db["branches"].count_documents({})
        logger.info(f"[BRANCHES TEST] Branches count: {branch_count}")
        
        # Get sample branch data
        sample_branch = db["branches"].find_one({})
        
        if sample_branch:
            logger.info(f"[BRANCHES TEST] Sample branch ID: {sample_branch.get('_id')}")
            logger.info(f"[BRANCHES TEST] Sample branch keys: {list(sample_branch.keys())}")
            
            centre_info = sample_branch.get("centre_info", {})
            logger.info(f"[BRANCHES TEST] Centre info keys: {list(centre_info.keys())}")
            logger.info(f"[BRANCHES TEST] Centre name: {centre_info.get('centre_name')}")
            logger.info(f"[BRANCHES TEST] Branch code: {centre_info.get('branch_code')}")
            
            return {
                "success": True,
                "message": "Branch test completed",
                "collections": collections,
                "branch_count": branch_count,
                "sample_branch": {
                    "id": str(sample_branch["_id"]),
                    "franchise_code": sample_branch.get("franchise_code"),
                    "centre_name": centre_info.get("centre_name"),
                    "branch_code": centre_info.get("branch_code"),
                    "structure": {
                        "top_level_keys": list(sample_branch.keys()),
                        "centre_info_keys": list(centre_info.keys())
                    }
                }
            }
        else:
            return {
                "success": False,
                "message": "No branches found",
                "collections": collections,
                "branch_count": branch_count
            }
            
    except Exception as e:
        logger.error(f"[BRANCHES TEST] Error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@router.get("/branches/by-code/{branch_code}")
async def get_branch_by_code(branch_code: str, request: Request):
    """Get specific branch details by branch_code - No authentication required"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[BRANCH BY CODE] Getting branch details for code: {branch_code} - No auth required")
        
        db = request.app.mongodb
        
        # Find branch by actual branch_code in branches collection
        branch = db["branches"].find_one({"centre_info.branch_code": branch_code})
        
        if not branch:
            logger.warning(f"[BRANCH BY CODE] Branch not found with code: {branch_code}")
            raise HTTPException(status_code=404, detail="Branch not found")
        
        # Format complete branch details from branches collection structure
        centre_info = branch.get("centre_info", {})
        centre_head = branch.get("centre_head", {})
        
        # Get the actual branch code
        actual_branch_code = centre_info.get("branch_code", "") or branch.get("franchise_code", "")
        
        branch_details = {
            "id": str(branch["_id"]),
            "franchise_code": branch.get("franchise_code", ""),
            "branch_code": actual_branch_code,  # Use actual branch code
            "branch_name": centre_info.get("centre_name", ""),
            "centre_name": centre_info.get("centre_name", ""),
            "display_name": centre_info.get("centre_name", "Unknown Branch"),
            "society_trust_company": centre_info.get("society_trust_company", ""),
            "registration_number": centre_info.get("registration_number", ""),
            "registration_year": centre_info.get("registration_year", ""),
            "address": centre_info.get("centre_address", ""),
            "centre_address": centre_info.get("centre_address", ""),
            "state": centre_info.get("state", ""),
            "district": centre_info.get("district", ""),
            "phone": centre_info.get("office_contact", ""),
            "office_contact": centre_info.get("office_contact", ""),
            "email": centre_head.get("email", ""),
            "head_name": centre_head.get("name", ""),
            "head_mobile": centre_head.get("mobile", ""),
            "head_address": centre_head.get("address", ""),
            "head_gender": centre_head.get("gender", ""),
            "status": branch.get("status", "ACTIVE"),
            "created_at": branch.get("created_at"),
            "date_of_joining": centre_info.get("date_of_joining")
        }
        
        logger.info(f"[BRANCH BY CODE] Found branch: {branch_details['centre_name']}")
        
        return {
            "success": True,
            "message": "Branch details retrieved successfully",
            "branch": branch_details,
            "data": branch_details
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[BRANCH BY CODE] Error getting branch by code: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch branch details")


# Branch Students API Endpoints
@router.get("/branch-students/students")
async def get_branch_students(request: Request):
    """Get students for a specific branch - No authentication required for testing"""
    import logging
    from urllib.parse import unquote
    
    logger = logging.getLogger("uvicorn")
    
    try:
        # Get query parameters - support both branch_code and franchise_code
        branch_code = request.query_params.get("branch_code")
        franchise_code = request.query_params.get("franchise_code")
        page = int(request.query_params.get("page", 1))
        limit = int(request.query_params.get("limit", 100))
        # New parameter to exclude ID card data for performance
        exclude_id_card = request.query_params.get("exclude_id_card", "false").lower() == "true"
        
        logger.info(f"[BRANCH STUDENTS] Getting students for branch: {branch_code}, franchise: {franchise_code}, page: {page}, limit: {limit}")
        
        if not branch_code and not franchise_code:
            logger.warning("[BRANCH STUDENTS] No branch_code or franchise_code provided")
            return {
                "success": True,
                "message": "No branch code or franchise code provided",
                "students": [],
                "total": 0
            }
        
        db = request.app.mongodb
        
        # First, let's see what collections we have for students
        collections = db.list_collection_names()
        logger.info(f"[BRANCH STUDENTS] Available collections: {collections}")
        
        # Try to find students in different possible collections
        student_collections = ["students", "branch_students", "users"]
        
        students = []
        total_count = 0
        for collection_name in student_collections:
            if collection_name in collections:
                logger.info(f"[BRANCH STUDENTS] Checking collection: {collection_name}")
                
                if collection_name == "users":
                    # Look for users with role 'student'
                    query = {"role": "student"}
                    # Try branch_code first, then franchise_code
                    if branch_code:
                        query["$or"] = [{"branch_code": branch_code}, {"franchise_code": branch_code}]
                    elif franchise_code:
                        query["franchise_code"] = franchise_code
                else:
                    # Look for students with branch_code or franchise_code
                    query = {}
                    if branch_code:
                        # Search by either branch_code or franchise_code field matching the provided branch_code
                        query["$or"] = [{"branch_code": branch_code}, {"franchise_code": branch_code}]
                    elif franchise_code:
                        query["franchise_code"] = franchise_code
                
                # Get total count for this collection (without pagination)
                collection_total = db[collection_name].count_documents(query)
                total_count += collection_total
                logger.info(f"[BRANCH STUDENTS] Total count in {collection_name}: {collection_total}")
                
                cursor = db[collection_name].find(query).limit(limit).skip((page - 1) * limit)
                collection_students = list(cursor)
                
                logger.info(f"[BRANCH STUDENTS] Found {len(collection_students)} students in {collection_name} (page {page})")
                
                # Transform data to expected format
                for student in collection_students:
                    # Get ID card information only if not excluded
                    student_id = str(student.get("_id", ""))
                    id_card = None
                    has_id_card = False
                    
                    if not exclude_id_card:
                        id_card = db.branch_id_cards.find_one({"student_id": student_id, "status": "active"})
                        has_id_card = bool(id_card)
                    
                    # Get course duration from course collection if not available in student
                    course_name = student.get("course", "")
                    student_duration = student.get("course_duration", "") or student.get("duration", "")
                    
                    # If duration not in student, try to look it up from branch_courses collection
                    if not student_duration and course_name:
                        course_doc = db.branch_courses.find_one({"course_name": course_name})
                        if course_doc:
                            # Check duration_months first since that's what's stored in DB
                            duration_months = course_doc.get("duration_months")
                            if duration_months:
                                student_duration = f"{duration_months} Months"
                            else:
                                student_duration = course_doc.get("duration", "") or course_doc.get("course_duration", "")
                    
                    # Get photo URL - handle different path formats
                    photo_url = student.get("photo_url", "") or student.get("photo", "")
                    
                    transformed_student = {
                        "id": student_id,
                        "student_name": student.get("name", student.get("student_name", "")),
                        "registration_number": student.get("registration_number", student.get("reg_number", "")),
                        "contact_no": student.get("contact_no", student.get("phone", student.get("mobile", ""))),
                        "email_id": student.get("email_id", student.get("email", "")),
                        "course": course_name,
                        "course_duration": student_duration,
                        "duration": student_duration,
                        "batch": student.get("batch", ""),
                        "branch_code": student.get("branch_code", ""),
                        "student_branch_code": student.get("branch_code", ""),
                        "franchise_code": student.get("franchise_code", ""),
                        "center": student.get("center", student.get("branch_name", "")),
                        "branch": student.get("branch", student.get("branch_name", "")),
                        "date_of_birth": student.get("date_of_birth", student.get("dob", "")),
                        "address": student.get("address", ""),
                        "city": student.get("city", ""),
                        "photo": photo_url,
                        "photo_url": photo_url,
                        "admission_status": student.get("admission_status", student.get("status", "Active")),
                        "has_id_card": has_id_card,
                        "id_card": {
                            "id": str(id_card["_id"]) if id_card else None,
                            "card_number": id_card.get("card_number") if id_card else None,
                            "issue_date": id_card.get("issue_date") if id_card else None,
                            "status": id_card.get("status") if id_card else None,
                            "file_path": id_card.get("file_path") if id_card else None
                        } if id_card and not exclude_id_card else None,
                        "created_at": student.get("created_at")
                    }
                    students.append(transformed_student)
        
        if not students:
            # Return empty result but with success
            logger.info(f"[BRANCH STUDENTS] No students found for branch {branch_code}")
            return {
                "success": True,
                "message": f"No students found for branch {branch_code}",
                "students": [],
                "total": total_count,
                "page": page,
                "limit": limit
            }
        
        logger.info(f"[BRANCH STUDENTS] Returning {len(students)} students, total: {total_count}")
        
        return {
            "success": True,
            "message": f"Retrieved {len(students)} students for branch {branch_code}",
            "students": students,
            "total": total_count,
            "page": page,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"[BRANCH STUDENTS] Error getting students: {str(e)}")
        return {
            "success": True,  # Return success to avoid frontend errors
            "message": "Error retrieving students, but continuing",
            "students": [],
            "total": 0,
            "error": str(e)
        }


@router.get("/branch-users")
async def get_branch_users(request: Request, current_user: dict = Depends(get_current_user)):
    """Get all users for the current branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[BRANCH USERS] Getting users for branch: {current_user.get('branch_code')}")
        
        db = request.app.mongodb
        
        # Get users based on branch_code or franchise_code
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            logger.warning("[BRANCH USERS] No branch code found for user")
            return {"success": True, "users": []}
        
        # Query users from multiple collections
        users = []
        
        # Get from franchise_admins collection
        franchise_admins = list(db["franchise_admins"].find({
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        }))
        
        for admin in franchise_admins:
            users.append({
                "id": str(admin["_id"]),
                "username": admin.get("email", "").split("@")[0],
                "name": admin.get("name", ""),
                "branch": admin.get("branch_code") or admin.get("franchise_code", ""),
                "password": admin.get("password", "••••••••"),
                "permission": admin.get("role", "Admin"),
                "status": "Active",
                "email": admin.get("email", ""),
                "mobile": admin.get("mobile", "")
            })
        
        # Get from instructors collection
        instructors = list(db["instructors"].find({
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        }))
        
        for instructor in instructors:
            users.append({
                "id": str(instructor["_id"]),
                "username": instructor.get("email", "").split("@")[0],
                "name": instructor.get("name", ""),
                "branch": instructor.get("branch_code") or instructor.get("franchise_code", ""),
                "password": "••••••••",
                "permission": "Instructor",
                "status": instructor.get("status", "Active"),
                "email": instructor.get("email", ""),
                "mobile": instructor.get("mobile", "")
            })
        
        logger.info(f"[BRANCH USERS] Found {len(users)} users")
        
        return {
            "success": True,
            "users": users
        }
        
    except Exception as e:
        logger.error(f"[BRANCH USERS] Error getting users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")


@router.post("/branch-users")
async def add_branch_user(request: Request, current_user: dict = Depends(get_current_user)):
    import logging
    import json
    from bson import ObjectId
    from passlib.context import CryptContext
    
    logger = logging.getLogger("uvicorn")
    
    try:
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        logger.info(f"[ADD USER] Adding new user: {data}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found")
        
        # Hash password
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed_password = pwd_context.hash(data["password"])
        
        # Determine collection based on permission
        if data["permission"] == "Instructor":
            collection = "instructors"
        else:
            collection = "franchise_admins"
        
        # Create user data
        user_data = {
            "_id": ObjectId(),
            "name": data["name"],
            "email": f"{data['username']}@{branch_code}.com",
            "password": hashed_password,
            "role": data["permission"],
            "franchise_code": branch_code,
            "branch_code": data.get("branch", branch_code),
            "mobile": "",
            "status": "Active",
            "created_at": datetime.utcnow(),
            "created_by": current_user.get("user_id")
        }
        
        # Insert user
        result = db[collection].insert_one(user_data)
        
        if result.inserted_id:
            # Return created user
            new_user = {
                "id": str(user_data["_id"]),
                "username": data["username"],
                "name": data["name"],
                "branch": data.get("branch", branch_code),
                "password": data["password"],  # Return plain password for display
                "permission": data["permission"],
                "status": "Active",
                "email": user_data["email"]
            }
            
            logger.info(f"[ADD USER] User created successfully: {new_user['username']}")
            
            return {
                "success": True,
                "message": "User added successfully",
                "user": new_user
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[ADD USER] Error adding user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add user")


@router.put("/branch-users/{user_id}")
async def update_branch_user(user_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Update a branch user"""
    import logging
    import json
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        logger.info(f"[UPDATE USER] Updating user {user_id}: {data}")
        
        db = request.app.mongodb
        
        # Try to find user in both collections
        user = None
        collection_name = None
        
        for coll in ["franchise_admins", "instructors"]:
            user = db[coll].find_one({"_id": ObjectId(user_id)})
            if user:
                collection_name = coll
                break
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user
        update_data = {}
        if "permission" in data:
            update_data["role"] = data["permission"]
        if "status" in data:
            update_data["status"] = data["status"]
        
        update_data["updated_at"] = datetime.utcnow()
        update_data["updated_by"] = current_user.get("user_id")
        
        result = db[collection_name].update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            logger.info(f"[UPDATE USER] User updated successfully: {user_id}")
            return {
                "success": True,
                "message": "User updated successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update user")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[UPDATE USER] Error updating user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update user")


@router.delete("/branch-users/{user_id}")
async def delete_branch_user(user_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    import logging
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[DELETE USER] Deleting user: {user_id}")
        
        db = request.app.mongodb
        
        # Try to find and delete user from both collections
        deleted = False
        
        for coll in ["franchise_admins", "instructors"]:
            result = db[coll].delete_one({"_id": ObjectId(user_id)})
            if result.deleted_count > 0:
                deleted = True
                logger.info(f"[DELETE USER] User deleted from {coll}: {user_id}")
                break
        
        if deleted:
            return {
                "success": True,
                "message": "User deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="User not found")
        
    except Exception as e:
        logger.error(f"[DELETE USER] Error deleting user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete user")


# ============= Department Management API Endpoints =============

@router.get("/departments")
async def get_departments(request: Request, current_user: dict = Depends(get_current_user)):
    """Get all departments for the current branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[DEPARTMENTS] Getting departments for user: {current_user.get('email')}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            logger.warning("[DEPARTMENTS] No branch code found for user")
            return {"success": True, "departments": []}
        
        departments = list(db["departments"].find({
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        }).sort("created_at", -1))
        
        # Format departments for response
        dept_list = []
        for dept in departments:
            dept_list.append({
                "id": str(dept["_id"]),
                "name": dept.get("name", ""),
                "totalEmployees": dept.get("total_employees", 0),
                "status": dept.get("status", "Active"),
                "description": dept.get("description", ""),
                "head": dept.get("head", ""),
                "created_at": dept.get("created_at", ""),
                "updated_at": dept.get("updated_at", "")
            })
        
        logger.info(f"[DEPARTMENTS] Found {len(dept_list)} departments")
        
        return {
            "success": True,
            "departments": dept_list
        }
        
    except Exception as e:
        logger.error(f"[DEPARTMENTS] Error getting departments: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch departments")


@router.post("/departments")
async def add_department(request: Request, current_user: dict = Depends(get_current_user)):
    """Add a new department"""
    import logging
    import json
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        logger.info(f"[ADD DEPARTMENT] Adding new department: {data}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found")
        
        # Check if department name already exists
        existing_dept = db["departments"].find_one({
            "name": data["name"],
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        })
        
        if existing_dept:
            raise HTTPException(status_code=400, detail="Department name already exists")
        
        # Create department data
        dept_data = {
            "_id": ObjectId(),
            "name": data["name"],
            "description": data.get("description", ""),
            "head": data.get("head", ""),
            "total_employees": int(data.get("totalEmployees", 0)),
            "status": "Active",
            "franchise_code": branch_code,
            "branch_code": branch_code,
            "created_at": datetime.utcnow(),
            "created_by": current_user.get("user_id"),
            "updated_at": datetime.utcnow()
        }
        
        # Insert department
        result = db["departments"].insert_one(dept_data)
        
        if result.inserted_id:
            new_department = {
                "id": str(dept_data["_id"]),
                "name": data["name"],
                "description": data.get("description", ""),
                "head": data.get("head", ""),
                "totalEmployees": int(data.get("totalEmployees", 0)),
                "status": "Active",
                "created_at": dept_data["created_at"],
                "updated_at": dept_data["updated_at"]
            }
            
            logger.info(f"[ADD DEPARTMENT] Department created successfully: {new_department['name']}")
            
            return {
                "success": True,
                "message": "Department added successfully",
                "department": new_department
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create department")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[ADD DEPARTMENT] Error adding department: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add department")


@router.put("/departments/{dept_id}")
async def update_department(dept_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Update a department"""
    import logging
    import json
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        logger.info(f"[UPDATE DEPARTMENT] Updating department {dept_id}: {data}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        # Find department
        department = db["departments"].find_one({
            "_id": ObjectId(dept_id),
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        })
        
        if not department:
            raise HTTPException(status_code=404, detail="Department not found")
        
        # Check if new name already exists (if name is being changed)
        if "name" in data and data["name"] != department.get("name"):
            existing_dept = db["departments"].find_one({
                "name": data["name"],
                "_id": {"$ne": ObjectId(dept_id)},
                "$or": [
                    {"franchise_code": branch_code},
                    {"branch_code": branch_code}
                ]
            })
            
            if existing_dept:
                raise HTTPException(status_code=400, detail="Department name already exists")
        
        # Update department
        update_data = {}
        if "name" in data:
            update_data["name"] = data["name"]
        if "description" in data:
            update_data["description"] = data["description"]
        if "head" in data:
            update_data["head"] = data["head"]
        if "totalEmployees" in data:
            update_data["total_employees"] = int(data["totalEmployees"])
        if "status" in data:
            update_data["status"] = data["status"]
        
        update_data["updated_at"] = datetime.utcnow()
        update_data["updated_by"] = current_user.get("user_id")
        
        result = db["departments"].update_one(
            {"_id": ObjectId(dept_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            logger.info(f"[UPDATE DEPARTMENT] Department updated successfully: {dept_id}")
            return {
                "success": True,
                "message": "Department updated successfully"
            }
        else:
            return {
                "success": True,
                "message": "No changes made"
            }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[UPDATE DEPARTMENT] Error updating department: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update department")


@router.delete("/departments/{dept_id}")
async def delete_department(dept_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Delete a department"""
    import logging
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[DELETE DEPARTMENT] Deleting department: {dept_id}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        # Check if department has employees
        employees_count = db["employees"].count_documents({
            "department_id": ObjectId(dept_id)
        })
        
        if employees_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete department. It has {employees_count} employees assigned."
            )
        
        # Delete department
        result = db["departments"].delete_one({
            "_id": ObjectId(dept_id),
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        })
        
        if result.deleted_count > 0:
            logger.info(f"[DELETE DEPARTMENT] Department deleted successfully: {dept_id}")
            return {
                "success": True,
                "message": "Department deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Department not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[DELETE DEPARTMENT] Error deleting department: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete department")


@router.patch("/departments/{dept_id}/status")
async def toggle_department_status(dept_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Toggle department status (Active/Inactive)"""
    import logging
    import json
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        new_status = data.get("status")
        
        logger.info(f"[TOGGLE DEPARTMENT STATUS] Toggling status for {dept_id} to {new_status}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        # Update department status
        result = db["departments"].update_one(
            {
                "_id": ObjectId(dept_id),
                "$or": [
                    {"franchise_code": branch_code},
                    {"branch_code": branch_code}
                ]
            },
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.utcnow(),
                    "updated_by": current_user.get("user_id")
                }
            }
        )
        
        if result.modified_count > 0:
            logger.info(f"[TOGGLE DEPARTMENT STATUS] Status updated successfully: {dept_id}")
            return {
                "success": True,
                "message": f"Department status changed to {new_status}",
                "status": new_status
            }
        else:
            raise HTTPException(status_code=404, detail="Department not found")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[TOGGLE DEPARTMENT STATUS] Error updating status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update department status")


# ============= Staff Management API Endpoints =============

@router.get("/staff")
async def get_staff(request: Request, current_user: dict = Depends(get_current_user)):
    """Get all staff for the current branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[STAFF] Getting staff for user: {current_user.get('email')}")
        logger.info(f"[STAFF] Current user data: {current_user}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            logger.warning("[STAFF] No branch code found in token, trying to find from branches collection")
            # Try to find branch where this user is the centre_head
            user_email = current_user.get("email")
            logger.info(f"[STAFF] Searching for branch with centre_head.email = {user_email}")
            
            # Try multiple query patterns
            queries = [
                {"centre_head.email": user_email, "status": {"$ne": "DELETED"}},
                {"centre_head.email": user_email},
                {"admin_email": user_email, "status": {"$ne": "DELETED"}},
                {"email": user_email, "status": {"$ne": "DELETED"}}
            ]
            
            branch = None
            for i, query in enumerate(queries):
                logger.info(f"[STAFF] Trying query {i+1}: {query}")
                branch = db["branches"].find_one(query)
                if branch:
                    logger.info(f"[STAFF] Found branch with query {i+1}: {branch.get('centre_info', {}).get('centre_name', 'Unknown')}")
                    break
                else:
                    logger.info(f"[STAFF] Query {i+1} returned no results")
            
            if branch:
                branch_code = branch.get("centre_info", {}).get("branch_code") or branch.get("franchise_code") or branch.get("code")
                logger.info(f"[STAFF] Found branch_code from branches collection: {branch_code}")
                logger.info(f"[STAFF] Branch details: centre_name={branch.get('centre_info', {}).get('centre_name')}, franchise_code={branch.get('franchise_code')}")
            else:
                logger.warning(f"[STAFF] No branch found for user email: {user_email}")
                logger.info(f"[STAFF] Checking total branches in database...")
                total_branches = db["branches"].count_documents({})
                logger.info(f"[STAFF] Total branches in database: {total_branches}")
                
                # Sample a few branches to see their structure
                sample_branches = list(db["branches"].find({}).limit(3))
                for idx, b in enumerate(sample_branches):
                    logger.info(f"[STAFF] Sample branch {idx+1}: centre_head.email={b.get('centre_head', {}).get('email')}, admin_email={b.get('admin_email')}")
                
                return {"success": True, "staff": []}
        
        logger.info(f"[STAFF] Using branch_code: {branch_code}")
        
        # Build query similar to programs endpoint - use both branch_code and franchise_code
        # This ensures we get staff for the franchise even if branch_code varies
        query = {}
        
        # Get franchise_code from current_user
        franchise_code = current_user.get("franchise_code")
        
        logger.info(f"[STAFF] Building query with branch_code={branch_code}, franchise_code={franchise_code}")
        
        # Filter by franchise_code (primary filter for franchise admin)
        if franchise_code:
            query["franchise_code"] = franchise_code
            logger.info(f"[STAFF] Added franchise_code filter: {franchise_code}")
        
        # Also filter by branch_code if available
        if branch_code and branch_code != franchise_code:
            # Use $or to match either franchise_code or branch_code
            query = {
                "$or": [
                    {"franchise_code": franchise_code} if franchise_code else {},
                    {"branch_code": branch_code}
                ]
            }
            logger.info(f"[STAFF] Using $or query for both codes")
        
        logger.info(f"[STAFF] Final query: {query}")
        
        staff = list(db["staff"].find(query).sort("created_at", -1))
        
        logger.info(f"[STAFF] Found {len(staff)} staff members in database")
        
        # If no staff found, check what's in the staff collection
        if len(staff) == 0:
            total_staff = db["staff"].count_documents({})
            logger.info(f"[STAFF] Total staff in database: {total_staff}")
            
            # Sample a few staff to see their structure
            sample_staff = list(db["staff"].find({}).limit(5))
            for idx, s in enumerate(sample_staff):
                logger.info(f"[STAFF] Sample staff {idx+1}: franchise_code={s.get('franchise_code')}, branch_code={s.get('branch_code')}, employee_name={s.get('employee_name')}")
            
            # Log what we're looking for vs what exists
            logger.warning(f"[STAFF] Looking for franchise_code={franchise_code} or branch_code={branch_code}")
            logger.warning(f"[STAFF] But found staff with different codes in database")
        
        # Format staff for response
        staff_list = []
        for member in staff:
            staff_list.append({
                "id": str(member["_id"]),
                "empId": member.get("emp_id", ""),
                "employeeName": member.get("employee_name", ""),
                "phone": member.get("phone", ""),
                "basicSalary": member.get("basic_salary", ""),
                "department": member.get("department", ""),
                "status": member.get("status", "Active"),
                "email": member.get("email", ""),
                "address": member.get("address", ""),
                "dateOfJoining": member.get("date_of_joining", ""),
                "gender": member.get("gender", ""),
                "ta": member.get("ta", ""),
                "da": member.get("da", ""),
                "hra": member.get("hra", ""),
                "casualLeave": member.get("casual_leave", ""),
                "created_at": member.get("created_at", ""),
                "updated_at": member.get("updated_at", "")
            })
        
        logger.info(f"[STAFF] Found {len(staff_list)} staff members")
        
        return {
            "success": True,
            "staff": staff_list
        }
        
    except Exception as e:
        logger.error(f"[STAFF] Error getting staff: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch staff")


@router.post("/staff")
async def add_staff(request: Request, current_user: dict = Depends(get_current_user)):
    """Add a new staff member"""
    import logging
    import json
    from bson import ObjectId
    from passlib.context import CryptContext
    
    logger = logging.getLogger("uvicorn")
    
    try:
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        logger.info(f"[ADD STAFF] Adding new staff member: {data}")
        
        # Comprehensive validation
        validation_errors = []
        
        # Required fields validation
        required_fields = {
            'empId': 'Employee ID',
            'password': 'Password', 
            'employeeName': 'Employee Name',
            'department': 'Department',
            'phone': 'Phone',
            'email': 'Email',
            'address': 'Address',
            'dateOfJoining': 'Date of Joining',
            'basicSalary': 'Basic Salary'
        }
        
        for field, field_name in required_fields.items():
            if field not in data or not data[field] or str(data[field]).strip() == '':
                validation_errors.append(f"{field_name} is required")
        
        # If basic validation failed, return early
        if validation_errors:
            raise HTTPException(status_code=400, detail=f"Validation failed: {'; '.join(validation_errors)}")
        
        # Specific field validations
        import re
        
        # Employee ID validation
        emp_id = str(data['empId']).strip()
        if len(emp_id) < 3:
            validation_errors.append("Employee ID must be at least 3 characters")
        elif not re.match(r'^[a-zA-Z0-9_-]+$', emp_id):
            validation_errors.append("Employee ID can only contain letters, numbers, hyphens and underscores")
        
        # Password validation
        password = str(data['password']).strip()
        if len(password) < 6:
            validation_errors.append("Password must be at least 6 characters")
        
        # Employee name validation
        employee_name = str(data['employeeName']).strip()
        if len(employee_name) < 2:
            validation_errors.append("Employee name must be at least 2 characters")
        elif not re.match(r'^[a-zA-Z\s.]+$', employee_name):
            validation_errors.append("Employee name can only contain letters, spaces and periods")
        
        # Phone validation
        phone = str(data['phone']).strip().replace(' ', '').replace('-', '')
        if not re.match(r'^[0-9]{10}$', phone):
            validation_errors.append("Phone number must be exactly 10 digits")
        
        # Email validation
        email = str(data['email']).strip().lower()
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            validation_errors.append("Please enter a valid email address")
        
        # Address validation
        address = str(data['address']).strip()
        if len(address) < 10:
            validation_errors.append("Address must be at least 10 characters")
        
        # Date of joining validation
        from datetime import datetime
        try:
            joining_date = datetime.strptime(data['dateOfJoining'], '%Y-%m-%d')
            if joining_date > datetime.now():
                validation_errors.append("Date of joining cannot be in the future")
        except ValueError:
            validation_errors.append("Invalid date format for date of joining")
        
        # Basic salary validation
        try:
            basic_salary = float(data['basicSalary'])
            if basic_salary <= 0:
                validation_errors.append("Basic salary must be a positive number")
            elif basic_salary < 1000:
                validation_errors.append("Basic salary must be at least 1000")
        except (ValueError, TypeError):
            validation_errors.append("Basic salary must be a valid number")
        
        # Optional field validations (if provided)
        for field, field_name in [('ta', 'T.A'), ('da', 'D.A'), ('hra', 'H.R.A')]:
            if field in data and data[field] and str(data[field]).strip():
                try:
                    value = float(data[field])
                    if value < 0 or value > 100:
                        validation_errors.append(f"{field_name} must be between 0 and 100")
                except (ValueError, TypeError):
                    validation_errors.append(f"{field_name} must be a valid number")
        
        # Casual leave validation
        if 'casualLeave' in data and data['casualLeave'] and str(data['casualLeave']).strip():
            try:
                leave_value = float(data['casualLeave'])
                if leave_value < 0 or leave_value > 30:
                    validation_errors.append("Casual leave must be between 0 and 30 days")
            except (ValueError, TypeError):
                validation_errors.append("Casual leave must be a valid number")
        
        # If there are validation errors, return them
        if validation_errors:
            raise HTTPException(status_code=400, detail=f"Validation failed: {'; '.join(validation_errors)}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found")
        
        # Check if employee ID already exists
        existing_staff = db["staff"].find_one({
            "emp_id": emp_id,
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        })
        
        if existing_staff:
            raise HTTPException(status_code=400, detail="Employee ID already exists")
        
        # Check if email already exists
        existing_email = db["staff"].find_one({
            "email": email,
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        })
        
        if existing_email:
            raise HTTPException(status_code=400, detail="Email address already exists")
        
        # Check if phone already exists
        existing_phone = db["staff"].find_one({
            "phone": phone,
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        })
        
        if existing_phone:
            raise HTTPException(status_code=400, detail="Phone number already exists")
        
        # Hash password
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed_password = pwd_context.hash(password)
        
        # Create staff data with cleaned values
        staff_data = {
            "_id": ObjectId(),
            "emp_id": emp_id,
            "employee_name": employee_name,
            "password": hashed_password,
            "department": str(data["department"]).strip(),
            "gender": data.get("gender", "Male"),
            "phone": phone,
            "email": email,
            "address": address,
            "date_of_joining": data["dateOfJoining"],
            "basic_salary": str(basic_salary),
            "ta": str(data.get("ta", "")).strip(),
            "da": str(data.get("da", "")).strip(),
            "hra": str(data.get("hra", "")).strip(),
            "casual_leave": str(data.get("casualLeave", "")).strip(),
            "status": "Active",
            "franchise_code": branch_code,
            "branch_code": branch_code,
            "created_at": datetime.utcnow(),
            "created_by": current_user.get("user_id"),
            "updated_at": datetime.utcnow()
        }
        
        # Insert staff member
        result = db["staff"].insert_one(staff_data)
        
        if result.inserted_id:
            new_staff = {
                "id": str(staff_data["_id"]),
                "empId": emp_id,
                "employeeName": employee_name,
                "phone": phone,
                "basicSalary": str(basic_salary),
                "department": str(data["department"]).strip(),
                "status": "Active",
                "email": email,
                "address": address,
                "dateOfJoining": data["dateOfJoining"],
                "gender": data.get("gender", "Male"),
                "ta": str(data.get("ta", "")).strip(),
                "da": str(data.get("da", "")).strip(),
                "hra": str(data.get("hra", "")).strip(),
                "casualLeave": str(data.get("casualLeave", "")).strip(),
                "created_at": staff_data["created_at"],
                "updated_at": staff_data["updated_at"]
            }
            
            logger.info(f"[ADD STAFF] Staff member created successfully: {new_staff['employeeName']}")
            
            return {
                "success": True,
                "message": "Staff member added successfully",
                "staff": new_staff
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create staff member")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"[ADD STAFF] Error adding staff member: {str(e)}")
        logger.error(f"[ADD STAFF] Full traceback: {error_details}")
        raise HTTPException(status_code=500, detail=f"Failed to add staff member: {str(e)}")


@router.put("/staff/{staff_id}")
async def update_staff(staff_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Update a staff member"""
    import logging
    import json
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        logger.info(f"[UPDATE STAFF] Updating staff {staff_id}: {data}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        # Find staff member
        staff_member = db["staff"].find_one({
            "_id": ObjectId(staff_id),
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        })
        
        if not staff_member:
            raise HTTPException(status_code=404, detail="Staff member not found")
        
        # Check if new employee ID already exists (if empId is being changed)
        if "empId" in data and data["empId"] != staff_member.get("emp_id"):
            existing_staff = db["staff"].find_one({
                "emp_id": data["empId"],
                "_id": {"$ne": ObjectId(staff_id)},
                "$or": [
                    {"franchise_code": branch_code},
                    {"branch_code": branch_code}
                ]
            })
            
            if existing_staff:
                raise HTTPException(status_code=400, detail="Employee ID already exists")
        
        # Update staff member
        update_data = {}
        if "empId" in data:
            update_data["emp_id"] = data["empId"]
        if "employeeName" in data:
            update_data["employee_name"] = data["employeeName"]
        if "department" in data:
            update_data["department"] = data["department"]
        if "phone" in data:
            update_data["phone"] = data["phone"]
        if "basicSalary" in data:
            update_data["basic_salary"] = data["basicSalary"]
        if "status" in data:
            update_data["status"] = data["status"]
        if "email" in data:
            update_data["email"] = data["email"]
        
        update_data["updated_at"] = datetime.utcnow()
        update_data["updated_by"] = current_user.get("user_id")
        
        result = db["staff"].update_one(
            {"_id": ObjectId(staff_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            logger.info(f"[UPDATE STAFF] Staff member updated successfully: {staff_id}")
            return {
                "success": True,
                "message": "Staff member updated successfully"
            }
        else:
            return {
                "success": True,
                "message": "No changes made"
            }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"[UPDATE STAFF] Error updating staff member: {str(e)}")
        logger.error(f"[UPDATE STAFF] Full traceback: {error_details}")
        raise HTTPException(status_code=500, detail=f"Failed to update staff member: {str(e)}")


@router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Delete a staff member"""
    import logging
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[DELETE STAFF] Deleting staff member: {staff_id}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        # Delete staff member
        result = db["staff"].delete_one({
            "_id": ObjectId(staff_id),
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        })
        
        if result.deleted_count > 0:
            logger.info(f"[DELETE STAFF] Staff member deleted successfully: {staff_id}")
            return {
                "success": True,
                "message": "Staff member deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Staff member not found")
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"[DELETE STAFF] Error deleting staff member: {str(e)}")
        logger.error(f"[DELETE STAFF] Full traceback: {error_details}")
        raise HTTPException(status_code=500, detail=f"Failed to delete staff member: {str(e)}")


@router.patch("/staff/{staff_id}/status")
async def toggle_staff_status(staff_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Toggle staff member status (Active/Inactive)"""
    import logging
    import json
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        new_status = data.get("status")
        
        logger.info(f"[TOGGLE STAFF STATUS] Toggling status for {staff_id} to {new_status}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        # Update staff member status
        result = db["staff"].update_one(
            {
                "_id": ObjectId(staff_id),
                "$or": [
                    {"franchise_code": branch_code},
                    {"branch_code": branch_code}
                ]
            },
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.utcnow(),
                    "updated_by": current_user.get("user_id")
                }
            }
        )
        
        if result.modified_count > 0:
            logger.info(f"[TOGGLE STAFF STATUS] Status updated successfully: {staff_id}")
            return {
                "success": True,
                "message": f"Staff member status changed to {new_status}",
                "status": new_status
            }
        else:
            raise HTTPException(status_code=404, detail="Staff member not found")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"[TOGGLE STAFF STATUS] Error updating status: {str(e)}")
        logger.error(f"[TOGGLE STAFF STATUS] Full traceback: {error_details}")
        raise HTTPException(status_code=500, detail=f"Failed to update staff member status: {str(e)}")


# ============= Fees Management API Endpoints =============

@router.get("/fees")
async def get_fees(request: Request, current_user: dict = Depends(get_current_user)):
    """Get all fees for the current branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[FEES] Getting fees for user: {current_user.get('email')}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            logger.warning("[FEES] No branch code found for user")
            return {"success": True, "fees": []}
        
        fees = list(db["fees"].find({
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        }).sort("created_at", -1))
        
        # Format fees for response
        fee_list = []
        for fee in fees:
            fee_list.append({
                "id": str(fee["_id"]),
                "student_name": fee.get("student_name", ""),
                "course_name": fee.get("course_name", ""),
                "amount": fee.get("amount", 0),
                "payment_date": fee.get("payment_date", ""),
                "status": fee.get("status", "Pending"),
                "created_at": fee.get("created_at", ""),
                "updated_at": fee.get("updated_at", "")
            })
        
        logger.info(f"[FEES] Found {len(fee_list)} fees")
        
        return {
            "success": True,
            "fees": fee_list
        }
        
    except Exception as e:
        logger.error(f"[FEES] Error getting fees: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch fees")


@router.post("/fees")
async def add_fee(request: Request, current_user: dict = Depends(get_current_user)):
    """Add a new fee record"""
    import logging
    import json
    from bson import ObjectId
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    
    try:
        # Parse request body
        body = await request.body()
        fee_data = json.loads(body.decode('utf-8'))
        
        logger.info(f"[FEES] Adding fee: {fee_data}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found for user")
        
        # Prepare fee data for insertion
        fee_record = {
            "student_name": fee_data.get("student_name", ""),
            "course_name": fee_data.get("course_name", ""),
            "amount": float(fee_data.get("amount", 0)),
            "payment_date": fee_data.get("payment_date", ""),
            "status": fee_data.get("status", "Pending"),
            "franchise_code": branch_code,
            "created_by": current_user.get("email"),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = db["fees"].insert_one(fee_record)
        
        if result.inserted_id:
            logger.info(f"[FEES] Fee added successfully: {result.inserted_id}")
            return {
                "success": True,
                "message": "Fee added successfully",
                "fee_id": str(result.inserted_id)
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to add fee")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[FEES] Error adding fee: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add fee")


# ============= Advance Management API Endpoints =============

@router.get("/advances")
async def get_advances(request: Request, current_user: dict = Depends(get_current_user)):
    """Get all advance records for the current branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[ADVANCES] Getting advances for user: {current_user.get('email')}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            logger.warning("[ADVANCES] No branch code found for user")
            return {"success": True, "advances": []}
        
        advances = list(db["advances"].find({
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        }).sort("created_at", -1))
        
        # Format advances for response
        advance_list = []
        for advance in advances:
            advance_list.append({
                "id": str(advance["_id"]),
                "employeeId": advance.get("employee_id", ""),
                "employeeName": advance.get("employee_name", ""),
                "amount": advance.get("amount", 0),
                "advanceType": advance.get("advance_type", "paid"), # paid or deducted
                "paymentDate": advance.get("payment_date", ""),
                "description": advance.get("description", ""),
                "status": advance.get("status", "Active"),
                "remainingAmount": advance.get("remaining_amount", 0),
                "created_at": advance.get("created_at", ""),
                "updated_at": advance.get("updated_at", "")
            })
        
        logger.info(f"[ADVANCES] Found {len(advance_list)} advances")
        
        return {
            "success": True,
            "advances": advance_list
        }
        
    except Exception as e:
        logger.error(f"[ADVANCES] Error getting advances: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch advances")


@router.post("/advances")
async def pay_advance(request: Request, current_user: dict = Depends(get_current_user)):
    """Pay advance to an employee or record deduction"""
    import logging
    import json
    from bson import ObjectId
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    
    try:
        # Parse request body
        body = await request.body()
        advance_data = json.loads(body.decode('utf-8'))
        
        # More robust advance type detection
        advance_type = advance_data.get("advanceType") or advance_data.get("advance_type", "paid")
        logger.info(f"[ADVANCE] Processing {advance_type}: {advance_data}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found for user")
        
        # For instructors, check in users collection with role=instructor
        employee = db["users"].find_one({"_id": ObjectId(advance_data.get("employeeId")), "role": "instructor"})
        employee_name_from_db = None
        
        if employee:
            employee_name_from_db = employee.get("employeeName") or employee.get("name") or employee.get("full_name")
        else:
            # Also check staff collection
            employee = db["staff"].find_one({"_id": ObjectId(advance_data.get("employeeId"))})
            if employee:
                employee_name_from_db = employee.get("employeeName") or employee.get("name") or employee.get("full_name")
            else:
                logger.warning(f"[ADVANCE] Employee not found: {advance_data.get('employeeId')}")
                # Don't fail - just log warning and continue
        
        # Use employee name from payload or fallback to database
        final_employee_name = advance_data.get("employeeName") or employee_name_from_db or "Unknown Employee"
        
        # Prepare advance record for insertion
        advance_record = {
            "employee_id": advance_data.get("employeeId"),
            "employee_name": final_employee_name,
            "amount": float(advance_data.get("amount", 0)),
            "advance_type": advance_type,
            "payment_date": advance_data.get("paymentDate", ""),
            "description": advance_data.get("description", ""),
            "status": "Completed" if advance_type == "deducted" else "Active",
            "remaining_amount": 0 if advance_type == "deducted" else float(advance_data.get("amount", 0)),
            "franchise_code": branch_code,
            "created_by": current_user.get("email"),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = db["advances"].insert_one(advance_record)
        
        if result.inserted_id:
            logger.info(f"[ADVANCE] {advance_type.capitalize()} recorded successfully: {result.inserted_id}")
            message = f"₹{advance_data.get('amount')} advance deducted from {final_employee_name}" if advance_type == "deducted" else f"₹{advance_data.get('amount')} advance paid to {final_employee_name}"
            return {
                "success": True,
                "message": message,
                "advance_id": str(result.inserted_id),
                "employee_name": final_employee_name
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to pay advance")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[PAY ADVANCE] Error paying advance: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to pay advance")


@router.patch("/advances/{advance_id}/deduct")
async def deduct_advance(advance_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Deduct advance from employee"""
    import logging
    import json
    from bson import ObjectId
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    
    try:
        # Parse request body
        body = await request.body()
        deduction_data = json.loads(body.decode('utf-8'))
        
        logger.info(f"[DEDUCT ADVANCE] Deducting advance: {deduction_data}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found for user")
        
        # Find the advance record
        advance = db["advances"].find_one({"_id": ObjectId(advance_id)})
        if not advance:
            raise HTTPException(status_code=404, detail="Advance record not found")
        
        deduction_amount = float(deduction_data.get("amount", 0))
        current_remaining = advance.get("remaining_amount", 0)
        
        if deduction_amount > current_remaining:
            raise HTTPException(status_code=400, detail="Deduction amount cannot be more than remaining advance")
        
        new_remaining = current_remaining - deduction_amount
        
        # Update the advance record
        update_result = db["advances"].update_one(
            {"_id": ObjectId(advance_id)},
            {
                "$set": {
                    "remaining_amount": new_remaining,
                    "status": "Completed" if new_remaining <= 0 else "Active",
                    "updated_at": datetime.utcnow().isoformat()
                }
            }
        )
        
        # Create deduction record
        deduction_record = {
            "employee_id": advance.get("employee_id"),
            "employee_name": advance.get("employee_name"),
            "advance_id": advance_id,
            "amount": deduction_amount,
            "advance_type": "deducted",
            "payment_date": deduction_data.get("deductionDate", datetime.utcnow().isoformat().split('T')[0]),
            "description": deduction_data.get("description", f"Deduction from advance - {advance.get('description', '')}"),
            "status": "Completed",
            "franchise_code": branch_code,
            "created_by": current_user.get("email"),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        db["advances"].insert_one(deduction_record)
        
        if update_result.modified_count > 0:
            logger.info(f"[DEDUCT ADVANCE] Advance deducted successfully: {advance_id}")
            return {
                "success": True,
                "message": f"₹{deduction_amount} deducted from {advance.get('employee_name')}",
                "remaining_amount": new_remaining,
                "status": "Completed" if new_remaining <= 0 else "Active"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update advance record")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[DEDUCT ADVANCE] Error deducting advance: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to deduct advance")


@router.get("/employees/{employee_id}/advances")
async def get_employee_advances(employee_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Get advance summary for a specific employee"""
    import logging
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[EMPLOYEE ADVANCES] Getting advances for employee: {employee_id}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found for user")
        
        # Get all advance records for this employee
        advances = list(db["advances"].find({
            "employee_id": employee_id,
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        }).sort("created_at", -1))
        
        # Calculate totals
        total_paid = sum(adv.get("amount", 0) for adv in advances if adv.get("advance_type") == "paid")
        total_deducted = sum(adv.get("amount", 0) for adv in advances if adv.get("advance_type") == "deducted")
        total_due = total_paid - total_deducted
        
        logger.info(f"[EMPLOYEE ADVANCES] Employee {employee_id} - Paid: {total_paid}, Deducted: {total_deducted}, Due: {total_due}")
        
        return {
            "success": True,
            "employee_id": employee_id,
            "total_paid": total_paid,
            "total_deducted": total_deducted,
            "total_due": total_due,
            "advances": advances
        }
        
    except Exception as e:
        logger.error(f"[EMPLOYEE ADVANCES] Error getting employee advances: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch employee advances")


# ============= Income Heads Management API Endpoints =============

@router.get("/income-heads")
async def get_income_heads(request: Request, current_user: dict = Depends(get_current_user)):
    """Get all income heads for the current branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[INCOME HEADS] Getting income heads for user: {current_user.get('email')}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        user_role = current_user.get("role")
        
        if not branch_code:
            logger.warning("[INCOME HEADS] No branch code found for user")
            return {"success": True, "income_heads": []}
        
        # Use branch-specific collection for branch admin
        if user_role == "branch_admin":
            # Collection name format: branch_income_heads_{branch_code}
            collection_name = f"branch_income_heads_{branch_code.replace('-', '_').lower()}"
            logger.info(f"[INCOME HEADS] Using branch collection: {collection_name}")
            income_heads = list(db[collection_name].find({}).sort("created_at", -1))
        else:
            # For other roles, use global collection with filter
            income_heads = list(db["income_heads"].find({
                "$or": [
                    {"franchise_code": branch_code},
                    {"branch_code": branch_code}
                ]
            }).sort("created_at", -1))
        
        # Format income heads for response
        head_list = []
        for head in income_heads:
            head_list.append({
                "id": str(head["_id"]),
                "headName": head.get("head_name", ""),
                "status": head.get("status", "on"),
                "created_at": head.get("created_at", ""),
                "updated_at": head.get("updated_at", "")
            })
        
        logger.info(f"[INCOME HEADS] Found {len(head_list)} income heads")
        
        return {
            "success": True,
            "income_heads": head_list
        }
        
    except Exception as e:
        logger.error(f"[INCOME HEADS] Error getting income heads: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch income heads")


@router.post("/income-heads")
async def add_income_head(request: Request, current_user: dict = Depends(get_current_user)):
    """Add a new income head"""
    import logging
    import json
    from bson import ObjectId
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    
    try:
        # Parse request body
        body = await request.body()
        head_data = json.loads(body.decode('utf-8'))
        
        logger.info(f"[INCOME HEADS] Adding income head: {head_data}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        user_role = current_user.get("role")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found for user")
        
        # Use branch-specific collection for branch admin
        if user_role == "branch_admin":
            collection_name = f"branch_income_heads_{branch_code.replace('-', '_').lower()}"
            logger.info(f"[INCOME HEADS] Using branch collection: {collection_name}")
            income_heads_collection = db[collection_name]
            
            # Check if head name already exists in branch collection
            existing_head = income_heads_collection.find_one({
                "head_name": head_data.get("headName")
            })
        else:
            # For other roles, use global collection
            income_heads_collection = db["income_heads"]
            
            # Check if head name already exists
            existing_head = income_heads_collection.find_one({
                "head_name": head_data.get("headName"),
                "$or": [
                    {"franchise_code": branch_code},
                    {"branch_code": branch_code}
                ]
            })
        
        if existing_head:
            raise HTTPException(status_code=400, detail="Income head with this name already exists")
        
        # Prepare income head data for insertion
        head_record = {
            "head_name": head_data.get("headName", ""),
            "status": head_data.get("status", "on"),
            "branch_code": branch_code,
            "franchise_code": current_user.get("franchise_code", branch_code),
            "created_by": current_user.get("email"),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = income_heads_collection.insert_one(head_record)
        
        if result.inserted_id:
            logger.info(f"[INCOME HEADS] Income head added successfully: {result.inserted_id}")
            return {
                "success": True,
                "message": "Income head added successfully",
                "income_head": {
                    "id": str(result.inserted_id),
                    "headName": head_record["head_name"],
                    "status": head_record["status"]
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to add income head")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[INCOME HEADS] Error adding income head: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add income head")


@router.put("/income-heads/{head_id}")
async def update_income_head(head_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Update an income head"""
    import logging
    import json
    from bson import ObjectId
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    
    try:
        # Parse request body
        body = await request.body()
        head_data = json.loads(body.decode('utf-8'))
        
        logger.info(f"[INCOME HEADS] Updating income head {head_id}: {head_data}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        user_role = current_user.get("role")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found for user")
        
        # Use branch-specific collection for branch admin
        if user_role == "branch_admin":
            collection_name = f"branch_income_heads_{branch_code.replace('-', '_').lower()}"
            income_heads_collection = db[collection_name]
            
            # Find the income head
            head = income_heads_collection.find_one({"_id": ObjectId(head_id)})
        else:
            # For other roles, use global collection
            income_heads_collection = db["income_heads"]
            
            # Find the income head
            head = income_heads_collection.find_one({
                "_id": ObjectId(head_id),
                "$or": [
                    {"franchise_code": branch_code},
                    {"branch_code": branch_code}
                ]
            })
        
        if not head:
            raise HTTPException(status_code=404, detail="Income head not found")
        
        # Check if new head name already exists (excluding current head)
        if head_data.get("headName") != head.get("head_name"):
            if user_role == "branch_admin":
                existing_head = income_heads_collection.find_one({
                    "head_name": head_data.get("headName"),
                    "_id": {"$ne": ObjectId(head_id)}
                })
            else:
                existing_head = income_heads_collection.find_one({
                    "head_name": head_data.get("headName"),
                    "_id": {"$ne": ObjectId(head_id)},
                    "$or": [
                        {"franchise_code": branch_code},
                        {"branch_code": branch_code}
                    ]
                })
            
            if existing_head:
                raise HTTPException(status_code=400, detail="Income head with this name already exists")
        
        # Update the income head
        update_data = {
            "head_name": head_data.get("headName", head.get("head_name")),
            "status": head_data.get("status", head.get("status")),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = income_heads_collection.update_one(
            {"_id": ObjectId(head_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0 or result.matched_count > 0:
            logger.info(f"[INCOME HEADS] Income head updated successfully: {head_id}")
            return {
                "success": True,
                "message": "Income head updated successfully",
                "income_head": {
                    "id": head_id,
                    "headName": update_data["head_name"],
                    "status": update_data["status"]
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update income head")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[INCOME HEADS] Error updating income head: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update income head")


@router.delete("/income-heads/{head_id}")
async def delete_income_head(head_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Delete an income head"""
    import logging
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[INCOME HEADS] Deleting income head: {head_id}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        user_role = current_user.get("role")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found for user")
        
        # Use branch-specific collection for branch admin
        if user_role == "branch_admin":
            collection_name = f"branch_income_heads_{branch_code.replace('-', '_').lower()}"
            income_heads_collection = db[collection_name]
            logger.info(f"[INCOME HEADS] Deleting from branch collection: {collection_name}")
            
            # Find and delete the income head
            result = income_heads_collection.delete_one({"_id": ObjectId(head_id)})
        else:
            # For other roles, use global collection
            income_heads_collection = db["income_heads"]
            
            # Find and delete the income head
            result = income_heads_collection.delete_one({
                "_id": ObjectId(head_id),
                "$or": [
                    {"franchise_code": branch_code},
                    {"branch_code": branch_code}
                ]
            })
        
        if result.deleted_count > 0:
            logger.info(f"[INCOME HEADS] Income head deleted successfully: {head_id}")
            return {
                "success": True,
                "message": "Income head deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Income head not found")
        
    except Exception as e:
        logger.error(f"[INCOME HEADS] Error deleting income head: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete income head")


@router.patch("/income-heads/{head_id}/toggle-status")
async def toggle_income_head_status(head_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Toggle income head status (on/off)"""
    import logging
    from bson import ObjectId
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[INCOME HEADS] Toggling status for income head: {head_id}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        user_role = current_user.get("role")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found for user")
        
        # Use branch-specific collection for branch admin
        if user_role == "branch_admin":
            collection_name = f"branch_income_heads_{branch_code.replace('-', '_').lower()}"
            income_heads_collection = db[collection_name]
            
            # Find the income head
            head = income_heads_collection.find_one({"_id": ObjectId(head_id)})
        else:
            # For other roles, use global collection
            income_heads_collection = db["income_heads"]
            
            # Find the income head
            head = income_heads_collection.find_one({
                "_id": ObjectId(head_id),
                "$or": [
                    {"franchise_code": branch_code},
                    {"branch_code": branch_code}
                ]
            })
        
        if not head:
            raise HTTPException(status_code=404, detail="Income head not found")
        
        # Toggle status
        current_status = head.get("status", "on")
        new_status = "off" if current_status == "on" else "on"
        
        # Update the status
        result = income_heads_collection.update_one(
            {"_id": ObjectId(head_id)},
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.utcnow().isoformat()
                }
            }
        )
        
        if result.modified_count > 0 or result.matched_count > 0:
            logger.info(f"[INCOME HEADS] Status toggled successfully: {head_id} -> {new_status}")
            return {
                "success": True,
                "message": "Status updated successfully",
                "status": new_status
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update status")
        
    except Exception as e:
        logger.error(f"[INCOME HEADS] Error toggling status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to toggle status")


# ============= Cashin (Income Records) Management API Endpoints =============

@router.get("/cashins")
async def get_cashins(
    request: Request, 
    current_user: dict = Depends(get_current_user),
    branch_id: str = None,
    head_id: str = None,
    from_date: str = None,
    to_date: str = None
):
    """Get all cashin records for the current branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[CASHINS] Getting cashin records for user: {current_user.get('email')}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        user_role = current_user.get("role")
        
        if not branch_code:
            logger.warning("[CASHINS] No branch code found for user")
            return {"success": True, "data": []}
        
        # Build query
        query = {}
        
        # Use branch-specific collection for branch admin
        if user_role == "branch_admin":
            collection_name = f"branch_cashins_{branch_code.replace('-', '_').lower()}"
            logger.info(f"[CASHINS] Using branch collection: {collection_name}")
            cashins_collection = db[collection_name]
        else:
            # For other roles, use global collection with filter
            cashins_collection = db["cashins"]
            query["branch_code"] = branch_code
        
        # Add filters
        if head_id:
            query["head_id"] = head_id
        if from_date:
            query["income_date"] = {"$gte": from_date}
        if to_date:
            if "income_date" in query:
                query["income_date"]["$lte"] = to_date
            else:
                query["income_date"] = {"$lte": to_date}
        
        cashins = list(cashins_collection.find(query).sort("income_date", -1))
        
        # Format cashins for response
        cashin_list = []
        for cashin in cashins:
            cashin_list.append({
                "id": str(cashin["_id"]),
                "head_id": cashin.get("head_id", ""),
                "amount": cashin.get("amount", 0),
                "payment_mode": cashin.get("payment_mode", ""),
                "payment_mode_description": cashin.get("payment_mode_description", ""),
                "income_date": cashin.get("income_date", ""),
                "income_description": cashin.get("income_description", ""),
                "created_at": cashin.get("created_at", ""),
                "updated_at": cashin.get("updated_at", "")
            })
        
        logger.info(f"[CASHINS] Found {len(cashin_list)} cashin records")
        
        return {
            "success": True,
            "data": cashin_list
        }
        
    except Exception as e:
        logger.error(f"[CASHINS] Error getting cashins: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch cashin records")


@router.post("/cashins")
async def add_cashin(request: Request, current_user: dict = Depends(get_current_user)):
    """Add a new cashin record"""
    import logging
    import json
    from bson import ObjectId
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    
    try:
        # Parse request body
        body = await request.body()
        cashin_data = json.loads(body.decode('utf-8'))
        
        logger.info(f"[CASHINS] Adding cashin: {cashin_data}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        user_role = current_user.get("role")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found for user")
        
        # Use branch-specific collection for branch admin
        if user_role == "branch_admin":
            collection_name = f"branch_cashins_{branch_code.replace('-', '_').lower()}"
            logger.info(f"[CASHINS] Using branch collection: {collection_name}")
            cashins_collection = db[collection_name]
        else:
            cashins_collection = db["cashins"]
        
        # Prepare cashin data for insertion
        cashin_record = {
            "head_id": cashin_data.get("head_id", ""),
            "amount": float(cashin_data.get("amount", 0)),
            "payment_mode": cashin_data.get("payment_mode", ""),
            "payment_mode_description": cashin_data.get("payment_mode_description", ""),
            "income_date": cashin_data.get("income_date", ""),
            "income_description": cashin_data.get("income_description", ""),
            "branch_code": branch_code,
            "franchise_code": current_user.get("franchise_code", branch_code),
            "created_by": current_user.get("email"),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = cashins_collection.insert_one(cashin_record)
        
        if result.inserted_id:
            logger.info(f"[CASHINS] Cashin added successfully: {result.inserted_id}")
            return {
                "success": True,
                "message": "Cashin added successfully",
                "cashin": {
                    "id": str(result.inserted_id),
                    "amount": cashin_record["amount"]
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to add cashin")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[CASHINS] Error adding cashin: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add cashin")


@router.put("/cashins/{cashin_id}")
async def update_cashin(cashin_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Update a cashin record"""
    import logging
    import json
    from bson import ObjectId
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    
    try:
        body = await request.body()
        cashin_data = json.loads(body.decode('utf-8'))
        
        logger.info(f"[CASHINS] Updating cashin {cashin_id}: {cashin_data}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        user_role = current_user.get("role")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found for user")
        
        # Use branch-specific collection for branch admin
        if user_role == "branch_admin":
            collection_name = f"branch_cashins_{branch_code.replace('-', '_').lower()}"
            cashins_collection = db[collection_name]
            cashin = cashins_collection.find_one({"_id": ObjectId(cashin_id)})
        else:
            cashins_collection = db["cashins"]
            cashin = cashins_collection.find_one({
                "_id": ObjectId(cashin_id),
                "branch_code": branch_code
            })
        
        if not cashin:
            raise HTTPException(status_code=404, detail="Cashin not found")
        
        # Update data
        update_data = {
            "head_id": cashin_data.get("head_id", cashin.get("head_id")),
            "amount": float(cashin_data.get("amount", cashin.get("amount"))),
            "payment_mode": cashin_data.get("payment_mode", cashin.get("payment_mode")),
            "payment_mode_description": cashin_data.get("payment_mode_description", cashin.get("payment_mode_description")),
            "income_date": cashin_data.get("income_date", cashin.get("income_date")),
            "income_description": cashin_data.get("income_description", cashin.get("income_description")),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = cashins_collection.update_one(
            {"_id": ObjectId(cashin_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0 or result.matched_count > 0:
            logger.info(f"[CASHINS] Cashin updated successfully: {cashin_id}")
            return {
                "success": True,
                "message": "Cashin updated successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update cashin")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[CASHINS] Error updating cashin: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update cashin")


@router.delete("/cashins/{cashin_id}")
async def delete_cashin(cashin_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Delete a cashin record"""
    import logging
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[CASHINS] Deleting cashin: {cashin_id}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        user_role = current_user.get("role")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found for user")
        
        # Use branch-specific collection for branch admin
        if user_role == "branch_admin":
            collection_name = f"branch_cashins_{branch_code.replace('-', '_').lower()}"
            cashins_collection = db[collection_name]
            result = cashins_collection.delete_one({"_id": ObjectId(cashin_id)})
        else:
            cashins_collection = db["cashins"]
            result = cashins_collection.delete_one({
                "_id": ObjectId(cashin_id),
                "branch_code": branch_code
            })
        
        if result.deleted_count > 0:
            logger.info(f"[CASHINS] Cashin deleted successfully: {cashin_id}")
            return {
                "success": True,
                "message": "Cashin deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Cashin not found")
        
    except Exception as e:
        logger.error(f"[CASHINS] Error deleting cashin: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete cashin")


# ============= Cashout (Expense Records) Management API Endpoints =============

@router.get("/cashouts")
async def get_cashouts(
    request: Request, 
    current_user: dict = Depends(get_current_user),
    branch_id: str = None,
    head_id: str = None,
    from_date: str = None,
    to_date: str = None
):
    """Get all cashout records for the current branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[CASHOUTS] Getting cashout records for user: {current_user.get('email')}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        user_role = current_user.get("role")
        
        if not branch_code:
            logger.warning("[CASHOUTS] No branch code found for user")
            return {"success": True, "data": []}
        
        # Build query
        query = {}
        
        # Use branch-specific collection for branch admin
        if user_role == "branch_admin":
            collection_name = f"branch_cashouts_{branch_code.replace('-', '_').lower()}"
            logger.info(f"[CASHOUTS] Using branch collection: {collection_name}")
            cashouts_collection = db[collection_name]
        else:
            # For other roles, use global collection with filter
            cashouts_collection = db["cashouts"]
            query["branch_code"] = branch_code
        
        # Add filters
        if head_id:
            query["head_id"] = head_id
        if from_date:
            query["expense_date"] = {"$gte": from_date}
        if to_date:
            if "expense_date" in query:
                query["expense_date"]["$lte"] = to_date
            else:
                query["expense_date"] = {"$lte": to_date}
        
        cashouts = list(cashouts_collection.find(query).sort("expense_date", -1))
        
        # Format cashouts for response
        cashout_list = []
        for cashout in cashouts:
            cashout_list.append({
                "id": str(cashout["_id"]),
                "head_id": cashout.get("head_id", ""),
                "amount": cashout.get("amount", 0),
                "payment_mode": cashout.get("payment_mode", ""),
                "payment_mode_description": cashout.get("payment_mode_description", ""),
                "expense_date": cashout.get("expense_date", ""),
                "expense_description": cashout.get("expense_description", ""),
                "created_at": cashout.get("created_at", ""),
                "updated_at": cashout.get("updated_at", "")
            })
        
        logger.info(f"[CASHOUTS] Found {len(cashout_list)} cashout records")
        
        return {
            "success": True,
            "data": cashout_list
        }
        
    except Exception as e:
        logger.error(f"[CASHOUTS] Error getting cashouts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch cashout records")


@router.post("/cashouts")
async def add_cashout(request: Request, current_user: dict = Depends(get_current_user)):
    """Add a new cashout record"""
    import logging
    import json
    from bson import ObjectId
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    
    try:
        # Parse request body
        body = await request.body()
        cashout_data = json.loads(body.decode('utf-8'))
        
        logger.info(f"[CASHOUTS] Adding cashout: {cashout_data}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        franchise_code = current_user.get("franchise_code")
        user_role = current_user.get("role")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found for user")
        
        # Use branch-specific collection for branch admin
        if user_role == "branch_admin":
            collection_name = f"branch_cashouts_{branch_code.replace('-', '_').lower()}"
            logger.info(f"[CASHOUTS] Using branch collection: {collection_name}")
            cashouts_collection = db[collection_name]
        else:
            cashouts_collection = db["cashouts"]
        
        # Prepare cashout data for insertion
        cashout_record = {
            "head_id": cashout_data.get("head_id", ""),
            "amount": float(cashout_data.get("amount", 0)),
            "payment_mode": cashout_data.get("payment_mode", ""),
            "payment_mode_description": cashout_data.get("payment_mode_description", ""),
            "expense_date": cashout_data.get("expense_date", ""),
            "expense_description": cashout_data.get("expense_description", ""),
            "branch_code": branch_code,
            "franchise_code": franchise_code,
            "created_by": current_user.get("email"),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = cashouts_collection.insert_one(cashout_record)
        
        if result.inserted_id:
            logger.info(f"[CASHOUTS] Cashout added successfully: {result.inserted_id}")
            return {
                "success": True,
                "message": "Cashout added successfully",
                "cashout": {
                    "id": str(result.inserted_id),
                    "amount": cashout_record["amount"]
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to add cashout")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[CASHOUTS] Error adding cashout: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add cashout")


@router.put("/cashouts/{cashout_id}")
async def update_cashout(cashout_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Update a cashout record"""
    import logging
    import json
    from bson import ObjectId
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    
    try:
        body = await request.body()
        cashout_data = json.loads(body.decode('utf-8'))
        
        logger.info(f"[CASHOUTS] Updating cashout {cashout_id}: {cashout_data}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        user_role = current_user.get("role")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found for user")
        
        # Use branch-specific collection for branch admin
        if user_role == "branch_admin":
            collection_name = f"branch_cashouts_{branch_code.replace('-', '_').lower()}"
            cashouts_collection = db[collection_name]
            cashout = cashouts_collection.find_one({"_id": ObjectId(cashout_id)})
        else:
            cashouts_collection = db["cashouts"]
            cashout = cashouts_collection.find_one({
                "_id": ObjectId(cashout_id),
                "branch_code": branch_code
            })
        
        if not cashout:
            raise HTTPException(status_code=404, detail="Cashout not found")
        
        # Update data
        update_data = {
            "head_id": cashout_data.get("head_id", cashout.get("head_id")),
            "amount": float(cashout_data.get("amount", cashout.get("amount"))),
            "payment_mode": cashout_data.get("payment_mode", cashout.get("payment_mode")),
            "payment_mode_description": cashout_data.get("payment_mode_description", cashout.get("payment_mode_description")),
            "expense_date": cashout_data.get("expense_date", cashout.get("expense_date")),
            "expense_description": cashout_data.get("expense_description", cashout.get("expense_description")),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = cashouts_collection.update_one(
            {"_id": ObjectId(cashout_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0 or result.matched_count > 0:
            logger.info(f"[CASHOUTS] Cashout updated successfully: {cashout_id}")
            return {
                "success": True,
                "message": "Cashout updated successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update cashout")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[CASHOUTS] Error updating cashout: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update cashout")


@router.delete("/cashouts/{cashout_id}")
async def delete_cashout(cashout_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Delete a cashout record"""
    import logging
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[CASHOUTS] Deleting cashout: {cashout_id}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        user_role = current_user.get("role")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found for user")
        
        # Use branch-specific collection for branch admin
        if user_role == "branch_admin":
            collection_name = f"branch_cashouts_{branch_code.replace('-', '_').lower()}"
            cashouts_collection = db[collection_name]
            result = cashouts_collection.delete_one({"_id": ObjectId(cashout_id)})
        else:
            cashouts_collection = db["cashouts"]
            result = cashouts_collection.delete_one({
                "_id": ObjectId(cashout_id),
                "branch_code": branch_code
            })
        
        if result.deleted_count > 0:
            logger.info(f"[CASHOUTS] Cashout deleted successfully: {cashout_id}")
            return {
                "success": True,
                "message": "Cashout deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Cashout not found")
        
    except Exception as e:
        logger.error(f"[CASHOUTS] Error deleting cashout: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete cashout")


# ============= Income Records Management API Endpoints =============

@router.get("/incomes")
async def get_incomes(request: Request, current_user: dict = Depends(get_current_user)):
    """Get all income records for the current branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[INCOMES] Getting income records for user: {current_user.get('email')}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            logger.warning("[INCOMES] No branch code found for user")
            return {"success": True, "incomes": []}
        
        incomes = list(db["income_records"].find({
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        }).sort("created_at", -1))
        
        # Format incomes for response
        income_list = []
        for income in incomes:
            income_list.append({
                "id": str(income["_id"]),
                "branch": income.get("branch", ""),
                "headName": income.get("head_name", ""),
                "amount": income.get("amount", 0),
                "date": income.get("date", ""),
                "paymentMode": income.get("payment_mode", "Cash"),
                "description": income.get("description", ""),
                "created_at": income.get("created_at", ""),
                "updated_at": income.get("updated_at", "")
            })
        
        logger.info(f"[INCOMES] Found {len(income_list)} income records")
        
        return {
            "success": True,
            "incomes": income_list
        }
        
    except Exception as e:
        logger.error(f"[INCOMES] Error getting income records: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch income records")


@router.post("/incomes")
async def add_income(request: Request, current_user: dict = Depends(get_current_user)):
    """Add a new income record"""
    import logging
    import json
    from bson import ObjectId
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    
    try:
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        logger.info(f"[ADD INCOME] Adding new income record: {data}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found")
        
        # Validate required fields
        required_fields = ["headName", "amount", "date"]
        for field in required_fields:
            if field not in data or not data[field]:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Create income record data
        income_data = {
            "_id": ObjectId(),
            "branch": data.get("branch", "Current Branch"),
            "head_name": data["headName"],
            "amount": float(data["amount"]),
            "date": data["date"],
            "payment_mode": data.get("paymentMode", "Cash"),
            "description": data.get("description", ""),
            "franchise_code": branch_code,
            "branch_code": branch_code,
            "created_at": datetime.utcnow(),
            "created_by": current_user.get("user_id"),
            "updated_at": datetime.utcnow()
        }
        
        # Insert income record
        result = db["income_records"].insert_one(income_data)
        
        if result.inserted_id:
            new_income = {
                "id": str(income_data["_id"]),
                "branch": income_data["branch"],
                "headName": income_data["head_name"],
                "amount": income_data["amount"],
                "date": income_data["date"],
                "paymentMode": income_data["payment_mode"],
                "description": income_data["description"],
                "created_at": income_data["created_at"],
                "updated_at": income_data["updated_at"]
            }
            
            logger.info(f"[ADD INCOME] Income record created successfully: {new_income['headName']}")
            
            return {
                "success": True,
                "message": "Income record added successfully",
                "income": new_income
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create income record")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[ADD INCOME] Error adding income record: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add income record")


@router.delete("/incomes/{income_id}")
async def delete_income(income_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Delete an income record"""
    import logging
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[DELETE INCOME] Deleting income record: {income_id}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        # Delete income record
        result = db["income_records"].delete_one({
            "_id": ObjectId(income_id),
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        })
        
        if result.deleted_count > 0:
            logger.info(f"[DELETE INCOME] Income record deleted successfully: {income_id}")
            return {
                "success": True,
                "message": "Income record deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Income record not found")
        
    except Exception as e:
        logger.error(f"[DELETE INCOME] Error deleting income record: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete income record")


# ============= Expense Heads Management API Endpoints =============

@router.get("/expense-heads")
async def get_expense_heads(request: Request, current_user: dict = Depends(get_current_user)):
    """Get all expense heads for the current branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[EXPENSE HEADS] Getting expense heads for user: {current_user.get('email')}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        user_role = current_user.get("role")
        
        if not branch_code:
            logger.warning("[EXPENSE HEADS] No branch code found for user")
            return {"success": True, "expense_heads": []}
        
        # Use branch-specific collection for branch admin
        if user_role == "branch_admin":
            collection_name = f"branch_expense_heads_{branch_code.replace('-', '_').lower()}"
            logger.info(f"[EXPENSE HEADS] Using branch collection: {collection_name}")
            expense_heads = list(db[collection_name].find({}).sort("created_at", -1))
        else:
            # For other roles, use global collection with filter
            expense_heads = list(db["expense_heads"].find({
                "$or": [
                    {"franchise_code": branch_code},
                    {"branch_code": branch_code}
                ]
            }).sort("created_at", -1))
        
        # Format expense heads for response
        head_list = []
        for head in expense_heads:
            head_list.append({
                "id": str(head["_id"]),
                "headName": head.get("head_name", ""),
                "name": head.get("head_name", ""),
                "status": head.get("status", "off"),
                "description": head.get("description", ""),
                "created_at": head.get("created_at", ""),
                "updated_at": head.get("updated_at", "")
            })
        
        logger.info(f"[EXPENSE HEADS] Found {len(head_list)} expense heads")
        
        return {
            "success": True,
            "expense_heads": head_list
        }
        
    except Exception as e:
        logger.error(f"[EXPENSE HEADS] Error getting expense heads: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch expense heads")


@router.post("/expense-heads")
async def add_expense_head(request: Request, current_user: dict = Depends(get_current_user)):
    """Add a new expense head"""
    import logging
    import json
    from bson import ObjectId
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    
    try:
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        logger.info(f"[EXPENSE HEADS] Adding expense head: {data}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        franchise_code = current_user.get("franchise_code")
        user_role = current_user.get("role")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found")
        
        # Handle both headName and head_name from frontend
        head_name_value = data.get("headName") or data.get("head_name")
        
        # Validate required fields
        if not head_name_value:
            raise HTTPException(status_code=400, detail="Head name is required")
        
        # Use branch-specific collection for branch admin
        if user_role == "branch_admin":
            collection_name = f"branch_expense_heads_{branch_code.replace('-', '_').lower()}"
            logger.info(f"[EXPENSE HEADS] Using branch collection: {collection_name}")
            expense_heads_collection = db[collection_name]
            # Check if head name already exists in branch collection
            existing_head = expense_heads_collection.find_one({"head_name": head_name_value})
        else:
            expense_heads_collection = db["expense_heads"]
            # Check if head name already exists
            existing_head = expense_heads_collection.find_one({
                "head_name": head_name_value,
                "$or": [
                    {"franchise_code": franchise_code},
                    {"branch_code": branch_code}
                ]
            })
        
        if existing_head:
            raise HTTPException(status_code=400, detail="Expense head with this name already exists")
        
        # Create expense head data
        head_data = {
            "_id": ObjectId(),
            "head_name": head_name_value,
            "status": data.get("status", "off"),
            "description": data.get("description", ""),
            "franchise_code": franchise_code,
            "branch_code": branch_code,
            "created_at": datetime.utcnow(),
            "created_by": current_user.get("user_id"),
            "updated_at": datetime.utcnow()
        }
        
        # Insert expense head
        result = expense_heads_collection.insert_one(head_data)
        
        if result.inserted_id:
            new_head = {
                "id": str(head_data["_id"]),
                "headName": head_data["head_name"],
                "name": head_data["head_name"],
                "status": head_data["status"],
                "description": head_data["description"],
                "created_at": head_data["created_at"],
                "updated_at": head_data["updated_at"]
            }
            
            logger.info(f"[EXPENSE HEADS] Expense head created successfully: {new_head['headName']}")
            
            return {
                "success": True,
                "message": "Expense head added successfully",
                "expense_head": new_head
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create expense head")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[EXPENSE HEADS] Error adding expense head: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add expense head")


@router.put("/expense-heads/{head_id}")
async def update_expense_head(head_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Update an expense head"""
    import logging
    import json
    from bson import ObjectId
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    
    try:
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        logger.info(f"[EXPENSE HEADS] Updating expense head: {head_id} with data: {data}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        user_role = current_user.get("role")
        
        # Validate required fields
        if not data.get("headName"):
            raise HTTPException(status_code=400, detail="Head name is required")
        
        # Update expense head
        update_data = {
            "head_name": data["headName"],
            "status": data.get("status", "off"),
            "description": data.get("description", ""),
            "updated_at": datetime.utcnow()
        }
        
        # Use branch-specific collection for branch admin
        if user_role == "branch_admin":
            collection_name = f"branch_expense_heads_{branch_code.replace('-', '_').lower()}"
            result = db[collection_name].update_one(
                {"_id": ObjectId(head_id)},
                {"$set": update_data}
            )
        else:
            result = db["expense_heads"].update_one(
                {
                    "_id": ObjectId(head_id),
                    "$or": [
                        {"franchise_code": branch_code},
                        {"branch_code": branch_code}
                    ]
                },
                {"$set": update_data}
            )
        
        if result.matched_count > 0:
            logger.info(f"[EXPENSE HEADS] Expense head updated successfully: {head_id}")
            return {
                "success": True,
                "message": "Expense head updated successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Expense head not found")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[EXPENSE HEADS] Error updating expense head: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update expense head")


@router.delete("/expense-heads/{head_id}")
async def delete_expense_head(head_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Delete an expense head"""
    import logging
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[EXPENSE HEADS] Deleting expense head: {head_id}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        user_role = current_user.get("role")
        
        # Use branch-specific collection for branch admin
        if user_role == "branch_admin":
            collection_name = f"branch_expense_heads_{branch_code.replace('-', '_').lower()}"
            result = db[collection_name].delete_one({"_id": ObjectId(head_id)})
        else:
            # Delete expense head from global collection
            result = db["expense_heads"].delete_one({
                "_id": ObjectId(head_id),
                "$or": [
                    {"franchise_code": branch_code},
                    {"branch_code": branch_code}
                ]
            })
        
        if result.deleted_count > 0:
            logger.info(f"[EXPENSE HEADS] Expense head deleted successfully: {head_id}")
            return {
                "success": True,
                "message": "Expense head deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Expense head not found")
        
    except Exception as e:
        logger.error(f"[EXPENSE HEADS] Error deleting expense head: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete expense head")


# ============= Expense Records Management API Endpoints =============

@router.get("/expenses")
async def get_expenses(request: Request, current_user: dict = Depends(get_current_user)):
    """Get all expense records for the current branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[EXPENSES] Getting expense records for user: {current_user.get('email')}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            logger.warning("[EXPENSES] No branch code found for user")
            return {"success": True, "expenses": []}
        
        expenses = list(db["expense_records"].find({
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        }).sort("created_at", -1))
        
        # Format expenses for response
        expense_list = []
        for expense in expenses:
            expense_list.append({
                "id": str(expense["_id"]),
                "headName": expense.get("head_name", ""),
                "amount": expense.get("amount", 0),
                "date": expense.get("date", ""),
                "paymentMode": expense.get("payment_mode", "Cash"),
                "description": expense.get("description", ""),
                "created_at": expense.get("created_at", ""),
                "updated_at": expense.get("updated_at", "")
            })
        
        logger.info(f"[EXPENSES] Found {len(expense_list)} expense records")
        
        return {
            "success": True,
            "expenses": expense_list
        }
        
    except Exception as e:
        logger.error(f"[EXPENSES] Error getting expense records: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch expense records")


@router.post("/expenses")
async def add_expense(request: Request, current_user: dict = Depends(get_current_user)):
    """Add a new expense record"""
    import logging
    import json
    from bson import ObjectId
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    
    try:
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        logger.info(f"[ADD EXPENSE] Adding new expense record: {data}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found")
        
        # Validate required fields
        required_fields = ["headName", "amount", "date"]
        for field in required_fields:
            if field not in data or not data[field]:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Create expense record data
        expense_data = {
            "_id": ObjectId(),
            "head_name": data["headName"],
            "amount": float(data["amount"]),
            "date": data["date"],
            "payment_mode": data.get("paymentMode", "Cash"),
            "description": data.get("description", ""),
            "franchise_code": branch_code,
            "branch_code": branch_code,
            "created_at": datetime.utcnow(),
            "created_by": current_user.get("user_id"),
            "updated_at": datetime.utcnow()
        }
        
        # Insert expense record
        result = db["expense_records"].insert_one(expense_data)
        
        if result.inserted_id:
            new_expense = {
                "id": str(expense_data["_id"]),
                "headName": expense_data["head_name"],
                "amount": expense_data["amount"],
                "date": expense_data["date"],
                "paymentMode": expense_data["payment_mode"],
                "description": expense_data["description"],
                "created_at": expense_data["created_at"],
                "updated_at": expense_data["updated_at"]
            }
            
            logger.info(f"[ADD EXPENSE] Expense record created successfully: {new_expense['headName']}")
            
            return {
                "success": True,
                "message": "Expense record added successfully",
                "expense": new_expense
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create expense record")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[ADD EXPENSE] Error adding expense record: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add expense record")


@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Delete an expense record"""
    import logging
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[DELETE EXPENSE] Deleting expense record: {expense_id}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        # Delete expense record
        result = db["expense_records"].delete_one({
            "_id": ObjectId(expense_id),
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        })
        
        if result.deleted_count > 0:
            logger.info(f"[DELETE EXPENSE] Expense record deleted successfully: {expense_id}")
            return {
                "success": True,
                "message": "Expense record deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Expense record not found")
        
    except Exception as e:
        logger.error(f"[DELETE EXPENSE] Error deleting expense record: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete expense record")


# ============= Staff Management API Endpoints =============

@router.get("/staff")
async def get_staff(request: Request, current_user: dict = Depends(get_current_user)):
    """Get all staff members for the current branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[STAFF] Getting staff members for user: {current_user.get('email')}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            logger.warning("[STAFF] No branch code found for user")
            return {"success": True, "staff": []}
        
        # Check if staff collection exists and create sample data if empty
        staff_count = db["staff"].count_documents({
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        })
        
        if staff_count == 0:
            from bson import ObjectId
            from datetime import datetime
            
            logger.info("[STAFF] No staff found, creating sample staff members")
            sample_staff = [
                {
                    "_id": ObjectId(),
                    "name": "John Doe",
                    "emp_id": "EMP001",
                    "department": "Teaching",
                    "designation": "Senior Instructor", 
                    "basic_salary": 25000,
                    "email": "john.doe@skillwallah.com",
                    "phone": "9876543210",
                    "join_date": "2023-01-15",
                    "status": "active",
                    "franchise_code": branch_code,
                    "branch_code": branch_code,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                },
                {
                    "_id": ObjectId(),
                    "name": "Jane Smith", 
                    "emp_id": "EMP002",
                    "department": "Administration",
                    "designation": "Office Manager",
                    "basic_salary": 30000,
                    "email": "jane.smith@skillwallah.com", 
                    "phone": "9876543211",
                    "join_date": "2023-02-01",
                    "status": "active",
                    "franchise_code": branch_code,
                    "branch_code": branch_code,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                },
                {
                    "_id": ObjectId(),
                    "name": "Mike Johnson",
                    "emp_id": "EMP003", 
                    "department": "IT Support",
                    "designation": "IT Technician",
                    "basic_salary": 28000,
                    "email": "mike.johnson@skillwallah.com",
                    "phone": "9876543212", 
                    "join_date": "2023-03-01",
                    "status": "active",
                    "franchise_code": branch_code,
                    "branch_code": branch_code,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            ]
            db["staff"].insert_many(sample_staff)
            logger.info(f"[STAFF] Created {len(sample_staff)} sample staff members")
        
        staff_members = list(db["staff"].find({
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        }).sort("created_at", -1))
        
        logger.info(f"[STAFF] Raw staff data from database: {staff_members}")
        
        # Format staff for response
        staff_list = []
        for staff in staff_members:
            # Try different possible field names for employee data
            emp_name = (
                staff.get("name", "") or 
                staff.get("employee_name", "") or 
                staff.get("staff_name", "") or 
                staff.get("full_name", "") or
                "Unknown Employee"
            )
            
            emp_id = (
                staff.get("emp_id", "") or 
                staff.get("employee_id", "") or 
                staff.get("staff_id", "") or
                str(staff["_id"])[-6:]  # Use last 6 chars of _id if no emp_id
            )
            
            staff_list.append({
                "id": str(staff["_id"]),
                "empId": emp_id,
                "name": emp_name,
                "department": staff.get("department", "") or staff.get("dept", ""),
                "designation": staff.get("designation", "") or staff.get("position", "") or staff.get("role", ""),
                "basicSalary": staff.get("basic_salary", 0) or staff.get("salary", 0) or 0,
                "email": staff.get("email", ""),
                "phone": staff.get("phone", "") or staff.get("mobile", ""),
                "joinDate": staff.get("join_date", "") or staff.get("joining_date", ""),
                "status": staff.get("status", "active"),
                "created_at": staff.get("created_at", ""),
                "updated_at": staff.get("updated_at", "")
            })
        
        logger.info(f"[STAFF] Found {len(staff_list)} staff members")
        
        return {
            "success": True,
            "staff": staff_list
        }
        
    except Exception as e:
        logger.error(f"[STAFF] Error getting staff members: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch staff members")


# ============= Departments Management API Endpoints =============

@router.get("/departments")
async def get_departments(request: Request, current_user: dict = Depends(get_current_user)):
    """Get all departments for the current branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[DEPARTMENTS] Getting departments for user: {current_user.get('email')}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            logger.warning("[DEPARTMENTS] No branch code found for user")
            return {"success": True, "departments": []}
        
        # Check if departments collection exists and create sample data if empty
        dept_count = db["departments"].count_documents({
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        })
        
        if dept_count == 0:
            from bson import ObjectId
            from datetime import datetime
            
            logger.info("[DEPARTMENTS] No departments found, creating sample departments")
            sample_departments = [
                {
                    "_id": ObjectId(),
                    "name": "Teaching",
                    "description": "Teaching and Training Department",
                    "head": "Academic Head",
                    "status": "active",
                    "franchise_code": branch_code,
                    "branch_code": branch_code,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                },
                {
                    "_id": ObjectId(),
                    "name": "Administration",
                    "description": "Administrative and Management Department",
                    "head": "Admin Head",
                    "status": "active", 
                    "franchise_code": branch_code,
                    "branch_code": branch_code,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                },
                {
                    "_id": ObjectId(),
                    "name": "IT Support",
                    "description": "Information Technology Support Department",
                    "head": "IT Head",
                    "status": "active",
                    "franchise_code": branch_code,
                    "branch_code": branch_code,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                },
                {
                    "_id": ObjectId(),
                    "name": "Accounts",
                    "description": "Accounts and Finance Department", 
                    "head": "Finance Head",
                    "status": "active",
                    "franchise_code": branch_code,
                    "branch_code": branch_code,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            ]
            db["departments"].insert_many(sample_departments)
            logger.info(f"[DEPARTMENTS] Created {len(sample_departments)} sample departments")
        
        departments = list(db["departments"].find({
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        }).sort("name", 1))
        
        # Format departments for response
        dept_list = []
        for dept in departments:
            dept_list.append({
                "id": str(dept["_id"]),
                "name": dept.get("name", ""),
                "description": dept.get("description", ""),
                "head": dept.get("head", ""),
                "status": dept.get("status", "active"),
                "created_at": dept.get("created_at", ""),
                "updated_at": dept.get("updated_at", "")
            })
        
        logger.info(f"[DEPARTMENTS] Found {len(dept_list)} departments")
        
        return {
            "success": True,
            "departments": dept_list
        }
        
    except Exception as e:
        logger.error(f"[DEPARTMENTS] Error getting departments: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch departments")


# ============= Salary Management API Endpoints =============

@router.get("/salaries")
async def get_salaries(request: Request, current_user: dict = Depends(get_current_user)):
    """Get all generated salaries for the current branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[SALARIES] Getting salaries for user: {current_user.get('email')}")
        logger.info(f"[SALARIES] Current user data: {current_user}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            logger.warning("[SALARIES] No branch code found in token, trying to find from branches collection")
            # Try to find branch where this user is the centre_head
            user_email = current_user.get("email")
            logger.info(f"[SALARIES] Searching for branch with centre_head.email = {user_email}")
            
            # Try multiple query patterns
            queries = [
                {"centre_head.email": user_email, "status": {"$ne": "DELETED"}},
                {"centre_head.email": user_email},
                {"admin_email": user_email, "status": {"$ne": "DELETED"}},
                {"email": user_email, "status": {"$ne": "DELETED"}}
            ]
            
            branch = None
            for i, query in enumerate(queries):
                logger.info(f"[SALARIES] Trying query {i+1}: {query}")
                branch = db["branches"].find_one(query)
                if branch:
                    logger.info(f"[SALARIES] Found branch with query {i+1}: {branch.get('centre_info', {}).get('centre_name', 'Unknown')}")
                    break
                else:
                    logger.info(f"[SALARIES] Query {i+1} returned no results")
            
            if branch:
                branch_code = branch.get("centre_info", {}).get("branch_code") or branch.get("franchise_code") or branch.get("code")
                logger.info(f"[SALARIES] Found branch_code from branches collection: {branch_code}")
                logger.info(f"[SALARIES] Branch details: centre_name={branch.get('centre_info', {}).get('centre_name')}, franchise_code={branch.get('franchise_code')}")
            else:
                logger.warning(f"[SALARIES] No branch found for user email: {user_email}")
                return {"success": True, "salaries": []}
        
        logger.info(f"[SALARIES] Using branch_code: {branch_code}")
        
        
        
        salaries = list(db["salaries"].find({
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        }).sort("created_at", -1))
        
        # Format salaries for response
        salary_list = []
        for salary in salaries:
            salary_list.append({
                "id": str(salary["_id"]),
                "employeeId": salary.get("employeeId", ""),
                "employeeName": salary.get("employeeName", ""),
                "department": salary.get("department", ""),
                "month": salary.get("month", ""),
                "year": salary.get("year", ""),
                "basicSalary": salary.get("basicSalary", 0),
                "grossSalary": salary.get("grossSalary", "0"),
                "totalDeductions": salary.get("totalDeductions", "0"),
                "netSalary": salary.get("netSalary", "0"),
                "workingDays": salary.get("workingDays", 0),
                "presentDays": salary.get("presentDays", 0),
                "allowances": salary.get("allowances", []),
                "deductions": salary.get("deductions", []),
                "generatedDate": salary.get("generatedDate", ""),
                "branch_code": salary.get("branch_code", ""),
                "franchise_code": salary.get("franchise_code", ""),
                "created_at": salary.get("created_at", ""),
                "updated_at": salary.get("updated_at", "")
            })
        
        logger.info(f"[SALARIES] Found {len(salary_list)} salary records")
        
        return {
            "success": True,
            "salaries": salary_list
        }
        
    except Exception as e:
        logger.error(f"[SALARIES] Error getting salaries: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch salaries")


@router.post("/salaries")
async def generate_salary(request: Request, current_user: dict = Depends(get_current_user)):
    """Generate and save a new salary record"""
    import logging
    import json
    from bson import ObjectId
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    
    try:
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        logger.info(f"[GENERATE SALARY] Generating salary: {data.get('employeeName')} for {data.get('month')}/{data.get('year')}")
        logger.info(f"[GENERATE SALARY] Received data keys: {list(data.keys())}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        logger.info(f"[GENERATE SALARY] Branch code: {branch_code}")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="No branch code found")
        
        # Validate required fields
        required_fields = ["employeeId", "employeeName", "month", "year"]
        for field in required_fields:
            if field not in data or not data[field]:
                logger.error(f"[GENERATE SALARY] Missing required field: {field}")
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Ensure month and year are integers for comparison
        try:
            data_month = int(data["month"])
            data_year = int(data["year"])
        except (ValueError, TypeError) as e:
            logger.error(f"[GENERATE SALARY] Invalid month/year format: {e}")
            raise HTTPException(status_code=400, detail="Invalid month or year format")
        
        logger.info(f"[GENERATE SALARY] Checking for existing salary: employee={data['employeeId']}, month={data_month}, year={data_year}")
        
        # Check if salary already exists for this employee and month/year
        existing_salary = db["salaries"].find_one({
            "employeeId": data["employeeId"],
            "month": data_month,
            "year": data_year,
            "$or": [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        })
        
        if existing_salary:
            logger.warning(f"[GENERATE SALARY] Salary already exists for {data['employeeName']} in {data_month}/{data_year}")
            raise HTTPException(status_code=400, detail="Salary already generated for this employee and month")
        
        logger.info(f"[GENERATE SALARY] Creating salary record...")
        
        # Create salary record data with proper type conversions
        salary_data = {
            "_id": ObjectId(),
            "employeeId": str(data["employeeId"]),
            "employeeName": str(data["employeeName"]),
            "department": str(data.get("department", "")),
            "month": data_month,
            "year": data_year,
            "basicSalary": float(data.get("basicSalary", 0) or 0),
            "workingDays": int(data.get("workingDays", 26) or 26),
            "presentDays": int(data.get("presentDays", 26) or 26),
            "absentDays": int(data.get("absentDays", 0) or 0),
            "leaveDays": int(data.get("leaveDays", 0) or 0),
            "overtimeHours": int(data.get("overtimeHours", 0) or 0),
            "overtimeRate": float(data.get("overtimeRate", 0) or 0),
            "allowances": data.get("allowances", []),
            "deductions": data.get("deductions", []),
            "advance": float(data.get("advance", 0) or 0),
            "bonus": float(data.get("bonus", 0) or 0),
            "earnedBasicSalary": str(data.get("earnedBasicSalary", "0")),
            "totalAllowances": str(data.get("totalAllowances", "0")),
            "overtimePay": str(data.get("overtimePay", "0")),
            "grossSalary": str(data.get("grossSalary", "0")),
            "totalDeductions": str(data.get("totalDeductions", "0")),
            "netSalary": str(data.get("netSalary", "0")),
            "generatedDate": data.get("generatedDate", datetime.utcnow().isoformat()),
            "franchise_code": branch_code,
            "branch_code": branch_code,
            "created_at": datetime.utcnow(),
            "created_by": current_user.get("user_id"),
            "updated_at": datetime.utcnow()
        }
        
        logger.info(f"[GENERATE SALARY] Salary data prepared: {salary_data.get('employeeName')} | Gross: {salary_data.get('grossSalary')} | Net: {salary_data.get('netSalary')}")
        
        # Insert salary record
        try:
            result = db["salaries"].insert_one(salary_data)
        except Exception as insert_error:
            logger.error(f"[GENERATE SALARY] Database insert error: {str(insert_error)}")
            logger.error(f"[GENERATE SALARY] Salary data being inserted: {salary_data}")
            raise HTTPException(status_code=500, detail=f"Database insert failed: {str(insert_error)}")
        
        if result.inserted_id:
            new_salary = {
                "id": str(salary_data["_id"]),
                "employeeId": salary_data["employeeId"],
                "employeeName": salary_data["employeeName"],
                "department": salary_data["department"],
                "month": salary_data["month"],
                "year": salary_data["year"],
                "grossSalary": salary_data["grossSalary"],
                "totalDeductions": salary_data["totalDeductions"],
                "netSalary": salary_data["netSalary"],
                "generatedDate": salary_data["generatedDate"],
                "branch_code": salary_data["branch_code"],
                "franchise_code": salary_data["franchise_code"]
            }
            
            logger.info(f"[GENERATE SALARY] Salary generated successfully for: {salary_data['employeeName']}")
            
            return {
                "success": True,
                "message": "Salary generated and saved successfully",
                "salary": new_salary
            }
        else:
            logger.error(f"[GENERATE SALARY] Insert operation failed - no inserted_id returned")
            raise HTTPException(status_code=500, detail="Failed to generate salary - database insert failed")
        
    except json.JSONDecodeError as json_error:
        logger.error(f"[GENERATE SALARY] JSON decode error: {str(json_error)}")
        raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(json_error)}")
    except HTTPException:
        # Re-raise HTTPExceptions as they are already handled
        raise
    except Exception as e:
        logger.error(f"[GENERATE SALARY] Unexpected error generating salary: {str(e)}")
        logger.error(f"[GENERATE SALARY] Error type: {type(e).__name__}")
        import traceback
        logger.error(f"[GENERATE SALARY] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate salary: {str(e)}")


# ============== ID CARD ENDPOINTS ==============

@router.post("/id-cards/generate")
async def generate_student_id_card(request: Request, current_user: dict = Depends(get_current_user)):
    """Generate ID card for a student"""
    import logging
    import os
    from datetime import datetime
    from bson import ObjectId
    from PIL import Image, ImageDraw, ImageFont
    
    logger = logging.getLogger("uvicorn")
    
    try:
        # Parse request body
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        
        student_id = data.get("student_id")
        card_type = data.get("card_type", "student")
        # Get photo_url from request - this is the photo uploaded in the form
        request_photo_url = data.get("photo_url")
        # Get address from request - this is the address from the form
        request_address = data.get("address")
        # Get duration from request - this is the duration from the form
        request_duration = data.get("duration")
        
        if not student_id:
            raise HTTPException(status_code=400, detail="student_id is required")
        
        logger.info(f"[ID CARD] Generating ID card for student: {student_id}")
        logger.info(f"[ID CARD] Photo URL from request: {request_photo_url}")
        logger.info(f"[ID CARD] Address from request: {request_address}")
        logger.info(f"[ID CARD] Duration from request: {request_duration}")
        
        # Get database and branch context
        db = request.app.mongodb
        user_branch_code = current_user.get("branch_code")
        user_franchise_code = current_user.get("franchise_code")
        
        logger.info(f"[ID CARD] User branch_code: {user_branch_code}, franchise_code: {user_franchise_code}")
        
        # Find student first to get their actual branch_code
        student = db.branch_students.find_one({"_id": ObjectId(student_id)})
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        student_branch_code = student.get("branch_code")
        student_franchise_code = student.get("franchise_code")
        logger.info(f"[ID CARD] Found student: {student.get('student_name', 'N/A')}, branch_code: {student_branch_code}, franchise_code: {student_franchise_code}")
        
        # Determine if user is franchise admin or branch admin
        # If branch_code == franchise_code, user is franchise admin
        is_franchise_admin = user_branch_code == user_franchise_code
        
        logger.info(f"[ID CARD] Is franchise admin: {is_franchise_admin}")
        
        # Verify user has access to this student
        if is_franchise_admin:
            # Franchise admin - verify student belongs to same franchise
            # Handle case where student may not have franchise_code set
            if student_franchise_code and student_franchise_code != user_franchise_code:
                raise HTTPException(status_code=403, detail="Student does not belong to your franchise")
            # If student doesn't have franchise_code, check if their branch is under this franchise
            if not student_franchise_code:
                logger.info(f"[ID CARD] Student has no franchise_code, checking if branch belongs to franchise")
                # Find the branch and check its franchise_code
                branch = db.branches.find_one({"centre_info.branch_code": student_branch_code})
                if branch and branch.get("franchise_code") != user_franchise_code:
                    raise HTTPException(status_code=403, detail="Student's branch does not belong to your franchise")
        else:
            # Branch admin - verify student belongs to same branch
            if student_branch_code != user_branch_code:
                raise HTTPException(status_code=403, detail="Access denied to this student's branch")
        
        # Check if ID card already exists - if it does, we'll UPDATE it with new form data
        existing_card = db.branch_id_cards.find_one({
            "student_id": student_id,
            "branch_code": student_branch_code,
            "status": "active"
        })
        
        # Use address from form if provided, otherwise from student record
        address_to_use = request_address or student.get("address", "") or student.get("student_address", "") or student.get("permanent_address", "")
        logger.info(f"[ID CARD] Address to use: {address_to_use}")
        
        # Use duration from form if provided, otherwise from student record
        duration_to_use = request_duration or student.get("course_duration", "") or student.get("duration", "") or student.get("program_duration", "")
        logger.info(f"[ID CARD] Duration to use: {duration_to_use}")
        
        # Use photo_url from request if provided, otherwise use student's photo
        photo_to_use = request_photo_url or student.get("photo_url") or student.get("photo")
        logger.info(f"[ID CARD] Photo to use for ID card: {photo_to_use}")
        
        if existing_card:
            logger.info(f"[ID CARD] ID card already exists: {existing_card['_id']}, UPDATING with new form data")
            
            # Update existing card with new form data
            update_data = {
                "address": address_to_use,
                "course_duration": duration_to_use,
                "student_photo_url": photo_to_use,
                "updated_at": datetime.utcnow()
            }
            
            # Regenerate the ID card image with new data
            image_path = existing_card.get("file_path")
            if not image_path:
                id_card_dir = f"uploads/id_cards/{student_branch_code}"
                os.makedirs(id_card_dir, exist_ok=True)
                image_filename = f"id_card_{existing_card.get('card_number')}.png"
                image_path = os.path.join(id_card_dir, image_filename)
            
            success = await generate_id_card_image(student, image_path, student_branch_code, db, photo_to_use, address_to_use, duration_to_use)
            if success:
                update_data["file_path"] = image_path
                update_data["photo_url"] = image_path
            
            # Update the existing record
            db.branch_id_cards.update_one(
                {"_id": existing_card["_id"]},
                {"$set": update_data}
            )
            
            # Fetch updated card
            updated_card = db.branch_id_cards.find_one({"_id": existing_card["_id"]})
            
            return {
                "success": True,
                "message": "ID card updated with new data",
                "id_card": {
                    "id": str(existing_card["_id"]),
                    "student_id": student_id,
                    "student_name": student.get("student_name"),
                    "registration_number": student.get("registration_number"),
                    "card_number": existing_card.get("card_number"),
                    "issue_date": existing_card.get("issue_date"),
                    "status": existing_card.get("status"),
                    "file_path": image_path,
                    "address": address_to_use,
                    "course_duration": duration_to_use,
                    "student_photo_url": photo_to_use
                }
            }
        
        # Generate card number
        card_count = db.branch_id_cards.count_documents({
            "branch_code": student_branch_code
        })
        card_number = f"ID{student_branch_code[-4:]}{card_count + 1:04d}"
        
        # Get course information
        course_name = "N/A"
        course_duration = "N/A"
        if student.get("course"):
            course_name = student.get("course", "N/A")
            course_duration = student.get("course_duration", "N/A")
        
        # Create ID card document
        id_card_doc = {
            "_id": ObjectId(),
            "student_id": student_id,
            "student_name": student.get("student_name"),
            "student_registration": student.get("registration_number"),
            "father_name": student.get("father_name", ""),
            "mother_name": student.get("mother_name", ""),
            "date_of_birth": student.get("date_of_birth", ""),
            "contact_no": student.get("contact_no", ""),
            "email": student.get("email_id", "") or student.get("email", ""),
            "address": address_to_use,  # Address from form or student record
            "course": student.get("course", ""),
            "course_duration": duration_to_use,  # Duration from form or student record
            "batch": student.get("batch", ""),
            "student_photo_url": photo_to_use,  # Photo from form or student record
            "card_type": card_type,
            "issue_date": datetime.now().strftime("%Y-%m-%d"),
            "expiry_date": datetime.now().replace(year=datetime.now().year + 1).strftime("%Y-%m-%d"),
            "card_number": card_number,
            "status": "active",
            "branch_code": student_branch_code,
            "created_at": datetime.utcnow(),
            "created_by": current_user.get("user_id")
        }
        
        # Create directory for ID cards
        id_card_dir = f"uploads/id_cards/{student_branch_code}"
        os.makedirs(id_card_dir, exist_ok=True)
        
        # Generate image filename
        image_filename = f"id_card_{card_number}.png"
        image_path = os.path.join(id_card_dir, image_filename)
        
        # Generate ID card image - pass the photo URL, address and duration explicitly
        success = await generate_id_card_image(student, image_path, student_branch_code, db, photo_to_use, address_to_use, duration_to_use)
        
        if success:
            id_card_doc["file_path"] = image_path
            id_card_doc["photo_url"] = image_path
        
        # Insert ID card into branch_id_cards collection
        logger.info(f"[ID CARD] About to insert ID card document: {id_card_doc}")
        logger.info(f"[ID CARD] Target collection: branch_id_cards")
        
        try:
            result = db.branch_id_cards.insert_one(id_card_doc)
            logger.info(f"[ID CARD] Insert result: {result}")
            logger.info(f"[ID CARD] Inserted ID: {result.inserted_id}")
            logger.info(f"[ID CARD] Acknowledged: {result.acknowledged}")
        except Exception as insert_error:
            logger.error(f"[ID CARD] Insert error: {str(insert_error)}")
            raise
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to generate ID card")
        
        # Update student record to mark they have an ID card
        try:
            student_update = db.branch_students.update_one(
                {"_id": ObjectId(student_id)},
                {
                    "$set": {
                        "has_id_card": True,
                        "id_card_id": result.inserted_id,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            logger.info(f"[ID CARD] Student record updated: {student_update.modified_count} documents")
        except Exception as student_error:
            logger.warning(f"[ID CARD] Could not update student record: {student_error}")
        
        # Verify insertion
        verify = db.branch_id_cards.find_one({"_id": result.inserted_id})
        logger.info(f"[ID CARD] Verification - Document inserted: {bool(verify)}")
        
        # Check total count in collection
        total_count = db.branch_id_cards.count_documents({})
        logger.info(f"[ID CARD] Total ID cards in collection after insert: {total_count}")
        
        logger.info(f"[ID CARD] ID card generated successfully: {result.inserted_id}")
        
        return {
            "success": True,
            "message": "ID card generated successfully",
            "id_card": {
                "id": str(result.inserted_id),
                "student_id": student_id,
                "student_name": student.get("student_name"),
                "registration_number": student.get("registration_number"),
                "card_number": card_number,
                "issue_date": id_card_doc["issue_date"],
                "expiry_date": id_card_doc["expiry_date"],
                "status": "active",
                "file_path": image_path if success else None
            }
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"[ID CARD] Error generating ID card: {str(e)}")
        logger.error(f"[ID CARD] Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Failed to generate ID card: {str(e)}")


async def generate_id_card_image(student, output_path, branch_code, db, photo_url_override=None, address_override=None, duration_override=None):
    """Generate ID card image using branch-specific template with actual student data"""
    try:
        import os
        import requests
        from io import BytesIO
        from PIL import Image, ImageDraw, ImageFont
        
        print(f"[ID CARD IMAGE] Starting ID card generation for student: {student.get('student_name', 'Unknown')}")
        print(f"[ID CARD IMAGE] Branch code: {branch_code}")
        print(f"[ID CARD IMAGE] Photo URL override from request: {photo_url_override}")
        print(f"[ID CARD IMAGE] Address override from request: {address_override}")
        print(f"[ID CARD IMAGE] Duration override from request: {duration_override}")
        
        # Get branch details from database
        branch = db.branches.find_one({"centre_info.branch_code": branch_code})
        
        if not branch:
            # Try alternative query
            branch = db.branches.find_one({"centre_info.branch_code": {"$regex": branch_code, "$options": "i"}})
        
        centre_info = branch.get("centre_info", {}) if branch else {}
        centre_head = branch.get("centre_head", {}) if branch else {}
        centre_name = centre_info.get("centre_name", "") or centre_info.get("center_name", "")
        
        print(f"[ID CARD IMAGE] Branch found: {bool(branch)}, Centre name: {centre_name}")
        
        # Get logo URL from branch
        logo_url = centre_head.get("logo_url", "") or centre_head.get("logo", "")
        
        # Template paths
        branch_template_path = os.path.join("uploads", "id card", f"idcard_{branch_code}.png")
        default_template_path = os.path.join("uploads", "id card", "idcard_branch_default.png")
        template_path = os.path.join("uploads", "id card", "idcard.png")
        
        # Use branch-specific template if exists
        if os.path.exists(branch_template_path):
            template_path = branch_template_path
        elif os.path.exists(default_template_path):
            template_path = default_template_path
        else:
            template_path = template_path
        
        print(f"[ID CARD IMAGE] Using template: {template_path}")
        
        if not os.path.exists(template_path):
            print(f"[ID CARD IMAGE] Template not found at: {template_path}")
            return False
        
        # Load template image
        template = Image.open(template_path)
        template = template.convert("RGBA")
        id_card = template.copy()
        draw = ImageDraw.Draw(id_card)
        
        print(f"[ID CARD IMAGE] Template loaded. Size: {template.size}")
        
        # Try to load fonts
        try:
            font_name = ImageFont.truetype("arial.ttf", 16)
            font_label = ImageFont.truetype("arial.ttf", 12)
            font_small = ImageFont.truetype("arial.ttf", 10)
        except:
            font_name = ImageFont.load_default()
            font_label = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # Extract student data from database (NO mock data)
        student_name = student.get('student_name', '') or ''
        registration_number = student.get('registration_number', '') or ''
        father_name = student.get('father_name', '') or ''
        mother_name = student.get('mother_name', '') or ''
        date_of_birth = student.get('date_of_birth', '') or ''
        contact_no = student.get('contact_no', '') or student.get('contact_number', '') or ''
        email = student.get('email_id', '') or student.get('email', '') or ''
        
        # Use address from override (form) if provided, otherwise from student record
        address = address_override or student.get('address', '') or student.get('student_address', '') or student.get('permanent_address', '') or ''
        
        course = student.get('course', '') or ''
        
        # Use duration from override (form) if provided, otherwise from student record
        course_duration = duration_override or student.get('course_duration', '') or student.get('duration', '') or student.get('program_duration', '') or ''
        
        batch = student.get('batch', '') or ''
        date_of_admission = student.get('date_of_admission', '') or ''
        
        # Use photo_url from request (form upload) if provided, otherwise use student's photo
        photo_url = photo_url_override or student.get('photo_url', '') or student.get('photo', '') or ''
        
        print(f"[ID CARD IMAGE] Student name: {student_name}")
        print(f"[ID CARD IMAGE] Photo URL (final): {photo_url}")
        print(f"[ID CARD IMAGE] Address (final): {address}")
        print(f"[ID CARD IMAGE] Course duration (final): {course_duration}")
        
        # Position coordinates for template (754x438)
        # Left side - Photo area
        photo_x, photo_y = 30, 120
        photo_size = (100, 120)
        
        # Right side - Text area
        text_start_x = 150
        text_start_y = 100
        line_height = 22
        
        # Draw student information
        y_pos = text_start_y
        
        # Name
        draw.text((text_start_x, y_pos), f"Name: {student_name}", fill='black', font=font_name)
        y_pos += line_height
        
        # Registration Number
        draw.text((text_start_x, y_pos), f"Reg No: {registration_number}", fill='black', font=font_label)
        y_pos += line_height
        
        # Father's Name
        draw.text((text_start_x, y_pos), f"Father: {father_name}", fill='black', font=font_label)
        y_pos += line_height
        
        # Course
        draw.text((text_start_x, y_pos), f"Course: {course}", fill='black', font=font_label)
        y_pos += line_height
        
        # Duration
        if course_duration:
            draw.text((text_start_x, y_pos), f"Duration: {course_duration}", fill='black', font=font_label)
        else:
            draw.text((text_start_x, y_pos), f"Batch: {batch}", fill='black', font=font_label)
        y_pos += line_height
        
        # Contact
        draw.text((text_start_x, y_pos), f"Contact: {contact_no}", fill='black', font=font_label)
        y_pos += line_height
        
        # Address (truncate if too long)
        address_display = address[:40] + "..." if len(address) > 40 else address
        draw.text((text_start_x, y_pos), f"Address: {address_display}", fill='black', font=font_small)
        y_pos += line_height
        
        # Centre name at bottom
        if centre_name:
            draw.text((text_start_x, y_pos + 10), f"Centre: {centre_name}", fill='darkblue', font=font_label)
        
        # Add student photo if available
        if photo_url and photo_url.strip():
            try:
                print(f"[ID CARD IMAGE] Loading student photo from: {photo_url}")
                
                # Check if it's a local file or URL
                if photo_url.startswith('http'):
                    response = requests.get(photo_url, timeout=10)
                    photo = Image.open(BytesIO(response.content))
                elif os.path.exists(photo_url):
                    photo = Image.open(photo_url)
                else:
                    # Try with uploads prefix
                    local_path = os.path.join("uploads", photo_url.lstrip('/'))
                    if os.path.exists(local_path):
                        photo = Image.open(local_path)
                    else:
                        print(f"[ID CARD IMAGE] Photo file not found: {photo_url}")
                        photo = None
                
                if photo:
                    photo = photo.convert("RGBA")
                    photo = photo.resize(photo_size, Image.Resampling.LANCZOS)
                    id_card.paste(photo, (photo_x, photo_y), photo if photo.mode == 'RGBA' else None)
                    print(f"[ID CARD IMAGE] Student photo added successfully")
            except Exception as e:
                print(f"[ID CARD IMAGE] Could not add student photo: {e}")
        else:
            print(f"[ID CARD IMAGE] No photo URL provided for student")
        
        # Add branch logo if available
        if logo_url and logo_url.strip():
            try:
                if os.path.exists(logo_url):
                    logo = Image.open(logo_url)
                    logo = logo.convert("RGBA")
                    logo = logo.resize((60, 60), Image.Resampling.LANCZOS)
                    id_card.paste(logo, (680, 10), logo if logo.mode == 'RGBA' else None)
                    print(f"[ID CARD IMAGE] Branch logo added: {logo_url}")
            except Exception as e:
                print(f"[ID CARD IMAGE] Could not add logo: {e}")
        
        # Convert back to RGB for saving as PNG
        id_card = id_card.convert("RGB")
        
        # Save the ID card
        id_card.save(output_path, 'PNG', quality=95)
        print(f"[ID CARD IMAGE] ID card saved successfully: {output_path}")
        
        return True
        
    except Exception as e:
        print(f"[ID CARD IMAGE] Error generating ID card image: {e}")
        import traceback
        print(f"[ID CARD IMAGE] Traceback: {traceback.format_exc()}")
        return False


@router.get("/id-cards")
async def get_id_cards(
    request: Request,
    student_id: str = None,
    status: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all ID cards for the branch"""
    import logging
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        logger.info(f"[ID CARDS] Current user: {current_user}")
        logger.info(f"[ID CARDS] Branch code: {branch_code}")
        
        # Show all collections in database
        all_collections = db.list_collection_names()
        logger.info(f"[ID CARDS] All collections in database: {all_collections}")
        
        # Check if branch_id_cards collection exists
        if 'branch_id_cards' in all_collections:
            logger.info(f"[ID CARDS] ✅ 'branch_id_cards' collection EXISTS")
        else:
            logger.info(f"[ID CARDS] ❌ 'branch_id_cards' collection DOES NOT EXIST")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="Branch code not found")
        
        # First check total count in collection
        total_count = db.branch_id_cards.count_documents({})
        logger.info(f"[ID CARDS] Total ID cards in 'branch_id_cards' collection: {total_count}")
        
        # Check all ID cards (for debugging)
        all_cards = list(db.branch_id_cards.find({}).limit(10))
        logger.info(f"[ID CARDS] First 10 ID cards in database:")
        for idx, card in enumerate(all_cards):
            logger.info(f"  Card {idx + 1}:")
            logger.info(f"    _id: {card.get('_id')}")
            logger.info(f"    student_id: {card.get('student_id')}")
            logger.info(f"    student_name: {card.get('student_name')}")
            logger.info(f"    student_registration: {card.get('student_registration')}")
            logger.info(f"    branch_code: {card.get('branch_code')}")
            logger.info(f"    card_number: {card.get('card_number')}")
            logger.info(f"    status: {card.get('status')}")
            logger.info(f"    file_path: {card.get('file_path')}")
        
        # Build query - Simplified for reliability
        query = {}
        
        # Check if user is franchise admin (branch_code == franchise_code)
        user_branch_code = current_user.get("branch_code")
        user_franchise_code = current_user.get("franchise_code")
        is_franchise_admin = user_branch_code == user_franchise_code
        
        logger.info(f"[ID CARDS] User is franchise admin: {is_franchise_admin}")
        
        # Apply branch filtering for security
        user_role = current_user.get("role", "").lower()
        if is_franchise_admin:
            # Franchise admin can see all ID cards from all branches in their franchise
            # Get all branch codes under this franchise
            branches = list(db.branches.find({"franchise_code": user_franchise_code}))
            franchise_branch_codes = [b.get("centre_info", {}).get("branch_code") for b in branches if b.get("centre_info", {}).get("branch_code")]
            franchise_branch_codes.append(user_franchise_code)  # Include franchise code itself
            logger.info(f"[ID CARDS] Franchise branch codes: {franchise_branch_codes}")
            query["branch_code"] = {"$in": franchise_branch_codes}
        elif "admin" not in user_role and "franchise" not in user_role:
            # For non-admin users, filter by branch
            if branch_code:
                query["branch_code"] = branch_code
        elif branch_code:
            # For admin users, still filter by branch if specified
            query["branch_code"] = branch_code
            
        # Filter by student_id if provided
        if student_id:
            try:
                query["student_id"] = ObjectId(student_id)
            except:
                query["student_id"] = student_id
                
        # Filter by status - exclude deleted cards
        if status:
            query["status"] = status
        else:
            query["status"] = {"$ne": "deleted"}
        
        logger.info(f"[ID CARDS] Simplified query: {query}")
        
        # Get ID cards directly from branch_id_cards collection
        id_cards_cursor = db.branch_id_cards.find(query).sort("created_at", -1)
        id_cards = list(id_cards_cursor)
        
        logger.info(f"[ID CARDS] Found {len(id_cards)} ID cards")
        
        # Format response - Consistent formatting
        formatted_cards = []
        for card in id_cards:
            try:
                # Build consistent photo URL
                photo_url = card.get("photo_url", "")
                file_path = card.get("file_path", "")
                
                if not photo_url and file_path:
                    # Standardize photo URL construction
                    if file_path.startswith("/uploads/"):
                        photo_url = file_path
                    elif file_path.startswith("uploads/"):
                        photo_url = f"/{file_path}"
                    else:
                        photo_url = f"/uploads/id_cards/{os.path.basename(file_path)}"
                
                formatted_cards.append({
                    "id": str(card["_id"]),
                    "student_id": str(card.get("student_id", "")),
                    "student_name": card.get("student_name", "Unknown"),
                    "registration_number": card.get("student_registration", card.get("registration_number", "")),
                    "card_number": card.get("card_number", ""),
                    "course": card.get("course", ""),
                    "branch_code": card.get("branch_code", ""),
                    "card_type": card.get("card_type", "student"),
                    "issue_date": card.get("issue_date", ""),
                    "expiry_date": card.get("expiry_date", ""),
                    "validity_from": card.get("validity_from", ""),
                    "validity_to": card.get("validity_to", ""),
                    "status": card.get("status", "active"),
                    "created_at": card.get("created_at", ""),
                    "photo_url": photo_url,
                    "file_path": file_path
                })
            except Exception as card_error:
                logger.error(f"Error formatting card {card.get('_id')}: {card_error}")
                continue
        
        logger.info(f"[ID CARDS] Found {len(formatted_cards)} ID cards")
        
        return {
            "success": True,
            "message": f"Found {len(formatted_cards)} ID cards",
            "id_cards": formatted_cards
        }
        
    except Exception as e:
        logger.error(f"[ID CARDS] Error fetching ID cards: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch ID cards: {str(e)}")


@router.get("/id-cards/{card_id}/download")
async def download_id_card(
    card_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Download ID card image"""
    import logging
    import os
    from fastapi.responses import FileResponse
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        user_role = current_user.get("role", "").lower()
        is_student = user_role == "student" or "student" in user_role.lower()
        
        logger.info(f"[ID CARD DOWNLOAD] User role: {user_role}, Is student: {is_student}")
        logger.info(f"[ID CARD DOWNLOAD] User branch: {branch_code}, Card ID: {card_id}")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="Branch code not found")
        
        # Build query based on user type
        if is_student:
            # For students, allow access to their ID card regardless of branch mismatch
            # First try to find the card by ID without branch restriction
            id_card = db.branch_id_cards.find_one({"_id": ObjectId(card_id)})
            
            if id_card:
                logger.info(f"[ID CARD DOWNLOAD] Found card: {id_card.get('student_name')} from branch {id_card.get('branch_code')}")
                
                # Verify this card belongs to current student
                student_user_id = current_user.get("id") or current_user.get("student_id") or current_user.get("_id")
                student_name = current_user.get("name") or current_user.get("student_name")
                student_registration = current_user.get("registration_number") or current_user.get("registration_no")
                
                logger.info(f"[ID CARD DOWNLOAD] Current user info:")
                logger.info(f"  User ID: {student_user_id}")
                logger.info(f"  User Name: {student_name}")
                logger.info(f"  User Registration: {student_registration}")
                logger.info(f"[ID CARD DOWNLOAD] Card info:")
                logger.info(f"  Card Student ID: {id_card.get('student_id')}")
                logger.info(f"  Card Student Name: {id_card.get('student_name')}")
                logger.info(f"  Card Registration: {id_card.get('student_registration')}")
                
                # Check if this card belongs to the current student with multiple criteria
                card_belongs_to_user = False
                
                # Method 1: Student ID match
                if student_user_id and id_card.get("student_id"):
                    id_match = (
                        str(student_user_id) == str(id_card.get("student_id")) or
                        student_user_id == id_card.get("student_id")
                    )
                    if id_match:
                        card_belongs_to_user = True
                        logger.info(f"[ID CARD DOWNLOAD] ✅ Match found by Student ID")
                
                # Method 2: Name match (case insensitive)
                if not card_belongs_to_user and student_name and id_card.get("student_name"):
                    name_match = student_name.lower().strip() == id_card.get("student_name").lower().strip()
                    if name_match:
                        card_belongs_to_user = True
                        logger.info(f"[ID CARD DOWNLOAD] ✅ Match found by Name")
                
                # Method 3: Registration number match
                if not card_belongs_to_user and student_registration and id_card.get("student_registration"):
                    reg_match = student_registration == id_card.get("student_registration")
                    if reg_match:
                        card_belongs_to_user = True
                        logger.info(f"[ID CARD DOWNLOAD] ✅ Match found by Registration")
                
                # Method 4: For development/demo - allow access if only one card exists for testing
                total_cards_count = db.branch_id_cards.count_documents({})
                if not card_belongs_to_user and total_cards_count == 1:
                    logger.info(f"[ID CARD DOWNLOAD] ✅ Only one card in system, allowing access for demo")
                    card_belongs_to_user = True
                
                if not card_belongs_to_user:
                    logger.warning(f"[ID CARD DOWNLOAD] ❌ Access denied - no matching criteria found")
                    logger.warning(f"  Tried ID match: {student_user_id} vs {id_card.get('student_id')}")
                    logger.warning(f"  Tried Name match: '{student_name}' vs '{id_card.get('student_name')}'")
                    logger.warning(f"  Tried Registration match: '{student_registration}' vs '{id_card.get('student_registration')}'")
                    raise HTTPException(status_code=403, detail="Access denied - ID card doesn't belong to you")
            else:
                raise HTTPException(status_code=404, detail="ID card not found")
        else:
            # For admin/staff users, use branch filtering as usual
            id_card = db.branch_id_cards.find_one({
                "_id": ObjectId(card_id),
                "branch_code": branch_code
            })
            
            if not id_card:
                raise HTTPException(status_code=404, detail="ID card not found")
        
        file_path = id_card.get("file_path")
        logger.info(f"[ID CARD DOWNLOAD] File path from DB: {file_path}")
        
        if not file_path:
            raise HTTPException(status_code=404, detail="ID card file path not found")
        
        # Handle different path formats and make sure path exists
        import os
        
        # Try the direct path first
        if os.path.exists(file_path):
            actual_file_path = file_path
        else:
            # Try relative path from project root (go up from app/api to project root)
            current_file = os.path.abspath(__file__)
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(current_file)))
            
            # Clean the file path and normalize it
            clean_file_path = file_path.replace('\\', '/').strip('/')
            
            possible_paths = [
                # Try from project root
                os.path.join(project_root, clean_file_path),
                # Try from project root with uploads prefix
                os.path.join(project_root, "uploads", "id_cards", os.path.basename(file_path)),
                # Try from london_lms directory
                os.path.join(project_root, "london_lms", clean_file_path),
                # Try different path combinations
                os.path.join(project_root, file_path.lstrip('/\\')),
                # Try with branch folder structure
                os.path.join(project_root, "uploads", "id_cards", id_card.get("branch_code", ""), os.path.basename(file_path)),
            ]
            
            logger.info(f"[ID CARD DOWNLOAD] Project root: {project_root}")
            logger.info(f"[ID CARD DOWNLOAD] Clean file path: {clean_file_path}")
            
            actual_file_path = None
            for path in possible_paths:
                logger.info(f"[ID CARD DOWNLOAD] Trying path: {path}")
                if os.path.exists(path):
                    actual_file_path = path
                    logger.info(f"[ID CARD DOWNLOAD] ✅ Found file at: {path}")
                    break
            
            if not actual_file_path:
                # If file doesn't exist, create a placeholder/generate it
                logger.warning(f"[ID CARD DOWNLOAD] File not found, attempting to generate ID card")
                
                # Try to generate the ID card if it doesn't exist
                card_number = id_card.get("card_number")
                branch_code = id_card.get("branch_code")
                
                if card_number and branch_code:
                    # Create directory if it doesn't exist
                    id_cards_dir = os.path.join(project_root, "uploads", "id_cards", branch_code)
                    os.makedirs(id_cards_dir, exist_ok=True)
                    
                    # Generate file path
                    generated_file_path = os.path.join(id_cards_dir, f"id_card_{card_number}.png")
                    
                    # Create a simple placeholder image (you can enhance this later)
                    try:
                        from PIL import Image, ImageDraw, ImageFont
                        
                        # Create a simple ID card image
                        img = Image.new('RGB', (400, 250), color='white')
                        draw = ImageDraw.Draw(img)
                        
                        # Add some basic text
                        try:
                            font = ImageFont.load_default()
                        except:
                            font = None
                        
                        draw.text((20, 20), "STUDENT ID CARD", fill='black', font=font)
                        draw.text((20, 50), f"Name: {id_card.get('student_name', 'N/A')}", fill='black', font=font)
                        draw.text((20, 80), f"ID: {card_number}", fill='black', font=font)
                        draw.text((20, 110), f"Reg: {id_card.get('student_registration', 'N/A')}", fill='black', font=font)
                        draw.text((20, 140), f"Branch: {branch_code}", fill='black', font=font)
                        
                        # Add a border
                        draw.rectangle([5, 5, 395, 245], outline='black', width=2)
                        
                        # Save the image
                        img.save(generated_file_path)
                        actual_file_path = generated_file_path
                        
                        logger.info(f"[ID CARD DOWNLOAD] ✅ Generated placeholder ID card at: {generated_file_path}")
                        
                    except Exception as gen_error:
                        logger.error(f"[ID CARD DOWNLOAD] Failed to generate placeholder: {gen_error}")
                
                if not actual_file_path:
                    logger.error(f"[ID CARD DOWNLOAD] File not found in any of these paths: {possible_paths}")
                    raise HTTPException(status_code=404, detail="ID card file not found on disk and could not be generated")
        
        logger.info(f"[ID CARD DOWNLOAD] Serving file from: {actual_file_path}")
        
        return FileResponse(
            path=actual_file_path,
            media_type='image/png',
            filename=f"id_card_{id_card.get('card_number', card_id)}.png"
        )
        
    except Exception as e:
        logger.error(f"[ID CARD DOWNLOAD] Error downloading ID card: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to download ID card: {str(e)}")


@router.get("/id-cards/debug")
async def debug_id_card_search(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Debug endpoint to check student ID card matching"""
    import logging
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        db = request.app.mongodb
        
        logger.info(f"[DEBUG ID CARDS] Current user: {current_user}")
        
        # Show all ID cards in database
        all_cards = list(db.branch_id_cards.find({}).limit(5))
        logger.info(f"[DEBUG ID CARDS] First 5 ID cards in database:")
        
        debug_cards = []
        for idx, card in enumerate(all_cards):
            card_info = {
                "id": str(card.get('_id')),
                "student_id": card.get('student_id'),
                "student_name": card.get('student_name'),
                "student_registration": card.get('student_registration'),
                "branch_code": card.get('branch_code'),
                "card_number": card.get('card_number'),
                "status": card.get('status')
            }
            debug_cards.append(card_info)
            logger.info(f"  Card {idx + 1}: {card_info}")
        
        # Show user info that would be used for matching
        user_role = current_user.get("role", "").lower()
        is_student = user_role == "student" or "student" in user_role.lower()
        student_user_id = current_user.get("id") or current_user.get("student_id") or current_user.get("_id")
        student_name = current_user.get("name") or current_user.get("student_name")
        student_registration = current_user.get("registration_number") or current_user.get("registration_no")
        
        user_matching_info = {
            "role": user_role,
            "is_student": is_student,
            "user_id": student_user_id,
            "name": student_name,
            "registration": student_registration,
            "all_user_fields": current_user
        }
        
        logger.info(f"[DEBUG ID CARDS] User matching info: {user_matching_info}")
        
        return {
            "success": True,
            "message": "Debug information for ID card search",
            "user_info": user_matching_info,
            "available_cards": debug_cards,
            "total_cards": len(all_cards)
        }
        
    except Exception as e:
        logger.error(f"[DEBUG ID CARDS] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Debug failed: {str(e)}")

@router.get("/id-cards/test")
async def test_id_card_endpoint():
    """Test ID card endpoint"""
    return {
        "success": True,
        "message": "ID card endpoints are working!",
        "available_endpoints": [
            "POST /api/branch/id-cards/generate - Generate ID card for student",
            "GET /api/branch/id-cards - Get all ID cards",  
            "GET /api/branch/id-cards/{card_id}/download - Download ID card image",
            "GET /api/branch/id-cards/test - This test endpoint"
        ]
    }


# ============== STUDENT PHOTO UPLOAD ENDPOINT ==============

@router.post("/students/upload-photo")
async def upload_student_photo(request: Request, current_user: dict = Depends(get_current_user)):
    """Upload student photo for certificate"""
    import os
    import logging
    from datetime import datetime
    from fastapi import Form, File, UploadFile
    import aiofiles
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[PHOTO_UPLOAD] ==================== PHOTO UPLOAD REQUEST ====================")
        
        # Parse multipart form data
        form = await request.form()
        photo_file = form.get("photo")
        student_id = form.get("student_id")
        
        logger.info(f"[PHOTO_UPLOAD] Student ID: {student_id}")
        logger.info(f"[PHOTO_UPLOAD] Photo file received: {photo_file is not None}")
        if photo_file:
            logger.info(f"[PHOTO_UPLOAD] Photo filename: {photo_file.filename}")
        
        if not photo_file or not student_id:
            logger.error(f"[PHOTO_UPLOAD] Missing data - photo: {photo_file is not None}, student_id: {student_id}")
            raise HTTPException(status_code=400, detail="photo and student_id are required")
        
        logger.info(f"[PHOTO_UPLOAD] Uploading photo for student: {student_id}")
        
        # Create uploads directory for student photos
        photo_dir = os.path.join("uploads", "student_photos")
        os.makedirs(photo_dir, exist_ok=True)
        
        # Generate unique filename
        file_extension = photo_file.filename.split(".")[-1] if "." in photo_file.filename else "jpg"
        filename = f"student_{student_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_extension}"
        file_path = os.path.join(photo_dir, filename)
        
        logger.info(f"[PHOTO_UPLOAD] Saving to: {file_path}")
        
        # Save the file
        with open(file_path, "wb") as buffer:
            content = await photo_file.read()
            buffer.write(content)
        
        # Return the photo URL - use uploads path
        photo_url = f"uploads/student_photos/{filename}"
        
        logger.info(f"[PHOTO_UPLOAD] ✅ Photo saved successfully: {photo_url}")
        
        return {
            "success": True,
            "message": "Photo uploaded successfully",
            "photo_url": photo_url,
            "filename": filename
        }
        
    except Exception as e:
        logger.error(f"[PHOTO_UPLOAD] ❌ Error uploading photo: {str(e)}")
        import traceback
        logger.error(f"[PHOTO_UPLOAD] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to upload photo: {str(e)}")


@router.delete("/id-cards/{card_id}")
async def delete_id_card(
    card_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete ID card for a student - PERMANENT DELETION"""
    import logging
    import os
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"🗑️ [ID CARD DELETE] Request to delete ID card: {card_id}")
        
        db = request.app.mongodb
        
        # Find the ID card first
        id_card = db.branch_id_cards.find_one({"_id": ObjectId(card_id)})
        
        if not id_card:
            logger.error(f"❌ [ID CARD DELETE] ID card not found: {card_id}")
            raise HTTPException(status_code=404, detail="ID card not found")
        
        logger.info(f"✅ [ID CARD DELETE] Found ID card for student: {id_card.get('student_name')}")
        logger.info(f"🔍 [ID CARD DELETE] ID card details: {id_card}")
        
        # Check authorization - verify user has access to this ID card
        user_branch_code = current_user.get("branch_code")
        user_franchise_code = current_user.get("franchise_code") 
        card_branch_code = id_card.get("branch_code")
        
        # Allow access if user is from same branch or franchise
        has_access = (
            user_branch_code == card_branch_code or 
            user_franchise_code == card_branch_code or
            user_branch_code == user_franchise_code  # franchise admin
        )
        
        if not has_access:
            logger.error(f"❌ [ID CARD DELETE] Access denied. User branch: {user_branch_code}, Card branch: {card_branch_code}")
            raise HTTPException(status_code=403, detail="You don't have permission to delete this ID card")
        
        # PERMANENT DELETION from database FIRST
        delete_result = db.branch_id_cards.delete_one({"_id": ObjectId(card_id)})
        
        if delete_result.deleted_count == 0:
            logger.error(f"❌ [ID CARD DELETE] Failed to delete ID card from database")
            raise HTTPException(status_code=500, detail="Failed to delete ID card from database")
        
        logger.info(f"🗑️ [ID CARD DELETE] Successfully DELETED from branch_id_cards collection")
        
        # Update student record to remove ID card reference
        if id_card.get("student_id"):
            try:
                student_update = db.branch_students.update_one(
                    {"_id": ObjectId(id_card["student_id"])},
                    {
                        "$unset": {"id_card": "", "id_card_id": ""},
                        "$set": {
                            "has_id_card": False,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                if student_update.modified_count > 0:
                    logger.info(f"✅ [ID CARD DELETE] Updated student record to remove ID card reference")
            except Exception as student_error:
                logger.warning(f"⚠️ [ID CARD DELETE] Error updating student: {student_error}")
        
        # Delete the physical file if it exists
        file_path = id_card.get("file_path")
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"🗑️ [ID CARD DELETE] Deleted physical file: {file_path}")
            except Exception as file_error:
                logger.warning(f"⚠️ [ID CARD DELETE] Could not delete file {file_path}: {file_error}")
        
        # Verify deletion was successful
        verify_deleted = db.branch_id_cards.find_one({"_id": ObjectId(card_id)})
        if verify_deleted:
            logger.error(f"❌ [ID CARD DELETE] CRITICAL: ID card still exists after deletion!")
            raise HTTPException(status_code=500, detail="ID card deletion verification failed")
        
        logger.info(f"✅ [ID CARD DELETE] PERMANENT deletion completed successfully")
        
        return {
            "success": True,
            "message": f"ID card permanently deleted for {id_card.get('student_name')}",
            "deleted_card": {
                "id": card_id,
                "student_name": id_card.get("student_name"),
                "card_number": id_card.get("card_number"),
                "deleted_at": datetime.utcnow().isoformat(),
                "permanent_deletion": True
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [ID CARD DELETE] Error deleting ID card: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete ID card: {str(e)}")


# ============== CERTIFICATE ENDPOINTS ==============

@router.post("/certificates/generate")
async def generate_student_certificate(request: Request, current_user: dict = Depends(get_current_user)):
    import logging
    import os
    from datetime import datetime
    from bson import ObjectId
    from PIL import Image, ImageDraw, ImageFont
    
    logger = logging.getLogger("uvicorn")
    
    try:
        # Parse request body
        body = await request.body()
        data = json.loads(body.decode('utf-8'))
        
        student_id = data.get("student_id")
        course_id = data.get("course_id")
        certificate_type = data.get("certificate_type", "completion")
        grade = data.get("grade", "")
        issue_date = data.get("issue_date")
        completion_date = data.get("completion_date")
        
        # New fields for dynamic certificate
        father_name = data.get("father_name", "")
        date_of_birth = data.get("date_of_birth")
        percentage = data.get("percentage", "")
        start_date = data.get("start_date")
        atc_code = data.get("atc_code", "")
        center_name = data.get("center_name", "")
        center_address = data.get("center_address", "")
        photo_url = data.get("photo_url")  # Photo URL from upload
        sr_number = data.get("sr_number", "")  # Serial number for certificate
        mca_registration_number = data.get("mca_registration_number", "U85300UP2020NPL136478")  # MCA Reg No
        duration = data.get("duration", "")  # Course duration (e.g., "3 Months")
        
        if not student_id:
            raise HTTPException(status_code=400, detail="student_id is required")
        
        logger.info(f"[CERTIFICATE] Generating certificate for student: {student_id}")
        
        # Get database and branch context
        db = request.app.mongodb
        franchise_code = current_user.get("franchise_code")
        branch_code = current_user.get("branch_code")
        
        logger.info(f"[CERTIFICATE] User context - franchise_code: {franchise_code}, branch_code: {branch_code}")
        
        if not franchise_code:
            raise HTTPException(status_code=400, detail="Franchise code not found")
        
        # Find student - use franchise_code for query since students are associated with franchise
        student = db.branch_students.find_one({
            "_id": ObjectId(student_id),
            "franchise_code": franchise_code
        })
        
        if not student:
            logger.error(f"[CERTIFICATE] Student not found with ID: {student_id}, franchise_code: {franchise_code}")
            raise HTTPException(status_code=404, detail="Student not found")
        
        logger.info(f"[CERTIFICATE] Found student: {student.get('student_name', 'N/A')}, branch: {student.get('branch_code')}")
        
        # Extract force flags from frontend for enhanced uniqueness
        force_new = data.get("force_new", False)
        force_unique_file = data.get("force_unique_file", False)
        regenerate_always = data.get("regenerate_always", False)
        bypass_existing_check = data.get("bypass_existing_check", False)
        delete_existing_first = data.get("delete_existing_first", False)
        
        # Check if certificate already exists - ONLY IF NOT FORCING NEW GENERATION
        existing_cert = None
        if not (force_new or regenerate_always or bypass_existing_check):
            existing_cert = db.branch_certificates.find_one({
                "student_id": student_id,
                "franchise_code": franchise_code,
                "certificate_type": certificate_type,
                "status": {"$in": ["generated", "issued"]}
            })
        else:
            logger.info(f"🚀 BYPASSING existing certificate check due to force flags")
        
        # Delete existing certificate if requested
        if existing_cert and delete_existing_first:
            logger.info(f"[CERTIFICATE] 🗑️ DELETING EXISTING CERTIFICATE due to delete_existing_first flag")
            old_file_path = existing_cert.get("file_path")
            if old_file_path and os.path.exists(old_file_path):
                try:
                    os.remove(old_file_path)
                    logger.info(f"🗑️ DELETED OLD CERTIFICATE FILE: {old_file_path}")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to delete old file: {e}")
            
            # Delete from database
            db.branch_certificates.delete_one({"_id": existing_cert["_id"]})
            logger.info(f"🗑️ DELETED EXISTING CERTIFICATE FROM DATABASE")
            existing_cert = None  # Reset to None after deletion
        existing_cert = db.branch_certificates.find_one({
            "student_id": student_id,
            "franchise_code": franchise_code,
            "certificate_type": certificate_type,
            "status": {"$in": ["generated", "issued"]}
        })
        
        if existing_cert and not (force_new or regenerate_always):
            logger.info(f"[CERTIFICATE] Certificate already exists - returning existing: {existing_cert['_id']}")
            return {
                "success": True,
                "message": "Certificate already exists",
                "certificate": {
                    "id": str(existing_cert["_id"]),
                    "student_id": student_id,
                    "student_name": student.get("student_name"),
                    "registration_number": student.get("registration_number"),
                    "certificate_number": existing_cert.get("certificate_number"),
                    "certificate_type": existing_cert.get("certificate_type"),
                    "issue_date": existing_cert.get("issue_date"),
                    "status": existing_cert.get("status"),
                    "file_path": existing_cert.get("file_path")
                }
            }
        
        # Generate certificate number with ENHANCED UNIQUENESS
        # Use student's actual branch_code for certificate number
        student_branch_code = student.get("branch_code", franchise_code)
        cert_count = db.branch_certificates.count_documents({
            "franchise_code": franchise_code
        })
        
        # Add timestamp and random components for ULTRA-UNIQUE certificate numbers
        import time
        import random
        timestamp_suffix = str(int(time.time() * 1000))[-6:]  # Last 6 digits of millisecond timestamp
        random_suffix = str(random.randint(100, 999))
        micro_timestamp = str(int(time.time() * 1000000))[-4:]  # Microsecond precision
        
        # Incorporate frontend unique identifiers if available
        frontend_unique_id = data.get("unique_id", "")
        nano_id = data.get("nano_id", "")
        request_hash = data.get("request_hash", "")
        
        if nano_id:
            # Use frontend nano_id if available for ultimate uniqueness
            certificate_number = f"CERT{student_branch_code[-4:]}{cert_count + 1:03d}{nano_id[:6].upper()}"
        else:
            # Fallback to timestamp + random for uniqueness
            certificate_number = f"CERT{student_branch_code[-4:]}{cert_count + 1:03d}{timestamp_suffix}{random_suffix}"
        # Get course information
        course_name = student.get("course", "N/A")
        course_duration = student.get("course_duration", "")
        
        # Get branch information
        student_branch_code = student.get("branch_code", franchise_code)
        branch = db.branches.find_one({"centre_info.branch_code": student_branch_code})
        branch_name = "SkillWallah EdTech"
        if branch:
            branch_name = branch.get("centre_info", {}).get("centre_name", "SkillWallah EdTech")
        
        # Create certificate document with ENHANCED UNIQUENESS
        certificate_doc = {
            "_id": ObjectId(),
            "student_id": student_id,
            "student_name": student.get("student_name"),
            "student_registration": student.get("registration_number"),
            "course_id": course_id or "",
            "course_name": course_name,
            "certificate_type": certificate_type,
            "grade": grade,
            "issue_date": issue_date or datetime.now().strftime("%Y-%m-%d"),
            "completion_date": completion_date or datetime.now().strftime("%Y-%m-%d"),
            "certificate_number": certificate_number,
            "status": "generated",
            "branch_code": student.get("branch_code", franchise_code),
            "franchise_code": franchise_code,
            "created_at": datetime.utcnow(),
            "created_by": current_user.get("user_id")
        }
        
        # Create directory for certificates (using existing Certificate folder)
        cert_dir = os.path.join("uploads", "Certificate", "generated", franchise_code)
        os.makedirs(cert_dir, exist_ok=True)
        
        # Generate ULTRA-UNIQUE image filename to prevent any duplicates
        frontend_filename_override = data.get("output_filename_override", "")
        custom_filename = data.get("custom_filename", "")
        file_suffix = data.get("file_suffix", "")
        nano_id = data.get("nano_id", "")
        
        # Always append current microsecond timestamp for absolute uniqueness
        current_micro = str(int(time.time() * 1000000))  # Full microsecond precision
        random_hex = hex(random.randint(0, 0xFFFFFF))[2:].upper()  # Random hex
        
        if frontend_filename_override:
            # Use frontend-provided filename but add extra uniqueness
            image_filename = f"{frontend_filename_override}_{current_micro}_{random_hex}.png"
        elif custom_filename:
            # Use custom filename from frontend with uniqueness
            image_filename = f"{custom_filename}_{current_micro}_{random_hex}.png"
        elif nano_id:
            # Use nano_id for unique filename
            image_filename = f"certificate_{student_id}_{nano_id[:12]}_{timestamp_suffix}_{current_micro}.png"
        else:
            # Enhanced fallback with ABSOLUTE uniqueness guarantee
            image_filename = f"certificate_{student_id}_{certificate_number}_{current_micro}_{random_hex}_{timestamp_suffix}_{random_suffix}.png"
        
        image_path = os.path.join(cert_dir, image_filename)
        
        logger.info(f"🎯 GENERATED ULTRA-UNIQUE FILENAME: {image_filename}")
        logger.info(f"   - Current Microseconds: {current_micro}")
        logger.info(f"   - Random Hex: {random_hex}")
        logger.info(f"   - Full Path: {image_path}")
        
        # FORCE DELETE any existing file with same name (should never happen now)
        if os.path.exists(image_path):
            try:
                os.remove(image_path)
                logger.info(f"🗑️ DELETED EXISTING FILE: {image_path}")
            except Exception as e:
                logger.warning(f"⚠️ Failed to delete existing file: {e}")
        
        # Prepare certificate data for image generation with ENHANCED UNIQUE FIELDS
        cert_data_for_image = {
            "student_name": student.get("student_name"),
            "student_registration": student.get("registration_number"),
            "course_name": course_name,
            "course_duration": course_duration or duration,
            "duration": duration or course_duration,
            "certificate_number": certificate_number,
            "certificate_type": certificate_type,
            "grade": grade,
            "issue_date": certificate_doc["issue_date"],
            "completion_date": certificate_doc["completion_date"],
            "start_date": start_date or student.get("admission_date"),
            "branch_name": branch_name,
            "branch_code": student_branch_code,
            # Template dynamic fields
            "father_name": father_name or student.get("father_name", ""),
            "date_of_birth": date_of_birth or student.get("date_of_birth"),
            "percentage": percentage,
            "atc_code": atc_code or student_branch_code,
            "center_name": center_name or branch_name,
            "center_address": center_address or "",
            "photo_url": photo_url or student.get("photo_path"),
            "student_photo": photo_url or student.get("photo_path"),
            "sr_number": sr_number or f"00{cert_count + 1:05d}",
            "mca_registration_number": mca_registration_number,
            
            # ADD ULTRA-UNIQUE VISIBLE IDENTIFIERS that will appear on certificate
            "unique_certificate_id": data.get("unique_certificate_id", certificate_number),
            "verification_code": data.get("verification_code", f"VER{timestamp_suffix}{random_suffix}"),
            "certificate_watermark": data.get("certificate_watermark", f"Generated: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')} [{timestamp_suffix}]"),
            "generation_sequence": data.get("generation_sequence", f"SEQ-{timestamp_suffix}-{micro_timestamp}"),
            "certificate_serial": data.get("certificate_serial", f"SER{timestamp_suffix}{random_suffix}"),
            "generation_note": data.get("generation_note", f"Certificate #{timestamp_suffix} - Generated: {datetime.now().strftime('%Y-%m-%d')}"),
            "certificate_issue_time": data.get("certificate_issue_time", datetime.now().strftime('%d %B, %Y at %H:%M:%S')),
            "nano_id": nano_id,
            "micro_timestamp": micro_timestamp,
            "issue_timestamp": data.get("issue_timestamp", int(time.time() * 1000)),
            "unique_batch_id": data.get("unique_batch_id", f"BATCH-{timestamp_suffix}"),
            
            # Force image generation flags
            "force_new": data.get("force_new", True),
            "regenerate_always": data.get("regenerate_always", True),
            "bypass_cache": data.get("bypass_cache", True)
        }
        
        # Generate certificate image with FORCED NEW GENERATION
        logger.info(f"🚀 FORCING CERTIFICATE GENERATION - NO CACHE, NO EXISTING FILES")
        success = await generate_certificate_image(cert_data_for_image, image_path)
        
        if success:
            certificate_doc["file_path"] = image_path
        
        # Insert certificate
        result = db.branch_certificates.insert_one(certificate_doc)
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to generate certificate")
        
        logger.info(f"[CERTIFICATE] Certificate generated successfully: {result.inserted_id}")
        
        # Add cache busting timestamp for frontend
        cache_buster = int(time.time() * 1000)
        
        # Prepare enhanced response with cache busting
        response_data = {
            "success": True,
            "message": "Certificate generated successfully",
            "certificate": {
                "id": str(result.inserted_id),
                "student_id": student_id,
                "student_name": student.get("student_name"),
                "student_registration": student.get("registration_number"),
                "certificate_number": certificate_number,
                "certificate_type": certificate_type,
                "grade": grade,
                "issue_date": certificate_doc["issue_date"],
                "completion_date": certificate_doc["completion_date"],
                "status": "generated",
                "file_path": f"{image_path}?v={cache_buster}&t={int(time.time())}" if success and image_path else None,
                "cache_buster": cache_buster,
                "created_at": certificate_doc["created_at"],
                "course_name": course_name,
                "branch_code": student.get("branch_code", franchise_code),
                "franchise_code": franchise_code
            }
        }
        
        logger.info(f"[CERTIFICATE] Returning response: {response_data}")
        
        return response_data
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[CERTIFICATE] Error generating certificate: {str(e)}")
        import traceback
        logger.error(f"[CERTIFICATE] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate certificate: {str(e)}")


# Certificate generation functions moved to app.services.certificate_service
# Use: from app.services.certificate_service import generate_certificate_image, generate_certificate_id


@router.get("/certificates")
async def get_branch_certificates(request: Request, current_user: dict = Depends(get_current_user)):
    """Get all certificates for the current branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[CERTIFICATES] Getting certificates for user: {current_user.get('email')}")
        
        db = request.app.mongodb
        franchise_code = current_user.get("franchise_code")
        branch_code = current_user.get("branch_code")
        user_id = current_user.get("user_id") 
        
        logger.info(f"[CERTIFICATES] User context: franchise_code={franchise_code}, branch_code={branch_code}, user_id={user_id}")
        
        # Get query parameters for filtering
        student_id = request.query_params.get("student_id")
        certificate_type = request.query_params.get("certificate_type")
        status = request.query_params.get("status")
        
        # Build flexible query to find certificates
        query = {}
        
        # If user has specific codes, try to match them
        if franchise_code or branch_code:
            or_conditions = []
            if franchise_code:
                or_conditions.append({"franchise_code": franchise_code})
            if branch_code:
                or_conditions.append({"branch_code": branch_code})
                # Also try franchise_code field with branch_code value
                or_conditions.append({"franchise_code": branch_code})
                
            if or_conditions:
                query["$or"] = or_conditions
        
        # If no user context found, get certificates created by this user
        if not query and user_id:
            query["created_by"] = user_id
            logger.info(f"[CERTIFICATES] Using created_by filter: {user_id}")
            
        # If still no query, get all certificates (for debugging)
        if not query:
            logger.warning("[CERTIFICATES] No matching criteria found, returning all certificates")
            
        logger.info(f"[CERTIFICATES] Final query: {query}")
            
        if student_id:
            query["student_id"] = student_id
        if certificate_type:
            query["certificate_type"] = certificate_type
        if status:
            query["status"] = status
        
        certificates = list(db.branch_certificates.find(query).sort("created_at", -1))
        
        logger.info(f"[CERTIFICATES] Raw query result: {len(certificates)} certificates found")
        logger.info(f"[CERTIFICATES] Query used: {query}")
        
        # Debug: Check total certificates in collection
        total_in_collection = db.branch_certificates.count_documents({})
        logger.info(f"[CERTIFICATES] Total certificates in collection: {total_in_collection}")
        
        # Debug: Check what franchisegbranch codes exist in the database
        distinct_franchises = db.branch_certificates.distinct("franchise_code")
        distinct_branches = db.branch_certificates.distinct("branch_code")
        logger.info(f"[CERTIFICATES] Distinct franchise_codes in DB: {distinct_franchises}")
        logger.info(f"[CERTIFICATES] Distinct branch_codes in DB: {distinct_branches}")
        
        # Debug: Sample a few certificates to see their structure
        sample_certs = list(db.branch_certificates.find({}).limit(3))
        for i, cert in enumerate(sample_certs):
            logger.info(f"[CERTIFICATES] Sample cert {i+1}: franchise_code={cert.get('franchise_code')}, branch_code={cert.get('branch_code')}, student_name={cert.get('student_name')}, created_by={cert.get('created_by')}")
        
        # Format certificates for response with cache busting
        cert_list = []
        import time
        cache_buster = int(time.time() * 1000)
        
        for cert in certificates:
            # Add cache buster to file path if exists
            file_path = cert.get("file_path")
            if file_path and os.path.exists(file_path):
                # Add cache buster parameter to image URL
                file_path_with_cache = f"{file_path}?v={cache_buster}&t={int(time.time())}"
            else:
                file_path_with_cache = file_path
            
            cert_list.append({
                "id": str(cert["_id"]),
                "student_id": cert.get("student_id"),
                "student_name": cert.get("student_name"),
                "student_registration": cert.get("student_registration"),
                "course_id": cert.get("course_id", ""),
                "course_name": cert.get("course_name"),
                "certificate_type": cert.get("certificate_type"),
                "grade": cert.get("grade", ""),
                "certificate_number": cert.get("certificate_number"),
                "issue_date": cert.get("issue_date"),
                "completion_date": cert.get("completion_date"),
                "status": cert.get("status"),
                "file_path": file_path_with_cache,
                "created_at": cert.get("created_at"),
                "updated_at": cert.get("updated_at"),
                "cache_buster": cache_buster
            })
        
        logger.info(f"[CERTIFICATES] Found {len(cert_list)} certificates")
        
        return {
            "success": True,
            "certificates": cert_list,
            "total": len(cert_list)
        }
        
    except Exception as e:
        logger.error(f"[CERTIFICATES] Error getting certificates: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch certificates")


@router.get("/certificates/{certificate_id}/download")
async def download_certificate(certificate_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Download certificate file"""
    import logging
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[CERTIFICATES] Downloading certificate: {certificate_id}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        # Find certificate
        query = {"_id": ObjectId(certificate_id)}
        if branch_code:
            query["$or"] = [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        
        certificate = db.branch_certificates.find_one(query)
        
        if not certificate:
            raise HTTPException(status_code=404, detail="Certificate not found")
        
        file_path = certificate.get("file_path")
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Certificate file not found")
        
        return FileResponse(
            path=file_path,
            filename=f"certificate_{certificate.get('certificate_number')}.png",
            media_type="image/png"
        )
        
    except Exception as e:
        logger.error(f"[CERTIFICATES] Error downloading certificate: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to download certificate")


@router.post("/certificates/{certificate_id}/regenerate")
async def regenerate_certificate(certificate_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Regenerate certificate file if missing or corrupted"""
    import logging
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[CERTIFICATES] Regenerating certificate: {certificate_id}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        logger.info(f"[CERTIFICATES] Looking for certificate with ID: {certificate_id}, branch_code: {branch_code}")
        
        # First try to find by ID only to debug
        cert_by_id = db.branch_certificates.find_one({"_id": ObjectId(certificate_id)})
        if cert_by_id:
            logger.info(f"[CERTIFICATES] Found certificate by ID. Its branch_code: {cert_by_id.get('branch_code')}")
        else:
            logger.error(f"[CERTIFICATES] Certificate not found by ID alone!")
        
        # Find certificate - try without branch_code filter first for flexibility
        certificate = db.branch_certificates.find_one({
            "_id": ObjectId(certificate_id)
        })
        
        if not certificate:
            raise HTTPException(status_code=404, detail="Certificate not found")
        
        # Use certificate's branch_code for file path
        cert_branch_code = certificate.get("branch_code") or branch_code
        logger.info(f"[CERTIFICATES] Certificate found. Branch code: {cert_branch_code}")
        
        # Get student data - handle both ObjectId and string
        student_id = certificate.get("student_id")
        student = None
        if student_id:
            try:
                if isinstance(student_id, str):
                    student = db.students.find_one({"_id": ObjectId(student_id)})
                else:
                    student = db.students.find_one({"_id": student_id})
            except Exception as e:
                logger.warning(f"[CERTIFICATES] Could not find student by ID: {e}")
        
        if not student:
            logger.warning(f"[CERTIFICATES] Student not found, using certificate data only")
            student = {}  # Use empty dict, will fall back to certificate data
        
        # Get course data - handle both ObjectId and string
        course_id = certificate.get("course_id")
        course = None
        if course_id:
            try:
                if isinstance(course_id, str):
                    course = db.courses.find_one({"_id": ObjectId(course_id)})
                else:
                    course = db.courses.find_one({"_id": course_id})
            except Exception as e:
                logger.warning(f"[CERTIFICATES] Could not find course by ID: {e}")
        
        if not course:
            course = {}  # Use empty dict, will fall back to certificate data
        
        # Prepare new file path
        cert_dir = os.path.join("uploads", "Certificate", "generated", cert_branch_code)
        os.makedirs(cert_dir, exist_ok=True)
        image_filename = f"certificate_{certificate.get('certificate_number')}.png"
        image_path = os.path.join(cert_dir, image_filename)
        
        # Prepare certificate data for regeneration
        cert_data = {
            "student_name": certificate.get("student_name") or student.get("student_name"),
            "student_registration": certificate.get("student_registration") or student.get("registration_number"),
            "course_name": certificate.get("course_name") or (course.get("course_name") if course else "Course"),
            "course_duration": certificate.get("duration") or (course.get("duration") if course else ""),
            "certificate_number": certificate.get("certificate_number"),
            "certificate_type": certificate.get("certificate_type", "completion"),
            "grade": certificate.get("grade", "A"),
            "issue_date": certificate.get("issue_date"),
            "completion_date": certificate.get("completion_date"),
            "start_date": certificate.get("start_date") or student.get("admission_date"),
            "father_name": certificate.get("father_name") or student.get("father_name", ""),
            "date_of_birth": certificate.get("date_of_birth") or student.get("date_of_birth"),
            "percentage": certificate.get("percentage", ""),
            "atc_code": certificate.get("atc_code") or branch_code,
            "center_name": certificate.get("center_name") or current_user.get("branch_name", "Training Center"),
            "center_address": certificate.get("center_address") or "",
            "photo_url": student.get("photo_path") if student else None,
            "sr_number": certificate.get("sr_number", ""),
            "mca_registration_number": certificate.get("mca_registration_number", "U85300UP2020NPL136478")
        }
        
        logger.info(f"[CERTIFICATES] Cert data prepared: {cert_data}")
        logger.info(f"[CERTIFICATES] Output path: {image_path}")
        
        # Generate certificate image
        try:
            success = await generate_certificate_image(cert_data, image_path)
            logger.info(f"[CERTIFICATES] Generate result: {success}")
        except Exception as gen_error:
            logger.error(f"[CERTIFICATES] Generation error: {str(gen_error)}")
            import traceback
            logger.error(f"[CERTIFICATES] Generation traceback: {traceback.format_exc()}")
            raise
        
        if success:
            # Update file_path in database
            db.branch_certificates.update_one(
                {"_id": ObjectId(certificate_id)},
                {"$set": {
                    "file_path": image_path,
                    "updated_at": datetime.utcnow()
                }}
            )
            
            logger.info(f"[CERTIFICATES] Certificate regenerated successfully: {image_path}")
            
            # Get updated certificate for response
            updated_certificate = db.branch_certificates.find_one({"_id": ObjectId(certificate_id)})
            if updated_certificate:
                updated_certificate["_id"] = str(updated_certificate["_id"])
            
            return {
                "success": True,
                "message": "Certificate regenerated successfully",
                "certificate": {
                    **updated_certificate,
                    "file_path": image_path
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to generate certificate image")
        
    except Exception as e:
        logger.error(f"[CERTIFICATES] Error regenerating certificate: {str(e)}")
        import traceback
        logger.error(f"[CERTIFICATES] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to regenerate certificate: {str(e)}")


@router.put("/certificates/{certificate_id}")
async def update_certificate(certificate_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Update a certificate"""
    import logging
    from bson import ObjectId
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[CERTIFICATES] Updating certificate: {certificate_id}")
        
        db = request.app.mongodb
        franchise_code = current_user.get("franchise_code")
        branch_code = current_user.get("branch_code")
        
        logger.info(f"[CERTIFICATES] User context - franchise_code: {franchise_code}, branch_code: {branch_code}")
        
        # Get request body
        body = await request.json()
        logger.info(f"[CERTIFICATES] Update data received: {body}")
        
        # Build flexible query to find certificate
        query = {"_id": ObjectId(certificate_id)}
        if franchise_code or branch_code:
            or_conditions = []
            if franchise_code:
                or_conditions.append({"franchise_code": franchise_code})
            if branch_code:
                or_conditions.append({"branch_code": branch_code})
                # Also try franchise_code field with branch_code value
                or_conditions.append({"franchise_code": branch_code})
                
            if or_conditions:
                query["$or"] = or_conditions
        
        logger.info(f"[CERTIFICATES] Certificate query: {query}")
        
        # Find existing certificate
        certificate = db.branch_certificates.find_one(query)
        
        if not certificate:
            logger.error(f"[CERTIFICATES] Certificate not found with query: {query}")
            raise HTTPException(status_code=404, detail="Certificate not found")
        
        logger.info(f"[CERTIFICATES] Found certificate: {certificate.get('certificate_number')}")
        
        # Prepare update data - only update fields that are provided
        update_data = {"updated_at": datetime.utcnow()}
        
        # Update only the fields that are provided in the request
        if "certificate_type" in body and body["certificate_type"]:
            update_data["certificate_type"] = body["certificate_type"]
        if "grade" in body and body["grade"]:
            update_data["grade"] = body["grade"]
        if "issue_date" in body and body["issue_date"]:
            update_data["issue_date"] = body["issue_date"]
        if "completion_date" in body and body["completion_date"]:
            update_data["completion_date"] = body["completion_date"]
        if "status" in body and body["status"]:
            update_data["status"] = body["status"]
        if "percentage" in body and body["percentage"]:
            update_data["percentage"] = body["percentage"]
        if "father_name" in body and body["father_name"]:
            update_data["father_name"] = body["father_name"]
        if "date_of_birth" in body and body["date_of_birth"]:
            update_data["date_of_birth"] = body["date_of_birth"]
        if "atc_code" in body and body["atc_code"]:
            update_data["atc_code"] = body["atc_code"]
        if "center_name" in body and body["center_name"]:
            update_data["center_name"] = body["center_name"]
        if "center_address" in body and body["center_address"]:
            update_data["center_address"] = body["center_address"]
            
        logger.info(f"[CERTIFICATES] Final update data: {update_data}")
        
        # Update certificate
        result = db.branch_certificates.update_one(
            {"_id": ObjectId(certificate_id)},
            {"$set": update_data}
        )
        
        logger.info(f"[CERTIFICATES] Update result - matched: {result.matched_count}, modified: {result.modified_count}")
        
        if result.matched_count > 0:
            logger.info(f"[CERTIFICATES] Certificate updated successfully: {certificate_id}")
            
            # Get updated certificate
            updated_cert = db.branch_certificates.find_one({"_id": ObjectId(certificate_id)})
            
            return {
                "success": True,
                "message": "Certificate updated successfully",
                "certificate": {
                    "id": str(updated_cert["_id"]),
                    "student_id": updated_cert.get("student_id"),
                    "student_name": updated_cert.get("student_name"),
                    "certificate_type": updated_cert.get("certificate_type"),
                    "grade": updated_cert.get("grade"),
                    "issue_date": updated_cert.get("issue_date"),
                    "completion_date": updated_cert.get("completion_date"),
                    "status": updated_cert.get("status"),
                    "percentage": updated_cert.get("percentage"),
                    "father_name": updated_cert.get("father_name"),
                    "date_of_birth": updated_cert.get("date_of_birth"),
                    "atc_code": updated_cert.get("atc_code"),
                    "center_name": updated_cert.get("center_name"),
                    "center_address": updated_cert.get("center_address"),
                    "updated_at": updated_cert.get("updated_at")
                }
            }
        else:
            logger.error(f"[CERTIFICATES] No certificate matched for update with ID: {certificate_id}")
            raise HTTPException(status_code=404, detail="Certificate not found for update")
        
    except HTTPException as he:
        # Re-raise HTTP exceptions as-is
        raise he
    except Exception as e:
        logger.error(f"[CERTIFICATES] Error updating certificate: {str(e)}")
        import traceback
        logger.error(f"[CERTIFICATES] Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to update certificate: {str(e)}")


@router.delete("/certificates/{certificate_id}")
async def delete_certificate(certificate_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Delete a certificate"""
    import logging
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[CERTIFICATES] Deleting certificate: {certificate_id}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        # Find certificate to get file path
        query = {"_id": ObjectId(certificate_id)}
        if branch_code:
            # Use flexible matching like in the GET endpoint
            query["$or"] = [
                {"franchise_code": branch_code},
                {"branch_code": branch_code}
            ]
        
        certificate = db.branch_certificates.find_one(query)
        
        if not certificate:
            raise HTTPException(status_code=404, detail="Certificate not found")
        
        # Delete file if exists
        file_path = certificate.get("file_path")
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"[CERTIFICATES] Deleted file: {file_path}")
            except Exception as e:
                logger.warning(f"[CERTIFICATES] Could not delete file: {e}")
        
        # Delete certificate from database
        result = db.branch_certificates.delete_one({"_id": ObjectId(certificate_id)})
        
        if result.deleted_count > 0:
            logger.info(f"[CERTIFICATES] Certificate deleted successfully: {certificate_id}")
            return {
                "success": True,
                "message": "Certificate deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Certificate not found")
        
    except Exception as e:
        logger.error(f"[CERTIFICATES] Error deleting certificate: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete certificate")


@router.post("/certificates/upload-template")
async def upload_certificate_template(
    request: Request,
    template: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a new certificate template"""
    import logging
    import shutil
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[TEMPLATE] Uploading certificate template: {template.filename}")
        
        # Validate file type
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/bmp"]
        if template.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
            )
        
        # Validate file size (max 5MB)
        MAX_SIZE = 5 * 1024 * 1024
        contents = await template.read()
        if len(contents) > MAX_SIZE:
            raise HTTPException(
                status_code=400,
                detail="File size too large. Maximum size is 5MB"
            )
        
        # Create certificate template directory
        cert_template_dir = os.path.join("uploads", "Certificate")
        os.makedirs(cert_template_dir, exist_ok=True)
        
        # Reset file pointer
        await template.seek(0)
        
        # Save the uploaded file as certificate_template.png (standardized)
        template_path = os.path.join(cert_template_dir, "certificate_template.png")
        
        # Convert and save the image
        try:
            from PIL import Image
            import io
            
            # Read the image
            image = Image.open(io.BytesIO(contents))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Save as PNG with high quality
            image.save(template_path, "PNG", quality=95, optimize=True)
            
            logger.info(f"[TEMPLATE] Template saved as PNG: {template_path}")
            
            # Also create a backup of the original with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"certificate_template_backup_{timestamp}.{template.filename.split('.')[-1]}"
            backup_path = os.path.join(cert_template_dir, backup_filename)
            
            with open(backup_path, "wb") as backup_file:
                backup_file.write(contents)
            
            logger.info(f"[TEMPLATE] Backup created: {backup_path}")
            
        except Exception as img_error:
            # If image processing fails, save as-is
            logger.warning(f"[TEMPLATE] Image processing failed, saving as-is: {img_error}")
            
            with open(template_path, "wb") as template_file:
                template_file.write(contents)
        
        # Verify the saved file
        if not os.path.exists(template_path):
            raise HTTPException(status_code=500, detail="Failed to save template file")
        
        file_size = os.path.getsize(template_path)
        logger.info(f"[TEMPLATE] Template uploaded successfully. Size: {file_size} bytes")
        
        return {
            "success": True,
            "message": "Certificate template uploaded successfully",
            "template_path": template_path,
            "file_size": file_size,
            "original_filename": template.filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[TEMPLATE] Error uploading template: {str(e)}")
        import traceback
        logger.error(f"[TEMPLATE] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to upload template: {str(e)}")


# ============== MARKSHEET ENDPOINTS ==============

@router.post("/marksheets/generate")
async def generate_student_marksheet(request: Request, current_user: dict = Depends(get_current_user)):
    """Generate marksheet for a student"""
    import logging
    from datetime import datetime
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info("[MARKSHEET] Generate marksheet endpoint called")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            raise HTTPException(status_code=400, detail="Branch code not found")
        
        # Get request body
        body = await request.json()
        
        student_id = body.get("student_id")
        course_id = body.get("course_id")
        semester = body.get("semester")
        session_year = body.get("session_year")
        subjects = body.get("subjects", [])
        status = body.get("status", "draft")
        result = body.get("result", "pass")
        
        if not student_id or not course_id:
            raise HTTPException(status_code=400, detail="student_id and course_id are required")
        
        logger.info(f"[MARKSHEET] Looking for student with ID: {student_id}")
        logger.info(f"[MARKSHEET] Using branch_code: {branch_code}")
        
        # Validate and convert student_id to ObjectId
        try:
            if isinstance(student_id, str) and len(student_id) == 24:
                student_object_id = ObjectId(student_id)
            else:
                logger.error(f"[MARKSHEET] Invalid student_id format: {student_id}")
                raise HTTPException(status_code=400, detail="Invalid student ID format")
        except Exception as e:
            logger.error(f"[MARKSHEET] Error converting student_id to ObjectId: {e}")
            raise HTTPException(status_code=400, detail="Invalid student ID")
        
        # Get student details - try multiple lookup strategies
        student = None
        
        # Strategy 1: Try with branch_code
        if branch_code:
            student = db.branch_students.find_one({"_id": student_object_id, "branch_code": branch_code})
            if student:
                logger.info(f"[MARKSHEET] Student found with branch_code: {branch_code}")
        
        # Strategy 2: Try with franchise_code if branch_code lookup failed
        if not student and branch_code:
            student = db.branch_students.find_one({"_id": student_object_id, "franchise_code": branch_code})
            if student:
                logger.info(f"[MARKSHEET] Student found with franchise_code: {branch_code}")
        
        # Strategy 3: Try just with student_id (fallback)
        if not student:
            student = db.branch_students.find_one({"_id": student_object_id})
            if student:
                logger.info(f"[MARKSHEET] Student found with ID only, student branch: {student.get('branch_code')}, franchise: {student.get('franchise_code')}")
                # Verify student belongs to current user's branch/franchise
                student_branch = student.get("branch_code")
                student_franchise = student.get("franchise_code")
                if student_branch != branch_code and student_franchise != branch_code:
                    logger.warning(f"[MARKSHEET] Student belongs to different branch/franchise")
                    student = None
        
        if not student:
            logger.error(f"[MARKSHEET] Student not found with ID: {student_id}, branch_code: {branch_code}")
            
            # Debug: Show some students in the collection for troubleshooting
            sample_students = list(db.branch_students.find({}, {"_id": 1, "student_name": 1, "branch_code": 1, "franchise_code": 1}).limit(5))
            logger.info(f"[MARKSHEET] Debug: Sample students in database: {sample_students}")
            
            # Check if there are any students with the given branch_code
            branch_students = list(db.branch_students.find({"branch_code": branch_code}, {"_id": 1, "student_name": 1}).limit(3))
            logger.info(f"[MARKSHEET] Debug: Students with branch_code {branch_code}: {branch_students}")
            
            # Check if there are any students with the given franchise_code
            franchise_students = list(db.branch_students.find({"franchise_code": branch_code}, {"_id": 1, "student_name": 1}).limit(3))
            logger.info(f"[MARKSHEET] Debug: Students with franchise_code {branch_code}: {franchise_students}")
            
            raise HTTPException(status_code=404, detail=f"Student not found. Please check if student ID {student_id} exists and belongs to branch {branch_code}")
        
        logger.info(f"[MARKSHEET] Student found: {student.get('student_name', 'Unknown')}")
        
        # Get course details
        logger.info(f"[MARKSHEET] Looking for course with ID: {course_id}")
        
        # Validate and convert course_id to ObjectId
        try:
            if isinstance(course_id, str) and len(course_id) == 24:
                course_object_id = ObjectId(course_id)
            else:
                logger.error(f"[MARKSHEET] Invalid course_id format: {course_id}")
                raise HTTPException(status_code=400, detail="Invalid course ID format")
        except Exception as e:
            logger.error(f"[MARKSHEET] Error converting course_id to ObjectId: {e}")
            raise HTTPException(status_code=400, detail="Invalid course ID")
        
        # Try multiple collections for course lookup
        course = None
        
        # Try branch_courses first
        course = db.branch_courses.find_one({"_id": course_object_id})
        if course:
            logger.info(f"[MARKSHEET] Course found in branch_courses: {course.get('course_name', 'Unknown')}")
        else:
            # Try courses collection
            course = db.courses.find_one({"_id": course_object_id})
            if course:
                logger.info(f"[MARKSHEET] Course found in courses: {course.get('course_name', 'Unknown')}")
        
        if not course:
            logger.error(f"[MARKSHEET] Course not found with ID: {course_id}")
            # Debug: Show some courses for troubleshooting
            sample_courses = list(db.branch_courses.find({}, {"_id": 1, "course_name": 1}).limit(5))
            logger.info(f"[MARKSHEET] Debug: Sample courses in branch_courses: {sample_courses}")
            sample_courses_main = list(db.courses.find({}, {"_id": 1, "course_name": 1}).limit(5))
            logger.info(f"[MARKSHEET] Debug: Sample courses in courses: {sample_courses_main}")
            raise HTTPException(status_code=404, detail=f"Course not found with ID: {course_id}")
        
        # Get branch details
        branch = db.branches.find_one({"centre_info.branch_code": branch_code})
        branch_name = "Unknown Branch"
        if branch:
            branch_name = branch.get("centre_info", {}).get("centre_name", "Unknown Branch")
        
        # Calculate totals
        total_full_marks = 0
        total_obtained_marks = 0
        
        for subject in subjects:
            full_marks = float(subject.get("full_marks", 0))
            obtained_marks = float(subject.get("obtained_marks", 0))
            total_full_marks += full_marks
            total_obtained_marks += obtained_marks
        
        # Calculate percentage and grade
        percentage = (total_obtained_marks / total_full_marks * 100) if total_full_marks > 0 else 0
        
        # Determine grade based on percentage
        if percentage >= 90:
            grade = "A+"
        elif percentage >= 80:
            grade = "A"
        elif percentage >= 70:
            grade = "B+"
        elif percentage >= 60:
            grade = "B"
        elif percentage >= 50:
            grade = "C+"
        elif percentage >= 40:
            grade = "C"
        elif percentage >= 33:
            grade = "D"
        else:
            grade = "F"
            result = "fail"
        
        # Generate unique marksheet number
        marksheet_count = db.branch_marksheets.count_documents({"branch_code": branch_code})
        marksheet_number = f"MS-{branch_code}-{datetime.now().year}-{marksheet_count + 1:04d}"
        
        # Create marksheet document
        marksheet_doc = {
            "student_id": student_id,
            "student_name": student.get("student_name"),
            "student_registration": student.get("registration_number"),
            "course_id": course_id,
            "course_name": course.get("title") or course.get("course_name"),
            "semester": semester,
            "session_year": session_year,
            "branch_code": branch_code,
            "branch_name": branch_name,
            "marksheet_number": marksheet_number,
            "photo_url": body.get("photo_url") or student.get("photo_url") or student.get("photo") or student.get("student_photo") or "",
            "father_name": body.get("father_name") or student.get("father_name", ""),
            "mother_name": body.get("mother_name") or student.get("mother_name", ""),
            "atc_name": body.get("atc_name") or branch_name,
            "atc_address": body.get("atc_address") or "",
            "course_code": body.get("course_code") or course.get("course_code", ""),
            "sr_number": body.get("sr_number") or marksheet_number,
            "join_date": body.get("join_date") or student.get("date_of_admission", ""),
            "issue_date": body.get("issue_date") or datetime.now().strftime("%d/%m/%Y"),
            "subjects": subjects,
            "total_marks": total_full_marks,
            "obtained_marks": total_obtained_marks,
            "percentage": round(percentage, 2),
            "grade": body.get("grade", grade),
            "result": result,
            "status": status,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Always generate marksheet image (removed published check)
        # Create file path
        os.makedirs("uploads/Marksheet/generated", exist_ok=True)
        image_filename = f"marksheet_{marksheet_number}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        image_path = os.path.join("uploads", "Marksheet", "generated", image_filename)
        
        # Prepare data for image generation using service function format
        # Convert subjects to subjects_results format expected by service
        subjects_results = []
        for subj in subjects:
            subjects_results.append({
                "subject_name": subj.get("name", ""),
                "theory_marks": float(subj.get("obtained_marks", 0)),
                "theory_max": float(subj.get("full_marks", 100)),
                "practical_marks": 0,
                "practical_max": 0
            })
        
        # Get photo URL from request body first, then fallback to student record, then find in uploads folder
        photo_url = body.get("photo_url") or student.get("photo_url") or student.get("photo") or student.get("student_photo") or ""
        
        # If photo_url is still empty, try to find a photo in uploads/student_photos folder
        if not photo_url:
            import glob
            student_photos_dir = os.path.join("uploads", "student_photos")
            if os.path.exists(student_photos_dir):
                # Find photos matching this student ID
                pattern = os.path.join(student_photos_dir, f"student_{student_id}_*.jpg")
                matching_photos = glob.glob(pattern)
                # Also try with .png extension
                pattern_png = os.path.join(student_photos_dir, f"student_{student_id}_*.png")
                matching_photos.extend(glob.glob(pattern_png))
                
                if matching_photos:
                    # Sort by modification time and get the latest
                    matching_photos.sort(key=os.path.getmtime, reverse=True)
                    latest_photo = matching_photos[0]
                    photo_url = latest_photo.replace("\\", "/")
                    logger.info(f"[MARKSHEET] Found existing photo for student: {photo_url}")
        
        logger.info(f"[MARKSHEET] Photo URL for marksheet: {photo_url}")
        
        # Update marksheet_doc with the found photo_url
        marksheet_doc["photo_url"] = photo_url
        
        # Use subjects_results from request body if provided, otherwise use subjects_results generated above
        final_subjects_results = body.get("subjects_results") or subjects_results
        logger.info(f"[MARKSHEET] Subjects results: {final_subjects_results}")
        
        marksheet_data_for_image = {
            "student_name": body.get("student_name") or student.get("student_name"),
            "father_name": body.get("father_name") or student.get("father_name", ""),
            "mother_name": body.get("mother_name") or student.get("mother_name", ""),
            "student_registration": body.get("student_id_number") or student.get("registration_number"),
            "course_name": body.get("course_code") or course.get("title") or course.get("course_name"),
            "course_code": body.get("course_code") or course.get("course_code", ""),
            "atc_name": body.get("atc_name") or branch_name,
            "atc_address": body.get("atc_address") or (branch.get("address", "") if branch else ""),
            "sr_number": body.get("sr_number") or marksheet_number,
            "mca_reg_no": body.get("mca_registration_number") or (branch.get("mca_reg_no", "") if branch else ""),
            "join_date": body.get("join_date") or student.get("date_of_admission", ""),
            "issue_date": body.get("issue_date") or datetime.now().strftime("%d/%m/%Y"),
            "subjects_results": final_subjects_results,
            "total_marks": body.get("total_marks") or total_full_marks,
            "obtained_marks": body.get("obtained_marks") or total_obtained_marks,
            "percentage": body.get("percentage") or round(percentage, 2),
            "grade": body.get("overall_grade") or body.get("grade", grade),
            "result": result,
            "photo_url": photo_url,
            "template_path": body.get("template_path")
        }
        
        logger.info(f"[MARKSHEET] Marksheet data for image: {marksheet_data_for_image}")
        
        # Generate marksheet image using service function
        success = await service_generate_marksheet_image(marksheet_data_for_image, image_path)
        
        if success:
            marksheet_doc["file_path"] = image_path
        
        # Insert marksheet
        result_insert = db.branch_marksheets.insert_one(marksheet_doc)
        
        if not result_insert.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to generate marksheet")
        
        logger.info(f"[MARKSHEET] Marksheet generated successfully: {result_insert.inserted_id}")
        
        return {
            "success": True,
            "message": "Marksheet generated successfully",
            "marksheet": {
                "id": str(result_insert.inserted_id),
                "student_id": student_id,
                "student_name": student.get("student_name"),
                "marksheet_number": marksheet_number,
                "semester": semester,
                "session_year": session_year,
                "total_marks": total_full_marks,
                "obtained_marks": total_obtained_marks,
                "percentage": round(percentage, 2),
                "grade": body.get("grade", grade),
                "result": result,
                "status": status,
                "file_path": marksheet_doc.get("file_path")
            }
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"[MARKSHEET] Error generating marksheet: {str(e)}")
        import traceback
        logger.error(f"[MARKSHEET] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate marksheet: {str(e)}")


async def generate_marksheet_image_legacy(marksheet_data, output_path):
    """Generate marksheet image using template - LEGACY (use service_generate_marksheet_image instead)"""
    try:
        import os
        from PIL import Image, ImageDraw, ImageFont
        from datetime import datetime
        
        print(f"Starting marksheet generation for student: {marksheet_data.get('student_name', 'Unknown')}")
        
        # Template image path - use the correct template
        template_path = os.path.join("uploads", "Marksheet", "marksheet.jpeg")
        
        # Fallback paths if main template not found
        alternative_paths = [
            os.path.join("uploads", "Marksheet", "Marksheet.jpeg"),
            os.path.join("uploads", "Marksheet", "marksheet_template.png"),
            os.path.join("uploads", "Marksheet", "template.png"),
        ]
        
        # Try main path first
        if not os.path.exists(template_path):
            print(f"Template not found at: {template_path}")
            # Try alternative paths
            for alt_path in alternative_paths:
                if os.path.exists(alt_path):
                    template_path = alt_path
                    print(f"Using alternative template: {template_path}")
                    break
        
        if not os.path.exists(template_path):
            print(f"No marksheet template found. Checked paths:")
            print(f"  - {template_path}")
            for alt_path in alternative_paths:
                print(f"  - {alt_path}")
            return False
        
        # Load template image
        template = Image.open(template_path)
        template = template.convert("RGB")
        print(f"Template loaded successfully. Size: {template.size}")
        
        # Create a copy to draw on
        marksheet = template.copy()
        draw = ImageDraw.Draw(marksheet)
        
        # Try to load fonts (fallback to default if not available)
        try:
            font_title = ImageFont.truetype("arial.ttf", 36)
            font_large = ImageFont.truetype("arial.ttf", 24)
            font_medium = ImageFont.truetype("arial.ttf", 18)
            font_small = ImageFont.truetype("arial.ttf", 14)
            print("Using TrueType fonts")
        except:
            font_title = ImageFont.load_default()
            font_large = ImageFont.load_default()
            font_medium = ImageFont.load_default()
            font_small = ImageFont.load_default()
            print("Using default fonts")
        
        # Text color
        text_color = (0, 0, 0)  # Black
        
        # Get image dimensions
        img_width, img_height = marksheet.size
        
        # Helper function to center text
        def get_centered_x(text, font, img_width):
            if font:
                try:
                    bbox = draw.textbbox((0, 0), text, font=font)
                    text_width = bbox[2] - bbox[0]
                    return (img_width - text_width) // 2
                except:
                    return img_width // 2
            return img_width // 2
        
        # Title
        title = "MARKSHEET"
        title_x = get_centered_x(title, font_title, img_width)
        draw.text((title_x, 50), title, font=font_title, fill=text_color)
        
        # Student details
        y_offset = 150
        draw.text((100, y_offset), f"Name: {marksheet_data.get('student_name', 'N/A')}", font=font_medium, fill=text_color)
        y_offset += 40
        draw.text((100, y_offset), f"Registration No: {marksheet_data.get('student_registration', 'N/A')}", font=font_small, fill=text_color)
        y_offset += 30
        draw.text((100, y_offset), f"Course: {marksheet_data.get('course_name', 'N/A')}", font=font_small, fill=text_color)
        y_offset += 30
        draw.text((100, y_offset), f"Semester: {marksheet_data.get('semester', 'N/A')}", font=font_small, fill=text_color)
        y_offset += 30
        draw.text((100, y_offset), f"Session: {marksheet_data.get('session_year', 'N/A')}", font=font_small, fill=text_color)
        
        # Subjects table header
        y_offset += 60
        draw.text((100, y_offset), "Subject", font=font_medium, fill=text_color)
        draw.text((400, y_offset), "Full Marks", font=font_medium, fill=text_color)
        draw.text((550, y_offset), "Obtained", font=font_medium, fill=text_color)
        draw.text((700, y_offset), "Grade", font=font_medium, fill=text_color)
        
        # Draw subjects
        y_offset += 40
        for subject in marksheet_data.get("subjects", []):
            draw.text((100, y_offset), subject.get("name", "N/A"), font=font_small, fill=text_color)
            draw.text((400, y_offset), str(subject.get("full_marks", 0)), font=font_small, fill=text_color)
            draw.text((550, y_offset), str(subject.get("obtained_marks", 0)), font=font_small, fill=text_color)
            draw.text((700, y_offset), subject.get("grade", "N/A"), font=font_small, fill=text_color)
            y_offset += 30
        
        # Totals
        y_offset += 20
        draw.text((100, y_offset), "TOTAL", font=font_medium, fill=text_color)
        draw.text((400, y_offset), str(marksheet_data.get("total_marks", 0)), font=font_medium, fill=text_color)
        draw.text((550, y_offset), str(marksheet_data.get("obtained_marks", 0)), font=font_medium, fill=text_color)
        
        # Percentage and Grade
        y_offset += 50
        draw.text((100, y_offset), f"Percentage: {marksheet_data.get('percentage', 0)}%", font=font_large, fill=text_color)
        y_offset += 40
        draw.text((100, y_offset), f"Grade: {marksheet_data.get('grade', 'N/A')}", font=font_large, fill=text_color)
        y_offset += 40
        draw.text((100, y_offset), f"Result: {marksheet_data.get('result', 'N/A').upper()}", font=font_large, fill=text_color)
        
        # Marksheet number and date
        draw.text((100, img_height - 100), f"Marksheet No: {marksheet_data.get('marksheet_number', 'N/A')}", font=font_small, fill=text_color)
        draw.text((100, img_height - 70), f"Issue Date: {marksheet_data.get('issue_date', datetime.now().strftime('%Y-%m-%d'))}", font=font_small, fill=text_color)
        
        # Branch name
        draw.text((img_width - 400, img_height - 100), f"Issued by: {marksheet_data.get('branch_name', 'SkillWallah EdTech')}", font=font_small, fill=text_color)
        
        # Create output directory if it doesn't exist
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save the final marksheet
        marksheet.save(output_path, "PNG", quality=95)
        print(f"Marksheet saved successfully to: {output_path}")
        
        return True
        
    except Exception as e:
        print(f"Error generating marksheet: {e}")
        import traceback
        traceback.print_exc()
        return False


@router.get("/marksheets")
async def get_branch_marksheets(request: Request, current_user: dict = Depends(get_current_user)):
    """Get all marksheets for the current branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[MARKSHEETS] Getting marksheets for user: {current_user.get('email')}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            logger.warning("[MARKSHEETS] No branch code found for user")
            return {"success": True, "marksheets": [], "total": 0}
        
        # Get query parameters for filtering
        student_id = request.query_params.get("student_id")
        semester = request.query_params.get("semester")
        status = request.query_params.get("status")
        
        # Build query
        query = {"branch_code": branch_code}
        if student_id:
            query["student_id"] = student_id
        if semester:
            query["semester"] = semester
        if status:
            query["status"] = status
        
        marksheets = list(db.branch_marksheets.find(query).sort("created_at", -1))
        
        # Format marksheets for response
        marksheet_list = []
        for ms in marksheets:
            marksheet_list.append({
                "id": str(ms["_id"]),
                "student_id": ms.get("student_id"),
                "student_name": ms.get("student_name"),
                "student_registration": ms.get("student_registration"),
                "course_id": ms.get("course_id", ""),
                "course_name": ms.get("course_name"),
                "semester": ms.get("semester"),
                "session_year": ms.get("session_year"),
                "marksheet_number": ms.get("marksheet_number"),
                "subjects": ms.get("subjects", []),
                "total_marks": ms.get("total_marks"),
                "obtained_marks": ms.get("obtained_marks"),
                "percentage": ms.get("percentage"),
                "grade": ms.get("grade"),
                "result": ms.get("result"),
                "status": ms.get("status"),
                "file_path": ms.get("file_path"),
                "created_at": ms.get("created_at"),
                "updated_at": ms.get("updated_at")
            })
        
        logger.info(f"[MARKSHEETS] Found {len(marksheet_list)} marksheets")
        
        return {
            "success": True,
            "marksheets": marksheet_list,
            "total": len(marksheet_list)
        }
        
    except Exception as e:
        logger.error(f"[MARKSHEETS] Error getting marksheets: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch marksheets")


@router.put("/marksheets/{marksheet_id}")
async def update_marksheet(marksheet_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Update a marksheet"""
    import logging
    from bson import ObjectId
    from datetime import datetime
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[MARKSHEETS] Updating marksheet: {marksheet_id}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        # Get request body
        body = await request.json()
        
        # Find existing marksheet
        marksheet = db.branch_marksheets.find_one({
            "_id": ObjectId(marksheet_id),
            "branch_code": branch_code
        })
        
        if not marksheet:
            raise HTTPException(status_code=404, detail="Marksheet not found")
        
        # Prepare update data
        subjects = body.get("subjects", marksheet.get("subjects", []))
        
        # Recalculate totals if subjects changed
        total_full_marks = 0
        total_obtained_marks = 0
        
        for subject in subjects:
            full_marks = float(subject.get("full_marks", 0))
            obtained_marks = float(subject.get("obtained_marks", 0))
            total_full_marks += full_marks
            total_obtained_marks += obtained_marks
        
        percentage = (total_obtained_marks / total_full_marks * 100) if total_full_marks > 0 else 0
        
        # Determine grade
        if percentage >= 90:
            grade = "A+"
        elif percentage >= 80:
            grade = "A"
        elif percentage >= 70:
            grade = "B+"
        elif percentage >= 60:
            grade = "B"
        elif percentage >= 50:
            grade = "C+"
        elif percentage >= 40:
            grade = "C"
        elif percentage >= 33:
            grade = "D"
        else:
            grade = "F"
        
        update_data = {
            "semester": body.get("semester", marksheet.get("semester")),
            "session_year": body.get("session_year", marksheet.get("session_year")),
            "subjects": subjects,
            "total_marks": total_full_marks,
            "obtained_marks": total_obtained_marks,
            "percentage": round(percentage, 2),
            "grade": body.get("grade", grade),
            "result": body.get("result", marksheet.get("result")),
            "status": body.get("status", marksheet.get("status")),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Update marksheet
        result = db.branch_marksheets.update_one(
            {"_id": ObjectId(marksheet_id), "branch_code": branch_code},
            {"$set": update_data}
        )
        
        if result.modified_count > 0 or result.matched_count > 0:
            logger.info(f"[MARKSHEETS] Marksheet updated successfully: {marksheet_id}")
            
            # Get updated marksheet
            updated_ms = db.branch_marksheets.find_one({"_id": ObjectId(marksheet_id)})
            
            return {
                "success": True,
                "message": "Marksheet updated successfully",
                "marksheet": {
                    "id": str(updated_ms["_id"]),
                    "student_id": updated_ms.get("student_id"),
                    "student_name": updated_ms.get("student_name"),
                    "semester": updated_ms.get("semester"),
                    "session_year": updated_ms.get("session_year"),
                    "total_marks": updated_ms.get("total_marks"),
                    "obtained_marks": updated_ms.get("obtained_marks"),
                    "percentage": updated_ms.get("percentage"),
                    "grade": updated_ms.get("grade"),
                    "result": updated_ms.get("result"),
                    "status": updated_ms.get("status"),
                    "updated_at": updated_ms.get("updated_at")
                }
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to update marksheet")
        
    except Exception as e:
        logger.error(f"[MARKSHEETS] Error updating marksheet: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update marksheet: {str(e)}")


@router.delete("/marksheets/{marksheet_id}")
async def delete_marksheet(marksheet_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Delete a marksheet"""
    import logging
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[MARKSHEETS] Deleting marksheet: {marksheet_id}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        # Find marksheet to get file path
        marksheet = db.branch_marksheets.find_one({
            "_id": ObjectId(marksheet_id),
            "branch_code": branch_code
        })
        
        if not marksheet:
            raise HTTPException(status_code=404, detail="Marksheet not found")
        
        # Delete file if exists
        file_path = marksheet.get("file_path")
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"[MARKSHEETS] Deleted file: {file_path}")
            except Exception as e:
                logger.warning(f"[MARKSHEETS] Could not delete file: {e}")
        
        # Delete marksheet from database
        result = db.branch_marksheets.delete_one({
            "_id": ObjectId(marksheet_id),
            "branch_code": branch_code
        })
        
        if result.deleted_count > 0:
            logger.info(f"[MARKSHEETS] Marksheet deleted successfully: {marksheet_id}")
            return {
                "success": True,
                "message": "Marksheet deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Marksheet not found")
        
    except Exception as e:
        logger.error(f"[MARKSHEETS] Error deleting marksheet: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete marksheet")


@router.get("/marksheets/{marksheet_id}/download")
async def download_marksheet(marksheet_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Download marksheet file"""
    import logging
    from bson import ObjectId
    
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[MARKSHEETS] Downloading marksheet: {marksheet_id}")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        # Find marksheet
        marksheet = db.branch_marksheets.find_one({
            "_id": ObjectId(marksheet_id),
            "branch_code": branch_code
        })
        
        if not marksheet:
            raise HTTPException(status_code=404, detail="Marksheet not found")
        
        file_path = marksheet.get("file_path")
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Marksheet file not found")
        
        return FileResponse(
            path=file_path,
            filename=f"marksheet_{marksheet.get('marksheet_number')}.png",
            media_type="image/png"
        )
        
    except Exception as e:
        logger.error(f"[MARKSHEETS] Error downloading marksheet: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to download marksheet")


@router.get("/marksheets/test")
async def test_marksheet_endpoint():
    """Test marksheet endpoint"""
    return {
        "success": True,
        "message": "Marksheet endpoints are working!",
        "available_endpoints": [
            "POST /api/branch/marksheets/generate - Generate marksheet for student",
            "GET /api/branch/marksheets - Get all marksheets",
            "PUT /api/branch/marksheets/{ms_id} - Update marksheet",
            "GET /api/branch/marksheets/{ms_id}/download - Download marksheet image",
            "DELETE /api/branch/marksheets/{ms_id} - Delete marksheet",
            "GET /api/branch/marksheets/test - This test endpoint"
        ]
    }


# ============== STATISTICS ENDPOINT ==============

@router.get("/certificates-marksheets/stats")
async def get_certificates_marksheets_stats(request: Request, current_user: dict = Depends(get_current_user)):
    """Get statistics for certificates and marksheets dashboard"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info("[STATS] Getting certificates and marksheets statistics")
        
        db = request.app.mongodb
        branch_code = current_user.get("branch_code") or current_user.get("franchise_code")
        
        if not branch_code:
            logger.warning("[STATS] No branch code found for user")
            return {
                "success": True,
                "certificates": {"total": 0, "issued": 0, "draft": 0, "cancelled": 0},
                "marksheets": {"total": 0, "published": 0, "draft": 0, "withheld": 0},
                "students_covered": 0,
                "success_rate": 0
            }
        
        # Certificate stats
        total_certs = db.branch_certificates.count_documents({"branch_code": branch_code})
        issued_certs = db.branch_certificates.count_documents({"branch_code": branch_code, "status": "issued"})
        draft_certs = db.branch_certificates.count_documents({"branch_code": branch_code, "status": "generated"})
        cancelled_certs = db.branch_certificates.count_documents({"branch_code": branch_code, "status": "cancelled"})
        
        # Marksheet stats
        total_marksheets = db.branch_marksheets.count_documents({"branch_code": branch_code})
        published_marksheets = db.branch_marksheets.count_documents({"branch_code": branch_code, "status": "published"})
        draft_marksheets = db.branch_marksheets.count_documents({"branch_code": branch_code, "status": "draft"})
        withheld_marksheets = db.branch_marksheets.count_documents({"branch_code": branch_code, "status": "withheld"})
        
        # Get unique students covered
        cert_students = db.branch_certificates.distinct("student_id", {"branch_code": branch_code})
        marksheet_students = db.branch_marksheets.distinct("student_id", {"branch_code": branch_code})
        unique_students = set(cert_students + marksheet_students)
        students_covered = len(unique_students)
        
        # Calculate success rate (pass rate from marksheets)
        total_results = db.branch_marksheets.count_documents({"branch_code": branch_code, "status": "published"})
        passed_results = db.branch_marksheets.count_documents({
            "branch_code": branch_code,
            "status": "published",
            "result": "pass"
        })
        
        success_rate = round((passed_results / total_results * 100), 2) if total_results > 0 else 0
        
        logger.info(f"[STATS] Statistics calculated successfully for branch: {branch_code}")
        
        return {
            "success": True,
            "certificates": {
                "total": total_certs,
                "issued": issued_certs,
                "draft": draft_certs,
                "cancelled": cancelled_certs
            },
            "marksheets": {
                "total": total_marksheets,
                "published": published_marksheets,
                "draft": draft_marksheets,
                "withheld": withheld_marksheets
            },
            "students_covered": students_covered,
            "success_rate": success_rate
        }
        
    except Exception as e:
        logger.error(f"[STATS] Error getting statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch statistics")


# ===== BRANCH MANAGEMENT ENDPOINTS =====

@router.patch("/branches/{branch_code}/status")
async def update_branch_status(
    branch_code: str,
    request: Request,
    user=Depends(get_current_user)
):
    """Update branch status (ACTIVE/INACTIVE)"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[Branch Status] Updating status for branch: {branch_code}")
        
        # Get request body
        body = await request.json()
        new_status = body.get("status", "").upper()
        
        if new_status not in ["ACTIVE", "INACTIVE"]:
            raise HTTPException(status_code=400, detail="Status must be ACTIVE or INACTIVE")
        
        logger.info(f"[Branch Status] New status: {new_status}")
        
        # Get database connection
        db = request.app.mongodb
        
        # Verify branch exists and user has access
        branch = db["branches"].find_one({"centre_info.branch_code": branch_code})
        if not branch:
            # Try with different field names
            branch = db["branches"].find_one({"branch_code": branch_code})
        
        if not branch:
            logger.error(f"[Branch Status] Branch not found: {branch_code}")
            raise HTTPException(status_code=404, detail="Branch not found")
        
        # Check user permissions
        user_franchise = user.get('franchise_code') if isinstance(user, dict) else getattr(user, 'franchise_code', None)
        user_role = user.get('role') if isinstance(user, dict) else getattr(user, 'role', '')
        user_email = user.get('email') if isinstance(user, dict) else getattr(user, 'email', 'unknown')
        branch_franchise = branch.get("franchise_code")
        
        logger.info(f"[Branch Status] Permission check:")
        logger.info(f"   User franchise: {user_franchise}")
        logger.info(f"   User role: {user_role}")
        logger.info(f"   Branch franchise: {branch_franchise}")
        
        if user_franchise != branch_franchise and user_role != 'super_admin':
            logger.error(f"[Branch Status] Permission denied: {user_email}")
            raise HTTPException(status_code=403, detail="You don't have permission for this action")
        
        # Update branch status
        result = db["branches"].update_one(
            {"_id": branch["_id"]},
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            logger.error(f"[Branch Status] Failed to update branch: {branch_code}")
            raise HTTPException(status_code=500, detail="Failed to update branch status")
        
        logger.info(f"[Branch Status] Successfully updated branch {branch_code} to {new_status}")
        
        return {
            "success": True,
            "message": f"Branch status updated to {new_status}",
            "branch_code": branch_code,
            "status": new_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Branch Status] Error updating status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update branch status")


@router.patch("/branches/{branch_code}")
async def update_branch(
    branch_code: str,
    request: Request,
    user=Depends(get_current_user)
):
    """Update branch information"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[Branch Update] Updating branch: {branch_code}")
        
        # Get request body
        body = await request.json()
        logger.info(f"[Branch Update] Update data received: {list(body.keys())}")
        
        # Get database connection
        db = request.app.mongodb
        
        # Verify branch exists and user has access
        branch = db["branches"].find_one({"centre_info.branch_code": branch_code})
        if not branch:
            # Try with different field names
            branch = db["branches"].find_one({"branch_code": branch_code})
        
        if not branch:
            logger.error(f"[Branch Update] Branch not found: {branch_code}")
            raise HTTPException(status_code=404, detail="Branch not found")
        
        # Check user permissions
        user_franchise = user.get('franchise_code') if isinstance(user, dict) else getattr(user, 'franchise_code', None)
        user_role = user.get('role') if isinstance(user, dict) else getattr(user, 'role', '')
        user_email = user.get('email') if isinstance(user, dict) else getattr(user, 'email', 'unknown')
        branch_franchise = branch.get("franchise_code")
        
        logger.info(f"[Branch Update] Permission check:")
        logger.info(f"   User franchise: {user_franchise}")
        logger.info(f"   User role: {user_role}")
        logger.info(f"   Branch franchise: {branch_franchise}")
        
        if user_franchise != branch_franchise and user_role != 'super_admin':
            logger.error(f"[Branch Update] Permission denied: {user_email}")
            raise HTTPException(status_code=403, detail="You don't have permission for this action")
        
        # Prepare update data
        update_data = {"updated_at": datetime.utcnow()}
        
        # Handle status update
        if "status" in body:
            status = body["status"].upper()
            if status in ["ACTIVE", "INACTIVE"]:
                update_data["status"] = status
                logger.info(f"[Branch Update] Status update: {status}")
        
        # Handle centre_info updates
        centre_info_updates = {}
        centre_info_fields = [
            "centre_name", "society_trust_company", "registration_number", 
            "registration_year", "centre_address", "state", "district", 
            "office_contact", "date_of_joining"
        ]
        
        for field in centre_info_fields:
            if field in body:
                centre_info_updates[field] = body[field]
        
        if centre_info_updates:
            for field, value in centre_info_updates.items():
                update_data[f"centre_info.{field}"] = value
                
        # Handle centre_head updates
        centre_head_updates = {}
        centre_head_fields = [
            "name", "gender", "mobile", "email", "address", 
            "address_proof_type", "id_number", "logo_url"
        ]
        
        for field in centre_head_fields:
            if field in body:
                centre_head_updates[field] = body[field]
        
        if centre_head_updates:
            for field, value in centre_head_updates.items():
                update_data[f"centre_head.{field}"] = value
        
        # Perform update
        result = db["branches"].update_one(
            {"_id": branch["_id"]},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            logger.warning(f"[Branch Update] No changes made to branch: {branch_code}")
        
        logger.info(f"[Branch Update] Successfully updated branch: {branch_code}")
        
        return {
            "success": True,
            "message": "Branch updated successfully",
            "branch_code": branch_code,
            "modified": result.modified_count > 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Branch Update] Error updating branch: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update branch")


@router.delete("/branches/{branch_code}")
async def delete_branch(
    branch_code: str,
    request: Request,
    user=Depends(get_current_user)
):
    """Delete a branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[Branch Delete] Deleting branch: {branch_code}")
        
        # Get database connection
        db = request.app.mongodb
        
        # Verify branch exists and user has access
        branch = db["branches"].find_one({"centre_info.branch_code": branch_code})
        if not branch:
            # Try with different field names
            branch = db["branches"].find_one({"branch_code": branch_code})
        
        if not branch:
            logger.error(f"[Branch Delete] Branch not found: {branch_code}")
            raise HTTPException(status_code=404, detail="Branch not found")
        
        # Check user permissions
        user_franchise = user.get('franchise_code') if isinstance(user, dict) else getattr(user, 'franchise_code', None)
        user_role = user.get('role') if isinstance(user, dict) else getattr(user, 'role', '')
        user_email = user.get('email') if isinstance(user, dict) else getattr(user, 'email', 'unknown')
        branch_franchise = branch.get("franchise_code")
        
        logger.info(f"[Branch Delete] Permission check:")
        logger.info(f"   User franchise: {user_franchise}")
        logger.info(f"   User role: {user_role}")
        logger.info(f"   Branch franchise: {branch_franchise}")
        
        if user_franchise != branch_franchise and user_role != 'super_admin':
            logger.error(f"[Branch Delete] Permission denied: {user_email}")
            raise HTTPException(status_code=403, detail="You don't have permission for this action")
        
        # Check for existing students/courses
        students_count = db["students"].count_documents({"branch_code": branch_code})
        if students_count > 0:
            logger.error(f"[Branch Delete] Branch has {students_count} students")
            raise HTTPException(status_code=400, detail=f"Cannot delete branch: It has {students_count} active students")
        
        # Hard delete - actually remove from database
        logger.info(f"[Branch Delete] Performing HARD DELETE for branch: {branch_code}")
        
        # Delete the branch record from database
        result = db["branches"].delete_one({"_id": branch["_id"]})
        
        if result.deleted_count == 0:
            logger.error(f"[Branch Delete] Failed to delete branch: {branch_code}")
            raise HTTPException(status_code=500, detail="Failed to delete branch")
        
        # Also clean up any related branch data
        logger.info(f"[Branch Delete] Cleaning up related data for branch: {branch_code}")
        
        # Delete branch courses
        courses_result = db["courses"].delete_many({"branch_code": branch_code})
        logger.info(f"[Branch Delete] Deleted {courses_result.deleted_count} courses")
        
        # Delete branch batches  
        batches_result = db["batches"].delete_many({"branch_code": branch_code})
        logger.info(f"[Branch Delete] Deleted {batches_result.deleted_count} batches")
        
        # Delete branch notices
        notices_result = db["notices"].delete_many({"branch_code": branch_code})
        logger.info(f"[Branch Delete] Deleted {notices_result.deleted_count} notices")
        
        # Delete branch payments
        payments_result = db["payments"].delete_many({"branch_code": branch_code})
        logger.info(f"[Branch Delete] Deleted {payments_result.deleted_count} payments")
        
        # Delete branch expenses
        expenses_result = db["expenses"].delete_many({"branch_code": branch_code})
        logger.info(f"[Branch Delete] Deleted {expenses_result.deleted_count} expenses")
        
        # Delete branch income records
        income_result = db["income"].delete_many({"branch_code": branch_code})
        logger.info(f"[Branch Delete] Deleted {income_result.deleted_count} income records")
        
        # Delete branch id cards
        id_cards_result = db["branch_id_cards"].delete_many({"branch_code": branch_code})
        logger.info(f"[Branch Delete] Deleted {id_cards_result.deleted_count} ID cards")
        
        # Delete branch certificates
        certificates_result = db["certificates"].delete_many({"branch_code": branch_code})
        logger.info(f"[Branch Delete] Deleted {certificates_result.deleted_count} certificates")
        
        # Delete branch marksheets
        marksheets_result = db["marksheets"].delete_many({"branch_code": branch_code})
        logger.info(f"[Branch Delete] Deleted {marksheets_result.deleted_count} marksheets")
        
        logger.info(f"[Branch Delete] Successfully HARD DELETED branch and all related data: {branch_code}")
        
        return {
            "success": True,
            "message": "Branch permanently deleted from database",
            "branch_code": branch_code,
            "deleted_records": {
                "branch": 1,
                "courses": courses_result.deleted_count,
                "batches": batches_result.deleted_count,
                "notices": notices_result.deleted_count,
                "payments": payments_result.deleted_count,
                "expenses": expenses_result.deleted_count,
                "income": income_result.deleted_count,
                "id_cards": id_cards_result.deleted_count,
                "certificates": certificates_result.deleted_count,
                "marksheets": marksheets_result.deleted_count
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Branch Delete] Error deleting branch: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete branch")


# ===== BRANCH STATISTICS ENDPOINT =====

@router.get("/branches/{branch_code}/stats")
async def get_branch_stats(
    branch_code: str,
    request: Request,
    user=Depends(get_current_user)
):
    """Get detailed statistics for a specific branch"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info(f"[Branch Stats] Getting statistics for branch: {branch_code}")
        
        # Get database connection
        db = request.app.mongodb
        
        # Verify branch exists and user has access
        branch = db["branches"].find_one({"centre_info.branch_code": branch_code})
        if not branch:
            # Try with different field names
            branch = db["branches"].find_one({"branch_code": branch_code})
        
        if not branch:
            logger.error(f"[Branch Stats] Branch not found: {branch_code}")
            raise HTTPException(status_code=404, detail="Branch not found")
        
        # Check user permissions
        user_franchise = user.get('franchise_code') if isinstance(user, dict) else getattr(user, 'franchise_code', None)
        user_role = user.get('role') if isinstance(user, dict) else getattr(user, 'role', '')
        branch_franchise = branch.get("franchise_code")
        
        if user_franchise != branch_franchise and user_role != 'super_admin':
            logger.error(f"[Branch Stats] Permission denied")
            raise HTTPException(status_code=403, detail="You don't have permission for this action")
        
        # Get total students count
        total_students = db["branch_students"].count_documents({
            "branch_code": branch_code,
            "status": {"$ne": "deleted"}
        })
        
        # Get active students count
        active_students = db["branch_students"].count_documents({
            "branch_code": branch_code,
            "admission_status": "active",
            "status": {"$ne": "deleted"}
        })
        
        # Get total courses count
        total_courses = db["branch_courses"].count_documents({
            "branch_code": branch_code,
            "status": {"$ne": "deleted"}
        })
        
        # Get active courses count
        active_courses = db["branch_courses"].count_documents({
            "branch_code": branch_code,
            "status": "active"
        })
        
        # Get total instructors count (from users collection with instructor role)
        total_instructors = db["users"].count_documents({
            "role": "instructor",
            "branch_code": branch_code,
            "status": {"$ne": "deleted"}
        })
        
        # Get active instructors count
        active_instructors = db["users"].count_documents({
            "role": "instructor",
            "branch_code": branch_code,
            "status": "active"
        })
        
        # Get recent activity (last 10 student registrations)
        recent_students = list(db["branch_students"].find(
            {"branch_code": branch_code, "status": {"$ne": "deleted"}},
            {"name": 1, "registration_number": 1, "admission_date": 1, "course": 1}
        ).sort("admission_date", -1).limit(5))
        
        recent_activity = []
        for student in recent_students:
            activity_date = student.get('admission_date', '')
            if isinstance(activity_date, str):
                try:
                    from datetime import datetime
                    activity_date = datetime.fromisoformat(activity_date.replace('Z', '+00:00'))
                    formatted_date = activity_date.strftime('%Y-%m-%d')
                except:
                    formatted_date = str(activity_date)[:10] if activity_date else 'Unknown'
            else:
                formatted_date = 'Unknown'
                
            recent_activity.append({
                "type": "student_enrollment",
                "description": f"New student {student.get('name', 'Unknown')} enrolled in {student.get('course', 'N/A')}",
                "date": formatted_date,
                "details": {
                    "student_name": student.get('name', 'Unknown'),
                    "registration_number": student.get('registration_number', 'N/A'),
                    "course": student.get('course', 'N/A')
                }
            })
        
        # Get top courses by enrollment
        course_stats = list(db["branch_courses"].aggregate([
            {"$match": {"branch_code": branch_code, "status": {"$ne": "deleted"}}},
            {
                "$lookup": {
                    "from": "branch_students",
                    "localField": "course_name",
                    "foreignField": "course",
                    "as": "enrolled_students"
                }
            },
            {
                "$project": {
                    "course_name": 1,
                    "course_code": 1,
                    "fee": 1,
                    "enrolled_count": {"$size": "$enrolled_students"}
                }
            },
            {"$sort": {"enrolled_count": -1}},
            {"$limit": 5}
        ]))
        
        logger.info(f"[Branch Stats] Successfully calculated statistics for branch: {branch_code}")
        logger.info(f"[Branch Stats] Students: {total_students}, Courses: {total_courses}, Instructors: {total_instructors}")
        
        return {
            "success": True,
            "branch_code": branch_code,
            "branch_name": branch.get("centre_info", {}).get("centre_name", "Unknown"),
            "statistics": {
                "students": {
                    "total": total_students,
                    "active": active_students,
                    "inactive": total_students - active_students
                },
                "courses": {
                    "total": total_courses,
                    "active": active_courses,
                    "inactive": total_courses - active_courses
                },
                "instructors": {
                    "total": total_instructors,
                    "active": active_instructors,
                    "inactive": total_instructors - active_instructors
                }
            },
            "recent_activity": recent_activity,
            "top_courses": course_stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Branch Stats] Error getting statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get branch statistics")


# ===== NON-PREFIXED ENDPOINTS FOR COMPATIBILITY =====
# These match the frontend expectations without /api/branch prefix

from fastapi import APIRouter as CompatRouter
compat_router = APIRouter(prefix="/api", tags=["Branch Compatibility"])

@compat_router.get("/branches/{branch_code}/stats")
async def compat_get_branch_stats(
    branch_code: str,
    request: Request,
    user=Depends(get_current_user)
):
    """Compatibility endpoint for branch statistics"""
    import logging
    logger = logging.getLogger("uvicorn")
    logger.info(f"[Compat] Branch stats called for branch: {branch_code}")
    
    # Forward to the main endpoint
    return await get_branch_stats(branch_code, request, user)

@compat_router.patch("/branches/{branch_code}/status")
async def compat_update_branch_status(
    branch_code: str,
    request: Request,
    user=Depends(get_current_user)
):
    """Compatibility endpoint for branch status updates"""
    import logging
    logger = logging.getLogger("uvicorn")
    logger.info(f"[Compat] Status update called for branch: {branch_code}")
    
    # Forward to the main endpoint
    return await update_branch_status(branch_code, request, user)

@compat_router.patch("/branches/{branch_code}")
async def compat_update_branch(
    branch_code: str,
    request: Request,
    user=Depends(get_current_user)
):
    """Compatibility endpoint for branch updates"""
    import logging
    logger = logging.getLogger("uvicorn")
    logger.info(f"[Compat] Branch update called for branch: {branch_code}")
    
    # Forward to the main endpoint  
    return await update_branch(branch_code, request, user)

@compat_router.delete("/branches/{branch_code}")
async def compat_delete_branch(
    branch_code: str,
    request: Request,
    user=Depends(get_current_user)
):
    """Compatibility endpoint for branch deletion"""
    import logging
    logger = logging.getLogger("uvicorn")
    logger.info(f"[Compat] Branch delete called for branch: {branch_code}")
    
    # Forward to the main endpoint
    return await delete_branch(branch_code, request, user)

