/**
 * 文件大小格式化工具函数
 * File size formatting utilities
 */

export function formatFileSize(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 B';
    if (!bytes || bytes < 0) return '-';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatFileSizeCN(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 字节';
    if (!bytes || bytes < 0) return '-';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['字节', '千字节', '兆字节', '吉字节', '太字节', '拍字节'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatFileCount(count: number): string {
    if (count === 0) return '无文件';
    if (count === 1) return '1个文件';
    return `${count}个文件`;
}
