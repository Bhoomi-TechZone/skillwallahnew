from fastapi import APIRouter, HTTPException, Request
from app.schemas.agreement_schema import AgreementCreate
from app.config import settings
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/api/agreements", tags=["Agreements"])


from datetime import datetime

def agreement_helper(data: dict) -> dict:
    return {
        "franchiseName": data["franchiseName"],
        "ownerName": data["ownerName"],
        "territory": data["territory"],
        "franchiseFee": data["franchiseFee"],
        "revenueShare": data["revenueShare"],
        "startDate": str(data["startDate"]),
        "endDate": str(data["endDate"]),
        "terms": data["terms"],
        "franchiseId": data.get("franchiseId"),
        "status": "ACTIVE",
        "createdAt": datetime.utcnow(),
    }

@router.post("/create")
def create_agreement(request: Request, payload: AgreementCreate):
    # Get franchise context from current user
    current_user = getattr(request.state, 'user', None)
    
    agreement_data = agreement_helper(payload.dict())
    
    # Add franchise context to agreement
    if current_user and current_user.get('franchise_code'):
        agreement_data["franchise_code"] = current_user.get('franchise_code')
        agreement_data["franchise_id"] = current_user.get('franchise_id')
    
    db = request.app.mongodb
    result = db.agreements.insert_one(agreement_data)

    if not result.inserted_id:
        raise HTTPException(status_code=500, detail="Agreement creation failed")

    return {
        "success": True,
        "message": "Agreement generated successfully",
        "agreementId": str(result.inserted_id)
    }

@router.get("/")
def get_all_agreements(request: Request):
    """Get all agreements - simplified without branch filtering for now"""
    agreements = []
    db = request.app.mongodb
    
    try:
        print("🔍 Fetching agreements from database...")
        # Simple query to get all agreements
        count = db.agreements.count_documents({})
        print(f"📊 Total agreements in database: {count}")
        
        for ag in db.agreements.find().sort("createdAt", -1):
            ag["_id"] = str(ag["_id"])
            agreements.append(ag)
            print(f"📄 Found agreement: {ag.get('franchiseName', 'Unknown')} - {ag.get('_id')}")

        print(f"✅ Successfully fetched {len(agreements)} agreements")
        return {
            "success": True,
            "data": agreements,
            "count": len(agreements)
        }
    except Exception as e:
        print(f"❌ Error fetching agreements: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "data": [],
            "count": 0,
            "error": str(e)
        }

@router.get("/test")
def test_database_connection(request: Request):
    """Test endpoint to check database connectivity"""
    try:
        db = request.app.mongodb
        
        # Test database connection
        collections = db.list_collection_names()
        agreements_exists = "agreements" in collections
        total_agreements = db.agreements.count_documents({}) if agreements_exists else 0
        
        # Sample data for testing
        sample_agreements = list(db.agreements.find().limit(3))
        for ag in sample_agreements:
            ag["_id"] = str(ag["_id"])
        
        return {
            "success": True,
            "database_connected": True,
            "agreements_collection_exists": agreements_exists,
            "total_agreements": total_agreements,
            "collections": collections,
            "sample_agreements": sample_agreements
        }
    except Exception as e:
        return {
            "success": False,
            "database_connected": False,
            "error": str(e)
        }

@router.get("/{agreement_id}")
def get_agreement_by_id(request: Request, agreement_id: str):
    """Get specific agreement by ID - simplified without branch filtering"""
    db = request.app.mongodb
    
    try:
        agreement = db.agreements.find_one({"_id": ObjectId(agreement_id)})
        
        if not agreement:
            raise HTTPException(status_code=404, detail="Agreement not found")
        
        agreement["_id"] = str(agreement["_id"])
        return {
            "success": True,
            "data": agreement
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching agreement: {str(e)}")

@router.put("/{agreement_id}")
def update_agreement(request: Request, agreement_id: str, payload: AgreementCreate):
    """Update agreement - simplified without branch filtering"""
    db = request.app.mongodb
    
    try:
        updated_data = agreement_helper(payload.dict())
        
        result = db.agreements.update_one(
            {"_id": ObjectId(agreement_id)},
            {"$set": updated_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Agreement not found")
        
        return {
            "success": True,
            "message": "Agreement updated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating agreement: {str(e)}")

@router.delete("/{agreement_id}")
def delete_agreement(request: Request, agreement_id: str):
    """Delete agreement - simplified without branch filtering"""
    db = request.app.mongodb
    
    try:
        result = db.agreements.delete_one({"_id": ObjectId(agreement_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Agreement not found")
        
        return {
            "success": True,
            "message": "Agreement deleted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting agreement: {str(e)}")

@router.get("/{agreement_id}/download")
def download_agreement(request: Request, agreement_id: str):
    """Download agreement as text file - simplified without branch filtering"""
    from fastapi.responses import Response
    import json
    
    db = request.app.mongodb
    
    try:
        agreement = db.agreements.find_one({"_id": ObjectId(agreement_id)})
        
        if not agreement:
            raise HTTPException(status_code=404, detail="Agreement not found")
        
        # Generate text content with proper formatting
        agreement_text = f"""FRANCHISE AGREEMENT

Franchise Name: {agreement['franchiseName']}
Owner Name: {agreement['ownerName']}
Territory: {agreement['territory']}
Franchise Fee: Rs. {agreement['franchiseFee']:,}
Revenue Share: {agreement['revenueShare']}%
Start Date: {agreement['startDate']}
End Date: {agreement['endDate']}

Terms and Conditions:
{agreement['terms']}

Status: {agreement['status']}
Generated on: {agreement['createdAt']}

---
SkillWallah EdTech Private Limited
"""
        
        # Return as text response with UTF-8 encoding
        return Response(
            content=agreement_text,
            media_type='text/plain; charset=utf-8',
            headers={
                "Content-Disposition": f"attachment; filename=Agreement_{agreement['franchiseName'].replace(' ', '_')}.txt"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading agreement: {str(e)}")


