from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session
import logging

from backend.core.database import get_session
from backend.services.devices.device_service import DeviceService
from backend.models.device import Device, DeviceCreate, DeviceRead, DeviceUpdate
from backend.models.user import User
from backend.api.auth.deps import get_current_active_user

router = APIRouter()
logger = logging.getLogger("api")

@router.get("/", response_model=List[DeviceRead])
def read_devices(
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """获取设备列表"""
    service = DeviceService(session)
    return service.get_devices(skip=skip, limit=limit)

@router.post("/", response_model=DeviceRead)
def create_device(
    device_in: DeviceCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """创建新设备"""
    service = DeviceService(session)
    try:
        return service.create_device(device_in)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{device_id}", response_model=DeviceRead)
def read_device(
    device_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """获取特定设备详情"""
    service = DeviceService(session)
    device = service.get_device(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    return device

@router.patch("/{device_id}", response_model=DeviceRead)
def update_device(
    device_id: int,
    device_in: DeviceUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """更新设备信息"""
    service = DeviceService(session)
    device = service.update_device(device_id, device_in)
    if not device:
        raise HTTPException(status_code=404, detail="设备不存在")
    return device

@router.delete("/{device_id}")
def delete_device(
    device_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """删除设备"""
    service = DeviceService(session)
    success = service.delete_device(device_id)
    if not success:
        raise HTTPException(status_code=404, detail="设备不存在")
    return {"ok": True}

