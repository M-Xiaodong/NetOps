from typing import List, Dict, Any, Optional
from nornir import InitNornir
from nornir.core import Nornir
import logging

logger = logging.getLogger("automation")
from backend.core.config import settings

class NetworkEngine:
    """
    网络自动化引擎核心类
    负责初始化 Nornir，调度任务，并统一处理结果。
    """
    _instance = None
    _nornir: Optional[Nornir] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(NetworkEngine, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._nornir:
            self._init_nornir()

    def _init_nornir(self):
        """初始化 Nornir 对象，使用数据库动态库存"""
        try:
            # 引入动态库存插件
            from backend.network_engine.inventory import DatabaseInventory
            from nornir.core.plugins.inventory import InventoryPluginRegister
            
            # 注册自定义插件 (Nornir 3.0+ 规范)
            InventoryPluginRegister.register("DatabaseInventory", DatabaseInventory)
            
            runner = {
                "plugin": "threaded",
                "options": {
                    "num_workers": 100,
                },
            }
            
            self._nornir = InitNornir(
                runner=runner,
                inventory={
                    "plugin": "DatabaseInventory",
                },
                logging={"enabled": False} 
            )
            logger.info("Nornir 引擎初始化成功 (动态数据库模式)")
            
        except Exception as e:
            logger.error(f"Nornir 引擎初始化失败: {e}")
            raise e

    @property
    def nornir(self) -> Nornir:
        """获取 Nornir 实例"""
        if not self._nornir:
            self._init_nornir()
        return self._nornir

    def reload_inventory(self):
        """强制重新加载 Inventory (适用于设备变更后)"""
        logger.info("正在重新加载 Nornir Inventory...")
        self._nornir = None
        # 触发重新初始化
        self.nornir

    def filter_inventory(self, **kwargs) -> Nornir:
        """
        根据条件过滤设备
        例如: engine.filter_inventory(platform="huawei")
        """
        return self.nornir.filter(**kwargs)
