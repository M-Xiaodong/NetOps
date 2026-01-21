import asyncio
import platform
import subprocess
from typing import Dict, List
from concurrent.futures import ThreadPoolExecutor

class PingService:
    async def ping_stream(self, host: str, count: int = 4, size: int = 32, ttl: int = 64, timeout: int = 1000, continuous: bool = False):
        """Async generator for streaming ping results using Thread + Queue to bypass Windows EventLoop issues"""
        system = platform.system().lower()
        
        # Build command based on OS and parameters
        if system == "windows":
            cmd = ["ping"]
            if continuous: cmd.append("-t")
            else: cmd.extend(["-n", str(count)])
            cmd.extend(["-l", str(size), "-i", str(ttl), "-w", str(timeout), host])
            # Windows needs manual encoding handling usually
        else:
            cmd = ["ping"]
            if not continuous: cmd.extend(["-c", str(count)])
            cmd.extend(["-s", str(size), "-t", str(ttl), "-W", str(timeout/1000), host])

        queue = asyncio.Queue()
        loop = asyncio.get_event_loop()
        
        def run_subprocess():
            try:
                # Use standard subprocess.Popen which doesn't depend on asyncio loop
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    shell=False
                )

                for line in iter(process.stdout.readline, b''):
                    line_str = ""
                    for enc in ['gbk', 'utf-8', 'cp936']:
                        try:
                            line_str = line.decode(enc).strip()
                            if line_str: break
                        except: continue
                    
                    if line_str:
                        loop.call_soon_threadsafe(queue.put_nowait, f"data: {line_str}\n\n")
                
                process.wait()
                loop.call_soon_threadsafe(queue.put_nowait, None) # Sentinel
            except Exception as e:
                import traceback
                error_msg = f"Error: {str(e)}"
                loop.call_soon_threadsafe(queue.put_nowait, f"data: {error_msg}\n\n")
                loop.call_soon_threadsafe(queue.put_nowait, None)

        # Start the thread
        import threading
        thread = threading.Thread(target=run_subprocess, daemon=True)
        thread.start()

        # Consume queue
        while True:
            item = await queue.get()
            if item is None:
                break
            yield item
            # Small yield to let other tasks run, though stream is driven by queue
            
        yield "data: [DONE]\n\n"

    def ping_host(self, host: str, count: int = 4, size: int = 32, ttl: int = 64) -> Dict:
        # Legacy support for non-streaming
        system = platform.system().lower()
        if system == "windows":
            args = f"ping -n {count} -l {size} -i {ttl} {host}"
            shell_mode = True 
        else:
            args = ["ping", "-c", str(count), "-s", str(size), "-t", str(ttl), host]
            shell_mode = False
        
        try:
            result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=shell_mode, timeout=count+10)
            out = ""
            for enc in ['gbk', 'utf-8']:
                try: out = result.stdout.decode(enc); break
                except: continue
            return {"target": host, "output": out, "success": result.returncode == 0}
        except Exception as e:
            return {"target": host, "output": str(e), "success": False}

    async def ping_batch_stream(self, targets: list[str], count: int = 4, size: int = 32, ttl: int = 64, continuous: bool = False):
        """Streaming Batch Ping (Multiplexed Line-by-Line)"""
        import json
        queue = asyncio.Queue()
        
        # Helper to consume a single ping stream and feed the queue
        async def _worker(tgt):
            try:
                # Reuse ping_stream logic
                async for line in self.ping_stream(tgt, count, size, ttl, 2000, continuous):
                    # ping_stream yields "data: ...\n\n", we need to strip it to get the raw content
                    raw = line.replace("data: ", "").strip()
                    if raw == "[DONE]": continue
                    
                    obj = {
                        "target": tgt,
                        "type": "log",
                        "output": raw
                    }
                    await queue.put(obj)
                
                # Finished this host
                await queue.put({"target": tgt, "type": "finish", "success": True}) # We don't know success easily here without parsing last line, but let frontend handle it? 
                # Actually, ping_stream doesn't yield a "Final Result" dict. 
                # Ideally, we should yield a "Summary" at the end of ping_stream.
                # Since ping_stream is designed for generic stream, it just yields lines.
                # We will let frontend parse "Packets: Sent = X, Received = Y" to determine success.
                
            except Exception as e:
                await queue.put({"target": tgt, "type": "error", "output": str(e)})

        # Start workers
        workers = [asyncio.create_task(_worker(t)) for t in targets]
        
        # Consumer: Yield items from queue until all workers are done
        active_workers = len(workers)
        
        # We need to detect when queue is empty AND workers are done.
        # A simple way: use a sentinel or just wait for tasks.
        # But we want to yield AS SOON AS queue has item.
        
        while active_workers > 0:
            # Wait for either a queue item or a worker completion (indirectly)
            # Actually, _worker calls queue.put, so we just pop from queue.
            # But we need to know when to stop.
            # Let's count "finish" or "error" messages?
            # Or use asyncio.wait([queue.get(), ...]) ?
            
            # Better approach: Gather all workers in background.
            # When a worker returns, it's done.
            # But we also need to yield queue items.
            
            # Let's use a "Done" count in the queue.
            item = await queue.get()
            if item.get("type") in ["finish", "error"]:
                active_workers -= 1
            
            yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"

        yield "data: [DONE]\n\n"

    def ping_batch(self, targets: list[str], count: int = 4) -> List[Dict]:
        """Batch Ping multiple hosts (Threaded)"""
        with ThreadPoolExecutor(max_workers=10) as executor:
            results = list(executor.map(lambda t: self.ping_host(t, count), targets))
        return results

def cli_main():
    import argparse
    import sys
    from rich.console import Console
    from rich.table import Table

    console = Console()
    parser = argparse.ArgumentParser(description="NetOps Ping 工具 (独立版)")
    parser.add_argument("targets", nargs="+", help="目标主机 (IP 或域名，支持多个)")
    parser.add_argument("-c", "--count", type=int, default=4, help="每个目标的 Ping 次数")
    parser.add_argument("-s", "--size", type=int, default=32, help="数据包大小")
    
    args = parser.parse_args()
    service = PingService()

    table = Table(title="Ping 检测报告")
    table.add_column("目标主机", style="cyan")
    table.add_column("状态", justify="center")
    table.add_column("详情", style="green")

    with console.status("[bold green]正在检测中...") as status:
        results = service.ping_batch(args.targets, args.count)
        for res in results:
            status_text = "[green]在线[/green]" if res["success"] else "[red]离线/超时[/red]"
            table.add_row(res["target"], status_text, res["output"].split('\n')[-2] if res["success"] else res["error"])

    console.print(table)

if __name__ == "__main__":
    cli_main()
