import { useState } from 'react';
import { Network, List, Copy, Check, Monitor, ShieldCheck, Zap } from 'lucide-react';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';

const IpCalculator = () => {
    const [ip, setIp] = useState('');
    const [result, setResult] = useState<any | null>(null);
    const [aclInfo, setAclInfo] = useState<any | null>(null);
    const [huaweiConfig, setHuaweiConfig] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'basic' | 'subnet' | 'config'>('basic');
    const [vendor, setVendor] = useState<'huawei' | 'cisco'>('huawei');
    const [newPrefix, setNewPrefix] = useState(26);
    const [subnets, setSubnets] = useState<any[]>([]);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [reverseResult, setReverseResult] = useState<any | null>(null);

    // IP 算法助手
    const ipToLong = (ip: string) => {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
    };
    const longToIp = (long: number) => {
        return [
            (long >>> 24) & 0xff,
            (long >>> 16) & 0xff,
            (long >>> 8) & 0xff,
            long & 0xff
        ].join('.');
    };

    const handleCalc = async () => {
        if (!ip) return;
        try {
            const [c, a, h] = await Promise.all([
                api.tools.ipCalc(ip),
                api.tools.getAclInfo(ip),
                api.tools.getHuaweiConfig(ip)
            ]);
            setResult(c); setAclInfo(a); setHuaweiConfig(h);
        } catch (e: any) { alert(e.message); }
    };

    const handleSubnet = async () => {
        if (!result) return;
        const res = await api.tools.subnet(result.input, newPrefix);
        setSubnets(res.map((s: any) => {
            const networkLong = ipToLong(s.network.split('/')[0]);
            const hostsCount = s.hosts;

            // 如果 hosts 为 1 (31位或32位示例)，调整逻辑或显示
            // 典型子网：first_host = network + 1, last_host = broadcast - 1
            // 我们通过 hostsCount 来安全推导
            let first = 'N/A';
            let last = 'N/A';
            if (hostsCount > 0) {
                first = longToIp(networkLong + 1);
                // 广播地址通常是 networkLong + hostsCount + 1
                last = longToIp(networkLong + hostsCount);
            }

            return {
                ...s,
                netmask: s.netmask || result.netmask,
                broadcast_address: s.broadcast_address || s.broadcast || 'N/A',
                first_host: first,
                last_host: last
            };
        }));
    };

    const safeCopy = (text: string, key: string) => {
        if (!text) return;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                setCopiedKey(key);
                setTimeout(() => setCopiedKey(null), 2000);
            }).catch(() => {
                fallbackCopy(text, key);
            });
        } else {
            fallbackCopy(text, key);
        }
    };

    const fallbackCopy = (text: string, key: string) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2000);
        } catch (err) {
            console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
    };

    const InfoBlock = ({ label, value, icon: Icon, colorClass, isSubnet = false }: any) => (
        <div className={cn(
            "bg-white rounded-[1.5rem] border-2 border-slate-100 shadow-sm hover:shadow-lg transition-all group overflow-hidden relative",
            isSubnet ? "p-5" : "p-6"
        )}>
            <div className={cn("absolute -top-10 -right-10 w-32 h-32 blur-3xl rounded-full opacity-10", colorClass)} />
            <h3 className={cn(
                "font-black text-slate-950 flex items-center gap-2 pb-3 border-b-2 border-slate-50 mb-3",
                isSubnet ? "text-lg" : "text-xl"
            )}>
                <div className={cn("p-2 rounded-xl text-white shadow-lg", colorClass)}><Icon className={cn(isSubnet ? "h-5 w-5" : "h-6 w-6")} /></div>
                {label}
            </h3>
            <div className="space-y-0.5">
                {Object.entries(value).map(([k, v]: any) => (
                    <div key={k} className="flex justify-between items-start py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/80 px-2 rounded-xl transition-all group/row relative">
                        <span className="text-xs font-black text-slate-950 uppercase tracking-wider shrink-0 mr-4 py-1">{k}</span>
                        <div className="flex-1 flex justify-end items-start pr-8 relative">
                            <div
                                className={cn(
                                    "font-mono text-base font-black text-slate-950 select-all cursor-pointer flex flex-col items-end text-right leading-relaxed",
                                    (isSubnet || k === "主机范围") ? "" : "whitespace-nowrap"
                                )}
                                onClick={() => safeCopy(String(v), k)}
                            >
                                {k === "主机范围" && String(v).includes(' - ') ? (
                                    <>
                                        <span>{String(v).split(' - ')[0]}</span>
                                        <div className="flex items-center gap-2 w-full justify-end opacity-40">
                                            <div className="h-px flex-1 bg-slate-200" />
                                            <span className="text-[10px] font-black">TO</span>
                                            <div className="h-px w-4 bg-slate-200" />
                                        </div>
                                        <span>{String(v).split(' - ')[1]}</span>
                                    </>
                                ) : v}
                            </div>
                            <div className="absolute right-0 top-1">
                                {copiedKey === k ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Copy className="h-4 w-4 text-slate-400 opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer" onClick={() => safeCopy(String(v), k)} />
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const ConfigCard = ({ label, code }: any) => (
        <div className="space-y-2.5 group">
            <div className="flex justify-between items-center px-1">
                <label className="text-xs font-black text-slate-950 uppercase tracking-widest">{label}</label>
                <button
                    onClick={() => safeCopy(String(code), label)}
                    className="flex items-center gap-1.5 text-xs font-black text-blue-600 hover:text-blue-800 transition-colors"
                >
                    {copiedKey === label ? <><Check className="h-3.5 w-3.5" /> 复制成功</> : <><Copy className="h-3.5 w-3.5" /> 复制配置</>}
                </button>
            </div>
            <div className="relative overflow-hidden rounded-2xl border-2 border-blue-200 bg-white p-5 shadow-sm group-hover:border-blue-400 transition-all font-mono">
                <pre className="text-sm leading-relaxed text-slate-950 overflow-x-auto whitespace-pre select-all tracking-tight font-black">
                    {code}
                </pre>
            </div>
        </div>
    );

    return (
        <div className="h-full w-full p-6 flex flex-col gap-6 overflow-hidden bg-[#f9fafb]">
            {/* Input Header - Lean & Precise */}
            <div className="bg-white rounded-[1.2rem] border-2 border-slate-100 shadow-xl shadow-slate-200/5 p-5 shrink-0 flex flex-col lg:flex-row gap-5 items-end relative overflow-hidden">
                <div className="flex-1 space-y-2 w-full relative z-10">
                    <label className="text-xs font-black text-slate-950 uppercase tracking-widest ml-1">IP地址/掩码</label>
                    <input
                        type="text"
                        placeholder="请输入IP地址，如：192.168.1.1/24"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono font-black text-lg outline-none focus:border-blue-500 focus:bg-white focus:ring-[8px] focus:ring-blue-500/5 transition-all text-slate-950"
                        value={ip}
                        onChange={e => setIp(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCalc()}
                    />
                </div>
                <button
                    onClick={handleCalc}
                    className="relative z-10 px-10 h-[52px] bg-blue-600 text-white font-black text-lg rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-95 transition-all w-full lg:w-auto flex items-center justify-center gap-2.5 mb-0.5"
                >
                    <Zap className="h-5 w-5 fill-current" />
                    开始计算
                </button>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl shadow-slate-200/10">
                <div className="flex items-center justify-between border-b border-slate-100 px-8 py-4 bg-slate-50/20">
                    <div className="flex items-center gap-1 bg-slate-200/50 p-1.5 rounded-full border border-slate-200/30 shadow-inner">
                        {[
                            { id: 'basic', label: '基础详情' },
                            { id: 'subnet', label: '划分子网' },
                            { id: 'config', label: '配置生成' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as any)}
                                className={cn(
                                    "px-6 py-2 text-sm font-bold rounded-full transition-all duration-300",
                                    activeTab === t.id
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-105"
                                        : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                                )}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                    {activeTab === 'config' && (
                        <div className="flex items-center bg-slate-200/50 p-1 rounded-full border border-slate-200/30 shadow-inner shrink-0">
                            <button
                                onClick={() => setVendor('huawei')}
                                className={cn(
                                    "px-5 py-2 text-xs font-bold rounded-full transition-all",
                                    vendor === 'huawei' ? "bg-white shadow-sm text-blue-700" : "text-slate-500 hover:text-blue-600"
                                )}
                            >
                                华为
                            </button>
                            <button
                                onClick={() => setVendor('cisco')}
                                className={cn(
                                    "px-5 py-2 text-xs font-bold rounded-full transition-all",
                                    vendor === 'cisco' ? "bg-white shadow-sm text-blue-700" : "text-slate-500 hover:text-blue-600"
                                )}
                            >
                                思科
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-auto p-8">
                    {result ? (
                        <div className="animate-fade-in space-y-8 w-full">
                            {activeTab === 'basic' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                    <InfoBlock
                                        label="核心参数"
                                        icon={Network}
                                        colorClass="bg-blue-600"
                                        value={{
                                            "网段地址": result.network_address,
                                            "广播地址": result.broadcast_address,
                                            "子网掩码": result.netmask,
                                            "反掩码": result.wildcard_mask,
                                            "地址类别": result.ip_class
                                        }}
                                    />
                                    <InfoBlock
                                        label="主机范围"
                                        icon={List}
                                        colorClass="bg-indigo-600"
                                        value={{
                                            "首个主机": result.first_host,
                                            "末个主机": result.last_host,
                                            "主机总数": result.num_addresses.toLocaleString(),
                                            "可用主机": (result.version === 4 ? result.num_addresses - 2 : "N/A").toLocaleString()
                                        }}
                                    />
                                    <div className="bg-white p-6 rounded-[1.5rem] border-2 border-slate-50 shadow-sm space-y-6">
                                        <h3 className="font-black text-lg text-slate-950 flex items-center gap-2 pb-4 border-b-2 border-slate-50">
                                            <div className="bg-emerald-500 p-2 rounded-xl text-white shadow-lg"><Monitor className="h-5 w-5" /></div>
                                            二进制视图
                                        </h3>
                                        <div className="space-y-6">
                                            <div className="space-y-3">
                                                <div className="text-xs font-black text-slate-950 uppercase tracking-widest px-1">地址二进制</div>
                                                <div className="font-mono text-base leading-relaxed text-slate-950 break-all bg-emerald-50/30 px-5 py-4 rounded-xl border border-emerald-100/50 font-black tracking-wider shadow-inner">{result.binary_ip}</div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="text-xs font-black text-slate-950 uppercase tracking-widest px-1">掩码二进制</div>
                                                <div className="font-mono text-base leading-relaxed text-slate-950 break-all bg-slate-50 px-5 py-4 rounded-xl border border-slate-200 font-black tracking-wider shadow-inner">{result.binary_mask}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'subnet' && (
                                <div className="space-y-10">
                                    <div className="flex flex-wrap items-center justify-center gap-8 bg-blue-50/30 px-10 py-6 rounded-[2.5rem] border-2 border-dashed border-blue-100 w-fit mx-auto">
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-slate-900">新前缀长度:</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-blue-600 text-xl">/</span>
                                                <input type="number" min={result.prefixlen + 1} max={32} value={newPrefix} onChange={e => setNewPrefix(parseInt(e.target.value))} className="w-16 bg-white border-2 border-blue-500 rounded-lg px-2 py-1 font-bold text-center text-lg text-blue-600 focus:ring-0 shadow-sm" />
                                            </div>
                                        </div>
                                        <button onClick={handleSubnet} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md active:scale-95">计算方案</button>
                                        <div className="w-px h-6 bg-blue-100" />
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-slate-600">反向推荐 (终端数):</span>
                                            <input
                                                type="number"
                                                placeholder="输入终端数量..."
                                                className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 transition-all"
                                                onChange={async (e) => {
                                                    const val = parseInt(e.target.value);
                                                    if (val > 0) {
                                                        const res = await api.tools.calcMask(val);
                                                        setReverseResult(res);
                                                    } else {
                                                        setReverseResult(null);
                                                    }
                                                }}
                                            />
                                        </div>
                                        {reverseResult && (
                                            <div className="animate-fade-in bg-white/80 px-4 py-2 rounded-xl border border-blue-200 shadow-sm flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-500">建议掩码:</span>
                                                    <span className="text-sm font-mono font-black text-blue-700">{reverseResult.netmask} (/{reverseResult.prefix})</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-500">可用主机:</span>
                                                    <span className="text-sm font-mono font-black text-emerald-600">{reverseResult.usable_hosts}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up">
                                        {subnets.map((s, i) => (
                                            <InfoBlock
                                                key={i}
                                                label={`方案 ${i + 1}`}
                                                icon={Network}
                                                colorClass="bg-blue-500"
                                                isSubnet={true}
                                                value={{
                                                    "网段地址": s.network,
                                                    "广播地址": s.broadcast_address || s.broadcast,
                                                    "主机范围": `${s.first_host} - ${s.last_host}`,
                                                    "可用主机数": s.hosts.toLocaleString()
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'config' && (
                                <div className="space-y-10 animate-fade-in">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        {vendor === 'huawei' ? (
                                            <>
                                                <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-lg space-y-8">
                                                    <h3 className="text-xl font-black text-slate-950 flex items-center gap-3">
                                                        <ShieldCheck className="h-6 w-6 text-red-600" />
                                                        华为 ACL
                                                    </h3>
                                                    <ConfigCard label="基本 ACL (2000-2999)" code={huaweiConfig?.acl_basic?.join('\n') || '无可生成的配置'} />
                                                    <ConfigCard label="高级 ACL (3000-3999)" code={huaweiConfig?.acl_advanced?.join('\n') || '无可生成的配置'} />
                                                </div>
                                                <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-lg space-y-8">
                                                    <h3 className="text-xl font-black text-slate-950 flex items-center gap-3">
                                                        <Network className="h-6 w-6 text-red-500" />
                                                        华为 路由与接口
                                                    </h3>
                                                    <ConfigCard label="前缀列表 (IP-Prefix)" code={huaweiConfig?.prefix_list?.join('\n') || ''} />
                                                    <ConfigCard label="接口配置 (Interface)" code={huaweiConfig?.interface_config?.join('\n') || ''} />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-lg space-y-8">
                                                    <h3 className="text-xl font-black text-slate-950 flex items-center gap-3">
                                                        <ShieldCheck className="h-6 w-6 text-blue-600" />
                                                        思科 ACL
                                                    </h3>
                                                    <ConfigCard label="标准 ACL (Standard)" code={aclInfo?.std_acl || '无可生成的配置'} />
                                                    <ConfigCard label="扩展 ACL (Extended)" code={aclInfo?.ext_acl_src || '无可生成的配置'} />
                                                </div>
                                                <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-lg space-y-8">
                                                    <h3 className="text-xl font-black text-slate-950 flex items-center gap-3">
                                                        <Network className="h-6 w-6 text-blue-500" />
                                                        思科 宣告与策略
                                                    </h3>
                                                    <ConfigCard label="前缀列表 (Prefix-List)" code={aclInfo?.prefix_list || '无可生成的配置'} />
                                                    <ConfigCard label="宣告命令 (Network)" code={aclInfo?.network_cmd || '无可生成的配置'} />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col justify-center items-center text-slate-300 gap-8 py-32">
                            <Zap className="h-32 w-32 stroke-[0.3] opacity-30 animate-pulse" />
                            <div className="text-2xl font-bold tracking-[0.5em] italic uppercase opacity-20 select-none">请在上方输入网络地址进行计算</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


export default IpCalculator;
