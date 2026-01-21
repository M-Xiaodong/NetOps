/**
 * 设备图标组件
 * Device Icon Component
 * 
 * 用于显示设备、区域和操作系统的图标。
 * 使用 Lucide 矢量图标。
 */

import React from 'react';
import { cn } from '../../lib/utils';
import {
    HelpCircle,
    Network,
    Router,
    ShieldCheck,
    Server,
    LayoutGrid,
    Building,
    Factory,
    Wifi,
    Monitor,
    Globe
} from 'lucide-react';

interface DeviceIconProps {
    /** 类型：设备类型、区域类型或操作系统名 */
    type: string;
    /** 变体：'default' (默认) | 'card' (卡片) | 'badge' (徽章) */
    variant?: 'default' | 'card' | 'badge';
    /** 自定义类名 */
    className?: string;
    /** 是否显示背景容器 */
    withContainer?: boolean;
}

export const DeviceIcon: React.FC<DeviceIconProps> = ({
    type,
    variant = 'default',
    className,
    withContainer = false
}) => {
    // 规范化类型名称（转小写，去空格）
    const normalizedType = type?.toLowerCase().trim() || 'unknown';

    // 图标映射逻辑
    let IconComponent = HelpCircle;

    if (normalizedType.includes('switch') || normalizedType.includes('交换机')) IconComponent = Network;
    else if (normalizedType.includes('firewall') || normalizedType.includes('防火墙')) IconComponent = ShieldCheck;
    else if (normalizedType.includes('router') || normalizedType.includes('路由器')) IconComponent = Router;
    else if (normalizedType.includes('ac') || normalizedType.includes('无线')) IconComponent = Wifi;
    else if (normalizedType.includes('server') || normalizedType.includes('服务器')) IconComponent = Server;
    else if (normalizedType.includes('office') || normalizedType.includes('办公')) IconComponent = LayoutGrid;
    else if (normalizedType.includes('factory') || normalizedType.includes('工厂')) IconComponent = Factory;
    else if (normalizedType.includes('data') || normalizedType.includes('idc') || normalizedType.includes('数据')) IconComponent = Server;
    else if (normalizedType.includes('ubuntu') || normalizedType.includes('linux') || normalizedType.includes('windows') || normalizedType.includes('win')) IconComponent = Monitor;
    else if (normalizedType.includes('region') || normalizedType.includes('区域')) IconComponent = Globe;

    // 容器基础样式
    const baseStyles = "relative flex items-center justify-center transition-all duration-300 overflow-hidden";

    // 类型特定的背景色样式 (仅在 card 模式或 withContainer 为 true 时生效)
    const typeStyles: Record<string, string> = {
        'switch': 'bg-blue-50/80 border-blue-100 text-blue-600',
        '交换机': 'bg-blue-50/80 border-blue-100 text-blue-600',
        'firewall': 'bg-orange-50/80 border-orange-100 text-orange-600',
        '防火墙': 'bg-orange-50/80 border-orange-100 text-orange-600',
        'router': 'bg-indigo-50/80 border-indigo-100 text-indigo-600',
        '路由器': 'bg-indigo-50/80 border-indigo-100 text-indigo-600',
        'wireless_ac': 'bg-emerald-50/80 border-emerald-100 text-emerald-600',
        '无线ac': 'bg-emerald-50/80 border-emerald-100 text-emerald-600',
        'server': 'bg-slate-50/80 border-slate-100 text-slate-600',
        '服务器': 'bg-slate-50/80 border-slate-100 text-slate-600',
        'office': 'bg-sky-50/80 border-sky-100 text-sky-600',
        '办公区': 'bg-sky-50/80 border-sky-100 text-sky-600',
        'factory': 'bg-amber-50/80 border-amber-100 text-amber-600',
        '工厂': 'bg-amber-50/80 border-amber-100 text-amber-600',
        'datacenter': 'bg-violet-50/80 border-violet-100 text-violet-600',
        '数据中心': 'bg-violet-50/80 border-violet-100 text-violet-600',
    };

    // 获取当前类型的特定样式，默认为灰色
    const currentTypeStyle = typeStyles[normalizedType] || typeStyles[Object.keys(typeStyles).find(k => normalizedType.includes(k)) || ''] || 'bg-slate-50 border-slate-100 text-slate-500';

    // 容器样式组合
    const containerStyles = cn(
        baseStyles,
        {
            // 卡片模式：带背景、阴影、圆角、边框
            [`p-2 rounded-xl shadow-sm border ${currentTypeStyle} hover:shadow-md hover:-translate-y-0.5 hover:scale-105`]: variant === 'card' || withContainer,
            // 徽章模式：小尺寸、圆形
            "bg-slate-100 p-1 rounded-full w-8 h-8": variant === 'badge',
            // 默认模式：无特殊背景，但继承颜色
            [`${currentTypeStyle.split(' ').pop()}`]: variant === 'default' && !withContainer
        },
        className
    );

    return (
        <div className={containerStyles} title={type}>
            <IconComponent className={cn("w-full h-full", variant === 'card' ? "drop-shadow-sm" : "")} />
        </div>
    );
};
