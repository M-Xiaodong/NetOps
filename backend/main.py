from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings
from backend.core.logger import setup_logging
import sys
import asyncio

# On Windows, enforced ProactorEventLoop is required for asyncio subprocesses
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# 初始化日志系统（在应用启动前）

# 初始化日志系统（在应用启动前）
logger = setup_logging()

from backend.core.middleware import LogContextMiddleware
from backend.api.auth import login
from backend.api.devices import manager as device_manager
from backend.api.configs import files as config_files
from backend.api.tools import utils as tool_utils
from backend.api.automation import tasks as automation_tasks
from backend.api.system import logs as system_logs, manager as system_manager

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="NetOps All-in-One Platform API"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http(s)?://.*", # 允许局域网及跨网段内任意 IP/域名访问
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(LogContextMiddleware)

@app.on_event("startup")
async def startup_event():
    logger.info("NetOps Backend 启动中...")
    
    # Initialize DB
    from backend.core.database import init_db
    init_db()

    # 自动化调度器初始化
    from backend.services.automation.scheduler import scheduler_service
    scheduler_service.setup_scheduled_tasks()
    logger.info("APScheduler 任务已恢复")

app.include_router(login.router, prefix="/api/auth", tags=["auth"])
app.include_router(device_manager.router, prefix="/api/devices", tags=["devices"])
app.include_router(config_files.router, prefix="/api/configs", tags=["configs"])
app.include_router(tool_utils.router, prefix="/api/tools", tags=["tools"])
app.include_router(automation_tasks.router, prefix="/api/automation", tags=["automation"])
app.include_router(system_logs.router, prefix="/api/system", tags=["logs"])
app.include_router(system_manager.router, prefix="/api/system", tags=["system-management"])

@app.get("/")
async def root():
    return {"message": "NetOps Backend is running", "version": settings.VERSION}

if __name__ == "__main__":
    import uvicorn
    # 强制监听 0.0.0.0 以支持局域网访问，不再受限于 127.0.0.1
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
