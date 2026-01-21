import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';
import {
    Copy as CopyIcon,
    Server as ServerIcon,
    Globe as GlobeIcon,
    Search as SearchIcon,
    RefreshCw as RefreshIcon,
    Zap as ZapIcon,
    Check as CheckIcon
} from 'lucide-react';

// 子组件：管理单个结果条目的复制状态
const DnsResultItem = ({ value, isUnique }: { value: string; isUnique?: boolean }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const textToCopy = value;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(textToCopy);
            } else {
                throw new Error('Clipboard API unavailable');
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            const textArea = document.createElement("textarea");
            textArea.value = textToCopy;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (copyErr) {
                console.error('Fallback copy failed', copyErr);
            }
            document.body.removeChild(textArea);
        }
    };

    return (
        <div className={cn(
            "flex justify-between items-center px-4 py-1 rounded-xl group/item transition-all border",
            isUnique
                ? "bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300"
                : "bg-slate-50 border-slate-100 hover:bg-white hover:border-blue-200"
        )}>
            <div className="flex items-center gap-2 overflow-hidden">
                <span className={cn(
                    "font-mono text-xl font-black break-all leading-tight pr-2",
                    isUnique ? "text-amber-700" : "text-black"
                )}>
                    {value}
                </span>
                {isUnique && (
                    <span className="shrink-0 text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-black uppercase">
                        差异记录
                    </span>
                )}
            </div>
            <button
                className={cn(
                    "p-2 rounded-lg transition-all shrink-0",
                    copied ? "text-green-500" : "opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-blue-600 hover:bg-blue-100"
                )}
                onClick={handleCopy}
                title="复制地址"
            >
                {copied ? <CheckIcon className="h-5 w-5 stroke-[3]" /> : <CopyIcon className="h-5 w-5" />}
            </button>
        </div>
    );
};

const DnsTool = () => {
    const [domain, setDomain] = useState('');
    const [type, setType] = useState('A');
    const [nameserver, setNameserver] = useState('');
    const [selectedServers, setSelectedServers] = useState<string[]>(['']);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // 计算结果中的交集，用于差异高亮
    const getCommonIps = () => {
        const validResults = results.filter(r => r.status === 'success' && r.results?.length > 0);
        if (validResults.length <= 1) return new Set();

        let common = new Set(validResults[0].results);
        for (let i = 1; i < validResults.length; i++) {
            const currentSet = new Set(validResults[i].results);
            common = new Set([...common].filter(x => currentSet.has(x)));
        }
        return common;
    };

    const commonIps = getCommonIps();

    const recordTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'PTR', 'SOA'];
    const commonServers = [
        { name: '本地解析', ip: '' },
        { name: '114', ip: '114.114.114.114' },
        { name: '阿里', ip: '223.5.5.5' },
        { name: '腾讯', ip: '119.29.29.29' },
        { name: 'Google', ip: '8.8.8.8' }
    ];

    useEffect(() => {
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        if (ipRegex.test(domain.trim()) && type !== 'PTR') {
            setType('PTR');
        }
    }, [domain, type]);

    const toggleServer = (ip: string) => {
        setSelectedServers(prev =>
            prev.includes(ip) ? prev.filter(s => s !== ip) : [...prev, ip]
        );
    };

    const handleQuery = async () => {
        if (!domain) return;
        setLoading(true); setResults([]);

        try {
            let servers = [...selectedServers];
            if (nameserver.trim()) {
                const customServers = nameserver.split(/[\s,;]+/).map(s => s.trim()).filter(s => s);
                customServers.forEach(ip => {
                    if (!servers.includes(ip)) servers.push(ip);
                });
            }
            if (servers.length === 0) servers = [''];

            if (servers.length <= 1) {
                const res = await api.tools.dns(domain, type, servers[0] || '');
                setResults([res]);
            } else {
                const res = await api.tools.dnsCompare(domain, servers, type);
                setResults(res);
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    // 精确的 IP 排序逻辑
    const sortIPs = (ips: string[]) => {
        if (!ips) return [];
        return [...ips].sort((a, b) => {
            const aIsIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(a);
            const bIsIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(b);

            if (aIsIp && bIsIp) {
                const aParts = a.split('.').map(Number);
                const bParts = b.split('.').map(Number);
                for (let i = 0; i < 4; i++) {
                    if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
                }
                return 0;
            }
            return a.localeCompare(b, undefined, { numeric: true });
        });
    };

    const handleCopyAll = (ips: string[], index: number) => {
        const sortedText = sortIPs(ips).join('\n');
        const performCopy = async () => {
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(sortedText);
                } else {
                    throw new Error('API unavailable');
                }
                updateBtn(true);
            } catch (err) {
                const textArea = document.createElement("textarea");
                textArea.value = sortedText;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textArea);
                updateBtn(success);
            }
        };

        const updateBtn = (success: boolean) => {
            const btn = document.getElementById(`copy-all-${index}`);
            if (btn) {
                btn.innerText = success ? '已复制' : '失败';
                btn.style.borderColor = success ? '#22c55e' : '#ef4444';
                btn.style.color = success ? '#16a34a' : '#dc2626';
                setTimeout(() => {
                    btn.innerText = '复制全部';
                    btn.style.borderColor = '';
                    btn.style.color = '';
                }, 2000);
            }
        };
        performCopy();
    };

    return (
        <div className="h-full w-full p-6 bg-slate-50 flex flex-col gap-6 animate-fade-in">
            <div className="max-w-[1400px] mx-auto w-full space-y-6 flex flex-col h-full">
                {/* 简洁控制面板 */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <GlobeIcon className="h-4 w-4 text-blue-600" /> 查询目标 (域名或 IP)
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono font-bold text-lg outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-800"
                                    value={domain}
                                    onChange={e => setDomain(e.target.value)}
                                    placeholder="输入域名，按 Enter 键搜索"
                                    onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                                />
                                <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <ServerIcon className="h-4 w-4 text-blue-600" /> 解析服务器 (支持多选对比)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {commonServers.map(s => (
                                    <button
                                        key={s.ip}
                                        onClick={() => toggleServer(s.ip)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-xs font-black border-2 transition-all flex items-center gap-1.5",
                                            selectedServers.includes(s.ip)
                                                ? "bg-white border-blue-600 text-blue-600 shadow-md"
                                                : "bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-white"
                                        )}
                                    >
                                        {selectedServers.includes(s.ip) && <CheckIcon className="h-3 w-3 stroke-[3]" />}
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-mono text-sm outline-none focus:border-blue-600 focus:bg-white transition-all text-slate-600"
                                value={nameserver}
                                onChange={e => setNameserver(e.target.value)}
                                placeholder="手工输入其他 DNS IP (空格分隔)"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-100 gap-4">
                        <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1 border border-slate-200/50">
                            {recordTypes.map(t => (
                                <button
                                    key={t}
                                    onClick={() => setType(t)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-xs font-black transition-all",
                                        type === t ? "bg-white text-blue-600 shadow-sm scale-110" : "text-slate-500 hover:text-slate-800"
                                    )}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleQuery}
                            disabled={loading || !domain}
                            className="px-12 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center gap-2 text-lg"
                        >
                            {loading ? <RefreshIcon className="h-5 w-5 animate-spin" /> : <ZapIcon className="h-5 w-5 fill-current" />}
                            {loading ? '查询中...' : '开始解析'}
                        </button>
                    </div>
                </div>

                {/* 结果展示区 */}
                <div className="flex-1 overflow-auto min-h-0 pb-10">
                    {results.length > 0 ? (
                        <div className={cn(
                            "grid gap-4 animate-fade-in-up",
                            results.length > 1 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 max-w-4xl mx-auto"
                        )}>
                            {results.map((res, idx) => (
                                <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col h-full group">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                                                <ServerIcon className="h-5 w-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">DNS Resolver</span>
                                                    {res.results?.length > 0 && (
                                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black">
                                                            {res.results.length} 个 IP 地址
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-sm font-black text-slate-950">
                                                    {(commonServers.find(s => s.ip === (res.nameserver || ''))?.name || '自定义') + (res.nameserver ? ` (${res.nameserver})` : ' (本地)')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {res.results?.length > 0 && (
                                                <button
                                                    onClick={() => handleCopyAll(res.results, idx)}
                                                    id={`copy-all-${idx}`}
                                                    className="text-[10px] font-black text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all border border-blue-100 uppercase"
                                                >
                                                    复制全部
                                                </button>
                                            )}
                                            {res.status === 'error' && <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-bold border border-red-100 uppercase">Failed</span>}
                                        </div>
                                    </div>
                                    <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar pr-1">
                                        {res.results && sortIPs(res.results).map((val: string) => (
                                            <DnsResultItem
                                                key={val}
                                                value={val}
                                                isUnique={results.length > 1 && !commonIps.has(val)}
                                            />
                                        ))}
                                        {(!res.results || res.results.length === 0) && (
                                            <div className="flex flex-col items-center justify-center py-8 text-slate-300 gap-2">
                                                <GlobeIcon className="h-10 w-10 opacity-20" />
                                                <span className="text-xs font-black uppercase tracking-widest">{res.error || 'No Records'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        !loading && (
                            <div className="flex flex-col items-center justify-center py-20 bg-white/40 rounded-3xl border-2 border-dashed border-slate-200">
                                <GlobeIcon className="h-20 w-20 text-slate-200 mb-6 stroke-[1]" />
                                <div className="text-center">
                                    <p className="font-black text-2xl text-slate-400 tracking-tight">准备查询</p>
                                    <p className="text-sm font-bold text-slate-400/60 mt-2">输入域名并选择 DNS 服务器开始对比解析</p>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default DnsTool;
