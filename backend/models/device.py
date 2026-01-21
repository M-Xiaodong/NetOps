from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
from sqlmodel import SQLModel, Field, JSON

class DeviceStatus(str, Enum):
    """设备状态枚举"""
    ONLINE = "online"           # 在线
    OFFLINE = "offline"         # 离线
    UNREACHABLE = "unreachable" # 不可达
    UNKNOWN = "unknown"         # 未知

class DeviceBase(SQLModel):
    """设备基础模型"""
    name: str = Field(index=True, unique=True, description="设备名称")
    ip: str = Field(index=True, description="管理IP地址")
    hostname: Optional[str] = Field(None, description="主机名")
    sn: Optional[str] = Field(None, description="设备序列号")
    platform: Optional[str] = Field(None, description="平台类型 (如 huawei, cisco_ios)")
    vendor: Optional[str] = Field(None, description="厂商")
    model: Optional[str] = Field(None, description="硬件型号")
    region: Optional[str] = Field(None, description="所属区域")
    location: Optional[str] = Field(None, description="具体位置")
    group_name: Optional[str] = Field(default="default", description="设备分组")
    device_type: Optional[str] = Field(None, description="设备类型 (如 交换机, 路由器)")
    status: DeviceStatus = Field(default=DeviceStatus.UNKNOWN, description="设备状态")
    
    # 凭据与连接信息
    username: Optional[str] = Field(None, description="登录用户名")
    password: Optional[str] = Field(None, description="登录密码 (加密存储)")
    secret: Optional[str] = Field(None, description="特权密码 (enable password)")
    port: int = Field(default=22, description="SSH/Telnet 端口")
    connection_type: str = Field(default="ssh", description="连接方式: ssh 或 telnet")
    
    description: Optional[str] = Field(None, description="备注描述")
    
    # 对于 SQLite，JSON 类型通常存储为文本。SQLModel/SQLAlchemy 会自动处理序列化。
    metadata_info: Optional[Dict[str, Any]] = Field(default={}, sa_type=JSON, description="扩展元数据")

class Device(DeviceBase, table=True):
    """设备数据库表模型"""
    id: Optional[int] = Field(default=None, primary_key=True, description="设备ID")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="更新时间")

class DeviceCreate(DeviceBase):
    """设备创建模型"""
    pass

class DeviceRead(DeviceBase):
    """设备读取模型"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    # 彻底杜绝凭据返回前端
    password: Optional[str] = Field(None, exclude=True)
    secret: Optional[str] = Field(None, exclude=True)

class DeviceUpdate(SQLModel):
    """设备更新模型"""
    name: Optional[str] = None
    ip: Optional[str] = None
    hostname: Optional[str] = None
    platform: Optional[str] = None
    vendor: Optional[str] = None
    model: Optional[str] = None
    region: Optional[str] = None
    location: Optional[str] = None
    group_name: Optional[str] = None
    device_type: Optional[str] = None
    status: Optional[DeviceStatus] = None
    username: Optional[str] = None
    password: Optional[str] = None
    secret: Optional[str] = None
    port: Optional[int] = None
    connection_type: Optional[str] = None
    description: Optional[str] = None
    metadata_info: Optional[Dict[str, Any]] = None

# 非数据库模型（用于文件解析）
class DeviceConfig(SQLModel):
    """设备配置文件元数据模型"""
    filename: str = Field(description="文件名")
    path: str = Field(description="文件路径")
    size: int = Field(description="文件大小(字节)")
    modified_time: float = Field(description="修改时间戳")
    device_name: Optional[str] = Field(None, description="解析出的设备名")
    platform: Optional[str] = Field(None, description="解析出的平台")
    device_type: Optional[str] = Field(None, description="设备类型")
    error: Optional[str] = Field(None, description="错误信息")
    content: Optional[str] = Field(None, description="配置内容")

class FileNode(SQLModel):
    """文件树节点模型"""
    id: str = Field(description="节点唯一ID")
    name: str = Field(description="显示名称")
    path: str = Field(description="完整路径")
    type: str = Field(description="类型: file 或 directory")
    children: Optional[List['FileNode']] = Field(None, description="子节点列表")
    device_type: Optional[str] = Field(None, description="设备类型")
    file_count: Optional[int] = Field(None, description="文件数量")
    mtime: Optional[float] = Field(None, description="修改时间")
