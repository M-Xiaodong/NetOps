import { useState, useEffect } from 'react';
import { Globe, Search, RefreshCw, MapPin, Building2, Wifi, Database, Zap, Copy, Clock } from 'lucide-react';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';

const MyIpTool = () => {
    const [multiIpResults, setMultiIpResults] = useState<any[]>([]);
    const [loadingMyIp, setLoadingMyIp] = useState(false);

    const [inputIps, setInputIps] = useState('');
    const [batchResults, setBatchResults] = useState<any[]>([]);
    const [loadingBatch, setLoadingBatch] = useState(false);
    const [activeTab, setActiveTab] = useState<'my' | 'search'>('my');
    const [copyTip, setCopyTip] = useState<string | null>(null);

    // Config
    const [source, setSource] = useState('offline'); // offline | freeipapi | ipinfo

    const fetchMultiIp = async () => {
        setLoadingMyIp(true);
        try {
            const res = await api.tools.myIp();
            setMultiIpResults(Array.isArray(res) ? res : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingMyIp(false);
        }
    };

    const handleBatchSearch = async () => {
        const ips = inputIps.split(/[\n,;]+/).map(i => i.trim()).filter(i => i);
        if (!ips.length) return;

        setLoadingBatch(true);
        setBatchResults([]);
        try {
            const res = await api.tools.myIpBatch(ips, source);
            setBatchResults(Array.isArray(res) ? res : []);
        } catch (e: any) {
            alert("查询失败: " + e.message);
        } finally {
            setLoadingBatch(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopyTip(text);
            setTimeout(() => setCopyTip(null), 2000);
        } catch (err) {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopyTip(text);
            setTimeout(() => setCopyTip(null), 2000);
        }
    };

    useEffect(() => {
        fetchMultiIp();
    }, []);

    const DetailRow = ({ label, value, icon: Icon, colorClass = "text-slate-700" }: { label: string, value: any, icon: any, colorClass?: string }) => (
        <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-2 text-slate-400">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <span className={cn("text-sm font-black text-right", colorClass)}>{value || '-'}</span>
        </div>
    );

    return (
        <div className="h-full w-full p-6 bg-slate-50 flex flex-col gap-0 animate-fade-in overflow-y-auto custom-scrollbar">

            {/* Header Tabs */}
            <div className="flex justify-center mb-4">
                <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex mb-0 scale-90 origin-bottom">
                    <button
                        onClick={() => setActiveTab('my')}
                        className={cn("px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2", activeTab === 'my' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:text-slate-800")}
                    >
                        <Globe className="h-4 w-4" /> 公网 IP 信息
                    </button>
                    <button
                        onClick={() => setActiveTab('search')}
                        className={cn("px-8 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2", activeTab === 'search' ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-blue-600")}
                    >
                        <Search className="h-4 w-4" /> 查询指定 IP
                    </button>
                </div>
            </div>

            {activeTab === 'my' && (
                <div className="max-w-6xl mx-auto w-full space-y-0 animate-fade-in mt-0">
                    <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm relative z-10 mx-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600/10 p-2 rounded-lg">
                                <Zap className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="text-sm font-black text-slate-800 tracking-tight">多方位探测：检测访问国内与海外资源时的出口差异</span>
                        </div>
                        <button
                            onClick={fetchMultiIp}
                            disabled={loadingMyIp}
                            className="px-5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-black text-white hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 disabled:opacity-50"
                        >
                            <RefreshCw className={cn("h-3 w-3", loadingMyIp && "animate-spin")} /> 重新探测
                        </button>
                    </div>

                    {loadingMyIp && multiIpResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                            <Zap className="h-12 w-12 animate-pulse text-blue-500" />
                            <span className="font-black animate-pulse">正在进行多路径出口探测...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 pb-10">
                            {multiIpResults.map((res, idx) => {
                                const isMainland = res.label.includes('国内');
                                return (
                                    <div key={idx} className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 group relative">
                                        <div className={cn(
                                            "px-8 py-6 flex justify-between items-center bg-gradient-to-br",
                                            isMainland ? "from-orange-500 to-amber-500" : "from-blue-600 to-indigo-500"
                                        )}>
                                            <div className="text-white">
                                                <div className="text-[10px] font-black uppercase opacity-70 tracking-[0.2em] mb-1">Detection Endpoint</div>
                                                <div className="text-xl font-black">{res.label}</div>
                                            </div>
                                            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/20">
                                                {isMainland ? <Zap className="h-6 w-6 text-white" /> : <Globe className="h-6 w-6 text-white" />}
                                            </div>
                                        </div>

                                        <div className="p-8 space-y-6">
                                            <div className="space-y-3">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", isMainland ? "bg-orange-500" : "bg-blue-500")} />
                                                    您的实时出口 IP
                                                </div>
                                                <div className="flex items-center justify-between bg-slate-50 p-6 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:border-slate-200 transition-all relative">
                                                    <span className="text-4xl font-black text-slate-900 font-mono tracking-tighter">
                                                        {res.ip}
                                                    </span>
                                                    <button
                                                        onClick={() => copyToClipboard(res.ip)}
                                                        className={cn(
                                                            "p-3 rounded-xl transition-all shadow-sm border",
                                                            isMainland
                                                                ? "bg-orange-50 border-orange-100 text-orange-500 hover:bg-orange-500 hover:text-white"
                                                                : "bg-blue-50 border-blue-100 text-blue-500 hover:bg-blue-500 hover:text-white"
                                                        )}
                                                        title="复制 IP"
                                                    >
                                                        <Copy className="h-5 w-5" />
                                                    </button>

                                                    {/* Copy Tip Overlay */}
                                                    {copyTip === res.ip && (
                                                        <div className="absolute -top-10 right-0 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-xl after:content-[''] after:absolute after:top-full after:right-4 after:border-4 after:border-transparent after:border-t-slate-900">
                                                            已复制到剪贴板
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-0">
                                                <DetailRow label="运营商 / ISP" value={res.isp} icon={Wifi} colorClass={isMainland ? "text-orange-600" : "text-blue-600"} />
                                                <DetailRow label="国家 / 地区" value={res.country} icon={Building2} />
                                                <DetailRow label="地理位置" value={res.city} icon={MapPin} />
                                                <DetailRow
                                                    label="时区 / 时间"
                                                    value={`${res.timezone} ${res.local_time}`}
                                                    icon={Clock}
                                                    colorClass="text-emerald-600"
                                                />
                                                <DetailRow label="经纬度" value={res.lat ? `${res.lat}, ${res.lon}` : null} icon={MapPin} />
                                                <DetailRow label="数据源" value={res.source} icon={Database} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'search' && (
                <div className="max-w-[1600px] mx-auto w-full animate-fade-in mt-2">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start h-[calc(100vh-180px)] min-h-[500px]">

                        {/* Left Column: Input Panel */}
                        <div className="lg:col-span-4 flex flex-col">
                            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xl flex flex-col space-y-3">

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                            <Search className="h-4 w-4 text-slate-900" />
                                            查询配置
                                        </label>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-xs font-bold text-slate-900 block">数据源选择</span>
                                        <div className="relative">
                                            <select
                                                value={source}
                                                onChange={(e) => setSource(e.target.value)}
                                                className="w-full text-sm font-black bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none appearance-none transition-all cursor-pointer text-slate-900"
                                            >
                                                <option value="offline">离线库 (GeoLite2)</option>
                                                <option value="freeipapi">FreeIPAPI (高效在线)</option>
                                                <option value="ipinfo">IPInfo.io (专业数据)</option>
                                                <option value="ipify">Ipify (快速探测)</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-900">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-auto flex flex-col space-y-1 min-h-0">
                                    <label className="text-xs font-bold text-slate-900 block">IP 列表 (支持多行)</label>
                                    <textarea
                                        className="w-full h-80 bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono font-black text-xl text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all resize-none shadow-inner"
                                        placeholder={`223.5.5.5\n8.8.8.8\n...`}
                                        value={inputIps}
                                        onChange={e => setInputIps(e.target.value)}
                                    />
                                </div>

                                <button
                                    onClick={handleBatchSearch}
                                    disabled={loadingBatch || !inputIps.trim()}
                                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-2xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                >
                                    {loadingBatch ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5 stroke-[3]" />}
                                    {loadingBatch ? '正在检索...' : '开始查询'}
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Results Panel */}
                        <div className="lg:col-span-8 h-full flex flex-col">
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                                {batchResults.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-900 space-y-4 border-2 border-dashed border-slate-200 rounded-3xl min-h-[400px]">
                                        <Search className="h-16 w-16 opacity-20 text-slate-900" />
                                        <div className="font-black text-lg text-slate-900">请在左侧输入 IP 开始查询</div>
                                    </div>
                                ) : (
                                    batchResults.map((item, i) => (
                                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-5 animate-fade-in-up hover:border-blue-300 hover:shadow-md transition-all group" style={{ animationDelay: `${i * 0.05}s` }}>
                                            {/* Header Section */}
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                                                        <Globe className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <div className="font-mono font-black text-2xl text-slate-900 tracking-tighter">{item.ip}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1 uppercase">
                                                                <Database className="h-3 w-3" /> {item.source}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {item.error ? (
                                                <div className="text-red-600 font-black bg-red-50 px-4 py-3 rounded-xl text-sm border border-red-100 flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                                    ERROR: {item.error}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
                                                    {/* Location Group */}
                                                    <div className="col-span-2 space-y-1">
                                                        <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1"><MapPin className="h-3 w-3 text-slate-900" /> 地理位置</div>
                                                        <div className="font-black text-slate-900 text-lg flex flex-wrap items-baseline gap-2">
                                                            <span>{item.country}</span>
                                                            {(item.region && item.region !== "Unknown") && <span className="text-slate-900">/ {item.region}</span>}
                                                            <span className="text-slate-900">{item.city}</span>
                                                        </div>
                                                    </div>

                                                    {/* Network Group */}
                                                    <div className="col-span-2 space-y-1">
                                                        <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1"><Wifi className="h-3 w-3 text-slate-900" /> 网络归属 (ISP)</div>
                                                        <div className="flex flex-col gap-1">
                                                            <div className="font-black text-slate-900 text-lg truncate" title={item.isp}>{item.isp}</div>
                                                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                                                {item.asn && <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 shrink-0">{item.asn}</span>}
                                                                <span className="text-slate-900 font-bold break-words leading-tight" title={item.org}>{item.org}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Divider */}
                                                    <div className="col-span-full h-px bg-slate-100 my-0" />

                                                    {/* Tech Details using CSS Grid */}
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">经纬度</div>
                                                        <div className="font-mono font-black text-slate-900 text-sm select-all">{item.lat ? `${item.lat}, ${item.lon}` : '-'}</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">精度范围</div>
                                                        <div className="font-mono font-black text-slate-900 text-sm">{item.accuracy || '-'}</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">时区</div>
                                                        <div className="font-mono font-black text-slate-900 text-sm">{item.timezone || ''}</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">本地时间</div>
                                                        <div className="font-mono font-black text-slate-900 text-sm">{item.local_time || '-'}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyIpTool;
