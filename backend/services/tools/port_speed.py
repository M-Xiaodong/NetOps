import socket
import asyncio
import time
import argparse
import sys
from typing import Dict, List
from rich.console import Console
from rich.table import Table
from rich.progress import track

console = Console()

class PortSpeedService:
    @staticmethod
    async def measure_latency(target_ip: str, port: int, timeout: float = 2.0) -> float:
        """测量单次 TCP 连接延迟 (秒)"""
        start_time = time.perf_counter()
        try:
            conn = asyncio.open_connection(target_ip, port)
            _, writer = await asyncio.wait_for(conn, timeout=timeout)
            latency = time.perf_counter() - start_time
            writer.close()
            await writer.wait_closed()
            return latency
        except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
            return -1.0 # 表示超时或无法连接
        except Exception:
            return -1.0

    @staticmethod
    async def test_speed(target: str, port: int, count: int = 5, timeout: float = 2.0) -> Dict:
        """多次测试端口访问速度并计算统计数据"""
        try:
            target_ip = socket.gethostbyname(target)
        except Exception:
            raise ValueError(f"无法解析主机: {target}")

        latencies = []
        for _ in range(count):
            lat = await PortSpeedService.measure_latency(target_ip, port, timeout)
            if lat >= 0:
                latencies.append(lat * 1000) # 转换为毫秒
            await asyncio.sleep(0.1) # 两次测试之间的微小间隔

        if not latencies:
            return {
                "target": target,
                "port": port,
                "status": "failed",
                "avg_ms": -1,
                "max_ms": -1,
                "min_ms": -1
            }

        return {
            "target": target,
            "port": port,
            "status": "success",
            "avg_ms": round(sum(latencies) / len(latencies), 2),
            "max_ms": round(max(latencies), 2),
            "min_ms": round(min(latencies), 2),
            "count": count,
            "success_count": len(latencies)
        }

async def cli_main():
    parser = argparse.ArgumentParser(description="NetOps 端口测速工具 (独立版)")
    parser.add_argument("target", help="目标 IP 或域名")
    parser.add_argument("port", type=int, help="目标端口")
    parser.add_argument("-c", "--count", type=int, default=5, help="测试次数 (默认 5)")
    parser.add_argument("-t", "--timeout", type=float, default=2.0, help="超时时间 (秒)")
    args = parser.parse_args()

    console.print(f"\n[bold blue]正在测试端口延迟:[/bold blue] [bold yellow]{args.target}:{args.port}[/bold yellow] (次数: {args.count})\n")

    table = Table(title=f"端口 {args.port} 访问速度报告", show_header=True, header_style="bold cyan")
    table.add_column("测试序列", justify="center")
    table.add_column("延迟 (ms)", justify="right")
    table.add_column("状态", justify="center")

    latencies = []
    try:
        target_ip = socket.gethostbyname(args.target)
        for i in range(1, args.count + 1):
            lat = await PortSpeedService.measure_latency(target_ip, args.port, args.timeout)
            if lat >= 0:
                ms = lat * 1000
                latencies.append(ms)
                color = "green" if ms < 50 else "yellow" if ms < 150 else "red"
                table.add_row(f"#{i}", f"[{color}]{ms:.2f} ms[/{color}]", "[green]正常[/green]")
            else:
                table.add_row(f"#{i}", "-", "[red]超时/失败[/red]")
            await asyncio.sleep(0.1)

        console.print(table)

        if latencies:
            avg = sum(latencies) / len(latencies)
            console.print(f"\n[bold green]统计信息:[/bold green]")
            console.print(f"  平均延迟: [bold yellow]{avg:.2f} ms[/bold yellow]")
            console.print(f"  最小延迟: {min(latencies):.2f} ms")
            console.print(f"  最大延迟: {max(latencies):.2f} ms")
            console.print(f"  成功率: {len(latencies)}/{args.count}")
        else:
            console.print(f"\n[bold red]错误:[/bold red] 所有测试均失败。")
            
    except Exception as e:
        console.print(f"[bold red]错误:[/bold red] {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        asyncio.run(cli_main())
    else:
        pass
