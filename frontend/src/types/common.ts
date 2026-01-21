/**
 * 通用类型定义
 * Common type definitions
 */

export interface TreeNode {
    id: string;
    name: string;
    type: 'region' | 'device' | 'file';
    device_type?: 'switch' | 'firewall' | 'router' | 'wireless_ac' | 'server' | 'unknown';
    region_type?: string;
    vendor?: string;
    model?: string;
    version?: string;
    children?: TreeNode[];
    device_count?: number;
    file_count?: number;
    path?: string;
    mtime?: number;
    selected?: boolean;
}

export interface ImportItem {
    path: string;
    filename: string;
    size: number;
    mtime: string;
    timestamp?: number;
    detected_sysname: string | null;
    suggested_region: string | null;
    selected: boolean;
    target_region: string;
    target_device: string;
    status?: 'pending' | 'success' | 'failed';
    error?: string;
    region_type?: string;
    device_type?: string;
    vendor?: string;
    model?: string;
    version?: string;
    management_ip?: string;
}

export interface DeviceInfo {
    id: number;
    name: string;
    ip: string;
    region: string;
    model: string;
    vendor: string;
    type: string;
    status: 'online' | 'offline' | 'maintenance';
    lastSeen: string;
}

export interface FileInfo {
    id: string;
    name: string;
    path: string;
    size: number;
    mtime: number;
    content?: string;
}

export interface ApiResponse<T = any> {
    code: number;
    message: string;
    data: T;
}

export interface PaginatedData<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}

export interface StatsData {
    total_regions: number;
    total_devices: number;
    total_files: number;
    region_stats: RegionStat[];
}

export interface RegionStat {
    name: string;
    devices: number;
    configs: number;
}
