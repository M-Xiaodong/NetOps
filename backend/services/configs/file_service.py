import os
import shutil
import zipfile
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
import logging
from backend.core.config import settings
from backend.services.devices.device_detector import DeviceDetector

logger = logging.getLogger("services")

class FileService:
    """文件管理服务"""
    
    def __init__(self, storage_root: Path = None):
        self.storage_root = storage_root or settings.CONFIGS_DIR
        self.storage_root.mkdir(parents=True, exist_ok=True)

    def scan_import_candidates(self, source_path: str) -> List[Dict]:
        """
        递归扫描目录以查找潜在的配置文件。
        返回文件信息字典列表。
        """
        candidates = []
        source = Path(source_path)
        
        if not source.exists():
            raise ValueError(f"路径不存在: {source_path}")

        # 遍历目录
        for root, _, files in os.walk(source):
            for file in files:
                file_path = Path(root) / file
                # 过滤扩展名
                if file_path.suffix.lower() not in ['.zip', '.cfg', '.txt', '.conf', '.bfc']:
                    continue
                
                try:
                    info = self._parse_file_info(file_path)
                    candidates.append(info)
                except Exception as e:
                    logger.warning(f"解析文件失败 {file_path}: {e}")
        
        return candidates

    def _parse_file_info(self, file_path: Path) -> Dict:
        """
        提取文件元数据。
        对于华为 ZIP 包，尝试查找 sysname。
        """
        stat = file_path.stat()
        mtime = datetime.fromtimestamp(stat.st_mtime)
        timestamp_str = mtime.strftime("%Y%m%d_%H%M%S")
        
        sysname = None
        
        # 华为 ZIP 特殊处理
        if file_path.suffix.lower() == '.zip':
            try:
                with zipfile.ZipFile(file_path, 'r') as zf:
                    # 查找 vrpcfg.cfg
                    cfg_files = [f for f in zf.namelist() if f.endswith('vrpcfg.cfg')]
                    if cfg_files:
                        with zf.open(cfg_files[0]) as f:
                            content = f.read().decode('utf-8', errors='ignore')
                            sysname = self._extract_sysname(content)
            except Exception as e:
                logger.debug(f"ZIP 解析错误 {file_path}: {e}")
        
        # 尝试读取文本文件获取 sysname
        elif file_path.suffix.lower() in ['.cfg', '.txt', '.conf']:
            try:
                # 读取前 4KB 查找 sysname
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read(4096)
                    sysname = self._extract_sysname(content)
            except Exception as e:
                logger.debug(f"文本解析错误 {file_path}: {e}")

        return {
            "path": str(file_path),
            "filename": file_path.name,
            "size": stat.st_size,
            "mtime": timestamp_str,
            "timestamp": stat.st_mtime,
            "detected_sysname": sysname,
            "suggested_region": file_path.parent.name  # 用户需求: 父文件夹即为区域
        }

    def _extract_sysname(self, content: str) -> Optional[str]:
        """
        尝试从配置内容中查找 'sysname <name>'。
        """
        # Huawei/H3C 风格
        match = re.search(r'^\s*sysname\s+(\S+)', content, re.MULTILINE | re.IGNORECASE)
        if match:
            return match.group(1)
        
        # Cisco 风格
        match = re.search(r'^\s*hostname\s+(\S+)', content, re.MULTILINE | re.IGNORECASE)
        if match:
            return match.group(1)
            
        return None

    def import_file(self, source_path: str, region: str, device_name: str, mtime_str: str, timestamp: float = None) -> str:
        """
        导入文件到存储。
        如果是 ZIP，提取配置文件。
        目标: storage_root / region / device_name / {original_name}_{mtime}.cfg
        """
        src = Path(source_path)
        if not src.exists():
            raise FileNotFoundError(f"源文件未找到: {source_path}")

        # 创建目标目录
        target_dir = self.storage_root / region / device_name
        target_dir.mkdir(parents=True, exist_ok=True)

        # 确定内容和扩展名
        content = None
        ext = src.suffix.lower()
        
        if ext == '.zip':
            try:
                with zipfile.ZipFile(src, 'r') as zf:
                    # 优先级: vrpcfg.cfg -> .cfg -> .txt -> .conf
                    candidates = []
                    for name in zf.namelist():
                        if name.endswith('vrpcfg.cfg'):
                            candidates.insert(0, name)
                        elif name.lower().endswith(('.cfg', '.txt', '.conf')):
                            candidates.append(name)
                    
                    if candidates:
                        with zf.open(candidates[0]) as f:
                            content = f.read() # 读取二进制内容，不进行解码
                            # 提取的文件使用 .cfg 后缀
                            ext = '.cfg'
                    else:
                        logger.warning(f"ZIP {src} 中未找到配置，复制原文件。")
            except Exception as e:
                logger.error(f"解压 ZIP {src} 失败: {e}")

        # 构建目标文件名
        stem = src.stem
        new_filename = f"{stem}_{mtime_str}{ext}"
        target_path = target_dir / new_filename

        if content is not None:
            # 写入提取的内容 (二进制模式，避免换行符转换)
            target_path.write_bytes(content)
        else:
            # 复制原文件 (非 ZIP 或提取失败)
            shutil.copy2(src, target_path)
        
        # 如果提供了时间戳，显式设置修改时间
        if timestamp is not None:
            try:
                os.utime(target_path, (timestamp, timestamp))
            except Exception as e:
                logger.warning(f"设置时间戳失败 {target_path}: {e}")
        
        return str(target_path)

    def get_tree(self) -> List[Dict]:
        """
        构建 区域/设备/文件 树状结构。
        """
        tree = []
        
        if not self.storage_root.exists():
            return tree

        # 遍历区域
        for region_dir in sorted(self.storage_root.iterdir()):
            if not region_dir.is_dir():
                continue
                
            region_node = {
                "id": f"region_{region_dir.name}",
                "name": region_dir.name,
                "type": "region",
                "children": [],
                "device_count": 0
            }
            
            # 遍历设备
            for device_dir in sorted(region_dir.iterdir()):
                if not device_dir.is_dir():
                    continue
                
                # 检测设备类型（读取第一个配置文件）
                device_type = "unknown"
                try:
                    # 获取设备目录下的所有配置文件
                    config_files = sorted([f for f in device_dir.iterdir() if f.is_file()], 
                                        key=lambda x: x.stat().st_mtime, reverse=True)
                    if config_files:
                        # 读取最新的配置文件来检测设备类型
                        first_file = config_files[0]
                        content = first_file.read_text(encoding='utf-8', errors='ignore')[:8192]  # 读取前8KB
                        device_type = DeviceDetector.detect(content, first_file.name)["device_type"]
                except Exception as e:
                    logger.debug(f"检测设备类型失败 {device_dir.name}: {e}")
                    
                device_node = {
                    "id": f"device_{region_dir.name}_{device_dir.name}",
                    "name": device_dir.name,
                    "type": "device",
                    "device_type": device_type,
                    "children": [],
                    "file_count": 0
                }
                
                # 遍历文件
                files = []
                for file_path in device_dir.iterdir():
                    if file_path.is_file():
                        files.append({
                            "id": f"file_{region_dir.name}_{device_dir.name}_{file_path.name}",
                            "name": file_path.name,
                            "path": str(file_path),
                            "type": "file",
                            "mtime": file_path.stat().st_mtime
                        })
                
                # 按修改时间倒序排列
                files.sort(key=lambda x: x['mtime'], reverse=True)
                
                device_node["children"] = files
                device_node["file_count"] = len(files)
                region_node["children"].append(device_node)
            
            region_node["device_count"] = len(region_node["children"])
            tree.append(region_node)
            
        return tree

    def get_file_content(self, relative_path: str) -> str:
        """
        读取文件内容。如果是 ZIP，尝试读取内部 cfg。
        """
        file_path = Path(relative_path)
        if not file_path.exists():
             raise FileNotFoundError("文件未找到")

        if file_path.suffix.lower() == '.zip':
            try:
                with zipfile.ZipFile(file_path, 'r') as zf:
                    for ext in ['.cfg', '.txt', '.conf']:
                        candidates = [f for f in zf.namelist() if f.endswith(ext)]
                        if candidates:
                            with zf.open(candidates[0]) as f:
                                return f.read().decode('utf-8', errors='ignore')
                    return "[二进制或空 ZIP 文件]"
            except Exception as e:
                return f"[读取 ZIP 错误: {e}]"
        else:
            try:
                return file_path.read_text(encoding='utf-8', errors='ignore')
            except Exception as e:
                return f"[读取文件错误: {e}]"

    # --- CRUD 操作 ---

    def create_region(self, name: str):
        path = self.storage_root / name
        if path.exists():
            raise ValueError("区域已存在")
        path.mkdir()

    def delete_region(self, name: str):
        path = self.storage_root / name
        if not path.exists():
            raise ValueError("区域未找到")
        shutil.rmtree(path)

    def rename_region(self, old_name: str, new_name: str):
        old_path = self.storage_root / old_name
        new_path = self.storage_root / new_name
        if not old_path.exists(): raise ValueError("区域未找到")
        if new_path.exists(): raise ValueError("新名称已存在")
        old_path.rename(new_path)

    def create_device(self, region: str, name: str):
        path = self.storage_root / region / name
        if path.exists():
            raise ValueError("设备已存在")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.mkdir()

    def delete_device(self, region: str, name: str):
        path = self.storage_root / region / name
        if not path.exists():
            raise ValueError("设备未找到")
        shutil.rmtree(path)
        
    def rename_device(self, region: str, old_name: str, new_name: str):
        old_path = self.storage_root / region / old_name
        new_path = self.storage_root / region / new_name
        if not old_path.exists(): raise ValueError("设备未找到")
        if new_path.exists(): raise ValueError("新名称已存在")
        old_path.rename(new_path)

    def delete_files(self, paths: List[str]):
        errors = []
        import time
        import stat
        
        for p in paths:
            try:
                path = Path(p)
                if path.exists() and path.is_file():
                    # 尝试移除只读属性
                    try:
                        os.chmod(path, stat.S_IWRITE)
                    except Exception:
                        pass
                        
                    # Windows 下的重试循环
                    for i in range(3):
                        try:
                            path.unlink()
                            break
                        except FileNotFoundError:
                            break
                        except PermissionError:
                            if i == 2:
                                raise RuntimeError(f"无法删除 {path.name}。文件可能被其他程序占用（如编辑器），请关闭后重试。")
                            time.sleep(0.1)
                        except Exception as e:
                            raise e
            except Exception as e:
                errors.append(str(e))
        
        if errors:
            error_msg = '; '.join(errors)
            logger.error(f"删除部分文件失败: {error_msg}")
            raise RuntimeError(f"删除失败: {error_msg}")

    def move_file(self, src_path: str, target_region: str, target_device: str):
        src = Path(src_path)
        if not src.exists():
            raise ValueError("源文件未找到")
            
        target_dir = self.storage_root / target_region / target_device
        if not target_dir.exists():
            raise ValueError("目标设备目录未找到")
            
        target_path = target_dir / src.name
        if target_path.exists():
            raise ValueError("目标位置存在同名文件")
            
        shutil.move(src, target_path)

    def move_device(self, region: str, name: str, target_region: str):
        src_path = self.storage_root / region / name
        if not src_path.exists():
            raise ValueError("源设备未找到")
            
        target_region_dir = self.storage_root / target_region
        if not target_region_dir.exists():
            raise ValueError("目标区域未找到")
            
        target_path = target_region_dir / name
        if target_path.exists():
            raise ValueError("目标区域已存在同名设备")
            
        shutil.move(src_path, target_path)

    def open_directory(self, path_str: str):
        """
        在文件资源管理器中打开目录。
        """
        path = Path(path_str)
        if not path.exists():
            raise ValueError("路径未找到")
            
        import subprocess
        import platform
        
        if platform.system() == "Windows":
            if path.is_file():
                subprocess.run(['explorer', '/select,', str(path)])
            else:
                subprocess.run(['explorer', str(path)])

    def get_stats(self) -> Dict:
        """
        获取仪表盘统计信息。
        """
        total_regions = 0
        total_devices = 0
        total_files = 0
        region_stats = []
        
        if self.storage_root.exists():
            for region_dir in self.storage_root.iterdir():
                if region_dir.is_dir():
                    total_regions += 1
                    devices = 0
                    configs = 0
                    for device_dir in region_dir.iterdir():
                        if device_dir.is_dir():
                            devices += 1
                            total_devices += 1
                            # 统计文件
                            f_count = len([f for f in device_dir.iterdir() if f.is_file()])
                            configs += f_count
                            total_files += f_count
                    
                    region_stats.append({
                        "name": region_dir.name,
                        "devices": devices,
                        "configs": configs
                    })
        
        return {
            "total_regions": total_regions,
            "total_devices": total_devices,
            "total_files": total_files,
            "region_stats": region_stats
        }
