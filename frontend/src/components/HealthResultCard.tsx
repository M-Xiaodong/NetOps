import React from 'react';
import {
    Cpu, HardDrive, Fan, Thermometer, Zap,
    Activity, Server, Network, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 定义接口匹配后端返回的数据结构
interface ResourceData {
    cpu_avg: number;
    memory_usage: number;
}

interface HardwareData {
    fans_ok: boolean;
    pwr_ok: boolean;
    temp_ok: boolean;
    max_temp?: number;
}

interface InterfaceStats {
    total: number;
    up_count: number;
    error_total: number;
}

interface BasicInfo {
    hostname: string;
    model: string;
    version: string;
    uptime: number; // seconds
    sn: string;
}

export interface HealthData {
    timestamp: string;
    basic: BasicInfo;
    resources: ResourceData;
    hardware: HardwareData;
    interface_stats: InterfaceStats;
}

// 格式化运行时间
const formatUptime = (seconds: number) => {
    if (!seconds) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
};

// 进度条组件
const UsageBar = ({ label, value, icon: Icon, colorClass }: any) => (
    <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
            </div>
            <span>{value}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
                className={cn("h-full rounded-full transition-all duration-500", colorClass)}
                style={{ width: `${Math.min(value, 100)}%` }}
            />
        </div>
    </div>
);

// 状态卡片小组件
const StatusIndicator = ({ label, status, value, icon: Icon }: any) => (
    <div className={cn(
        "flex flex-col items-center justify-center p-3 rounded-xl border transition-all",
        status
            ? "bg-emerald-50/50 border-emerald-100 text-emerald-700"
            : "bg-rose-50/50 border-rose-100 text-rose-700"
    )}>
        <Icon className="h-5 w-5 mb-1.5" />
        <span className="text-[10px] font-black uppercase tracking-wide">{label}</span>
        <span className="text-xs font-bold mt-0.5">
            {value || (status ? '正常' : '异常')}
        </span>
    </div>
);

export default function HealthResultCard({ data }: { data: HealthData }) {
    if (!data.basic) return <div className="text-xs text-slate-400">数据解析失败</div>;

    return (
        <div className="space-y-6">

            {/* 1. 顶部设备基础信息卡 */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-wrap gap-y-4 items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-700">
                        <Server className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-800 leading-tight">
                            {data.basic.hostname || 'Unknown Host'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded uppercase">
                                {data.basic.model}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                                SN: {data.basic.sn}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 text-right px-2">
                    <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black block">系统版本</span>
                        <span className="text-xs font-bold text-slate-700 font-mono">
                            {data.basic.version}
                        </span>
                    </div>
                    <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black block">运行时间</span>
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <Activity className="h-3 w-3 text-emerald-500" />
                            {formatUptime(data.basic.uptime)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 2. 资源利用率 */}
                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Cpu className="h-3.5 w-3.5 text-primary" />
                        资源监控
                    </h5>
                    <div className="space-y-4">
                        <UsageBar
                            label="CPU 利用率"
                            value={data.resources.cpu_avg}
                            icon={Cpu}
                            colorClass={data.resources.cpu_avg > 80 ? 'bg-rose-500' : 'bg-blue-500'}
                        />
                        <UsageBar
                            label="内存利用率"
                            value={data.resources.memory_usage}
                            icon={HardDrive}
                            colorClass={data.resources.memory_usage > 80 ? 'bg-amber-500' : 'bg-emerald-500'}
                        />
                    </div>
                </div>

                {/* 3. 接口统计 */}
                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex flex-col justify-between">
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Network className="h-3.5 w-3.5 text-primary" />
                        接口概览
                    </h5>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="text-center p-2 rounded-lg bg-slate-50">
                            <span className="block text-xl font-black text-slate-700">{data.interface_stats.total}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Total</span>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-emerald-50 text-emerald-700">
                            <span className="block text-xl font-black">{data.interface_stats.up_count}</span>
                            <span className="text-[9px] font-bold opacity-80 uppercase">UP</span>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-rose-50 text-rose-700">
                            <span className="block text-xl font-black">{data.interface_stats.error_total}</span>
                            <span className="text-[9px] font-bold opacity-80 uppercase">Errors</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. 硬件状态 */}
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    硬件健康
                </h5>
                <div className="grid grid-cols-3 gap-3">
                    <StatusIndicator
                        label="电源"
                        status={data.hardware.pwr_ok}
                        icon={Zap}
                    />
                    <StatusIndicator
                        label="风扇"
                        status={data.hardware.fans_ok}
                        icon={Fan}
                    />
                    <StatusIndicator
                        label="温度"
                        status={data.hardware.temp_ok}
                        value={data.hardware.max_temp ? `${data.hardware.max_temp}°C` : undefined}
                        icon={Thermometer}
                    />
                </div>
            </div>

            {/* 5. 任务执行详情补充 */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
                <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    执行过程详情 (Execution Flow)
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] text-slate-500 font-mono">
                    <div className="space-y-1">
                        <span className="font-bold text-slate-700 block mb-1">Session Setup:</span>
                        <p>1. Open SSH Connection (Netmiko/Paramiko)</p>
                        <p>2. Authenticate (Username/Password)</p>
                        <p>3. Detect Platform (Cisco IOS / Huawei VRP)</p>
                    </div>
                    <div className="space-y-1">
                        <span className="font-bold text-slate-700 block mb-1">Commands Sent (Equivalent):</span>
                        <p>• show version / display version</p>
                        <p>• show environment / display device</p>
                        <p>• show interfaces / display interface</p>
                        <p>• show processes cpu / display cpu</p>
                        <p>• show memory / display memory</p>
                    </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                    <span>Driver: NAPALM Community Drivers</span>
                    <span>Timestamp: {new Date(data.timestamp).toLocaleString()}</span>
                </div>
            </div>

        </div>
    );
}
