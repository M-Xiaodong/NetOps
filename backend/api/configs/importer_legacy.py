from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from pathlib import Path
import shutil
import zipfile
import os
from typing import List
from loguru import logger
import config

router = APIRouter()

# 使用storage目录
UPLOAD_DIR = config.UPLOADS_DIR
CONFIG_DIR = config.CONFIGS_DIR

def process_file(file_path: Path):
    """
    Process a single file: move it to the config directory.
    In a real scenario, this would parse VRP configs, extract metadata, etc.
    For now, we just organize it.
    """
    try:
        # Simple organization: just move to config dir
        # If it's a text file, we assume it's a config
        if file_path.suffix in ['.txt', '.cfg', '.log', '.zip']:
             # If zip, extract
            if file_path.suffix == '.zip':
                with zipfile.ZipFile(file_path, 'r') as zip_ref:
                    zip_ref.extractall(CONFIG_DIR)
                logger.info(f"Extracted zip: {file_path}")
            else:
                shutil.copy2(file_path, CONFIG_DIR / file_path.name)
                logger.info(f"Processed file: {file_path}")
    except Exception as e:
        logger.error(f"Error processing file {file_path}: {e}")

@router.post("/upload")
async def upload_files(files: List[UploadFile] = File(...), background_tasks: BackgroundTasks = None):
    """
    Upload one or more files. Supports .zip, .txt, .cfg, .log.
    Files are saved to storage/uploads and then processed.
    """
    saved_files = []
    
    for file in files:
        try:
            file_path = UPLOAD_DIR / file.filename
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            saved_files.append(str(file_path))
            logger.info(f"File uploaded: {file_path}")
            
            # Add processing task
            if background_tasks:
                background_tasks.add_task(process_file, file_path)
            else:
                process_file(file_path)
                
        except Exception as e:
            logger.error(f"Failed to upload {file.filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to upload {file.filename}")

    return {"message": f"Successfully uploaded {len(saved_files)} files", "files": saved_files}

@router.post("/import")
async def import_existing():
    """
    Trigger re-import/processing of files in the upload directory.
    """
    count = 0
    for file_path in UPLOAD_DIR.glob("*"):
        if file_path.is_file():
            process_file(file_path)
            count += 1
    return {"message": f"Processed {count} files from upload directory"}
