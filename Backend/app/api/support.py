from fastapi import APIRouter, Request, HTTPException, Body
from bson import ObjectId
import logging
from app.models.support import (
    create_support_ticket,
    get_support_ticket_by_id,
    update_support_ticket
)
from app.schemas.support import (
    SupportTicketCreate,
    SupportTicketUpdate
)

logger = logging.getLogger(__name__)

support_router = APIRouter(prefix="/support", tags=["Support"])

@support_router.post("/tickets", response_model=dict)
def create_ticket(
    request: Request,
    ticket_data: SupportTicketCreate = Body(..., description="Ticket creation data")
):
    """Create a new support ticket"""
    try:
        db = request.app.mongodb
        
        # Convert Pydantic model to dict
        data = ticket_data.model_dump()
        
        ticket_data_dict = {
            "subject": data["subject"],
            "description": data["description"],
            "category": data["category"],
            "priority": data["priority"],
            "tags": data.get("tags", []),
            "user_id": data.get("user_id"),
            "attachment_count": data.get("attachment_count", 0)
        }
        
        ticket_id, ticket_number = create_support_ticket(db, ticket_data_dict)
        
        return {
            "success": True,
            "message": "Support ticket created successfully",
            "data": {
                "ticket_id": str(ticket_id),
                "ticket_number": ticket_number
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create ticket: {str(e)}")

@support_router.get("/tickets", response_model=dict)
def get_user_tickets(request: Request, user_id: str = None):
    """Get support tickets for a user"""
    try:
        db = request.app.mongodb
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id parameter is required")
        
        # Convert user_id to ObjectId if needed
        try:
            user_obj_id = ObjectId(user_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid user_id format")
        
        # Find tickets for this user
        tickets = list(db.support_tickets.find({"user_id": user_obj_id}))
        
        # Convert ObjectIds to strings
        for ticket in tickets:
            ticket["_id"] = str(ticket["_id"])
            if ticket.get("user_id"):
                ticket["user_id"] = str(ticket["user_id"])
            # Convert datetime fields to ISO strings
            if ticket.get("created_at"):
                ticket["created_at"] = ticket["created_at"].isoformat()
            if ticket.get("updated_at"):
                ticket["updated_at"] = ticket["updated_at"].isoformat()
        
        return {
            "success": True,
            "message": "Tickets retrieved successfully",
            "data": tickets,
            "count": len(tickets)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve tickets: {str(e)}")

@support_router.get("/tickets/{ticket_id}", response_model=dict)
def get_ticket(
    request: Request,
    ticket_id: str
):
    """Get a specific support ticket"""
    try:
        db = request.app.mongodb
        ticket = get_support_ticket_by_id(db, ticket_id)
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        return {
            "success": True,
            "message": "Ticket retrieved successfully",
            "data": ticket
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve ticket: {str(e)}")

# Complex analytics endpoints removed - not used in frontend
# Only basic ticket creation and retrieval kept for essential functionality

