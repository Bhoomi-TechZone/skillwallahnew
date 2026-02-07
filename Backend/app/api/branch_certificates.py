from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import FileResponse
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import os
from app.services.id_card_service import generate_id_card_image
import logging
from app.utils.auth_helpers_enhanced import get_current_user
from app.utils.multi_tenant import MultiTenantManager
from pydantic import BaseModel


# Configure logger
logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/branch-certificates", tags=["Branch Certificate & Card Management"])


class IDCardCreate(BaseModel):
    student_id: str
    card_type: str = "student"
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    card_number: Optional[str] = None
    status: str = "active"


class IDCardResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    student_registration: str
    card_type: str
    issue_date: str
    expiry_date: Optional[str] = None
    card_number: str
    file_path: Optional[str] = None
    photo_url: Optional[str] = None
    status: str
    branch_code: str
    franchise_code: str
    created_at: str


@router.get("/download/{document_type}/{document_id}")
async def download_document(
    document_type: str,
    document_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        context = multi_tenant.get_branch_context(current_user)
        
        collection_map = {
            "certificate": "branch_certificates",
            "marksheet": "branch_marksheets",
            "idcard": "branch_id_cards",
            "admitcard": "branch_admit_cards"
        }
        
        if document_type not in collection_map:
            raise HTTPException(status_code=400, detail="Invalid document type")
        
        collection_name = collection_map[document_type]
        document = db[collection_name].find_one({
            "_id": ObjectId(document_id),
            "franchise_code": context["franchise_code"]
        })
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        file_path = document.get("file_path")
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Document file not found")
        
        filename = os.path.basename(file_path)
        return FileResponse(path=file_path, filename=filename, media_type='application/pdf')
        
    except Exception as e:
        print(f"Error downloading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/id-cards", response_model=IDCardResponse)
async def generate_id_card(
    id_card_data: IDCardCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        context = multi_tenant.get_branch_context(current_user)
        
        student = db.branch_students.find_one({
            "_id": ObjectId(id_card_data.student_id),
            "franchise_code": context["franchise_code"]
        })
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        card_number = id_card_data.card_number
        if not card_number:
            card_count = db.branch_id_cards.count_documents({"franchise_code": context["franchise_code"]})
            card_number = f"ID{context['franchise_code']}{card_count + 1:04d}"
        
        course_name = "N/A"
        course_duration = "N/A"
        if student.get("course_id"):
            course = db.branch_courses.find_one({
                "_id": ObjectId(student["course_id"]),
                "franchise_code": context["franchise_code"]
            })
            if course:
                course_name = course.get("course_name", "N/A")
                course_duration = course.get("duration", "N/A")
        
        id_card_doc = {
            "_id": ObjectId(),
            "student_id": id_card_data.student_id,
            "student_name": student["name"],
            "student_registration": student["registration_number"],
            "card_type": id_card_data.card_type,
            "issue_date": id_card_data.issue_date or datetime.now().strftime("%Y-%m-%d"),
            "expiry_date": id_card_data.expiry_date,
            "card_number": card_number,
            "status": id_card_data.status,
            "franchise_code": context["franchise_code"],
            "branch_code": context["branch_code"],
            "created_at": datetime.utcnow().isoformat(),
            "created_by": context["user_id"]
        }
        
        id_card_dir = f"uploads/id_cards/{context['franchise_code']}"
        os.makedirs(id_card_dir, exist_ok=True)
        
        image_filename = f"id_card_{card_number}.png"
        image_path = os.path.join(id_card_dir, image_filename)
        
        branch_info = {}
        branch = db.branches.find_one({"franchise_code": context["franchise_code"]})
        if branch:
            branch_info = branch.get("centre_info", {})
        
        student_card_data = {
            "student_name": student["name"],
            "student_registration": student["registration_number"],
            "course_name": course_name,
            "course_duration": course_duration,
            "contact_number": student.get("contact_number", student.get("phone", "")),
            "photo_url": student.get("profile_photo")
        }
        
        if generate_id_card_image(student_card_data, branch_info, image_path):
            id_card_doc["file_path"] = image_path
            id_card_doc["photo_url"] = image_path
        
        result = db.branch_id_cards.insert_one(id_card_doc)
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to generate ID card")
        
        return IDCardResponse(
            id=str(result.inserted_id),
            student_id=id_card_data.student_id,
            student_name=student["name"],
            student_registration=student["registration_number"],
            card_type=id_card_data.card_type,
            issue_date=id_card_doc["issue_date"],
            expiry_date=id_card_data.expiry_date,
            card_number=card_number,
            file_path=image_path if os.path.exists(image_path) else None,
            photo_url=image_path if os.path.exists(image_path) else None,
            status=id_card_data.status,
            branch_code=context["branch_code"],
            franchise_code=context["franchise_code"],
            created_at=id_card_doc["created_at"]
        )
        
    except Exception as e:
        print(f"Error generating ID card: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/id-cards", response_model=List[IDCardResponse])
async def get_id_cards(
    request: Request,
    student_id: Optional[str] = None,
    card_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        context = multi_tenant.get_branch_context(current_user)
        
        filter_query = {"franchise_code": context["franchise_code"]}
        
        if student_id:
            filter_query["student_id"] = student_id
        if card_type:
            filter_query["card_type"] = card_type
        if status:
            filter_query["status"] = status
        
        id_cards_cursor = db.branch_id_cards.find(filter_query)
        id_cards = []
        
        for card in id_cards_cursor:
            id_cards.append(IDCardResponse(
                id=str(card["_id"]),
                student_id=card["student_id"],
                student_name=card["student_name"],
                student_registration=card["student_registration"],
                card_type=card["card_type"],
                issue_date=card["issue_date"],
                expiry_date=card.get("expiry_date"),
                card_number=card["card_number"],
                file_path=card.get("file_path"),
                photo_url=card.get("photo_url"),
                status=card["status"],
                branch_code=card["branch_code"],
                franchise_code=card["franchise_code"],
                created_at=card["created_at"]
            ))
        
        return id_cards
        
    except Exception as e:
        print(f"Error fetching ID cards: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/id-cards/{card_id}")
async def get_id_card_image(
    card_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        context = multi_tenant.get_branch_context(current_user)
        
        id_card = db.branch_id_cards.find_one({
            "_id": ObjectId(card_id),
            "franchise_code": context["franchise_code"]
        })
        
        if not id_card:
            raise HTTPException(status_code=404, detail="ID card not found")
        
        file_path = id_card.get("file_path")
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="ID card image not found")
        
        filename = f"id_card_{id_card['card_number']}.png"
        return FileResponse(path=file_path, filename=filename, media_type='image/png')
        
    except Exception as e:
        print(f"Error downloading ID card: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/summary")
async def get_certificates_marksheets_stats(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        context = multi_tenant.get_branch_context(current_user)
        
        cert_pipeline = [
            {"$match": {"franchise_code": context["franchise_code"]}},
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": 1},
                    "issued": {"$sum": {"$cond": [{"$eq": ["$status", "issued"]}, 1, 0]}},
                    "generated": {"$sum": {"$cond": [{"$eq": ["$status", "generated"]}, 1, 0]}},
                    "cancelled": {"$sum": {"$cond": [{"$eq": ["$status", "cancelled"]}, 1, 0]}}
                }
            }
        ]
        
        cert_stats = list(db.branch_certificates.aggregate(cert_pipeline))
        cert_result = cert_stats[0] if cert_stats else {"total": 0, "issued": 0, "generated": 0, "cancelled": 0}
        
        marksheet_pipeline = [
            {"$match": {"franchise_code": context["franchise_code"]}},
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": 1},
                    "published": {"$sum": {"$cond": [{"$eq": ["$status", "published"]}, 1, 0]}},
                    "draft": {"$sum": {"$cond": [{"$eq": ["$status", "draft"]}, 1, 0]}},
                    "withheld": {"$sum": {"$cond": [{"$eq": ["$status", "withheld"]}, 1, 0]}}
                }
            }
        ]
        
        marksheet_stats = list(db.branch_marksheets.aggregate(marksheet_pipeline))
        marksheet_result = marksheet_stats[0] if marksheet_stats else {"total": 0, "published": 0, "draft": 0, "withheld": 0}
        
        students_with_certs = db.branch_certificates.distinct("student_id", {"franchise_code": context["franchise_code"]})
        students_with_marksheets = db.branch_marksheets.distinct("student_id", {"franchise_code": context["franchise_code"]})
        unique_students = len(set(students_with_certs + students_with_marksheets))
        
        results_pipeline = [
            {"$match": {"franchise_code": context["franchise_code"]}},
            {
                "$group": {
                    "_id": None,
                    "total_results": {"$sum": 1},
                    "passed": {"$sum": {"$cond": [{"$eq": ["$status", "pass"]}, 1, 0]}}
                }
            }
        ]
        
        results_stats = list(db.branch_results.aggregate(results_pipeline))
        success_rate = 0
        if results_stats and results_stats[0]["total_results"] > 0:
            success_rate = round((results_stats[0]["passed"] / results_stats[0]["total_results"]) * 100, 1)
        
        return {
            "certificates": {"total": cert_result["total"], "issued": cert_result["issued"], "draft": cert_result["generated"], "cancelled": cert_result["cancelled"]},
            "marksheets": {"total": marksheet_result["total"], "published": marksheet_result["published"], "draft": marksheet_result["draft"], "withheld": marksheet_result["withheld"]},
            "students_covered": unique_students,
            "success_rate": success_rate
        }
        
    except Exception as e:
        print(f"Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/certificates/{certificate_id}")
async def delete_certificate(
    certificate_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        context = multi_tenant.get_branch_context(current_user)
        
        result = db.branch_certificates.delete_one({
            "_id": ObjectId(certificate_id),
            "franchise_code": context["franchise_code"]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Certificate not found")
        
        return {"message": "Certificate deleted successfully"}
        
    except Exception as e:
        print(f"Error deleting certificate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/marksheets/{marksheet_id}")
async def delete_marksheet(
    marksheet_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    try:
        db = request.app.mongodb
        multi_tenant = MultiTenantManager(db)
        context = multi_tenant.get_branch_context(current_user)
        
        result = db.branch_marksheets.delete_one({
            "_id": ObjectId(marksheet_id),
            "franchise_code": context["franchise_code"]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Marksheet not found")
        
        return {"message": "Marksheet deleted successfully"}
        
    except Exception as e:
        print(f"Error deleting marksheet: {e}")
        raise HTTPException(status_code=500, detail=str(e))
