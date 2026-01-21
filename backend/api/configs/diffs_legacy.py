from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import difflib
import os
from loguru import logger

router = APIRouter()

class DiffRequest(BaseModel):
    file1_path: str
    file2_path: str

@router.post("/diff")
async def get_diff(request: DiffRequest):
    """
    Compare two files and return the differences.
    """
    p1 = Path(request.file1_path)
    p2 = Path(request.file2_path)

    if not p1.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {request.file1_path}")
    if not p2.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {request.file2_path}")

    try:
        with open(p1, 'r', encoding='utf-8', errors='ignore') as f1:
            lines1 = f1.readlines()
        with open(p2, 'r', encoding='utf-8', errors='ignore') as f2:
            lines2 = f2.readlines()

        diff = difflib.unified_diff(
            lines1, lines2,
            fromfile=p1.name,
            tofile=p2.name,
            lineterm=''
        )
        
        # Convert generator to list
        diff_content = list(diff)
        
        return {
            "file1": str(p1),
            "file2": str(p2),
            "diff": diff_content,
            "has_changes": len(diff_content) > 0
        }

    except Exception as e:
        logger.error(f"Error comparing files: {e}")
        raise HTTPException(status_code=500, detail=str(e))
