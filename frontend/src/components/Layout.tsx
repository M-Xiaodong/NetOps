import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
    LayoutDashboard,
    FileText,
    Server,
    Zap,
    PlayCircle,
    PenTool,
    ShieldCheck,
    Bell,
    Moon,
    Sun,
    Search,
    Loader2,
    Monitor,
    Database,
    Cpu,
    CheckCircle,
    XCircle,
    AlertCircle,
    Network,
    ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
    icon: any;
    label: string;
    path: string;
    active: boolean;
}

interface SearchResult {
    type: 'device' | 'config' | 'automation';
    title: string;
    description: string;
    link: string;
    id: string | number;
}

const NavItem = ({ icon: Icon, label, path, active }: NavItemProps) => {
    const navigate = useNavigate();
    return (
        <button
            onClick={() => navigate(path)}
            className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold tracking-tight transition-all duration-200 ease-out select-none whitespace-nowrap",
                active
                    ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                    : "text-slate-600 hover:bg-white hover:text-primary hover:shadow-sm active:scale-95"
            )}
        >
            <Icon className={cn("h-4 w-4 stroke-[2.5]", active && "animate-pulse-subtle")} />
            <span className="leading-none">{label}</span>
        </button>
    );
};

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isDark, setIsDark] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const toggleTheme = () => {
        const root = window.document.documentElement;
        setIsDark(!isDark);
        root.classList.toggle('dark');
    };

    // 全局搜索逻辑
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length < 1) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                const res = await fetch(`http://localhost:8000/api/system/search?q=${encodeURIComponent(searchQuery)}`);
                const data = await res.json();
                setResults(data);
                setShowResults(true);
            } catch (err) {
                console.error("Global search failed:", err);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const navItems = [
        { icon: LayoutDashboard, label: '首页', path: '/' },
        { icon: FileText, label: '配置', path: '/configs' },
        { icon: Server, label: '设备', path: '/devices' },
        { icon: Zap, label: '巡检', path: '/inspections' },
        { icon: PlayCircle, label: '自动化', path: '/automation' },
        { icon: PenTool, label: '工具', path: '/tools' },
    ];

    const getSearchIcon = (type: string) => {
        switch (type) {
            case 'device': return <Monitor className="h-4 w-4" />;
            case 'config': return <Database className="h-4 w-4" />;
            case 'automation': return <Cpu className="h-4 w-4" />;
            default: return <Search className="h-4 w-4" />;
        }
    };

    return (
        <div className="h-screen bg-[#f1f3f9] dark:bg-background flex flex-col font-sans text-slate-900 selection:bg-primary/20 selection:text-primary animate-fade-in">
            <header className="h-16 bg-white dark:bg-background border-b border-slate-200/50 sticky top-0 z-50 transition-all duration-500">
                <div className="w-full h-full px-6 flex items-center justify-between">
                    {/* Left: Brand & Nav */}
                    <div className="flex items-center gap-10">
                        <div
                            className="flex items-center gap-3.5 cursor-pointer group"
                            onClick={() => navigate('/')}
                        >
                            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-xl shadow-primary/30 group-hover:scale-110 transition-all duration-700 group-hover:rotate-12">
                                <Network className="h-5.5 w-5.5 text-white" />
                            </div>
                            <span className="text-2xl font-[1000] tracking-tighter text-primary dark:text-blue-400 leading-none">NetOps</span>
                        </div>

                        <div className="hidden md:flex items-center gap-1 bg-secondary/30 p-1 rounded-full border border-border/20 relative">
                            {navItems.map((item) => (
                                <NavItem
                                    key={item.path}
                                    {...item}
                                    active={location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))}
                                />
                            ))}
                            {/* System Management - Direct Link */}
                            <NavItem
                                icon={ShieldCheck}
                                label="系统中心"
                                path="/system"
                                active={location.pathname.startsWith('/system')}
                            />
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-4">
                        {/* Dynamic Global Search */}
                        <div className="hidden lg:flex items-center relative" ref={searchRef}>
                            <div className="relative group">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => searchQuery && setShowResults(true)}
                                    placeholder="搜索内容..."
                                    className="w-64 bg-slate-50 border border-slate-200 rounded-full pl-10 pr-10 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-slate-400 focus:w-80"
                                />
                                {loading && (
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                        <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                                    </div>
                                )}
                            </div>

                            {/* 搜索结果预览 */}
                            {showResults && results.length > 0 && (
                                <div className="absolute top-12 right-0 w-[400px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">搜索结果 ({results.length})</div>
                                    </div>
                                    <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {results.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    navigate(item.link);
                                                    setShowResults(false);
                                                    setSearchQuery("");
                                                }}
                                                className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all text-left group"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:border-primary/20 transition-all shadow-sm">
                                                    {getSearchIcon(item.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-black text-slate-800 truncate mb-0.5">{item.title}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold truncate">{item.description}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate("/system/notifications")}
                                className="relative h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-primary/10 hover:text-primary transition-all group"
                            >
                                <Bell className="h-4 w-4" />
                                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                            </button>

                            <button
                                onClick={toggleTheme}
                                className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-primary/10 hover:text-primary transition-all"
                            >
                                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                            </button>
                        </div>

                        <div className="h-8 w-px bg-slate-100 mx-1"></div>

                        <button
                            className="flex items-center gap-3 p-1 pr-3 rounded-xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100"
                            onClick={() => navigate("/system/users")}
                        >
                            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white text-[10px] font-black group-hover:bg-primary transition-colors">
                                AD
                            </div>
                            <div className="hidden sm:flex flex-col items-start leading-none">
                                <span className="text-[11px] font-black text-slate-900">Admin</span>
                                <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">SuperUser</span>
                            </div>
                            <ChevronDown className="h-3 w-3 text-slate-300 group-hover:text-primary transition-colors" />
                        </button>
                    </div>
                </div>
            </header>
            <main className="flex-1 overflow-hidden relative">
                <Outlet />
            </main>
        </div>
    );
}
