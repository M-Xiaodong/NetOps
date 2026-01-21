from typing import Optional
from sqlmodel import Session, select
from backend.models.user import User, UserCreate
from backend.core.security import get_password_hash, verify_password
import logging

logger = logging.getLogger("services")

class AuthService:
    """认证服务"""
    
    def __init__(self, session: Session):
        self.session = session

    def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """
        验证用户凭据
        
        Args:
            username: 用户名
            password: 密码
            
        Returns:
            User: 如果验证成功返回用户对象，否则返回 None
        """
        statement = select(User).where(User.username == username)
        user = self.session.exec(statement).first()
        
        if not user:
            logger.warning(f"认证失败: 用户 {username} 不存在")
            return None
            
        if not verify_password(password, user.hashed_password):
            logger.warning(f"认证失败: 用户 {username} 密码错误")
            return None
            
        return user

    def create_user(self, user_in: UserCreate) -> User:
        """
        创建新用户
        
        Args:
            user_in: 用户创建数据
            
        Returns:
            User: 创建的用户对象
        """
        # 检查用户是否存在
        statement = select(User).where(User.username == user_in.username)
        if self.session.exec(statement).first():
            raise ValueError("用户名已存在")
            
        # 创建用户
        user_data = user_in.model_dump(exclude={"password"})
        hashed_password = get_password_hash(user_in.password)
        db_user = User(**user_data, hashed_password=hashed_password)
        
        self.session.add(db_user)
        self.session.commit()
        self.session.refresh(db_user)
        
        logger.info(f"创建新用户: {user_in.username}")
        return db_user

    def get_user_by_username(self, username: str) -> Optional[User]:
        """根据用户名获取用户"""
        statement = select(User).where(User.username == username)
        return self.session.exec(statement).first()
