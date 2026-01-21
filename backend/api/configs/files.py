from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query
import logging

from backend.services.configs.file_service import FileService

from backend.models.user import User
from backend.api.auth.deps import get_current_active_user

router = APIRouter()
logger = logging.getLogger("api")

def get_file_service() -> FileService:
    return FileService()

@router.get("/tree", response_model=List[Dict])
async def get_config_tree(
    current_user: User = Depends(get_current_active_user),
    service: FileService = Depends(get_file_service)
):
    """获取配置文件的树状结构"""
    return service.get_tree()

@router.get("/content")
async def get_file_content(
    path: str = Query(..., description="文件绝对路径"),
    current_user: User = Depends(get_current_active_user),
    service: FileService = Depends(get_file_service)
):
    """获取文件内容"""
    try:
        return {"content": service.get_file_content(path)}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="文件未找到")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_stats(
    current_user: User = Depends(get_current_active_user),
    service: FileService = Depends(get_file_service)
):
    """获取统计信息"""
    return service.get_stats()

@router.post("/open")
async def open_in_explorer(
    path: str,
    current_user: User = Depends(get_current_active_user),
    service: FileService = Depends(get_file_service)
):
    """在资源管理器中打开 (仅限本地演示)"""
    try:
        service.open_directory(path)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class ScanRequest(BaseModel):
    path: str

@router.post("/scan")
async def scan_files(
    request: ScanRequest,
    current_user: User = Depends(get_current_active_user),
    service: FileService = Depends(get_file_service)
):
    """扫描目录获取导入候选文件"""
    try:
        return service.scan_import_candidates(request.path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Scan failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ImportItem(BaseModel):
    path: str
    region: str
    device_name: str
    mtime: str
    timestamp: float

class ImportRequest(BaseModel):
    items: List[ImportItem]

@router.post("/import")
async def import_files(
    request: ImportRequest,
    current_user: User = Depends(get_current_active_user),
    service: FileService = Depends(get_file_service)
):
    """批量导入文件"""
    results = []
    errors = []
    
    for item in request.items:
        try:
            result = service.import_file(
                source_path=item.path,
                region=item.region,
                device_name=item.device_name,
                mtime_str=item.mtime,
                timestamp=item.timestamp
            )
            results.append(result)
        except Exception as e:
            logger.error(f"Import failed for {item.path}: {e}")
            errors.append(f"{item.path}: {str(e)}")
            
    return {
        "success": len(results),
        "failed": len(errors),
        "errors": errors,
        "results": results
    }

class DeleteFilesRequest(BaseModel):
    paths: List[str]

@router.post("/delete")
async def delete_files(
    request: DeleteFilesRequest,
    current_user: User = Depends(get_current_active_user),
    service: FileService = Depends(get_file_service)
):
    """批量删除文件"""
    try:
        service.delete_files(request.paths)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Region Operations ---

class RegionRequest(BaseModel):
    name: str

class RegionRenameRequest(BaseModel):
    name: str
    new_name: str

@router.post("/region/create")
async def create_region(
    request: RegionRequest,
    current_user: User = Depends(get_current_active_user),
    service: FileService = Depends(get_file_service)
):
    try:
        service.create_region(request.name)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/region/delete")
async def delete_region(
    request: RegionRequest,
    current_user: User = Depends(get_current_active_user),
    service: FileService = Depends(get_file_service)
):
    try:
        service.delete_region(request.name)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/region/rename")
async def rename_region(
    request: RegionRenameRequest,
    current_user: User = Depends(get_current_active_user),
    service: FileService = Depends(get_file_service)
):
    try:
        service.rename_region(request.name, request.new_name)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Device Operations ---

class DeviceRequest(BaseModel):
    region: str
    name: str

class DeviceRenameRequest(BaseModel):
    region: str
    name: str
    new_name: str

@router.post("/device/create")
async def create_device(
    request: DeviceRequest,
    current_user: User = Depends(get_current_active_user),
    service: FileService = Depends(get_file_service)
):
    try:
        service.create_device(request.region, request.name)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/device/delete")
async def delete_device(
    request: DeviceRequest,
    current_user: User = Depends(get_current_active_user),
    service: FileService = Depends(get_file_service)
):
    try:
        service.delete_device(request.region, request.name)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/device/rename")
async def rename_device(
    request: DeviceRenameRequest,
    current_user: User = Depends(get_current_active_user),
    service: FileService = Depends(get_file_service)
):
    try:
        service.rename_device(request.region, request.name, request.new_name)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Move Operations ---

class MoveFileRequest(BaseModel):
    src_path: str
    target_region: str
    target_device: str

class MoveNodeRequest(BaseModel):
    node_type: str
    name: str
    region: Optional[str] = None
    target_region: Optional[str] = None

@router.post("/move")
async def move_file(
    request: MoveFileRequest,
    current_user: User = Depends(get_current_active_user),
    service: FileService = Depends(get_file_service)
):
    try:
        service.move_file(request.src_path, request.target_region, request.target_device)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/node/move")
async def move_node(
    request: MoveNodeRequest,
    current_user: User = Depends(get_current_active_user),
    service: FileService = Depends(get_file_service)
):
    try:
        if request.node_type == 'device':
            if not request.region or not request.target_region:
                raise ValueError("移动设备需要指定源区域和目标区域")
            service.move_device(request.region, request.name, request.target_region)
        else:
            raise ValueError("不支持移动此类型的节点")
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
