from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
from sqlmodel import SQLModel, Field, JSON

class TaskType(str, Enum):
    """任务类型枚举"""
    QUERY = "query"             # 查询任务 (show 命令)
    BACKUP = "backup"           # 配置备份
    CONFIG = "config"           # 配置修改
    INSPECT = "inspect"         # 设备巡检
    DIAGNOSIS = "diagnosis"      # 网络诊断

class JobScheduleType(str, Enum):
    """调度类型枚举"""
    IMMEDIATE = "immediate"     # 立即执行
    ONCE = "once"               # 定时单次执行
    CRON = "cron"              # 周期执行 (Cron 表达式)

class JobStatus(str, Enum):
    """作业状态枚举"""
    PENDING = "pending"         # 待处理/已调度
    RUNNING = "running"         # 正在执行
    SUCCESS = "success"         # 全部成功
    PARTIAL = "partial"         # 部分成功
    FAILED = "failed"           # 全部失败
    CANCELLED = "cancelled"     # 已取消

class AutomationJob(SQLModel, table=True):
    """自动化作业逻辑配置（主表）"""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, description="任务名称")
    task_type: TaskType = Field(description="任务类型")
    
    # 执行目标
    target_devices: List[str] = Field(sa_type=JSON, description="目标设备列表/列表名")
    
    # 任务载荷
    commands: Optional[List[str]] = Field(default=[], sa_type=JSON, description="要执行的命集")
    args: Optional[Dict[str, Any]] = Field(default={}, sa_type=JSON, description="额外参数")
    
    # 调度规则
    schedule_type: JobScheduleType = Field(default=JobScheduleType.IMMEDIATE)
    schedule_value: Optional[str] = Field(None, description="调度具体值 (Cron 表达式或 ISO 时间字符串)")
    
    is_active: bool = Field(default=True, description="是否启用周期调度")
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    created_by: Optional[str] = Field(None, description="创建人用户名")

class JobLog(SQLModel, table=True):
    """作业执行回溯与结果审计（记录表）"""
    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(index=True, description="关联的任务ID")
    
    status: JobStatus = Field(default=JobStatus.RUNNING)
    
    # 统计信息
    total_devices: int = Field(default=0)
    success_count: int = Field(default=0)
    failed_count: int = Field(default=0)
    
    # 详细结果 (JSON 存储每个主机的输出和失败原因)
    # 格式: { "host1": { "success": true, "result": "...", "error": null }, ... }
    results: Optional[Dict[str, Any]] = Field(default={}, sa_type=JSON)
    
    start_time: datetime = Field(default_factory=datetime.now)
    end_time: Optional[datetime] = Field(None)
    duration: Optional[float] = Field(None, description="执行耗时 (秒)")
    
    trigger_type: str = Field(default="manual", description="触发方式: manual/auto")
