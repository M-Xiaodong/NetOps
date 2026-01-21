"""
NetOps 端口扫描工具 - 增强版
功能:
- 单目标/批量目标/网段扫描（自动识别）
- 快速/标准/深度 三档扫描模式
- Banner 抓取与服务指纹识别
- 基础 OS 探测（TTL）
- 支持 1-65535 全端口
- 流式输出
"""
import socket
import asyncio
import ipaddress
import re
from typing import List, Dict, AsyncGenerator
import time

# 常用端口预设
PORT_PRESETS = {
    "top100": [21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 993, 995, 1723, 3306, 3389, 5900, 8080,
               20, 69, 79, 88, 113, 119, 137, 138, 161, 162, 389, 636, 873, 902, 1080, 1433, 1521, 2049, 2082, 2083,
               2086, 2087, 2095, 2096, 2222, 3128, 4444, 5000, 5060, 5222, 5432, 5631, 5666, 5800, 5901, 6000, 6001,
               6379, 6666, 6667, 7001, 7002, 8000, 8008, 8081, 8443, 8888, 9000, 9090, 9200, 9300, 9999, 10000,
               11211, 27017, 28017, 50000, 50070, 50030, 1099, 1100, 1883, 4730, 5672, 6660, 8009, 8020, 8161],
    "web": [80, 443, 8080, 8443, 8000, 3000, 8888, 9000, 9090, 8081, 8008],
    "database": [3306, 5432, 1433, 6379, 27017, 9200, 5984, 1521, 50000, 11211],
    "remote": [22, 23, 3389, 5900, 5901, 5985, 5986, 2222],
    "mail": [25, 110, 143, 465, 587, 993, 995],
    "full": list(range(1, 65536))  # 全端口
}

# 扫描速度配置
SPEED_CONFIGS = {
    "fast": {"timeout": 0.1, "retries": 0, "concurrency": 500},
    "standard": {"timeout": 0.5, "retries": 1, "concurrency": 200},
    "deep": {"timeout": 2.0, "retries": 2, "concurrency": 50}
}

# 服务指纹库（扩展）
SERVICE_FINGERPRINTS = {
    # 端口号 -> 默认服务名
    21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS", 80: "HTTP", 110: "POP3",
    111: "RPCBind", 135: "MSRPC", 139: "NetBIOS", 143: "IMAP", 443: "HTTPS", 445: "SMB",
    993: "IMAPS", 995: "POP3S", 1433: "MSSQL", 1521: "Oracle", 3306: "MySQL", 3389: "RDP",
    5432: "PostgreSQL", 5900: "VNC", 6379: "Redis", 8080: "HTTP-Proxy", 8443: "HTTPS-Alt",
    9200: "Elasticsearch", 27017: "MongoDB", 11211: "Memcached", 5672: "RabbitMQ",
    1883: "MQTT", 9000: "SonarQube", 8000: "HTTP-Alt", 2222: "SSH-Alt", 5985: "WinRM-HTTP",
    5986: "WinRM-HTTPS", 8009: "AJP", 8161: "ActiveMQ", 50000: "SAP", 1099: "RMI"
}

# Banner 关键字 -> 服务识别
BANNER_PATTERNS = [
    (r"SSH-\d", "SSH"),
    (r"220.*FTP", "FTP"),
    (r"220.*SMTP|Postfix|Exim|Sendmail", "SMTP"),
    (r"MySQL|MariaDB", "MySQL"),
    (r"PostgreSQL", "PostgreSQL"),
    (r"Microsoft SQL Server", "MSSQL"),
    (r"Redis", "Redis"),
    (r"MongoDB", "MongoDB"),
    (r"HTTP/\d|html|<!DOCTYPE", "HTTP"),
    (r"OpenSSH", "SSH"),
    (r"nginx|Apache|IIS", "HTTP"),
]


class PortScannerService:
    
    @staticmethod
    def parse_targets(input_str: str) -> List[str]:
        """
        解析输入字符串，自动识别：
        - 单 IP: 192.168.1.1
        - 多 IP: 192.168.1.1, 192.168.1.2
        - 域名: google.com
        - CIDR: 192.168.1.0/24 (限制 /24)
        返回 IP 列表
        """
        targets = []
        # 拆分逗号、换行、空格分隔的多个目标
        parts = re.split(r'[,\n\s]+', input_str.strip())
        
        for part in parts:
            part = part.strip()
            if not part:
                continue
            
            # 检查是否是 CIDR
            if '/' in part:
                try:
                    network = ipaddress.ip_network(part, strict=False)
                    prefix = network.prefixlen
                    if prefix < 24:
                        raise ValueError(f"网段 {part} 过大，最大支持 /24 (256 IP)")
                    targets.extend([str(ip) for ip in network.hosts()])
                except ValueError as e:
                    raise ValueError(f"无效的网段格式: {part} - {e}")
            else:
                # 单 IP 或域名
                targets.append(part)
        
        return list(set(targets))  # 去重
    
    @staticmethod
    def parse_ports(port_str: str) -> List[int]:
        """
        解析端口字符串，支持：
        - 逗号分隔: 80,443,8080
        - 范围: 1-1024
        - 混合: 22, 80-90, 443
        - 预设名称: top100, web, database
        """
        port_str = port_str.strip().lower()
        
        # 检查是否是预设
        if port_str in PORT_PRESETS:
            return PORT_PRESETS[port_str]
        
        ports = set()
        parts = re.split(r'[,\s]+', port_str)
        
        for part in parts:
            part = part.strip()
            if not part:
                continue
            
            if '-' in part:
                # 范围
                try:
                    start, end = map(int, part.split('-'))
                    if start < 1 or end > 65535 or start > end:
                        raise ValueError(f"无效端口范围: {part}")
                    ports.update(range(start, end + 1))
                except ValueError:
                    raise ValueError(f"无法解析端口范围: {part}")
            else:
                try:
                    p = int(part)
                    if 1 <= p <= 65535:
                        ports.add(p)
                    else:
                        raise ValueError(f"端口超出范围: {p}")
                except ValueError:
                    raise ValueError(f"无效端口: {part}")
        
        return sorted(ports)
    
    @staticmethod
    async def scan_port(ip: str, port: int, timeout: float = 0.5, retries: int = 1) -> Dict:
        """扫描单个端口，获取状态、Banner、延迟"""
        for attempt in range(retries + 1):
            start = time.perf_counter()
            try:
                conn = asyncio.open_connection(ip, port)
                reader, writer = await asyncio.wait_for(conn, timeout=timeout)
                latency = (time.perf_counter() - start) * 1000
                
                # 获取 TTL (用于 OS 探测)
                ttl = None
                try:
                    sock = writer.get_extra_info('socket')
                    if sock:
                        # 这在 Windows 上可能不工作，但不影响主功能
                        pass
                except:
                    pass
                
                # Banner 抓取
                banner = ""
                try:
                    # 发送探测数据
                    if port in [80, 8080, 8000, 8443, 443]:
                        writer.write(b"HEAD / HTTP/1.0\r\n\r\n")
                        await writer.drain()
                    data = await asyncio.wait_for(reader.read(1024), timeout=0.3)
                    banner = data.decode('utf-8', errors='ignore').strip()[:200]  # 限制长度
                except:
                    pass
                
                writer.close()
                try:
                    await writer.wait_closed()
                except:
                    pass
                
                service_info = PortScannerService._identify_service(port, banner)
                
                return {
                    "port": port,
                    "status": "open",
                    "service": service_info["name"],
                    "product": service_info["product"],
                    "version": service_info["version"],
                    "banner": banner[:100] if banner else "",
                    "latency": round(latency, 1)
                }
            
            except asyncio.TimeoutError:
                if attempt == retries:
                    return {"port": port, "status": "filtered"}
            except ConnectionRefusedError:
                return {"port": port, "status": "closed"}
            except OSError as e:
                if attempt == retries:
                    return {"port": port, "status": "error", "error": str(e)[:50]}
        
        return {"port": port, "status": "filtered"}
    
    @staticmethod
    def _identify_service(port: int, banner: str) -> dict:
        """
        识别服务和版本（Banner 优先，端口号兜底）
        返回: {"name": "SSH", "version": "OpenSSH 8.2", "product": "OpenSSH"}
        """
        result = {
            "name": SERVICE_FINGERPRINTS.get(port, "Unknown"),
            "version": "",
            "product": ""
        }
        
        if not banner:
            return result
        
        # 服务类型识别
        for pattern, service in BANNER_PATTERNS:
            if re.search(pattern, banner, re.IGNORECASE):
                result["name"] = service
                break
        
        # 版本提取规则
        VERSION_PATTERNS = [
            # SSH: SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.1
            (r"SSH-[\d.]+-(\S+)", lambda m: ("SSH", m.group(1).replace("_", " "))),
            # OpenSSH 具体版本
            (r"OpenSSH[_\s]*([\d.p]+)", lambda m: ("OpenSSH", m.group(1))),
            # Apache: Server: Apache/2.4.41 (Ubuntu)
            (r"Apache/([\d.]+)", lambda m: ("Apache", m.group(1))),
            # nginx: Server: nginx/1.18.0
            (r"nginx/([\d.]+)", lambda m: ("nginx", m.group(1))),
            # IIS: Server: Microsoft-IIS/10.0
            (r"Microsoft-IIS/([\d.]+)", lambda m: ("IIS", m.group(1))),
            # MySQL: 5.7.32-0ubuntu0.18.04.1
            (r"([\d.]+)-.*mysql", lambda m: ("MySQL", m.group(1))),
            (r"mysql.*?([\d.]+)", lambda m: ("MySQL", m.group(1))),
            # MariaDB: 5.5.5-10.4.17-MariaDB
            (r"([\d.]+-[\d.]+)-MariaDB", lambda m: ("MariaDB", m.group(1))),
            (r"MariaDB", lambda m: ("MariaDB", "")),
            # PostgreSQL: PostgreSQL 13.1
            (r"PostgreSQL\s*([\d.]+)?", lambda m: ("PostgreSQL", m.group(1) or "")),
            # Redis: redis_version:6.0.9
            (r"redis_version:([\d.]+)", lambda m: ("Redis", m.group(1))),
            (r"Redis", lambda m: ("Redis", "")),
            # MongoDB
            (r"MongoDB", lambda m: ("MongoDB", "")),
            # SMTP: 220 mail.example.com ESMTP Postfix
            (r"Postfix", lambda m: ("Postfix", "")),
            (r"Exim\s*([\d.]+)?", lambda m: ("Exim", m.group(1) or "")),
            (r"Sendmail", lambda m: ("Sendmail", "")),
            # FTP: 220 ProFTPD 1.3.5e Server
            (r"ProFTPD\s*([\d.a-z]+)?", lambda m: ("ProFTPD", m.group(1) or "")),
            (r"vsftpd\s*([\d.]+)?", lambda m: ("vsftpd", m.group(1) or "")),
            (r"FileZilla Server", lambda m: ("FileZilla", "")),
            # Windows相关
            (r"Windows", lambda m: ("Windows", "")),
            (r"Microsoft", lambda m: ("Microsoft", "")),
        ]
        
        for pattern, extractor in VERSION_PATTERNS:
            match = re.search(pattern, banner, re.IGNORECASE)
            if match:
                product, version = extractor(match)
                result["product"] = product
                result["version"] = version
                break
        
        return result
    
    @staticmethod
    def _detect_os(open_ports: List[Dict], banners: List[str] = None) -> dict:
        """
        基于端口特征和 Banner 分析推断操作系统
        返回: {"os": "Windows", "confidence": "high", "details": "RDP(3389), SMB(445)"}
        """
        result = {"os": "Unknown", "confidence": "low", "details": ""}
        
        if not open_ports:
            return result
        
        port_numbers = [p.get("port") for p in open_ports if p.get("status") == "open"]
        all_banners = " ".join([p.get("banner", "") for p in open_ports if p.get("banner")])
        
        # Windows 特征端口
        windows_ports = {135, 139, 445, 3389, 5985, 5986, 1433}
        # Linux/Unix 特征端口
        linux_ports = {22, 111, 2049}
        # 网络设备特征端口
        network_ports = {23, 161, 162}
        
        windows_score = len(windows_ports & set(port_numbers))
        linux_score = len(linux_ports & set(port_numbers))
        network_score = len(network_ports & set(port_numbers))
        
        # Banner 关键词分析
        windows_keywords = ["Windows", "Microsoft", "IIS", "MSSQL", "ASP.NET", "Win32", "WinRM"]
        linux_keywords = ["Ubuntu", "Debian", "CentOS", "Red Hat", "Fedora", "Linux", "OpenSSH", "Apache", "nginx"]
        bsd_keywords = ["FreeBSD", "OpenBSD", "NetBSD"]
        network_keywords = ["Cisco", "Huawei", "Juniper", "H3C", "ZTE", "Ruijie", "SNMP"]
        
        for kw in windows_keywords:
            if kw.lower() in all_banners.lower():
                windows_score += 2
        
        for kw in linux_keywords:
            if kw.lower() in all_banners.lower():
                linux_score += 2
        
        for kw in bsd_keywords:
            if kw.lower() in all_banners.lower():
                linux_score += 1  # BSD 归类到 Unix-like
        
        for kw in network_keywords:
            if kw.lower() in all_banners.lower():
                network_score += 3
        
        # 决策
        details = []
        if 3389 in port_numbers:
            details.append("RDP(3389)")
        if 445 in port_numbers:
            details.append("SMB(445)")
        if 135 in port_numbers:
            details.append("MSRPC(135)")
        if 22 in port_numbers:
            details.append("SSH(22)")
        if 111 in port_numbers:
            details.append("RPC(111)")
        
        if network_score >= 3:
            result["os"] = "Network Device"
            result["confidence"] = "high" if network_score >= 5 else "medium"
        elif windows_score > linux_score and windows_score >= 2:
            result["os"] = "Windows"
            result["confidence"] = "high" if windows_score >= 4 else "medium"
        elif linux_score > windows_score and linux_score >= 2:
            result["os"] = "Linux/Unix"
            result["confidence"] = "high" if linux_score >= 4 else "medium"
        elif windows_score > 0 or linux_score > 0:
            result["os"] = "Windows" if windows_score > linux_score else "Linux/Unix"
            result["confidence"] = "low"
        
        result["details"] = ", ".join(details[:3])  # 最多显示 3 个特征
        return result
    
    @staticmethod
    async def scan_host(ip: str, ports: List[int], speed: str = "standard") -> Dict:
        """扫描单个主机的多个端口"""
        config = SPEED_CONFIGS.get(speed, SPEED_CONFIGS["standard"])
        
        # 解析域名
        resolved_ip = ip
        hostname = None
        try:
            if not re.match(r'^\d+\.\d+\.\d+\.\d+$', ip):
                resolved_ip = socket.gethostbyname(ip)
                hostname = ip
        except socket.gaierror:
            return {"target": ip, "ip": None, "error": f"无法解析主机: {ip}", "results": []}
        
        # 并发扫描
        semaphore = asyncio.Semaphore(config["concurrency"])
        
        async def scan_with_limit(port):
            async with semaphore:
                return await PortScannerService.scan_port(
                    resolved_ip, port, config["timeout"], config["retries"]
                )
        
        tasks = [scan_with_limit(p) for p in ports]
        results = await asyncio.gather(*tasks)
        
        # 统计
        open_ports = [r for r in results if r["status"] == "open"]
        
        return {
            "target": ip,
            "hostname": hostname,
            "ip": resolved_ip,
            "open_count": len(open_ports),
            "total_scanned": len(ports),
            "results": results
        }
    
    @staticmethod
    async def scan_batch(
        targets: List[str], 
        ports: List[int], 
        speed: str = "standard"
    ) -> List[Dict]:
        """批量扫描多个目标"""
        results = []
        for target in targets:
            result = await PortScannerService.scan_host(target, ports, speed)
            results.append(result)
        return results
    
    @staticmethod
    async def scan_stream(
        input_str: str,
        port_str: str,
        speed: str = "standard"
    ) -> AsyncGenerator[str, None]:
        """
        流式扫描，返回 SSE 格式数据
        用于前端实时展示进度
        """
        import json
        
        try:
            targets = PortScannerService.parse_targets(input_str)
            ports = PortScannerService.parse_ports(port_str)
        except ValueError as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            yield "data: [DONE]\n\n"
            return
        
        total_scans = len(targets) * len(ports)
        completed = 0
        
        # 发送初始信息
        yield f"data: {json.dumps({'type': 'init', 'targets': len(targets), 'ports': len(ports), 'total': total_scans})}\n\n"
        
        config = SPEED_CONFIGS.get(speed, SPEED_CONFIGS["standard"])
        semaphore = asyncio.Semaphore(config["concurrency"])
        
        for target in targets:
            # 解析目标
            resolved_ip = target
            hostname = None
            try:
                if not re.match(r'^\d+\.\d+\.\d+\.\d+$', target):
                    resolved_ip = socket.gethostbyname(target)
                    hostname = target
            except socket.gaierror:
                yield f"data: {json.dumps({'type': 'host_error', 'target': target, 'error': '无法解析'})}\n\n"
                completed += len(ports)
                continue
            
            yield f"data: {json.dumps({'type': 'host_start', 'target': target, 'ip': resolved_ip})}\n\n"
            
            open_ports = []
            
            async def scan_and_report(port):
                nonlocal completed
                async with semaphore:
                    result = await PortScannerService.scan_port(
                        resolved_ip, port, config["timeout"], config["retries"]
                    )
                    completed += 1
                    return result
            
            # 批量扫描端口
            batch_size = 100
            for i in range(0, len(ports), batch_size):
                batch = ports[i:i+batch_size]
                results = await asyncio.gather(*[scan_and_report(p) for p in batch])
                
                for r in results:
                    if r["status"] == "open":
                        open_ports.append(r)
                        yield f"data: {json.dumps({'type': 'port_open', 'target': target, 'port': r})}\n\n"
                
                # 进度更新
                yield f"data: {json.dumps({'type': 'progress', 'completed': completed, 'total': total_scans})}\n\n"
            
            # 主机扫描完成 - 进行 OS 探测
            os_info = PortScannerService._detect_os(open_ports)
            yield f"data: {json.dumps({'type': 'host_done', 'target': target, 'ip': resolved_ip, 'open_count': len(open_ports), 'os': os_info})}\\n\\n"
        
        yield f"data: {json.dumps({'type': 'complete', 'total_targets': len(targets), 'total_scanned': total_scans})}\n\n"
        yield "data: [DONE]\n\n"


# CLI 入口保持兼容
async def cli_main():
    import argparse
    from rich.console import Console
    from rich.table import Table
    
    console = Console()
    parser = argparse.ArgumentParser(description="NetOps 端口扫描工具 (增强版)")
    parser.add_argument("target", help="目标 (IP/域名/网段CIDR)")
    parser.add_argument("-p", "--ports", default="top100", help="端口列表或预设名称")
    parser.add_argument("-s", "--speed", choices=["fast", "standard", "deep"], default="standard")
    args = parser.parse_args()
    
    try:
        targets = PortScannerService.parse_targets(args.target)
        ports = PortScannerService.parse_ports(args.ports)
    except ValueError as e:
        console.print(f"[bold red]错误:[/bold red] {e}")
        return
    
    console.print(f"\n[bold blue]扫描目标:[/bold blue] {len(targets)} 个主机, {len(ports)} 个端口")
    console.print(f"[bold blue]扫描模式:[/bold blue] {args.speed}\n")
    
    results = await PortScannerService.scan_batch(targets, ports, args.speed)
    
    for host in results:
        if host.get("error"):
            console.print(f"[red]{host['target']}: {host['error']}[/red]")
            continue
        
        table = Table(title=f"{host['target']} ({host['ip']}) - {host['open_count']} 开放端口")
        table.add_column("端口", style="cyan")
        table.add_column("状态", justify="center")
        table.add_column("服务", style="green")
        table.add_column("延迟", style="yellow")
        
        for r in host["results"]:
            if r["status"] == "open":
                table.add_row(
                    str(r["port"]),
                    "[green]开放[/green]",
                    r.get("service", "-"),
                    f"{r.get('latency', '-')}ms"
                )
        
        console.print(table)


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        asyncio.run(cli_main())
