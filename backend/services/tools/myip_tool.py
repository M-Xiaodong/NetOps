import requests
import asyncio
import aiohttp
import os
import logging
from typing import Dict, Any, List
from datetime import datetime
import pytz

logger = logging.getLogger("services")

# Try import geoip2 for Offline Mode
try:
    import geoip2.database
    HAS_GEOIP2 = True
except ImportError:
    HAS_GEOIP2 = False

class MyIpService:
    """
    公网 IP 查询服务类
    提供获取本地出口 IP、查询特定 IP 详情以及批量查询功能。
    支持离线数据库 (GeoLite2) 和 多家在线 API 融合查询。
    """
    # GeoLite2 离线数据库路径
    GEOIP_DB_PATH = "e:/NetOps/data/ip/GeoLite2-City.mmdb"
    GEOIP_ASN_PATH = "e:/NetOps/data/ip/GeoLite2-ASN.mmdb"
    
    # Simple Country Translation Map for Online Results
    _COUNTRY_MAP = {
        'US': '美国', 'CN': '中国', 'GB': '英国', 'JP': '日本', 'DE': '德国',
        'FR': '法国', 'RU': '俄罗斯', 'CA': '加拿大', 'AU': '澳大利亚', 'BR': '巴西',
        'IN': '印度', 'KR': '韩国', 'SG': '新加坡', 'HK': '中国香港', 'TW': '中国台湾',
        'MO': '中国澳门', 'MY': '马来西亚', 'TH': '泰国', 'VN': '越南', 'ID': '印度尼西亚',
        'PH': '菲律宾', 'NL': '荷兰', 'SE': '瑞典', 'CH': '瑞士', 'ES': '西班牙',
        'IT': '意大利', 'BE': '比利时', 'DK': '丹麦', 'NO': '挪威', 'FI': '芬兰',
        'PL': '波兰', 'TR': '土耳其', 'UA': '乌克兰', 'IE': '爱尔兰', 'AT': '奥地利',
        'NZ': '新西兰', 'PT': '葡萄牙', 'GR': '希腊', 'SA': '沙特阿拉伯', 'ZA': '南非',
        'EG': '埃及', 'AE': '阿联酋', 'AR': '阿根廷', 'CL': '智利', 'CO': '哥伦比亚',
        'MX': '墨西哥', 'PE': '秘鲁', 'IL': '以色列', 'PK': '巴基斯坦', 'BD': '孟加拉国'
    }

    @staticmethod
    def _translate_country(code_or_name: str) -> str:
        if not code_or_name: return ""
        if code_or_name.upper() in MyIpService._COUNTRY_MAP:
            return MyIpService._COUNTRY_MAP[code_or_name.upper()]
        return code_or_name

    @staticmethod
    def _get_local_time(timezone_str: str) -> str:
        """根据时区字符串获取当地具体时间"""
        if not timezone_str or timezone_str == "-":
            return "-"
        try:
            tz = pytz.timezone(timezone_str)
            return datetime.now(tz).strftime("%H:%M:%S")
        except Exception as e:
            logger.error(f"Timezone error for {timezone_str}: {e}")
            return "-"

    @staticmethod
    def get_public_ip():
        """Get Public IP Info (Auto Source - Prefers IPInfo as requested)"""
        return MyIpService.query_online_ipinfo(None)

    @staticmethod
    def query_batch(ips: list, source='offline'):
        """Batch query IPs"""
        results = []
        for ip in ips:
            info = MyIpService.query_ip(ip, source=source)
            results.append(info)
        return results

    @staticmethod
    def query_ip(ip: str = None, source='offline'):
        """Query specific IP with strict source selection"""
        
        # 1. Offline Strict
        if source == 'offline':
            if HAS_GEOIP2 and os.path.exists(MyIpService.GEOIP_DB_PATH):
                try:
                    data = MyIpService._query_offline(ip)
                    if data: 
                        data['source'] = 'Offline (GeoLite2)'
                        return data
                    return {"ip": ip, "error": "Not found in Offline DB"}
                except Exception as e:
                    return {"ip": ip, "error": f"Offline DB Error: {str(e)}"}
            else:
                return {"ip": ip, "error": "Offline DB not available (Missing mmdb)"}

        # 2. Strict Online: FreeIPAPI
        if source == 'freeipapi':
            try:
                data = MyIpService.query_online_freeipapi(ip)
                data['source'] = 'Online (FreeIPAPI)'
                return data
            except Exception as e:
                 return {"ip": ip, "error": f"FreeIPAPI Error: {str(e)}"}

        # 3. Strict Online: IPInfo
        if source == 'ipinfo':
            try:
                data = MyIpService.query_online_ipinfo(ip)
                data['source'] = 'Online (IPInfo)'
                return data
            except Exception as e:
                 return {"ip": ip, "error": f"IPInfo Error: {str(e)}"}

        # 4. Strict Online: Ipify (Simple IP)
        if source == 'ipify':
            try:
                data = MyIpService.query_online_ipify(ip)
                data['source'] = 'Online (Ipify)'
                return data
            except Exception as e:
                 return {"ip": ip, "error": f"Ipify Error: {str(e)}"}

        # 5. Auto (Fallback Mode)
        if source == 'auto':
            if HAS_GEOIP2 and os.path.exists(MyIpService.GEOIP_DB_PATH):
                try:
                    data = MyIpService._query_offline(ip)
                    if data: 
                        data['source'] = 'Offline (GeoLite2)'
                        return data
                except: pass
            
            try:
                data = MyIpService.query_online_freeipapi(ip)
                data['source'] = 'Online (FreeIPAPI)'
                return data
            except: pass
            
            try:
                 data = MyIpService.query_online_ipinfo(ip)
                 data['source'] = 'Online (IPInfo)'
                 return data
            except: pass

            try:
                 data = MyIpService.query_online_ipify(ip)
                 data['source'] = 'Online (Ipify)'
                 return data
            except: pass

        return {"ip": ip, "error": "Unknown Source or All Sources Failed"}

    @staticmethod
    def _query_offline(ip):
        if not ip: return None
        try:
            # 1. Query City DB
            with geoip2.database.Reader(MyIpService.GEOIP_DB_PATH) as reader:
                response = reader.city(ip)
                
                # Helper to get Chinese or Fallback
                def get_name(obj):
                    return obj.names.get('zh-CN', obj.names.get('en', 'Unknown'))
                
                country = get_name(response.country)
                city = get_name(response.city)
                
                # Extract Subdivision (Province/State)
                subdivision = "Unknown"
                if response.subdivisions.most_specific.names:
                    subdivision = get_name(response.subdivisions.most_specific)
                
                postal = response.postal.code or ""
                accuracy = response.location.accuracy_radius
                
                # 2. Query ASN DB (for ISP)
                isp = "离线库 (无ISP信息)"
                org = "离线库"
                asn = ""
                
                if os.path.exists(MyIpService.GEOIP_ASN_PATH):
                    try:
                        with geoip2.database.Reader(MyIpService.GEOIP_ASN_PATH) as asn_reader:
                            asn_response = asn_reader.asn(ip)
                            raw_org = asn_response.autonomous_system_organization
                            org = raw_org
                            isp = MyIpService._translate_isp(raw_org)
                            asn = f"AS{asn_response.autonomous_system_number}"
                    except Exception as e:
                        logger.warning(f"ASN Lookup failed: {e}")

                return {
                    "ip": ip,
                    "country": country,
                    "region": subdivision, # New: Province/State
                    "city": city,
                    "postal": postal, # New: Postal Code
                    "lat": response.location.latitude,
                    "lon": response.location.longitude,
                    "accuracy": f"{accuracy}km" if accuracy else "", # New: Accuracy
                    "isp": isp, 
                    "org": org,
                    "asn": asn, # New: AS Number
                    "timezone": response.location.time_zone
                }
        except Exception as e:
            # logger.error(f"GeoIP lookup failed: {e}")
            return None

    @staticmethod
    def query_online_freeipapi(ip):
        """
        FreeIPAPI 查询 (免费档支持商业用途，限频 60req/min)
        准确度：支持省、市、邮编级定位。
        """
        url = f"https://freeipapi.com/api/json/{ip}" if ip else "https://freeipapi.com/api/json"
        try:
            resp = requests.get(url, timeout=5)
            d = resp.json()
            
            # 时区修复：该 API 返回的是 timeZones 数组，取第一个
            t_zones = d.get("timeZones", [])
            timezone = t_zones[0] if t_zones else "-"
            
            # 合并更详细的地址：省份 + 城市
            region = d.get("regionName", "")
            city = d.get("cityName", "")
            zip_code = d.get("zipCode", "")
            
            # 智能拼接地址
            full_city = city
            
            return {
                "ip": d.get("ipAddress"),
                "country": MyIpService._translate_country(d.get("countryCode")),
                "region": region,
                "city": full_city or "未知",
                "postal": zip_code,
                "lat": d.get("latitude"),
                "lon": d.get("longitude"),
                "isp": MyIpService._translate_isp(d.get("asnOrganization") or "China Telecom"), 
                "org": d.get("asnOrganization") or "",
                "asn": "", # FreeIPAPI usually doesn't give separate ASN num easily
                "timezone": timezone,
                "local_time": MyIpService._get_local_time(timezone)
            }
        except Exception as e:
            logger.error(f"FreeIPAPI error: {e}")
            return {"ip": ip, "error": str(e)}

    @staticmethod
    def query_online_ipinfo(ip):
        """
        IPInfo.io 查询 (专业、高准确度)
        """
        url = f"https://ipinfo.io/{ip}/json" if ip else "https://ipinfo.io/json"
        try:
            resp = requests.get(url, timeout=5)
            d = resp.json()
            loc = d.get("loc", "").split(",")
            lat, lon = (loc[0], loc[1]) if len(loc) == 2 else (None, None)
            
            # 合并省份和城市
            region = d.get("region", "")
            city = d.get("city", "")
            full_city = city
            postal = d.get("postal", "")
            timezone = d.get("timezone") or "-"
            
            # 运营商翻译
            raw_org = d.get("org", "")
            # Try to extract AS number from org string (usually starts with ASxxxxx)
            asn = ""
            if raw_org.startswith("AS"):
                 parts = raw_org.split(" ", 1)
                 if len(parts) > 0: asn = parts[0]
            
            isp = MyIpService._translate_isp(raw_org)

            return {
                "ip": d.get("ip"),
                "country": MyIpService._translate_country(d.get("country")),
                "region": region,
                "city": full_city or "未知",
                "postal": postal,
                "lat": lat,
                "lon": lon,
                "isp": isp,
                "org": raw_org,
                "asn": asn,
                "timezone": timezone,
                "local_time": MyIpService._get_local_time(timezone)
            }
        except Exception as e:
            logger.error(f"IPInfo error: {e}")
            return {"ip": ip, "error": str(e), "source": "IPInfo"}

    @staticmethod
    def query_online_ipify(ip):
        """
        Ipify 查询 (主要用于获取 IP，详情依赖基础解析)
        """
        # ipify 自身只返回 IP，不提供地理位置。
        # 这里模拟一个查询，如果提供了 IP 就直接用，没提供就查公网 IP。
        # 实际详情我们可能需要配合其他 API 或 离线库。
        try:
            target_ip = ip
            if not target_ip:
                resp = requests.get("https://api.ipify.org?format=json", timeout=5)
                target_ip = resp.json().get("ip")
            
            # Ipify 不提供地理位置，我们 fallback 到 offline 或 freeipapi 获取详情
            # 但为了体现 "数据源显示 ipify"，我们返回其 IP 并标注
            details = {"ip": target_ip, "country": "-", "city": "Ipify 仅供 IP 探测", "isp": "-", "timezone": "-"}
            
            # 尝试通过本地库补充一点信息
            if HAS_GEOIP2 and os.path.exists(MyIpService.GEOIP_DB_PATH):
                try:
                    off = MyIpService._query_offline(target_ip)
                    if off:
                        details.update({
                            "country": off['country'],
                            "city": f"{off['city']} (Via Offline)",
                            "lat": off['lat'],
                            "lon": off['lon'],
                            "timezone": off['timezone'],
                            "local_time": MyIpService._get_local_time(off['timezone'])
                        })
                except: pass
                
            return details
        except Exception as e:
            return {"ip": ip, "error": str(e)}

    @staticmethod
    def _translate_isp(isp: str) -> str:
        """汉化运营商名称"""
        if not isp: return "-"
        
        # 常见运营商映射表
        isp_map = {
            'China Telecom': '中国电信',
            'China Unicom': '中国联通',
            'China Mobile': '中国移动',
            'China Broadcasting Network': '中国广电',
            'CERNET': '教育网',
            'China Education and Research Network': '教育网',
            'Dr.Peng': '鹏博士',
            'Great Wall Broadband': '长城宽带',
            'Tencent': '腾讯云',
            'Alibaba': '阿里云',
            'Aliyun': '阿里云',
            'Baidu': '百度云',
            'Huawei': '华为云',
            'Amazon': '亚马逊 AWS',
            'Google': '谷歌云',
            'Microsoft': '微软 Azure',
            'Cloudflare': 'Cloudflare',
            'Akamai': 'Akamai'
        }
        
        # 1. 直接映射
        isp_upper = isp.upper()
        for k, v in isp_map.items():
            if k.upper() in isp_upper:
                return v
        
        # 2. 针对国内特定的汉字处理 (如果是中文则直接返回)
        import re
        if re.search(r'[\u4e00-\u9fa5]', isp):
            return isp
            
        return isp

    @staticmethod
    async def get_multi_path_ip() -> List[Dict[str, Any]]:
        """
        多方位公网出口探测（国内 vs 国外）
        原理：并发向国内（ipip.net）和海外（ipify.org）的探测节点发起 HTTP 请求
        """
        results = []
        
        async with aiohttp.ClientSession() as session:
            # 1. 探测国内出口 (同时获取精确位置)
            # myip.ipip.net 返回格式: 当前 IP: x.x.x.x  来自于: 中国 广东 深圳 电信
            ip_cn = ""
            location_cn = ""
            try:
                async with session.get("https://myip.ipip.net", timeout=5) as resp:
                    text = await resp.text()
                    # 兼容全角和半角冒号
                    if "当前 IP" in text:
                        # 查找 IP 地址
                        import re
                        ip_match = re.search(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', text)
                        if ip_match:
                            ip_cn = ip_match.group(1)
                        
                        if "来自于" in text:
                            # 替换全角冒号为半角，方便统一处理
                            text_norm = text.replace("：", ":")
                            location_cn = text_norm.split("来自于:")[1].strip()
            except Exception as e:
                logger.error(f"CN IP detection error: {e}")

            # 2. 探测国外出口
            ip_intl = ""
            try:
                # 尝试多个节点以防失效
                nodes = ["https://api.ipify.org", "https://ifconfig.me/ip", "https://icanhazip.com"]
                for node in nodes:
                    try:
                        async with session.get(node, timeout=3) as resp:
                            ip_intl = (await resp.text()).strip()
                            if ip_intl: break
                    except: continue
            except: pass

            # 3. 封装结果
            labels = ["访问国内出口 IP (如访问：百度/淘宝)", "访问海外出口 IP (如访问：Google/GitHub)"]
            ips = [ip_cn, ip_intl]
            
            for i, ip in enumerate(ips):
                if ip:
                    # 补充详细信息 (这里默认使用 freeipapi 作为基础解析)
                    details = await asyncio.to_thread(MyIpService.query_ip, ip, 'freeipapi')
                    details['label'] = labels[i]
                    
                    # 针对国内出口，如果 ipip.net 返回了更细的位置信息，则进行覆盖优化
                    if i == 0 and location_cn:
                         # location_cn 通常是 "中国 广东 深圳 电信"
                         # 我们过滤掉 "中国" 以保持城市名简洁
                         display_loc = location_cn.replace("中国 ", "").strip()
                         details['city'] = display_loc
                         details['source'] = 'Online (IPIP.net)'
                         
                         # 解析 ISP (IPIP 返回的末尾通常是 ISP)
                         parts = display_loc.split()
                         if len(parts) > 1:
                             details['isp'] = MyIpService._translate_isp(parts[-1])
                    else:
                         # 对非 IPIP 的结果也进行 ISP 翻译
                         details['isp'] = MyIpService._translate_isp(details.get('isp', ''))
                    
                    results.append(details)
                else:
                    results.append({
                        "label": labels[i],
                        "ip": "探测失败",
                        "error": "无法连接探测服务器"
                    })
                    
        return results

    @staticmethod
    def _format_data(data):
        return data
