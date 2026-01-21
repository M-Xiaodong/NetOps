import base64
import hashlib
from datetime import datetime, timedelta
from typing import Any, Optional

from cryptography.fernet import Fernet
from jose import jwt
from passlib.context import CryptContext

from backend.core.config import settings

# 密码加密上下文 (Bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- JWT 授权部分 ---

def create_access_token(subject: str | Any, expires_delta: Optional[timedelta] = None) -> str:
    """创建 JWT 访问令牌"""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证明文密码与哈希值是否匹配"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """生成密码的哈希值"""
    return pwd_context.hash(password)

# --- 设备凭据加解密部分 ---

def _get_fernet() -> Fernet:
    """从 SECRET_KEY 派生合法的 Fernet 密钥"""
    key_hash = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    key_b64 = base64.urlsafe_b64encode(key_hash)
    return Fernet(key_b64)

def encrypt_password(password: str) -> str:
    """AES 加密设备密码"""
    if not password:
        return ""
    f = _get_fernet()
    return f.encrypt(password.encode()).decode()

def decrypt_password(encrypted_password: str) -> str:
    """AES 解密设备密码"""
    if not encrypted_password:
        return ""
    try:
        f = _get_fernet()
        return f.decrypt(encrypted_password.encode()).decode()
    except Exception:
        # 兼容处理明文或损坏的密文
        return encrypted_password
