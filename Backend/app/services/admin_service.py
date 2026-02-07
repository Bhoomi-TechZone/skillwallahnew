from bson import ObjectId
from app.models.user import get_user_collection
from app.models.certificate import get_certificate_collection

def get_all_users(db):
    return list(get_user_collection(db).find())

def update_user_role(db, user_id, payload):
    result = get_user_collection(db).update_one(
        {"_id": ObjectId(user_id)},
        {"$set": payload.dict(exclude_unset=True)}
    )
    return {"updated": result.modified_count > 0}

def delete_user(db, user_id):
    result = get_user_collection(db).delete_one({"_id": ObjectId(user_id)})
    return {"deleted": result.deleted_count > 0}

def verify_certificate_admin(db, cert_id, payload):
    result = get_certificate_collection(db).update_one(
        {"_id": ObjectId(cert_id)},
        {"$set": {"verified": payload.verified}}
    )
    return {"verified": result.modified_count > 0}
