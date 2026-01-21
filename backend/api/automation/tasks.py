from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
import logging
from pydantic import BaseModel

from backend.services.automation.engine_connector import AutomationService
from backend.models.user import User
from backend.api.auth.deps import get_current_active_user

router = APIRouter()
logger = logging.getLogger("api")

from backend.core.database import get_session
from sqlmodel import Session, select, desc, col
from backend.models.automation import AutomationJob, JobLog, TaskType, JobScheduleType, JobStatus
from backend.models.device import Device

class QuickTaskRequest(BaseModel):
    task_type: TaskType
    device_ids: List[int]
    commands: Optional[List[str]] = []

@router.get("/tasks/inspect/history")
async def get_inspect_history(
    job_id: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """获取巡检历史记录"""
    statement = select(JobLog)
    if job_id:
        statement = statement.where(JobLog.job_id == job_id)
    
    statement = statement.order_by(desc(JobLog.start_time)).limit(20)
    results = session.exec(statement).all()
    return results

@router.get("/jobs/{job_id}/logs")
async def get_job_logs(
    job_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """获取指定作业的所有执行日志，包含详细步骤信息"""
    logs = session.exec(
        select(JobLog)
        .where(JobLog.job_id == job_id)
        .order_by(desc(JobLog.start_time))
        .limit(50)
    ).all()
    return logs

@router.get("/tasks/logs/{log_id}/summary")
async def get_inspect_summary(
    log_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """获取巡检结果的聚合统计信息 (用于图形化展示)"""
    log = session.get(JobLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="日志记录不存在")
    
    results = log.results or {}
    
    summary = {
        "total": len(results),
        "success": 0,
        "failed": 0,
        "cpu_distribution": {"0-20%": 0, "20-40%": 0, "40-60%": 0, "60-80%": 0, "80-100%": 0},
        "mem_distribution": {"0-20%": 0, "20-40%": 0, "40-60%": 0, "60-80%": 0, "80-100%": 0},
        "hardware_health": {"fans": {"ok": 0, "fail": 0}, "pwr": {"ok": 0, "fail": 0}, "temp": {"ok": 0, "fail": 0}},
        "interface_errors": {"total_errors": 0, "top_error_devices": []},
        "device_list": [] # 用于明细表格展现
    }

    error_devices = []

    for host, data in results.items():
        # 1. 基础状态统计
        is_success = data.get("success", False)
        if is_success:
            summary["success"] += 1
        else:
            summary["failed"] += 1
        
        # 2. 查找 HealthData
        health_info = None
        steps = data.get("steps", [])
        for step in reversed(steps):
            res_body = step.get("result")
            if isinstance(res_body, dict) and ("resources" in res_body or "basic" in res_body):
                health_info = res_body
                break
        
        device_entry = {
            "hostname": host,
            "status": "success" if is_success else "failed",
            "cpu": 0,
            "mem": 0,
            "error_msg": data.get("error")
        }

        if health_info:
            res = health_info.get("resources", {})
            cpu = float(res.get("cpu_avg") or 0)
            mem = float(res.get("memory_usage") or 0)
            
            device_entry["cpu"] = cpu
            device_entry["mem"] = mem
            device_entry["model"] = health_info.get("basic", {}).get("model")
            device_entry["version"] = health_info.get("basic", {}).get("version")

            # 分布统计
            def get_bucket(val):
                v = float(val or 0)
                if v < 20: return "0-20%"
                if v < 40: return "20-40%"
                if v < 60: return "40-60%"
                if v < 80: return "60-80%"
                return "80-100%"
            
            summary["cpu_distribution"][get_bucket(cpu)] += 1
            summary["mem_distribution"][get_bucket(mem)] += 1

            # 硬件健康度统计
            hw = health_info.get("hardware", {})
            summary["hardware_health"]["fans"]["ok" if hw.get("fans_ok", True) else "fail"] += 1
            summary["hardware_health"]["pwr"]["ok" if hw.get("pwr_ok", True) else "fail"] += 1
            summary["hardware_health"]["temp"]["ok" if hw.get("temp_ok", True) else "fail"] += 1

            # 接口错误统计
            if_stats = health_info.get("interface_stats", {})
            err_count = if_stats.get("error_total", 0)
            summary["interface_errors"]["total_errors"] += err_count
            if err_count > 0:
                error_devices.append({"hostname": host, "errors": err_count})
        
        summary["device_list"].append(device_entry)

    # 排序 Top 错误设备
    error_devices.sort(key=lambda x: x["errors"], reverse=True)
    summary["interface_errors"]["top_error_devices"] = error_devices[:10]

    return summary

@router.get("/tasks/inspect/overall-summary")
async def get_overall_inspect_summary(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """获取全量资产的最新巡检快照 (资产中心化看板核心)"""
    # 1. 获取所有设备
    all_devices = session.exec(select(Device)).all()
    device_map = {d.name: {"device": d, "latest_result": None} for d in all_devices}

    # 2. 扫描最近的成功/部分成功的巡检日志
    # 增加更强大的状态匹配，兼容 Enum 对象和多种字符串格式
    valid_statuses = [JobStatus.SUCCESS, JobStatus.PARTIAL, "success", "partial", "SUCCESS", "PARTIAL"]
    logs = session.exec(
        select(JobLog)
        .where(JobLog.status.in_(valid_statuses))
        .order_by(desc(JobLog.start_time))
        .limit(100)
    ).all()

    # 3. 填充映射 (从新到旧，确保取到的是每台设备的最新数据)
    filled_count = 0
    total_to_fill = len(device_map)
    
    for log in logs:
        if filled_count >= total_to_fill:
            break
            
        results = log.results or {}
        for host, data in results.items():
            if host in device_map and device_map[host]["latest_result"] is None:
                # 提取 HealthData
                health_info = None
                steps = data.get("steps", [])
                for step in reversed(steps):
                    if isinstance(step.get("result"), dict) and "resources" in step["result"]:
                        health_info = step["result"]
                        break
                
                if health_info:
                    try:
                        device_map[host]["latest_result"] = {
                            "log_id": log.id,
                            "time": log.start_time,
                            "success": data.get("success", False),
                            "health": health_info
                        }
                        filled_count += 1
                    except Exception as e:
                        logger.error(f"解析全量快照数据失败 (Host: {host}): {e}")
                        continue

    # 4. 聚合统计
    summary = {
        "stats": {
            "total": len(all_devices),
            "normal": 0,
            "critical": 0,
            "pending": len(all_devices) - filled_count
        },
        # 接下来的分布统计用于次要图表分析
        "cpu_distribution": {"0-20%": 0, "20-40%": 0, "40-60%": 0, "60-80%": 0, "80-100%": 0},
        "mem_distribution": {"0-20%": 0, "20-40%": 0, "40-60%": 0, "60-80%": 0, "80-100%": 0},
        "device_list": []
    }

    for name, info in device_map.items():
        dev = info["device"]
        res = info["latest_result"]
        
        entry = {
            "hostname": name,
            "ip": dev.ip,
            "vendor": dev.vendor,
            "model": dev.model,
            "last_inspected": res["time"] if res else None,
            "status": "uninspected",
            "cpu": 0,
            "mem": 0,
            "temperature": 0,
            "fans_ok": True,
            "pwr_ok": True,
            "has_error": False
        }

        try:
            if res:
                h = res["health"]
                is_success = res["success"]
                
                # 基础指标 (确保转为 float 以免 NoneType 报错)
                cpu = float(h.get("resources", {}).get("cpu_avg") or 0)
                mem = float(h.get("resources", {}).get("memory_usage") or 0)
                hw = h.get("hardware", {})
                temp = float(hw.get("temperature") or 0)
                fans_ok = hw.get("fans_ok", True)
                pwr_ok = hw.get("pwr_ok", True)
                
                entry.update({
                    "status": "success" if is_success else "failed",
                    "cpu": cpu,
                    "mem": mem,
                    "temperature": temp,
                    "fans_ok": fans_ok,
                    "pwr_ok": pwr_ok,
                    "has_error": not (is_success and fans_ok and pwr_ok)
                })

                # 统计
                if entry["has_error"]:
                    summary["stats"]["critical"] += 1
                else:
                    summary["stats"]["normal"] += 1
                
                # 分布统计助记函数 (健壮设计)
                def get_bucket(val):
                    v = float(val or 0)
                    if v < 20: return "0-20%"
                    if v < 40: return "20-40%"
                    if v < 60: return "40-60%"
                    if v < 80: return "60-80%"
                    return "80-100%"
                
                summary["cpu_distribution"][get_bucket(cpu)] += 1
                summary["mem_distribution"][get_bucket(mem)] += 1
            
            summary["device_list"].append(entry)
        except Exception as e:
            logger.error(f"构造汇总列表条目失败 (Host: {name}): {e}")
            # 即使单条失败，也要保证列表不空
            summary["device_list"].append(entry)

    # 按异常优先排序，然后按名称
    summary["device_list"].sort(key=lambda x: (not x.get("has_error", False), x["hostname"]))

    return summary

@router.delete("/tasks/logs/{log_id}")
async def delete_job_log(
    log_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """物理删除执行日志"""
    log = session.get(JobLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="日志记录不存在")
    
    session.delete(log)
    session.commit()
    return {"message": "执行记录已删除"}

@router.get("/jobs", response_model=List[AutomationJob])
async def list_jobs(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """获取所有已定义的作业"""
    return session.exec(select(AutomationJob)).all()

@router.post("/jobs", response_model=AutomationJob)
async def create_job(
    job: AutomationJob,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """创建并调度新作业"""
    job.created_by = current_user.username
    session.add(job)
    session.commit()
    session.refresh(job)
    
    # 联动调度器 (此处需要 import AutomationScheduler)
    from backend.services.automation.scheduler import AutomationScheduler
    scheduler = AutomationScheduler()
    scheduler.add_job_to_scheduler(job)
    
    return job

@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """删除作业"""
    job = session.get(AutomationJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="作业不存在")
        
    from backend.services.automation.scheduler import AutomationScheduler
    AutomationScheduler().remove_job_from_scheduler(job_id)
    
    session.delete(job)
    session.commit()
    return {"ok": True}

@router.post("/jobs/{job_id}/run")
async def run_job_now(
    job_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """手动立即执行作业"""
    job = session.get(AutomationJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="作业不存在")
        
    from backend.services.automation.scheduler import AutomationScheduler
    from backend.models.automation import JobLog, JobStatus
    from datetime import datetime
    
    # 1. 同步创建一个待执行的日志记录，以便立即向前端返回 ID
    new_log = JobLog(
        job_id=job.id,
        status=JobStatus.RUNNING,
        start_time=datetime.now(),
        total_devices=len(job.target_devices) if job.target_devices else 0,
        results={}
    )
    session.add(new_log)
    session.commit()
    session.refresh(new_log)
    
    scheduler = AutomationScheduler()
    # 2. 启动后台线程执行，传入已建立的 log_id
    import threading
    threading.Thread(target=scheduler._run_nornir_job, args=(job.id, new_log.id)).start()
    
    return {"message": f"作业 {job.name} 已开始执行", "log_id": new_log.id}

@router.post("/quick-task")
async def run_quick_task(
    req: QuickTaskRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """从设备列表快速发起即时任务"""
    from backend.models.device import Device
    from datetime import datetime
    
    # ... (原有逻辑：解析设备名、任务名) ...
    devices = session.exec(select(Device).where(Device.id.in_(req.device_ids))).all()
    if not devices:
        raise HTTPException(status_code=404, detail="未找到目标设备")
    
    device_names = [d.name for d in devices]
    task_cn_map = {"inspect": "巡检", "backup": "备份", "config": "配置", "diagnosis": "诊断", "query": "查询"}
    type_cn = task_cn_map.get(req.task_type, req.task_type)
    first_device = device_names[0] if device_names else "未知"
    count_info = f"等{len(device_names)}台" if len(device_names) > 1 else ""
    job_name = f"快速{type_cn}-{first_device}{count_info}-{datetime.now().strftime('%H:%M')}"

    # 1. 创建任务定义
    job = AutomationJob(
        name=job_name,
        task_type=req.task_type,
        target_devices=device_names,
        commands=req.commands,
        schedule_type=JobScheduleType.IMMEDIATE,
        created_by=current_user.username,
        is_active=True
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    
    # 2. 同步创建初始日志
    new_log = JobLog(
        job_id=job.id,
        status=JobStatus.RUNNING,
        start_time=datetime.now(),
        total_devices=len(device_names),
        results={}
    )
    session.add(new_log)
    session.commit()
    session.refresh(new_log)
    
    # 3. 异步触发
    from backend.services.automation.scheduler import AutomationScheduler
    scheduler = AutomationScheduler()
    import threading
    threading.Thread(target=scheduler._run_nornir_job, args=(job.id, new_log.id)).start()
    
    return {"message": "即时任务已下发", "job_id": job.id, "log_id": new_log.id}
