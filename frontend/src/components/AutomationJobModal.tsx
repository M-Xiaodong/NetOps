import React, { useState, useEffect } from 'react';
import {
    X, Save, Loader2, Database, Terminal, ShieldCheck,
    Clock, Calendar, Activity, Layers,
    Check, Info, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api';

// --- 类型定义 ---
type TaskType = 'query' | 'backup' | 'config' | 'inspect' | 'diagnosis';
type ScheduleType = 'immediate' | 'once' | 'cron';

interface AutomationJobModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    job?: any; // 如果是编辑模式
}

export default function AutomationJobModal({ isOpen, onClose, onSuccess, job }: AutomationJobModalProps) {
    const [loading, setLoading] = useState(false);
    const [devices, setDevices] = useState<any[]>([]);

    // 表单状态
    const [name, setName] = useState('');
    const [taskType, setTaskType] = useState<TaskType>('inspect');
    const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
    const [commands, setCommands] = useState('');
    const [scheduleType, setScheduleType] = useState<ScheduleType>('immediate');
    const [scheduleValue, setScheduleValue] = useState('');
    const [deviceSearchQuery, setDeviceSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchDevices();
            if (job) {
                setName(job.name);
                setTaskType(job.task_type);
                setSelectedDevices(job.target_devices || []);
                setCommands((job.commands || []).join('\n'));
                setScheduleType(job.schedule_type);
                setScheduleValue(job.schedule_value || '');
            } else {
                // 重置表单
                setName('');
                setTaskType('inspect');
                setSelectedDevices([]);
                setCommands('');
                setScheduleType('immediate');
                setScheduleValue('');
            }
        }
    }, [isOpen, job]);

    const fetchDevices = async () => {
        try {
            const res = await api.get('/devices/');
            setDevices(res.data);
        } catch (err) {
            console.error("Fetch devices failed:", err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                name,
                task_type: taskType,
                target_devices: selectedDevices,
                commands: commands ? commands.split('\n').filter(c => c.trim()) : [],
                schedule_type: scheduleType,
                schedule_value: scheduleValue,
                is_active: true
            };

            const url = job ? `/automation/jobs/${job.id}` : '/automation/jobs';
            if (job) {
                await api.patch(url, payload);
            } else {
                await api.post(url, payload);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Save job failed:", err);
            const detail = err.response?.data?.detail || "无法保存资产信息，请检查网络或后端服务。";
            alert(typeof detail === 'string' ? detail : JSON.stringify(detail));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 transition-all">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-slate-200">

                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-200">
                            <Layers className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                {job ? '编辑作业配置' : '创建自动化作业'}
                            </h2>
                            <p className="text-slate-400 text-sm font-bold mt-0.5">配置您的网络运维闭环逻辑与调度计划</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 hover:text-slate-900"
                    >
                        <X className="h-6 w-6 stroke-[2.5]" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-8 space-y-8 custom-scrollbar">

                    {/* Basic Info */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-1.5 h-4 bg-primary rounded-full" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">基础信息</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">作业名称</label>
                                <input
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="例如：核心交换机每日备份"
                                    className="w-full h-12 px-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">任务类型</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'inspect', label: '健康巡检', icon: <Activity className="h-3 w-3" /> },
                                        { id: 'backup', label: '配置备份', icon: <Database className="h-3 w-3" /> },
                                        { id: 'config', label: '下发配置', icon: <Terminal className="h-3 w-3" /> },
                                        { id: 'query', label: '信息查询', icon: <Search className="h-3 w-3" /> },
                                        { id: 'diagnosis', label: '网络诊断', icon: <ShieldCheck className="h-3 w-3" /> }
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => setTaskType(type.id as TaskType)}
                                            className={cn(
                                                "h-10 px-2 rounded-xl text-[10px] font-black border transition-all flex items-center justify-center gap-1.5",
                                                taskType === type.id
                                                    ? "bg-slate-900 border-slate-900 text-white shadow-md scale-105"
                                                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 shadow-sm"
                                            )}
                                        >
                                            {type.icon}
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Target Devices */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-1.5 h-4 bg-primary rounded-full" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">目标资产选择</h3>
                        </div>
                        <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100">
                            <div className="mb-6 relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    value={deviceSearchQuery}
                                    onChange={e => setDeviceSearchQuery(e.target.value)}
                                    placeholder="快速搜索设备名称或 IP..."
                                    className="w-full h-11 bg-white rounded-2xl pl-11 pr-4 text-sm font-bold border border-slate-200 focus:border-primary/20 transition-all outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-auto pr-2 custom-scrollbar">
                                {devices.filter(d =>
                                    (d.name || '').toLowerCase().includes(deviceSearchQuery.toLowerCase()) ||
                                    (d.ip || '').includes(deviceSearchQuery)
                                ).map(device => (
                                    <button
                                        key={device.id}
                                        type="button"
                                        onClick={() => {
                                            if (selectedDevices.includes(device.name)) {
                                                setSelectedDevices(selectedDevices.filter(d => d !== device.name));
                                            } else {
                                                setSelectedDevices([...selectedDevices, device.name]);
                                            }
                                        }}
                                        className={cn(
                                            "p-4 rounded-2xl border transition-all flex items-center gap-3 text-left group",
                                            selectedDevices.includes(device.name)
                                                ? "bg-white border-primary shadow-xl shadow-primary/5 ring-1 ring-primary/20"
                                                : "bg-slate-100/50 border-transparent hover:border-slate-200 hover:bg-white"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                            selectedDevices.includes(device.name)
                                                ? "bg-primary border-primary"
                                                : "bg-white border-slate-200"
                                        )}>
                                            {selectedDevices.includes(device.name) && <Check className="h-3 w-3 text-white stroke-[4]" />}
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-slate-800">{device.name}</div>
                                            <div className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">{device.ip}</div>
                                        </div>
                                    </button>
                                ))}
                                {devices.length === 0 && (
                                    <div className="col-span-3 py-10 flex flex-col items-center justify-center opacity-30">
                                        <Database className="h-10 w-10 mb-2" />
                                        <span className="text-xs font-black uppercase">未找到可用设备</span>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-slate-200/50 pt-4 px-2">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">已选择 {selectedDevices.length} 台设备</span>
                                    {selectedDevices.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedDevices([])}
                                            className="text-[10px] font-black text-rose-500 hover:underline uppercase"
                                        >
                                            取消全部
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedDevices(devices.map(d => d.name))}
                                    className="text-[10px] font-black text-primary hover:underline uppercase"
                                >
                                    全选所有项目
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Logic & Payload */}
                    {['config', 'query'].includes(taskType) && (
                        <section className="animate-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-1.5 h-4 bg-primary rounded-full" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">执行载荷 (Commands)</h3>
                            </div>
                            <div className="relative">
                                <textarea
                                    value={commands}
                                    onChange={e => setCommands(e.target.value)}
                                    placeholder="请输入要执行的命令，每行一条..."
                                    className="w-full h-40 p-6 bg-slate-900 text-emerald-400 font-mono text-sm rounded-[32px] shadow-inner focus:ring-4 focus:ring-primary/5 transition-all outline-none resize-none"
                                />
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                                    <div className="w-3 h-3 bg-amber-500 rounded-full" />
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Scheduling */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-1.5 h-4 bg-primary rounded-full" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">调度计划</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-6">
                            {[
                                { id: 'immediate', label: '立即执行', sub: '保存后立刻下发任务', icon: <Zap className="h-5 w-5" /> },
                                { id: 'once', label: '定时单次', sub: '在指定的时间运行一次', icon: <Calendar className="h-5 w-5" /> },
                                { id: 'cron', label: '周期性作业', sub: '根据 Cron 表达式循环运行', icon: <Clock className="h-5 w-5" /> }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setScheduleType(item.id as ScheduleType)}
                                    className={cn(
                                        "p-6 rounded-[24px] border transition-all text-left flex flex-col gap-3 group relative overflow-hidden",
                                        scheduleType === item.id
                                            ? "bg-slate-900 border-slate-900 text-white shadow-xl translate-y-[-4px]"
                                            : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                                    )}
                                >
                                    <div className={cn(
                                        "p-2 rounded-xl transition-colors w-fit",
                                        scheduleType === item.id ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                                    )}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <div className="font-black text-sm tracking-tight">{item.label}</div>
                                        <div className={cn(
                                            "text-[10px] font-bold mt-1",
                                            scheduleType === item.id ? "text-slate-400" : "text-slate-400"
                                        )}>{item.sub}</div>
                                    </div>
                                    {scheduleType === item.id && (
                                        <div className="absolute top-[-20px] right-[-20px] w-20 h-20 bg-white/5 rounded-full blur-2xl" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {scheduleType !== 'immediate' && (
                            <div className="mt-6 p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-6 animate-in slide-in-from-top-4 duration-500">
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
                                    <Info className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-widest">{scheduleType === 'cron' ? 'CRON 表达式' : '执行时间'}</span>
                                </div>
                                <input
                                    value={scheduleValue}
                                    onChange={e => setScheduleValue(e.target.value)}
                                    placeholder={scheduleType === 'cron' ? '0 0 * * * (每日凌晨)' : 'YYYY-MM-DD HH:mm:ss'}
                                    className="flex-1 h-12 px-6 bg-white border border-slate-200 rounded-2xl text-sm font-mono font-bold focus:ring-4 focus:ring-primary/5 transition-all outline-none shadow-sm"
                                />
                            </div>
                        )}
                    </section>
                </form>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 text-sm font-black text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !name || selectedDevices.length === 0}
                        className="h-14 px-10 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-2xl shadow-slate-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-3 group"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5 group-hover:scale-110 transition-transform" />}
                        确认保存并下发
                    </button>
                </div>
            </div>
        </div>
    );
}

const Zap = ({ className }: { className: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);
