const BASE_URL = '/api';

interface ApiResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: any;
    config: any;
}

const request = async <T = any>(method: string, url: string, data?: any, config?: any): Promise<ApiResponse<T>> => {
    // 处理 URL，如果已有 /api 前缀则不再添加
    const finalUrl = url.startsWith('http') ? url : (url.startsWith('/api') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`);

    const headers = {
        'Content-Type': 'application/json',
        ...(config?.headers || {}),
    };

    // 如果传入的是 FormData，删除 Content-Type header，让浏览器自动设置
    if (data instanceof FormData) {
        delete headers['Content-Type'];
    }

    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchConfig: RequestInit = {
        method,
        headers,
        ...config
    };

    if (data) {
        if (data instanceof FormData) {
            fetchConfig.body = data;
        } else if (headers['Content-Type'] === 'application/x-www-form-urlencoded') {
            // Handle form-urlencoded if specifically requested (used in login)
            fetchConfig.body = data;
        } else {
            fetchConfig.body = JSON.stringify(data);
        }
    }

    try {
        const response = await fetch(finalUrl, fetchConfig);

        let responseData;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            responseData = await response.text();
        }

        if (!response.ok) {
            // 构造类似 axios 的错误对象
            const error: any = new Error(responseData?.detail || response.statusText || 'Network response was not ok');
            error.response = {
                data: responseData,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
            };
            throw error;
        }

        return {
            data: responseData,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            config: fetchConfig
        };
    } catch (error: any) {
        // 如果是网络错误等，也构造统一格式
        if (!error.response) {
            error.response = {
                data: { detail: error.message },
                status: 0,
                statusText: 'Network Error'
            };
        }
        throw error;
    }
};

const api = {
    get: <T = any>(url: string, config?: any) => request<T>('GET', url, undefined, config),
    post: <T = any>(url: string, data?: any, config?: any) => request<T>('POST', url, data, config),
    put: <T = any>(url: string, data?: any, config?: any) => request<T>('PUT', url, data, config),
    delete: <T = any>(url: string, config?: any) => request<T>('DELETE', url, undefined, config),
    patch: <T = any>(url: string, data?: any, config?: any) => request<T>('PATCH', url, data, config),
};

export default api;
