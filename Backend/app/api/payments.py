from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
import logging
from app.schemas.payment import ( DonationModel,
    CourseEnrollmentInit, CourseEnrollmentResponse, CourseEnrollmentVerifyRequest
)
from app.config import settings
import razorpay
from app.utils.payment import razorpay_client, verify_razorpay_signature, send_email_receipt, RAZORPAY_KEY_ID
from app.models.enrollment import get_enrollment_collection
from app.models.course import get_course_collection
from app.models.user import get_user_collection
from bson import ObjectId
from app import require_auth
from datetime import datetime
from pymongo import ReturnDocument
import uuid

def get_counter_collection(db):
    return db.get_collection("counters")

async def generate_next_transaction_id(db):
    """Generate the next sequential transaction ID."""
    counter_collection = get_counter_collection(db)
    
    # Use findOneAndUpdate to atomically increment the counter
    result = counter_collection.find_one_and_update(
        {"_id": "transaction_id"},
        {"$inc": {"sequence_value": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    
    # Get the new sequence value
    sequence_value = result.get("sequence_value", 1) if result else 1
    
    # Format the transaction ID
    return f"TXN{sequence_value:03d}"

payment_router = APIRouter(tags=["Payments"])
logger = logging.getLogger(__name__)

# Pydantic models


class FreeEnrollmentRequest(BaseModel):
    course_id: str
    student_id: Optional[str] = None  # Made optional to allow email-based lookup
    student_name: Optional[str] = None
    student_email: Optional[str] = None  # At least one of student_id or student_email required

class FreeEnrollmentResponse(BaseModel):
    success: bool
    message: str
    enrollment_id: Optional[str] = None
    transaction_id: Optional[str] = None

@payment_router.post("/enroll-free-course/", response_model=FreeEnrollmentResponse)
async def enroll_free_course(request: Request, enrollment_request: FreeEnrollmentRequest):
   
   
    try:
        db = request.app.mongodb
        enrollment_collection = get_enrollment_collection(db)
        course_collection = get_course_collection(db)
        user_collection = get_user_collection(db)
        
        # Try to get authenticated user from middleware
        authenticated_user = getattr(request.state, 'user', None)
        if authenticated_user:
            print(f"✅ Authenticated user from middleware: {authenticated_user.get('name')} ({authenticated_user.get('email')})")
        else:
            print(f"⚠️ No authenticated user in request.state")
        
        # Validate course exists
        try:
            course_id = ObjectId(enrollment_request.course_id)
        except Exception as e:
            print(f"❌ Invalid course ID format: {enrollment_request.course_id} - {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid course ID format")
        
        # Try to find course in multiple collections
        course = course_collection.find_one({"_id": course_id})
        
        # If not found in courses, try branch_courses
        if not course:
            print(f"⚠️ Course not found in 'courses', trying 'branch_courses'...")
            branch_courses = db.branch_courses
            course = branch_courses.find_one({"_id": course_id})
            
            if course:
                print(f"✅ Course found in branch_courses: {course.get('course_name', course.get('title'))}")
                # Normalize field names for branch_courses
                if 'course_name' in course and 'title' not in course:
                    course['title'] = course['course_name']
                if 'course_fee' in course and 'price' not in course:
                    course['price'] = course.get('course_fee', 0)
        
        if not course:
            print(f"❌ Course not found in any collection: {course_id}")
            raise HTTPException(status_code=404, detail="Course not found")
        
        print(f"✅ Course found: {course.get('title')} (Price: {course.get('price', 0)})")
        
        # Check if course is actually free
        if course.get("price", 0) > 0:
            print(f"❌ Course is not free: price = {course.get('price')}")
            raise HTTPException(status_code=400, detail="This course is not free")
        
        # Determine student information - priority: authenticated user > provided student_id > email lookup
        student_id = None
        student_name = enrollment_request.student_name
        student_email = enrollment_request.student_email
        
        # First, try to use authenticated user from middleware
        if authenticated_user:
            try:
                student_id = ObjectId(authenticated_user.get('user_id'))
                student_name = authenticated_user.get('name') or student_name
                student_email = authenticated_user.get('email') or student_email
                print(f"✅ Using authenticated user: {student_name} ({student_email})")
            except Exception as e:
                print(f"⚠️ Could not use authenticated user: {str(e)}")
        
        # If not authenticated, try provided student_id
        if not student_id and enrollment_request.student_id and enrollment_request.student_id != "temp_student_id":
            try:
                student_id = ObjectId(enrollment_request.student_id)
                print(f"✅ Using provided student_id: {student_id}")
            except Exception as e:
                print(f"⚠️ Invalid student_id format: {enrollment_request.student_id} - {str(e)}")
        
        # If still no student_id, try to find user by email
        if not student_id and student_email:
            user = user_collection.find_one({"email": student_email})
            if user:
                student_id = user["_id"]
                student_name = user.get("name") or student_name
                print(f"✅ Found student by email: {student_name} ({student_id})")
            else:
                print(f"❌ Student not found by email: {student_email}")
                raise HTTPException(status_code=404, detail="Student not found. Please register first.")
        
        if not student_id:
            print(f"❌ No valid student ID could be determined")
            raise HTTPException(status_code=400, detail="Valid student ID or email is required")
        
        # Check if user is already enrolled (check both student_id and email)
        print(f"🔍 Checking for existing enrollment...")
        existing_enrollment = enrollment_collection.find_one({
            "$or": [
                {"student_id": student_id, "course_id": course_id},
                {"student_email": student_email, "course_id": course_id}
            ]
        })
        
        if existing_enrollment:
            print(f"⚠️ Student already enrolled in this course")
            return FreeEnrollmentResponse(
                success=True,
                message="You are already enrolled in this course",
                enrollment_id=str(existing_enrollment["_id"]),
                transaction_id=existing_enrollment.get("transaction_id")
            )
        
        # Generate unique transaction ID for free course
        print(f"🎫 Generating transaction ID...")
        transaction_id = await generate_next_transaction_id(db)
        print(f"✅ Transaction ID generated: {transaction_id}")
        
        # Create enrollment record
        enrollment_doc = {
            "student_id": student_id,
            "student_name": student_name or "Unknown Student",
            "student_email": student_email or "",
            "course_id": course_id,
            "course_name": course.get("title", "Unknown Course"),
            "enrollment_date": datetime.now(),
            "progress": 0,
            "completed": False,
            "payment_method": "free",
            "payment_id": "FREE_ENROLLMENT",
            "order_id": f"FREE_ORDER_{transaction_id}",
            "transaction_id": transaction_id,
            "amount_paid": 0,
            "currency": "INR",
            "last_accessed": datetime.now(),
            "status": "active",
            "payment_status": "free",
            "payment_date": datetime.now()
        }
        
        print(f"📄 Creating enrollment document:")
        print(f"   - Student: {student_name} ({student_email})")
        print(f"   - Course: {course.get('title')}")
        print(f"   - Transaction ID: {transaction_id}")
        
        # Insert enrollment
        result = enrollment_collection.insert_one(enrollment_doc)
        print(f"✅ Enrollment created successfully: {result.inserted_id}")
        
        return FreeEnrollmentResponse(
            success=True,
            message=f"Successfully enrolled in {course.get('title', 'the course')}",
            enrollment_id=str(result.inserted_id),
            transaction_id=transaction_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error enrolling in free course: {str(e)}")
        logger.error(f"Traceback: {error_trace}")
        print(f"❌ Enrollment Error: {str(e)}")
        print(f"Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Failed to enroll in free course: {str(e)}")

@payment_router.get("/free-enrollments/")
async def get_free_enrollments(request: Request, student_id: Optional[str] = None, course_id: Optional[str] = None):
    try:
        db = request.app.mongodb
        enrollment_collection = get_enrollment_collection(db)
        
        # Build query for free enrollments
        query = {"payment_status": "free"}
        
        if student_id:
            query["student_id"] = ObjectId(student_id)
        
        if course_id:
            query["course_id"] = ObjectId(course_id)
        
        # Fetch enrollments sorted by enrollment date (most recent first)
        enrollments = list(enrollment_collection.find(query).sort("enrollment_date", -1))
        
        # Format the response
        formatted_enrollments = []
        for enrollment in enrollments:
            formatted_enrollment = {
                "enrollment_id": str(enrollment["_id"]),
                "student_id": str(enrollment["student_id"]),
                "student_name": enrollment.get("student_name", "Unknown Student"),
                "student_email": enrollment.get("student_email", ""),
                "course_id": str(enrollment["course_id"]),
                "course_name": enrollment.get("course_name", "Unknown Course"),
                "enrollment_date": enrollment.get("enrollment_date").isoformat() if enrollment.get("enrollment_date") else None,
                "progress": enrollment.get("progress", 0),
                "completed": enrollment.get("completed", False),
                "transaction_id": enrollment.get("transaction_id"),
                "status": enrollment.get("status", "active"),
                "last_accessed": enrollment.get("last_accessed").isoformat() if enrollment.get("last_accessed") else None
            }
            formatted_enrollments.append(formatted_enrollment)
        
        return {
            "success": True,
            "count": len(formatted_enrollments),
            "enrollments": formatted_enrollments
        }
        
    except Exception as e:
        logger.error(f"Error fetching free enrollments: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch free enrollments")

@payment_router.get("/free-enrollments/{enrollment_id}")
async def get_free_enrollment_by_id(request: Request, enrollment_id: str):
    """Get a specific free course enrollment by ID"""
    try:
        db = request.app.mongodb
        enrollment_collection = get_enrollment_collection(db)
        
        # Find the specific enrollment
        enrollment = enrollment_collection.find_one({
            "_id": ObjectId(enrollment_id),
            "payment_status": "free"
        })
        
        if not enrollment:
            raise HTTPException(status_code=404, detail="Free enrollment not found")
        
        # Format the response
        formatted_enrollment = {
            "enrollment_id": str(enrollment["_id"]),
            "student_id": str(enrollment["student_id"]),
            "student_name": enrollment.get("student_name", "Unknown Student"),
            "student_email": enrollment.get("student_email", ""),
            "course_id": str(enrollment["course_id"]),
            "course_name": enrollment.get("course_name", "Unknown Course"),
            "enrollment_date": enrollment.get("enrollment_date").isoformat() if enrollment.get("enrollment_date") else None,
            "progress": enrollment.get("progress", 0),
            "completed": enrollment.get("completed", False),
            "transaction_id": enrollment.get("transaction_id"),
            "status": enrollment.get("status", "active"),
            "last_accessed": enrollment.get("last_accessed").isoformat() if enrollment.get("last_accessed") else None,
            "payment_method": enrollment.get("payment_method", "free"),
            "amount_paid": enrollment.get("amount_paid", 0),
            "currency": enrollment.get("currency", "INR")
        }
        
        return {
            "success": True,
            "enrollment": formatted_enrollment
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching free enrollment by ID: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch free enrollment")

@payment_router.get("/razorpay-config")
async def get_razorpay_config():
    """Get Razorpay configuration for frontend"""
    return {
        "key_id": RAZORPAY_KEY_ID,
        "currency": "INR"
    }

@payment_router.post("/enroll-course/init", response_model=CourseEnrollmentResponse)
async def init_course_enrollment(request: Request, payload: CourseEnrollmentInit):
    try:
        db = request.app.mongodb
        enrollment_collection = get_enrollment_collection(db)
        course_collection = get_course_collection(db)
        
        # Validate course exists - check multiple collections
        course_id = ObjectId(payload.course_id)
        course = course_collection.find_one({"_id": course_id})
        
        # If not found in courses, try branch_courses
        if not course:
            print(f"⚠️ Course not found in 'courses', trying 'branch_courses'...")
            branch_courses = db.branch_courses
            course = branch_courses.find_one({"_id": course_id})
            
            if course:
                print(f"✅ Course found in branch_courses: {course.get('course_name', course.get('title'))}")
                # Normalize field names for branch_courses
                if 'course_name' in course and 'title' not in course:
                    course['title'] = course['course_name']
                if 'course_fee' in course and 'price' not in course:
                    course['price'] = course.get('course_fee', 0)
        
        if not course:
            print(f"❌ Course not found in any collection: {course_id}")
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Create enrollment document (pending payment)
        transaction_id = await generate_next_transaction_id(db)
        
        enrollment_doc = {
            "student_name": payload.student_name,
            "student_email": payload.student_email,
            "student_phone": payload.student_phone,
            "course_id": course_id,
            "course_name": course.get("title", "Unknown Course"),
            "amount": payload.amount,
            "currency": payload.currency,
            "provider": payload.provider,
            "status": "PENDING",
            "transaction_id": transaction_id,
            "enrollment_date": datetime.now(),
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        result = enrollment_collection.insert_one(enrollment_doc)
        enrollment_id = str(result.inserted_id)
        
        # Send acknowledgement email
        try:
            await send_email_receipt(
                payload.student_email,
                "Course enrollment initiated - SkillWallah",
                f"Dear {payload.student_name},<br><br>"
                f"Thank you for initiating enrollment in '{course.get('title')}'. "
                f"Your enrollment will be processed after payment completion.<br><br>"
                f"Amount: ₹{payload.amount}<br>"
                f"Transaction ID: {transaction_id}<br><br>"
                f"Regards,<br>SkillWallah Team"
            )
        except Exception:
            pass
        
        # Create Razorpay order
        if payload.provider == "razorpay":
            client = razorpay_client()
            order = client.order.create({
                "amount": int(payload.amount * 100),  # Razorpay expects paise
                "currency": payload.currency,
                "receipt": f"course_enrollment_{transaction_id}",
                "notes": {
                    "enrollment_id": enrollment_id,
                    "course_id": payload.course_id,
                    "student_email": payload.student_email
                }
            })
            
            # Update enrollment with order ID
            enrollment_collection.update_one(
                {"_id": result.inserted_id},
                {"$set": {"provider_order_id": order["id"], "updated_at": datetime.now()}}
            )
            
            return CourseEnrollmentResponse(
                enrollment_id=enrollment_id,
                provider="razorpay",
                razorpay_order_id=order["id"],
                razorpay_key_id=RAZORPAY_KEY_ID,
                client_secret="",
                amount=payload.amount,
                currency=payload.currency,
                course_id=payload.course_id,
                course_name=course.get("title", "Unknown Course")
            )
        
        raise HTTPException(400, "Unsupported payment provider")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating course enrollment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initiate course enrollment")

@payment_router.post("/enroll-course/verify")
async def verify_course_enrollment(request: Request, payload: CourseEnrollmentVerifyRequest):
    """Verify course enrollment payment"""
    try:
        db = request.app.mongodb
        enrollment_collection = get_enrollment_collection(db)
        course_collection = get_course_collection(db)
        
        # Find enrollment
        enrollment = enrollment_collection.find_one({"_id": ObjectId(payload.enrollment_id)})
        if not enrollment:
            raise HTTPException(404, "Enrollment not found")
        
        # Verify Razorpay payment
        if enrollment["provider"] == "razorpay":
            try:
                client = razorpay_client()
                client.utility.verify_payment_signature({
                    "razorpay_order_id": payload.order_id,
                    "razorpay_payment_id": payload.payment_id,
                    "razorpay_signature": payload.signature,
                })
                
                # Update enrollment to completed
                current_time = datetime.now()
                student_id = enrollment.get("student_id", ObjectId())  # Handle if not set
                
                enrollment_collection.update_one(
                    {"_id": ObjectId(payload.enrollment_id)},
                    {"$set": {
                        "status": "SUCCESS",
                        "payment_status": "completed",
                        "payment_id": payload.payment_id,
                        "order_id": payload.order_id,
                        "payment_date": current_time,
                        "updated_at": current_time,
                        "progress": 0,
                        "completed": False,
                        "last_accessed": current_time,
                        "payment_method": "razorpay"
                    }}
                )
                
                # Send success email
                try:
                    course = course_collection.find_one({"_id": enrollment["course_id"]})
                    # If not found in courses, try branch_courses
                    if not course:
                        branch_courses = db.branch_courses
                        course = branch_courses.find_one({"_id": enrollment["course_id"]})
                        if course and 'course_name' in course and 'title' not in course:
                            course['title'] = course['course_name']
                    await send_email_receipt(
                        enrollment["student_email"],
                        "Course enrollment successful - SkillWallah",
                        f"Dear {enrollment['student_name']},<br><br>"
                        f"Congratulations! Your enrollment in '{course.get('title') if course else 'the course'}' "
                        f"has been successfully completed.<br><br>"
                        f"Payment ID: {payload.payment_id}<br>"
                        f"Transaction ID: {enrollment.get('transaction_id')}<br>"
                        f"Amount Paid: ₹{enrollment['amount']}<br><br>"
                        f"You can now access your course content.<br><br>"
                        f"Regards,<br>SkillWallah Team"
                    )
                except Exception:
                    pass
                
                return {
                    "status": "success",
                    "enrollment_id": payload.enrollment_id,
                    "payment_id": payload.payment_id,
                    "message": "Course enrollment completed successfully"
                }
                
            except Exception as e:
                # Mark payment as failed
                enrollment_collection.update_one(
                    {"_id": ObjectId(payload.enrollment_id)},
                    {"$set": {"status": "FAILED", "updated_at": datetime.now()}}
                )
                raise HTTPException(400, f"Payment verification failed: {str(e)}")
        
        raise HTTPException(400, "Unsupported payment provider")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying course enrollment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to verify course enrollment")

@payment_router.get("/transaction")
async def get_all_transactions(request: Request, student_id: Optional[str] = None):
    try:
        db = request.app.mongodb
        enrollment_collection = get_enrollment_collection(db)

        # Build query
        query = {}
        if student_id:
            query["student_id"] = ObjectId(student_id)

        # Fetch enrollments (transactions) sorted by date
        enrollments = list(enrollment_collection.find(query).sort("enrollment_date", -1))

        # Format data to match frontend expectations for admin dashboard
        transactions = []
        for e in enrollments:
            # Format dates properly
            enrollment_date = e.get("enrollment_date")
            if enrollment_date:
                if hasattr(enrollment_date, 'strftime'):
                    date_str = enrollment_date.strftime("%d %b %Y")
                    iso_date = enrollment_date.isoformat()
                else:
                    date_str = str(enrollment_date)
                    iso_date = str(enrollment_date)
            else:
                date_str = "N/A"
                iso_date = None

            # Determine payment status for frontend display
            payment_status = e.get("payment_status", "pending")
            if payment_status in ["completed", "captured", "paid"]:
                status = "paid"
            elif payment_status == "free":
                status = "free"
            elif payment_status == "pending":
                status = "unpaid"
            else:
                status = payment_status

            transaction_data = {
                "id": str(e.get("_id")),
                "transaction_id": e.get("transaction_id", str(e.get("_id"))),
                "student_name": e.get("student_name", "Unknown Student"),
                "course_name": e.get("course_name", "Unknown Course"),
                "amount": e.get("amount_paid", 0),
                "amount_paid": e.get("amount_paid", 0),
                "date": date_str,
                "enrollment_date": iso_date,
                "payment_status": payment_status,
                "status": status,
                "payment_method": e.get("payment_method", "N/A"),
                "payment_id": e.get("payment_id", "N/A"),
                "session_id": e.get("session_id", "N/A"),
                "invoice_number": f"INV-{e.get('transaction_id', str(e.get('_id')))}", 
                "invoice_date": iso_date,
                "instructor": {
                    "name": e.get("student_name", "Unknown Student"),
                    "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40"
                }
            }
            transactions.append(transaction_data)

        return transactions

    except Exception as e:
        logger.error(f"Error fetching transactions: {e}")
        return []



