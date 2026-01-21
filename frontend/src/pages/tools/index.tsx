import { useState } from 'react';
import {
    Calculator, Activity, Terminal, Globe,
    ArrowRightLeft, Hash, Lock, Search, Grid, Server, Zap, Target
} from 'lucide-react';
import { cn } from '../../lib/utils';
import IpCalculator from './components/IpCalculator';
import UnitConverter from './components/UnitConverter';
import PingTool from './components/PingTool';
import MacTool from './components/MacTool';
import DnsTool from './components/DnsTool';
import TracertTool from './components/TracertTool';
import PortScanner from './components/PortScanner';
import HttpTool from './components/HttpTool';
import MyIpTool from './components/MyIpTool';

// Solid Color Palette (Robust & Clean)
const tools = [
    { id: 'ip', name: 'IP 计算器', icon: Calculator, desc: '子网掩码与ACL生成', color: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-600', component: IpCalculator },
    { id: 'unit', name: '单位换算', icon: ArrowRightLeft, desc: '带宽/存储/时间转换', color: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-600', component: UnitConverter },
    { id: 'mac', name: 'MAC 工具', icon: Hash, desc: '厂商查询与格式化', color: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-600', component: MacTool },
    { id: 'dns', name: 'DNS 查询', icon: Globe, desc: '域名解析记录查询', color: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-600', component: DnsTool },
    { id: 'myip', name: '公网 IP 信息', icon: Server, desc: '多路径公网出口探测', color: 'bg-slate-600', light: 'bg-slate-100', text: 'text-slate-700', component: MyIpTool },
    { id: 'ping', name: 'Ping 检测', icon: Activity, desc: '连通性分析与丢包测试', color: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-600', component: PingTool },
    { id: 'tracert', name: '路由跟踪', icon: Terminal, desc: '网络路径节点可视化', color: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', component: TracertTool },
    { id: 'port', name: '端口检测', icon: Target, desc: '端口状态与连接速度测试', color: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600', component: PortScanner },
    { id: 'http', name: 'HTTP 探针', icon: Lock, desc: '响应头与SSL证书检测', color: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-600', component: HttpTool },
];

const Tools = () => {
    const [activeToolId, setActiveToolId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const activeTool = tools.find(t => t.id === activeToolId);
    const ActiveComponent = activeTool?.component;

    const filteredTools = tools.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.desc.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full w-full p-2 flex flex-col overflow-hidden">
            {/* Unified Main Container */}
            <div className="flex-1 flex overflow-hidden bg-white rounded-xl border border-slate-200/60 shadow-sm relative group/tools-container">

                {/* 1. Sidebar - Visible only when a tool is active */}
                <div className={cn(
                    "w-56 bg-white flex flex-col z-20 border-r border-slate-100 transition-all duration-500 ease-in-out origin-left shrink-0",
                    activeToolId ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 w-0 border-none px-0"
                )}>
                    {activeToolId && (
                        <div className="flex flex-col h-full animate-fade-in">
                            <div className="p-3 pb-2">
                                <button
                                    onClick={() => setActiveToolId(null)}
                                    className="w-full mb-3 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-300 text-xs font-bold shadow-sm ring-1 ring-slate-900/5 text-slate-600 hover:bg-indigo-500/10 hover:text-indigo-600 active:scale-95 bg-white cursor-pointer"
                                >
                                    <Grid className="h-3 w-3" />
                                    <span>首页</span>
                                </button>

                                <div className="relative mb-3">
                                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="查找..."
                                        className="w-full bg-white border border-slate-100 rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-500 transition-all text-slate-600"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-5 pb-10 pt-2 space-y-1.5 custom-scrollbar">
                                {filteredTools.map(tool => (
                                    <button
                                        key={tool.id}
                                        onClick={() => setActiveToolId(tool.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-300 select-none group/item border border-transparent text-sm font-bold",
                                            activeToolId === tool.id
                                                ? "text-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-200/50 shadow-sm"
                                                : "text-slate-500 hover:bg-slate-100/80 hover:text-indigo-600"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-1.5 rounded-lg transition-all",
                                            activeToolId === tool.id ? cn(tool.color, "text-white shadow-md shadow-indigo-500/10") : "bg-white border border-slate-100 text-slate-400 group-hover/item:border-indigo-100"
                                        )}>
                                            <tool.icon className="h-4 w-4 stroke-[2.5]" />
                                        </div>
                                        <span className={cn(
                                            "flex-1 transition-colors",
                                            activeToolId === tool.id ? "text-indigo-600" : "text-slate-600 group-hover/item:text-indigo-600"
                                        )}>
                                            {tool.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
                    {!activeToolId ? (
                        /* --- HOME GRID VIEW --- */
                        <div className="h-full w-full overflow-y-auto custom-scrollbar animate-fade-in-up">
                            <div className="p-6 lg:p-10 w-full mx-auto">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-10">
                                    <div>
                                        <div className="flex items-center gap-5 mb-3">
                                            <div className="w-14 h-14 bg-indigo-600 rounded-2xl text-white shadow-2xl shadow-indigo-600/20 flex items-center justify-center">
                                                <Zap className="h-7 w-7 fill-current" />
                                            </div>
                                            <div>
                                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">网络工具箱</h1>
                                                <p className="text-slate-500 font-bold mt-1 text-base">全功能网络排障中心，快速诊断连通性与配置问题</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative w-full md:w-80 group">
                                        <Search className="h-4 w-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-600 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="搜索工具..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-black text-slate-800 outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-500 transition-all placeholder:text-slate-400 shadow-sm"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                    {filteredTools.map(tool => (
                                        <button
                                            key={tool.id}
                                            onClick={() => setActiveToolId(tool.id)}
                                            className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 bg-white border border-slate-100 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1"
                                        >
                                            <div className="flex justify-between items-start mb-6">
                                                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-all duration-300 group-hover:rotate-6 group-hover:scale-110 text-white", tool.color)}>
                                                    <tool.icon className="h-6 w-6 stroke-[2.5]" />
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                                                    {tool.name}
                                                </h3>
                                                <p className="text-sm text-slate-500 font-bold group-hover:text-slate-600 leading-relaxed">
                                                    {tool.desc}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* --- DETAIL VIEW --- */
                        <div className="h-full w-full flex flex-col overflow-hidden animate-fade-in-scale">
                            <header className="h-16 bg-white border-b border-slate-100 flex items-center px-10 justify-between shrink-0 z-10 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={cn("p-2 rounded-xl shadow-lg shadow-indigo-500/10 text-white", activeTool?.color)}>
                                        {activeTool?.icon && <activeTool.icon className="h-5 w-5 stroke-[2.5]" />}
                                    </div>
                                    <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase">{activeTool?.name}</h1>
                                </div>
                            </header>

                            <main className="flex-1 p-0 relative overflow-hidden bg-white scroll-smooth">
                                {ActiveComponent && <ActiveComponent />}
                            </main>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Tools;
