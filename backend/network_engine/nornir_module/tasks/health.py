from nornir.core.task import Task, Result
from nornir_napalm.plugins.tasks import napalm_get
import logging
from datetime import datetime

logger = logging.getLogger("automation")

def inspect_health(task: Task) -> Result:
    """
    Nornir 任务: 深度健康巡检
    覆盖: 硬件状态、资源利用率、接口质量
    该函数会返回标准化的 HealthData 结构。
    """
    try:
        # 每个阶段开始前记录时间，用于性能分析
        t0 = datetime.now()
        
        # 1. 阶段一：建立通信链路并采集基础信息 (Facts)
        res_facts = task.run(task=napalm_get, getters=["facts"], name="1. 建立 SSH 通信并执行 Version 采集")
        t1 = datetime.now()
        if res_facts.failed:
            return Result(host=task.host, result=f"设备连接失败: {res_facts.exception}", failed=True)
            
        # 2. 阶段二：采集资源指标 (CPU/Memory/Hw)
        res_env = task.run(task=napalm_get, getters=["environment"], name="2. 采集 CPU 与内存利用率指标")
        t2 = datetime.now()
        
        # 3. 阶段三：采集端口运行数据
        res_intf = task.run(task=napalm_get, getters=["interfaces", "interfaces_counters"], name="3. 采集接口状态与流量计数器")
        t3 = datetime.now()

        # 整理原始数据映射
        facts = res_facts.result.get("facts", {})
        env_data = res_env.result.get("environment", {})
        interfaces = res_intf.result.get("interfaces", {})
        counters = res_intf.result.get("interfaces_counters", {})
        
        # CPU: 尝试获取任意核心的 usage
        cpu_usage = 0
        cpu_metrics = env_data.get("cpu", {})
        if isinstance(cpu_metrics, dict):
            for _, core_metrics in cpu_metrics.items():
                if isinstance(core_metrics, dict) and 'usage' in core_metrics:
                    cpu_usage = core_metrics['usage']
                    break
        
        # Memory: 增强多品牌（特别是华为）字段兼容
        mem_usage = 0
        mem_data = env_data.get("memory", {})
        if isinstance(mem_data, dict):
            # 兼容嵌套结构 (华为 VRP 常用 {"System": {"usage": 10}} 或 {"Slot 0": {...}})
            possible_metrics = []
            if any(k in mem_data for k in ["usage", "usage_percentage", "utilization", "used", "limit"]):
                # 扁平结构
                possible_metrics.append(mem_data)
            else:
                # 嵌套结构，遍历所有子项
                for k, v in mem_data.items():
                    if isinstance(v, dict):
                        possible_metrics.append(v)
            
            # 识别逻辑优先级：1. 现成百分比，2. 计算值
            for metrics in possible_metrics:
                p_val = metrics.get("usage_percentage") or metrics.get("usage") or metrics.get("utilization") or None
                if p_val is not None:
                    mem_usage = float(p_val)
                    break
                
                used = metrics.get("used") or metrics.get("used_ram") or metrics.get("used_mb") or metrics.get("usage_mb") or 0
                limit = metrics.get("limit") or metrics.get("total_ram") or metrics.get("total_mb") or metrics.get("size_mb") or 0
                if limit > 0:
                    mem_usage = round((float(used) / float(limit)) * 100, 2)
                    break
        
        # 华为设备终极兜底：如果解析结果还是 0%，直接通过 CLI 命令抓取
        if mem_usage == 0 and ("huawei" in str(task.host.platform).lower() or "vrp" in str(task.host.platform).lower()):
            try:
                from nornir_napalm.plugins.tasks import napalm_cli
                cli_res = task.run(task=napalm_cli, commands=["display memory-usage"], name="华为内存指令采集 (兜底)").result
                output = cli_res.get("display memory-usage", "")
                import re
                # 方案 A: 匹配百分比字样
                match_p = re.search(r"Memory Using Percentage Is:\s+(\d+)%", output)
                if match_p:
                    mem_usage = float(match_p.group(1))
                else:
                    # 方案 B: 通过 Total 和 Used 实数值计算 (华为 VRP 专用采集)
                    total_match = re.search(r"System Total Memory Is:\s+(\d+)", output, re.IGNORECASE)
                    used_match = re.search(r"Total Memory Used Is:\s+(\d+)", output, re.IGNORECASE)
                    if total_match and used_match:
                        t_val = float(total_match.group(1))
                        u_val = float(used_match.group(1))
                        if t_val > 0:
                            mem_usage = round((u_val / t_val) * 100, 2)
            except Exception as e:
                logger.warning(f"华为内存 CLI 兜底采集失败: {e}")

        # Temperature Max Value
        max_temp = None
        temps = env_data.get("temperature", {})
        if temps and isinstance(temps, dict):
            try:
                valid_temps = [t.get('temperature') for t in temps.values() if isinstance(t, dict) and t.get('temperature') is not None]
                if valid_temps: max_temp = float(max(valid_temps))
            except: pass

        # 构造最终结构，包含审计与耗时信息
        health_data = {
            "timestamp": datetime.now().isoformat(),
            "performance": {
                "connect_latency": (t1 - t0).total_seconds(),
                "env_gather_latency": (t2 - t1).total_seconds(),
                "intf_gather_latency": (t3 - t2).total_seconds(),
                "total_processing": (datetime.now() - t0).total_seconds()
            },
            "audit_trail": {
                "commands_executed": [
                    "NAPALM getter: facts [display version...]",
                    "NAPALM getter: environment [display cpu/memory/fan/power...]",
                    "NAPALM getter: interfaces/counters [display interface...]"
                ]
            },
            "basic": {
                "hostname": facts.get("hostname", "Unknown"),
                "model": facts.get("model", "Unknown"),
                "version": facts.get("os_version", "Unknown"),
                "uptime": facts.get("uptime", 0),
                "sn": facts.get("serial_number", "Unknown")
            },
            "resources": {
                "cpu_avg": cpu_usage,
                "memory_usage": mem_usage
            },
            "hardware": {
                "fans_ok": _check_hardware_status(env_data.get("fans", {})),
                "pwr_ok": _check_hardware_status(env_data.get("power", {})),
                "temp_ok": _check_temp_status(env_data.get("temperature", {})),
                "max_temp": max_temp
            },
            "interface_stats": {
                "total": len(interfaces),
                "up_count": sum(1 for i in interfaces.values() if i.get("is_up")),
                "error_total": sum(max(0, c.get("rx_errors", 0)) + max(0, c.get("tx_errors", 0)) for c in counters.values())
            }
        }
        return Result(host=task.host, result=health_data)
        
    except Exception as e:
        logger.error(f"设备 {task.host.name} 健康巡检崩溃: {str(e)}")
        # 即使处理数据失败，也尽量返回错误信息，而不是导致整个 Nornir 任务结果丢失
        return Result(host=task.host, result=f"数据解析错误: {str(e)}", failed=True)

def _check_hardware_status(component_dict: dict) -> bool:
    """辅助函数：检查硬件组件状态"""
    if not component_dict:
        return True # 如果没有数据，默认通过? 或者 False? 视情况而定，这里偏向不误报
    
    # NAPALM 标准: status=True 正常
    return all(item.get("status", True) for item in component_dict.values())

def _check_temp_status(temp_dict: dict) -> bool:
    """辅助函数：检查温度"""
    if not temp_dict:
        return True
    # NAPALM 标准: is_alert=True 异常, is_critical=True 异常
    for item in temp_dict.values():
        if item.get("is_alert") or item.get("is_critical"):
            return False
    return True
