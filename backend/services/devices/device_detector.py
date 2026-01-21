"""
设备类型自动检测工具
根据配置文件内容自动识别设备类型、厂商、型号、版本等信息
"""
import re
from typing import Dict, Any, Optional

class DeviceDetector:
    """设备信息检测器"""
    
    @classmethod
    def detect(cls, content: str, filename: str) -> Dict[str, Any]:
        """
        检测设备信息
        Returns:
            dict: 包含 region_type, device_type, vendor, model, version, management_ip
        """
        return {
            "region_type": cls._detect_region_type(filename),
            "device_type": cls._detect_device_type(content, filename),
            "vendor": cls._detect_vendor(content),
            "model": cls._detect_model(content),
            "version": cls._detect_version(content),
            "management_ip": cls._detect_management_ip(content)
        }

    @staticmethod
    def _detect_region_type(filename: str) -> str:
        if "工厂" in filename:
            return "工厂"
        if "IDC" in filename or "数据中心" in filename:
            return "数据中心"
        return "办公区"

    @classmethod
    def _detect_device_type(cls, content: str, filename: str) -> str:
        content_lower = content.lower()
        filename_lower = filename.lower()
        
        # Server detection
        if any(x in content_lower for x in ["ubuntu", "windows server", "centos", "red hat", "debian"]):
            return "服务器"
            
        # Firewall detection
        if any(x in content_lower for x in ["firewall", "security-policy", "policy-object", "ipsec", "attack-defense", "ips signature"]):
            return "防火墙"
        if any(kw in filename_lower for kw in ['fw', 'firewall', '防火墙']):
            return "防火墙"
            
        # Wireless AC detection
        if any(x in content_lower for x in ["wlan", "ap-group", "ap-id", "capwap", "radio-profile"]):
            return "无线AC"
        if any(kw in filename_lower for kw in ['ac', 'wlan', 'wireless', '无线']):
            return "无线AC"
            
        # Router vs Switch
        score_switch = 0
        score_router = 0
        
        if "vlan" in content_lower: score_switch += 2
        if "stp" in content_lower or "spanning-tree" in content_lower: score_switch += 2
        if "eth-trunk" in content_lower or "port-channel" in content_lower: score_switch += 1
        if "interface gigabitethernet0/0/1" in content_lower: score_switch += 1
        if any(kw in filename_lower for kw in ['sw', 'switch', '交换']): score_switch += 5
        
        if "interface serial" in content_lower: score_router += 3
        if "nat" in content_lower: score_router += 2
        if "ip route-static" in content_lower or "ip route" in content_lower: score_router += 1
        if "bgp" in content_lower or "ospf" in content_lower: score_router += 1
        if any(kw in filename_lower for kw in ['router', 'rt', '路由']): score_router += 5
        
        if score_router > score_switch + 1:
            return "路由器"
        return "交换机"

    @staticmethod
    def _detect_vendor(content: str) -> str:
        content_lower = content.lower()
        
        if "huawei" in content_lower or "display current-configuration" in content_lower:
            return "华为"
        if "cisco" in content_lower or "show running-config" in content_lower:
            return "思科"
        if "h3c" in content_lower:
            return "H3C"
        if "ruijie" in content_lower:
            return "锐捷"
        if "sangfor" in content_lower:
            return "深信服"
        if "dbappsecurity" in content_lower:
            return "安恒"
        if "hillstone" in content_lower:
            return "山石网科"
        if "inspur" in content_lower:
            return "浪潮"
            
        if "sysname" in content_lower:
            return "华为"
        if "hostname" in content_lower:
            return "思科"
            
        return "未知厂商"

    @staticmethod
    def _detect_management_ip(content: str) -> Optional[str]:
        ip_regex = r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}"
        matches = re.findall(r"ip address\s+(" + ip_regex + ")", content, re.IGNORECASE)
        if matches:
            return matches[0]
        return None

    @staticmethod
    def _detect_model(content: str) -> Optional[str]:
        match = re.search(r"(?:Huawei|H3C|Cisco|Ruijie)\s+([A-Za-z0-9-]+)\s+(?:Device|Software)", content, re.IGNORECASE)
        if match:
            return match.group(1)
        return None

    @staticmethod
    def _detect_version(content: str) -> Optional[str]:
        match = re.search(r"Version\s+(\d+(?:\.\d+)+[A-Za-z0-9()]*)", content, re.IGNORECASE)
        if match:
            return match.group(1)
        return None

# Backward compatibility wrapper if needed, but better to use class directly
def detect_device_type(config_content: str, filename: str = "") -> str:
    return DeviceDetector.detect(config_content, filename)["device_type"]
