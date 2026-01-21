import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Activity, Server, FileText, MapPin, ArrowUpRight, Zap, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// 模拟数据 - 实际应从后端API获取
const pieData = [
    { name: '在线 (Online)', value: 420, color: '#10b981' }, // Emerald-500
    { name: '离线 (Offline)', value: 15, color: '#ef4444' }, // Red-500
    { name: '维护中 (Maint)', value: 45, color: '#f59e0b' }, // Amber-500
];

const activityData = [
    { name: '00:00', devices: 400, traffic: 240 },
    { name: '04:00', devices: 398, traffic: 130 },
    { name: '08:00', devices: 415, traffic: 890 },
    { name: '12:00', devices: 420, traffic: 980 },
    { name: '16:00', devices: 418, traffic: 750 },
    { name: '20:00', devices: 410, traffic: 450 },
    { name: '24:00', devices: 405, traffic: 300 },
];

const StatCard = ({ title, value, change, icon: Icon, colorClass, bgClass, onClick }: any) => (
    <div
        onClick={onClick}
        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group"
    >
        <div className="flex justify-between items-start">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight group-hover:text-primary transition-colors">{value}</h3>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                    <ArrowUpRight className="h-3 w-3" />
                    {change}
                </div>
            </div>
            <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", bgClass, colorClass)}>
                <Icon className="h-6 w-6" />
            </div>
        </div>
    </div>
);

export default function DashboardPage() {
    return (
        <div className="h-full w-full p-6 overflow-y-auto bg-slate-50/50 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="设备总数"
                    value="480"
                    change="+12% 本周"
                    icon={Server}
                    colorClass="text-blue-600"
                    bgClass="bg-blue-50"
                />
                <StatCard
                    title="区域覆盖"
                    value="12"
                    change="+2 新增"
                    icon={MapPin}
                    colorClass="text-purple-600"
                    bgClass="bg-purple-50"
                />
                <StatCard
                    title="配置备份"
                    value="1,250"
                    change="+54 今日"
                    icon={FileText}
                    colorClass="text-orange-600"
                    bgClass="bg-orange-50"
                />
                <StatCard
                    title="系统健康度"
                    value="98.5%"
                    change="运行正常"
                    icon={Activity}
                    colorClass="text-emerald-600"
                    bgClass="bg-emerald-50"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                {/* Chart 1: Device Status */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-500" />
                            设备状态分布
                        </h3>
                    </div>
                    <div className="flex-1 min-h-0 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '600' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                            <div className="text-center">
                                <p className="text-3xl font-black text-slate-800">480</p>
                                <p className="text-xs font-bold text-slate-400 uppercase">Total</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chart 2: Activity Trend (Placeholder) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-500" />
                            网络活动趋势 (24H)
                        </h3>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activityData}>
                                <defs>
                                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}
                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="traffic"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorTraffic)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
