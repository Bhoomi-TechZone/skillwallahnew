# MongoDB collection access for support ticket data
from datetime import datetime, timedelta
import uuid

def get_support_ticket_collection(db):
    return db["support_tickets"]

def get_support_response_collection(db):
    return db["support_responses"]

def get_support_note_collection(db):
    return db["support_notes"]

def create_support_ticket(db, ticket_data):
    """Create a new support ticket"""
    collection = get_support_ticket_collection(db)
    
    # Generate unique ticket number with new format: TKT_XXXXXXXX
    ticket_number = f"TKT_{str(uuid.uuid4())[:8].upper()}"
    
    ticket = {
        "ticket_number": ticket_number,
        "subject": ticket_data.get("subject"),
        "description": ticket_data.get("description"),
        "status": "open",
        "priority": ticket_data.get("priority", "medium"),
        "category": ticket_data.get("category"),
        "user_id": ticket_data.get("user_id"),
        "assigned_to": ticket_data.get("assigned_to", "Support Team"),
        "tags": ticket_data.get("tags", []),
        "attachment_count": ticket_data.get("attachment_count", 0),
        "created_date": datetime.utcnow(),
        "last_updated": datetime.utcnow(),
        "response_time": None
    }
    
    result = collection.insert_one(ticket)
    return result.inserted_id, ticket_number

def get_support_tickets(db, filters=None, page=1, per_page=20):
    """Get support tickets with filters and pagination"""
    collection = get_support_ticket_collection(db)
    
    # Build query
    query = {}
    if filters:
        if filters.get("status") and filters["status"] != "all":
            query["status"] = filters["status"]
        if filters.get("priority") and filters["priority"] != "all":
            query["priority"] = filters["priority"]
        if filters.get("category") and filters["category"] != "all":
            query["category"] = filters["category"]
        if filters.get("user_id"):
            query["user_id"] = filters["user_id"]
        if filters.get("search"):
            search_term = {"$regex": filters["search"], "$options": "i"}
            query["$or"] = [
                {"subject": search_term},
                {"description": search_term},
                {"ticket_number": search_term}
            ]
    
    # Count total documents
    total = collection.count_documents(query)
    
    # Calculate pagination
    skip = (page - 1) * per_page
    total_pages = (total + per_page - 1) // per_page
    
    # Get tickets
    tickets = list(collection.find(query)
                  .sort("created_date", -1)
                  .skip(skip)
                  .limit(per_page))
    
    return {
        "tickets": tickets,
        "total": total,
        "page": page,
        "pages": total_pages,
        "per_page": per_page,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }

def get_support_ticket_by_id(db, ticket_id):
    """Get a specific support ticket by ID"""
    from bson import ObjectId
    collection = get_support_ticket_collection(db)
    return collection.find_one({"_id": ObjectId(ticket_id)})

def update_support_ticket(db, ticket_id, update_data):
    """Update a support ticket"""
    from bson import ObjectId
    collection = get_support_ticket_collection(db)
    
    update_data["last_updated"] = datetime.utcnow()
    
    result = collection.update_one(
        {"_id": ObjectId(ticket_id)},
        {"$set": update_data}
    )
    return result.modified_count > 0

def create_support_response(db, response_data):
    """Create a new support response"""
    collection = get_support_response_collection(db)
    
    response = {
        "ticket_id": response_data.get("ticket_id"),
        "user_id": response_data.get("user_id"),
        "message": response_data.get("message"),
        "created_date": datetime.utcnow()
    }
    
    result = collection.insert_one(response)
    return result.inserted_id

def get_support_responses(db, ticket_id):
    """Get all responses for a specific ticket"""
    collection = get_support_response_collection(db)
    return list(collection.find({"ticket_id": ticket_id}).sort("created_date", 1))

def create_support_note(db, note_data):
    """Create a new internal support note"""
    collection = get_support_note_collection(db)
    
    note = {
        "ticket_id": note_data.get("ticket_id"),
        "user_name": note_data.get("user_name", "Admin"),
        "note": note_data.get("note"),
        "is_internal": note_data.get("is_internal", True),
        "created_date": datetime.utcnow()
    }
    
    result = collection.insert_one(note)
    return result.inserted_id

def get_support_notes(db, ticket_id):
    """Get all internal notes for a specific ticket"""
    collection = get_support_note_collection(db)
    return list(collection.find({"ticket_id": ticket_id}).sort("created_date", 1))

def create_support_reply(db, reply_data):
    """Create a new admin reply to a ticket"""
    collection = get_support_response_collection(db)
    
    reply = {
        "ticket_id": reply_data.get("ticket_id"),
        "user_id": reply_data.get("user_id"),
        "user_name": reply_data.get("user_name", "Admin"),
        "message": reply_data.get("message"),
        "is_admin_reply": reply_data.get("is_admin_reply", True),
        "created_date": datetime.utcnow()
    }
    
    result = collection.insert_one(reply)
    return result.inserted_id

def get_support_analytics(db, date_filter=None):
    """Get support analytics data with optional date filtering"""
    collection = get_support_ticket_collection(db)
    
    # Build date query if date filter provided
    date_query = {}
    if date_filter:
        if date_filter.get('start_date') and date_filter.get('end_date'):
            date_query["created_date"] = {
                "$gte": date_filter['start_date'],
                "$lte": date_filter['end_date']
            }
        elif date_filter.get('start_date'):
            date_query["created_date"] = {"$gte": date_filter['start_date']}
        elif date_filter.get('end_date'):
            date_query["created_date"] = {"$lte": date_filter['end_date']}
    
    # Basic counts
    total_tickets = collection.count_documents(date_query)
    open_tickets = collection.count_documents({**date_query, "status": "open"})
    in_progress_tickets = collection.count_documents({**date_query, "status": "in_progress"})
    pending_tickets = collection.count_documents({**date_query, "status": "pending"})
    resolved_tickets = collection.count_documents({**date_query, "status": "resolved"})
    closed_tickets = collection.count_documents({**date_query, "status": "closed"})
    high_priority_tickets = collection.count_documents({**date_query, "priority": "high"})
    medium_priority_tickets = collection.count_documents({**date_query, "priority": "medium"})
    low_priority_tickets = collection.count_documents({**date_query, "priority": "low"})
    
    # Recent tickets (last 7 days if no date filter)
    if not date_filter:
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_tickets = collection.count_documents({"created_date": {"$gte": week_ago}})
    else:
        recent_tickets = total_tickets
    
    # Category distribution
    category_pipeline = [
        {"$match": date_query},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    categories = list(collection.aggregate(category_pipeline))
    category_data = [{"category": cat["_id"], "count": cat["count"]} for cat in categories]
    
    return {
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "in_progress_tickets": in_progress_tickets,
        "pending_tickets": pending_tickets,
        "resolved_tickets": resolved_tickets,
        "closed_tickets": closed_tickets,
        "high_priority_tickets": high_priority_tickets,
        "medium_priority_tickets": medium_priority_tickets,
        "low_priority_tickets": low_priority_tickets,
        "recent_tickets": recent_tickets,
        "categories": category_data
    }

def get_agent_performance_analytics(db, days=30):
    """Get agent performance analytics"""
    collection = get_support_ticket_collection(db)
    response_collection = get_support_response_collection(db)
    
    # Date range for analysis
    start_date = datetime.utcnow() - timedelta(days=days)
    date_query = {"created_date": {"$gte": start_date}}
    
    # Get unique agents
    agents_pipeline = [
        {"$match": date_query},
        {"$group": {"_id": "$assigned_to"}},
        {"$match": {"_id": {"$ne": None}}}
    ]
    agents = [agent["_id"] for agent in collection.aggregate(agents_pipeline)]
    
    agent_performance = []
    
    for agent in agents:
        # Get tickets assigned to this agent
        agent_query = {**date_query, "assigned_to": agent}
        assigned_tickets = collection.count_documents(agent_query)
        resolved_tickets = collection.count_documents({**agent_query, "status": "resolved"})
        pending_tickets = assigned_tickets - resolved_tickets
        
        # Calculate average response time (simplified calculation)
        response_times = []
        tickets = list(collection.find(agent_query, {"_id": 1, "created_date": 1}))
        
        for ticket in tickets:
            first_response = response_collection.find_one({
                "ticket_id": str(ticket["_id"]),
                "is_admin_reply": True
            }, sort=[("created_date", 1)])
            
            if first_response:
                response_time = (first_response["created_date"] - ticket["created_date"]).total_seconds() / 3600
                response_times.append(response_time)
        
        avg_response_time = f"{int(sum(response_times) / len(response_times))}h" if response_times else "N/A"
        resolution_rate = int((resolved_tickets / assigned_tickets) * 100) if assigned_tickets > 0 else 0
        
        # Mock customer satisfaction (in a real system, this would come from feedback)
        import random
        customer_satisfaction = random.randint(75, 98)
        
        agent_performance.append({
            "agent_name": agent,
            "assigned_tickets": assigned_tickets,
            "resolved_tickets": resolved_tickets,
            "pending_tickets": pending_tickets,
            "avg_response_time": avg_response_time,
            "resolution_rate": resolution_rate,
            "customer_satisfaction": customer_satisfaction
        })
    
    return agent_performance

def get_category_analytics(db, days=30):
    """Get category-wise analytics"""
    collection = get_support_ticket_collection(db)
    
    # Date range for analysis
    start_date = datetime.utcnow() - timedelta(days=days)
    date_query = {"created_date": {"$gte": start_date}}
    
    # Get category statistics
    categories = ["technical", "billing", "course_management", "certificates", "general"]
    category_stats = []
    
    for category in categories:
        category_query = {**date_query, "category": category}
        total_tickets = collection.count_documents(category_query)
        resolved_tickets = collection.count_documents({**category_query, "status": "resolved"})
        
        # Calculate average resolution time (simplified)
        resolved_category_tickets = list(collection.find({
            **category_query, 
            "status": "resolved",
            "last_updated": {"$exists": True}
        }, {"created_date": 1, "last_updated": 1}))
        
        resolution_times = []
        for ticket in resolved_category_tickets:
            if ticket.get("last_updated") and ticket.get("created_date"):
                resolution_time = (ticket["last_updated"] - ticket["created_date"]).total_seconds() / 3600
                resolution_times.append(resolution_time)
        
        avg_resolution_time = f"{int(sum(resolution_times) / len(resolution_times))}h" if resolution_times else "N/A"
        
        # Mock satisfaction score
        import random
        satisfaction_score = random.randint(75, 95)
        
        category_stats.append({
            "category": category.replace("_", " ").title(),
            "total_tickets": total_tickets,
            "resolved_tickets": resolved_tickets,
            "avg_resolution_time": avg_resolution_time,
            "satisfaction_score": satisfaction_score
        })
    
    return category_stats

def get_trend_analytics(db, days=30):
    """Get trend analysis data"""
    collection = get_support_ticket_collection(db)
    
    trend_data = []
    
    for i in range(days, -1, -1):
        date = datetime.utcnow() - timedelta(days=i)
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        
        day_query = {
            "created_date": {
                "$gte": start_of_day,
                "$lt": end_of_day
            }
        }
        
        new_tickets = collection.count_documents(day_query)
        resolved_tickets = collection.count_documents({
            "last_updated": {
                "$gte": start_of_day,
                "$lt": end_of_day
            },
            "status": "resolved"
        })
        
        # Mock response time calculation
        import random
        response_time = random.randint(1, 24)
        
        trend_data.append({
            "date": start_of_day.strftime("%Y-%m-%d"),
            "new_tickets": new_tickets,
            "resolved_tickets": resolved_tickets,
            "response_time": response_time
        })
    
    return trend_data

def get_sla_analytics(db, days=30):
    """Get SLA metrics and compliance data"""
    collection = get_support_ticket_collection(db)
    response_collection = get_support_response_collection(db)
    
    # Date range for analysis
    start_date = datetime.utcnow() - timedelta(days=days)
    date_query = {"created_date": {"$gte": start_date}}
    
    total_tickets = collection.count_documents(date_query)
    
    # Calculate SLA compliance (tickets resolved within 24 hours)
    sla_compliant = 0
    overdue_tickets = 0
    escalated_tickets = 0
    
    tickets = list(collection.find(date_query, {
        "_id": 1, "created_date": 1, "last_updated": 1, "status": 1, "priority": 1
    }))
    
    response_times = []
    resolution_times = []
    
    for ticket in tickets:
        # Check first response time
        first_response = response_collection.find_one({
            "ticket_id": str(ticket["_id"]),
            "is_admin_reply": True
        }, sort=[("created_date", 1)])
        
        if first_response:
            response_time = (first_response["created_date"] - ticket["created_date"]).total_seconds() / 3600
            response_times.append(response_time)
            
            # SLA: First response within 4 hours for high priority, 24 hours for others
            sla_threshold = 4 if ticket.get("priority") == "high" else 24
            if response_time <= sla_threshold:
                sla_compliant += 1
        
        # Check if ticket is overdue (no response after 48 hours)
        if not first_response:
            hours_since_creation = (datetime.utcnow() - ticket["created_date"]).total_seconds() / 3600
            if hours_since_creation > 48:
                overdue_tickets += 1
        
        # Check resolution time
        if ticket.get("status") == "resolved" and ticket.get("last_updated"):
            resolution_time = (ticket["last_updated"] - ticket["created_date"]).total_seconds() / 3600
            resolution_times.append(resolution_time)
        
        # Mock escalation check
        if ticket.get("priority") == "high" and ticket.get("status") in ["open", "in_progress"]:
            import random
            if random.random() < 0.1:  # 10% chance of escalation
                escalated_tickets += 1
    
    sla_compliance = int((sla_compliant / total_tickets) * 100) if total_tickets > 0 else 0
    avg_first_response = f"{int(sum(response_times) / len(response_times))}h" if response_times else "N/A"
    avg_resolution_time = f"{int(sum(resolution_times) / len(resolution_times))}h" if resolution_times else "N/A"
    
    # Mock customer satisfaction
    import random
    customer_satisfaction = random.randint(80, 95)
    
    return {
        "sla_compliance": sla_compliance,
        "avg_first_response": avg_first_response,
        "avg_resolution_time": avg_resolution_time,
        "overdue_tickets": overdue_tickets,
        "escalated_tickets": escalated_tickets,
        "customer_satisfaction": customer_satisfaction
    }

def get_response_time_analytics(db, days=30):
    """Get detailed response time analytics"""
    collection = get_support_ticket_collection(db)
    response_collection = get_support_response_collection(db)
    
    # Date range for analysis
    start_date = datetime.utcnow() - timedelta(days=days)
    date_query = {"created_date": {"$gte": start_date}}
    
    tickets = list(collection.find(date_query, {
        "_id": 1, "created_date": 1, "priority": 1, "category": 1
    }))
    
    response_times_by_priority = {"high": [], "medium": [], "low": []}
    response_times_by_category = {}
    
    for ticket in tickets:
        first_response = response_collection.find_one({
            "ticket_id": str(ticket["_id"]),
            "is_admin_reply": True
        }, sort=[("created_date", 1)])
        
        if first_response:
            response_time = (first_response["created_date"] - ticket["created_date"]).total_seconds() / 3600
            
            # Group by priority
            priority = ticket.get("priority", "medium")
            response_times_by_priority[priority].append(response_time)
            
            # Group by category
            category = ticket.get("category", "general")
            if category not in response_times_by_category:
                response_times_by_category[category] = []
            response_times_by_category[category].append(response_time)
    
    # Calculate averages
    avg_by_priority = {}
    for priority, times in response_times_by_priority.items():
        avg_by_priority[priority] = f"{int(sum(times) / len(times))}h" if times else "N/A"
    
    avg_by_category = {}
    for category, times in response_times_by_category.items():
        avg_by_category[category] = f"{int(sum(times) / len(times))}h" if times else "N/A"
    
    return {
        "avg_by_priority": avg_by_priority,
        "avg_by_category": avg_by_category
    }

def get_customer_satisfaction_analytics(db, days=30):
    """Get customer satisfaction metrics"""
    # In a real system, this would come from customer feedback/ratings
    # For now, we'll generate mock data based on ticket resolution patterns
    
    collection = get_support_ticket_collection(db)
    start_date = datetime.utcnow() - timedelta(days=days)
    date_query = {"created_date": {"$gte": start_date}}
    
    total_tickets = collection.count_documents(date_query)
    resolved_tickets = collection.count_documents({**date_query, "status": "resolved"})
    
    # Mock satisfaction data
    import random
    satisfaction_scores = []
    
    # Generate satisfaction scores based on resolution rate
    resolution_rate = (resolved_tickets / total_tickets) if total_tickets > 0 else 0
    base_satisfaction = 70 + (resolution_rate * 25)  # 70-95% range
    
    for _ in range(min(total_tickets, 100)):  # Sample up to 100 tickets
        score = int(base_satisfaction + random.uniform(-10, 10))
        score = max(1, min(100, score))  # Clamp between 1-100
        satisfaction_scores.append(score)
    
    avg_satisfaction = int(sum(satisfaction_scores) / len(satisfaction_scores)) if satisfaction_scores else 0
    
    # Satisfaction by category
    categories = ["technical", "billing", "course_management", "certificates", "general"]
    satisfaction_by_category = {}
    
    for category in categories:
        # Mock category-specific satisfaction
        category_satisfaction = avg_satisfaction + random.randint(-5, 5)
        category_satisfaction = max(1, min(100, category_satisfaction))
        satisfaction_by_category[category] = category_satisfaction
    
    return {
        "overall_satisfaction": avg_satisfaction,
        "total_responses": len(satisfaction_scores),
        "satisfaction_by_category": satisfaction_by_category,
        "satisfaction_distribution": {
            "excellent": len([s for s in satisfaction_scores if s >= 90]),
            "good": len([s for s in satisfaction_scores if 70 <= s < 90]),
            "fair": len([s for s in satisfaction_scores if 50 <= s < 70]),
            "poor": len([s for s in satisfaction_scores if s < 50])
        }
    }

def get_workload_distribution_analytics(db, days=30):
    """Get workload distribution analytics"""
    collection = get_support_ticket_collection(db)
    
    # Date range for analysis
    start_date = datetime.utcnow() - timedelta(days=days)
    date_query = {"created_date": {"$gte": start_date}}
    
    # Workload by agent
    agent_pipeline = [
        {"$match": date_query},
        {"$group": {"_id": "$assigned_to", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    agent_workload = list(collection.aggregate(agent_pipeline))
    
    # Workload by priority
    priority_pipeline = [
        {"$match": date_query},
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    priority_workload = list(collection.aggregate(priority_pipeline))
    
    # Workload by category
    category_pipeline = [
        {"$match": date_query},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    category_workload = list(collection.aggregate(category_pipeline))
    
    # Daily workload trend
    daily_workload = []
    for i in range(days, -1, -1):
        date = datetime.utcnow() - timedelta(days=i)
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        
        day_count = collection.count_documents({
            "created_date": {"$gte": start_of_day, "$lt": end_of_day}
        })
        
        daily_workload.append({
            "date": start_of_day.strftime("%Y-%m-%d"),
            "ticket_count": day_count
        })
    
    return {
        "agent_workload": [{"agent": item["_id"], "tickets": item["count"]} for item in agent_workload],
        "priority_workload": [{"priority": item["_id"], "tickets": item["count"]} for item in priority_workload],
        "category_workload": [{"category": item["_id"], "tickets": item["count"]} for item in category_workload],
        "daily_workload": daily_workload
    }
