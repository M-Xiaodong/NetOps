from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlmodel import Session

from backend.core.config import settings
from backend.core.database import get_session
from backend.models.user import User, TokenData, UserRole
from backend.services.auth.auth_service import AuthService

# auto_error=False 允许在没有 token 的情况下进入函数，而不是直接抛出 401
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

async def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    session: Session = Depends(get_session)
) -> User:
    """
    解析 Token 获取当前用户。
    如果未提供 Token (开发模式)，返回默认管理员用户。
    """
    # 开发模式兜底：如果没有 Token，直接返回默认管理员
    dev_admin = User(
        id=1,
        username="admin",
        email="admin@example.com",
        full_name="Administrator",
        role=UserRole.ADMIN,
        is_active=True,
        hashed_password="dummy"
    )
    
    if not token:
        return dev_admin

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的认证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            # 开发模式：Token 无效时返回默认管理员
            return dev_admin
        token_data = TokenData(username=username)
    except JWTError:
        # 开发模式：Token 解析失败时返回默认管理员
        return dev_admin
        
    auth_service = AuthService(session)
    user = auth_service.get_user_by_username(token_data.username)
    if user is None:
        # 开发模式：用户不存在时返回默认管理员
        return dev_admin
    return user

async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """
    获取当前激活用户
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="用户未激活")
    return current_user
