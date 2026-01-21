from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, create_engine, Session
from backend.core.config import settings

# SQLite 数据库配置
connect_args = {"check_same_thread": False}
engine = create_engine(settings.DATABASE_URL, echo=False, connect_args=connect_args)

# 提供手动会话创建能力（用于非 Depends 场景）
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=Session)

def init_db():
    """初始化数据库表结构"""
    SQLModel.metadata.create_all(engine)

def get_session():
    """获取数据库会话的依赖项"""
    with SessionLocal() as session:
        yield session
