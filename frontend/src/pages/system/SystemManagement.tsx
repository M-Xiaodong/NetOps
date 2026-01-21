import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, Bell, History, Grid } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { id: 'users', name: '用户管理', icon: ShieldCheck, path: '/system/users', desc: '权限分配与审计' },
    { id: 'notifications', name: '通知中心', icon: Bell, path: '/system/notifications', desc: '消息订阅与告警' },
    { id: 'logs', name: '系统日志', icon: History, path: '/system/logs', desc: '结构化审计日志' },
];

export default function SystemManagement() {
    const navigate = useNavigate();
    const location = useLocation();

    // 检查是否在系统中心根路径（首页模式）
    const isHome = location.pathname === '/system' || location.pathname === '/system/';

    return (
        <div className="h-full w-full p-2 flex flex-col overflow-hidden">
            <div className="flex-1 flex overflow-hidden bg-white rounded-xl border border-slate-200/60 shadow-sm relative">

                {/* 1. 侧边导航 - 对齐工具箱标准 */}
                <div className={cn(
                    "w-56 bg-white flex flex-col z-20 border-r border-slate-100 shrink-0 transition-all duration-500 ease-in-out origin-left",
                    isHome ? "-translate-x-full opacity-0 w-0 border-none overflow-hidden" : "translate-x-0 opacity-100"
                )}>
                    {!isHome && (
                        <div className="flex flex-col h-full animate-fade-in">
                            <div className="p-3 pb-2">
                                <button
                                    onClick={() => navigate('/system')}
                                    className="w-full mb-3 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full transition-all duration-300 text-[13px] font-black shadow-md ring-1 ring-slate-900/20 text-slate-900 hover:bg-slate-50 hover:text-primary active:scale-95 bg-white cursor-pointer"
                                >
                                    <Grid className="h-4 w-4 text-primary stroke-[3]" />
                                    <span>系统中心首页</span>
                                </button>

                                <div className="space-y-1.5">
                                    {navItems.map(item => {
                                        const active = location.pathname === item.path;
                                        return (
                                            <Link
                                                key={item.id}
                                                to={item.path}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-300 select-none text-sm font-bold group",
                                                    active
                                                        ? "text-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                                                        : "text-slate-500 hover:bg-slate-50 hover:text-primary"
                                                )}
                                            >
                                                <div className={cn(
                                                    "p-1.5 rounded-lg transition-all",
                                                    active ? "bg-primary text-white shadow-md shadow-primary/10" : "bg-white border border-slate-100 text-slate-400 group-hover:border-primary/20"
                                                )}>
                                                    <item.icon className="h-4 w-4 stroke-[2.5] shrink-0" />
                                                </div>
                                                <span className="truncate flex-1">{item.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-auto p-3">
                                <button
                                    onClick={() => navigate('/')}
                                    className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-300 text-xs font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:scale-95"
                                >
                                    <Grid className="h-3.5 w-3.5" />
                                    <span>仪表盘</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. 内容区域 */}
                <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
