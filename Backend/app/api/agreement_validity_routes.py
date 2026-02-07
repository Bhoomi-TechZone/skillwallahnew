from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter(prefix="/api/agreement-validity", tags=["Agreement Validity"])

def validity_helper(data: dict) -> dict:
    return {
        "franchiseName": data["franchiseName"],
        "agreementNumber": data.get("agreementNumber"),
        "franchiseId": data["franchiseId"],
        "startDate": data["startDate"],
        "endDate": data["endDate"],
        "autoRenewal": data.get("autoRenewal", False),
        "status": data.get("status", "Active"),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }

def calculate_days_remaining(end_date):
    """Calculate days remaining from today to end date"""
    if isinstance(end_date, str):
        end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    today = datetime.now()
    if hasattr(end_date, 'date'):
        end_date = end_date.date()
        today = today.date()
    
    diff = (end_date - today).days
    return diff

def determine_status(days_remaining):
    """Determine status based on days remaining"""
    if days_remaining < 0:
        return "Expired"
    elif days_remaining <= 30:
        return "Expiring Soon"
    elif days_remaining <= 90:
        return "Renewal Due"
    else:
        return "Active"

@router.get("/")
def get_agreement_validity_data(request: Request):
    """Get all agreements with validity information"""
    db = request.app.mongodb
    validity_data = []
    
    # Get all agreements from the agreements collection
    for agreement in db.agreements.find().sort("endDate", 1):
        # Get franchise details
        franchise = None
        if agreement.get("franchiseId"):
            franchise = db.franchises.find_one({"_id": ObjectId(agreement["franchiseId"])})
        
        # Calculate days remaining
        days_remaining = calculate_days_remaining(agreement["endDate"])
        status = determine_status(days_remaining)
        
        validity_item = {
            "_id": str(agreement["_id"]),
            "franchiseName": agreement["franchiseName"],
            "agreementNumber": agreement.get("agreementNumber", f"AGR-{str(agreement['_id'])[-6:]}"),
            "franchiseId": agreement.get("franchiseId"),
            "startDate": agreement["startDate"],
            "endDate": agreement["endDate"],
            "autoRenewal": agreement.get("autoRenewal", False),
            "status": status,
            "daysRemaining": days_remaining,
            "renewalRequired": days_remaining <= 90 or days_remaining < 0,
            "createdAt": agreement.get("createdAt"),
            "updatedAt": agreement.get("updatedAt", agreement.get("createdAt"))
        }
        validity_data.append(validity_item)
    
    return {
        "success": True,
        "data": validity_data
    }

@router.get("/{agreement_id}")
def get_agreement_validity_by_id(request: Request, agreement_id: str):
    """Get specific agreement validity information"""
    db = request.app.mongodb
    agreement = db.agreements.find_one({"_id": ObjectId(agreement_id)})
    
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    
    # Get franchise details
    franchise = None
    if agreement.get("franchiseId"):
        franchise = db.franchises.find_one({"_id": ObjectId(agreement["franchiseId"])})
    
    # Calculate days remaining
    days_remaining = calculate_days_remaining(agreement["endDate"])
    status = determine_status(days_remaining)
    
    validity_item = {
        "_id": str(agreement["_id"]),
        "franchiseName": agreement["franchiseName"],
        "agreementNumber": agreement.get("agreementNumber", f"AGR-{str(agreement['_id'])[-6:]}"),
        "franchiseId": agreement.get("franchiseId"),
        "startDate": agreement["startDate"],
        "endDate": agreement["endDate"],
        "autoRenewal": agreement.get("autoRenewal", False),
        "status": status,
        "daysRemaining": days_remaining,
        "renewalRequired": days_remaining <= 90 or days_remaining < 0,
        "createdAt": agreement.get("createdAt"),
        "updatedAt": agreement.get("updatedAt", agreement.get("createdAt"))
    }
    
    return {
        "success": True,
        "data": validity_item
    }

@router.post("/{agreement_id}/renew")
def renew_agreement(request: Request, agreement_id: str, renewal_data: dict):
    """Renew an agreement by extending the end date"""
    db = request.app.mongodb
    
    # Get current agreement
    agreement = db.agreements.find_one({"_id": ObjectId(agreement_id)})
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    
    # Calculate new end date
    renewal_years = renewal_data.get("renewalPeriodYears", 2)
    current_end_date = datetime.fromisoformat(agreement["endDate"]) if isinstance(agreement["endDate"], str) else agreement["endDate"]
    new_end_date = current_end_date + timedelta(days=365 * renewal_years)
    
    # Update agreement
    update_data = {
        "endDate": new_end_date.isoformat() if hasattr(new_end_date, 'isoformat') else str(new_end_date),
        "status": "Active",
        "updatedAt": datetime.utcnow(),
        "renewalHistory": {
            "renewedAt": datetime.utcnow(),
            "renewalPeriod": renewal_years,
            "previousEndDate": agreement["endDate"]
        }
    }
    
    result = db.agreements.update_one(
        {"_id": ObjectId(agreement_id)},
        {
            "$set": update_data,
            "$push": {
                "renewals": {
                    "renewedAt": datetime.utcnow(),
                    "renewalPeriod": renewal_years,
                    "previousEndDate": agreement["endDate"],
                    "newEndDate": new_end_date.isoformat() if hasattr(new_end_date, 'isoformat') else str(new_end_date)
                }
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Agreement not found")
    
    return {
        "success": True,
        "message": f"Agreement renewed successfully for {renewal_years} years",
        "newEndDate": new_end_date.isoformat() if hasattr(new_end_date, 'isoformat') else str(new_end_date)
    }

@router.put("/{agreement_id}/auto-renewal")
def toggle_auto_renewal(request: Request, agreement_id: str, auto_renewal_data: dict):
    """Toggle auto-renewal setting for an agreement"""
    db = request.app.mongodb
    
    auto_renewal = auto_renewal_data.get("autoRenewal", False)
    
    update_data = {
        "autoRenewal": auto_renewal,
        "updatedAt": datetime.utcnow()
    }
    
    result = db.agreements.update_one(
        {"_id": ObjectId(agreement_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Agreement not found")
    
    return {
        "success": True,
        "message": f"Auto-renewal {'enabled' if auto_renewal else 'disabled'} successfully"
    }

@router.get("/notifications/expiring")
def get_expiring_agreements(request: Request, days_threshold: int = 30):
    """Get agreements that are expiring within specified days"""
    db = request.app.mongodb
    expiring_agreements = []
    
    for agreement in db.agreements.find():
        days_remaining = calculate_days_remaining(agreement["endDate"])
        
        if 0 <= days_remaining <= days_threshold:
            expiring_agreements.append({
                "_id": str(agreement["_id"]),
                "franchiseName": agreement["franchiseName"],
                "agreementNumber": agreement.get("agreementNumber", f"AGR-{str(agreement['_id'])[-6:]}"),
                "endDate": agreement["endDate"],
                "daysRemaining": days_remaining
            })
    
    return {
        "success": True,
        "data": expiring_agreements,
        "count": len(expiring_agreements)
    }

@router.get("/statistics/summary")
def get_validity_statistics(request: Request):
    """Get summary statistics for agreement validity"""
    db = request.app.mongodb
    
    total_agreements = 0
    active_count = 0
    expiring_soon_count = 0
    expired_count = 0
    renewal_due_count = 0
    
    for agreement in db.agreements.find():
        total_agreements += 1
        days_remaining = calculate_days_remaining(agreement["endDate"])
        
        if days_remaining < 0:
            expired_count += 1
        elif days_remaining <= 30:
            expiring_soon_count += 1
        elif days_remaining <= 90:
            renewal_due_count += 1
        else:
            active_count += 1
    
    return {
        "success": True,
        "data": {
            "total": total_agreements,
            "active": active_count,
            "expiring_soon": expiring_soon_count,
            "expired": expired_count,
            "renewal_due": renewal_due_count
        }
    }

