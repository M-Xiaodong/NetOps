import re
import requests
import asyncio
import os
import logging

logger = logging.getLogger("services")

# 尝试导入 manuf 离线库（推荐：支持 netmask，更准确）
try:
    from manuf import manuf
    HAS_OFFLINE_MAC = True
    logger.info("manuf 库已加载，离线MAC查询可用")
except ImportError:
    HAS_OFFLINE_MAC = False
    logger.info("manuf 库未安装，离线MAC查询不可用。请运行: pip install manuf")

class MacService:
    _mac_parser = None
    _initialized = False
    _offline_available = False

    @classmethod
    def _init_offline_db(cls):
        """初始化 manuf 离线数据库 - 优先使用指定的离线文件"""
        if cls._initialized:
            return
        cls._initialized = True
        
        if not HAS_OFFLINE_MAC:
            return
        
        # 优先使用用户提供的数据路径
        manuf_path = r"E:\NetOps\data\mac\manuf"
        
        try:
            if os.path.exists(manuf_path):
                logger.info(f"正在从指定路径加载 manuf 数据库: {manuf_path}")
                cls._mac_parser = manuf.MacParser(manuf_name=manuf_path)
                cls._offline_available = True
                logger.info("manuf 指定数据库加载成功")
            else:
                logger.warning(f"指定路径不存在: {manuf_path}，将尝试使用内置数据库")
                # manuf 库自带一个内置的 manuf 数据库文件
                cls._mac_parser = manuf.MacParser(update=False)
                cls._offline_available = True
                logger.info("manuf 离线数据库初始化成功（使用内置数据库）")
        except Exception as e:
            logger.warning(f"manuf 离线数据库加载失败: {e}")
            # 尝试在线更新
            try:
                logger.info("尝试从网络下载 manuf 数据库...")
                cls._mac_parser = manuf.MacParser(update=True)
                cls._offline_available = True
                logger.info("manuf 数据库下载成功")
            except Exception as e2:
                logger.warning(f"manuf 数据库下载失败（可能需要科学上网）: {e2}")
                logger.info("离线查询不可用，将回退到在线查询")
                cls._offline_available = False

    @staticmethod
    def normalize_mac(mac: str) -> str:
        """Strip non-hex to get clean sequence"""
        return re.sub(r'[^a-fA-F0-9]', '', mac).lower()

    @staticmethod
    def format_mac_formats(mac: str) -> dict:
        """Convert MAC to multiple network device formats"""
        clean = MacService.normalize_mac(mac)
        if len(clean) != 12:
            return {"error": "Invalid Length", "input": mac}
        
        # Formats
        # 1. Standard Colon: aa:bb:cc:dd:ee:ff
        colon = ":".join([clean[i:i+2] for i in range(0, 12, 2)])
        # 2. Standard Hyphen: aa-bb-cc-dd-ee-ff
        hyphen = "-".join([clean[i:i+2] for i in range(0, 12, 2)])
        # 3. Cisco: aaaa.bbbb.cccc
        cisco = ".".join([clean[i:i+4] for i in range(0, 12, 4)])
        # 4. Huawei: aaaa-bbbb-cccc (Sometimes same as Cisco but hyphen, or Hyphenated groupings)
        # Huawei often uses aaaa-bbbb-cccc
        huawei = "-".join([clean[i:i+4] for i in range(0, 12, 4)])
        # 5. Uppercase variants
        
        return {
            "input": mac,
            "hex": clean,
            "colon": colon,
            "hyphen": hyphen,
            "cisco": cisco,
            "huawei": huawei,
            "linux": colon,
            "upper_hyphen": hyphen.upper()
        }

    @staticmethod
    def batch_format(macs: list) -> list:
        """格式化MAC地址，返回与 query_batch_vendor 相同的结构"""
        results = []
        for mac in macs:
            formats = MacService.format_mac_formats(mac)
            if 'error' in formats:
                results.append({"input": mac, "formats": formats})
            else:
                results.append({
                    "input": mac,
                    "formats": {
                        "cisco": formats.get("cisco"),
                        "huawei": formats.get("huawei"),
                        "colon": formats.get("colon"),
                        "hyphen": formats.get("hyphen"),
                    }
                })
        return results

    @classmethod
    def query_batch_vendor(cls, macs: list, source='offline') -> list:
        """批量查询MAC厂商 - source: 'offline' | 'online' | 'auto'"""
        # 确保离线数据库已初始化
        cls._init_offline_db()
        
        results = []
        for mac in macs:
            clean = cls.normalize_mac(mac)
            if len(clean) < 6:
                results.append({"input": mac, "vendor": "无效格式", "formats": cls.format_mac_formats(mac)})
                continue
            
            vendor = None
            
            # 离线查询 (使用 manuf 库)
            if source in ('offline', 'auto') and cls._offline_available:
                if cls._mac_parser:
                    try:
                        # manuf 库支持 netmask，更准确
                        vendor = cls._mac_parser.get_manuf(clean)
                    except Exception as e:
                        logger.debug(f"离线查询失败: {e}")
            
            # 在线查询 (如果离线失败/不可用 或指定在线)
            if not vendor and source in ('online', 'auto'):
                vendor = cls._fetch_vendor_online(clean)
            
            # 中文化厂商名称
            if vendor and vendor != "Unknown":
                vendor = cls._translate_vendor(vendor)
            
            # 构建格式化结果
            formats = cls.format_mac_formats(mac)
            results.append({
                "input": mac, 
                "vendor": vendor or "未知",
                "formats": {
                    "cisco": formats.get("cisco"),
                    "huawei": formats.get("huawei"),
                    "colon": formats.get("colon"),
                    "hyphen": formats.get("hyphen"),
                }
            })
            
        return results

    @staticmethod
    def _translate_vendor(vendor_en: str) -> str:
        """Simple dictionary for common vendor localization"""
        v = vendor_en.lower()
        if 'huawei' in v: return '华为 (Huawei)'
        if 'zte' in v: return '中兴 (ZTE)'
        if 'tp-link' in v: return '普联 (TP-Link)'
        if 'xiaomi' in v: return '小米 (Xiaomi)'
        if 'oppo' in v: return 'OPPO'
        if 'vivo' in v: return 'VIVO'
        if 'apple' in v: return '苹果 (Apple)'
        if 'samsung' in v: return '三星 (Samsung)'
        if 'intel' in v: return '英特尔 (Intel)'
        if 'microsoft' in v: return '微软 (Microsoft)'
        if 'google' in v: return '谷歌 (Google)'
        if 'cisco' in v: return '思科 (Cisco)'
        if 'h3c' in v or 'new h3c' in v: return '新华三 (H3C)'
        if 'ruijie' in v: return '锐捷 (Ruijie)'
        if 'dell' in v: return '戴尔 (Dell)'
        if 'hp' in v or 'hewlett' in v: return '惠普 (HP)'
        if 'lenovo' in v: return '联想 (Lenovo)'
        if 'honhai' in v or 'foxconn' in v: return '鸿海/富士康'
        if 'd-link' in v: return '友讯 (D-Link)'
        if 'tenda' in v: return '腾达 (Tenda)'
        if 'mercury' in v: return '水星 (Mercury)'
        
        return vendor_en

    @staticmethod
    def _fetch_vendor_online(mac_prefix: str) -> str:
        """通过在线API查询MAC地址厂商 - 使用 maclookup.app (完全免费商用)"""
        try:
            # 格式化MAC地址为标准格式（冒号分隔）
            clean = MacService.normalize_mac(mac_prefix)
            if len(clean) < 6:
                return None
            formatted = ':'.join([clean[i:i+2] for i in range(0, min(len(clean), 12), 2)])
            
            # maclookup.app API - 免费无限制，商用友好
            url = f"https://api.maclookup.app/v2/macs/{formatted}"
            response = requests.get(url, timeout=5, headers={
                'Accept': 'application/json'
            })
            
            if response.status_code == 200:
                data = response.json()
                if data.get('found') and data.get('company'):
                    return data['company']
                return "Unknown"
            elif response.status_code == 404:
                return "Unknown"
            else:
                logger.warning(f"maclookup.app API 返回 {response.status_code}")
                return None
        except requests.exceptions.RequestException as e:
            logger.warning(f"MAC在线查询失败: {e}")
            return None
        except Exception as e:
            logger.warning(f"MAC在线查询异常: {e}")
            return None

def cli_main():
    import argparse
    import sys
    from rich.console import Console
    from rich.table import Table

    console = Console()
    parser = argparse.ArgumentParser(description="NetOps MAC 工具 (独立版)")
    parser.add_argument("macs", nargs="+", help="MAC 地址 (支持多个)")
    parser.add_argument("-s", "--source", choices=["offline", "online", "auto"], default="auto", help="查询来源")
    
    args = parser.parse_args()
    service = MacService()
    
    table = Table(title="MAC 地址查询与格式化报告")
    table.add_column("输入 MAC", style="cyan")
    table.add_column("厂商/归属", style="green")
    table.add_column("常见格式 (Colon/Cisco)", style="yellow")

    results = service.query_batch_vendor(args.macs, source=args.source)
    for res in results:
        vendor = res["vendor"]
        formats = res["formats"]
        format_str = f"{formats.get('colon', '-')}\n{formats.get('cisco', '-')}"
        table.add_row(res["mac"], vendor, format_str)

    console.print(table)

if __name__ == "__main__":
    cli_main()
