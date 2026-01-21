import os
import json
import gzip
from typing import List, Optional, Dict, Any
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, Query, HTTPException, Depends
from backend.core.config import settings
from backend.api.auth.deps import get_current_user
from backend.models.user import User, UserRole

router = APIRouter()

def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="权限不足，仅限管理员访问")
    return current_user

@router.get("/logs")
async def get_logs(
    category: str = Query("netops", description="日志类别: netops, api, services, automation, system"),
    level: Optional[str] = None,
    keyword: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    admin_user: User = Depends(get_admin_user)
):
    """获取结构化日志列表"""
    log_map = {
        "netops": "backend/netops.jsonl",
        "api": "backend/api/api_access.jsonl",
        "services": "backend/services/services.jsonl",
        "automation": "backend/automation/automation.jsonl",
        "system": "backend/system/error.jsonl"
    }
    
    file_path = settings.LOG_DIR / log_map.get(category, "backend/netops.jsonl")
    
    if not file_path.exists():
        return {"total": 0, "logs": [], "message": "暂无相关日志文件"}

    logs = []
    try:
        # 简单实现：读取最后 N 行 (生产环境建议使用 seek 或更专业的日志索引)
        with open(file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
        # 倒序展示（最新的在前）
        lines.reverse()
        
        for line in lines:
            try:
                entry = json.loads(line)
                
                # 过滤逻辑
                if level and entry.get("level") != level.upper():
                    continue
                if keyword and keyword.lower() not in line.lower():
                    continue
                
                logs.append(entry)
            except:
                continue
                
        # 分页
        total = len(logs)
        start = (page - 1) * page_size
        end = start + page_size
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "logs": logs[start:end]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取日志失败: {str(e)}")

@router.get("/search")
async def global_search(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user)
):
    """全局联邦搜索"""
    results = []
    from backend.core.database import SessionLocal
    from sqlmodel import select
    from backend.models.device import Device
    from backend.services.configs.file_service import FileService
    
    # 1. 搜索设备
    with SessionLocal() as session:
        statement = select(Device).where(
            (Device.name.contains(q)) | (Device.ip.contains(q))
        ).limit(5)
        devices = session.exec(statement).all()
        for d in devices:
            results.append({
                "type": "device",
                "title": d.name,
                "description": f"IP: {d.ip} | 平台: {d.platform}",
                "link": f"/devices?id={d.id}",
                "id": d.id
            })

    # 2. 搜索配置文件
    file_service = FileService()
    tree = file_service.get_tree()
    # 简单平铺目录树进行文件名匹配
    found_files = 0
    for region in tree:
        for device in region.get("children", []):
            for file in device.get("children", []):
                if q.lower() in file["name"].lower():
                    results.append({
                        "type": "config",
                        "title": file["name"],
                        "description": f"区域: {region['name']} | 设备: {device['name']}",
                        "link": f"/configs?path={file['path']}",
                        "id": file["id"]
                    })
                    found_files += 1
                    if found_files >= 5: break
            if found_files >= 5: break
        if found_files >= 5: break

    return results
