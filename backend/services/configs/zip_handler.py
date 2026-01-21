"""
ZIP文件处理工具
"""
import zipfile
from pathlib import Path
from typing import List
import logging

logger = logging.getLogger("services")

class ZipHandler:
    """ZIP文件处理器"""
    
    def extract_zip(self, zip_path: Path, extract_to: Path) -> List[Path]:
        """
        解压ZIP文件
        
        Args:
            zip_path: ZIP文件路径
            extract_to: 解压目标目录
        
        Returns:
            解压的文件列表
        """
        if not zip_path.exists():
            raise FileNotFoundError(f"ZIP文件不存在: {zip_path}")
        
        if not zipfile.is_zipfile(zip_path):
            raise ValueError(f"不是有效的ZIP文件: {zip_path}")
        
        extract_to.mkdir(parents=True, exist_ok=True)
        extracted_files = []
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zf:
                # 获取ZIP内的所有文件
                for file_info in zf.infolist():
                    # 跳过目录
                    if file_info.is_dir():
                        continue
                    
                    # 提取文件
                    extracted_path = extract_to / file_info.filename
                    extracted_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    with zf.open(file_info) as source, open(extracted_path, 'wb') as target:
                        target.write(source.read())
                    
                    extracted_files.append(extracted_path)
                    logger.info(f"解压文件: {file_info.filename}")
        
        except zipfile.BadZipFile as e:
            logger.error(f"解压失败，无效的ZIP文件: {e}")
            raise
        except Exception as e:
            logger.error(f"解压ZIP文件失败: {e}")
            raise
        
        return extracted_files
    
    def create_zip(self, files: List[Path], zip_path: Path, base_dir: Path = None) -> Path:
        """
        创建ZIP文件
        
        Args:
            files: 要压缩的文件列表
            zip_path: ZIP文件保存路径
            base_dir: 基础目录（用于计算相对路径）
        
        Returns:
            创建的ZIP文件路径
        """
        zip_path.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                for file_path in files:
                    if not file_path.exists() or not file_path.is_file():
                        logger.warning(f"跳过不存在的文件: {file_path}")
                        continue
                    
                    # 计算在ZIP中的文件名
                    if base_dir and file_path.is_relative_to(base_dir):
                        arcname = str(file_path.relative_to(base_dir))
                    else:
                        arcname = file_path.name
                    
                    zf.write(file_path, arcname)
                    logger.info(f"添加文件到ZIP: {arcname}")
        
        except Exception as e:
            logger.error(f"创建ZIP文件失败: {e}")
            raise
        
        return zip_path
    
    def list_zip_contents(self, zip_path: Path) -> List[str]:
        """
        列出ZIP文件内容
        
        Args:
            zip_path: ZIP文件路径
        
        Returns:
            文件名列表
        """
        if not zipfile.is_zipfile(zip_path):
            raise ValueError(f"不是有效的ZIP文件: {zip_path}")
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zf:
                return zf.namelist()
        except Exception as e:
            logger.error(f"读取ZIP内容失败: {e}")
            raise
