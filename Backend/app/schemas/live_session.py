from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class LiveSessionBase(BaseModel):
    course_id: str
    scheduled_time: datetime
    status: str = Field("scheduled", pattern="^(scheduled|live|completed)$")

class LiveSessionCreate(LiveSessionBase):
    pass  # We will infer created_by from the current user

class LiveSessionUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(scheduled|live|completed)$")
    scheduled_time: Optional[datetime] = None

class LiveSessionOut(LiveSessionBase):
    id: str
    channel_name: str
    created_by: str
    created_by_role: str
    course_title: Optional[str] = None
    created_at: datetime
