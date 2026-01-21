from nornir.core.task import Task, Result
from nornir_napalm.plugins.tasks import napalm_get
import logging

logger = logging.getLogger("automation")

def inspect_device(task: Task) -> Result:
    """
    Nornir 任务: 设备基础巡检
    获取 facts, interfaces, environment 等信息
    """
    try:
        # 获取多项信息
        getters = ["facts", "interfaces", "environment"]
        result = task.run(task=napalm_get, getters=getters)
        
        if result.failed:
            return Result(host=task.host, result=f"巡检失败: {result.exception}", failed=True)
            
        # 整理数据
        data = result.result
        summary = {
            "hostname": data["facts"]["hostname"],
            "model": data["facts"]["model"],
            "version": data["facts"]["os_version"],
            "uptime": data["facts"]["uptime"],
            "interface_count": len(data["interfaces"]),
            "cpu_usage": data["environment"].get("cpu", {}),
            "memory_usage": data["environment"].get("memory", {})
        }
        
        logger.info(f"设备 {task.host.name} 巡检完成")
        return Result(host=task.host, result=summary)
        
    except Exception as e:
        logger.error(f"设备 {task.host.name} 巡检异常: {e}")
        return Result(host=task.host, result=str(e), failed=True)
