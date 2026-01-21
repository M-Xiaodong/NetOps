"""
日志配置模块
- 按启动时间创建日志文件
- 支持 JSONL 结构化存储 (语义对齐 RFC 5424)
- 自动压缩旧日志 (.gz)
- 同时输出到控制台和文件
"""
import logging
import sys
import os
import json
import gzip
import shutil
from datetime import datetime
from pathlib import Path
from logging.handlers import TimedRotatingFileHandler
from typing import Any, Dict

from backend.core.config import settings
from backend.core.middleware import request_ip_context

class JsonFormatter(logging.Formatter):
    """
    JSONL 格式化器
    将日志记录转换为单行 JSON 对象，适配 Syslog 语义
    """
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "module": record.module,
            "func": record.funcName,
            "line": record.lineno,
            "message": record.getMessage(),
            "process": record.process,
            "thread_name": record.threadName,
            "remote_addr": request_ip_context.get() # 关键：从上下文提取物理 IP
        }
        
        # 处理异常信息
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
            
        # 处理额外参数 (extra)
        if hasattr(record, "structured_data"):
            log_entry["data"] = record.structured_data
            
        return json.dumps(log_entry, ensure_ascii=False)

def namer(name):
    """自定义日志归档文件名：logname.YYYY-MM-DD.log.gz"""
    return name + ".gz"

def rotator(source, dest):
    """日志轮转时的压缩逻辑"""
    with open(source, 'rb') as f_in:
        with gzip.open(dest, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)
    os.remove(source)

def setup_logging() -> logging.Logger:
    """
    配置统一日志系统
    - 核心日志: log/backend/netops.jsonl
    - API 日志: log/backend/api/api_access.jsonl
    - 自动化日志: log/backend/automation/automation.jsonl
    - 业务逻辑日志: log/backend/services/services.jsonl
    - 错误日志: log/backend/system/error.jsonl
    """
    log_dir = settings.LOG_DIR / "backend"
    
    # JSONL 格式化器 (用于文件)
    json_formatter = JsonFormatter(datefmt="%Y-%m-%dT%H:%M:%S")
    
    # 普通文本格式化器 (用于控制台展示，方便阅读)
    text_formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    def create_handler(sub_path: str, level=logging.DEBUG):
        full_path = log_dir / sub_path
        os.makedirs(full_path.parent, exist_ok=True)
        
        # 修改后缀为 .jsonl
        if full_path.suffix == '.log':
            full_path = full_path.with_suffix('.jsonl')
            
        handler = TimedRotatingFileHandler(
            filename=str(full_path),
            when="midnight",
            interval=1,
            backupCount=30,
            encoding="utf-8",
            delay=True
        )
        handler.suffix = "%Y-%m-%d.jsonl"
        handler.namer = namer
        handler.rotator = rotator
        handler.setLevel(level)
        handler.setFormatter(json_formatter)
        return handler

    # 1. 创建各业务 Handler
    main_handler = create_handler("netops.jsonl")
    api_handler = create_handler("api/api_access.jsonl")
    automation_handler = create_handler("automation/automation.jsonl")
    services_handler = create_handler("services/services.jsonl")
    error_handler = create_handler("system/error.jsonl", level=logging.ERROR)
    
    # 控制台输出 (保持文本格式，提升开发体验)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(text_formatter)

    # 2. 配置 Root Logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    root_logger.handlers.clear()
    root_logger.addHandler(main_handler)
    root_logger.addHandler(console_handler)
    root_logger.addHandler(error_handler)

    # 3. 配置子 Logger 分流
    loggers = {
        "api": api_handler,
        "automation": automation_handler,
        "services": services_handler
    }
    
    for name, handler in loggers.items():
        l = logging.getLogger(name)
        l.propagate = True
        l.addHandler(handler)

    # 4. 配置 uvicorn
    for name in ["uvicorn", "uvicorn.error", "uvicorn.access"]:
        u_logger = logging.getLogger(name)
        u_logger.handlers.clear()
        u_logger.addHandler(api_handler)
        u_logger.addHandler(console_handler)

    logger = logging.getLogger(__name__)
    logger.info("结构化日志系统初始化完成 (JSONL + Gzip 归档)")
    
    return logger
