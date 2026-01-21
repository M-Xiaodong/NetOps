"""
华为VRP配置解析工具
专门用于解析华为VRP格式的配置文件
"""
import re
from typing import Dict, Any, List, Optional
from pathlib import Path
import logging

logger = logging.getLogger("services")

class VRPParser:
    """华为VRP配置解析器"""
    
    def parse_config(self, content: str) -> Dict[str, Any]:
        """
        解析VRP配置
        
        Args:
            content: 配置内容
        
        Returns:
            解析后的配置数据
        """
        result = {
            "sysname": self.extract_sysname(content),
            "version": self.extract_version(content),
            "interfaces": self.extract_interfaces(content),
            "vlans": self.extract_vlans(content),
            "users": self.extract_users(content),
            "acls": self.extract_acls(content)
        }
        
        return result
    
    def extract_sysname(self, content: str) -> Optional[str]:
        """
        提取系统名称
        
        Args:
            content: 配置内容
        
        Returns:
            系统名称
        """
        match = re.search(r'sysname\s+(\S+)', content, re.IGNORECASE)
        return match.group(1) if match else None
    
    def extract_version(self, content: str) -> Optional[str]:
        """
        提取版本信息
        
        Args:
            content: 配置内容
        
        Returns:
            版本信息
        """
        match = re.search(r'version\s+(.+)', content, re.IGNORECASE)
        return match.group(1).strip() if match else None
    
    def extract_interfaces(self, content: str) -> List[Dict[str, Any]]:
        """
        提取接口配置
        
        Args:
            content: 配置内容
        
        Returns:
            接口配置列表
        """
        interfaces = []
        
        # 查找所有接口配置块
        interface_pattern = r'interface\s+(\S+)(.*?)(?=interface\s+|$)'
        matches = re.finditer(interface_pattern, content, re.IGNORECASE | re.DOTALL)
        
        for match in matches:
            interface_name = match.group(1)
            interface_config = match.group(2)
            
            # 提取IP地址
            ip_match = re.search(r'ip\s+address\s+(\S+)\s+(\S+)', interface_config)
            
            interfaces.append({
                "name": interface_name,
                "ip": ip_match.group(1) if ip_match else None,
                "mask": ip_match.group(2) if ip_match else None,
                "config": interface_config.strip()
            })
        
        return interfaces
    
    def extract_vlans(self, content: str) -> List[int]:
        """
        提取VLAN配置
        
        Args:
            content: 配置内容
        
        Returns:
            VLAN ID列表
        """
        vlans = []
        
        # 查找VLAN配置
        vlan_pattern = r'vlan\s+(\d+)'
        matches = re.finditer(vlan_pattern, content, re.IGNORECASE)
        
        for match in matches:
            vlan_id = int(match.group(1))
            if vlan_id not in vlans:
                vlans.append(vlan_id)
        
        return sorted(vlans)
    
    def extract_users(self, content: str) -> List[str]:
        """
        提取用户账号
        
        Args:
            content: 配置内容
        
        Returns:
            用户名列表
        """
        users = []
        
        # 查找本地用户
        user_pattern = r'local-user\s+(\S+)'
        matches = re.finditer(user_pattern, content, re.IGNORECASE)
        
        for match in matches:
            username = match.group(1)
            if username not in users:
                users.append(username)
        
        return users
    
    def extract_acls(self, content: str) -> List[Dict[str, Any]]:
        """
        提取ACL配置
        
        Args:
            content: 配置内容
        
        Returns:
            ACL配置列表
        """
        acls = []
        
        # 查找ACL配置块
        acl_pattern = r'acl\s+(?:number\s+)?(\d+)(.*?)(?=acl\s+|$)'
        matches = re.finditer(acl_pattern, content, re.IGNORECASE | re.DOTALL)
        
        for match in matches:
            acl_number = match.group(1)
            acl_config = match.group(2)
            
            acls.append({
                "number": acl_number,
                "config": acl_config.strip()
            })
        
        return acls
    
    def parse_file(self, file_path: Path) -> Dict[str, Any]:
        """
        解析VRP配置文件
        
        Args:
            file_path: 配置文件路径
        
        Returns:
            解析结果
        """
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            parsed = self.parse_config(content)
            parsed["file_path"] = str(file_path)
            parsed["file_name"] = file_path.name
            
            return parsed
        except Exception as e:
            logger.error(f"解析VRP配置文件失败 {file_path}: {e}")
            return {"error": str(e)}
