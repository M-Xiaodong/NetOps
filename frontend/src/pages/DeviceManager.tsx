import React, { useState } from 'react';
import {
    Search,
    Plus,
    Filter,
    MoreHorizontal,
    Server,
    MapPin,
    Clock,
    ShieldCheck,
    AlertTriangle,
    Activity,
    X,
    Router,
    Network,
    Wifi,
    Box,
    Layers
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DeviceIcon } from '../components/business';


import { DeviceType } from '../components/DeviceIcon';


type VendorType = 'Huawei' | 'Cisco' | 'H3C' | 'Ruijie' | 'Hillstone' | 'Sangfor' | 'Other';



interface Device {
    id: number;
    name: string;
    ip: string;
    region: string;
    model: string;
    vendor: VendorType;
    type: DeviceType;
    status: 'online' | 'offline' | 'maintenance';
    lastSeen: string;
}

const devices: Device[] = [
    { id: 1, name: 'BJ_Core_Switch', ip: '10.88.1.1', region: '北京总部', model: 'CE12800', vendor: 'Huawei', type: 'switch', status: 'online', lastSeen: '1分钟前' },
    { id: 2, name: 'BJ_Firewall_01', ip: '10.88.1.254', region: '北京总部', model: 'USG6600', vendor: 'Huawei', type: 'firewall', status: 'online', lastSeen: '2分钟前' },
    { id: 3, name: 'SH_Access_01', ip: '10.86.10.1', region: '上海分公司', model: 'S5700', vendor: 'Huawei', type: 'switch', status: 'offline', lastSeen: '2天前' },
    { id: 4, name: 'GZ_Router_01', ip: '10.85.1.1', region: '广州分公司', model: 'NE40E', vendor: 'Huawei', type: 'router', status: 'online', lastSeen: '5分钟前' },
    { id: 5, name: 'SZ_WLAN_AC', ip: '10.84.1.1', region: '深圳研发中心', model: 'AC6605', vendor: 'Huawei', type: 'wireless_ac', status: 'maintenance', lastSeen: '1小时前' },
    { id: 6, name: 'HK_Edge_FW', ip: '172.16.1.1', region: '香港节点', model: 'StoneShield-A', vendor: 'Hillstone', type: 'firewall', status: 'online', lastSeen: '30秒前' },
    { id: 7, name: 'Internet_Gateway', ip: '202.1.1.1', region: '北京总部', model: 'NGAF-8000', vendor: 'Sangfor', type: 'firewall', status: 'online', lastSeen: '10分钟前' },
    { id: 9, name: 'Wuhan_Switch', ip: '10.70.1.1', region: '武汉办事处', model: 'RG-S5750', vendor: 'Ruijie', type: 'switch', status: 'online', lastSeen: '1分钟前' },
    { id: 11, name: 'US_Backbone', ip: '192.168.100.1', region: '北美节点', model: 'ASR 9000', vendor: 'Cisco', type: 'router', status: 'online', lastSeen: '1分钟前' },
    { id: 12, name: 'Core_Nexus', ip: '192.168.100.2', region: '北美节点', model: 'Nexus 9000', vendor: 'Cisco', type: 'switch', status: 'online', lastSeen: '2分钟前' },
];

const VendorBadge = ({ vendor }: { vendor: VendorType }) => {
    const styles: Record<VendorType, string> = {
        Huawei: "bg-red-50 text-red-700 border-red-100",
        Cisco: "bg-blue-50 text-blue-700 border-blue-100",
        H3C: "bg-orange-50 text-orange-700 border-orange-100",
        Ruijie: "bg-sky-50 text-sky-700 border-sky-100",
        Hillstone: "bg-stone-50 text-stone-700 border-stone-100",
        Sangfor: "bg-green-50 text-green-700 border-green-100",
        Other: "bg-slate-50 text-slate-600 border-slate-200",
    };

    return (
        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1.5 w-fit uppercase tracking-wider", styles[vendor])}>

            <span className="leading-none pt-[1px]">{vendor}</span>
        </span>
    );
};

const DeviceTypeBadge = ({ type }: { type: DeviceType }) => {
    const styles: Record<DeviceType, string> = {
        router: "bg-blue-50 text-blue-700 border-blue-100",
        switch: "bg-indigo-50 text-indigo-700 border-indigo-100",
        firewall: "bg-rose-50 text-rose-700 border-rose-100",
        wireless_ac: "bg-emerald-50 text-emerald-700 border-emerald-100",
        server: "bg-slate-50 text-slate-700 border-slate-100",
        unknown: "bg-gray-50 text-gray-700 border-gray-100",
    };

    const labels: Record<DeviceType, string> = {
        router: "路由器",
        switch: "交换机",
        firewall: "防火墙",
        wireless_ac: "无线",
        server: "服务器",
        unknown: "未知",
    };

    return (
        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1.5 w-fit", styles[type])}>
            <DeviceIcon type={type} className="w-3 h-3" />
            {labels[type]}
        </span>
    );
};

const StatusBadge = ({ status }: { status: Device['status'] }) => {
    const styles = {
        online: "bg-emerald-100 text-emerald-700 border-emerald-200",
        offline: "bg-red-100 text-red-700 border-red-200",
        maintenance: "bg-orange-100 text-orange-700 border-orange-200",
    };

    const icons = {
        online: <Activity className="h-3 w-3" />,
        offline: <AlertTriangle className="h-3 w-3" />,
        maintenance: <Clock className="h-3 w-3" />,
    };

    const labels = {
        online: "在线",
        offline: "离线",
        maintenance: "维护中",
    };

    return (
        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 w-fit", styles[status])}>
            {icons[status]}
            {labels[status]}
        </span>
    );
};

export default function DeviceManager() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVendor, setSelectedVendor] = useState<VendorType | 'All'>('All');
    const [selectedType, setSelectedType] = useState<DeviceType | 'All'>('All');
    const [selectedRegion, setSelectedRegion] = useState<string | 'All'>('All');
    const [selectedStatus, setSelectedStatus] = useState<Device['status'] | 'All'>('All');
    const [isVendorFilterOpen, setIsVendorFilterOpen] = useState(false);
    const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false);
    const [isRegionFilterOpen, setIsRegionFilterOpen] = useState(false);
    const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

    const filteredDevices = devices.filter(device => {
        const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            device.ip.includes(searchQuery) ||
            device.model.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesVendor = selectedVendor === 'All' || device.vendor === selectedVendor;
        const matchesType = selectedType === 'All' || device.type === selectedType;
        const matchesRegion = selectedRegion === 'All' || device.region === selectedRegion;
        const matchesStatus = selectedStatus === 'All' || device.status === selectedStatus;
        return matchesSearch && matchesVendor && matchesType && matchesRegion && matchesStatus;
    });

    const vendors: VendorType[] = ['Huawei', 'Cisco', 'H3C', 'Ruijie', 'Hillstone', 'Sangfor', 'Other'];
    const types: DeviceType[] = ['router', 'switch', 'firewall', 'wireless_ac', 'server'];
    const regions = Array.from(new Set(devices.map(d => d.region)));
    const statuses: Device['status'][] = ['online', 'offline', 'maintenance'];

    const typeLabels: Record<DeviceType, string> = {
        router: "路由器",
        switch: "交换机",
        firewall: "防火墙",
        wireless_ac: "无线",
        server: "服务器",
        unknown: "未知",
    };

    const statusLabels: Record<Device['status'], string> = {
        online: "在线",
        offline: "离线",
        maintenance: "维护中"
    };

    return (
        <div className="h-full w-full p-2 overflow-hidden">
            <div className="h-full w-full bg-card border border-border/50 rounded-xl shadow-sm flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="h-16 border-b border-border/50 flex items-center px-6 gap-4 bg-white justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-border/50 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all w-72">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="搜索设备..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground"
                            />
                        </div>

                        {/* Vendor Filter */}
                        <div className="relative">
                            <button
                                onClick={() => { setIsVendorFilterOpen(!isVendorFilterOpen); setIsTypeFilterOpen(false); setIsRegionFilterOpen(false); setIsStatusFilterOpen(false); }}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-full transition-all",
                                    selectedVendor !== 'All'
                                        ? "bg-primary/10 border-primary/30 text-primary"
                                        : "bg-white border-border/50 hover:bg-slate-50 hover:shadow-md text-muted-foreground"
                                )}
                            >
                                <Filter className="h-4 w-4" />
                                {selectedVendor === 'All' ? '厂商' : selectedVendor}
                                {selectedVendor !== 'All' && (
                                    <div
                                        onClick={(e) => { e.stopPropagation(); setSelectedVendor('All'); }}
                                        className="ml-1 p-0.5 hover:bg-primary/20 rounded-full"
                                    >
                                        <X className="h-3 w-3" />
                                    </div>
                                )}
                            </button>

                            {isVendorFilterOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsVendorFilterOpen(false)} />
                                    <div className="absolute top-full left-0 mt-2 w-48 max-h-80 overflow-y-auto bg-white rounded-xl shadow-xl border border-border/50 z-20 py-2 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                            选择厂商
                                        </div>
                                        <button
                                            onClick={() => { setSelectedVendor('All'); setIsVendorFilterOpen(false); }}
                                            className={cn(
                                                "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between",
                                                selectedVendor === 'All' && "text-primary font-medium bg-primary/5"
                                            )}
                                        >
                                            全部厂商
                                        </button>
                                        {vendors.map(vendor => (
                                            <button
                                                key={vendor}
                                                onClick={() => { setSelectedVendor(vendor); setIsVendorFilterOpen(false); }}
                                                className={cn(
                                                    "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between",
                                                    selectedVendor === vendor && "text-primary font-medium bg-primary/5"
                                                )}
                                            >
                                                {vendor}
                                                {selectedVendor === vendor && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Type Filter */}
                        <div className="relative">
                            <button
                                onClick={() => { setIsTypeFilterOpen(!isTypeFilterOpen); setIsVendorFilterOpen(false); setIsRegionFilterOpen(false); setIsStatusFilterOpen(false); }}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-full transition-all",
                                    selectedType !== 'All'
                                        ? "bg-primary/10 border-primary/30 text-primary"
                                        : "bg-white border-border/50 hover:bg-slate-50 hover:shadow-md text-muted-foreground"
                                )}
                            >
                                <Box className="h-4 w-4" />
                                {selectedType === 'All' ? '类型' : typeLabels[selectedType]}
                                {selectedType !== 'All' && (
                                    <div
                                        onClick={(e) => { e.stopPropagation(); setSelectedType('All'); }}
                                        className="ml-1 p-0.5 hover:bg-primary/20 rounded-full"
                                    >
                                        <X className="h-3 w-3" />
                                    </div>
                                )}
                            </button>

                            {isTypeFilterOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsTypeFilterOpen(false)} />
                                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-border/50 z-20 py-2 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                            选择类型
                                        </div>
                                        <button
                                            onClick={() => { setSelectedType('All'); setIsTypeFilterOpen(false); }}
                                            className={cn(
                                                "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between",
                                                selectedType === 'All' && "text-primary font-medium bg-primary/5"
                                            )}
                                        >
                                            全部类型
                                        </button>
                                        {types.map(type => (
                                            <button
                                                key={type}
                                                onClick={() => { setSelectedType(type); setIsTypeFilterOpen(false); }}
                                                className={cn(
                                                    "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between",
                                                    selectedType === type && "text-primary font-medium bg-primary/5"
                                                )}
                                            >
                                                {typeLabels[type]}
                                                {selectedType === type && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Region Filter */}
                        <div className="relative">
                            <button
                                onClick={() => { setIsRegionFilterOpen(!isRegionFilterOpen); setIsVendorFilterOpen(false); setIsTypeFilterOpen(false); setIsStatusFilterOpen(false); }}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-full transition-all",
                                    selectedRegion !== 'All'
                                        ? "bg-primary/10 border-primary/30 text-primary"
                                        : "bg-white border-border/50 hover:bg-slate-50 hover:shadow-md text-muted-foreground"
                                )}
                            >
                                <MapPin className="h-4 w-4" />
                                {selectedRegion === 'All' ? '地区' : selectedRegion}
                                {selectedRegion !== 'All' && (
                                    <div
                                        onClick={(e) => { e.stopPropagation(); setSelectedRegion('All'); }}
                                        className="ml-1 p-0.5 hover:bg-primary/20 rounded-full"
                                    >
                                        <X className="h-3 w-3" />
                                    </div>
                                )}
                            </button>

                            {isRegionFilterOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsRegionFilterOpen(false)} />
                                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-border/50 z-20 py-2 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                            选择地区
                                        </div>
                                        <button
                                            onClick={() => { setSelectedRegion('All'); setIsRegionFilterOpen(false); }}
                                            className={cn(
                                                "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between",
                                                selectedRegion === 'All' && "text-primary font-medium bg-primary/5"
                                            )}
                                        >
                                            全部地区
                                        </button>
                                        {regions.map(region => (
                                            <button
                                                key={region}
                                                onClick={() => { setSelectedRegion(region); setIsRegionFilterOpen(false); }}
                                                className={cn(
                                                    "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between",
                                                    selectedRegion === region && "text-primary font-medium bg-primary/5"
                                                )}
                                            >
                                                {region}
                                                {selectedRegion === region && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Status Filter */}
                        <div className="relative">
                            <button
                                onClick={() => { setIsStatusFilterOpen(!isStatusFilterOpen); setIsVendorFilterOpen(false); setIsTypeFilterOpen(false); setIsRegionFilterOpen(false); }}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-full transition-all",
                                    selectedStatus !== 'All'
                                        ? "bg-primary/10 border-primary/30 text-primary"
                                        : "bg-white border-border/50 hover:bg-slate-50 hover:shadow-md text-muted-foreground"
                                )}
                            >
                                <Activity className="h-4 w-4" />
                                {selectedStatus === 'All' ? '状态' : statusLabels[selectedStatus]}
                                {selectedStatus !== 'All' && (
                                    <div
                                        onClick={(e) => { e.stopPropagation(); setSelectedStatus('All'); }}
                                        className="ml-1 p-0.5 hover:bg-primary/20 rounded-full"
                                    >
                                        <X className="h-3 w-3" />
                                    </div>
                                )}
                            </button>

                            {isStatusFilterOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsStatusFilterOpen(false)} />
                                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-border/50 z-20 py-2 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                            选择状态
                                        </div>
                                        <button
                                            onClick={() => { setSelectedStatus('All'); setIsStatusFilterOpen(false); }}
                                            className={cn(
                                                "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between",
                                                selectedStatus === 'All' && "text-primary font-medium bg-primary/5"
                                            )}
                                        >
                                            全部状态
                                        </button>
                                        {statuses.map(status => (
                                            <button
                                                key={status}
                                                onClick={() => { setSelectedStatus(status); setIsStatusFilterOpen(false); }}
                                                className={cn(
                                                    "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between",
                                                    selectedStatus === status && "text-primary font-medium bg-primary/5"
                                                )}
                                            >
                                                {statusLabels[status]}
                                                {selectedStatus === status && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <button className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all">
                        <Plus className="h-4 w-4" />
                        添加设备
                    </button>
                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="bg-white border border-border/50 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-muted-foreground font-semibold border-b border-border/50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-4 w-12">
                                        <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" />
                                    </th>
                                    <th className="px-6 py-4">设备名称</th>
                                    <th className="px-6 py-4">管理 IP</th>
                                    <th className="px-6 py-4">地区</th>
                                    <th className="px-6 py-4">类型</th>
                                    <th className="px-6 py-4">厂商</th>
                                    <th className="px-6 py-4">型号</th>
                                    <th className="px-6 py-4">状态</th>
                                    <th className="px-6 py-4">最后在线</th>
                                    <th className="px-6 py-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filteredDevices.map((device) => (
                                    <tr key={device.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center">
                                                    <DeviceIcon type={device.type} variant="card" className="w-8 h-8" />
                                                </div>
                                                <span className="font-bold text-foreground">{device.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-600">
                                            {device.ip}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {device.region}
                                        </td>
                                        <td className="px-6 py-4">
                                            <DeviceTypeBadge type={device.type} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <VendorBadge vendor={device.vendor} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-slate-700">
                                                {device.model}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={device.status} />
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" />
                                            {device.lastSeen}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-muted-foreground hover:text-foreground">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
