import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Server,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  LucideIcon,
  MapPin
} from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  description?: string;
  gradient: string;
  iconColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp, description, gradient, iconColor }) => (
  <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
    <div className={cn("absolute top-0 right-0 p-3 opacity-10 rounded-bl-2xl transition-colors", gradient.replace('bg-gradient-to-br', 'bg'))}>
      <Icon className="h-16 w-16" />
    </div>

    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("p-2.5 rounded-lg shadow-sm ring-1 ring-inset ring-black/5", gradient)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        <span className="text-sm font-bold text-foreground">{title}</span>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold text-foreground tracking-tight">{value}</span>
        {trend && (
          <span className={cn("text-xs font-bold flex items-center px-2 py-0.5 rounded-full border shadow-sm",
            (() => {
              const val = parseFloat(trend.replace(/[^0-9.]/g, '')) || 0;
              if (trendUp) {
                if (val >= 50) return "bg-indigo-500 text-white border-indigo-600 shadow-indigo-500/20";
                if (val >= 10) return "bg-blue-100 text-blue-700 border-blue-200";
                return "bg-cyan-50 text-cyan-700 border-cyan-200";
              } else {
                if (val >= 50) return "bg-red-500 text-white border-red-600 shadow-red-500/20";
                if (val >= 10) return "bg-orange-100 text-orange-800 border-orange-200";
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
              }
            })()
          )}>
            {trendUp ? <ArrowUpRight className="h-3 w-3 mr-1 stroke-[3]" /> : <ArrowDownRight className="h-3 w-3 mr-1 stroke-[3]" />}
            {trend}
          </span>
        )}
      </div>

      {description && (
        <p className="text-xs font-bold text-foreground/60 mt-1">{description}</p>
      )}
    </div>
  </div>
);

const pieData = [
  { name: '在线', value: 480, color: 'hsl(var(--success))' },
  { name: '离线', value: 15, color: 'hsl(var(--destructive))' },
  { name: '维护中', value: 28, color: 'hsl(var(--warning))' },
];

const defaultStats = {
  total_regions: 0,
  total_devices: 0,
  total_files: 0,
  region_stats: []
};

export default function Dashboard() {
  const [stats, setStats] = useState<any>(defaultStats);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await api.files.getStats();
      setStats(data);
    } catch (e) {
      console.error("Failed to load stats", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="h-full w-full flex flex-col p-2 gap-2 overflow-y-auto lg:overflow-hidden">

      {/* Stats Grid - Responsive: 1 col mobile, 2 cols tablet, 4 cols desktop */}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard
          title="区域数量"
          value={stats.total_regions.toString()}
          icon={MapPin}
          trend="稳定"
          trendUp={true}
          description="覆盖区域"
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/20 shadow-lg"
          iconColor="text-white"
        />
        <StatCard
          title="设备数量"
          value={stats.total_devices.toString()}
          icon={Server}
          trend="20.1%"
          trendUp={true}
          description="较上月"
          gradient="bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/20 shadow-lg"
          iconColor="text-white"
        />
        <StatCard
          title="配置文件数量"
          value={stats.total_files.toString()}
          icon={FileText}
          trend="12"
          trendUp={true}
          description="较上周"
          gradient="bg-gradient-to-br from-purple-500 to-purple-600 shadow-purple-500/20 shadow-lg"
          iconColor="text-white"
        />
        <StatCard
          title="告警数量"
          value="0"
          icon={AlertTriangle}
          trend="0"
          trendUp={false}
          description="暂无告警"
          gradient="bg-gradient-to-br from-orange-500 to-orange-600 shadow-orange-500/20 shadow-lg"
          iconColor="text-white"
        />
      </div>

      {/* Charts Section - Flex 1 with min-h-0 to fill remaining space */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-7 gap-2 min-h-[400px] lg:min-h-0">

        {/* Main Bar Chart - 4/7 width on large screens */}
        <div className="lg:col-span-4 bg-card border border-border/50 rounded-xl p-5 shadow-sm flex flex-col min-h-[400px] lg:min-h-0 lg:h-full">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="font-semibold text-foreground">各区域设备/配置文件数量</h3>
          </div>
          <div className="flex-1 min-h-0 w-full overflow-y-auto pr-2 custom-scrollbar">
            <div style={{ height: Math.max(stats.region_stats.length * 60, 200) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={[...stats.region_stats].sort((a: any, b: any) => b.devices - a.devices)}
                  barGap={4}
                  margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    type="number"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="hsl(var(--foreground))"
                    fontSize={14}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                    width={140}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted)/0.2)', radius: 4 }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '8px 12px'
                    }}
                    itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                  />
                  <Bar
                    dataKey="devices"
                    name="设备数"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                  />
                  <Bar
                    dataKey="configs"
                    name="配置备份"
                    fill="hsl(var(--primary)/0.3)"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Donut Chart - 3/7 width on large screens */}
        <div className="lg:col-span-3 bg-card border border-border/50 rounded-xl p-5 shadow-sm flex flex-col min-h-[400px] lg:min-h-0 lg:h-full">
          <div className="mb-4 shrink-0">
            <h3 className="font-semibold text-foreground">设备状态概览 (模拟)</h3>
          </div>
          <div className="flex-1 min-h-0 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  cornerRadius={4}
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">92%</div>
                <div className="text-sm text-muted-foreground">在线率</div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-center gap-6 shrink-0">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
