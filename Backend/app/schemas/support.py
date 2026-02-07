from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TicketStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    pending = "pending"
    resolved = "resolved"
    closed = "closed"

class TicketPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class TicketCategory(str, Enum):
    technical = "technical"
    billing = "billing"
    course_management = "course_management"
    certificates = "certificates"
    general = "general"

class SupportTicketCreate(BaseModel):
    subject: str = Field(..., min_length=3, max_length=200, description="Ticket subject")
    description: str = Field(..., min_length=10, max_length=2000, description="Detailed description of the issue")
    category: TicketCategory = Field(..., description="Ticket category")
    priority: TicketPriority = Field(TicketPriority.medium, description="Ticket priority")
    tags: Optional[List[str]] = Field(default=[], description="Tags for categorization")
    user_id: Optional[str] = Field(None, description="User ID who created the ticket")
    attachment_count: Optional[int] = Field(0, description="Number of attachments")

class SupportTicketUpdate(BaseModel):
    subject: Optional[str] = Field(None, min_length=3, max_length=200, description="Ticket subject")
    description: Optional[str] = Field(None, min_length=10, max_length=2000, description="Ticket description")
    status: Optional[TicketStatus] = Field(None, description="Ticket status")
    priority: Optional[TicketPriority] = Field(None, description="Ticket priority")
    category: Optional[TicketCategory] = Field(None, description="Ticket category")
    assigned_to: Optional[str] = Field(None, description="Assigned team member")
    tags: Optional[List[str]] = Field(None, description="Tags for categorization")

class SupportTicketResponse(BaseModel):
    id: str = Field(..., description="Ticket ID")
    ticket_number: str = Field(..., description="Unique ticket number")
    subject: str = Field(..., description="Ticket subject")
    description: str = Field(..., description="Ticket description")
    status: TicketStatus = Field(..., description="Current ticket status")
    priority: TicketPriority = Field(..., description="Ticket priority")
    category: TicketCategory = Field(..., description="Ticket category")
    user_id: Optional[str] = Field(None, description="User ID who created the ticket")
    user_name: Optional[str] = Field(None, description="User name")
    user_email: Optional[str] = Field(None, description="User email")
    user_type: Optional[str] = Field(None, description="User type/role")
    assigned_to: Optional[str] = Field(None, description="Assigned team member")
    tags: Optional[List[str]] = Field(default=[], description="Tags")
    attachment_count: Optional[int] = Field(0, description="Number of attachments")
    created_date: datetime = Field(..., description="Creation date")
    last_updated: datetime = Field(..., description="Last update date")
    response_time: Optional[str] = Field(None, description="Response time")

class SupportResponseCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="Response message")
    user_id: Optional[str] = Field(None, description="User ID of the responder")

class SupportNoteCreate(BaseModel):
    note: str = Field(..., min_length=1, max_length=1000, description="Internal note content")
    user_name: str = Field("Admin", description="Name of the person adding the note")
    is_internal: bool = Field(True, description="Whether this is an internal note")

class SupportReplyCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="Reply message")
    user_name: str = Field("Admin", description="Name of the admin replying")
    is_admin_reply: bool = Field(True, description="Whether this is an admin reply")

class SupportResponseResponse(BaseModel):
    id: str = Field(..., description="Response ID")
    ticket_id: str = Field(..., description="Ticket ID")
    message: str = Field(..., description="Response message")
    user_id: str = Field(..., description="User ID of the responder")
    user_name: str = Field(..., description="Name of the responder")
    user_email: Optional[str] = Field(None, description="Email of the responder")
    created_date: datetime = Field(..., description="Response creation date")

class SupportTicketDetailResponse(SupportTicketResponse):
    responses: List[SupportResponseResponse] = Field(default=[], description="Ticket responses")

class SupportAnalytics(BaseModel):
    total_tickets: int = Field(..., description="Total number of tickets")
    open_tickets: int = Field(..., description="Number of open tickets")
    in_progress_tickets: int = Field(..., description="Number of in-progress tickets")
    resolved_tickets: int = Field(..., description="Number of resolved tickets")
    high_priority_tickets: int = Field(..., description="Number of high priority tickets")
    recent_tickets: int = Field(..., description="Number of recent tickets")
    categories: List[dict] = Field(default=[], description="Category distribution")

class SupportStats(BaseModel):
    total_tickets: int = Field(..., description="Total number of tickets")
    open_tickets: int = Field(..., description="Number of open tickets")
    in_progress_tickets: int = Field(..., description="Number of in-progress tickets")
    resolved_tickets: int = Field(..., description="Number of resolved tickets")
    high_priority_tickets: int = Field(..., description="Number of high priority tickets")

class TicketFilters(BaseModel):
    status: Optional[TicketStatus] = Field(None, description="Filter by status")
    priority: Optional[TicketPriority] = Field(None, description="Filter by priority")
    category: Optional[TicketCategory] = Field(None, description="Filter by category")
    search: Optional[str] = Field(None, description="Search term")
    user_id: Optional[str] = Field(None, description="Filter by user ID")

class PaginatedTicketsResponse(BaseModel):
    tickets: List[SupportTicketResponse] = Field(..., description="List of tickets")
    total: int = Field(..., description="Total number of tickets")
    page: int = Field(..., description="Current page number")
    pages: int = Field(..., description="Total number of pages")
    per_page: int = Field(..., description="Items per page")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")

# Enhanced Analytics Schemas
class AgentPerformance(BaseModel):
    agent_name: str = Field(..., description="Agent name")
    assigned_tickets: int = Field(..., description="Number of assigned tickets")
    resolved_tickets: int = Field(..., description="Number of resolved tickets")
    pending_tickets: int = Field(..., description="Number of pending tickets")
    avg_response_time: str = Field(..., description="Average response time")
    resolution_rate: int = Field(..., description="Resolution rate percentage")
    customer_satisfaction: int = Field(..., description="Customer satisfaction percentage")

class CategoryAnalytics(BaseModel):
    category: str = Field(..., description="Category name")
    total_tickets: int = Field(..., description="Total tickets in category")
    resolved_tickets: int = Field(..., description="Resolved tickets in category")
    avg_resolution_time: str = Field(..., description="Average resolution time")
    satisfaction_score: int = Field(..., description="Category satisfaction score")

class TrendData(BaseModel):
    date: str = Field(..., description="Date (YYYY-MM-DD)")
    new_tickets: int = Field(..., description="New tickets created")
    resolved_tickets: int = Field(..., description="Tickets resolved")
    response_time: int = Field(..., description="Average response time in hours")

class SLAMetrics(BaseModel):
    sla_compliance: int = Field(..., description="SLA compliance percentage")
    avg_first_response: str = Field(..., description="Average first response time")
    avg_resolution_time: str = Field(..., description="Average resolution time")
    overdue_tickets: int = Field(..., description="Number of overdue tickets")
    escalated_tickets: int = Field(..., description="Number of escalated tickets")
    customer_satisfaction: int = Field(..., description="Customer satisfaction percentage")

class ResponseTimeAnalytics(BaseModel):
    avg_by_priority: dict = Field(..., description="Average response time by priority")
    avg_by_category: dict = Field(..., description="Average response time by category")

class CustomerSatisfactionAnalytics(BaseModel):
    overall_satisfaction: int = Field(..., description="Overall satisfaction percentage")
    total_responses: int = Field(..., description="Total number of responses")
    satisfaction_by_category: dict = Field(..., description="Satisfaction by category")
    satisfaction_distribution: dict = Field(..., description="Distribution of satisfaction levels")

class WorkloadDistribution(BaseModel):
    agent_workload: List[dict] = Field(..., description="Workload by agent")
    priority_workload: List[dict] = Field(..., description="Workload by priority")
    category_workload: List[dict] = Field(..., description="Workload by category")
    daily_workload: List[dict] = Field(..., description="Daily workload trend")
