import { useState, useEffect } from 'react';
import {
    CheckCircle2,
    XCircle,
    ChevronRight,
    ChevronDown,
    Clock,
    Loader2,
    Terminal,
    Activity,
    Database,
    Cpu,
    Network
} from 'lucide-react';
import { cn } from '@/lib/utils';
import HealthResultCard, { HealthData } from './HealthResultCard';

interface StepData {
    name: string;
    success: boolean;
    status?: 'running' | 'pending' | 'success' | 'failed';
    result?: any;
    exception?: string | null;
    severity_level?: number;
    performance?: {
        connect_latency?: number;
        env_gather_latency?: number;
        intf_gather_latency?: number;
        total_processing?: number;
    };
}

interface HostResult {
    success: boolean;
    status?: 'running' | 'pending' | 'success' | 'failed';
    steps?: StepData[];
    final_result?: string | null;
    error?: string | null;
}

interface TaskExecutionTimelineProps {
    results: Record<string, HostResult>;
    isLoading?: boolean;
}

// 获取步骤对应的图标
const getStepIcon = (stepName: string) => {
    const name = stepName.toLowerCase();
    if (name.includes('napalm') || name.includes('get')) return Database;
    if (name.includes('netmiko') || name.includes('command')) return Terminal;
    if (name.includes('health') || name.includes('inspect')) return Activity;
    return Cpu;
};

// 格式化步骤名称使其更易读
const formatStepName = (name: string): string => {
    const mappings: Record<string, string> = {
        'inspect_health': '健康状态采集',
        'napalm_get': 'NAPALM 数据抓取',
        'netmiko_send_command': 'Netmiko 命令执行',
        'netmiko_send_config': 'Netmiko 配置下发',
        'backup_config': '配置备份',
        'run_commands': '批量命令执行',
        'apply_config': '配置应用'
    };
    return mappings[name] || name;
};

// 状态徽章组件
const StatusBadge = ({ success, status }: { success: boolean, status?: string }) => {
    if (status === 'running') {
        return (
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-600 flex items-center gap-1.5 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                执行中
            </span>
        );
    }
    if (status === 'pending') {
        return (
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-500 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                等待中
            </span>
        );
    }
    return (
        <span className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black uppercase",
            success
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
        )}>
            {success ? '执行成功' : '执行失败'}
        </span>
    );
};

/**
 * 任务执行时间线组件
 * 按设备分组展示执行步骤，每个步骤可展开查看详细结果
 */
export default function TaskExecutionTimeline({ results, isLoading }: TaskExecutionTimelineProps) {
    const [expandedHosts, setExpandedHosts] = useState<Set<string>>(new Set());
    const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

    // 自动展开正在运行或已完成的主机 (Effect)
    useEffect(() => {
        if (results) {
            setExpandedHosts(prev => {
                const next = new Set(prev);
                Object.keys(results).forEach(host => {
                    // 只要有数据就展开，提供更好的即时反馈
                    next.add(host);
                });
                return next;
            });
        }
    }, [results]);

    // 智能识别是否为健康巡检数据 (Duck Typing)
    const isHealthData = (data: any) => {
        if (!data || typeof data !== 'object') return false;
        return 'basic' in data && 'resources' in data && 'hardware' in data;
    };

    const toggleHost = (host: string) => {
        const next = new Set(expandedHosts);
        if (next.has(host)) {
            next.delete(host);
        } else {
            next.add(host);
        }
        setExpandedHosts(next);
    };

    const toggleStep = (stepKey: string) => {
        const next = new Set(expandedSteps);
        if (next.has(stepKey)) {
            next.delete(stepKey);
        } else {
            next.add(stepKey);
        }
        setExpandedSteps(next);
    };

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4 py-12">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <Activity className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
                </div>
                <div className="text-center">
                    <h4 className="font-black text-slate-800">正在执行自动化任务...</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Nornir 多线程并发处理中
                    </p>
                </div>
            </div>
        );
    }

    // 处理系统错误情况
    if (results?.system_error) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl mb-4">
                    <XCircle className="h-10 w-10" />
                </div>
                <h4 className="font-black text-rose-600 mb-2">系统执行异常</h4>
                <p className="text-sm font-bold text-slate-500 max-w-md text-center">
                    {String(results.system_error)}
                </p>
            </div>
        );
    }

    const hosts = Object.entries(results || {}).filter(([key]) => key !== 'system_error');

    if (hosts.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center opacity-30 py-12">
                <Terminal className="h-16 w-16 mb-4" />
                <span className="text-sm font-black uppercase tracking-widest">暂无执行结果</span>
                <span className="text-xs font-bold text-slate-400 mt-1">请选择一条执行记录查看详情</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {hosts.map(([host, data]: [string, HostResult]) => {
                const isHostExpanded = expandedHosts.has(host);
                const hasSteps = data.steps && data.steps.length > 0;

                return (
                    <div
                        key={host}
                        className={cn(
                            "rounded-[24px] border overflow-hidden transition-all",
                            data.status === 'running' ? "bg-blue-50/30 border-blue-200 shadow-sm" : "bg-slate-50/50 border-slate-100"
                        )}
                    >
                        {/* 设备头部 */}
                        <div
                            onClick={() => toggleHost(host)}
                            className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-xl transition-colors",
                                    data.status === 'running' ? "bg-blue-100 text-blue-600" : "bg-slate-900 text-white"
                                )}>
                                    {data.status === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
                                </div>
                                <div>
                                    <span className="font-black text-slate-800">{host}</span>
                                    {hasSteps && (
                                        <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase">
                                            {data.steps!.length} 步骤
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <StatusBadge success={data.success} status={data.status} />
                                {hasSteps && (
                                    isHostExpanded
                                        ? <ChevronDown className="h-4 w-4 text-slate-400" />
                                        : <ChevronRight className="h-4 w-4 text-slate-400" />
                                )}
                            </div>
                        </div>

                        {/* 步骤列表 */}
                        {isHostExpanded && hasSteps && (
                            <div className="p-4 bg-slate-50/50 space-y-4">
                                {data.steps!.map((step: StepData, idx: number) => {
                                    const stepKey = `${host} -${idx} `;
                                    const isStepExpanded = expandedSteps.has(stepKey);
                                    const StepIcon = getStepIcon(step.name);

                                    // 状态颜色判断
                                    let iconBg = "bg-slate-200 text-slate-500"; // pending
                                    if (step.status === 'running') iconBg = "bg-blue-500 text-white animate-pulse";
                                    else if (step.success) iconBg = "bg-emerald-500 text-white";
                                    else if (step.status === 'failed' || !step.success) iconBg = "bg-rose-500 text-white";

                                    return (
                                        <div className="flex-1 min-w-0">
                                            {/* 步骤条目容器 (Flex 布局) */}
                                            <div className="flex items-stretch gap-4">
                                                {/* 图标列 */}
                                                <div className="flex flex-col items-center shrink-0 w-10">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center border-2 border-white shadow-sm z-10 transition-colors",
                                                        iconBg
                                                    )}>
                                                        {step.status === 'running' ? (
                                                            <Loader2 className="h-5 w-5 animate-spin" />
                                                        ) : (
                                                            <StepIcon className="h-5 w-5" />
                                                        )}
                                                    </div>
                                                    {/* 垂直连接线 (如果不是最后一个) */}
                                                    {idx < data.steps!.length - 1 && (
                                                        <div className="w-0.5 bg-slate-200 flex-1 my-1" />
                                                    )}
                                                </div>

                                                {/* 内容列 */}
                                                <div className="flex-1 pb-6">
                                                    <div
                                                        onClick={() => toggleStep(stepKey)}
                                                        className={cn(
                                                            "flex items-center justify-between p-3 bg-white border rounded-xl cursor-pointer transition-colors shadow-sm",
                                                            step.status === 'running' ? "border-blue-200" : "border-slate-100 hover:border-slate-200"
                                                        )}
                                                    >
                                                        <div>
                                                            <span className={cn(
                                                                "text-xs font-black block",
                                                                step.status === 'pending' ? "text-slate-400" : "text-slate-800"
                                                            )}>
                                                                {formatStepName(step.name)}
                                                            </span>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                                    STEP {idx + 1}
                                                                </span>
                                                                {step.status === 'running' && (
                                                                    <span className="text-[10px] font-bold text-blue-500 flex items-center gap-1">
                                                                        正在执行...
                                                                    </span>
                                                                )}
                                                                {step.status === 'pending' && (
                                                                    <span className="text-[10px] font-bold text-slate-300">
                                                                        等待中
                                                                    </span>
                                                                )}
                                                                {step.success && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                                                                {!step.success && step.status !== 'running' && step.status !== 'pending' && <XCircle className="h-3.5 w-3.5 text-rose-500" />}

                                                                {isStepExpanded
                                                                    ? <ChevronDown className="h-3 w-3 text-slate-400" />
                                                                    : <ChevronRight className="h-3 w-3 text-slate-400" />
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 步骤详情（可折叠） */}
                                                    {isStepExpanded && step.status !== 'pending' && (
                                                        <div className="p-4 bg-white border border-slate-100 rounded-xl mt-3 overflow-hidden shadow-inner animate-in slide-in-from-top-2 duration-200">

                                                            {/* 展示耗时性能看板 */}
                                                            {step.result?.performance && (
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">连接握手</span>
                                                                        <span className="text-xs font-black text-slate-700">{step.result.performance.connect_latency?.toFixed(2)}s</span>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">环境指标</span>
                                                                        <span className="text-xs font-black text-slate-700">{step.result.performance.env_gather_latency?.toFixed(2)}s</span>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">端口扫描</span>
                                                                        <span className="text-xs font-black text-slate-700">{step.result.performance.intf_gather_latency?.toFixed(2)}s</span>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">总吞吐耗时</span>
                                                                        <span className="text-xs font-black text-blue-600 font-mono">{step.result.performance.total_processing?.toFixed(2)}s</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* 展示审计命令集 */}
                                                            {step.result?.audit_trail?.commands_executed && (
                                                                <div className="mb-4 bg-slate-900 rounded-xl p-3 border border-white/10 shadow-lg">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <Terminal className="h-3 w-3 text-emerald-400" />
                                                                        <span className="text-[10px] font-black text-white uppercase tracking-widest text-emerald-400/80">底层审计命令集 / RAW LOG</span>
                                                                    </div>
                                                                    <div className="space-y-1.5 border-l-2 border-emerald-500/20 pl-3">
                                                                        {step.result.audit_trail.commands_executed.map((cmd: string, idx: number) => (
                                                                            <div key={idx} className="flex gap-2 group">
                                                                                <span className="text-[10px] font-mono text-slate-600 shrink-0 select-none">#{idx + 1}</span>
                                                                                <code className="text-[11px] font-mono text-emerald-300 break-all leading-relaxed bg-white/5 px-1 rounded hover:bg-white/10 transition-colors cursor-text">{cmd}</code>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* 针对健康巡检结果或普通 JSON 的可视化渲染 */}
                                                            {(step.name === 'inspect_health' || isHealthData(step.result)) && typeof step.result === 'object' && step.result !== null ? (
                                                                <HealthResultCard data={step.result as HealthData} />
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                                                                        执行结果 / 响应数据
                                                                    </span>
                                                                    <pre className="text-[11px] text-slate-600 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar bg-slate-50 p-3 rounded-lg border border-slate-100/50">
                                                                        {typeof step.result === 'object'
                                                                            ? JSON.stringify(step.result, null, 2)
                                                                            : step.result || (step.status === 'running' ? "正在接收数据..." : "执行成功，无特定输出")}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
