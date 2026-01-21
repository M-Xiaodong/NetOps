import React, { useState, useEffect } from 'react';
import { X, Shield, Key, Terminal, Server, CheckCircle2, AlertCircle, Loader2, MapPin } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import api from '@/services/api';

interface DeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    device?: any; // 如果是编辑模式则传入
}

export default function DeviceModal({ isOpen, onClose, onSuccess, device }: DeviceModalProps) {
    const [loading, setLoading] = useState(false);
    const [testStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        ip: '',
        platform: 'huawei_vrp',
        vendor: 'Huawei',
        username: '',
        password: '',
        secret: '',
        port: 22,
        connection_type: 'ssh',
        group_name: 'default',
        location: '',
        region: '',
        description: '',
        model: '',
        device_type: ''
    });
    const [isCustomVendor, setIsCustomVendor] = useState(false);
    const [customVendorName, setCustomVendorName] = useState('');
    const [isCustomPlatform, setIsCustomPlatform] = useState(false);
    const [customPlatformName, setCustomPlatformName] = useState('');
    const [isCustomDeviceType, setIsCustomDeviceType] = useState(false);
    const [customDeviceTypeName, setCustomDeviceTypeName] = useState('');

    useEffect(() => {
        if (device) {
            setFormData({
                name: device.name || '',
                ip: device.ip || '',
                platform: device.platform || 'huawei_vrp',
                vendor: device.vendor || 'Huawei',
                username: device.username || '',
                password: device.password || '',
                secret: device.secret || '',
                port: device.port || 22,
                connection_type: device.connection_type || 'ssh',
                group_name: device.group_name || 'default',
                location: device.location || '',
                region: device.region || '',
                description: device.description || '',
                model: device.model || '',
                device_type: device.device_type || ''
            });
            // 检查字段是否在预设列表中，不在则开启手动模式
            const presetVendors = ['Huawei', 'Cisco', 'H3C', 'Ruijie', 'Hillstone', 'Sangfor'];
            if (device.vendor && !presetVendors.includes(device.vendor)) {
                setIsCustomVendor(true);
                setCustomVendorName(device.vendor);
            } else {
                setIsCustomVendor(false);
                setCustomVendorName('');
            }

            const presetPlatforms = ['huawei_vrp', 'cisco_ios', 'hp_comware', 'linux'];
            if (device.platform && !presetPlatforms.includes(device.platform)) {
                setIsCustomPlatform(true);
                setCustomPlatformName(device.platform);
            } else {
                setIsCustomPlatform(false);
                setCustomPlatformName('');
            }

            const presetDeviceTypes = ['交换机', '路由器', '防火墙', '无线AC', '无线AP', '安全设备', '服务器'];
            if (device.device_type && !presetDeviceTypes.includes(device.device_type)) {
                setIsCustomDeviceType(true);
                setCustomDeviceTypeName(device.device_type);
            } else {
                setIsCustomDeviceType(false);
                setCustomDeviceTypeName('');
            }
        } else {
            // 重置表单如果不是编辑模式
            setFormData({
                name: '',
                ip: '',
                platform: 'huawei_vrp',
                vendor: 'Huawei',
                username: '',
                password: '',
                secret: '',
                port: 22,
                connection_type: 'ssh',
                group_name: 'default',
                location: '',
                region: '',
                description: '',
                model: '',
                device_type: ''
            });
            setIsCustomVendor(false);
            setIsCustomPlatform(false);
            setIsCustomDeviceType(false);
        }
    }, [device, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        setErrorMsg(null);

        // IP 格式正则校验
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(formData.ip)) {
            setErrorMsg("请输入合法的 IPv4 地址 (例如: 192.168.1.1)");
            setLoading(false);
            return;
        }

        try {
            const submitData = {
                ...formData,
                vendor: isCustomVendor ? customVendorName : formData.vendor,
                platform: isCustomPlatform ? customPlatformName : formData.platform,
                device_type: isCustomDeviceType ? customDeviceTypeName : formData.device_type
            };

            const url = device ? `/api/devices/${device.id}` : '/api/devices/';
            if (device) {
                await api.patch(url, submitData);
            } else {
                await api.post(url, submitData);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Save device failed:", err);
            const detail = err.response?.data?.detail || "无法保存资产信息，请检查网络或后端服务。";
            setErrorMsg(typeof detail === 'string' ? detail : JSON.stringify(detail));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border border-slate-200/60 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-slate-50/50 border-b border-slate-100/80 px-8 py-5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-primary/10 text-primary rounded-2xl shadow-sm ring-1 ring-primary/5">
                            <Server className="h-5.5 w-5.5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                {device ? '编辑设备信息' : '添加设备'}
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Device Asset Management</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200/50 rounded-full transition-all active:scale-90 group">
                        <X className="h-5 w-5 text-slate-400 group-hover:text-slate-600" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-4">
                        {errorMsg && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                                <span className="text-xs font-bold text-red-700">{errorMsg}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* 1. Basic Info */}
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    <h3 className="text-xs font-black text-slate-900 tracking-wide">基础配置信息</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black text-slate-600 ml-1">设备显示名称 <span className="text-rose-500">*</span></label>
                                        <input
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="例如: CORE-SWITCH-01"
                                            className="w-full h-10 bg-slate-50/50 border border-slate-200 rounded-xl px-4 text-sm font-black text-slate-900 focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all outline-none placeholder:text-slate-400 shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black text-slate-600 ml-1">管理 IP 地址 <span className="text-rose-500">*</span></label>
                                        <input
                                            required
                                            value={formData.ip}
                                            onChange={e => setFormData({ ...formData, ip: e.target.value })}
                                            placeholder="0.0.0.0"
                                            className="w-full h-10 bg-slate-50/50 border border-slate-200 rounded-xl px-4 text-sm font-black text-slate-900 focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all outline-none font-mono tracking-wide placeholder:text-slate-400 shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 ml-1">设备品牌 (Vendor)</label>
                                        {!isCustomVendor ? (
                                            <CustomSelect
                                                value={formData.vendor}
                                                onChange={val => {
                                                    if (val === 'Other') {
                                                        setIsCustomVendor(true);
                                                    } else {
                                                        setFormData({ ...formData, vendor: val });
                                                    }
                                                }}
                                                options={[
                                                    { label: '华为 (Huawei)', value: 'Huawei' },
                                                    { label: '思科 (Cisco)', value: 'Cisco' },
                                                    { label: '新华三 (H3C)', value: 'H3C' },
                                                    { label: '锐捷 (Ruijie)', value: 'Ruijie' },
                                                    { label: '山石网科 (Hillstone)', value: 'Hillstone' },
                                                    { label: '深信服 (Sangfor)', value: 'Sangfor' },
                                                    { label: '其 他 (手动输入)', value: 'Other' }
                                                ]}
                                            />
                                        ) : (
                                            <div className="relative group">
                                                <input
                                                    autoFocus
                                                    value={customVendorName}
                                                    onChange={e => setCustomVendorName(e.target.value)}
                                                    placeholder="输入品牌名称"
                                                    className="w-full h-10 bg-slate-50/50 border border-primary/40 rounded-xl px-4 text-sm font-bold text-slate-900 outline-none ring-4 ring-primary/5 active:scale-[0.99] transition-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCustomVendor(false)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-primary font-bold hover:underline bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100"
                                                >
                                                    返回选择
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 ml-1">网络操作系统 (Network OS)</label>
                                        {!isCustomPlatform ? (
                                            <CustomSelect
                                                value={formData.platform}
                                                onChange={val => {
                                                    if (val === 'Other') {
                                                        setIsCustomPlatform(true);
                                                    } else {
                                                        setFormData({ ...formData, platform: val });
                                                    }
                                                }}
                                                searchable
                                                options={[
                                                    { label: 'Huawei VRP (华为系统)', value: 'huawei_vrp' },
                                                    { label: 'Cisco IOS/IOS-XE (思科系统)', value: 'cisco_ios' },
                                                    { label: 'H3C Comware 7 (华三系统)', value: 'hp_comware' },
                                                    { label: 'Linux General (Linux服务器)', value: 'linux' },
                                                    { label: '其 他 (手动输入)', value: 'Other' }
                                                ]}
                                                placeholder="选择操作系统型号"
                                            />
                                        ) : (
                                            <div className="relative group">
                                                <input
                                                    autoFocus
                                                    value={customPlatformName}
                                                    onChange={e => setCustomPlatformName(e.target.value)}
                                                    placeholder="输入系统名称 (如: Junos)"
                                                    className="w-full h-10 bg-slate-50/50 border border-primary/40 rounded-xl px-4 text-sm font-bold text-slate-900 outline-none ring-4 ring-primary/5 active:scale-[0.99] transition-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCustomPlatform(false)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-primary font-bold hover:underline bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100"
                                                >
                                                    返回选择
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-black text-slate-600 ml-1">硬件具体型号</label>
                                        <input
                                            value={formData.model}
                                            onChange={e => setFormData({ ...formData, model: e.target.value })}
                                            placeholder="例如: USG6000V"
                                            className="w-full h-10 bg-white border border-slate-200 rounded-xl px-4 text-sm font-black text-slate-900 focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all outline-none placeholder:text-slate-400 shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 ml-1">资产分类</label>
                                        {!isCustomDeviceType ? (
                                            <CustomSelect
                                                value={formData.device_type}
                                                onChange={val => {
                                                    if (val === 'Other') {
                                                        setIsCustomDeviceType(true);
                                                    } else {
                                                        setFormData({ ...formData, device_type: val });
                                                    }
                                                }}
                                                options={[
                                                    { label: '交换机', value: '交换机' },
                                                    { label: '路由器', value: '路由器' },
                                                    { label: '防火墙', value: '防火墙' },
                                                    { label: '无线AC', value: '无线AC' },
                                                    { label: '无线AP', value: '无线AP' },
                                                    { label: '安全设备', value: '安全设备' },
                                                    { label: '服务器', value: '服务器' },
                                                    { label: '其 他 (手动输入)', value: 'Other' }
                                                ]}
                                                placeholder="选择设备分类"
                                            />
                                        ) : (
                                            <div className="relative group">
                                                <input
                                                    autoFocus
                                                    value={customDeviceTypeName}
                                                    onChange={e => setCustomDeviceTypeName(e.target.value)}
                                                    placeholder="输入分类名称"
                                                    className="w-full h-10 bg-slate-50/50 border border-primary/40 rounded-xl px-4 text-sm font-bold text-slate-900 outline-none ring-4 ring-primary/5 active:scale-[0.99] transition-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCustomDeviceType(false)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-primary font-bold hover:underline bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100"
                                                >
                                                    返回选择
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            <div className="h-px bg-slate-100" />

                            {/* 2. Credentials */}
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="h-1 w-1 rounded-full bg-primary" />
                                    <h3 className="text-xs font-bold text-slate-900 tracking-wide">访问认证配置</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 ml-1">管理账号</label>
                                        <div className="relative group">
                                            <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 border-r border-slate-100 pr-1 group-focus-within:text-primary transition-colors" />
                                            <input
                                                value={formData.username}
                                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                                className="w-full h-10 bg-white border border-slate-200/80 rounded-xl pl-10 pr-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all outline-none placeholder:text-slate-300"
                                                placeholder="SSH Username"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 ml-1">登录密码 (密文存储)</label>
                                        <div className="relative group">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 border-r border-slate-100 pr-1 group-focus-within:text-primary transition-colors" />
                                            <input
                                                type="password"
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full h-10 bg-white border border-slate-200/80 rounded-xl pl-10 pr-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all outline-none placeholder:text-slate-300"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 ml-1">Enable 提权密码</label>
                                        <input
                                            type="password"
                                            value={formData.secret}
                                            onChange={e => setFormData({ ...formData, secret: e.target.value })}
                                            placeholder="无需提权请留空"
                                            className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all outline-none placeholder:text-slate-200"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 ml-1">服务连接端口</label>
                                        <input
                                            type="number"
                                            value={formData.port}
                                            onChange={e => setFormData({ ...formData, port: parseInt(e.target.value) })}
                                            className="w-full h-10 bg-slate-50/50 border border-slate-200/80 rounded-xl px-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </section>

                            <div className="h-px bg-slate-100" />

                            {/* 3. Location */}
                            <section className="pb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="h-1 w-1 rounded-full bg-primary" />
                                    <h3 className="text-xs font-bold text-slate-900 tracking-wide">地理位置属性</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 ml-1">所属区域环境</label>
                                        <input
                                            value={formData.region}
                                            onChange={e => setFormData({ ...formData, region: e.target.value })}
                                            placeholder="例如: 华北-北京"
                                            className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all outline-none placeholder:text-slate-300"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-500 ml-1">具体物理位置</label>
                                        <div className="relative group">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 border-r border-slate-100 pr-1 group-focus-within:text-primary transition-colors" />
                                            <input
                                                value={formData.location}
                                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                                placeholder="例如: IDC-01机房 3-102机柜"
                                                className="w-full h-10 bg-white border border-slate-200/80 rounded-xl pl-10 pr-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all outline-none placeholder:text-slate-300"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 px-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            {testStatus === 'success' && (
                                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                                    <CheckCircle2 className="h-4 w-4" /> 连通性测试通过
                                </div>
                            )}
                            {testStatus === 'failed' && (
                                <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
                                    <AlertCircle className="h-4 w-4" /> SSH 连接失败
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-all hover:bg-slate-200/50 rounded-full active:scale-95"
                            >
                                取消返回
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-12 py-3 bg-slate-900 text-white rounded-full font-bold text-sm shadow-xl shadow-slate-200 flex items-center gap-2.5 hover:bg-primary transition-all disabled:opacity-50 active:scale-95 group min-w-[120px] justify-center"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4 group-hover:scale-110 transition-transform" />}
                                确 定
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
