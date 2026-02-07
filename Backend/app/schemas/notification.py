from pydantic import BaseModel, Field
from typing import Optional, List, Union
from datetime import datetime
from enum import Enum

class NotificationType(str, Enum):
    announcement = "announcement"
    reminder = "reminder"
    alert = "alert"
    welcome = "welcome"
    course_update = "course_update"
    system = "system"
    message = "message"
    admin_message = "admin_message"
    promotion = "promotion"
    update = "update"

class RecipientType(str, Enum):
    all = "all"
    students = "students"
    instructors = "instructors"
    admins = "admins"
    specific_users = "specific_users"

class NotificationPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class NotificationStatus(str, Enum):
    draft = "draft"
    scheduled = "scheduled"
    sent = "sent"
    failed = "failed"

class NotificationBase(BaseModel):
    title: str = Field(..., max_length=200)
    message: str = Field(..., max_length=2000)
    type: NotificationType = NotificationType.announcement
    recipient_type: RecipientType = RecipientType.all
    priority: NotificationPriority = NotificationPriority.medium
    scheduled_date: Optional[datetime] = None
    send_immediately: bool = True
    image_url: Optional[str] = None
    category: Optional[str] = "general"

class NotificationCreate(NotificationBase):
    recipient_ids: Optional[List[str]] = None  # For specific users
    # Multi-tenancy fields
    franchise_code: Optional[str] = None
    franchise_id: Optional[str] = None

class AdminNotificationCreate(NotificationBase):
    author: Optional[str] = "Admin"
    include_email_template: bool = False
    target_user_id: Optional[str] = None  # For individual targeting
    course_id: Optional[str] = None
    course_title: Optional[str] = None
    metadata: Optional[dict] = None
    # Multi-tenancy fields
    franchise_code: Optional[str] = None
    franchise_id: Optional[str] = None

class NotificationUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    type: Optional[NotificationType] = None
    recipient_type: Optional[RecipientType] = None
    priority: Optional[NotificationPriority] = None
    scheduled_date: Optional[datetime] = None
    send_immediately: Optional[bool] = None
    status: Optional[NotificationStatus] = None
    image_url: Optional[str] = None
    category: Optional[str] = None

class NotificationResponse(NotificationBase):
    id: str = Field(alias="_id")
    notification_id: str = Field(..., description="Human-readable notification ID like not001")
    status: NotificationStatus = NotificationStatus.draft
    author: str = "System"
    recipient_count: int = 0
    delivered_count: int = 0
    read_count: int = 0
    open_rate: float = 0.0
    click_rate: float = 0.0
    sent_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True

class UserNotificationResponse(BaseModel):
    id: str = Field(alias="_id")
    title: str
    message: str
    type: NotificationType
    priority: NotificationPriority
    status: NotificationStatus
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime
    image_url: Optional[str] = None
    category: Optional[str] = None

    class Config:
        populate_by_name = True

class NotificationStats(BaseModel):
    total_notifications: int
    sent_notifications: int
    draft_notifications: int
    scheduled_notifications: int
    failed_notifications: int
    total_recipients: int
    average_open_rate: float
    average_click_rate: float
