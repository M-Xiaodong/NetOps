from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session
import logging

from backend.core.database import get_session
from backend.core.security import create_access_token
from backend.core.config import settings
from backend.services.auth.auth_service import AuthService
from backend.models.user import Token, UserRead, UserCreate

router = APIRouter()
logger = logging.getLogger("api")

@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Session = Depends(get_session)
):
    """
    OAuth2 兼容的令牌登录接口
    """
    auth_service = AuthService(session)
    user = auth_service.authenticate_user(form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.username, expires_delta=access_token_expires
    )
    
    logger.info(f"用户登录成功: {user.username}")
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=UserRead)
async def register_user(
    user_in: UserCreate,
    session: Session = Depends(get_session)
):
    """
    注册新用户 (仅供测试或管理员使用)
    """
    auth_service = AuthService(session)
    try:
        user = auth_service.create_user(user_in)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
