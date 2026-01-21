"""
Nornir模块主程序
"""
from .connection import ConnectionManager
from .commands import CommandExecutor
from .selector import DeviceSelector
from typing import List, Dict, Any
from loguru import logger

class NornirMain:
    """Nornir主程序类"""
    
    def __init__(self):
        self.connection_manager = ConnectionManager()
        self.command_executor = CommandExecutor()
        self.device_selector = DeviceSelector()
    
    def run_task(self, devices: List[Dict[str, Any]], task_func: callable) -> Dict[str, Any]:
        """
        在设备上运行任务
        
        Args:
            devices: 设备列表
            task_func: 任务函数
        
        Returns:
            任务结果
        """
        results = {}
        
        for device in devices:
            device_id = device.get('id') or device.get('ip')
            
            try:
                # 连接设备
                if not self.connection_manager.is_connected(device_id):
                    self.connection_manager.connect(device)
                
                # 执行任务
                result = task_func(device, self.command_executor)
                results[device_id] = {"success": True, "result": result}
                
            except Exception as e:
                logger.error(f"任务执行失败 {device_id}: {e}")
                results[device_id] = {"success": False, "error": str(e)}
        
        return results
    
    def cleanup(self):
        """清理资源"""
        self.connection_manager.disconnect_all()

# 示例任务函数
def backup_config_task(device: Dict[str, Any], executor: CommandExecutor) -> Dict[str, Any]:
    """备份配置任务"""
    device_id = device.get('id') or device.get('ip')
    return executor.get_device_config(device_id)
