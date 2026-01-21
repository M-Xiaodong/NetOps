from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select, Session
from backend.core.database import SessionLocal
from backend.models.user import User, UserRead, UserRole
from backend.models.system import Notification
from backend.api.auth.deps import get_current_user

router = APIRouter()

def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="权限不足，仅限管理员访问")
    return current_user

# --- 用户管理 ---

@router.get("/users", response_model=List[UserRead])
async def list_users(admin_user: User = Depends(get_admin_user)):
    """获取所有用户列表"""
    with SessionLocal() as session:
        statement = select(User).order_by(User.id)
        users = session.exec(statement).all()
        return users

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, admin_user: User = Depends(get_admin_user)):
    """删除指定用户"""
    if user_id == admin_user.id:
        raise HTTPException(status_code=400, detail="不能删除当前登录的管理员账号")
    
    with SessionLocal() as session:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        session.delete(user)
        session.commit()
    return {"message": "用户删除成功"}

# --- 通知中心 ---

@router.get("/notifications", response_model=List[Notification])
async def list_notifications(current_user: User = Depends(get_current_user)):
    """查看当前用户的通知（若是管理员可见全站通知）"""
    with SessionLocal() as session:
        statement = select(Notification).order_by(Notification.created_at.desc())
        if current_user.role != UserRole.ADMIN:
            statement = statement.where(Notification.user_id == current_user.id)
        notifications = session.exec(statement.limit(100)).all()
        return notifications

@router.post("/notifications/read-all")
async def mark_all_read(current_user: User = Depends(get_current_user)):
    """一键标记已读"""
    with SessionLocal() as session:
        statement = select(Notification).where(Notification.is_read == False)
        if current_user.role != UserRole.ADMIN:
            statement = statement.where(Notification.user_id == current_user.id)
        
        unread_notifications = session.exec(statement).all()
        for note in unread_notifications:
            note.is_read = True
            session.add(note)
        session.commit()
    return {"message": "已全部标记为已读"}
