import socket
import ssl
import datetime
import requests
from urllib.parse import urlparse

class HttpToolService:
    @staticmethod
    def inspect_url(url: str):
        """全面检查 URL：状态码、响应头、重定向链、服务器信息及 SSL 证书状态"""
        if not url.startswith('http'):
            url = f"http://{url}"
        
        results = {
            "url": url,
            "status": "pending",
            "redirects": [],
            "headers": {},
            "ssl_info": None,
            "performance": {},
            "server": {}
        }

        try:
            # 1. Start Request with session to track redirects
            session = requests.Session()
            start_time = datetime.datetime.now()
            
            # We use a broad User-Agent to avoid being blocked
            headers = {
                'User-Agent': 'NetOps-Probe/2.0 (Network Diagnostics Tool)'
            }
            
            resp = session.get(url, timeout=10, allow_redirects=True, headers=headers, verify=False)
            latency = (datetime.datetime.now() - start_time).total_seconds() * 1000
            
            # 2. Extract Basic Info
            results["status"] = "success"
            results["status_code"] = resp.status_code
            results["reason"] = resp.reason
            results["final_url"] = resp.url
            results["headers"] = dict(resp.headers)
            results["performance"]["total_time_ms"] = round(latency, 2)
            results["performance"]["size_bytes"] = len(resp.content)
            
            # 3. Track Redirect History
            if resp.history:
                for r in resp.history:
                    results["redirects"].append({
                        "url": r.url,
                        "status_code": r.status_code,
                        "reason": r.reason
                    })
            
            # 4. Resolve Server IP
            results["server"]["ip"] = HttpToolService._resolve_ip(resp.url)
            
            # 5. Internal SSL check if HTTPS
            if resp.url.startswith("https"):
                domain = urlparse(resp.url).netloc.split(':')[0]
                results["ssl_info"] = HttpToolService.check_ssl(domain)

            return results
        except Exception as e:
            return {"status": "error", "error": str(e), "url": url}

    @staticmethod
    def _resolve_ip(url: str):
        try:
            domain = urlparse(url).netloc.split(':')[0]
            if not domain: domain = urlparse(url).path.split('/')[0]
            return socket.gethostbyname(domain)
        except:
            return "N/A"

    @staticmethod
    def check_ssl(domain: str):
        """Check SSL Certificate Expiry"""
        # Strip protocol
        domain = domain.replace("https://", "").replace("http://", "").split("/")[0]
        context = ssl.create_default_context()
        conn = context.wrap_socket(
            socket.socket(socket.AF_INET),
            server_hostname=domain,
        )
        conn.settimeout(3.0)

        try:
            conn.connect((domain, 443))
            cert = conn.getpeercert()
            
            # Parse expiry
            not_after_str = cert['notAfter']
            # Format: 'May 25 12:00:00 2025 GMT'
            expiry_date = datetime.datetime.strptime(not_after_str, '%b %d %H:%M:%S %Y %Z')
            remaining = expiry_date - datetime.datetime.now()
            
            subject = dict(x[0] for x in cert['subject'])
            issuer = dict(x[0] for x in cert['issuer'])
            
            return {
                "domain": domain,
                "valid": True,
                "expiry_date": expiry_date.strftime("%Y-%m-%d %H:%M:%S"),
                "days_remaining": remaining.days,
                "issuer": issuer.get('organizationName') or issuer.get('commonName'),
                "subject": subject.get('commonName')
            }
        except Exception as e:
            return {"valid": False, "error": str(e)}
        finally:
            conn.close()

def cli_main():
    import argparse
    import sys
    from rich.console import Console
    from rich.table import Table

    console = Console()
    parser = argparse.ArgumentParser(description="NetOps HTTP/SSL 工具 (独立版)")
    subparsers = parser.add_subparsers(dest="command", help="子命令")

    # Inspect
    inspect_parser = subparsers.add_parser("inspect", help="检查 URL 状态与响应头")
    inspect_parser.add_argument("url", help="目标 URL (如 google.com)")

    # SSL
    ssl_parser = subparsers.add_parser("ssl", help="检查 SSL 证书过期时间")
    ssl_parser.add_argument("domain", help="目标域名")

    args = parser.parse_args()
    service = HttpToolService()

    if args.command == "inspect":
        res = service.inspect_url(args.url)
        if res.get("error"):
            console.print(f"[bold red]错误:[/bold red] {res['error']}")
        else:
            table = Table(title=f"HTTP 检查结果: {res['url']}")
            table.add_column("项目", style="cyan")
            table.add_column("结果", style="green")
            table.add_row("状态码", f"{res['status_code']} {res['reason']}")
            table.add_row("延迟", f"{res['latency_ms']} ms")
            table.add_row("服务器 IP", res['server_ip'])
            console.print(table)
            
            h_table = Table(title="响应头 (Headers)")
            h_table.add_column("Key", style="dim")
            h_table.add_column("Value")
            for k, v in res["headers"].items():
                h_table.add_row(k, v)
            console.print(h_table)

    elif args.command == "ssl":
        res = service.check_ssl(args.domain)
        if not res.get("valid"):
            console.print(f"[bold red]解析失败或无效证书:[/bold red] {res.get('error')}")
        else:
            table = Table(title=f"SSL 证书报告: {args.domain}")
            table.add_column("项目", style="cyan")
            table.add_column("结果", style="green")
            table.add_row("颁发给", res["subject"])
            table.add_row("颁发者", res["issuer"])
            table.add_row("过期时间", res["expiry_date"])
            color = "green" if res["days_remaining"] > 30 else "yellow" if res["days_remaining"] > 7 else "red"
            table.add_row("剩余天数", f"[{color}]{res['days_remaining']} 天[/ {color}]")
            console.print(table)
    else:
        parser.print_help()

if __name__ == "__main__":
    cli_main()
