from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict
from pydantic import BaseModel
from pathlib import Path
import difflib
from manager import ConfigManager
from logger import logger
from .analyzer import ConfigAnalyzer

router = APIRouter()
manager = ConfigManager()

# --- Models ---

class ScanRequest(BaseModel):
    path: str

class ImportItem(BaseModel):
    source_path: str
    region: str
    device_name: str
    mtime: str
    timestamp: Optional[float] = None

class ImportRequest(BaseModel):
    items: List[ImportItem]

class ContentRequest(BaseModel):
    path: str

class DiffRequest(BaseModel):
    path_a: str
    path_b: str

# --- Endpoints ---

@router.post("/scan")
async def scan_files(request: ScanRequest):
    """
    Scan a directory for import candidates with smart analysis.
    """
    try:
        candidates = manager.scan_import_candidates(request.path)
        # Enhance candidates with analysis
        for item in candidates:
            # Analyze filename for region/device hints
            name_analysis = ConfigAnalyzer.analyze_filename(item["filename"])
            if name_analysis["suggested_region_type"] == "office":
                item["suggested_region"] = "Office_Region" # Placeholder, user can change
            elif name_analysis["suggested_region_type"] == "idc":
                item["suggested_region"] = "IDC_Region"
            
            if name_analysis["potential_hostname"]:
                item["detected_sysname"] = name_analysis["potential_hostname"]

            # Analyze content for deeper insights (type, vendor, ip)
            try:
                content = manager.get_file_content(item["path"])
                analysis = ConfigAnalyzer.analyze_content(content)
                item.update(analysis)
            except Exception as e:
                logger.warning(f"Content analysis failed for {item['path']}: {e}")
                
        return candidates
    except Exception as e:
        logger.error(f"Scan failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import")
async def import_files(request: ImportRequest):
    """
    Execute import for selected files.
    """
    results = {"success": 0, "failed": 0, "errors": []}
    
    for item in request.items:
        try:
            manager.import_file(
                item.source_path,
                item.region,
                item.device_name,
                item.mtime,
                item.timestamp
            )
            results["success"] += 1
        except Exception as e:
            results["failed"] += 1
            results["errors"].append(f"{item.source_path}: {str(e)}")
            
    return results

@router.get("/tree")
async def get_tree():
    """
    Get the configuration tree (Region -> Device -> Files).
    """
    try:
        return manager.get_tree()
    except Exception as e:
        logger.error(f"Get tree failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/content")
async def get_content(request: ContentRequest):
    """
    Get file content (text). Handles zips automatically.
    """
    try:
        content = manager.get_file_content(request.path)
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/diff")
async def get_diff(request: DiffRequest):
    """
    Compare two files and return difflib opcodes.
    """
    try:
        content_a = manager.get_file_content(request.path_a)
        content_b = manager.get_file_content(request.path_b)
        
        # Use difflib to generate opcodes
        # We split by lines first
        lines_a = content_a.splitlines()
        lines_b = content_b.splitlines()
        
        matcher = difflib.SequenceMatcher(None, lines_a, lines_b)
        opcodes = matcher.get_opcodes()
        
        return {
            "opcodes": opcodes,
            "a_content": lines_a,
            "b_content": lines_b
        }
    except Exception as e:
        logger.error(f"Diff failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- CRUD Endpoints ---

class RegionRequest(BaseModel):
    name: str
    new_name: Optional[str] = None

class DeviceRequest(BaseModel):
    region: str
    name: str
    new_name: Optional[str] = None

class DeleteFilesRequest(BaseModel):
    paths: List[str]

class MoveFileRequest(BaseModel):
    src_path: str
    target_region: str
    target_device: str

class MoveNodeRequest(BaseModel):
    node_type: str # 'region', 'device'
    name: str
    region: Optional[str] = None # Required if node_type is device
    target_region: Optional[str] = None # Required if moving device to another region

class OpenDirRequest(BaseModel):
    path: str

@router.post("/region/create")
async def create_region(request: RegionRequest):
    try: manager.create_region(request.name)
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@router.post("/region/delete")
async def delete_region(request: RegionRequest):
    try: manager.delete_region(request.name)
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@router.post("/region/rename")
async def rename_region(request: RegionRequest):
    try: manager.rename_region(request.name, request.new_name)
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@router.post("/device/create")
async def create_device(request: DeviceRequest):
    try: manager.create_device(request.region, request.name)
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@router.post("/device/delete")
async def delete_device(request: DeviceRequest):
    try: manager.delete_device(request.region, request.name)
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@router.post("/device/rename")
async def rename_device(request: DeviceRequest):
    try: manager.rename_device(request.region, request.name, request.new_name)
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@router.post("/files/delete")
async def delete_files(request: DeleteFilesRequest):
    try: manager.delete_files(request.paths)
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@router.post("/files/move")
async def move_file(request: MoveFileRequest):
    try: manager.move_file(request.src_path, request.target_region, request.target_device)
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@router.post("/node/move")
async def move_node(request: MoveNodeRequest):
    try: 
        if request.node_type == 'device':
            manager.move_device(request.region, request.name, request.target_region)
        else:
            raise HTTPException(status_code=400, detail="Only device move is currently supported via this API")
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@router.post("/open-dir")
async def open_directory(request: OpenDirRequest):
    try: manager.open_directory(request.path)
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@router.get("/stats")
async def get_stats():
    """
    Get dashboard statistics.
    """
    try:
        return manager.get_stats()
    except Exception as e:
        logger.error(f"Get stats failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
