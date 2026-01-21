from nornir.core.task import Task, Result
from nornir_napalm.plugins.tasks import napalm_get
import logging

logger = logging.getLogger("automation")
from datetime import datetime
import os

def backup_config(task: Task, backup_path: str) -> Result:
    """
    Nornir 任务: 备份设备配置
    
    Args:
        task: Nornir 任务对象
        backup_path: 备份根目录
        
    Returns:
        Result: 任务结果
    """
    try:
        # 使用 NAPALM 获取配置
        # getters=['config'] 会返回 running 和 startup 配置
        result = task.run(task=napalm_get, getters=["config"])
        
        if result.failed:
            return Result(host=task.host, result=f"获取配置失败: {result.exception}", failed=True)
            
        config_content = result.result["config"]["running"]
        
        # 构建保存路径: backup_path / region / device_name / date / config.cfg
        # 这里简化为: backup_path / device_name / timestamp.cfg
        # 实际应从 inventory data 获取 region
        region = task.host.data.get("region", "default")
        device_name = task.host.name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        save_dir = os.path.join(backup_path, region, device_name)
        os.makedirs(save_dir, exist_ok=True)
        
        filename = f"{device_name}_{timestamp}.cfg"
        full_path = os.path.join(save_dir, filename)
        
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(config_content)
            
        logger.info(f"设备 {device_name} 配置已备份至 {full_path}")
        return Result(host=task.host, result=full_path)
        
    except Exception as e:
        logger.error(f"设备 {task.host.name} 备份异常: {e}")
        return Result(host=task.host, result=str(e), failed=True)
