import { useState, useEffect } from 'react';
import { Bell, Mail, Settings, CheckCircle2, RefreshCw, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
    id: number;
    title: string;
    content: string;
    type: string;
    is_read: boolean;
    created_at: string;
}

const typeConfig: Record<string, { color: string; icon: any; bg: string }> = {
    info: { color: "text-blue-600", bg: "bg-blue-50", icon: Info },
    success: { color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle },
    warning: { color: "text-amber-600", bg: "bg-amber-50", icon: AlertTriangle },
    error: { color: "text-rose-600", bg: "bg-rose-50", icon: AlertCircle },
};

export default function Notifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const baseUrl = window.location.port === '5173'
                ? `${window.location.protocol}//${window.location.hostname}:8000`
                : '';
            const apiUrl = `${baseUrl}/api/system/notifications`;

            const res = await fetch(apiUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                console.log("Notifications fetched:", data);
                setNotifications(data);
            } else {
                console.error("Fetch notifications error:", res.status);
            }
        } catch (err) {
            console.error("Notifications fetch exception:", err);
        } finally {
            setLoading(false);
        }
    };

    const markAllRead = async () => {
        try {
            const token = localStorage.getItem('token');
            const baseUrl = window.location.port === '5173'
                ? `${window.location.protocol}//${window.location.hostname}:8000`
                : '';
            const apiUrl = `${baseUrl}/api/system/notifications/read-all`;

            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            }
        } catch (err) {
            console.error("Failed to mark all read:", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="flex flex-col h-full bg-white animate-fade-in-scale">
            {/* Header Area */}
            <header className="h-16 border-b border-slate-100 flex items-center px-8 justify-between shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shadow-sm border border-rose-100">
                        <Bell className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase">通知中心</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchNotifications}
                        className="p-2 rounded-full hover:bg-slate-50 text-slate-400 transition-all"
                    >
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </button>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>全部标记已读</span>
                        </button>
                    )}
                    <button className="p-2 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all">
                        <Settings className="h-4 w-4" />
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-auto bg-slate-50/20">
                <div className="max-w-4xl mx-auto p-6 md:p-10">
                    {loading && notifications.length === 0 ? (
                        <div className="space-y-4">
                            {Array(4).fill(0).map((_, i) => (
                                <div key={i} className="h-24 bg-white rounded-3xl border border-slate-100 animate-pulse" />
                            ))}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="py-24 text-center">
                            <div className="w-20 h-20 bg-white rounded-3xl shadow-xl border border-slate-100 flex items-center justify-center mx-auto mb-8">
                                <Mail className="h-10 w-10 text-slate-200" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">
                                {loading ? '正在同步通知...' : '暂无新消息'}
                            </h2>
                            <p className="text-slate-500 font-bold leading-relaxed mb-8 text-sm">
                                {loading ? '系统正在从云端获取您的最新消息流水，请稍候。' : '您的通知中心目前非常清净。所有系统告警、任务完成通知都将显示在这里。'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in-up">
                            {notifications.map((note) => {
                                const config = typeConfig[note.type] || typeConfig.info;
                                return (
                                    <div key={note.id} className={cn(
                                        "group bg-white rounded-3xl p-6 border transition-all duration-300 relative flex items-start gap-5",
                                        note.is_read ? "border-slate-100 opacity-60" : "border-slate-200 shadow-md hover:shadow-xl hover:border-slate-300"
                                    )}>
                                        <div className={cn("mt-1 p-2 rounded-2xl shrink-0 group-hover:scale-110 transition-transform", config.bg, config.color)}>
                                            <config.icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className={cn("text-sm font-black truncate", note.is_read ? "text-slate-500" : "text-slate-900")}>
                                                    {note.title}
                                                </h3>
                                                <span className="text-[10px] font-mono text-slate-300 shrink-0">
                                                    {new Date(note.created_at).toLocaleString().replace(/\//g, '-').split(' ')[0]}
                                                </span>
                                            </div>
                                            <p className={cn("text-xs font-bold leading-relaxed", note.is_read ? "text-slate-400" : "text-slate-600")}>
                                                {note.content}
                                            </p>
                                        </div>
                                        {!note.is_read && (
                                            <div className="absolute top-6 right-6 w-2 h-2 bg-rose-500 rounded-full animate-pulse-subtle" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
