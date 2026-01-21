/**
 * 时间格式化工具函数
 * Time formatting utilities
 */

/**
 * 将时间戳格式化为日期时间字符串
 * Format timestamp to date time string
 */
export function formatTime(
    timestamp: number,
    format: 'full' | 'date' | 'time' | 'relative' = 'full'
): string {
    if (!timestamp || timestamp === 0) {
        return '-';
    }

    const date = new Date(timestamp * 1000);

    switch (format) {
        case 'full':
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        case 'date':
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        case 'time':
            return date.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        case 'relative':
            return getRelativeTime(timestamp);
        default:
            return date.toLocaleString('zh-CN');
    }
}

/**
 * 获取相对时间描述
 */
export function getRelativeTime(timestamp: number): string {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`;
    if (diff < 31536000) return `${Math.floor(diff / 2592000)}个月前`;
    return `${Math.floor(diff / 31536000)}年前`;
}

/**
 * 格式化时间戳为文件名
 */
export function formatTimeForFilename(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hour}${minute}${second}`;
}
