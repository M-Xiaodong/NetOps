from typing import Dict, Any, List
from nornir.core.inventory import Inventory, Hosts, Groups, Defaults, Host, Group, ConnectionOptions
from sqlmodel import Session, select
from backend.core.database import engine
from backend.models.device import Device, DeviceStatus
from backend.core.security import decrypt_password
import logging

logger = logging.getLogger("automation")

class DatabaseInventory:
    """
    Nornir 动态库存插件: 从 SQLModel 数据库加载设备
    """
    def __init__(self, **kwargs):
        self.kwargs = kwargs

    def load(self) -> Inventory:
        hosts = Hosts()
        groups = Groups()
        defaults = Defaults()

        with Session(engine) as session:
            # 1. 加载所有设备
            statement = select(Device)
            db_devices = session.exec(statement).all()
            
            for db_device in db_devices:
                # 转换数据库模型到 Nornir Host
                # 注意：目前为了简化，直接映射。实际生产中应该增加解密逻辑
                host_data = {
                    "hostname": db_device.ip,
                    "username": db_device.username,
                    "password": decrypt_password(db_device.password),
                    "port": db_device.port,
                    "platform": db_device.platform,
                    "data": {
                        "db_id": db_device.id,
                        "name": db_device.name,
                        "vendor": db_device.vendor,
                        "model": db_device.model,
                        "region": db_device.region,
                        "group": db_device.group_name,
                        "secret": decrypt_password(db_device.secret), # enable password
                        "connection_type": db_device.connection_type,
                        "metadata": db_device.metadata_info or {}
                    }
                }
                
                # 过滤掉不完整的条目
                if not host_data["hostname"] or not host_data["platform"]:
                    logger.warning(f"跳过信息不全的设备: {db_device.name}")
                    continue
                
                # 配置连接参数，显著增加超时容忍度，解决华为等设备响应慢导致的 Pattern not detected 问题
                # 设置 global_delay_factor 为 4 以确保极其保守的等待时间
                options = {
                    "napalm": ConnectionOptions(
                        extras={
                            "optional_args": {
                                "global_delay_factor": 1, 
                                "read_timeout": 60,
                                "use_keys": False,
                                "allow_agent": False
                            }
                        }
                    ),
                    "netmiko": ConnectionOptions(
                        extras={
                            "global_delay_factor": 1,
                            "read_timeout": 60,
                            "fast_cli": True,
                            "use_keys": False,
                            "allow_agent": False
                        }
                    )
                }
                    
                hosts[db_device.name] = Host(
                    name=db_device.name, 
                    connection_options=options,
                    **host_data
                )
                
                # 2. 自动根据分组建立 Group (暂不深挖继承，仅做标记)
                if db_device.group_name and db_device.group_name not in groups:
                    groups[db_device.group_name] = Group(name=db_device.group_name)

        return Inventory(hosts=hosts, groups=groups, defaults=defaults)

def get_inventory():
    """工厂函数提供给 Nornir 调用"""
    return DatabaseInventory().load()
