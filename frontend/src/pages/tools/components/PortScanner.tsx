import { useState, useRef, useEffect } from 'react';
import { Target, Zap, Square, Settings2, Trash2, Server, Timer, Globe, Wifi, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

// 端口预设
const PORT_PRESETS = [
    { id: 'top100', name: 'TOP 100', desc: '常用端口' },
    { id: 'web', name: 'Web', desc: '网站服务' },
    { id: 'database', name: '数据库', desc: 'DB服务' },
    { id: 'remote', name: '远程', desc: '远程管理' },
    { id: 'mail', name: '邮件', desc: '邮件服务' },
    { id: '1-1024', name: '系统端口', desc: '1-1024' },
];

// 速度模式
const SPEED_MODES = [
    { id: 'fast', name: '快速', desc: '100ms超时', color: 'text-green-600 bg-green-50' },
    { id: 'standard', name: '标准', desc: '500ms超时', color: 'text-blue-600 bg-blue-50' },
    { id: 'deep', name: '深度', desc: '2s超时', color: 'text-orange-600 bg-orange-50' },
];

interface ScanResult {
    target: string;
    ip: string;
    openPorts: Array<{
        port: number;
        status: string;
        service: string;
        product: string;
        version: string;
        banner: string;
        latency: number;
    }>;
    status: 'pending' | 'scanning' | 'done' | 'error';
    error?: string;
}

const PortScanner = () => {
    // 输入状态
    const [targets, setTargets] = useState('');
    const [portPreset, setPortPreset] = useState('top100');
    const [customPorts, setCustomPorts] = useState('');
    const [speedMode, setSpeedMode] = useState('standard');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // 扫描状态
    const [isScanning, setIsScanning] = useState(false);
    const [results, setResults] = useState<ScanResult[]>([]);
    const [progress, setProgress] = useState({ completed: 0, total: 0 });
    const [stats, setStats] = useState({ targets: 0, ports: 0, openFound: 0 });

    const eventSourceRef = useRef<EventSource | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // 自动滚动
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [results]);

    const handleStart = () => {
        if (!targets.trim()) return;

        setIsScanning(true);
        setResults([]);
        setProgress({ completed: 0, total: 0 });
        setStats({ targets: 0, ports: 0, openFound: 0 });

        const portStr = customPorts.trim() || portPreset;
        const params = new URLSearchParams({
            targets: targets.trim(),
            ports: portStr,
            speed: speedMode
        });

        const API_BASE = `${window.location.protocol}//${window.location.hostname}:8000/api`;
        const es = new EventSource(`${API_BASE}/tools/port-scan/stream?${params}`);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            if (event.data === '[DONE]') {
                es.close();
                setIsScanning(false);
                return;
            }

            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'init':
                        setStats({ targets: data.targets, ports: data.ports, openFound: 0 });
                        setProgress({ completed: 0, total: data.total });
                        break;

                    case 'host_start':
                        setResults(prev => [...prev, {
                            target: data.target,
                            ip: data.ip,
                            openPorts: [],
                            status: 'scanning'
                        }]);
                        break;

                    case 'port_open':
                        setResults(prev => prev.map(r =>
                            r.target === data.target
                                ? { ...r, openPorts: [...r.openPorts, data.port] }
                                : r
                        ));
                        setStats(prev => ({ ...prev, openFound: prev.openFound + 1 }));
                        break;

                    case 'host_done':
                        setResults(prev => prev.map(r =>
                            r.target === data.target
                                ? { ...r, status: 'done' }
                                : r
                        ));
                        break;

                    case 'host_error':
                        setResults(prev => [...prev, {
                            target: data.target,
                            ip: '',
                            openPorts: [],
                            status: 'error',
                            error: data.error
                        }]);
                        break;

                    case 'progress':
                        setProgress({ completed: data.completed, total: data.total });
                        break;

                    case 'error':
                        console.error(data.message);
                        break;
                }
            } catch (e) {
                console.error('Parse error', e);
            }
        };

        es.onerror = () => {
            es.close();
            setIsScanning(false);
        };
    };

    const handleStop = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }
        setIsScanning(false);
    };

    const progressPercent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

    return (
        <div className="h-full w-full p-6 flex flex-col md:flex-row gap-6 overflow-hidden bg-slate-50/30">
            {/* 左侧控制面板 */}
            <div className="w-full md:w-[400px] flex flex-col gap-5 overflow-y-auto shrink-0 animate-fade-in-left custom-scrollbar pr-1">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-7 space-y-6">
                    {/* 标题 */}
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-500 p-2.5 rounded-xl text-white">
                            <Target className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">端口检测</h2>
                            <p className="text-xs text-slate-400 font-bold">支持 IP/域名/网段(CIDR)</p>
                        </div>
                    </div>

                    {/* 目标输入 */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest ml-1">扫描目标</label>
                        <textarea
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-mono font-bold text-lg outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all text-black h-[120px] resize-none custom-scrollbar"
                            value={targets}
                            onChange={(e) => setTargets(e.target.value)}
                            placeholder={"192.168.1.1\ngoogle.com\n10.0.0.0/24"}
                        />
                        <p className="text-[10px] text-slate-400 ml-1">每行一个，或逗号分隔。网段最大 /24</p>
                    </div>

                    {/* 端口预设 */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest ml-1">端口范围</label>
                        <div className="flex flex-wrap gap-2">
                            {PORT_PRESETS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => { setPortPreset(p.id); setCustomPorts(''); }}
                                    className={cn(
                                        "px-3 py-2 rounded-xl text-xs font-black transition-all border",
                                        portPreset === p.id && !customPorts
                                            ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600"
                                    )}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-orange-500 transition-all text-slate-800"
                            value={customPorts}
                            onChange={(e) => setCustomPorts(e.target.value)}
                            placeholder="自定义: 80,443,8080 或 1-1024"
                        />
                    </div>

                    {/* 高级选项 */}
                    <div className="space-y-3">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-orange-600 transition-colors"
                        >
                            <Settings2 className="h-4 w-4" />
                            扫描模式
                            <span className={cn("transition-transform", showAdvanced && "rotate-180")}>▼</span>
                        </button>

                        {showAdvanced && (
                            <div className="grid grid-cols-3 gap-2 animate-fade-in">
                                {SPEED_MODES.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSpeedMode(m.id)}
                                        className={cn(
                                            "p-3 rounded-xl text-center transition-all border-2",
                                            speedMode === m.id
                                                ? `${m.color} border-current`
                                                : "border-slate-100 text-slate-500 hover:border-slate-200"
                                        )}
                                    >
                                        <div className="font-black text-sm">{m.name}</div>
                                        <div className="text-[10px] opacity-70">{m.desc}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 开始/停止按钮 */}
                    {isScanning ? (
                        <button
                            onClick={handleStop}
                            className="w-full py-5 rounded-2xl font-black text-white shadow-xl shadow-red-500/20 bg-red-500 hover:bg-red-600 transition-all flex justify-center items-center gap-3 active:scale-[0.98]"
                        >
                            <Square className="h-5 w-5 fill-current" /> 停止 (STOP)
                        </button>
                    ) : (
                        <button
                            onClick={handleStart}
                            disabled={!targets.trim()}
                            className="w-full py-5 rounded-2xl font-black text-white shadow-xl shadow-orange-500/20 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-3 hover:translate-y-[-2px] active:translate-y-0"
                        >
                            <Zap className="h-5 w-5" /> 开始扫描 (START)
                        </button>
                    )}
                </div>
            </div>

            {/* 右侧结果面板 */}
            <div className="flex-1 bg-[#0a0a0b] rounded-3xl border border-slate-700 shadow-xl flex flex-col overflow-hidden animate-fade-in-right">
                {/* 头部 */}
                <div className="bg-[#141416] px-5 py-4 flex items-center justify-between border-b border-[#222] shrink-0">
                    <div className="flex items-center gap-4">
                        <Target className="h-4 w-4 text-orange-500" />
                        <span className="text-xs font-black font-mono text-slate-400 tracking-widest uppercase">
                            SCAN RESULTS
                        </span>
                        {isScanning && (
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
                                <span className="text-xs text-orange-400 font-bold">{progressPercent}%</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-slate-500">目标: <span className="text-white font-bold">{stats.targets}</span></span>
                        <span className="text-slate-500">端口: <span className="text-white font-bold">{stats.ports}</span></span>
                        <span className="text-slate-500">开放: <span className="text-emerald-400 font-bold">{stats.openFound}</span></span>
                        <button
                            onClick={() => { setResults([]); setStats({ targets: 0, ports: 0, openFound: 0 }); }}
                            className="text-slate-500 hover:text-white transition-colors flex items-center gap-1 uppercase font-black"
                        >
                            <Trash2 className="h-3 w-3" /> Clear
                        </button>
                    </div>
                </div>

                {/* 进度条 */}
                {isScanning && progress.total > 0 && (
                    <div className="h-1 bg-slate-800">
                        <div
                            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                )}

                {/* 结果列表 */}
                <div ref={scrollRef} className="flex-1 overflow-auto custom-scrollbar p-5 space-y-4">
                    {results.length === 0 && !isScanning && (
                        <div className="h-full flex flex-col justify-center items-center text-slate-600 gap-4 opacity-50">
                            <Target className="h-16 w-16 stroke-[1]" />
                            <div className="text-sm font-black tracking-widest uppercase">输入目标开始扫描</div>
                        </div>
                    )}

                    {results.map((host, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "rounded-2xl border overflow-hidden transition-all",
                                host.status === 'error' ? "border-red-500/30 bg-red-500/5" :
                                    host.status === 'done' ? "border-emerald-500/30 bg-emerald-500/5" :
                                        "border-slate-700 bg-slate-800/50"
                            )}
                        >
                            {/* 主机头部 */}
                            <div className="px-4 py-3 flex items-center justify-between bg-black/20">
                                <div className="flex items-center gap-3">
                                    {host.status === 'scanning' && <Wifi className="h-4 w-4 text-orange-400 animate-pulse" />}
                                    {host.status === 'done' && <Globe className="h-4 w-4 text-emerald-400" />}
                                    {host.status === 'error' && <AlertCircle className="h-4 w-4 text-red-400" />}
                                    <span className="font-mono font-bold text-white">{host.target}</span>
                                    {host.ip && host.ip !== host.target && (
                                        <span className="text-xs text-slate-500 font-mono">({host.ip})</span>
                                    )}
                                </div>
                                <div className={cn(
                                    "text-[10px] font-black px-2 py-1 rounded uppercase",
                                    host.status === 'scanning' ? "bg-orange-500/20 text-orange-400" :
                                        host.status === 'done' ? "bg-emerald-500/20 text-emerald-400" :
                                            "bg-red-500/20 text-red-400"
                                )}>
                                    {host.status === 'scanning' ? 'SCANNING' : host.status === 'done' ? `${host.openPorts.length} OPEN` : 'ERROR'}
                                </div>
                            </div>

                            {/* 开放端口 */}
                            {host.openPorts.length > 0 && (
                                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                    {host.openPorts.map((p, i) => (
                                        <div
                                            key={i}
                                            className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50 hover:border-emerald-500/30 transition-colors"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xl font-black text-white">{p.port}</span>
                                                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">OPEN</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                <Server className="h-3 w-3 text-blue-400" />
                                                <span className="truncate">{p.product || p.service || 'Unknown'}</span>
                                            </div>
                                            {p.version && (
                                                <div className="text-[10px] text-cyan-400 font-mono mt-1 truncate">
                                                    v{p.version}
                                                </div>
                                            )}
                                            {p.latency && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                                                    <Timer className="h-3 w-3" />
                                                    <span>{p.latency}ms</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 错误信息 */}
                            {host.error && (
                                <div className="px-4 py-3 text-sm text-red-400 font-mono">
                                    {host.error}
                                </div>
                            )}

                            {/* 无开放端口 */}
                            {host.status === 'done' && host.openPorts.length === 0 && (
                                <div className="px-4 py-3 text-sm text-slate-500 italic">
                                    未发现开放端口
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PortScanner;
