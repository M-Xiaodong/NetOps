from typing import Any, Dict, Optional
from napalm import get_network_driver
import logging

logger = logging.getLogger("automation")

class NapalmDriver:
    """
    NAPALM 驱动封装
    用于直接与设备交互，不通过 Nornir（备用模式或单机调试用）
    """
    
    def __init__(self, hostname: str, username: str, password: str, platform: str, optional_args: Optional[Dict] = None):
        self.hostname = hostname
        self.username = username
        self.password = password
        self.platform = platform
        self.optional_args = optional_args or {}
        self.driver = None
        self.device = None

    def open(self):
        """建立连接"""
        try:
            driver_class = get_network_driver(self.platform)
            self.driver = driver_class(
                self.hostname,
                self.username,
                self.password,
                optional_args=self.optional_args
            )
            self.driver.open()
            self.device = self.driver
            logger.info(f"已连接到设备: {self.hostname} ({self.platform})")
        except Exception as e:
            logger.error(f"连接设备失败 {self.hostname}: {e}")
            raise e

    def close(self):
        """关闭连接"""
        if self.device:
            self.device.close()
            logger.info(f"已断开设备: {self.hostname}")

    def get_facts(self) -> Dict[str, Any]:
        """获取设备基本信息"""
        if not self.device:
            raise ConnectionError("设备未连接")
        return self.device.get_facts()
        
    def get_config(self, retrieve: str = "all") -> Dict[str, Any]:
        """获取配置"""
        if not self.device:
            raise ConnectionError("设备未连接")
        return self.device.get_config(retrieve=retrieve)
