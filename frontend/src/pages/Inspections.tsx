import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity, AlertTriangle, RotateCw, Zap,
    Loader2, Cpu, HardDrive, Thermometer,
    Server, ShieldCheck, Box, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TaskExecutionTimeline from '@/components/TaskExecutionTimeline';

// --- 类型定义 ---
interface InspectionResult {
    id: number;
    start_time: string;
    end_time: string;
    duration: number;
    status: string;
    success_count: number;
    failed_count: number;
    total_devices: number;
    results: any;
}

interface OverallSummary {
    stats: {
        total: number;
        normal: number;
        critical: number;
        pending: number;
    };
    device_list: any[];
}

export default function Inspections() {
    const navigate = useNavigate();
    const [history, setHistory] = useState<InspectionResult[]>([]);
    const [summary, setSummary] = useState<OverallSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<'monitor' | 'audit'>('monitor');

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/automation/tasks/inspect/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setHistory(await res.json());
        } catch (err) {
            console.error("Fetch history failed:", err);
        }
    };

    const fetchOverallSummary = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/automation/tasks/inspect/overall-summary', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setSummary(await res.json());
        } catch (err) {
            console.error("Fetch overall summary failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverallSummary();
        fetchHistory();
    }, []);

    const filteredDevices = useMemo(() => {
        if (!summary) return [];
        return summary.device_list.filter(d =>
            d.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.ip.includes(searchTerm)
        );
    }, [summary, searchTerm]);

    const handleRunInspection = async () => {
        setIsRunning(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/automation/quick-task', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    task_type: 'inspect',
                    device_ids: [],
                    commands: []
                })
            });
            if (res.ok) {
                const data = await res.json();
                // 跳转到自动化详情页并携带任务ID参数，以便自动选中
                if (data.job_id) {
                    navigate(`/automation?jobId=${data.job_id}`);
                } else {
                    navigate('/automation');
                }
            }
        } catch (err) {
            console.error("Run inspection failed:", err);
        } finally {
            setIsRunning(false);
        }
    };

    const StatusCard = ({ label, value, color, icon: Icon }: any) => (
        <div className={cn("p-6 rounded-[2rem] border bg-white shadow-sm flex items-center justify-between", color)}>
            <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                <h2 className="text-4xl font-black text-slate-900">{value}</h2>
            </div>
            <div className={cn("p-4 rounded-2xl", color.replace('border-', 'bg-').replace('text-', 'text-'))}>
                <Icon className="h-8 w-8" />
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-[#F8FAFC] p-8 space-y-8 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-900 text-white rounded-[1.5rem] shadow-2xl shadow-slate-200">
                        <Activity className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">网络资产巡检墙</h1>
                        <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                            <Box className="h-3 w-3" /> 一机一卡实时监控模式
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="搜索资产、IP、型号..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-12 pl-12 pr-6 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:ring-4 ring-indigo-50 outline-none w-80 transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={handleRunInspection}
                        disabled={isRunning}
                        className="h-12 px-8 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"
                    >
                        {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-current text-white" />}
                        立即刷新快照
                    </button>
                </div>
            </div>

            {/* Statistics Row */}
            {summary && (
                <div className="grid grid-cols-4 gap-6 shrink-0">
                    <StatusCard label="资产管理总数" value={summary.stats.total} color="border-slate-100 text-slate-600" icon={Server} />
                    <StatusCard label="巡检状态正常" value={summary.stats.normal} color="border-emerald-100 text-emerald-600" icon={ShieldCheck} />
                    <StatusCard label="异常/隐患警告" value={summary.stats.critical} color="border-rose-100 text-rose-600" icon={AlertTriangle} />
                    <StatusCard label="未巡检/待采集" value={summary.stats.pending} color="border-amber-100 text-amber-600" icon={Clock} />
                </div>
            )}

            {/* Main Content: Card Grid */}
            <div className="flex-1 overflow-auto custom-scrollbar -mx-2 px-2 pb-8">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                        <p className="text-sm font-black uppercase tracking-widest">正在解析资产监控墙...</p>
                    </div>
                ) : filteredDevices.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20 py-20">
                        <Server className="h-20 w-20" />
                        <div className="text-center">
                            <h4 className="text-lg font-black uppercase tracking-widest">暂无资产快照</h4>
                            <p className="text-xs font-bold mt-1 text-slate-500">点击“立即刷新快照”或检查设备资产库</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredDevices.map((dev: any, idx: number) => (
                            <div
                                key={idx}
                                className={cn(
                                    "group relative bg-white border rounded-[2.5rem] p-6 transition-all hover:shadow-2xl hover:-translate-y-1 overflow-hidden",
                                    dev.has_error ? "border-rose-200 bg-rose-50/20 shadow-rose-50" : "border-slate-100 shadow-slate-100"
                                )}
                            >
                                {/* Card Header */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex flex-col">
                                        <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase truncate max-w-[140px]">
                                            {dev.hostname}
                                        </h3>
                                        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">
                                            {dev.ip}
                                        </span>
                                    </div>
                                    <div className={cn(
                                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                        dev.status === 'success' ? "bg-emerald-100 text-emerald-700" :
                                            dev.status === 'failed' ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-400"
                                    )}>
                                        {dev.status === 'uninspected' ? 'Pending' : dev.status}
                                    </div>
                                </div>

                                {/* Resource Gauges */}
                                <div className="space-y-4 mb-6">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                                            <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> CPU Load</span>
                                            <span className={cn(dev.cpu > 80 ? "text-rose-600" : "text-slate-600")}>{dev.cpu}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full transition-all duration-500", dev.cpu > 80 ? "bg-rose-500" : "bg-indigo-500")}
                                                style={{ width: `${dev.cpu}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                                            <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> Memory</span>
                                            <span className={cn(dev.mem > 85 ? "text-rose-600" : "text-slate-600")}>{dev.mem}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full transition-all duration-500", dev.mem > 85 ? "bg-rose-500" : "bg-indigo-500")}
                                                style={{ width: `${dev.mem}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Info Row */}
                                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black transition-colors",
                                            dev.temperature > 65 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"
                                        )}>
                                            <Thermometer className="h-3 w-3" /> {dev.temperature}°C
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className={cn("p-1 rounded-lg", dev.fans_ok ? "text-emerald-500 bg-emerald-50" : "text-rose-500 bg-rose-50 animate-pulse")} title="Fans Status">
                                                <RotateCw className="h-3.5 w-3.5" />
                                            </div>
                                            <div className={cn("p-1 rounded-lg", dev.pwr_ok ? "text-emerald-500 bg-emerald-50" : "text-rose-500 bg-rose-50 animate-pulse")} title="Power Status">
                                                <Zap className="h-3.5 w-3.5" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-2 text-slate-300">
                                        <Activity className="h-4 w-4" />
                                    </div>
                                </div>

                                <div className="mt-4 text-[9px] font-bold text-slate-300 uppercase tracking-tighter text-center">
                                    Last Check: {dev.last_inspected ? new Date(dev.last_inspected).toLocaleString('zh-CN', { hour12: false }) : 'Never'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const Clock = ({ className }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
);
