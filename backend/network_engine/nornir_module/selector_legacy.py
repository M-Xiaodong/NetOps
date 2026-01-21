"""
设备筛选模块
"""
from typing import List, Dict, Any, Callable

class DeviceSelector:
    """设备筛选器"""
    
    def filter_by_platform(self, devices: List[Dict[str, Any]], platform: str) -> List[Dict[str, Any]]:
        """
        按平台筛选设备
        
        Args:
            devices: 设备列表
            platform: 平台类型
        
        Returns:
            筛选后的设备列表
        """
        return [d for d in devices if d.get('platform') == platform]
    
    def filter_by_location(self, devices: List[Dict[str, Any]], location: str) -> List[Dict[str, Any]]:
        """
        按位置筛选设备
        
        Args:
            devices: 设备列表
            location: 位置
        
        Returns:
            筛选后的设备列表
        """
        return [d for d in devices if d.get('location') == location]
    
    def filter_by_status(self, devices: List[Dict[str, Any]], status: str) -> List[Dict[str, Any]]:
        """
        按状态筛选设备
        
        Args:
            devices: 设备列表
            status: 状态
        
        Returns:
            筛选后的设备列表
        """
        return [d for d in devices if d.get('status') == status]
    
    def filter_by_custom(self, devices: List[Dict[str, Any]], 
                        filter_func: Callable[[Dict[str, Any]], bool]) -> List[Dict[str, Any]]:
        """
        自定义筛选
        
        Args:
            devices: 设备列表
            filter_func: 筛选函数
        
        Returns:
            筛选后的设备列表
        """
        return [d for d in devices if filter_func(d)]
    
    def build_filter(self, **criteria) -> Callable[[Dict[str, Any]], bool]:
        """
        构建筛选函数
        
        Args:
            **criteria: 筛选条件
        
        Returns:
            筛选函数
        """
        def filter_func(device: Dict[str, Any]) -> bool:
            for key, value in criteria.items():
                if device.get(key) != value:
                    return False
            return True
        
        return filter_func
