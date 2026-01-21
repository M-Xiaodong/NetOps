from typing import List, Optional
from sqlmodel import Session, select
from backend.models.device import Device, DeviceCreate, DeviceUpdate, DeviceStatus
import logging
from backend.core.security import encrypt_password

logger = logging.getLogger("services")

class DeviceService:
    """设备管理服务"""
    
    def __init__(self, session: Session):
        self.session = session

    def get_devices(self, skip: int = 0, limit: int = 100) -> List[Device]:
        """获取设备列表"""
        statement = select(Device).offset(skip).limit(limit)
        return self.session.exec(statement).all()

    def get_device(self, device_id: int) -> Optional[Device]:
        """根据ID获取设备"""
        return self.session.get(Device, device_id)

    def get_device_by_name(self, name: str) -> Optional[Device]:
        """根据名称获取设备"""
        statement = select(Device).where(Device.name == name)
        return self.session.exec(statement).first()
        
    def get_device_by_ip(self, ip: str) -> Optional[Device]:
        """根据IP获取设备"""
        statement = select(Device).where(Device.ip == ip)
        return self.session.exec(statement).first()

    def create_device(self, device_in: DeviceCreate) -> Device:
        """创建新设备"""
        # 检查名称冲突
        if self.get_device_by_name(device_in.name):
            raise ValueError(f"设备名称 {device_in.name} 已存在")
            
        # 检查IP冲突 (可选，视需求而定，这里假设IP也应唯一)
        if self.get_device_by_ip(device_in.ip):
            raise ValueError(f"设备IP {device_in.ip} 已存在")
            
        db_device = Device.model_validate(device_in)
        
        # 敏感信息加密
        if db_device.password:
            db_device.password = encrypt_password(db_device.password)
        if db_device.secret:
            db_device.secret = encrypt_password(db_device.secret)
            
        self.session.add(db_device)
        self.session.commit()
        self.session.refresh(db_device)
        
        logger.info(f"创建新设备: {db_device.name} ({db_device.ip})")
        return db_device

    def update_device(self, device_id: int, device_in: DeviceUpdate) -> Optional[Device]:
        """更新设备信息"""
        db_device = self.get_device(device_id)
        if not db_device:
            return None
            
        device_data = device_in.model_dump(exclude_unset=True)
        for key, value in device_data.items():
            # 更新时也要加密敏感字段
            if key in ["password", "secret"] and value:
                value = encrypt_password(value)
            setattr(db_device, key, value)
            
        self.session.add(db_device)
        self.session.commit()
        self.session.refresh(db_device)
        
        logger.info(f"更新设备: {db_device.name}")
        return db_device

    def delete_device(self, device_id: int) -> bool:
        """删除设备"""
        db_device = self.get_device(device_id)
        if not db_device:
            return False
            
        self.session.delete(db_device)
        self.session.commit()
        
        logger.info(f"删除设备: {db_device.name}")
        return True
