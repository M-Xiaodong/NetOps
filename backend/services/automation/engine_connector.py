from typing import List, Dict, Any
from backend.network_engine.core import NetworkEngine
from backend.network_engine.nornir_module.tasks.backup import backup_config
from backend.network_engine.nornir_module.tasks.inspect import inspect_device
from backend.core.config import settings
import logging

logger = logging.getLogger("automation")

logger = logging.getLogger("automation")

class AutomationService:
    """
    自动化服务
    连接 Web App 与 Network Engine
    """
    
    def __init__(self):
        self.engine = NetworkEngine()

    def run_backup(self, device_names: List[str] = None) -> Dict[str, Any]:
        """
        执行配置备份任务
        """
        if device_names:
            target = self.engine.filter_inventory(name=device_names)
        else:
            target = self.engine.nornir # 全量
            
        logger.info(f"开始执行备份任务，目标设备数: {len(target.inventory.hosts)}")
        
        # 运行 Nornir 任务
        result = target.run(
            task=backup_config,
            backup_path=str(settings.STORAGE_DIR / "backups")
        )
        
        # 处理结果
        summary = {
            "total": len(target.inventory.hosts),
            "success": 0,
            "failed": 0,
            "details": {}
        }
        
        for host, multi_result in result.items():
            task_result = multi_result[0] # 获取第一个任务的结果
            summary["details"][host] = {
                "failed": task_result.failed,
                "result": task_result.result
            }
            if task_result.failed:
                summary["failed"] += 1
            else:
                summary["success"] += 1
                
        return summary

    def run_inspect(self, device_names: List[str] = None) -> Dict[str, Any]:
        """
        执行设备巡检任务
        """
        if device_names:
            target = self.engine.filter_inventory(name=device_names)
        else:
            target = self.engine.nornir
            
        logger.info(f"开始执行巡检任务，目标设备数: {len(target.inventory.hosts)}")
        
        result = target.run(task=inspect_device)
        
        summary = {
            "total": len(target.inventory.hosts),
            "success": 0,
            "failed": 0,
            "details": {}
        }
        
        for host, multi_result in result.items():
            task_result = multi_result[0]
            summary["details"][host] = {
                "failed": task_result.failed,
                "result": task_result.result
            }
            if task_result.failed:
                summary["failed"] += 1
            else:
                summary["success"] += 1
                
        return summary
