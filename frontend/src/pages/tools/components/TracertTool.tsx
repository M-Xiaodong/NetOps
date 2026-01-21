import { useState, useRef, useEffect } from 'react';
import { Terminal, Play, Square, Settings, Trash2, Network, List } from 'lucide-react';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';

const BatchTerminal = ({ data }: { data: { target: string, output: string, status: string } }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [data.output]);

    return (
        <div className={cn("rounded-xl border flex flex-col overflow-hidden bg-[#0c0c0c] h-[300px] shadow-lg",
            data.status === '完成' ? "border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.05)]" : "border-slate-800"
        )}>
            {/* Header - EXACT SAME STYLE AS PING TOOL with slight Tracert specific adaptations */}
            <div className="bg-[#1a1a1a] px-3 py-2 flex justify-between items-center border-b border-[#333]">
                <div className="font-bold text-sm text-slate-200 font-mono">{data.target}</div>
                <div className={cn("text-[10px] font-black px-1.5 py-0.5 rounded uppercase",
                    data.status === '等待中...' ? "bg-slate-700 text-slate-400" :
                        data.status === '完成' ? "bg-emerald-500/20 text-emerald-400" :
                            "bg-blue-500/20 text-blue-400"
                )}>
                    {data.status === '等待中...' ? 'PENDING' : data.status === '完成' ? 'DONE' : 'TRACING'}
                </div>
            </div>

            {/* Scrollable Terminal Body - EXACT SAME STYLE AS PING TOOL */}
            <div ref={scrollRef} className="flex-1 p-3 overflow-auto custom-scrollbar font-mono text-sm space-y-1">
                {data.output.split('\n').map((line, i) => (
                    <div key={i} className={cn("break-all whitespace-pre-wrap",
                        line.includes('*') ? "text-slate-500" : "text-slate-300",
                        line.includes('ms') && parseInt(line.match(/(\d+) ms/)?.[1] || '0') > 100 ? "text-yellow-500" : ""
                    )}>
                        {line}
                    </div>
                ))}
                {data.status !== '完成' && data.status !== '等待中...' && <div className="h-3 w-1.5 bg-blue-500 animate-pulse mt-1" />}
            </div>

            {/* Footer Stats - Same style as Ping Tool for consistency, even if Tracert doesn't have summary stats yet */}
            <div className="bg-[#111] px-3 py-2 border-t border-[#333] text-sm text-slate-400 font-mono truncate font-bold">
                {data.status === '完成' ? '路由追踪完成' : data.status}
            </div>
        </div>
    );
};

const TracertTool = () => {
    const [mode, setMode] = useState<'single' | 'batch'>('single');

    // Single Mode State
    const [target, setTarget] = useState('');

    // Batch Mode State
    const [batchTargets, setBatchTargets] = useState('');
    const [batchResults, setBatchResults] = useState<{ target: string, output: string, status: string }[]>([]);

    // Shared Params
    const [maxHops, setMaxHops] = useState(30);
    const [resolve, setResolve] = useState(false);
    const [timeout, setTimeoutVal] = useState(1000); // Default to 1000ms

    const [isTracing, setIsTracing] = useState(false);
    const [output, setOutput] = useState<string[]>([]);

    const eventSourceRef = useRef<EventSource | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll for Single Mode
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [output]);

    const handleStart = async () => {
        if (mode === 'single' && !target) return;
        if (mode === 'batch' && !batchTargets) return;

        setIsTracing(true);
        if (mode === 'single') setOutput([]);
        setBatchResults([]);

        if (mode === 'single') {
            const url = api.tools.getStreamUrl('tracert', {
                target,
                max_hops: maxHops,
                resolve,
                timeout
            });

            const es = new EventSource(url);
            eventSourceRef.current = es;

            setOutput([`🔍 开始路由跟踪目标: ${target}`, `⚙️ 参数: Hops=${maxHops}, Resolve=${resolve}, Timeout=${timeout}ms`, '---------------------------------------------------']);

            es.onmessage = (event) => {
                if (event.data === '[DONE]') {
                    es.close();
                    setIsTracing(false);
                    setOutput(prev => [...prev, '---------------------------------------------------', '✅ 跟踪完成']);
                    return;
                }
                setOutput(prev => [...prev, event.data]);
            };

            es.onerror = () => {
                setOutput(prev => [...prev, '❌ 连接中断或发生错误']);
                es.close();
                setIsTracing(false);
            };
        } else {
            // Batch Mode
            const targets = batchTargets.split('\n').map(t => t.trim()).filter(t => t);
            if (targets.length === 0) {
                setIsTracing(false);
                return;
            }

            setBatchResults(targets.map(t => ({ target: t, output: '', status: '等待中...' })));

            const controller = new AbortController();
            abortControllerRef.current = controller;

            try {
                const response = await fetch(`${api.tools.getStreamUrl('tracert', {}).replace('/stream', '/batch/stream').split('?')[0]}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ targets, max_hops: maxHops, resolve, timeout }),
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
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const dataStr = line.slice(6);
                                if (dataStr === '[DONE]') break;
                                try {
                                    const res = JSON.parse(dataStr);
                                    setBatchResults(prev => prev.map(item => {
                                        if (item.target === res.target) {
                                            if (res.type === 'finish') {
                                                return { ...item, status: '完成' };
                                            }
                                            return {
                                                ...item,
                                                output: item.output + (res.output || '') + '\n',
                                                status: '进行中'
                                            };
                                        }
                                        return item;
                                    }));
                                } catch (e) {
                                    console.log("Parse Error", e);
                                }
                            }
                        }
                    }
                }
            } catch (e: any) {
                if (e.name !== 'AbortError') {
                    // console.error(e);
                }
            } finally {
                abortControllerRef.current = null;
                setIsTracing(false);
            }
        }
    };

    const handleStop = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsTracing(false);
        if (mode === 'single') setOutput(prev => [...prev, '🛑 已手动停止']);
    };

    return (
        <div className="h-full w-full p-6 flex flex-col md:flex-row gap-6 overflow-hidden bg-slate-50/30">
            {/* Left Control Panel */}
            <div className="w-full md:w-[380px] flex flex-col gap-5 overflow-y-auto shrink-0 animate-fade-in-left custom-scrollbar pr-1">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-7 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-600 p-2 rounded-xl text-white">
                                <Terminal className="h-5 w-5" />
                            </div>
                            <h2 className="text-xl font-black text-slate-800">路由跟踪</h2>
                        </div>
                        {/* Mode Toggle */}
                        <div className="bg-slate-100 p-1 rounded-xl flex">
                            <button
                                onClick={() => setMode('single')}
                                className={cn("px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                                    mode === 'single' ? "bg-white text-blue-600 shadow-sm scale-105" : "text-slate-400 hover:text-slate-600"
                                )}>单机</button>
                            <button
                                onClick={() => setMode('batch')}
                                className={cn("px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                                    mode === 'batch' ? "bg-white text-blue-600 shadow-sm scale-105" : "text-slate-400 hover:text-slate-600"
                                )}>批量</button>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-900 uppercase tracking-widest ml-1">
                                {mode === 'single' ? '探测目标' : '批量列表 (每行一个)'}
                            </label>
                            {mode === 'single' ? (
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-mono font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-black"
                                    value={target}
                                    onChange={e => setTarget(e.target.value)}
                                    placeholder="aliyun.com"
                                    onKeyDown={(e) => e.key === 'Enter' && !isTracing && handleStart()}
                                />
                            ) : (
                                <textarea
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-mono font-bold text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-black h-[150px] resize-none custom-scrollbar"
                                    value={batchTargets}
                                    onChange={e => setBatchTargets(e.target.value)}
                                    placeholder={'8.8.8.8\n114.114.114.114\ngithub.com'}
                                />
                            )}
                        </div>

                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-2">
                                <Settings className="h-4 w-4" /> 路由跟踪参数
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-900 uppercase">最大跳数 (-h)</label>
                                    <input type="number" className="w-full bg-white rounded-xl px-3 py-2.5 font-mono font-bold text-sm border border-slate-200 outline-none focus:border-blue-500 text-slate-900" value={maxHops} onChange={e => setMaxHops(parseInt(e.target.value))} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-900 uppercase">超时 (ms)</label>
                                    <input type="number" className="w-full bg-white rounded-xl px-3 py-2.5 font-mono font-bold text-sm border border-slate-200 outline-none focus:border-blue-500 text-slate-900" value={timeout} onChange={e => setTimeoutVal(parseInt(e.target.value))} />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer group pt-2 px-1">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={resolve} onChange={e => setResolve(e.target.checked)} />
                                <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">解析域名 (不带-d)</span>
                            </label>
                        </div>

                        {isTracing ? (
                            <button onClick={handleStop} className="w-full py-5 rounded-2xl font-black text-white shadow-xl shadow-red-500/20 bg-red-500 hover:bg-red-600 transition-all flex justify-center items-center gap-3 active:scale-[0.98]">
                                <Square className="h-5 w-5 fill-current" /> 停止 (STOP)
                            </button>
                        ) : (
                            <button onClick={handleStart} className="w-full py-5 rounded-2xl font-black text-white shadow-xl shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 transition-all flex justify-center items-center gap-3 hover:translate-y-[-2px] active:translate-y-0">
                                <Play className="h-5 w-5 fill-current" /> 开始跟踪 (START)
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Output Panel */}
            <div className="flex-1 rounded-3xl overflow-hidden flex flex-col relative">
                {mode === 'single' ? (
                    <div className="h-full bg-[#0a0a0b] border border-slate-200 shadow-xl flex flex-col rounded-3xl overflow-hidden animate-fade-in-right">
                        <div className="bg-[#141416] px-5 py-3.5 flex items-center justify-between border-b border-[#1e1e21] shrink-0">
                            <div className="flex items-center gap-3">
                                <Terminal className="h-4 w-4 text-emerald-500" />
                                <span className="text-[10px] font-black font-mono text-slate-500 tracking-widest uppercase">
                                    TERMINAL OUTPUT
                                </span>
                            </div>
                            <button onClick={() => setOutput([])} className="text-[10px] font-black text-slate-500 hover:text-white uppercase transition-colors flex items-center gap-1">
                                <Trash2 className="h-3 w-3" /> Clear
                            </button>
                        </div>
                        <div ref={scrollRef} className="flex-1 p-6 font-mono text-sm overflow-auto text-slate-400 space-y-1 custom-scrollbar bg-[#0a0a0b]">
                            {output.map((line, i) => (
                                <div key={i} className={cn("break-all whitespace-pre-wrap leading-relaxed animate-fade-in",
                                    line.includes('Error') || line.includes('❌') || line.includes('🛑') ? "text-rose-400" :
                                        line.includes('✅') || line.includes('完成') ? "text-emerald-400" :
                                            line.includes('ms') ? "text-slate-300" :
                                                line.includes('🔍') || line.includes('⚙️') ? "text-indigo-400" : ""
                                )}>
                                    <span className="opacity-20 select-none mr-4 text-[10px] w-6 inline-block text-right">{i + 1}</span>
                                    {line}
                                </div>
                            ))}
                            {output.length === 0 && !isTracing && (
                                <div className="h-full flex flex-col justify-center items-center text-slate-800 gap-5 opacity-50">
                                    <Network className="h-20 w-20 stroke-[1]" />
                                    <div className="text-sm font-black tracking-widest uppercase italic">等待输入目标...</div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Batch Mode View */
                    <div className="h-full bg-[#0a0a0b] border border-slate-200 shadow-xl flex flex-col rounded-3xl overflow-hidden animate-fade-in-right relative">
                        {/* Header for Batch Mode - Consistent with Single Mode & Ping Tool */}
                        <div className="bg-[#141416] px-5 py-3.5 flex items-center justify-between border-b border-[#1e1e21] shrink-0">
                            <div className="flex items-center gap-3">
                                <Terminal className="h-4 w-4 text-blue-500" />
                                <span className="text-[10px] font-black font-mono text-slate-500 tracking-widest uppercase">
                                    BATCH TRACE RESULTS
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                {isTracing && <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>}
                                <button onClick={() => setBatchResults([])} className="text-[10px] font-black text-slate-500 hover:text-white uppercase transition-colors flex items-center gap-1">
                                    <Trash2 className="h-3 w-3" /> Clear
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {batchResults.map((res, i) => (
                                    <BatchTerminal key={i} data={res} />
                                ))}
                                {batchResults.length === 0 && (
                                    <div className="col-span-full h-full flex flex-col justify-center items-center text-slate-700 min-h-[300px] gap-5 opacity-50">
                                        <List className="h-16 w-16 stroke-[1]" />
                                        <div className="text-sm font-black tracking-widest uppercase italic">输入列表并点击开始跟踪...</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
export default TracertTool;
