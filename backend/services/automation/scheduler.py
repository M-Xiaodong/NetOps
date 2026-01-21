import logging
import threading
import time
from datetime import datetime
from typing import List, Optional, Dict, Any

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlmodel import Session, select

from backend.core.database import engine
from backend.models.automation import AutomationJob, JobLog, JobStatus, TaskType
from backend.network_engine.core import NetworkEngine
from backend.network_engine.nornir_module.tasks.health import inspect_health
from backend.network_engine.nornir_module.tasks.backup import backup_config
from backend.network_engine.nornir_module.tasks.commands import run_commands, apply_config

from sqlalchemy.orm.attributes import flag_modified
logger = logging.getLogger("automation")

class NornirProgressProcessor:
    """Nornir 处理器：用于在每个子任务完成时即时同步进度到数据库"""
    def __init__(self, job_log_id, engine):
        self.job_log_id = job_log_id
        self.engine = engine

    def task_started(self, task: Any) -> None:
        # 子任务开始时，可以在这里标记状态为 running，但目前主要依赖 task_instance_completed
        pass

    def task_completed(self, task: Any, result: Any) -> None:
        pass

    def task_instance_started(self, task: Any, host: Any) -> None:
        """核心回调：当一个设备的一个子任务开始执行时触发"""
        from sqlalchemy.orm.attributes import flag_modified
        with Session(self.engine) as session:
            log = session.get(JobLog, self.job_log_id)
            if not log: return

            summary = log.results or {}
            host_name = host.name
            
            if host_name not in summary:
                summary[host_name] = {"success": False, "status": "running", "steps": [], "error": None}
            
            steps = summary[host_name].get('steps', [])
            
            # 找到对应步骤并标记为正在执行
            found = False
            for i, s in enumerate(steps):
                if s['name'] == task.name:
                    steps[i]['status'] = "running"
                    found = True
                    break
            
            # 如果没找到（对于非预置步骤），则新增一个正在运行的步骤
            if not found and task.name and not task.name.startswith("NAPALM 数据采集"): 
                # 排除通用父任务名，只记录有意义的子任务名
                steps.append({
                    "name": task.name,
                    "success": True,
                    "status": "running",
                    "result": None
                })

            summary[host_name]['steps'] = steps
            log.results = summary
            flag_modified(log, "results")
            session.add(log)
            session.commit()

    def task_instance_completed(self, task: Any, host: Any, result: Any) -> None:
        """核心回调：当一个设备的一个子任务完成时触发"""
        from sqlalchemy.orm.attributes import flag_modified
        with Session(self.engine) as session:
            log = session.get(JobLog, self.job_log_id)
            if not log: return

            summary = log.results or {}
            host_name = host.name
            
            if host_name not in summary:
                summary[host_name] = {"success": False, "status": "running", "steps": [], "error": None}
            
            steps = summary[host_name].get('steps', [])
            
            # 构造步骤详情
            res_val = result.result
            if not isinstance(res_val, (dict, list, str, int, float, bool, type(None))):
                res_val = str(res_val)

            step_data = {
                "name": task.name or "Unnamed Task",
                "success": not result.failed,
                "status": "failed" if result.failed else "success",
                "result": res_val,
                "exception": str(result.exception) if result.exception else None
            }

            # 更新对应步骤
            found = False
            for i, s in enumerate(steps):
                if s['name'] == task.name:
                    steps[i] = step_data
                    found = True
                    break
            if not found:
                steps.append(step_data)

            summary[host_name]['steps'] = steps
            
            # 状态翻转判定
            any_failed = any(s.get('success') is False for s in steps)
            summary[host_name]['success'] = not any_failed
            if result.failed:
                summary[host_name]['error'] = str(result.exception) or "Sub-task failed"

            log.results = summary
            flag_modified(log, "results")
            session.add(log)
            session.commit()

    def subtask_instance_started(self, task: Any, host: Any) -> None:
        self.task_instance_started(task, host)

    def subtask_instance_completed(self, task: Any, host: Any, result: Any) -> None:
        self.task_instance_completed(task, host, result)

class AutomationScheduler:
    """自动化调度与执行服务"""
    _instance = None
    _scheduler = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AutomationScheduler, cls).__new__(cls)
            cls._scheduler = BackgroundScheduler()
            cls._scheduler.start()
            cls._lock = threading.Lock()
            logger.info("APScheduler 已启动，并发执行锁已就绪")
        return cls._instance

    def _run_nornir_job(self, job_id: int, log_id: Optional[int] = None):
        """核心任务执行逻辑 (由调度器异步调用)"""
        # 引入全局执行锁，防止多任务并发冲突
        with self._lock:
            with Session(engine) as session:
                job = session.get(AutomationJob, job_id)
                if not job:
                    return

                # 1. 获取或创建执行记录
                if log_id:
                    log = session.get(JobLog, log_id)
                    if not log:
                        logger.error(f"指定的 log_id {log_id} 不存在")
                        return
                    # 确保状态为运行中
                    log.status = JobStatus.RUNNING
                    log.start_time = datetime.now()
                else:
                    log = JobLog(job_id=job.id, status=JobStatus.RUNNING, start_time=datetime.now())
                    session.add(log)
                
                session.commit()
                session.refresh(log)

            start_perf_counter = time.time()
            try:
                engine_inst = NetworkEngine()
                # 重新加载 Inventory 以确保能找到最新的设备
                engine_inst.reload_inventory()
                
                # 2. 过滤目标设备 (修正过滤逻辑)
                if job.target_devices and len(job.target_devices) > 0:
                    # 使用 Nornir 过滤器，匹配名称列表中的任何一个
                    target = engine_inst.nornir.filter(filter_func=lambda h: h.name in job.target_devices)
                else:
                    target = engine_inst.nornir # 全量

                if not target.inventory.hosts:
                    raise ValueError("资产库中未找到匹配的目标设备，请检查设备名称是否正确。")

                # 3. 选择任务函数
                task_func = None
                task_args = {}
                
                if job.task_type == TaskType.INSPECT:
                    task_func = inspect_health
                elif job.task_type == TaskType.BACKUP:
                    task_func = backup_config 
                    task_args = {"backup_path": "e:\\NetOps\\backups"}
                elif job.task_type == TaskType.QUERY:
                    task_func = run_commands
                    task_args = {"commands": job.commands}
                elif job.task_type == TaskType.CONFIG:
                    task_func = apply_config
                    task_args = {"config_commands": job.commands}

                if not task_func:
                    raise ValueError(f"暂未实现的任务类型: {job.task_type}")

                # 4. 预先初始化结果状态 (让前端立即显示 "执行中")
                initial_summary = {}
                # 确保 inventory 中有 host
                if target.inventory.hosts:
                    for host_name in target.inventory.hosts.keys():
                        initial_summary[host_name] = {
                            "success": False,
                            "status": "running",
                            "steps": [],
                            "error": None
                        }
                    log.results = initial_summary
                    session.add(log)
                    session.commit()
                    # 再次刷新以确保后续操作基于最新状态
                    session.refresh(log)

                # 5. 执行任务 (使用处理器提供实时反馈)
                processor = NornirProgressProcessor(log.id, engine)
                
                # Use string comparison to handle both Enum and raw string task types
                requested_task_type = str(job.task_type).lower()
                
                if 'inspect' in requested_task_type:
                    # 预置 Pending 步骤 (优化：移除了冗余的 SSH 拨测，由 napalm_get 自动处理连接)
                    log.results = log.results or {}
                    for host in list(target.inventory.hosts.keys()):
                        log.results[host] = {
                            "success": False, 
                            "status": "running", 
                            "steps": [
                                {"name": "1. 建立 SSH 通信并执行 Version 采集", "success": True, "status": "pending", "result": None},
                                {"name": "2. 采集 CPU 与内存利用率指标", "success": True, "status": "pending", "result": None},
                                {"name": "3. 采集接口状态与流量计数器", "success": True, "status": "pending", "result": None},
                                {"name": "深度健康巡检", "success": True, "status": "pending", "result": None}
                            ], 
                            "error": None
                        }
                    session.add(log)
                    session.commit()
                    session.refresh(log)

                    # 执行巡检 (使用 with_processors 避免 TypeError)
                    target.with_processors([processor]).run(task=inspect_health, name="深度健康巡检")
                    
                else:
                    # 其他类型任务
                    target.with_processors([processor]).run(task=task_func, **task_args)

                # 6. 后处理：更新最终状态及统计
                session.refresh(log)
                results = log.results or {}
                
                final_success = 0
                for host_name, h_data in results.items():
                    # 修正状态：只要没有正在运行的任务，就从 running 转为终态
                    if h_data.get('status') == 'running':
                        h_data['status'] = 'success' if h_data.get('success') else 'failed'
                    if h_data.get('success'):
                        final_success += 1
                
                log.results = results
                flag_modified(log, "results")
                
                log.total_devices = len(results)
                log.success_count = final_success
                log.failed_count = len(results) - final_success
                log.status = JobStatus.SUCCESS if log.failed_count == 0 else (JobStatus.PARTIAL if final_success > 0 else JobStatus.FAILED)
                log.end_time = datetime.now()
                log.duration = round(time.time() - start_perf_counter, 2)
                
                session.add(log)
                session.commit()
                logger.info(f"作业 [{job.name}] 执行完毕，耗时: {log.duration}s, 成功: {final_success}")

            except Exception as e:
                logger.error(f"作业 [{job.name}] 执行崩溃: {e}", exc_info=True)
                with Session(engine) as err_session: # 使用独立会话处理错误状态
                    log_err = err_session.get(JobLog, log.id)
                    if log_err:
                        log_err.status = JobStatus.FAILED
                        results = log_err.results or {}
                        error_msg = f"引擎执行崩溃: {str(e)}"
                        
                        # 确保所有正在运行或等待的设备/步骤都标记为失败，防止前端显示加载中
                        if not results:
                            results = {"system_error": error_msg}
                        else:
                            for h in results:
                                if isinstance(results[h], dict):
                                    if results[h].get("status") in ["running", "pending"]:
                                        results[h]["status"] = "failed"
                                        results[h]["error"] = error_msg
                                        # 同步更新子步骤
                                        for s in results[h].get("steps", []):
                                            if s.get("status") in ["running", "pending"]:
                                                s["status"] = "failed"
                                                s["success"] = False
                            results["system_error"] = error_msg
                        
                        log_err.results = results
                        flag_modified(log_err, "results")
                        log_err.end_time = datetime.now()
                        err_session.add(log_err)
                        err_session.commit()
    
    def add_job_to_scheduler(self, job: AutomationJob):
        """将定义的作业加入 APScheduler 队列"""
        if not job.is_active:
            return

        # 封装执行函数
        def run_me():
            self._run_nornir_job(job.id)
        
        from backend.models.automation import JobScheduleType
        
        # 根据调度类型选择触发器
        if job.schedule_type == JobScheduleType.IMMEDIATE:
            self._scheduler.add_job(run_me, 'date', run_date=datetime.now())
        elif job.schedule_type == "cron":
            self._scheduler.add_job(run_me, CronTrigger.from_crontab(job.schedule_value), id=f"job_{job.id}")
        
    def setup_scheduled_tasks(self):
        """系统启动时扫面数据库并恢复周期性任务"""
        with Session(engine) as session:
            jobs = session.exec(select(AutomationJob).where(AutomationJob.is_active == True)).all()
            for job in jobs:
                if job.schedule_type == "cron":
                    self.add_job_to_scheduler(job)
        logger.info(f"已恢复 {len(jobs)} 个调度任务")

    def remove_job_from_scheduler(self, job_id: int):
        """从 APScheduler 中移除指定作业的定时调度"""
        try:
            self._scheduler.remove_job(f"job_{job_id}")
            logger.info(f"作业 job_{job_id} 已从调度器移除")
        except Exception as e:
            # 作业可能不在调度器中（比如立即执行类型），这种情况忽略即可
            logger.warning(f"移除作业 job_{job_id} 时发生异常（可能该作业不存在于调度队列中）: {e}")

# 全局单例
scheduler_service = AutomationScheduler()
