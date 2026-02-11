from app.utils.dependencies import get_authenticated_user

# --- require_auth dependency (from old middleware/auth.py) ---
from fastapi import Request, HTTPException, Response
async def require_auth(request: Request):
    return await get_authenticated_user(request)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.middleware import Middleware
from app.config import settings
import os
from pymongo import MongoClient

# --- InjectUserMiddleware (moved from middleware/inject_user.py) ---
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import HTTPException, Request
from app.utils.auth_helpers import get_current_user
import logging

logger = logging.getLogger("uvicorn")

# Safe routes that bypass authentication
SAFE_PATHS = [
    "/docs", "/openapi.json", "/auth/login", "/auth/register", "/favicon.ico",
    "/auth/student/login", "/auth/student/register", "/auth/role-based",
    "/login/student", "/register/student",  # Direct student endpoints
    "/admin/login", "/admin/register", "/admin/exists", "/api/admin/login", "/api/admin/register", "/api/admin/exists", "/api/admin/superadmin/login", "/api/admin/test", "/api/admin/dashboard",
    "/health", "/upload/avatar", "/auth/forgot-password", "/auth/login/role-based", 
    "/auth/verify-otp", "/auth/reset-password", "/auth/profile", "/auth/validate-token",  # Add validate-token endpoint
    "/uploads/", "/static/", "/public/",  # Static file access without auth
    "/course/", "/courses/", "/video-serve/",  # Course listing and video serving access without auth
    "/payments/razorpay-config", "/payments/enroll-course/init", "/payments/enroll-course/verify", 
    "/payments/enroll-free-course/", "/payments/transaction",  # Payment endpoints
    "/api/franchises",  # Franchise endpoints (GET and POST)
    "/api/branches",  # Branch endpoints (GET and POST)
    "/api/branches/dropdown",  # Branch dropdown endpoint
    "/api/branches/refresh-token",  # Token refresh endpoint
    "/api/branches/test-auth",  # Auth test endpoint
    "/api/branches/branch/login",  # Branch admin login endpoint
    "/api/branch/login",  # Branch admin login endpoint
    "/api/branch-courses/courses",  # Course listing endpoint (public)
    "/api/branch-courses/courses/dropdown",  # Course dropdown endpoint
    "/api/branch-batches/batches/dropdown",  # Batch dropdown endpoint
    "/api/branch-batches/batches",  # Batch listing endpoint (public for dashboard)
    "/api/branch-batches/debug/branch",  # Batch debug endpoint
    "/api/branch-students/students",  # Student listing endpoint (public for dashboard)
    "/api/branch-programs/programs",  # Program listing endpoint (public for dashboard)
    "/api/branch-subjects/subjects",  # Subject listing endpoint (public for dashboard)
    "/api/branch-study-materials/materials",  # Study materials endpoint (public for dashboard)
    "/api/agreements",  # Agreement endpoints
    "/api/agreement-uploads",  # Agreement upload endpoints
    "/api/agreement-validity",  # Agreement validity endpoints
    "/api/ledger",  # Ledger endpoints
    "/api/syllabuses",  # Syllabuses endpoints
    "/api/syllabuses/upload",  # Syllabuses upload endpoint
    "/api/syllabuses/",  # Syllabuses CRUD endpoints
    "/api/upload-logo", "/api/delete-logo",  # Logo upload endpoints
    "/partnership_request", "/partnership_requests",  # Partnership form submission endpoints
    "/api/utility/states", "/api/utility/states/names"  # Utility endpoints for common data
    "/api/utility/states",  # Utility endpoints for states and other public data
]

class InjectUserMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method
        
        # Reduced logging for performance - only log important events
        logger = logging.getLogger("uvicorn")
        auth_header = request.headers.get("Authorization")

        # Always allow OPTIONS requests (CORS preflight)
        if method == "OPTIONS":
            return await call_next(request)
            return await call_next(request)


        # Check if path starts with any of the safe prefixes
        if any(path.startswith(safe) for safe in SAFE_PATHS) or any(safe.rstrip('/') in path for safe in ["/uploads/", "/static/", "/public/"]):
            # For safe paths, try to inject user if token is provided but don't block on failure
            request.state.user = None
            if auth_header and auth_header.startswith("Bearer "):
                try:
                    user = await get_current_user(request)
                    request.state.user = user
                except:
                    # Silently fail for safe paths
                    request.state.user = None
            
            # Always proceed for safe paths regardless of auth result
            return await call_next(request)

        # For protected paths, authenticate
        try:
            user = await get_current_user(request)
            request.state.user = user
        except HTTPException as e:
            request.state.user = None
            if path not in ["/health", "/", "/docs", "/openapi.json"]:
                logger.warning(f"[Auth failed] {method} {path}: {e.detail}")

        response = await call_next(request)
        return response
from app.api.auth import auth_router
from app.api.courses import course_router
from app.api.modules import module_router, direct_module_router
from app.api.lessons import lesson_router
from app.api.assignments import assignment_router, student_assignment_router, api_assignment_router
from app.api.submissions import submission_router
from app.api.reviews import review_router
from app.api.franchise import router as franchise_router
from app.api.quizzes import quiz_router
from app.api.questions import question_router
from app.api.attempts import attempt_router
from app.api.dashboard import dashboard_router
# from app.api.leaderboard import leaderboard_router - REMOVED: not used in frontend
from app.api.notifications import notification_router, api_notification_router
from app.api.messages import messages_router, api_messages_router

from app.api.instructor import instructor_router
from app.api.users import user_router
from app.api.recordings import recording_router
from app.api.profile import profile_router
from app.api.profile_upload import profile_upload_router
from app.api.profile_management import profile_management_router
from app.api.admin import admin_router
from app.api.branch import router as branch_router
from app.api.branch_courses import router as branch_courses_router
from app.api.branch_student import router as branch_student_router
from app.api.branch_batches import router as branch_batches_router
from app.api.branch_subject import router as branch_subject_router
from app.api.branch_study_materials import router as branch_study_materials_router
from app.api.branch_program import router as branch_program_router
from app.api.branch_certificates import router as branch_certificates_router
from app.api.branch_paper_sets import router as branch_paper_sets_router
from app.api.branch_results import router as branch_results_router
from app.api.branch_assesments import router as branch_assessments_router
from app.api.branch_student_dashboard import branch_student_dashboard_router
from app.api.image_service import router as image_service_router
# from app.api.debug import debug_router  # Temporarily disabled
from app.api.learning_paths import learning_path_router
from app.api.notices import notice_router
from app.api.upload import upload_router
from app.api.feedback import feedback_router
from app.api.enrollment import enrollment_router
from app.api.enquiry import enquiry_router
from app.api.support import support_router
from app.api.payments import payment_router
from app.api.lectures import lecture_router
from app.api.pdf_materials import pdf_material_router
from app.api.connect import connect_router
from app.api.partnership import router as partnership_router
from app.api.progress import progress_router
from app.api.video_serve import router as video_serve_router
from app.api.agreement_routes import router as agreement_router
from app.api.agreement_upload_routes import router as agreement_upload_router
from app.api.agreement_validity_routes import router as agreement_validity_router
from app.api.students import students_router
from app.api.ledger_routes import router as ledger_router
from app.api.file_upload import router as file_upload_router
from app.api.syllabuses import router as syllabuses_router
from app.api.utility import router as utility_router

# Create FastAPI app first
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend APIs for LMS platform",
    version=settings.VERSION,
)

# Add CORS middleware FIRST (this is critical for proper CORS handling)
# Define allowed origins for production
allowed_origins = [
    "http://localhost:4000",
    "http://localhost:4000:3000", 
    "http://localhost:3000",
    "http://localhost:6788",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:6788"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Use specific origins for production
    allow_credentials=True,  # Allow credentials for authentication
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],  # Specific methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],  # Expose all headers
    max_age=600,  # Cache preflight requests for 10 minutes
)

# Add other middleware AFTER CORS
app.add_middleware(InjectUserMiddleware)

# Initialize MongoDB client with fallback
client = None
db = None

try:
    # Try cloud MongoDB first
    client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')  # Test connection
    db = client[settings.DB_NAME]
    print("✅ Connected to cloud MongoDB")
    # Print which URI we connected to (masked) for easier debugging
    try:
        uri = settings.MONGO_URI
        if "@" in uri:
            parts = uri.split("@")
            host = parts[-1]
            scheme = parts[0].split("://")[0]
            masked = f"{scheme}://***@{host}"
        else:
            masked = (uri[:40] + "...") if len(uri) > 40 else uri
        print(f"Connected to MongoDB URI: {masked}, DB: {settings.DB_NAME}")
    except Exception:
        print("Connected to MongoDB (unable to show URI)")
except Exception as e:
    print(f"❌ Cloud MongoDB connection failed: {e}")
    try:
        # Fallback to local MongoDB
        client = MongoClient(settings.MONGO_LOCAL_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')  # Test connection
        db = client[settings.DB_NAME]
        print("✅ Connected to local MongoDB")
        print(f"Connected to MongoDB URI: {settings.MONGO_LOCAL_URI}, DB: {settings.DB_NAME}")
    except Exception as local_e:
        print(f"❌ Local MongoDB connection also failed: {local_e}")
        print("⚠️ WARNING: No database connection available!")

# Store both client and database in app for global access
app.mongodb_client = client
app.mongodb = db

# Create database indexes for optimization (only if db is connected)
if db is not None:
    try:
        from app.utils.db_optimizer import create_database_indexes
        print("📊 Creating database indexes for optimization...")
        create_database_indexes(db)
    except Exception as idx_err:
        print(f"⚠️ Warning: Could not create indexes: {idx_err}")

# Mount static files for recordings
static_path = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_path), name="static")

# Mount uploads directory for file access
uploads_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
if not os.path.exists(uploads_path):
    os.makedirs(uploads_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

# Mount public directory for HTML test files
public_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")
if os.path.exists(public_path):
    app.mount("/public", StaticFiles(directory=public_path), name="public")

# Load routers
app.include_router(auth_router)

# Add compatibility route for /auth/login
@app.post("/auth/login")
async def auth_login_compatibility(request: Request, credentials: dict):
    """Compatibility endpoint for /auth/login - uses same logic as /api/auth/login"""
    from app.schemas.auth import UserLogin
    from app.models.user import get_user_collection
    from fastapi import HTTPException
    
    try:
        print(f"[DEBUG] /auth/login compatibility endpoint called - Email: {credentials.get('email')}")
        
        # Convert dict to UserLogin schema
        user_login = UserLogin(**credentials)
        
        db = request.app.mongodb
        user_collection = get_user_collection(db)
        
        # Check if user exists
        user = user_collection.find_one({"email": user_login.email})
        print(f"[DEBUG] User found: {bool(user)}")
        
        if not user:
            print(f"[DEBUG] No user found with email: {user_login.email}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user_role = user.get('role', 'student')
        print(f"[DEBUG] User role: {user_role}")
        
        # Use existing login service for password verification and token generation
        from app.services.auth_service import login_user
        result = login_user(db, user_login)
        
        # Add role-specific information
        result["user"]["dashboard_route"] = f"/{user_role}" if user_role else "/student"
        result["message"] = "Login successful"
        
        print(f"✅ Login successful for {user_login.email} as {user_role}")
        
        return result
        
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"❌ /auth/login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")

app.include_router(user_router)
app.include_router(course_router)
app.include_router(module_router)
app.include_router(direct_module_router)
app.include_router(lesson_router)
app.include_router(assignment_router)
app.include_router(student_assignment_router)
app.include_router(api_assignment_router)
app.include_router(submission_router)
app.include_router(review_router)
app.include_router(quiz_router)
app.include_router(question_router, prefix="/api")
app.include_router(attempt_router)
app.include_router(dashboard_router)
# app.include_router(leaderboard_router) - REMOVED: leaderboard not used in frontend
app.include_router(notification_router)
app.include_router(api_notification_router)
app.include_router(messages_router)
app.include_router(api_messages_router)
app.include_router(instructor_router)
app.include_router(recording_router)
app.include_router(profile_router)
app.include_router(profile_upload_router)
app.include_router(profile_management_router)
app.include_router(admin_router)
app.include_router(branch_router)
app.include_router(branch_courses_router)
app.include_router(branch_student_router)
app.include_router(branch_batches_router)
app.include_router(branch_subject_router)
app.include_router(branch_study_materials_router)
app.include_router(branch_program_router)
app.include_router(branch_certificates_router)
app.include_router(branch_paper_sets_router)
app.include_router(branch_results_router)
app.include_router(branch_assessments_router)
app.include_router(branch_student_dashboard_router)
app.include_router(image_service_router)
# app.include_router(debug_router)  # Temporarily disabled
app.include_router(learning_path_router)
app.include_router(notice_router)
app.include_router(upload_router)
app.include_router(feedback_router)
app.include_router(enrollment_router)
app.include_router(enquiry_router)
app.include_router(support_router)
app.include_router(payment_router, prefix="/payments")
app.include_router(lecture_router)
app.include_router(pdf_material_router)
app.include_router(connect_router)
app.include_router(partnership_router)  
app.include_router(progress_router)
app.include_router(video_serve_router)
app.include_router(franchise_router) 
app.include_router(agreement_router)  # agreement router
app.include_router(agreement_upload_router)  # agreement upload router
app.include_router(agreement_validity_router)  # agreement validity router
app.include_router(students_router)  # students enrolled courses router
app.include_router(ledger_router, prefix="/api/ledger")  # ledger router
app.include_router(file_upload_router, prefix="/api")  # file upload router
app.include_router(syllabuses_router)  # syllabuses router
app.include_router(utility_router)  # utility router for common data
app.include_router(utility_router)  # utility router for states and other data
from app.api.agora import router as live_session_router
app.include_router(live_session_router, prefix="/api/live-sessions", tags=["Live Sessions"])

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the Skillwallah API"}

@app.get("/health", tags=["Health"])
@app.head("/health", tags=["Health"])
async def health_check(request: Request):
    """Health check endpoint with database status (supports GET and HEAD methods)"""
    try:
        db = request.app.mongodb
        # Try to ping the database
        if hasattr(db, 'command'):
            db.command("ping")
            db_status = "connected"
        else:
            db_status = "mock_mode"
    except Exception as e:
        db_status = f"disconnected: {str(e)}"
    
    response_data = {
        "status": "healthy",
        "database": db_status,
        "message": "Skillwallah API is running"
    }
    
    # For HEAD requests, return empty body but with correct status
    if request.method == "HEAD":
        return Response(status_code=200)
    
    return response_data

# Duplicate health endpoint removed - using the one above that supports both GET and HEAD

# Direct branches dropdown endpoint for compatibility (without /api/branch prefix)
@app.get("/api/branches/dropdown")
async def direct_branches_dropdown(request: Request):
    """Get simplified branch data for dropdown selections - No authentication required"""
    import logging
    logger = logging.getLogger("uvicorn")
    
    try:
        logger.info("[BRANCHES DROPDOWN] Getting branch dropdown data - Direct endpoint")
        
        db = request.app.mongodb
        
        # Count branches first
        total_count = db["branches"].count_documents({})
        logger.info(f"[BRANCHES DROPDOWN] Total branches available: {total_count}")
        
        # Get only essential data for dropdowns from branches collection
        branches = list(db["branches"].find(
            {},
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
            
            dropdown_data.append({
                "id": str(branch["_id"]),
                "value": actual_branch_code,
                "label": centre_name or "Unknown Branch",
                "code": actual_branch_code,
                "branch_code": actual_branch_code,
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
            "options": dropdown_data
        }
        
    except Exception as e:
        logger.error(f"[BRANCHES DROPDOWN] Error getting dropdown data: {str(e)}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Failed to fetch branch dropdown data")

# Direct student login endpoint for compatibility
@app.post("/login/student")
async def direct_student_login(request: Request, credentials: dict):
    """Direct student login endpoint without prefix - supports both regular and branch students"""
    print(f"\n[DIRECT_LOGIN] Student login request received at /login/student")
    print(f"[DIRECT_LOGIN] Email: {credentials.get('email')}")
    
    # Import required modules
    from app.schemas.auth import UserLogin
    from app.services.auth_service import login_user, create_access_token, create_refresh_token
    from app.models.user import get_user_collection
    from fastapi import HTTPException
    import bcrypt
    from datetime import datetime
    
    try:
        # Parse credentials
        user_login = UserLogin(email=credentials["email"], password=credentials["password"])
        db = request.app.mongodb
        
        # Check if database connection is available
        if db is None:
            print(f"[DIRECT_LOGIN] ✗ Database connection not available")
            raise HTTPException(
                status_code=503,
                detail="Database connection not available. Please try again later."
            )
        
        # FIRST: Check branch_students collection
        print(f"[DIRECT_LOGIN] Checking branch_students collection...")
        # Try both email field names for compatibility
        branch_student = db.branch_students.find_one({"email": user_login.email})
        if not branch_student:
            branch_student = db.branch_students.find_one({"email_id": user_login.email})
        
        if branch_student:
            print(f"[DIRECT_LOGIN] ✓ Branch student found: {branch_student.get('student_name')}")
            
            # Verify password
            # Get password - check both password_hash and password fields
            password_hash = branch_student.get('password_hash') or branch_student.get('password')
            if not password_hash:
                print(f"[DIRECT_LOGIN] ✗ No password found for student")
                print(f"[DIRECT_LOGIN] Student record: {branch_student.get('_id')}")
                print(f"[DIRECT_LOGIN] Available fields: {list(branch_student.keys())}")
                raise HTTPException(
                    status_code=401, 
                    detail="Password not set for this account. Please contact your administrator to set up your password."
                )
            
            try:
                # Check if password is hashed or plain text (like branch_admin login)
                if password_hash.startswith("$2b$") or password_hash.startswith("$2a$"):
                    # Hashed password - verify with bcrypt
                    password_bytes = user_login.password.encode('utf-8')
                    hashed_bytes = password_hash.encode('utf-8')
                    password_valid = bcrypt.checkpw(password_bytes, hashed_bytes)
                    print(f"[DIRECT_LOGIN] Bcrypt verification: {password_valid}")
                else:
                    # Plain text password - direct comparison (temporary fallback)
                    password_valid = (user_login.password == password_hash)
                    print(f"[DIRECT_LOGIN] Plain text comparison: {password_valid}")
                    
                    # If plain text matches, hash and update for security
                    if password_valid:
                        print(f"[DIRECT_LOGIN] Upgrading plain text password to hashed...")
                        new_hash = bcrypt.hashpw(user_login.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                        db.branch_students.update_one(
                            {"_id": branch_student["_id"]},
                            {"$set": {"password_hash": new_hash}}
                        )
                        print(f"[DIRECT_LOGIN] Password upgraded to bcrypt hash")
                
                print(f"[DIRECT_LOGIN] Password verification: {password_valid}")
                print(f"[DIRECT_LOGIN] Input password length: {len(user_login.password)}")
                print(f"[DIRECT_LOGIN] Hash format: {password_hash[:10]}...")
            except Exception as e:
                print(f"[DIRECT_LOGIN] Password verification error: {e}")
                password_valid = False
            
            if not password_valid:
                print(f"[DIRECT_LOGIN] ✗ Invalid password")
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            # Check login enabled (default to True if not set)
            if not branch_student.get('login_enabled', True):
                print(f"[DIRECT_LOGIN] ✗ Login disabled")
                raise HTTPException(status_code=403, detail="Login access is disabled")
            
            print(f"[DIRECT_LOGIN] ✓ Authentication successful - creating tokens...")
            
            # Update last login
            db.branch_students.update_one(
                {"_id": branch_student["_id"]},
                {"$set": {"last_login": datetime.utcnow().isoformat()}}
            )
            
            # Create tokens
            access_token = create_access_token({
                "user_id": str(branch_student["_id"]),
                "email": branch_student.get("email", branch_student.get("email_id")),
                "role": "student",
                "name": branch_student.get("name", branch_student.get("student_name")),
                "branch_code": branch_student.get("branch_code"),
                "franchise_code": branch_student.get("franchise_code"),
                "is_branch_student": True
            })
            
            refresh_token = create_refresh_token({
                "user_id": str(branch_student["_id"])
            })
            
            print(f"[DIRECT_LOGIN] ✓ Login successful for branch student")
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "user": {
                    "id": str(branch_student["_id"]),
                    "_id": str(branch_student["_id"]),
                    "name": branch_student.get("name", branch_student.get("student_name")),
                    "email": branch_student.get("email", branch_student.get("email_id")),
                    "role": "student",
                    "branch_code": branch_student.get("branch_code"),
                    "franchise_code": branch_student.get("franchise_code"),
                    "registration_number": branch_student.get("registration_number"),
                    "student_id": branch_student.get("student_id"),
                    "course": branch_student.get("course_name", branch_student.get("course")),
                    "batch": branch_student.get("batch", branch_student.get("batch_name")),
                    "contact_number": branch_student.get("contact_number"),
                    "is_branch_student": True,
                    "dashboard_route": "/students",
                    "permissions": [
                        "view_courses", "enroll_courses", "submit_assignments",
                        "take_quizzes", "view_certificates"
                    ]
                },
                "message": "Login successful"
            }
        
        # SECOND: If not a branch student, check regular users collection
        print(f"[DIRECT_LOGIN] Not found in branch_students, checking users collection...")
        
        # Check if user exists at all before trying to login
        user_collection = get_user_collection(db)
        user = user_collection.find_one({"email": user_login.email})
        
        if not user:
            print(f"[DIRECT_LOGIN] ✗ No user found with email: {user_login.email}")
            raise HTTPException(
                status_code=404, 
                detail="No account found with this email address. Please check your email or contact your administrator."
            )
        
        if user.get("role") != "student":
            print(f"[DIRECT_LOGIN] ✗ User found but not a student, role: {user.get('role')}")
            raise HTTPException(
                status_code=403, 
                detail="This account is not a student account. Please use the appropriate login page for your role."
            )
        
        # Try to login as regular student
        result = login_user(db, user_login)
        print(f"[DIRECT_LOGIN] ✓ Regular student login successful")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DIRECT_LOGIN] Error: {str(e)}")
        import traceback
        print(f"[DIRECT_LOGIN] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")

# ========== STARTUP EVENT ==========
@app.on_event("startup")
async def startup_event():
    """Create default admin user if none exists"""
    try:
        from app.models.user import get_user_collection
        from app.services.auth_service import hash_password
        from pymongo import MongoClient
        import os
        
        # Connect to MongoDB
        mongodb_url = os.getenv("MONGODB_URL", "mongodb+srv://nkkashyap2001:bhoomi1234@cluster0.frywq.mongodb.net/lms")
        client = MongoClient(mongodb_url)
        db = client.get_default_database()
        
        user_collection = get_user_collection(db)
        
        # Check if any admin user exists
        admin_exists = user_collection.find_one({"role": "admin"})
        
        if not admin_exists:
            print("[STARTUP] No admin user found, creating default admin...")
        else:
            print(f"[STARTUP] ✅ Admin user already exists: {admin_exists.get('email')}")
            
    except Exception as e:
        print(f"[STARTUP] ❌ Error creating default admin: {e}")
