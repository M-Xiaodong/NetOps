import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Search, Filter, RefreshCw, ChevronDown,
    Play, Zap, Database, Terminal, ShieldAlert, History,
    CheckCircle2, Server, Router, Shield, Network, Loader2,
    Box, MapPin, Trash2, Edit2, UploadCloud, Radio, Wifi, Lock, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DeviceModal from '@/components/DeviceModal';
import api from '@/services/api';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// ----------------------------------------------------------------------
// 类型定义 & Mock (兼容 API)
// ----------------------------------------------------------------------

type VendorType = 'Huawei' | 'Cisco' | 'H3C' | 'Ruijie' | 'Hillstone' | 'Sangfor' | 'Other';
// 简单映射模型供 UI 使用，实际字段可能更多
interface Device {
    id: number;
    name: string;
    ip: string;
    hostname?: string;
    platform: string;
    vendor: VendorType;
    status: 'online' | 'offline' | 'unreachable' | 'unknown';
    region?: string;
    model?: string;
    device_type?: string;
    last_seen?: string;
    username?: string;
    password?: string;
    secret?: string;
    port?: number;
    connection_type?: string;
    group_name?: string;
    location?: string;
    description?: string;
}

// ----------------------------------------------------------------------
// 组件: 图标与徽章 (复用)
// ----------------------------------------------------------------------

const vendorMap: Record<string, string> = {
    'Huawei': '华为',
    'Cisco': '思科',
    'H3C': '新华三',
    'Ruijie': '锐捷',
    'Hillstone': '山石网科',
    'Sangfor': '深信服',
    'Other': '其他'
};

const VendorBadge = ({ vendor }: { vendor: string }) => {
    const v = vendor || 'Other';
    const displayName = vendorMap[v] || v;
    const styles: Record<string, string> = {
        'Huawei': "bg-rose-500/10 text-rose-600 border-rose-200/50",
        'Cisco': "bg-indigo-500/10 text-indigo-600 border-indigo-200/50",
        'H3C': "bg-amber-500/10 text-amber-600 border-amber-200/50",
        'Ruijie': "bg-sky-500/10 text-sky-600 border-sky-200/50",
        'Hillstone': "bg-stone-500/10 text-stone-600 border-stone-200/50",
        'Sangfor': "bg-emerald-500/10 text-emerald-600 border-emerald-200/50",
        'Other': "bg-slate-500/10 text-slate-600 border-slate-200/50",
    };

    return (
        <span className={cn("px-3 py-0.5 rounded-full text-[11px] font-bold border flex items-center justify-center w-fit whitespace-nowrap shadow-sm", styles[v] || styles['Other'])}>
            {displayName}
        </span>
    );
};

// 修正：这是操作系统/平台 Badge，不是设备类型
const OSBadge = ({ platform }: { platform: string }) => {
    const t = platform?.toLowerCase() || 'unknown';
    let style = "bg-slate-50 text-slate-600 border-slate-200/60";
    let label = "未知系统";
    let Icon = Box;

    if (t.includes('huawei') || t.includes('vrp')) { style = "bg-rose-50 text-rose-600 border-rose-100"; label = "VRP (华为)"; }
    else if (t.includes('cisco') || t.includes('ios')) { style = "bg-indigo-50 text-indigo-600 border-indigo-100"; label = "IOS (思科)"; }
    else if (t.includes('h3c') || t.includes('comware')) { style = "bg-orange-50 text-orange-600 border-orange-100"; label = "Comware (H3C)"; }
    else if (t.includes('hp')) { style = "bg-sky-50 text-sky-600 border-sky-100"; label = "ProCurve (HP)"; }

    return (
        <span className={cn("px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 w-fit whitespace-nowrap shadow-sm", style)}>
            <Icon className="w-3.5 h-3.5" />
            {label}
        </span>
    );
};

// 真正补回：设备类型 Badge (如：核心交换机、防火墙)
const DeviceTypeBadge = ({ type }: { type: string }) => {
    const t = type || '未知类型';
    let style = "bg-slate-100 text-slate-600 border-slate-200";

    // 使用淡色调风格
    if (t.includes('核心')) style = "bg-indigo-50 text-indigo-700 border-indigo-100";
    else if (t.includes('汇聚')) style = "bg-blue-50 text-blue-700 border-blue-100";
    else if (t.includes('接入')) style = "bg-teal-50 text-teal-700 border-teal-100";
    else if (t.includes('防火墙')) style = "bg-rose-50 text-rose-700 border-rose-100";
    else if (t.includes('路由器')) style = "bg-amber-50 text-amber-700 border-amber-100";
    else if (t.includes('无线')) style = "bg-purple-50 text-purple-700 border-purple-100";
    else if (t.includes('安全')) style = "bg-cyan-50 text-cyan-700 border-cyan-100";
    else if (t.includes('服务器')) style = "bg-emerald-50 text-emerald-700 border-emerald-100";

    return (
        <span className={cn("px-2.5 py-0.5 rounded-md text-[12px] font-black border shadow-sm transition-transform active:scale-95", style)}>
            {t}
        </span>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const s = status?.toLowerCase() || 'unknown';
    let dotColor = "bg-slate-400";
    let style = "bg-white text-slate-600 border-slate-200";
    let label = "未知状态";

    if (s === 'online') { dotColor = "bg-emerald-500"; style = "bg-white text-emerald-700 border-emerald-200/60"; label = "在线运行"; }
    else if (s === 'offline') { dotColor = "bg-rose-500"; style = "bg-white text-rose-700 border-rose-200/60"; label = "已离线"; }
    else if (s === 'maintenance') { dotColor = "bg-amber-500"; style = "bg-white text-amber-700 border-amber-200/60"; label = "维护模式"; }
    else { dotColor = "bg-slate-300"; style = "bg-slate-50 text-slate-500 border-slate-200/60"; label = "未知状态"; }

    return (
        <span className={cn("px-3 py-1.5 rounded-full text-[11px] font-black border flex items-center gap-2 w-fit shadow-sm transition-all animate-in fade-in duration-500", style)}>
            <span className={cn("relative flex h-2 w-2")}>
                {s === 'online' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50"></span>}
                <span className={cn("relative inline-flex rounded-full h-2 w-2", dotColor)}></span>
            </span>
            {label}
        </span>
    );
};

// ----------------------------------------------------------------------
// 组件: 根据类型获取图标
// ----------------------------------------------------------------------
const getDeviceIcon = (type: string) => {
    const t = type || '';
    if (t.includes('交换机')) return Network;
    if (t.includes('路由器')) return Router;
    if (t.includes('防火墙')) return Shield;
    if (t.includes('无线AC')) return Radio;
    if (t.includes('无线AP')) return Wifi;
    if (t.includes('安全')) return Lock;
    return Server; // 服务器及其他默认使用 Server
};

// ----------------------------------------------------------------------
// 主页面组件
// ----------------------------------------------------------------------

export default function DevicesPage() {
    const navigate = useNavigate();
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // UI Filters States
    const [selectedVendor, setSelectedVendor] = useState<string>('All');
    const [selectedType, setSelectedType] = useState<string>('All');
    const [selectedRegion, setSelectedRegion] = useState<string>('All');
    const [selectedStatus, setSelectedStatus] = useState<string>('All');

    // Search and Sort Enhancement
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: '', direction: null });

    // Dropdown visibility
    const [activeFilter, setActiveFilter] = useState<string | null>(null);

    // Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [quickTaskLoading, setQuickTaskLoading] = useState<{
        status: 'idle' | 'loading' | 'success' | 'error';
        message?: string;
        targetPath?: string;
    }>({ status: 'idle' });
    const [activeRowMenu, setActiveRowMenu] = useState<number | null>(null);
    const [batchMenuOpen, setBatchMenuOpen] = useState(false);

    // Batch Operaion State
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Fetch Data
    const fetchDevices = async () => {
        setLoading(true);
        try {
            const res = await api.get('/devices/');
            setDevices(res.data);
        } catch (err) {
            console.error("Fetch devices error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickTask = async (ids: number[], type: string) => {
        setQuickTaskLoading({ status: 'loading' });
        try {
            const res = await api.post('/automation/quick-task', {
                task_type: type,
                device_ids: ids
            });
            setQuickTaskLoading({
                status: 'success',
                message: res.data.message || '任务已成功分发',
                targetPath: `/automation?jobId=${res.data.job_id}`
            });
            // 2.5秒后自动跳转
            setTimeout(() => {
                navigate(`/automation?jobId=${res.data.job_id}`);
            }, 2500);
        } catch (err: any) {
            console.error(err);
            setQuickTaskLoading({
                status: 'error',
                message: err.response?.data?.detail || "快速任务启动失败"
            });
        } finally {
            setActiveRowMenu(null);
            setBatchMenuOpen(false);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);


    const handleDelete = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: '删除设备',
            message: '确定要删除此设备吗？此操作无法撤销，相关监控数据也将同步清理。',
            onConfirm: async () => {
                try {
                    await api.delete(`/devices/${id}`);
                    setDevices(prev => prev.filter(d => d.id !== id));
                    setSelectedIds(prev => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                    });
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (err: any) {
                    console.error(err);
                    const detail = err.response?.data?.detail || "删除请求失败";
                    alert(detail);
                }
            },
            type: 'danger'
        });
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;

        setConfirmModal({
            isOpen: true,
            title: '批量删除',
            message: `确定要批量删除选中的 ${selectedIds.size} 台设备吗？这些设备的所有配置信息都将丢失。`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    const ids = Array.from(selectedIds);
                    await Promise.all(ids.map(id => api.delete(`/devices/${id}`)));
                    fetchDevices();
                    setSelectedIds(new Set());
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (err: any) {
                    console.error(err);
                    const detail = err.response?.data?.detail || "批量删除过程中发生错误";
                    alert(detail);
                } finally {
                    setLoading(false);
                }
            },
            type: 'danger'
        });
    };

    // Selection Logic
    const toggleSelection = (id: number) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const toggleSelectAll = (filtered: Device[]) => {
        if (selectedIds.size === filtered.length && filtered.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(d => d.id)));
        }
    };

    // IP to numeric array for sorting
    const ipToNumbers = (ip: string) => ip.split('.').map(num => parseInt(num) || 0);

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Filtering Logic
    const filteredDevices = devices.filter(device => {
        // Global Search (supports multi-dimensional matching)
        const q = searchQuery.toLowerCase();
        const vendorCHN = vendorMap[device.vendor] || '';
        const matchesGlobal = !searchQuery ||
            device.name.toLowerCase().includes(q) ||
            device.ip.includes(q) ||
            (device.model || '').toLowerCase().includes(q) ||
            (device.device_type || '').toLowerCase().includes(q) ||
            (device.region || '').toLowerCase().includes(q) ||
            (device.platform || '').toLowerCase().includes(q) ||
            (device.vendor || '').toLowerCase().includes(q) ||
            vendorCHN.toLowerCase().includes(q);

        const matchesVendor = selectedVendor === 'All' || device.vendor === selectedVendor;
        const matchesType = selectedType === 'All' || device.platform?.includes(selectedType);
        const matchesRegion = selectedRegion === 'All' || device.region === selectedRegion;
        const matchesStatus = selectedStatus === 'All' || device.status === selectedStatus;

        return matchesGlobal && matchesVendor && matchesType && matchesRegion && matchesStatus;
    });

    // Sorting Logic
    const sortedDevices = [...filteredDevices].sort((a, b) => {
        if (!sortConfig.key || !sortConfig.direction) return 0;

        const key = sortConfig.key as keyof Device;
        let valA = a[key] ?? '';
        let valB = b[key] ?? '';

        // IP numeric sorting
        if (key === 'ip') {
            const numA = ipToNumbers(String(valA));
            const numB = ipToNumbers(String(valB));
            for (let i = 0; i < 4; i++) {
                if (numA[i] !== numB[i]) {
                    return sortConfig.direction === 'asc' ? numA[i] - numB[i] : numB[i] - numA[i];
                }
            }
            return 0;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Dynamic Options
    const vendors = Array.from(new Set(devices.map(d => d.vendor).filter(Boolean)));
    const regions = Array.from(new Set(devices.map(d => d.region).filter(Boolean)));

    // ----------------------------------------------------------------------
    // Excel-style Header Filter Component
    // ----------------------------------------------------------------------
    const HeaderFilter = ({ label, value, options, type, icon: Icon = Filter }: any) => {
        const isActive = value !== 'All';

        return (
            <div className="relative flex items-center gap-1.5 group cursor-pointer" onClick={(e) => {
                e.stopPropagation();
                setActiveFilter(activeFilter === type ? null : type);
            }}>
                <span className={cn("text-sm font-black uppercase tracking-tight transition-colors",
                    isActive ? "text-primary" : "text-slate-600 group-hover:text-primary")}>
                    {label}
                </span>
                <div className={cn("p-1 rounded-md transition-all", isActive ? "bg-primary/10 text-primary" : "text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-900")}>
                    <Icon className="h-3.5 w-3.5" />
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}

                {activeFilter === type && (
                    <>
                        <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setActiveFilter(null); }} />
                        <div className="absolute top-full left-0 mt-2 w-48 max-h-60 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    switch (type) {
                                        case 'vendor': setSelectedVendor('All'); break;
                                        case 'type': setSelectedType('All'); break;
                                        case 'region': setSelectedRegion('All'); break;
                                        case 'status': setSelectedStatus('All'); break;
                                    }
                                    setActiveFilter(null);
                                }}
                                className={cn(
                                    "w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-between",
                                    value === 'All' ? "text-primary bg-primary/5" : "text-slate-900"
                                )}
                            >
                                全部
                                {value === 'All' && <CheckCircle2 className="h-3 w-3" />}
                            </div>
                            {options.map((opt: string) => (
                                <div
                                    key={opt}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        switch (type) {
                                            case 'vendor': setSelectedVendor(opt); break;
                                            case 'type': setSelectedType(opt); break;
                                            case 'region': setSelectedRegion(opt); break;
                                            case 'status': setSelectedStatus(opt); break;
                                        }
                                        setActiveFilter(null);
                                    }}
                                    className={cn(
                                        "w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer",
                                        value === opt ? "text-primary bg-primary/5" : "text-slate-900"
                                    )}
                                >
                                    {opt}
                                    {value === opt && <CheckCircle2 className="h-3 w-3" />}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    };

    // Import Mock Handler
    const handleImportClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.xlsx';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) return;
            // TODO: Implement real Parsing
            alert(`已选择文件: ${file.name}。导入功能后端接口尚未就绪，此为演示入口。`);
        };
        input.click();
    };

    return (
        <div className="h-full w-full p-2 bg-slate-50/50 relative">
            {quickTaskLoading.status !== 'idle' && (
                <div className="absolute inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-500">
                    <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-white/20 flex flex-col items-center gap-6 max-w-sm w-full relative overflow-hidden group">
                        {/* 背景装饰光感 */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
                        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />

                        {/* 动态图标区域 */}
                        <div className="relative">
                            {quickTaskLoading.status === 'loading' && (
                                <div className="p-6 bg-primary/10 text-primary rounded-3xl animate-pulse">
                                    <Zap className="h-10 w-10 fill-current animate-bounce" />
                                </div>
                            )}
                            {quickTaskLoading.status === 'success' && (
                                <div className="p-6 bg-emerald-50 text-emerald-500 rounded-3xl animate-in zoom-in duration-500">
                                    <CheckCircle2 className="h-10 w-10" />
                                </div>
                            )}
                            {quickTaskLoading.status === 'error' && (
                                <div className="p-6 bg-rose-50 text-rose-500 rounded-3xl animate-in zoom-in duration-500">
                                    <X className="h-10 w-10" />
                                </div>
                            )}
                            {quickTaskLoading.status === 'loading' && (
                                <Loader2 className="absolute -bottom-2 -right-2 h-8 w-8 text-primary animate-spin bg-white rounded-full p-1 shadow-md" />
                            )}
                        </div>

                        {/* 文案区域 */}
                        <div className="flex flex-col items-center text-center gap-2">
                            <h3 className="text-xl font-black text-slate-900">
                                {quickTaskLoading.status === 'loading' && "正在建立通信..."}
                                {quickTaskLoading.status === 'success' && "任务分发成功"}
                                {quickTaskLoading.status === 'error' && "下发遇到问题"}
                            </h3>
                            <p className="text-sm font-bold text-slate-400 leading-relaxed px-4">
                                {quickTaskLoading.status === 'loading' && "请稍候，系统正在通过底层引擎向目标设备下发指令"}
                                {(quickTaskLoading.status === 'success' || quickTaskLoading.status === 'error') && quickTaskLoading.message}
                            </p>
                        </div>

                        {/* 操作区域 */}
                        <div className="flex flex-col w-full gap-3 mt-2">
                            {quickTaskLoading.status === 'success' && (
                                <button
                                    onClick={() => navigate(quickTaskLoading.targetPath!)}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 animate-in slide-in-from-bottom-4"
                                >
                                    立即查看执行进度
                                    <Play className="h-3.5 w-3.5 fill-current" />
                                </button>
                            )}
                            {quickTaskLoading.status === 'error' && (
                                <button
                                    onClick={() => setQuickTaskLoading({ status: 'idle' })}
                                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
                                >
                                    返回列表并重试
                                </button>
                            )}
                            {quickTaskLoading.status === 'success' && (
                                <span className="text-[10px] font-bold text-slate-300 animate-pulse">
                                    系统将在几秒后为您自动跳转...
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <div className="h-full w-full bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
                {/* 1. Header & Toolbar */}
                <div className="h-20 border-b border-slate-100 flex items-center px-6 gap-4 bg-white/80 backdrop-blur-md justify-between shrink-0 z-30 relative">
                    <div className="flex items-center gap-4">
                        {/* Search */}
                        <div className="flex items-center gap-2 bg-slate-50/50 px-5 py-2.5 rounded-full border border-slate-200/60 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 transition-all w-80 shadow-inner">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="全局搜索资产..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400 font-medium text-slate-800"
                            />
                        </div>

                        <span className="text-sm font-semibold text-slate-500">
                            共 <span className="text-slate-900">{filteredDevices.length}</span> 台设备
                        </span>
                        <button
                            onClick={fetchDevices}
                            className="p-2.5 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-primary active:scale-95"
                            title="刷新列表"
                        >
                            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Batch Actions */}
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-2 animate-in slide-in-from-left duration-500">
                                <div className="relative">
                                    <DropdownMenu.Root open={batchMenuOpen} onOpenChange={setBatchMenuOpen}>
                                        <DropdownMenu.Trigger asChild>
                                            <button
                                                className="h-9 px-4 bg-primary text-primary-foreground rounded-lg font-black text-xs shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 outline-none"
                                            >
                                                <Zap className="h-3.5 w-3.5 fill-current" />
                                                执行自动化操作
                                                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", batchMenuOpen && "rotate-180")} />
                                            </button>
                                        </DropdownMenu.Trigger>

                                        <DropdownMenu.Portal>
                                            <DropdownMenu.Content
                                                align="end"
                                                sideOffset={8}
                                                className="w-48 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 z-[100] animate-in fade-in zoom-in-95 duration-200 outline-none"
                                            >
                                                <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">选择自动化任务</div>
                                                {[
                                                    { id: 'inspect', label: '批量健康巡检', icon: <History className="h-3.5 w-3.5" /> },
                                                    { id: 'backup', label: '批量配置备份', icon: <Database className="h-3.5 w-3.5" /> },
                                                    { id: 'config', label: '批量下发配置', icon: <Terminal className="h-3.5 w-3.5" /> },
                                                    { id: 'diagnosis', label: '批量网络诊断', icon: <ShieldAlert className="h-3.5 w-3.5" /> }
                                                ].map(task => (
                                                    <DropdownMenu.Item
                                                        key={task.id}
                                                        onSelect={() => handleQuickTask(Array.from(selectedIds), task.id)}
                                                        className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-3 text-slate-700 cursor-pointer outline-none"
                                                    >
                                                        {task.icon}
                                                        {task.label}
                                                    </DropdownMenu.Item>
                                                ))}
                                            </DropdownMenu.Content>
                                        </DropdownMenu.Portal>
                                    </DropdownMenu.Root>
                                </div>

                                <button
                                    onClick={handleBatchDelete}
                                    className="h-9 px-4 bg-rose-50 text-rose-600 rounded-lg font-black text-xs hover:bg-rose-100 transition-all flex items-center gap-2"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    删除已选 ({selectedIds.size})
                                </button>
                            </div>
                        )}

                        <button
                            onClick={handleImportClick}
                            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:text-primary hover:border-primary/30 transition-all shadow-sm active:scale-95"
                        >
                            <UploadCloud className="h-4 w-4" />
                            导入
                        </button>

                        <button
                            onClick={() => { setSelectedDevice(null); setIsAddModalOpen(true); }}
                            className="flex items-center gap-2 px-7 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-full shadow-lg shadow-slate-200 hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <Plus className="h-4 w-4" />
                            添加设备
                        </button>
                    </div>
                </div>

                {/* 2. Data Table */}
                <div className="flex-1 overflow-x-auto bg-slate-50/30 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex items-center justify-center flex-col gap-3">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-sm font-black text-slate-900">正在加载资产列表...</p>
                        </div>
                    ) : (
                        <div className="min-w-[1200px] h-full flex flex-col">
                            <table className="w-full border-separate border-spacing-0 table-fixed">
                                <colgroup>
                                    <col className="w-[4%]" />
                                    <col className="w-[14%]" />
                                    <col className="w-[12%]" />
                                    <col className="w-[10%]" />
                                    <col className="w-[12%]" />
                                    <col className="w-[10%]" />
                                    <col className="w-[10%]" />
                                    <col className="w-[10%]" />
                                    <col className="w-[10%]" />
                                    <col className="w-[8%]" />
                                </colgroup>
                                <thead className="bg-white/95 backdrop-blur-sm sticky top-0 z-30">
                                    <tr>
                                        <th className="px-4 py-4 border-b border-slate-100 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === filteredDevices.length && filteredDevices.length > 0}
                                                onChange={() => toggleSelectAll(filteredDevices)}
                                                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 transition-all cursor-pointer"
                                            />
                                        </th>
                                        <th className="px-4 py-4 border-b border-slate-100 text-left text-sm font-black text-slate-600">设备名称</th>
                                        <th className="px-4 py-4 border-b border-slate-100 text-left text-sm font-black text-slate-600 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('ip')}>
                                            <div className="flex items-center gap-1.5">
                                                管理 IP
                                                {sortConfig.key === 'ip' && <span className="text-primary text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                                            </div>
                                        </th>
                                        <th className="px-4 py-4 border-b border-slate-100 text-left">
                                            <HeaderFilter label="地区" value={selectedRegion} options={regions} type="region" icon={MapPin} />
                                        </th>
                                        <th className="px-4 py-4 border-b border-slate-100 text-left text-sm font-black text-slate-600">操作系统</th>
                                        <th className="px-4 py-4 border-b border-slate-100 text-left">
                                            <HeaderFilter label="厂商" value={selectedVendor} options={vendors.map(v => vendorMap[v] || v)} type="vendor" icon={Server} />
                                        </th>
                                        <th className="px-4 py-4 border-b border-slate-100 text-left text-sm font-black text-slate-600">资产分类</th>
                                        <th className="px-4 py-4 border-b border-slate-100 text-left text-sm font-black text-slate-600 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('model')}>
                                            型号
                                        </th>
                                        <th className="px-4 py-4 border-b border-slate-100 text-left text-sm font-black text-slate-600">状态</th>
                                        <th className="px-4 py-4 border-b border-slate-100 text-right text-sm font-black text-slate-600">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {sortedDevices.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="py-24 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <Box className="h-12 w-12 text-slate-200" />
                                                    <span className="text-sm font-semibold text-slate-400">未发现匹配资产</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : sortedDevices.map((device) => (
                                        <tr key={device.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(device.id)}
                                                    onChange={() => toggleSelection(device.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 transition-all cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/20 transition-all">
                                                        {(() => {
                                                            const Icon = getDeviceIcon(device.device_type || '');
                                                            return <Icon className="h-4.5 w-4.5" />;
                                                        })()}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[14px] font-black text-slate-900 truncate">{device.name}</span>
                                                        {device.hostname && (
                                                            <span className="text-[10px] text-slate-500 font-bold tracking-wider">HOST: {device.hostname}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="font-mono text-[16px] text-slate-950 font-black tracking-tight border-b-2 border-indigo-200/60 pb-0.5">
                                                    {device.ip}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-slate-900 font-black text-[12px] truncate">{device.region || '-'}</span>
                                                    {device.location && <span className="text-[11px] text-slate-500 font-bold truncate">{device.location}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4"><OSBadge platform={device.platform} /></td>
                                            <td className="px-4 py-4"><VendorBadge vendor={device.vendor} /></td>
                                            <td className="px-4 py-4"><DeviceTypeBadge type={device.device_type || 'Generic'} /></td>
                                            <td className="px-4 py-4 text-[13px] font-black text-slate-900 truncate">{device.model || '-'}</td>
                                            <td className="px-4 py-4"><StatusBadge status={device.status} /></td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex items-center gap-1">
                                                    <div className="relative mr-2">
                                                        <DropdownMenu.Root open={activeRowMenu === device.id} onOpenChange={(open) => setActiveRowMenu(open ? device.id : null)}>
                                                            <DropdownMenu.Trigger asChild>
                                                                <button
                                                                    className={cn(
                                                                        "p-2 rounded-lg transition-all outline-none",
                                                                        activeRowMenu === device.id ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" : "bg-slate-50 text-slate-400 hover:text-primary hover:bg-slate-100"
                                                                    )}
                                                                    title="快速自动化"
                                                                >
                                                                    <Play className={cn("h-4 w-4", activeRowMenu === device.id ? "fill-current" : "")} />
                                                                </button>
                                                            </DropdownMenu.Trigger>

                                                            <DropdownMenu.Portal>
                                                                <DropdownMenu.Content
                                                                    align="end"
                                                                    sideOffset={8}
                                                                    className="w-40 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-[110] animate-in fade-in zoom-in-95 duration-200 outline-none"
                                                                >
                                                                    <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 mb-1">极速操作</div>
                                                                    {[
                                                                        { id: 'inspect', label: '立即巡检', icon: <History className="h-3.5 w-3.5" /> },
                                                                        { id: 'backup', label: '备份配置', icon: <Database className="h-3.5 w-3.5" /> },
                                                                        { id: 'diagnosis', label: '网络诊断', icon: <ShieldAlert className="h-3.5 w-3.5" /> }
                                                                    ].map(task => (
                                                                        <DropdownMenu.Item
                                                                            key={task.id}
                                                                            onSelect={() => handleQuickTask([device.id], task.id)}
                                                                            className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-primary hover:text-white transition-colors flex items-center gap-3 text-slate-700 cursor-pointer outline-none"
                                                                        >
                                                                            {task.icon}
                                                                            {task.label}
                                                                        </DropdownMenu.Item>
                                                                    ))}
                                                                </DropdownMenu.Content>
                                                            </DropdownMenu.Portal>
                                                        </DropdownMenu.Root>
                                                    </div>

                                                    <button
                                                        onClick={() => { setSelectedDevice(device); setIsAddModalOpen(true); }}
                                                        className="p-2 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg transition-all"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(device.id)}
                                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <DeviceModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchDevices}
                device={selectedDevice}
            />
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};
