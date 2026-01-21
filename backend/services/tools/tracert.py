import subprocess
import platform
import asyncio

class TracertService:
    @staticmethod
    async def trace_stream(target: str, max_hops: int = 30, resolve_names: bool = False, timeout: int = 4000):
        """Async generator for streaming traceroute results using Thread + Queue to bypass Windows EventLoop issues"""
        print(f"[DEBUG] trace_stream called for {target}")
        try:
            system = platform.system().lower()
            import threading
            
            # Build command
            if system == "windows":
                cmd = ["tracert"]
                if not resolve_names: cmd.append("-d")
                cmd.extend(["-h", str(max_hops), "-w", str(timeout), target])
            else:
                cmd = ["traceroute"]
                if not resolve_names: cmd.append("-n")
                cmd.extend(["-m", str(max_hops), "-w", str(max(1, int(timeout/1000))), target])
            
            print(f"[DEBUG] Command: {cmd}")

            # Async Queue for results
            result_queue = asyncio.Queue()
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = asyncio.get_event_loop()
            
            def run_subprocess():
                try:
                    print(f"[DEBUG] Thread started, running subprocess")
                    # Use standard subprocess.Popen
                    process = subprocess.Popen(
                        cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        shell=True if system == "windows" else False
                    )

                    for line in iter(process.stdout.readline, b''):
                        line_str = ""
                        for enc in ['gbk', 'utf-8', 'cp936', 'latin-1']:
                            try:
                                line_str = line.decode(enc).strip()
                                if line_str: break
                            except: continue
                        
                        if line_str:
                            loop.call_soon_threadsafe(result_queue.put_nowait, f"data: {line_str}\n\n")
                    
                    process.wait()
                    print(f"[DEBUG] Subprocess finished with code {process.returncode}")
                    loop.call_soon_threadsafe(result_queue.put_nowait, None) # Sentinel
                except Exception as e:
                    print(f"[ERROR] Thread exception: {e}")
                    loop.call_soon_threadsafe(result_queue.put_nowait, f"data: 路由跟踪启动异常: {str(e)}\n\n")
                    loop.call_soon_threadsafe(result_queue.put_nowait, None)

            # Start background thread
            thread = threading.Thread(target=run_subprocess, daemon=True)
            thread.start()

            # Consume queue
            while True:
                item = await result_queue.get()
                if item is None:
                    break
                yield item
                
            yield "data: [DONE]\n\n"
        except Exception as e:
            import traceback
            err = traceback.format_exc()
            print(f"[CRITICAL ERROR] trace_stream failed: {err}")
            yield f"data: Error: {str(e)}\n\n"
            yield f"data: {str(err).replace(chr(10), ' ')}\n\n"

    @staticmethod
    async def run_trace(target: str, max_hops: int = 15) -> str:
        # Legacy support
        cmd = ["tracert", "-d", "-h", str(max_hops), target] if platform.system().lower() == "windows" else ["traceroute", "-n", "-m", str(max_hops), target]
        try:
            process = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            stdout, stderr = await process.communicate()
            out = ""
            for enc in ['gbk', 'utf-8']:
                try: out = stdout.decode(enc); break
                except: continue
            return out
        except Exception as e:
            pass # Or handle properly, but here we just need to fix indentation
            return f"Error: {str(e)}"
    @staticmethod
    async def trace_batch_stream(targets: list[str], max_hops: int = 30, resolve_names: bool = False, timeout: int = 1000):
        """Batch TraceRoute with JSON output"""
        import json
        queue = asyncio.Queue()
        
        async def _run_one(tgt):
            try:
                # Reuse trace_stream logic
                async for line in TracertService.trace_stream(tgt, max_hops, resolve_names, timeout):
                    if line.startswith("data: "):
                        content = line[6:].strip()
                        if content == "[DONE]":
                            await queue.put(f"data: {json.dumps({'type': 'finish', 'target': tgt})}\n\n")
                        else:
                            await queue.put(f"data: {json.dumps({'type': 'log', 'target': tgt, 'output': content})}\n\n")
            except Exception as e:
                await queue.put(f"data: {json.dumps({'type': 'error', 'target': tgt, 'output': str(e)})}\n\n")
                
            # Ensure we signal completion of this task if loop finishes without [DONE] (shouldn't happen but safety)
            # We rely on [DONE] from trace_stream.
        
        tasks = [asyncio.create_task(_run_one(t)) for t in targets]
        
        total_finished = 0
        total_targets = len(targets)
        
        while total_finished < total_targets:
            item = await queue.get()
            # Check for finish content
            if '"type": "finish"' in item or '"type": "error"' in item: 
                # Note: trace_stream yields [DONE] on error too, so "finish" is the main signal.
                # But if error happens in _run_one BEFORE trace_stream (unlikely) we need to count it.
                # Actually trace_stream always yields [DONE] at end.
                # The _run_one converts [DONE] to {'type': 'finish'}. 
                # So we just look for finish.
                if '"type": "finish"' in item:
                    total_finished += 1
            
            yield item
            
        yield "data: [DONE]\n\n"


def cli_main():
    import argparse
    import sys
    import asyncio
    from rich.console import Console

    console = Console()
    parser = argparse.ArgumentParser(description="NetOps 路由跟踪工具 (独立版)")
    parser.add_argument("target", help="目标主机 IP 或域名")
    parser.add_argument("-m", "--max-hops", type=int, default=15, help="最大跳数")
    
    args = parser.parse_args()
    
    async def run():
        console.print(f"\n[bold blue]正在开始路由跟踪:[/bold blue] [bold yellow]{args.target}[/bold yellow] (最大跳数: {args.max_hops})\n")
        console.print("[dim]提示: 路由跟踪可能需要较长时间，请耐心等待...[/dim]\n")
        
        # In CLI, we might want to see output as it comes, but for now we keep it simple
        # to match the existing Service logic.
        res = await TracertService.run_trace(args.target, args.max_hops)
        console.print(res)

    asyncio.run(run())

if __name__ == "__main__":
    cli_main()
