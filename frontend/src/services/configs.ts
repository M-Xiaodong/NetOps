import api from './api';

export interface FileNode {
    id: string;
    name: string;
    type: 'region' | 'device' | 'file';
    children?: FileNode[];
    path?: string;
    mtime?: number;
}

export const getConfigTree = async () => {
    const response = await api.get<FileNode[]>('/configs/tree');
    return response.data;
};

export const getFileContent = async (path: string) => {
    const response = await api.get<{ content: string }>('/configs/content', {
        params: { path },
    });
    return response.data;
};

export const getDiff = async (pathA: string, pathB: string) => {
    const response = await api.post('/configs/diff', null, {
        params: { path_a: pathA, path_b: pathB },
    });
    return response.data;
};

export const getStats = async () => {
    const response = await api.get('/configs/stats');
    return response.data;
};
