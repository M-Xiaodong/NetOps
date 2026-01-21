import React from 'react';

/**
 * 统一的网络设备图标组件库 - 精致专业版
 * 
 * 设计理念：
 * 1. 精致感：使用 1.5px 的细线条，展现高分辨率下的细腻质感。
 * 2. 抽象化：所有图标已抽象为此组件，修改此处即可全平台生效。
 * 3. 专业配色：使用低饱和度、高明度的色彩，符合现代企业级应用审美。
 * 4. 几何美学：严格遵循几何构图，确保视觉平衡。
 */

export type DeviceType = 'router' | 'switch' | 'firewall' | 'wireless_ac' | 'server' | 'unknown';

interface DeviceIconProps {
    type?: DeviceType;
    className?: string;
    size?: number;
}

// 精致配色 - 调整为更柔和、高级的色调
const COLORS = {
    router: "#007AFF",    // System Blue - 科技感蓝
    switch: "#5856D6",    // Indigo - 深邃紫蓝
    firewall: "#FF3B30",  // System Red - 警示红
    wireless: "#34C759",  // System Green - 活力绿
    server: "#8E8E93",    // System Gray - 中性灰
    unknown: "#C7C7CC"    // Light Gray
};

const STROKE_WIDTH = 1.5;

/**
 * 路由器图标 (Router)
 * 简化版：圆形外框 + 四个向内的箭头（十字）
 */
const RouterIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" stroke={COLORS.router} strokeWidth={STROKE_WIDTH} />
        {/* 上箭头 */}
        <path d="M12 7V12" stroke={COLORS.router} strokeWidth="2" strokeLinecap="round" />
        <path d="M10 9L12 7L14 9" stroke={COLORS.router} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* 右箭头 */}
        <path d="M17 12H12" stroke={COLORS.router} strokeWidth="2" strokeLinecap="round" />
        <path d="M15 10L17 12L15 14" stroke={COLORS.router} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* 下箭头 */}
        <path d="M12 17V12" stroke={COLORS.router} strokeWidth="2" strokeLinecap="round" />
        <path d="M10 15L12 17L14 15" stroke={COLORS.router} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* 左箭头 */}
        <path d="M7 12H12" stroke={COLORS.router} strokeWidth="2" strokeLinecap="round" />
        <path d="M9 10L7 12L9 14" stroke={COLORS.router} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
const SwitchIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="5" width="18" height="14" rx="3" stroke={COLORS.switch} strokeWidth={STROKE_WIDTH} />

        {/* 交叉箭头 - 优化路径 */}
        <path d="M7.5 9.5H16.5" stroke={COLORS.switch} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <path d="M14 7L16.5 9.5L14 12" stroke={COLORS.switch} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />

        <path d="M16.5 14.5H7.5" stroke={COLORS.switch} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <path d="M10 17L7.5 14.5L10 12" stroke={COLORS.switch} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/**
 * 防火墙图标 (Firewall)
 * 优化：砖墙纹理更稀疏，避免视觉拥挤。
 */
const FirewallIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6Z" stroke={COLORS.firewall} strokeWidth={STROKE_WIDTH} />

        {/* 砖墙纹理 - 简化 */}
        <path d="M4 9H20" stroke={COLORS.firewall} strokeWidth={STROKE_WIDTH} />
        <path d="M4 15H20" stroke={COLORS.firewall} strokeWidth={STROKE_WIDTH} />

        <path d="M10 4V9" stroke={COLORS.firewall} strokeWidth={STROKE_WIDTH} />
        <path d="M16 4V9" stroke={COLORS.firewall} strokeWidth={STROKE_WIDTH} />

        <path d="M7 9V15" stroke={COLORS.firewall} strokeWidth={STROKE_WIDTH} />
        <path d="M13 9V15" stroke={COLORS.firewall} strokeWidth={STROKE_WIDTH} />
        <path d="M19 9V15" stroke={COLORS.firewall} strokeWidth={STROKE_WIDTH} />

        <path d="M10 15V20" stroke={COLORS.firewall} strokeWidth={STROKE_WIDTH} />
        <path d="M16 15V20" stroke={COLORS.firewall} strokeWidth={STROKE_WIDTH} />
    </svg>
);

/**
 * 无线控制器图标 (Wireless AC)
 * 优化：信号波更圆润，间距更均匀。
 */
const WirelessACIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="14" width="14" height="7" rx="2" stroke={COLORS.wireless} strokeWidth={STROKE_WIDTH} />

        {/* 信号波 */}
        <path d="M12 11V14" stroke={COLORS.wireless} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <path d="M8.5 8.5C9.5 7.5 10.7 7 12 7C13.3 7 14.5 7.5 15.5 8.5" stroke={COLORS.wireless} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <path d="M5.5 5.5C7.3 3.7 9.6 2.8 12 2.8C14.4 2.8 16.7 3.7 18.5 5.5" stroke={COLORS.wireless} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </svg>
);

/**
 * 服务器图标 (Server)
 * 优化：更简洁的线条，指示灯微调。
 */
const ServerIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="4" width="14" height="16" rx="2" stroke={COLORS.server} strokeWidth={STROKE_WIDTH} />
        <path d="M5 10H19" stroke={COLORS.server} strokeWidth={STROKE_WIDTH} />
        <path d="M5 16H19" stroke={COLORS.server} strokeWidth={STROKE_WIDTH} />

        <circle cx="8.5" cy="7" r="0.75" fill={COLORS.server} />
        <circle cx="8.5" cy="13" r="0.75" fill={COLORS.server} />
        <circle cx="8.5" cy="19" r="0.75" fill={COLORS.server} />
    </svg>
);

/**
 * 未知设备图标
 */
const UnknownIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="16" height="16" rx="2" stroke={COLORS.unknown} strokeWidth={STROKE_WIDTH} strokeDasharray="3 3" />
        <path d="M12 8V13" stroke={COLORS.unknown} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        <path d="M12 16V16.01" stroke={COLORS.unknown} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </svg>
);

/**
 * 主设备图标组件
 */
export const DeviceIcon: React.FC<DeviceIconProps> = ({
    type = 'unknown',
    className = "w-5 h-5",
    size
}) => {
    const sizeClass = size ? `w-${size} h-${size}` : className;

    const iconMap = {
        router: RouterIcon,
        switch: SwitchIcon,
        firewall: FirewallIcon,
        wireless_ac: WirelessACIcon,
        server: ServerIcon,
        unknown: UnknownIcon,
    };

    const IconComponent = iconMap[type] || UnknownIcon;

    return <IconComponent className={sizeClass} />;
};

export default DeviceIcon;
