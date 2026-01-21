from typing import Optional
from datetime import datetime
from enum import Enum
from sqlmodel import SQLModel, Field

class UserRole(str, Enum):
    """用户角色枚举"""
    ADMIN = "admin"       # 管理员
    OPERATOR = "operator" # 操作员
    VIEWER = "viewer"     # 访客

class UserBase(SQLModel):
    """用户基础模型"""
    username: str = Field(index=True, unique=True, description="用户名")
    email: Optional[str] = Field(None, description="邮箱地址")
    full_name: Optional[str] = Field(None, description="全名")
    role: UserRole = Field(default=UserRole.VIEWER, description="用户角色")
    is_active: bool = Field(default=True, description="是否激活")

class User(UserBase, table=True):
    """用户数据库表模型"""
    id: Optional[int] = Field(default=None, primary_key=True, description="用户ID")
    hashed_password: str = Field(description="加密后的密码")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间")
    last_login: Optional[datetime] = Field(None, description="最后登录时间")

class UserCreate(UserBase):
    """用户创建模型（包含明文密码）"""
    password: str = Field(description="密码")

class UserRead(UserBase):
    """用户读取模型（不包含密码）"""
    id: int
    created_at: datetime
    last_login: Optional[datetime] = None

class UserUpdate(SQLModel):
    """用户更新模型"""
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

# Token 模型
class Token(SQLModel):
    """JWT 令牌模型"""
    access_token: str
    token_type: str = "bearer"

class TokenData(SQLModel):
    """令牌载荷数据"""
    username: Optional[str] = None
    role: Optional[str] = None
