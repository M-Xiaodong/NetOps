import { useState, useRef, useEffect } from 'react';
import { Activity, Play, Square, Terminal as TerminalIcon, Settings2, Trash2, Cpu } from 'lucide-react';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';

const BatchTerminal = ({ data }: { data: { target: string, success: boolean, output: string, stats?: string } }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [data.output]);

    return (
        <div className={cn("rounded-xl border flex flex-col overflow-hidden bg-[#0c0c0c] h-[300px] shadow-lg",
            data.stats === '等待检测...' ? "border-slate-800" :
                data.success ? "border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.05)]" : "border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.05)]"
        )}>
            {/* Header */}
            <div className="bg-[#1a1a1a] px-3 py-2 flex justify-between items-center border-b border-[#333]">
                <div className="font-bold text-sm text-slate-200 font-mono">{data.target}</div>
                <div className={cn("text-[10px] font-black px-1.5 py-0.5 rounded uppercase",
                    data.stats === '等待检测...' ? "bg-slate-700 text-slate-400" :
                        data.success ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                )}>
                    {data.stats === '等待检测...' ? 'PENDING' : data.success ? 'ONLINE' : 'OFFLINE'}
                </div>
            </div>

            {/* Scrollable Terminal Body */}
            <div ref={scrollRef} className="flex-1 p-3 overflow-auto custom-scrollbar font-mono text-sm space-y-1">
                {data.output.split('\n').filter(l => l.trim()).map((line, idx) => (
                    <div key={idx} className={cn("break-all whitespace-pre-wrap",
                        line.includes('Error') || line.includes('错误') || line.includes('离线') || line.includes('Timed Out') || line.includes('超时') ? "text-rose-400" :
                            line.includes('Reply') || line.includes('来自') ? "text-emerald-400" : "text-slate-400"
                    )}>
                        {line}
                    </div>
                ))}
                {data.stats === '等待检测...' && <div className="h-3 w-1.5 bg-blue-500 animate-pulse mt-1" />}
            </div>

            {/* Footer Stats */}
            <div className="bg-[#111] px-3 py-2 border-t border-[#333] text-sm text-slate-400 font-mono truncate font-bold">
                {data.stats}
            </div>
        </div>
    );
};

const PingTool = () => {
    const [mode, setMode] = useState<'single' | 'batch'>('single');
    const [target, setTarget] = useState('');
    const [batchTargets, setBatchTargets] = useState('');
    const [count, setCount] = useState(4);
    const [size, setSize] = useState(32);
    const [ttl, setTtl] = useState(64);
    const [timeout, setTimeoutVal] = useState(1000);
    const [continuous, setContinuous] = useState(false);

    const [isPinging, setIsPinging] = useState(false);
    const [output, setOutput] = useState<string[]>([]);
    const [batchResults, setBatchResults] = useState<{ target: string, success: boolean, output: string, stats?: string }[]>([]);

    const eventSourceRef = useRef<EventSource | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [output]); // Only scroll main terminal 

    const parsePingStats = (output: string) => {
        // Try to find the statistics line
        const lines = output.split('\n').filter(l => l.trim().length > 0);
        if (lines.length === 0) return '无响应';

        // Windows: "Minimum = 46ms, Maximum = 46ms, Average = 46ms"
        // Linux: "rtt min/avg/max/mdev = 46.123/46.456/..."
        const lastLine = lines[lines.length - 1];
        if (lastLine.includes('Average =') || lastLine.includes('平均 =')) return lastLine.trim();
        if (lastLine.includes('min/avg/max')) return lastLine.trim();

        // If not found, look for loss packet info
        const lossLine = lines.find(l => l.includes('Lost =') || l.includes('丢失 =') || l.includes('packet loss'));
        return lossLine ? lossLine.trim() : lines.pop() || '未知状态';
    };

    const handleStart = async () => {
        if (mode === 'single' && !target) return;
        if (mode === 'batch' && !batchTargets) return;

        setIsPinging(true);
        // Do NOT clear output here if in batch mode. 
        if (mode === 'single') setOutput([]);
        setBatchResults([]);

        if (mode === 'single') {
            const url = api.tools.getStreamUrl('ping', {
                target,
                count: continuous ? 9999 : count,
                size,
                ttl,
                timeout,
                continuous
            });

            const es = new EventSource(url);
            eventSourceRef.current = es;

            es.onmessage = (event) => {
                if (event.data === '[DONE]') {
                    es.close();
                    setIsPinging(false);
                    return;
                }
                setOutput(prev => [...prev, event.data]);
            };

            es.onerror = () => {
                setOutput(prev => [...prev, '连接中断或服务器错误']);
                es.close();
                setIsPinging(false);
            };
        } else {
            const targets = batchTargets.split('\n').map(t => t.trim()).filter(t => t);
            if (targets.length === 0) {
                setIsPinging(false);
                return;
            }

            // setOutput([`🚀 批量扫描启动: 共 ${targets.length} 个目标 (实时模式)...`]); // REMOVED
            setBatchResults(targets.map(t => ({ target: t, success: false, output: 'Pending...', stats: '等待检测...' })));

            const controller = new AbortController();
            abortControllerRef.current = controller;

            try {
                const response = await fetch(`${api.tools.getStreamUrl('ping', {}).replace('/stream', '/batch/stream').split('?')[0]}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ targets, count, size, ttl, timeout, continuous }),
                    signal: controller.signal
                });

                if (!response.ok) throw new Error(response.statusText);

                const reader = response.body?.getReader();
                const decoder = new TextDecoder();

                if (reader) {
                    let buffer = '';
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n\n');
                        buffer = lines.pop() || ''; // Keep incomplete chunk

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const dataStr = line.slice(6);
                                if (dataStr === '[DONE]') break;
                                try {
                                    const res = JSON.parse(dataStr);
                                    // Update State Incremental
                                    setBatchResults(prev => prev.map(item => {
                                        if (item.target === res.target) {
                                            const newOutput = (item.output === 'Pending...' ? '' : item.output) + (res.output || '') + '\n';

                                            // Incremental Stats Tracking
                                            let newStats = item.stats;
                                            let isSuccess = item.success;

                                            if (res.type === 'log') {
                                                if (res.output.match(/(?:time|时间)[=<](\d+)ms/)) {
                                                    const match = res.output.match(/(?:time|时间)[=<](\d+)ms/);
                                                    newStats = `最新响应: ${match?.[1]}ms`;
                                                    isSuccess = true;
                                                } else if (res.output.includes('timed out') || res.output.includes('超时')) {
                                                    newStats = `请求超时...`;
                                                }
                                            } else if (res.type === 'finish' || res.type === 'error') {
                                                const matches = [...newOutput.matchAll(/(?:time|时间)[=<](\d+)ms/g)];
                                                const rtts = matches.map(m => parseInt(m[1]));

                                                if (rtts.length > 0) {
                                                    const min = Math.min(...rtts);
                                                    const max = Math.max(...rtts);
                                                    const avg = Math.round(rtts.reduce((a, b) => a + b, 0) / rtts.length);
                                                    newStats = `最短 = ${min}ms, 最长 = ${max}ms, 平均 = ${avg}ms`;
                                                    isSuccess = true;
                                                } else {
                                                    if (isSuccess) {
                                                        newStats = '在线 (统计数据不足)';
                                                    } else {
                                                        if (newOutput.includes('could not find host') || newOutput.includes('找不到主机')) {
                                                            newStats = '找不到主机';
                                                        } else {
                                                            newStats = '无响应';
                                                        }
                                                        isSuccess = false;
                                                    }
                                                }
                                            }

                                            return {
                                                ...item,
                                                output: newOutput,
                                                stats: newStats,
                                                success: isSuccess
                                            };
                                        }
                                        return item;
                                    }));

                                    // Append to log - REMOVED
                                    // const stats = parsePingStats(res.output || '');
                                    // setOutput(prev => [...prev, `[${res.target}] ${res.success ? '✅ 在线' : '❌ 离线'} - ${stats}`]);
                                } catch (e) {
                                    console.error("JSON Parse Error", e);
                                }
                            }
                        }
                    }
                }

                // setOutput(prev => [...prev, `\n✨ 批量扫描完成!`]); // Removed to keep separation

            } catch (e: any) {
                if (e.name !== 'AbortError') {
                    // setOutput(prev => [...prev, `❌ 批量任务失败: ${e.message}`]); // Removed to keep separation
                }
            } finally {
                abortControllerRef.current = null;
                setIsPinging(false);
            }
        }
    };

    const generateStopStats = (logs: string[], currentTarget?: string) => {
        let sent = 0;
        let received = 0;
        let min = Infinity;
        let max = 0;
        let sum = 0;

        logs.forEach(line => {
            // Count attempts (Reply or Timeout)
            if (line.includes('来自') || line.includes('Reply from') || line.includes('请求超时') || line.includes('Request timed out')) {
                sent++;
            }

            // Parse RTT
            // Matches "时间=50ms" or "time=50ms"
            const timeMatch = line.match(/(?:时间|time)[=<](\d+)ms/);
            if (timeMatch && timeMatch[1]) {
                const ms = parseInt(timeMatch[1]);
                received++;
                sum += ms;
                if (ms < min) min = ms;
                if (ms > max) max = ms;
            }
        });

        if (sent === 0) return [];

        const lost = sent - received;
        const lossRate = Math.round((lost / sent) * 100);
        const avg = received > 0 ? Math.round(sum / received) : 0;
        const minStr = min === Infinity ? 0 : min;

        // Return just stats lines, title handling is external if needed, but here we include it for single mode style
        // For batch, we might want to just append it.
        return [
            `\n--- ${currentTarget || target} Ping 统计信息 (手动停止) ---`,
            `    数据包: 已发送 = ${sent}, 已接收 = ${received}, 丢失 = ${lost} (${lossRate}% 丢失)，`,
            `往返行程的估计时间(以毫秒为单位):`,
            `    最短 = ${minStr}ms，最长 = ${max}ms，平均 = ${avg}ms`
        ];
    };

    const handleStop = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        // Stop batch request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        setIsPinging(false);

        // Generate stats if stopping manually in Single Mode
        if (mode === 'single' && output.length > 0) {
            const stats = generateStopStats(output);
            setOutput(prev => [...prev, '\n🛑 测试已停止', ...stats]);
        } else if (mode === 'batch' && batchResults.length > 0) {
            // Calculate stats for each batch target
            setBatchResults(prev => prev.map(item => {
                const logs = item.output.split('\n');
                const statsLines = generateStopStats(logs, item.target);

                // Extract avg from stats lines for the footer summary
                // "    最短 = 44ms，最长 = 45ms，平均 = 44ms"
                const lastLine = statsLines[statsLines.length - 1];
                // Try to use the generated summary as the new "stats" display
                // Remove leading spaces
                const summary = lastLine.trim();

                return {
                    ...item,
                    output: item.output + '\n🛑 手动停止\n' + statsLines.join('\n') + '\n',
                    stats: summary.includes('平均') ? summary : item.stats
                };
            }));
        }
    };

    return (
        <div className="h-full w-full p-6 flex flex-col md:flex-row gap-6 overflow-hidden bg-slate-50/30">
            {/* Left Control Panel */}
            <div className="w-full md:w-[380px] flex flex-col gap-5 overflow-y-auto shrink-0 animate-fade-in-left custom-scrollbar pr-1">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-7 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-600 p-2 rounded-xl text-white">
                                <Activity className="h-5 w-5" />
                            </div>
                            <h2 className="text-xl font-black text-slate-800">Ping 工具</h2>
                        </div>
                        <div className="bg-slate-200/50 p-1 rounded-full flex border border-slate-200/30 shadow-inner">
                            <button onClick={() => setMode('single')} className={cn("px-4 py-1.5 text-xs font-black rounded-full transition-all", mode === 'single' ? "bg-white shadow-sm text-blue-600 scale-105" : "text-slate-500 hover:text-slate-800")}>单机</button>
                            <button onClick={() => setMode('batch')} className={cn("px-4 py-1.5 text-xs font-black rounded-full transition-all", mode === 'batch' ? "bg-white shadow-sm text-blue-600 scale-105" : "text-slate-500 hover:text-slate-800")}>批量</button>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {mode === 'single' ? (
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-900 uppercase tracking-widest ml-1">探测目标</label>
                                <input type="text" placeholder="IP / 域名" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-mono font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800" value={target} onChange={e => setTarget(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !isPinging && handleStart()} />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-900 uppercase tracking-widest ml-1">批量列表 (每行一个)</label>
                                <textarea className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-mono text-lg outline-none focus:border-blue-500 resize-none transition-all text-slate-800 font-bold" value={batchTargets} onChange={e => setBatchTargets(e.target.value)} />
                            </div>
                        )}

                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-2">
                                <Settings2 className="h-4 w-4" /> 进阶参数配置
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-900 uppercase">次数 (-n)</label>
                                    <input type="number" disabled={continuous} className="w-full bg-white rounded-xl px-3 py-2.5 font-mono font-bold text-sm border border-slate-200 outline-none focus:border-blue-500 text-slate-900 disabled:opacity-50" value={count} onChange={e => setCount(parseInt(e.target.value))} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-900 uppercase">字节 (-l)</label>
                                    <input type="number" className="w-full bg-white rounded-xl px-3 py-2.5 font-mono font-bold text-sm border border-slate-200 outline-none focus:border-blue-500 text-slate-900" value={size} onChange={e => setSize(parseInt(e.target.value))} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-900 uppercase">TTL (-i)</label>
                                    <input type="number" className="w-full bg-white rounded-xl px-3 py-2.5 font-mono font-bold text-sm border border-slate-200 outline-none focus:border-blue-500 text-slate-900" value={ttl} onChange={e => setTtl(parseInt(e.target.value))} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-900 uppercase">超时 (-w)</label>
                                    <input type="number" className="w-full bg-white rounded-xl px-3 py-2.5 font-mono font-bold text-sm border border-slate-200 outline-none focus:border-blue-500 text-slate-900" value={timeout} onChange={e => setTimeoutVal(parseInt(e.target.value))} />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer group pt-2 px-1">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={continuous} onChange={e => setContinuous(e.target.checked)} />
                                <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">持续探测 (-t)</span>
                            </label>
                        </div>

                        {isPinging ? (
                            <button onClick={handleStop} className="w-full py-5 rounded-2xl font-black text-white shadow-xl shadow-red-500/20 bg-red-500 hover:bg-red-600 transition-all flex justify-center items-center gap-3 active:scale-[0.98]">
                                <Square className="h-5 w-5 fill-current" /> 停止 (STOP)
                            </button>
                        ) : (
                            <button onClick={handleStart} className="w-full py-5 rounded-2xl font-black text-white shadow-xl shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 transition-all flex justify-center items-center gap-3 hover:translate-y-[-2px] active:translate-y-0">
                                <Play className="h-5 w-5 fill-current" /> 开始探测 (START)
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div className="flex-1 bg-[#121212] rounded-3xl border border-slate-200 shadow-xl flex flex-col min-h-[500px] overflow-hidden animate-fade-in-right relative">
                <div className="bg-[#1a1a1a] px-5 py-3.5 flex items-center justify-between border-b border-[#222] shrink-0">
                    <div className="flex items-center gap-3">
                        <TerminalIcon className="h-4 w-4 text-blue-500" />
                        <span className="text-[10px] font-black font-mono text-slate-500 tracking-widest items-center flex gap-2">
                            {mode === 'single' ? 'TERMINAL OUTPUT' : 'BATCH RESULTS'} {isPinging && <Cpu className="h-3 w-3 animate-spin text-blue-500" />}
                        </span>
                    </div>
                    <button onClick={() => { setOutput([]); setBatchResults([]); }} className="text-[10px] font-black text-slate-500 hover:text-white uppercase transition-colors flex items-center gap-1">
                        <Trash2 className="h-3 w-3" /> Clear
                    </button>
                </div>

                <div ref={scrollRef} className="flex-1 p-6 font-mono text-sm overflow-auto text-slate-300 space-y-1.5 custom-scrollbar bg-[#121212]">
                    {mode === 'single' ? (
                        /* Single Mode Terminal Output */
                        <>
                            {output.map((line, i) => (
                                <div key={i} className={cn("break-all whitespace-pre-wrap leading-relaxed animate-fade-in",
                                    line.includes('Error') || line.includes('错误') || line.includes('离线') || line.includes('🛑') || line.includes('Timed Out') ? "text-rose-400" :
                                        line.includes('在线') || line.includes('Reply') || line.includes('ttl') ? "text-emerald-400" :
                                            line.startsWith('🚀') || line.startsWith('🚀') ? "text-blue-400" : ""
                                )}>
                                    <span className="opacity-30 select-none mr-3 text-xs">{i + 1}</span>
                                    {line}
                                </div>
                            ))}
                            {isPinging && <div className="h-4 w-2 bg-blue-500 animate-pulse inline-block ml-11 mt-1" />}
                        </>
                    ) : (
                        /* Batch Mode Grid Output - Terminal Style */
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {batchResults.map((res, i) => (
                                <BatchTerminal key={i} data={res} />
                            ))}
                            {batchResults.length === 0 && (
                                <div className="col-span-full text-center py-20 opacity-30 italic text-slate-500">
                                    输入 IP 列表并点击开始探测...
                                </div>
                            )}
                        </div>
                    )}

                    {/* Default Empty State */}
                    {output.length === 0 && batchResults.length === 0 && !isPinging && (
                        <div className="h-full flex flex-col justify-center items-center text-slate-700 gap-5 opacity-40 absolute inset-0 pointer-events-none">
                            <div className="relative">
                                <Activity className="h-20 w-20 stroke-[1]" />
                                <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full" />
                            </div>
                            <div className="text-lg font-black tracking-widest italic uppercase">Ready for Analysis</div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};
export default PingTool;
