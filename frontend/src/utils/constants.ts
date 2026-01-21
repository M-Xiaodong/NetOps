/**
 * 应用常量定义
 * Application constants
 */

export const DEVICE_TYPES = {
    SWITCH: 'switch',
    FIREWALL: 'firewall',
    ROUTER: 'router',
    WIRELESS_AC: 'wireless_ac',
    SERVER: 'server',
    UNKNOWN: 'unknown'
} as const;

export const DEVICE_TYPE_LABELS: Record<string, string> = {
    switch: '交换机',
    firewall: '防火墙',
    router: '路由器',
    wireless_ac: '无线AC',
    server: '服务器',
    unknown: '未知'
};

export const REGION_TYPES = {
    OFFICE: '办公区',
    FACTORY: '工厂',
    DATA_CENTER: '数据中心'
} as const;

export const VENDORS = {
    HUAWEI: 'Huawei',
    CISCO: 'Cisco',
    H3C: 'H3C',
    RUIJIE: 'Ruijie',
    HILLSTONE: 'Hillstone',
    SANGFOR: 'Sangfor',
    ANHENG: 'Anheng',
    INSPUR: 'Inspur',
    OTHER: 'Other'
} as const;

export const DEVICE_STATUS = {
    ONLINE: 'online',
    OFFLINE: 'offline',
    MAINTENANCE: 'maintenance'
} as const;

export const SUPPORTED_EXTENSIONS = ['.cfg', '.txt', '.zip', '.conf', '.bfc'] as const;

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
