"""
配置文件解析工具
"""
import re
import zipfile
from pathlib import Path
from typing import Optional, Dict, Any
from backend.models.device import DeviceConfig
import logging

logger = logging.getLogger("services")
from backend.services.devices.device_detector import DeviceDetector

class ConfigParser:
    """配置文件解析器"""
    
    def parse_metadata(self, file_path: Path) -> DeviceConfig:
        """
        解析文件元数据
        
        Args:
            file_path: 文件路径
        
        Returns:
            设备配置元数据
        """
        stats = file_path.stat()
        config = DeviceConfig(
            filename=file_path.name,
            path=str(file_path.absolute()),
            size=stats.st_size,
            modified_time=stats.st_mtime
        )

        try:
            if file_path.suffix.lower() == '.zip':
                self._parse_zip(file_path, config)
            else:
                self._parse_text(file_path, config)
        except Exception as e:
            logger.error(f"解析文件失败 {file_path}: {e}")
            config.error = str(e)

        return config

    def _parse_zip(self, file_path: Path, config: DeviceConfig):
        """
        解析ZIP文件
        
        Args:
            file_path: ZIP文件路径
            config: 配置对象
        """
        try:
            with zipfile.ZipFile(file_path, 'r') as zf:
                # 尝试找到ZIP内的配置文件
                cfg_files = [f for f in zf.namelist() if f.endswith(('.cfg', '.txt'))]
                if cfg_files:
                    # 读取第一个配置文件来查找sysname
                    with zf.open(cfg_files[0]) as f:
                        content = f.read().decode('utf-8', errors='ignore')
                        config.device_name = self._extract_sysname(content)
                        config.platform = self._detect_platform(content)
                        config.device_type = DeviceDetector.detect(content, file_path.name)["device_type"]
        except zipfile.BadZipFile:
            config.error = "无效的ZIP文件"

    def _parse_text(self, file_path: Path, config: DeviceConfig):
        """
        解析文本配置文件
        
        Args:
            file_path: 文件路径
            config: 配置对象
        """
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read(4096)  # 读取前4KB用于解析
                config.device_name = self._extract_sysname(content)
                config.platform = self._detect_platform(content)
                config.device_type = DeviceDetector.detect(content, file_path.name)["device_type"]
        except Exception as e:
            config.error = str(e)

    def _extract_sysname(self, content: str) -> Optional[str]:
        """
        从配置内容中提取设备名称
        
        Args:
            content: 配置内容
        
        Returns:
            设备名称
        """
        # Huawei/H3C
        match = re.search(r'sysname\s+(\S+)', content, re.IGNORECASE)
        if match:
            return match.group(1)
        
        # Cisco
        match = re.search(r'hostname\s+(\S+)', content, re.IGNORECASE)
        if match:
            return match.group(1)
            
        return None

    def _detect_platform(self, content: str) -> Optional[str]:
        """
        检测设备平台类型
        
        Args:
            content: 配置内容
        
        Returns:
            平台类型
        """
        content_lower = content.lower()
        
        # 华为特征
        if 'huawei' in content_lower or 'vrp' in content_lower or 'sysname' in content_lower:
            return 'huawei'
        
        # H3C特征
        if 'h3c' in content_lower or 'comware' in content_lower:
            return 'h3c'
        
        # Cisco特征
        if 'cisco' in content_lower or 'ios' in content_lower:
            return 'cisco'
        
        return None

    def parse_full_config(self, file_path: Path) -> Dict[str, Any]:
        """
        完整解析配置文件
        
        Args:
            file_path: 文件路径
        
        Returns:
            解析后的配置数据
        """
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            return {
                "device_name": self._extract_sysname(content),
                "platform": self._detect_platform(content),
                "content": content,
                "line_count": len(content.splitlines())
            }
        except Exception as e:
            logger.error(f"完整解析配置失败 {file_path}: {e}")
            return {"error": str(e)}
