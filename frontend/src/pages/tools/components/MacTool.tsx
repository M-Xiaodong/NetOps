import { useState, useEffect } from 'react';
import { Hash, Search, FileCode, Database, Cloud, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';

const MacTool = () => {
    // State
    const [input, setInput] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | null } | null>(null);

    // Config
    const [source, setSource] = useState('offline'); // offline, online
    const [viewMode, setViewMode] = useState<'both' | 'format'>('both'); // both=Query+Format, format=FormatOnly

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleAction = async (action: 'query' | 'format') => {
        const macs = input.split(/[\n,;]+/).map(i => i.trim()).filter(i => i);
        if (!macs.length) return;

        setLoading(true);
        setResults([]);

        try {
            let res;
            if (action === 'query') {
                // Query (includes formats)
                res = await api.tools.macBatch(macs, source);
                setViewMode('both');
            } else {
                // Format Only
                res = await api.tools.macFormat(macs);
                setViewMode('format');
            }
            setResults(Array.isArray(res) ? res : []);
        } catch (e: any) {
            setToast({ msg: "执行失败: " + e.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        if (!text) return;

        // 优先使用 Clipboard API，如果失败则回退
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                setToast({ msg: "已复制: " + text, type: 'success' });
            }).catch(err => {
                console.error('Clipboard API 失败，尝试回退方法: ', err);
                fallbackCopyToClipboard(text);
            });
        } else {
            fallbackCopyToClipboard(text);
        }
    };

    const fallbackCopyToClipboard = (text: string) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
                setToast({ msg: "已复制: " + text, type: 'success' });
            } else {
                setToast({ msg: "复制失败，请重试", type: 'error' });
            }
        } catch (err) {
            console.error('回退复制方法异常: ', err);
            setToast({ msg: "复制异常", type: 'error' });
        }
    };

    return (
        <div className="h-full w-full p-6 bg-slate-50 flex flex-col gap-6 animate-fade-in overflow-y-auto custom-scrollbar relative">

            {/* Toast Notification */}
            {toast && (
                <div className={cn(
                    "fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-scale-in border transition-all",
                    toast.type === 'success'
                        ? "bg-white border-emerald-100 text-emerald-700 shadow-emerald-500/10"
                        : "bg-white border-red-100 text-red-600 shadow-red-500/10"
                )}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    <span className="font-bold text-sm">{toast.msg}</span>
                </div>
            )}

            <div className="max-w-5xl mx-auto w-full space-y-6">

                {/* Unified Input Panel */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                <Hash className="h-5 w-5" />
                            </div>
                            <h2 className="text-lg font-black text-slate-800">MAC 地址工具箱</h2>
                        </div>

                        {/* Source Toggle */}
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setSource('offline')}
                                className={cn("px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all", source === 'offline' ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700")}
                            >
                                <Database className="h-3.5 w-3.5" /> 离线查询
                            </button>
                            <button
                                onClick={() => setSource('online')}
                                className={cn("px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all", source === 'online' ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-indigo-600")}
                            >
                                <Cloud className="h-3.5 w-3.5" /> 在线查询
                            </button>
                        </div>
                    </div>

                    <textarea
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all h-[200px] shadow-inner resize-none uppercase text-lg leading-relaxed"
                        placeholder="在此输入 MAC 地址 (支持批量，换行分隔)&#10;AABBCCDDEEFF&#10;00:11:22..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                    />

                    <div className="flex gap-3">
                        <button
                            onClick={() => handleAction('query')}
                            disabled={loading || !input.trim()}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
                        >
                            <Search className="h-4 w-4" /> {loading ? '执行中...' : '查询并格式化'}
                        </button>
                        <button
                            onClick={() => handleAction('format')}
                            disabled={loading || !input.trim()}
                            className="w-40 py-3 bg-white border-2 border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 font-black rounded-xl active:scale-[0.98] transition-all flex justify-center items-center gap-2"
                        >
                            <FileCode className="h-4 w-4" /> 仅格式化
                        </button>
                    </div>
                </div>

                {/* Results */}
                {results.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in-up">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-sm text-slate-700 bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        {viewMode === 'both' && <th className="pl-8 pr-4 py-4 font-bold w-48">厂商</th>}
                                        <th className="px-6 py-4 font-bold text-indigo-600">思科格式</th>
                                        <th className="px-6 py-4 font-bold text-orange-700">华为格式</th>
                                        <th className="px-6 py-4 font-bold text-slate-600">标准格式</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {results.map((item, i) => (
                                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                            {viewMode === 'both' && (
                                                <td className="pl-8 pr-4 py-4">
                                                    <span className={cn(
                                                        "px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider -ml-2.5",
                                                        item.vendor === '未知' || item.vendor === '无效格式' || item.vendor === 'Unknown'
                                                            ? "bg-slate-100 text-slate-500"
                                                            : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                                    )}>
                                                        {item.vendor || '未知'}
                                                    </span>
                                                </td>
                                            )}

                                            {/* 思科格式 - Indigo */}
                                            <td className="px-6 py-4 group">
                                                <div
                                                    className="inline-flex items-center gap-2 font-mono text-indigo-600 font-bold text-base cursor-pointer hover:text-indigo-800 transition-colors"
                                                    onClick={() => copyToClipboard(item.formats?.cisco?.trim() || '')}
                                                    title="点击复制纯文本"
                                                >
                                                    <span>{item.formats?.cisco || '-'}</span>
                                                    {item.formats?.cisco && (
                                                        <button className="opacity-0 group-hover:opacity-100 p-1 bg-indigo-50 text-indigo-500 rounded-md transition-all hover:bg-indigo-100">
                                                            <Copy className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* 华为格式 - Deep Orange (For better visibility) */}
                                            <td className="px-6 py-4 group">
                                                <div
                                                    className="inline-flex items-center gap-2 font-mono text-orange-700 font-bold text-base cursor-pointer hover:text-orange-900 transition-colors"
                                                    onClick={() => copyToClipboard(item.formats?.huawei?.trim() || '')}
                                                    title="点击复制纯文本"
                                                >
                                                    <span>{item.formats?.huawei || '-'}</span>
                                                    {item.formats?.huawei && (
                                                        <button className="opacity-0 group-hover:opacity-100 p-1 bg-orange-50 text-orange-600 rounded-md transition-all hover:bg-orange-100">
                                                            <Copy className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* 标准格式 - Slate */}
                                            <td className="px-6 py-4 group">
                                                <div
                                                    className="inline-flex items-center gap-2 font-mono text-slate-600 font-semibold text-base cursor-pointer hover:text-slate-900 transition-colors"
                                                    onClick={() => copyToClipboard(item.formats?.colon?.trim() || '')}
                                                    title="点击复制纯文本"
                                                >
                                                    <span>{item.formats?.colon || '-'}</span>
                                                    {item.formats?.colon && (
                                                        <button className="opacity-0 group-hover:opacity-100 p-1 bg-slate-100 text-slate-400 rounded-md transition-all hover:bg-slate-200">
                                                            <Copy className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MacTool;
