"""
设备管理API路由
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from models.device import Device, DeviceStatus

router = APIRouter()

# 临时设备存储（实际应使用数据库）
devices_db: List[Device] = []

class DeviceCreateRequest(BaseModel):
    """设备创建请求"""
    name: str
    ip: str
    hostname: Optional[str] = None
    platform: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None

@router.get("/devices", response_model=List[Device])
async def list_devices(
    platform: Optional[str] = Query(None, description="按平台过滤"),
    status: Optional[DeviceStatus] = Query(None, description="按状态过滤"),
    location: Optional[str] = Query(None, description="按位置过滤")
):
    """获取设备列表"""
    devices = devices_db
    
    # 应用过滤
    if platform:
        devices = [d for d in devices if d.platform == platform]
    if status:
        devices = [d for d in devices if d.status == status]
    if location:
        devices = [d for d in devices if d.location == location]
    
    return devices

@router.get("/devices/{device_id}", response_model=Device)
async def get_device(device_id: str):
    """获取单个设备详情"""
    device = next((d for d in devices_db if d.id == device_id), None)
    if not device:
        raise HTTPException(status_code=404, detail=f"设备 {device_id} 不存在")
    return device

@router.post("/devices", response_model=Device)
async def create_device(request: DeviceCreateRequest):
    """创建新设备"""
    # 检查IP是否已存在
    if any(d.ip == request.ip for d in devices_db):
        raise HTTPException(status_code=400, detail=f"IP地址 {request.ip} 已存在")
    
    # 生成设备ID
    device_id = f"dev_{len(devices_db) + 1}"
    
    device = Device(
        id=device_id,
        name=request.name,
        ip=request.ip,
        hostname=request.hostname,
        platform=request.platform,
        location=request.location,
        description=request.description,
        status=DeviceStatus.UNKNOWN
    )
    
    devices_db.append(device)
    return device

@router.put("/devices/{device_id}", response_model=Device)
async def update_device(device_id: str, request: DeviceCreateRequest):
    """更新设备信息"""
    device = next((d for d in devices_db if d.id == device_id), None)
    if not device:
        raise HTTPException(status_code=404, detail=f"设备 {device_id} 不存在")
    
    # 更新字段
    device.name = request.name
    device.ip = request.ip
    device.hostname = request.hostname
    device.platform = request.platform
    device.location = request.location
    device.description = request.description
    
    return device

@router.delete("/devices/{device_id}")
async def delete_device(device_id: str):
    """删除设备"""
    global devices_db
    device = next((d for d in devices_db if d.id == device_id), None)
    if not device:
        raise HTTPException(status_code=404, detail=f"设备 {device_id} 不存在")
    
    devices_db = [d for d in devices_db if d.id != device_id]
    return {"message": f"设备 {device_id} 已删除"}

@router.post("/devices/{device_id}/ping")
async def ping_device(device_id: str):
    """Ping设备检查连通性"""
    device = next((d for d in devices_db if d.id == device_id), None)
    if not device:
        raise HTTPException(status_code=404, detail=f"设备 {device_id} 不存在")
    
    # TODO: 实现真实的ping功能
    return {"device_id": device_id, "status": "success", "message": "设备在线"}
