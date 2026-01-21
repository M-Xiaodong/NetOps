import React, { useState, useEffect, useRef } from "react";
import {
    Search, RefreshCw,
    AlertCircle, Info, CheckCircle, AlertTriangle,
    ChevronLeft, ChevronRight, Hash, Clock, History as HistoryIcon,
    ChevronDown, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEntry {
    timestamp: string;
    level: string;
    logger: string;
    module: string;
    message: string;
    func: string;
    line: number;
    remote_addr?: string;
}

// 自定义美化下拉组件
function CustomSelect({
    value,
    onChange,
    options,
    className
}: {
    value: string;
    onChange: (val: string) => void;
    options: { label: string; value: string }[];
    className?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selected = options.find(o => o.value === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="h-8 flex items-center justify-between px-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-primary/50 transition-all select-none"
            >
                <span className="text-xs font-bold text-slate-700 truncate">{selected.label}</span>
                <ChevronDown className={cn("h-3 w-3 text-slate-400 transition-transform", isOpen && "rotate-180")} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 py-1.5 bg-white border border-slate-200 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] z-[100] animate-in fade-in zoom-in-95 duration-200">
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            className={cn(
                                "flex items-center justify-between px-3 py-2 text-xs font-bold transition-all cursor-pointer mx-1 rounded-lg",
                                value === opt.value ? "text-primary bg-primary/5" : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <span>{opt.label}</span>
                            {value === opt.value && <Check className="h-3.5 w-3.5" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const levelConfig: Record<string, { color: string; icon: any; border: string }> = {
    INFO: { color: "text-blue-600 bg-blue-50", border: "border-blue-100", icon: Info },
    WARNING: { color: "text-amber-600 bg-amber-50", border: "border-amber-100", icon: AlertTriangle },
    ERROR: { color: "text-rose-600 bg-rose-50", border: "border-rose-100", icon: AlertCircle },
    DEBUG: { color: "text-slate-500 bg-slate-50", border: "border-slate-100", icon: Hash },
    SUCCESS: { color: "text-emerald-600 bg-emerald-50", border: "border-emerald-100", icon: CheckCircle },
};

export default function Logs() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState("netops");
    const [level, setLevel] = useState("");
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                category,
                page: page.toString(),
                page_size: "50",
            });
            if (level) params.append("level", level);
            if (keyword) params.append("keyword", keyword);

            const token = localStorage.getItem('token');
            const baseUrl = window.location.port === '5173'
                ? `${window.location.protocol}//${window.location.hostname}:8000`
                : '';
            const apiUrl = `${baseUrl}/api/system/logs?${params}`;

            const res = await fetch(apiUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                setTotal(data.total || 0);
            }
        } catch (err) {
            console.error("Failed to fetch logs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [category, level, page]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLogs();
    };

    // 自动提取 IP 地址 (针对 uvicorn 历史日志)
    const getIp = (log: LogEntry) => {
        if (log.remote_addr && log.remote_addr !== "None") return log.remote_addr;
        // 尝试正则匹配 127.0.0.1 或 10.x.x.x 格式
        const ipMatch = log.message.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        return ipMatch ? ipMatch[1] : "-";
    };

    return (
        <div className="flex flex-col h-full bg-white animate-fade-in-scale">
            {/* Header + Filters */}
            <header className="border-b border-slate-100 flex items-center px-4 py-2 justify-between shrink-0 z-[40] gap-4 bg-slate-50/50 relative">
                <div className="flex items-center gap-3 shrink-0">
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                        <HistoryIcon className="h-4 w-4" />
                    </div>
                    <h1 className="text-sm font-black text-slate-800 tracking-tight uppercase">系统日志</h1>
                </div>

                <div className="flex items-center gap-2 flex-1 max-w-4xl">
                    <CustomSelect
                        value={category}
                        onChange={(val) => { setCategory(val); setPage(1); }}
                        className="w-40"
                        options={[
                            { label: "主进程 (NetOps)", value: "netops" },
                            { label: "API 访问记录", value: "api" },
                            { label: "业务插件日志", value: "services" },
                            { label: "自动化引擎", value: "automation" },
                            { label: "系统故障追踪", value: "system" },
                        ]}
                    />

                    <CustomSelect
                        value={level}
                        onChange={(val) => { setLevel(val); setPage(1); }}
                        className="w-28"
                        options={[
                            { label: "全部级别", value: "" },
                            { label: "INFO 提示", value: "INFO" },
                            { label: "WARN 警告", value: "WARNING" },
                            { label: "ERROR 错误", value: "ERROR" },
                            { label: "DEBUG 调试", value: "DEBUG" },
                        ]}
                    />

                    <form onSubmit={handleSearch} className="flex-1">
                        <div className="relative group">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="搜索消息内容、IP地址、函数模块..."
                                className="w-full h-8 bg-white border border-slate-200 rounded-lg pl-8 pr-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                            />
                        </div>
                    </form>
                </div>

                <button
                    onClick={fetchLogs}
                    disabled={loading}
                    className="h-8 flex items-center gap-1.5 px-3 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:border-primary hover:text-primary transition-all shrink-0 active:scale-95 shadow-sm"
                >
                    <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                    <span>同步数据</span>
                </button>
            </header>

            {/* Logs List */}
            <div className="flex-1 overflow-auto custom-scrollbar bg-white">
                <div className="min-w-[1000px]">
                    <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 grid grid-cols-[160px_80px_180px_140px_1fr] border-b border-slate-200 px-4 py-2.5 bg-slate-50/50">
                        <div className="text-[12px] font-black text-slate-700 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 记录时间</div>
                        <div className="text-[12px] font-black text-slate-700">优先级</div>
                        <div className="text-[12px] font-black text-slate-700">日志来源 (模块)</div>
                        <div className="text-[12px] font-black text-slate-700">终端 IP</div>
                        <div className="text-[12px] font-black text-slate-700">详情内容</div>
                    </div>

                    <div className="divide-y divide-slate-50">
                        {logs.length === 0 && !loading ? (
                            <div className="py-32 flex flex-col items-center justify-center text-slate-400 animate-in fade-in slide-in-from-bottom-4">
                                <AlertTriangle className="h-12 w-12 mb-4 opacity-10" />
                                <span className="text-sm font-bold tracking-tight">没有找到任何匹配的日志足迹</span>
                            </div>
                        ) : (
                            logs.map((log, i) => {
                                const config = levelConfig[log.level] || levelConfig.INFO;
                                return (
                                    <div key={i} className="grid grid-cols-[160px_80px_180px_140px_1fr] px-4 py-2 hover:bg-slate-50/80 transition-all group items-center text-[13.5px] border-b border-slate-50/50">
                                        <div className="font-mono text-slate-700 text-[12px] font-bold tracking-tighter">
                                            {log.timestamp.replace('T', ' ').substring(0, 19)}
                                        </div>
                                        <div>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tight",
                                                config.color
                                            )}>
                                                {log.level}
                                            </span>
                                        </div>
                                        <div className="truncate font-black text-slate-800 pr-4" title={`${log.logger || log.module}.${log.func}:${log.line}`}>
                                            {log.logger || log.module}
                                        </div>
                                        <div className="font-mono text-indigo-600 font-bold tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity">
                                            {getIp(log)}
                                        </div>
                                        <div className="font-medium text-slate-700 leading-relaxed whitespace-pre-wrap break-all pr-4">
                                            {log.message}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Pagination */}
            <footer className="h-14 border-t border-slate-100 flex items-center justify-between px-8 bg-slate-50/30 shrink-0">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="bg-slate-900/10 px-2 py-0.5 rounded text-slate-800 font-black">共 {total} 条记录</span>
                    <span className="mx-1 text-slate-300">/</span>
                    <span className="text-slate-800 font-black">第 {page} / {Math.ceil(total / 50) || 1} 页</span>
                    <span className="mx-2 text-slate-300 text-xs">|</span>
                    <span className="text-indigo-600 font-black">每页 50 条记录</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-1.5 py-1 rounded-full border border-slate-200 shadow-sm">
                    <button
                        disabled={page === 1 || loading}
                        onClick={() => setPage(p => p - 1)}
                        className="p-1.5 rounded-full hover:bg-slate-50 hover:text-primary disabled:opacity-30 transition-all active:scale-90"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="h-4 w-[1px] bg-slate-100 mx-1" />
                    <button
                        disabled={logs.length < 50 || loading}
                        onClick={() => setPage(p => p + 1)}
                        className="p-1.5 rounded-full hover:bg-slate-50 hover:text-primary disabled:opacity-30 transition-all active:scale-90"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </footer>
        </div>
    );
}
