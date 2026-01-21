import { useState } from 'react';
import { Lock, Globe, Shield, Clock, Search } from 'lucide-react';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';

const HttpTool = () => {
    const [url, setUrl] = useState('');
    const [mode, setMode] = useState<'inspect' | 'ssl'>('inspect');
    const [result, setResult] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    const handleRun = async () => {
        if (!url) return;
        setLoading(true); setResult(null);
        try {
            if (mode === 'inspect') {
                const res = await api.tools.httpInspect(url);
                setResult(res);
            } else {
                const res = await api.tools.checkSsl(url);
                setResult(res);
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 h-full flex flex-col">
            <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6 shrink-0">
                <div className="flex gap-4 mb-6 border-b border-border/50 pb-4">
                    <button onClick={() => { setMode('inspect'); setResult(null); }} className={cn("px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2", mode === 'inspect' ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50")}>
                        <Search className="h-4 w-4" /> HTTP 探针
                    </button>
                    <button onClick={() => { setMode('ssl'); setResult(null); }} className={cn("px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2", mode === 'ssl' ? "bg-emerald-50 text-emerald-600" : "text-slate-500 hover:bg-slate-50")}>
                        <Lock className="h-4 w-4" /> SSL 证书详情
                    </button>
                </div>

                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder={mode === 'inspect' ? "输入 URL (如: www.baidu.com)" : "输入域名 (如: baidu.com)"}
                        className="flex-1 bg-slate-50 border border-border/50 rounded-xl px-4 py-3 font-mono text-lg font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRun()}
                    />
                    <button onClick={handleRun} disabled={loading} className="px-8 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-all disabled:opacity-50">
                        {loading ? '检测中...' : '开始检测'}
                    </button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
                {/* Result Area */}
                {result && mode === 'inspect' && (
                    <div className="col-span-1 md:col-span-2 bg-white rounded-2xl border border-border/50 shadow-sm flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex justify-between items-center">
                            <h3 className="font-bold text-indigo-900 flex items-center gap-2"><Globe className="h-4 w-4" /> HTTP 概要信息</h3>
                            <div className={cn("px-3 py-1 rounded-full text-xs font-bold", result.status_code >= 200 && result.status_code < 300 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                                {result.status_code} {result.reason}
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 overflow-auto">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">请求 URL</label>
                                    <div className="font-mono font-bold text-slate-800 break-all">{result.url}</div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="space-y-1 flex-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">响应延迟</label>
                                        <div className="font-mono font-bold text-slate-800">{result.latency_ms} ms</div>
                                    </div>
                                    <div className="space-y-1 flex-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">服务器 IP</label>
                                        <div className="font-mono font-bold text-slate-800">{result.server_ip}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">响应头信息 (Response Headers)</label>
                                <div className="bg-slate-50 rounded-xl p-4 font-mono text-xs text-slate-600 border border-slate-100 overflow-auto max-h-[300px]">
                                    {Object.entries(result.headers || {}).map(([k, v]: any) => (
                                        <div key={k} className="mb-1"><span className="text-indigo-600 font-bold">{k}:</span> <span className="break-all">{v}</span></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {result && mode === 'ssl' && (
                    <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                        <div className={cn("rounded-2xl border p-8 flex flex-col justify-center items-center gap-4 shadow-sm", result.valid ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200")}>
                            {result.valid ? <Shield className="h-16 w-16 text-emerald-500" /> : <Shield className="h-16 w-16 text-red-500" />}
                            <div className="text-center">
                                <h2 className={cn("text-3xl font-black", result.valid ? "text-emerald-700" : "text-red-700")}>
                                    {result.valid ? "安全 (Valid)" : "不安全 / 无效"}
                                </h2>
                                <p className="text-slate-500 font-medium mt-2">SSL 证书状态</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-border/50 p-6 shadow-sm space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Clock className="h-6 w-6" /></div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase">过期时间</div>
                                    <div className="text-xl font-bold text-slate-800">{result.expiry_date}</div>
                                    <div className={cn("text-sm font-bold mt-1", result.days_remaining < 30 ? "text-red-500" : "text-emerald-500")}>
                                        剩余有效期: {result.days_remaining} 天
                                    </div>
                                </div>
                            </div>
                            <div className="h-px bg-slate-100" />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase">颁发机构</div>
                                    <div className="font-bold text-slate-700 text-sm mt-1">{result.issuer}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase">使用者</div>
                                    <div className="font-bold text-slate-700 text-sm mt-1">{result.subject}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
export default HttpTool;
