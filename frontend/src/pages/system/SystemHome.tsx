import React, { useState } from 'react';
import { ShieldCheck, Bell, History, Settings, Search, Zap, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const modules = [
    { id: 'users', name: '用户管理', icon: ShieldCheck, desc: '控制角色权限、用户准入及操作轨迹审计', color: 'bg-blue-500', path: '/system/users' },
    { id: 'notifications', name: '通知中心', icon: Bell, desc: '集成邮件、企业微信等全渠道消息推送配置', color: 'bg-rose-500', path: '/system/notifications' },
    { id: 'logs', name: '系统日志', icon: History, desc: '查看后端核心进程、API 及业务插件的结构化日志', color: 'bg-indigo-500', path: '/system/logs' },
];

export default function SystemHome() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredModules = modules.filter(m =>
        m.name.includes(searchTerm) || m.desc.includes(searchTerm)
    );

    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar animate-fade-in-up bg-white">
            <div className="p-6 lg:p-10 w-full mx-auto">
                {/* Hero Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-12">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-primary rounded-2xl text-white shadow-2xl shadow-primary/20 flex items-center justify-center animate-pulse-subtle">
                            <Settings className="h-8 w-8 stroke-[2.5]" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">系统中心</h1>
                            <p className="text-slate-500 font-bold mt-1 text-base">平台基础架构配置与核心数据审计中心</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-80 group">
                        <Search className="h-4 w-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="搜索管理功能..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-black text-slate-800 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-slate-400 shadow-sm"
                        />
                    </div>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredModules.map(module => (
                        <button
                            key={module.id}
                            onClick={() => navigate(module.path)}
                            className="group relative overflow-hidden rounded-3xl p-8 text-left transition-all duration-500 bg-white border border-slate-100 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 flex flex-col h-full"
                        >
                            <div className="flex justify-between items-start mb-8">
                                <div className={cn(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 text-white",
                                    module.color
                                )}>
                                    <module.icon className="h-7 w-7 stroke-[2.5]" />
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <ExternalLink className="h-5 w-5 text-slate-300" />
                                </div>
                            </div>

                            <div className="mt-auto">
                                <h3 className="text-xl font-black text-slate-900 mb-3 group-hover:text-primary transition-colors">
                                    {module.name}
                                </h3>
                                <p className="text-sm text-slate-500 font-bold group-hover:text-slate-600 leading-relaxed">
                                    {module.desc}
                                </p>
                            </div>

                            {/* Decorative Background Blob */}
                            <div className={cn(
                                "absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-5 group-hover:opacity-10 transition-all duration-700",
                                module.color
                            )} />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
