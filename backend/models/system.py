from enum import Enum
from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship

class NotificationType(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"

class Notification(SQLModel, table=True):
    """系统通知模型"""
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(description="通知标题")
    content: str = Field(description="通知内容")
    type: str = Field(default="info", description="通知类型") # info, success, warning, error
    is_read: bool = Field(default=False, description="是否已读")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")

class GlobalSearchUpdate(SQLModel):
    """简单搜素结果模型 (用于 API 返回)"""
    title: str
    description: str
    type: str # device, config, automation
    link: str
    id: str | int
