from datetime import datetime, timedelta
from typing import Dict, Any, List
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def get_super_admin_dashboard_stats(db) -> Dict[str, Any]:
    """
    Aggregates all statistics for the Super Admin Dashboard.
    """
    try:
        # --- Franchise Stats ---
        franchises_collection = db.franchises
        total_franchises = franchises_collection.count_documents({})
        
        # Optimize: Aggregation for status counts (1 query instead of 3)
        f_agg = list(franchises_collection.aggregate([
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]))
        
        # Helper to sum counts for multiple case variations
        def get_count(agg_list, status_variants):
            return sum(item["count"] for item in agg_list if str(item.get("_id")).upper() in status_variants)

        active_franchises = get_count(f_agg, ["ACTIVE"])
        pending_franchises = get_count(f_agg, ["PENDING"])
        rejected_franchises = get_count(f_agg, ["REJECTED"])

        # --- Franchise Admin Stats ---
        # User clarification: "Every franchise have one admin"
        total_franchise_admins = total_franchises
        users_collection = db.users

        # --- Enquiries Stats ---
        partnership_requests_collection = db.partnership_requests
        enquiry_collection = db.enquiry
        
        req_count = partnership_requests_collection.count_documents({})
        
        if req_count > 0:
            active_collection = partnership_requests_collection
            total_enquiries = req_count
            
            # Optimized counts
            # Franchise enquiries (complex OR query, keep as count for safety or optimize if needed)
            franchise_enquiries = active_collection.count_documents({
                "$or": [{"category": "franchise"}, {"type": "franchise"}, {"partnership_type": "franchise"}]
            })
            
            # Status aggregation
            e_agg = list(active_collection.aggregate([
                {"$group": {"_id": "$status", "count": {"$sum": 1}}}
            ]))
            
            pending_enquiries = get_count(e_agg, ["PENDING"])
            resolved_enquiries = get_count(e_agg, ["RESOLVED", "APPROVED"])
        else:
            # Fallback
            active_collection = enquiry_collection
            total_enquiries = active_collection.count_documents({})
            franchise_enquiries = active_collection.count_documents({"category": "franchise"})
            
            # Status aggregation
            e_agg = list(active_collection.aggregate([
                {"$group": {"_id": "$status", "count": {"$sum": 1}}}
            ]))
            
            pending_enquiries = get_count(e_agg, ["PENDING"])
            resolved_enquiries = get_count(e_agg, ["RESOLVED"])

        # --- Agreement Stats ---
        agreements_collection = db.agreements
        total_agreements = agreements_collection.count_documents({})
        
        # Aggregation for status
        a_agg = list(agreements_collection.aggregate([
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]))
        
        pending_agreements = get_count(a_agg, ["PENDING"])
        active_agreements = get_count(a_agg, ["ACTIVE"])
        expired_agreements = get_count(a_agg, ["EXPIRED"])
        
        expiring_soon_agreements = 0 

        # --- Financial Stats (Revenue & Settlements) ---
        current_date = datetime.now()
        start_of_month = datetime(current_date.year, current_date.month, 1)
        
        # 1. Revenue from Enrollments
        enrollments_collection = db.enrollments
        
        # Optimize: Projection to fetch ONLY needed fields
        valid_enrollments_cursor = enrollments_collection.find(
            {"status": {"$in": ["pending", "completed", "active", "enrolled"]}},
            {"fee_paid": 1, "course_fee": 1, "amount": 1, "fee": 1, "enrollment_date": 1, "created_at": 1, "date": 1}
        )
        
        total_revenue = 0.0
        monthly_revenue = 0.0
        
        for enrollment in valid_enrollments_cursor:
            try:
                # Extract fee
                raw_fee = enrollment.get('fee_paid') or enrollment.get('course_fee') or enrollment.get('amount') or enrollment.get('fee') or 0
                try:
                    fee = float(raw_fee)
                except (ValueError, TypeError):
                    fee = 0.0
                
                total_revenue += fee
                
                # Check date for monthly revenue
                date_val = enrollment.get('enrollment_date') or enrollment.get('created_at') or enrollment.get('date')
                if date_val:
                    enrollment_date = None
                    if isinstance(date_val, str):
                        try:
                            # Attempt parsing
                            # Handle potential Z suffix manually if fromisoformat doesn't support it (Python < 3.7/3.11 depending)
                            date_str = date_val.replace('Z', '+00:00')
                            enrollment_date = datetime.fromisoformat(date_str)
                        except:
                            pass 
                    elif isinstance(date_val, datetime):
                        enrollment_date = date_val
                    
                    if enrollment_date:
                        # Normalize to naive UTC for comparison or ensure compatibility
                        if enrollment_date.tzinfo is not None:
                             enrollment_date = enrollment_date.replace(tzinfo=None)
                        
                        if enrollment_date >= start_of_month:
                             monthly_revenue += fee
            except Exception as e:
                # Log usage error but continue loop
                logger.warning(f"Error processing enrollment for revenue: {e}")
                continue

        # 2. Revenue from Franchises
        # Optimize: Projection
        franchises_cursor = franchises_collection.find(
            {}, 
            {"financial": 1, "created_at": 1}
        )
        
        for franchise in franchises_cursor:
            try:
                financial = franchise.get('financial', {})
                raw_fee = financial.get('franchise_fee') or 0
                try:
                    franchise_fee = float(raw_fee)
                except (ValueError, TypeError):
                    franchise_fee = 0.0

                total_revenue += franchise_fee
                
                # Monthly check
                created_at = franchise.get('created_at')
                if created_at:
                     franchise_date = None
                     if isinstance(created_at, str):
                        try:
                            date_str = created_at.replace('Z', '+00:00')
                            franchise_date = datetime.fromisoformat(date_str)
                        except:
                            pass
                     elif isinstance(created_at, datetime):
                          franchise_date = created_at
                     
                     if franchise_date:
                        if franchise_date.tzinfo is not None:
                            franchise_date = franchise_date.replace(tzinfo=None)
                        
                        if franchise_date >= start_of_month:
                           monthly_revenue += franchise_fee
            except Exception as e:
                logger.warning(f"Error processing franchise for revenue: {e}")
                continue
        
        # Pending Settlements calculation
        pending_settlements_count = enrollments_collection.count_documents({
             "status": {"$in": ["completed", "active", "enrolled"]},
             "payment_status": {"$ne": "settlement_processed"}
        })
        
        # --- Recent Activities ---
        recent_activities = []
        
        # New Franchise Admins
        recent_users_cursor = users_collection.find(
            {"role": "franchise_admin"}
        ).sort("created_at", -1).limit(5)
        
        for user in recent_users_cursor:
            recent_activities.append({
                "id": str(user.get("_id")),
                "type": "franchise_admin_registration",
                "message": f"New franchise admin: {user.get('name') or user.get('email')}",
                "timestamp": user.get("created_at"),
                "icon_type": "user",
                "color": "text-blue-600"
            })
            
        # New Agreements
        recent_agreements_cursor = agreements_collection.find({}).sort("created_at", -1).limit(5)
        for agreement in recent_agreements_cursor:
             recent_activities.append({
                "id": str(agreement.get("_id")),
                "type": "agreement_activity",
                "message": f"Agreement {agreement.get('status')}: {agreement.get('franchise_name', 'Franchise')}",
                "timestamp": agreement.get("created_at"),
                "icon_type": "store",
                "color": "text-purple-600"
            })
            
        # Parse Dates for activities and sort
        # (Skipping detailed date parsing/sorting for brevity, frontend can handle or we just send mixed list)

        return {
            "totalFranchises": total_franchises,
            "activeFranchises": active_franchises,
            "pendingFranchises": pending_franchises,
            "rejectedFranchises": rejected_franchises,
            "totalFranchiseAdmins": total_franchise_admins,
            "totalEnquiries": total_enquiries,
            "franchiseEnquiries": franchise_enquiries,
            "pendingEnquiries": pending_enquiries,
            "resolvedEnquiries": resolved_enquiries,
            "totalRevenue": total_revenue,
            "monthlyRevenue": monthly_revenue, 
            "pendingSettlements": pending_settlements_count,
            "totalAgreements": total_agreements,
            "pendingAgreements": pending_agreements,
            "activeAgreements": active_agreements,
            "expiredAgreements": expired_agreements,
            "expiringSoonAgreements": 0, # Placeholder
            "renewalDueAgreements": 0,    # Placeholder
            "recentActivities": recent_activities[:5] # Just top 5
        }

    except Exception as e:
        import traceback
        logger.error(f"Error generating super admin dashboard stats: {e}")
        logger.error(traceback.format_exc())
        # Return zeros on error to prevent frontend crash, but verify error log
        return {
            "totalFranchises": 0,
            "activeFranchises": 0,
            "pendingFranchises": 0,
            "rejectedFranchises": 0,
            "totalFranchiseAdmins": 0,
            "totalEnquiries": 0,
            "franchiseEnquiries": 0,
            "pendingEnquiries": 0,
            "resolvedEnquiries": 0,
            "totalRevenue": 0,
            "monthlyRevenue": 0,
            "pendingSettlements": 0,
            "totalAgreements": 0,
            "pendingAgreements": 0,
            "activeAgreements": 0,
            "expiredAgreements": 0,
            "expiringSoonAgreements": 0,
            "renewalDueAgreements": 0,
            "recentActivities": []
        }
