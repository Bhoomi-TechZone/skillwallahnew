from fastapi import APIRouter, HTTPException, status, Request
from starlette.concurrency import run_in_threadpool
from datetime import datetime
import uuid

from app.schemas.franchise import FranchiseCreate, FranchiseUpdate
from app.utils.security import hash_password
from app.config import settings
from bson import ObjectId

router = APIRouter(prefix="/api", tags=["Franchise"])

def generate_franchise_code(state: str):
    return f"FR-IN-{state[:3].upper()}-{uuid.uuid4().hex[:5].upper()}"

@router.post("/franchises", status_code=status.HTTP_201_CREATED)
async def create_franchise(request: Request, payload: FranchiseCreate):
    # Debug: log incoming payload for troubleshooting 422 errors
    try:
        raw_body = await request.body()
        print("[DEBUG] Incoming /api/franchises payload:", raw_body.decode())
    except Exception as e:
        print("[DEBUG] Could not log raw payload:", e)

    # Debug: Check if password is received properly
    print(f"[DEBUG] Password received: {payload.password is not None}")
    print(f"[DEBUG] Password length: {len(payload.password) if payload.password else 0}")
    
    # Validate password before hashing
    if not payload.password or payload.password.strip() == "":
        raise HTTPException(status_code=400, detail="Password is required and cannot be empty")

    db = request.app.mongodb
    existing = db.franchises.find_one({"owner.email": payload.owner_email})
    if existing:
        raise HTTPException(status_code=400, detail="Franchise owner already exists")

    # Hash the password and verify it's not None
    hashed_password = hash_password(payload.password)
    print(f"[DEBUG] Hashed password created: {hashed_password is not None}")
    print(f"[DEBUG] Hashed password length: {len(hashed_password) if hashed_password else 0}")

    document = {
        "franchise_code": generate_franchise_code(payload.state),
        "franchise_name": payload.franchise_name,
        "entity_type": payload.entity_type,
        "legal_entity_name": payload.legal_entity_name,
        "status": payload.status or "PENDING",
        "owner": {
            "name": payload.owner_name,
            "email": payload.owner_email,
            "phone": payload.owner_phone,
            "password": hashed_password
        },
        "documents": {
            "pan_number": payload.pan_number,
            "aadhaar_number": payload.aadhaar_number,
            "gstin": payload.gstin
        },
        "address": {
            "state": payload.state,
            "district": payload.district if hasattr(payload, 'district') else None,
            "city": payload.city,
            "full_address": payload.full_address,
            "pincode": payload.pincode
        },
        "territory": {
            "type": payload.territory_type
        },
        "financial": {
            "franchise_fee": payload.franchise_fee,
            "revenue_share_percent": payload.revenue_share_percent
        },
        "bank": {
            "bank_name": payload.bank_name,
            "account_holder_name": payload.account_holder_name,
            "account_number": payload.account_number,
            "ifsc_code": payload.ifsc_code
        },
        "agreement": {
            "start": datetime.combine(payload.agreement_start, datetime.min.time()),
            "end": datetime.combine(payload.agreement_end, datetime.min.time())
        },
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    result = db.franchises.insert_one(document)

    # Debug: print insertion result and collection size to help troubleshooting
    try:
        inserted_id = result.inserted_id
        total = db.franchises.count_documents({})
        print(f"[franchise] inserted_id: {inserted_id}, total_in_collection: {total}")
    except Exception as e:
        print(f"[franchise] warning: unable to log insert results: {e}")

    return {
        "message": "Franchise created successfully",
        "franchise_code": document["franchise_code"],
        "status": document["status"],
        "inserted_id": str(result.inserted_id),
        "address": {
            "state": document["address"]["state"],
            "city": document["address"]["city"]
        }
    }

def serialize_franchise(franchise):
    # Return a shallow copy with `_id` stringified for JSON safety
    # Remove password from response for security
    try:
        copy = dict(franchise)
        copy["_id"] = str(copy.get("_id"))
        
        # Remove password from owner object for security
        if "owner" in copy and isinstance(copy["owner"], dict):
            copy["owner"] = dict(copy["owner"])
            copy["owner"].pop("password", None)
        
        return copy
    except Exception:
        return franchise

@router.get("/franchises")
async def get_all_franchises(
    request: Request,
    status: str | None = None,
    state: str | None = None,
    city: str | None = None
):
    query = {}

    # Debug: log incoming parameters
    print(f"[franchise] get_all_franchises params - status: '{status}', state: '{state}', city: '{city}'")

    if status:
        s = status.strip().upper()
        query["status"] = s
        print(f"[franchise] Added status filter: {s}")
    
    # IGNORE state and city parameters - filtering happens client-side only
    if state or city:
        print(f"[franchise] WARNING: Ignoring state/city parameters - filtering should be client-side only")

    db = request.app.mongodb

    # Debug: log the incoming query and DB info for easier troubleshooting
    try:
        dbname = db.name
    except Exception:
        dbname = None
    print(f"[franchise] get_all_franchises query: {query} db_name: {dbname}")

    # `db` is a synchronous PyMongo client in this project. Iterating a
    # PyMongo Cursor is blocking and does not support async iteration.
    # Use run_in_threadpool to avoid blocking the event loop.
    def _fetch_sync():
        out = []
        cursor = db.franchises.find(query).sort("created_at", -1)
        for franchise in cursor:
            try:
                out.append(serialize_franchise(franchise))
            except Exception as e:
                print(f"[franchise] failed to serialize franchise: {e}")
        return out

    franchises = await run_in_threadpool(_fetch_sync)

    # Additional diagnostics: log DB/collection information and counts
    def _db_info():
        info = {}
        try:
            info['db_type'] = type(db).__name__
            # list collections and counts
            try:
                info['collections'] = db.list_collection_names()
            except Exception as e:
                info['collections_error'] = str(e)

            try:
                info['total_count'] = db.franchises.count_documents({})
            except Exception as e:
                info['total_count_error'] = str(e)

            try:
                sample = db.franchises.find_one({}, sort=[('created_at', -1)])
                info['sample_id'] = str(sample['_id']) if sample else None
                # Log actual stored state and city for debugging
                if sample and 'address' in sample:
                    info['sample_state'] = sample['address'].get('state', 'N/A')
                    info['sample_city'] = sample['address'].get('city', 'N/A')
            except Exception as e:
                info['sample_error'] = str(e)
            try:
                # Count documents matching the current query to diagnose mismatch
                info['matching_count'] = db.franchises.count_documents(query)
            except Exception as e:
                info['matching_count_error'] = str(e)
                
            # Get all unique states and cities for debugging
            try:
                all_franchises = list(db.franchises.find({}, {'address.state': 1, 'address.city': 1}))
                states = set()
                cities = set()
                for f in all_franchises:
                    if 'address' in f:
                        if 'state' in f['address']:
                            states.add(f['address']['state'])
                        if 'city' in f['address']:
                            cities.add(f['address']['city'])
                info['all_states'] = list(states)
                info['all_cities'] = list(cities)
            except Exception as e:
                info['all_data_error'] = str(e)
                
        except Exception as e:
            info['error'] = str(e)
        return info

    info = await run_in_threadpool(_db_info)
    print(f"[franchise] fetched {len(franchises)} franchises; db_info: {info}")

    return {
        "total": len(franchises),
        "data": franchises
    }


@router.get("/franchises/{franchise_id}")
async def get_franchise(request: Request, franchise_id: str):
    db = request.app.mongodb

    def _get():
        try:
            obj_id = ObjectId(franchise_id)
        except Exception:
            return None
        doc = db.franchises.find_one({"_id": obj_id})
        return serialize_franchise(doc) if doc else None

    franchise = await run_in_threadpool(_get)
    if not franchise:
        raise HTTPException(status_code=404, detail="Franchise not found")
    return franchise


@router.put("/franchises/{franchise_id}")
async def update_franchise(request: Request, franchise_id: str):
    payload = await request.json()
    db = request.app.mongodb

    # Validate numeric fields if present in payload
    def validate_numeric_fields(data):
        errors = []
        
        # Handle nested structure (from frontend edit form)
        if "address" in data and isinstance(data["address"], dict):
            if "pincode" in data["address"]:
                pincode = str(data["address"]["pincode"])
                if not pincode.isdigit() or len(pincode) != 6:
                    errors.append("Pincode must be exactly 6 digits")
                data["address"]["pincode"] = pincode
        
        if "bank" in data and isinstance(data["bank"], dict):
            if "account_number" in data["bank"]:
                account_num = str(data["bank"]["account_number"])
                if not account_num.isdigit():
                    errors.append("Account number must contain only digits")
                data["bank"]["account_number"] = account_num
        
        if "documents" in data and isinstance(data["documents"], dict):
            if "aadhaar_number" in data["documents"] and data["documents"]["aadhaar_number"]:
                aadhaar = str(data["documents"]["aadhaar_number"])
                if not aadhaar.isdigit() or len(aadhaar) != 12:
                    errors.append("Aadhaar number must be exactly 12 digits")
                data["documents"]["aadhaar_number"] = aadhaar
        
        if "financial" in data and isinstance(data["financial"], dict):
            if "revenue_share_percent" in data["financial"]:
                try:
                    revenue_share = float(data["financial"]["revenue_share_percent"])
                    if revenue_share < 0 or revenue_share > 100:
                        errors.append("Revenue share percentage must be between 0 and 100")
                    data["financial"]["revenue_share_percent"] = revenue_share
                except (ValueError, TypeError):
                    errors.append("Revenue share percentage must be a valid number")
        
        # Handle flat structure (legacy compatibility)
        if "pincode" in data:
            pincode = str(data["pincode"])
            if not pincode.isdigit() or len(pincode) != 6:
                errors.append("Pincode must be exactly 6 digits")
            data["pincode"] = pincode
            
        if "account_number" in data:
            account_num = str(data["account_number"])
            if not account_num.isdigit():
                errors.append("Account number must contain only digits")
            data["account_number"] = account_num
            
        if "aadhaar_number" in data and data["aadhaar_number"]:
            aadhaar = str(data["aadhaar_number"])
            if not aadhaar.isdigit() or len(aadhaar) != 12:
                errors.append("Aadhaar number must be exactly 12 digits")
            data["aadhaar_number"] = aadhaar
            
        if "revenue_share_percent" in data:
            try:
                revenue_share = float(data["revenue_share_percent"])
                if revenue_share < 0 or revenue_share > 100:
                    errors.append("Revenue share percentage must be between 0 and 100")
                data["revenue_share_percent"] = revenue_share
            except (ValueError, TypeError):
                errors.append("Revenue share percentage must be a valid number")
        
        if errors:
            raise HTTPException(status_code=400, detail="; ".join(errors))
        
        return data

    def _update():
        try:
            obj_id = ObjectId(franchise_id)
        except Exception:
            return None

        # Validate numeric fields
        validated_payload = validate_numeric_fields(payload.copy())

        # Handle owner password hashing if present
        if "owner" in validated_payload and isinstance(validated_payload["owner"], dict) and validated_payload["owner"].get("password"):
            validated_payload["owner"]["password"] = hash_password(validated_payload["owner"]["password"])

        # Update timestamp
        validated_payload["updated_at"] = datetime.utcnow()

        result = db.franchises.update_one({"_id": obj_id}, {"$set": validated_payload})
        if result.matched_count == 0:
            return None
        return db.franchises.find_one({"_id": obj_id})

    updated = await run_in_threadpool(_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Franchise not found or update failed")
    return serialize_franchise(updated)


@router.delete("/franchises/{franchise_id}")
async def delete_franchise(request: Request, franchise_id: str):
    db = request.app.mongodb

    def _delete():
        try:
            obj_id = ObjectId(franchise_id)
        except Exception:
            return False
        result = db.franchises.delete_one({"_id": obj_id})
        return result.deleted_count > 0

    ok = await run_in_threadpool(_delete)
    if not ok:
        raise HTTPException(status_code=404, detail="Franchise not found or delete failed")
    return {"success": True}



