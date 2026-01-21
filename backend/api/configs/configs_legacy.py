"""
配置管理API路由
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pathlib import Path
from pydantic import BaseModel
from models.config import ConfigFile, ConfigMetadata
import config

router = APIRouter()

class ConfigListResponse(BaseModel):
    """配置列表响应"""
    configs: List[ConfigMetadata]
    total: int

@router.get("/configs", response_model=ConfigListResponse)
async def list_configs(
    device_name: Optional[str] = Query(None, description="按设备名过滤"),
    platform: Optional[str] = Query(None, description="按平台过滤"),
    limit: int = Query(100, ge=1, le=1000, description="返回数量限制"),
    offset: int = Query(0, ge=0, description="偏移量")
):
    """获取配置文件列表"""
    configs = []
    
    # 扫描配置目录
    for file_path in config.CONFIGS_DIR.rglob("*.cfg"):
        if not file_path.is_file():
            continue
        
        stat = file_path.stat()
        metadata = ConfigMetadata(
            filename=file_path.name,
            file_path=str(file_path),
            size_bytes=stat.st_size,
            modified_at=None,
            device_name=file_path.stem  # 简化处理
        )
        
        # 应用过滤
        if device_name and device_name not in metadata.filename:
            continue
        if platform and platform != metadata.platform:
            continue
        
        configs.append(metadata)
    
    # 应用分页
    total = len(configs)
    configs = configs[offset:offset + limit]
    
    return ConfigListResponse(configs=configs, total=total)

@router.get("/configs/{config_id}")
async def get_config(config_id: str):
    """获取配置文件详情"""
    # 简化实现：使用文件名作为ID
    config_path = config.CONFIGS_DIR / f"{config_id}.cfg"
    
    if not config_path.exists():
        raise HTTPException(status_code=404, detail=f"配置文件 {config_id} 不存在")
    
    try:
        with open(config_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        stat = config_path.stat()
        metadata = ConfigMetadata(
            filename=config_path.name,
            file_path=str(config_path),
            size_bytes=stat.st_size,
            device_name=config_path.stem
        )
        
        return ConfigFile(
            id=config_id,
            metadata=metadata,
            content=content
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取配置文件失败: {str(e)}")

@router.delete("/configs/{config_id}")
async def delete_config(config_id: str):
    """删除配置文件"""
    config_path = config.CONFIGS_DIR / f"{config_id}.cfg"
    
    if not config_path.exists():
        raise HTTPException(status_code=404, detail=f"配置文件 {config_id} 不存在")
    
    try:
        config_path.unlink()
        return {"message": f"配置文件 {config_id} 已删除"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除配置文件失败: {str(e)}")

@router.get("/configs/device/{device_name}")
async def get_device_configs(device_name: str):
    """获取指定设备的所有配置文件"""
    configs = []
    
    # 搜索包含设备名的配置文件
    for file_path in config.CONFIGS_DIR.rglob(f"*{device_name}*.cfg"):
        if not file_path.is_file():
            continue
        
        stat = file_path.stat()
        metadata = ConfigMetadata(
            filename=file_path.name,
            file_path=str(file_path),
            size_bytes=stat.st_size,
            device_name=device_name
        )
        configs.append(metadata)
    
    if not configs:
        raise HTTPException(status_code=404, detail=f"未找到设备 {device_name} 的配置文件")
    
    return {"device_name": device_name, "configs": configs, "total": len(configs)}
